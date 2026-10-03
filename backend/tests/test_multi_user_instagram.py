"""
Automated tests for Multi-User Instagram OAuth Integration.
Verifies that:
1. User A connects Instagram A -> saved with user_id = User A, platform = instagram, account_id = Instagram A.
2. User B connects Instagram B -> saved with user_id = User B, platform = instagram, account_id = Instagram B.
3. User A only sees Instagram A when listing social accounts; User B only sees Instagram B.
4. User A re-connecting Instagram A updates rather than duplicating.
5. User A connecting a second Instagram C creates another account for User A without leaking to User B.
6. OAuth HMAC state correctly resolves the originating user and rejects tampered states.
7. LinkedIn, Facebook, and other providers remain fully functional.
"""
import sys
import os
import uuid
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.social_account import SocialAccount
from app.core.security import create_access_token, hash_password, create_oauth_state, verify_oauth_state

client = TestClient(app)


def setup_test_users(db):
    """Create or retrieve distinct test users User A and User B."""
    user_a = db.query(User).filter(User.email == "test_user_a@socialpilot.test").first()
    if not user_a:
        user_a = User(
            email="test_user_a@socialpilot.test",
            name="Alice SocialPilot",
            password_hash=hash_password("Password123!"),
            role="business_user",
            is_active=True
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

    user_b = db.query(User).filter(User.email == "test_user_b@socialpilot.test").first()
    if not user_b:
        user_b = User(
            email="test_user_b@socialpilot.test",
            name="Bob SocialPilot",
            password_hash=hash_password("Password123!"),
            role="business_user",
            is_active=True
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

    # Clean up previous test social accounts for test users
    db.query(SocialAccount).filter(SocialAccount.user_id.in_([user_a.id, user_b.id])).delete(synchronize_session=False)
    db.commit()

    token_a = create_access_token({"sub": str(user_a.id), "email": user_a.email, "role": user_a.role})
    token_b = create_access_token({"sub": str(user_b.id), "email": user_b.email, "role": user_b.role})

    return user_a, token_a, user_b, token_b


def test_multi_user_instagram_flow():
    db = SessionLocal()
    try:
        user_a, token_a, user_b, token_b = setup_test_users(db)
        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        print("\n=== STEP 1: Connect Instagram for User A (Alice) ===")
        # 1. User A initiates Instagram connect
        resp_a = client.get("/api/instagram/connect", headers=headers_a)
        assert resp_a.status_code == 200, f"Connect failed: {resp_a.text}"
        data_a = resp_a.json()
        state_a = data_a["state"]
        verified_a = verify_oauth_state(state_a)
        assert verified_a["user_id"] == user_a.id, "State does not encode User A's ID"
        print(f"[OK] Generated OAuth state for User A (id={user_a.id})")

        # Mock token exchange for User A returning Instagram account A
        mock_ig_a_token_data = {
            "access_token": "IG_TOKEN_USER_A_12345",
            "account_name": "Alice Boutique IG",
            "account_handle": "@alice_boutique",
            "account_id": "17841400000000001",
            "avatar_url": "https://example.com/alice_ig.jpg",
            "followers_count": 5400,
            "posts_count": 32,
            "expires_in": 5184000,
            "is_demo": False
        }

        with patch("app.services.providers.instagram_provider.InstagramProvider.exchange_code_for_token", return_value=mock_ig_a_token_data):
            cb_resp_a = client.get(
                f"/api/instagram/callback?code=auth_code_alice&state={state_a}",
                follow_redirects=False
            )
            assert cb_resp_a.status_code == 302
            loc_a = cb_resp_a.headers.get("location")
            assert "connected=instagram" in loc_a
            print(f"[OK] User A OAuth callback completed: {loc_a}")

        # Check DB for User A
        acc_a = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_a.id,
            SocialAccount.platform == "instagram"
        ).all()
        assert len(acc_a) == 1, f"Expected 1 Instagram account for User A, got {len(acc_a)}"
        assert acc_a[0].account_id == "17841400000000001"
        assert acc_a[0].account_name == "Alice Boutique IG"
        assert acc_a[0].access_token == "IG_TOKEN_USER_A_12345"
        print(f"[OK] Verified User A's Instagram account saved in DB (id={acc_a[0].id}, account_id={acc_a[0].account_id})")

        print("\n=== STEP 2: Connect Instagram for User B (Bob) ===")
        # 2. User B initiates Instagram connect
        resp_b = client.get("/api/instagram/connect", headers=headers_b)
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        state_b = data_b["state"]
        verified_b = verify_oauth_state(state_b)
        assert verified_b["user_id"] == user_b.id, "State does not encode User B's ID"
        print(f"[OK] Generated OAuth state for User B (id={user_b.id})")

        # Mock token exchange for User B returning distinct Instagram account B
        mock_ig_b_token_data = {
            "access_token": "IG_TOKEN_USER_B_67890",
            "account_name": "Bob Coffee Roasters",
            "account_handle": "@bob_coffee_roasters",
            "account_id": "17841499999999999",
            "avatar_url": "https://example.com/bob_ig.jpg",
            "followers_count": 8900,
            "posts_count": 64,
            "expires_in": 5184000,
            "is_demo": False
        }

        with patch("app.services.providers.instagram_provider.InstagramProvider.exchange_code_for_token", return_value=mock_ig_b_token_data):
            cb_resp_b = client.get(
                f"/api/instagram/callback?code=auth_code_bob&state={state_b}",
                follow_redirects=False
            )
            assert cb_resp_b.status_code == 302
            loc_b = cb_resp_b.headers.get("location")
            assert "connected=instagram" in loc_b
            print(f"[OK] User B OAuth callback completed: {loc_b}")

        # Check DB for User B
        acc_b = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_b.id,
            SocialAccount.platform == "instagram"
        ).all()
        assert len(acc_b) == 1, f"Expected 1 Instagram account for User B, got {len(acc_b)}"
        assert acc_b[0].account_id == "17841499999999999"
        assert acc_b[0].account_name == "Bob Coffee Roasters"
        assert acc_b[0].access_token == "IG_TOKEN_USER_B_67890"
        print(f"[OK] Verified User B's Instagram account saved in DB (id={acc_b[0].id}, account_id={acc_b[0].account_id})")

        print("\n=== STEP 3: Verify Strict Isolation Between User A and User B ===")
        # Query /social-accounts as User A
        list_a = client.get("/social-accounts", headers=headers_a).json()
        account_ids_a = [acc["account_id"] for acc in list_a]
        print(f"[OK] User A social accounts list: {account_ids_a}")
        assert "17841400000000001" in account_ids_a, "User A must see Instagram A"
        assert "17841499999999999" not in account_ids_a, "CRITICAL: User A must NOT see User B's Instagram!"

        # Query /social-accounts as User B
        list_b = client.get("/social-accounts", headers=headers_b).json()
        account_ids_b = [acc["account_id"] for acc in list_b]
        print(f"[OK] User B social accounts list: {account_ids_b}")
        assert "17841499999999999" in account_ids_b, "User B must see Instagram B"
        assert "17841400000000001" not in account_ids_b, "CRITICAL: User B must NOT see User A's Instagram!"

        print("\n=== STEP 4: Test Idempotency (User A Re-connects Same Account) ===")
        # User A re-authorizes Instagram Account A with updated token
        mock_ig_a_updated = dict(mock_ig_a_token_data)
        mock_ig_a_updated["access_token"] = "IG_TOKEN_USER_A_REFRESHED_999"
        mock_ig_a_updated["followers_count"] = 5450

        with patch("app.services.providers.instagram_provider.InstagramProvider.exchange_code_for_token", return_value=mock_ig_a_updated):
            cb_reauth = client.get(
                f"/api/instagram/callback?code=reauth_code&state={state_a}",
                follow_redirects=False
            )
            assert cb_reauth.status_code == 302

        db.expire_all()
        acc_a_after = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_a.id,
            SocialAccount.platform == "instagram"
        ).all()
        assert len(acc_a_after) == 1, f"Expected exactly 1 account after re-connecting same account, got {len(acc_a_after)}"
        assert acc_a_after[0].access_token == "IG_TOKEN_USER_A_REFRESHED_999"
        assert acc_a_after[0].followers_count == 5450
        print("[OK] Re-connecting same Instagram account updated tokens in-place without creating duplicate rows.")

        print("\n=== STEP 5: Test Multi-Account for Single User (User A connects 2nd Account) ===")
        mock_ig_a_second = {
            "access_token": "IG_TOKEN_USER_A_ACCOUNT2",
            "account_name": "Alice Personal Studio",
            "account_handle": "@alice_personal",
            "account_id": "17841477777777777",
            "avatar_url": "https://example.com/alice_studio.jpg",
            "followers_count": 1200,
            "posts_count": 10,
            "expires_in": 5184000,
            "is_demo": False
        }

        with patch("app.services.providers.instagram_provider.InstagramProvider.exchange_code_for_token", return_value=mock_ig_a_second):
            cb_second = client.get(
                f"/api/instagram/callback?code=second_acc_code&state={state_a}",
                follow_redirects=False
            )
            assert cb_second.status_code == 302

        acc_a_all = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_a.id,
            SocialAccount.platform == "instagram"
        ).all()
        assert len(acc_a_all) == 2, f"Expected 2 Instagram accounts for User A, got {len(acc_a_all)}"
        print(f"[OK] User A successfully connected 2 distinct Instagram accounts: {[a.account_name for a in acc_a_all]}")

        # User B still only has 1
        acc_b_all = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_b.id,
            SocialAccount.platform == "instagram"
        ).all()
        assert len(acc_b_all) == 1, f"User B should still have only 1 account, got {len(acc_b_all)}"
        print(f"[OK] User B still only has Bob's account.")

        print("\n=== STEP 6: Verify CSRF State Protection ===")
        # Invalid / tampered state must be rejected
        bad_cb = client.get(
            "/api/instagram/callback?code=some_code&state=forged_state_payload.bad_sig",
            follow_redirects=False
        )
        assert bad_cb.status_code == 302
        assert "Invalid+or+expired+OAuth+state" in bad_cb.headers.get("location")
        print("[OK] Invalid or forged OAuth state was securely rejected.")

        print("\n=== STEP 7: Verify LinkedIn, Facebook, and Platform Routes Intact ===")
        li_resp = client.get("/api/linkedin/connect", headers=headers_a)
        assert li_resp.status_code == 200, f"LinkedIn connect failed: {li_resp.text}"
        print("[OK] LinkedIn /api/linkedin/connect operational.")

        fb_resp = client.get("/api/facebook/connect", headers=headers_a)
        assert fb_resp.status_code == 200, f"Facebook connect failed: {fb_resp.text}"
        print("[OK] Facebook /api/facebook/connect operational.")

        print("\nALL MULTI-USER INSTAGRAM OAUTH TESTS PASSED PERFECTLY!")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    success = test_multi_user_instagram_flow()
    sys.exit(0 if success else 1)
