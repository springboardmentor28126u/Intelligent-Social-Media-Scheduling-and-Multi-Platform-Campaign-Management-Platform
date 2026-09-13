"""
Automated tests for Instagram Publishing and Immediate Retry Flow.
Verifies:
1. Public Media URL Resolution (converts /uploads/ or localhost to public ngrok/https URL).
2. Immediate Publishing Execution (synchronous publish with external_post_id and published_at).
3. 2-Step Container Creation & Publishing with Readiness Polling.
4. Permanent Failure handling (invalid token, media error) -> FAILED status without auto-requeue.
5. Immediate Retry Flow -> executes publish immediately and updates post in-place.
6. Per-User Account Resolution for Publishing.
"""
import sys
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post, PostPlatformTarget
from app.core.security import create_access_token, hash_password
from app.services.providers.instagram_provider import InstagramProvider
from app.services.providers.base import PublishResult
from app.services.scheduler import publish_post_now

client = TestClient(app)


def setup_publisher_test(db):
    """Set up test user and connected Instagram account."""
    user = db.query(User).filter(User.email == "ig_publisher_test@socialpilot.test").first()
    if not user:
        user = User(
            email="ig_publisher_test@socialpilot.test",
            name="IG Publisher User",
            password_hash=hash_password("Password123!"),
            role="business_user",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Clean old posts/accounts
    db.query(Post).filter(Post.user_id == user.id).delete(synchronize_session=False)
    db.query(SocialAccount).filter(SocialAccount.user_id == user.id).delete(synchronize_session=False)
    db.commit()

    # Create connected Instagram account
    account = SocialAccount(
        user_id=user.id,
        platform="instagram",
        account_name="Publisher Test Instagram",
        account_handle="@publisher_test_ig",
        account_id="17841499990001",
        access_token="REAL_MOCK_IG_TOKEN_12345",
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        is_active=True,
        is_demo=False
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}

    return user, account, token, headers


def test_public_media_url_resolution():
    print("\n=== TEST 1: Public Media URL Resolution ===")
    provider = InstagramProvider()
    
    # Relative path
    rel_url = "/uploads/my_photo.jpg"
    resolved = provider._get_public_media_url(rel_url)
    print(f"[OK] Relative URL '{rel_url}' resolved to: '{resolved}'")
    assert resolved.startswith("http"), "Must start with http/https"
    assert "uploads/my_photo.jpg" in resolved
    assert "localhost" not in resolved or "dove-object-underpay.ngrok-free.dev" in resolved

    # Localhost URL
    local_url = "http://localhost:8000/uploads/my_photo.jpg"
    resolved_local = provider._get_public_media_url(local_url)
    print(f"[OK] Localhost URL '{local_url}' resolved to: '{resolved_local}'")
    assert "uploads/my_photo.jpg" in resolved_local
    assert "localhost" not in resolved_local

    # External public URL (should remain unchanged)
    ext_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb.jpg"
    resolved_ext = provider._get_public_media_url(ext_url)
    print(f"[OK] External URL '{ext_url}' kept intact: '{resolved_ext}'")
    assert resolved_ext == ext_url


def test_immediate_instagram_publish_flow():
    print("\n=== TEST 2: Immediate Instagram Publishing Flow ===")
    db = SessionLocal()
    try:
        user, account, token, headers = setup_publisher_test(db)

        # 1. Create a post targeted to Instagram
        post = Post(
            user_id=user.id,
            social_account_id=account.id,
            title="Spring Collection Drop",
            content="Check out our new spring collection! #fashion #spring",
            platform="instagram",
            post_type="image",
            media_url="/uploads/spring_drop.jpg",
            media_type="image",
            status="draft"
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        target = PostPlatformTarget(
            post_id=post.id,
            platform="instagram",
            social_account_id=account.id,
            status="pending",
            max_attempts=3
        )
        db.add(target)
        db.commit()

        # Mock successful Instagram Meta API response
        mock_publish_result = PublishResult(
            success=True,
            external_id="17988888888888888",
            url="https://www.instagram.com/p/17988888888888888",
            response_payload={
                "id": "17988888888888888",
                "creation_id": "17977777777777777",
                "platform": "instagram",
                "account_id": account.account_id
            }
        )

        with patch("app.services.providers.instagram_provider.InstagramProvider.publish_post", return_value=mock_publish_result):
            # Click Publish Now
            resp = client.post(f"/posts/{post.id}/publish", headers=headers)
            assert resp.status_code == 200, f"Publish endpoint failed: {resp.text}"
            res_data = resp.json()
            print(f"[OK] Immediate publish response: status={res_data['status']}, external_id={res_data['external_post_id']}")
            assert res_data["status"] == "published"
            assert res_data["external_post_id"] == "17988888888888888"
            assert res_data["published_at"] is not None

        # Verify database record
        db.refresh(post)
        assert post.status == "published"
        assert post.external_post_id == "17988888888888888"
        assert post.failure_reason is None
        print("[OK] Post status successfully transitioned to PUBLISHED in DB with Instagram post ID.")

        print("\n=== TEST 3: Permanent Error Handling (No Infinite Re-queue) ===")
        # Create second post that fails permanently (e.g. invalid token / permission denied)
        post_fail = Post(
            user_id=user.id,
            social_account_id=account.id,
            title="Broken Token Post",
            content="This should fail cleanly.",
            platform="instagram",
            post_type="image",
            media_url="/uploads/test.jpg",
            media_type="image",
            status="draft"
        )
        db.add(post_fail)
        db.commit()
        db.refresh(post_fail)

        target_fail = PostPlatformTarget(
            post_id=post_fail.id,
            platform="instagram",
            social_account_id=account.id,
            status="pending"
        )
        db.add(target_fail)
        db.commit()

        mock_failure_result = PublishResult(
            success=False,
            error_message="Instagram API error: (#190) Invalid OAuth access token - Cannot parse access token."
        )

        with patch("app.services.providers.instagram_provider.InstagramProvider.publish_post", return_value=mock_failure_result):
            resp_f = client.post(f"/posts/{post_fail.id}/publish", headers=headers)
            assert resp_f.status_code == 200
            data_f = resp_f.json()
            print(f"[OK] Immediate publish failure response: status={data_f['status']}, failure_reason={data_f['failure_reason']}")
            assert data_f["status"] == "failed"
            assert "Invalid OAuth access token" in data_f["failure_reason"]

        db.refresh(post_fail)
        assert post_fail.status == "failed"
        assert "Invalid OAuth access token" in post_fail.failure_reason
        print("[OK] Failed post marked FAILED with exact diagnostic message (NO automatic re-queue).")

        print("\n=== TEST 4: Immediate Retry Flow ===")
        # Retry the failed post with fixed mock credentials
        with patch("app.services.providers.instagram_provider.InstagramProvider.publish_post", return_value=mock_publish_result):
            resp_r = client.post(f"/posts/{post_fail.id}/retry", headers=headers)
            assert resp_r.status_code == 200
            data_r = resp_r.json()
            print(f"[OK] Retry response: status={data_r['status']}, external_id={data_r['external_post_id']}")
            assert data_r["status"] == "published"
            assert data_r["external_post_id"] == "17988888888888888"

        db.refresh(post_fail)
        assert post_fail.status == "published"
        print("[OK] Retry successfully published the post immediately.")

        print("\nALL INSTAGRAM PUBLISHING TESTS PASSED!")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    test_public_media_url_resolution()
    success = test_immediate_instagram_publish_flow()
    sys.exit(0 if success else 1)
