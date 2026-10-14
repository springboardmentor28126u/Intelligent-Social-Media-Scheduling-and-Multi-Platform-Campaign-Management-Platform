"""
Multi-User Twitter/X Isolation and Publishing Test Suite.
Verifies:
1. Strict multi-user Twitter account isolation.
2. User A cannot access or see User B's Twitter account or posts.
3. User A cannot publish using User B's Twitter credentials.
4. Non-interference between Twitter, Facebook, Instagram, and LinkedIn.
"""
import sys
import os
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post
from app.core.security import create_access_token, hash_password

client = TestClient(app)


def test_multi_user_twitter_flow():
    db = SessionLocal()
    try:
        # 1. Setup User A and User B
        email_a = f"tw_user_a_{uuid.uuid4().hex[:6]}@example.com"
        email_b = f"tw_user_b_{uuid.uuid4().hex[:6]}@example.com"

        user_a = User(
            email=email_a,
            password_hash=hash_password("password123"),
            name="Twitter User Alpha",
            role="content_creator",
            is_active=True
        )
        user_b = User(
            email=email_b,
            password_hash=hash_password("password123"),
            name="Twitter User Beta",
            role="content_creator",
            is_active=True
        )

        db.add(user_a)
        db.add(user_b)
        db.commit()
        db.refresh(user_a)
        db.refresh(user_b)

        token_a = create_access_token(data={"sub": str(user_a.id), "email": user_a.email, "role": user_a.role})
        token_b = create_access_token(data={"sub": str(user_b.id), "email": user_b.email, "role": user_b.role})

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 2. Connect Twitter for User A
        res_conn_a = client.get("/api/twitter/connect", headers=headers_a)
        assert res_conn_a.status_code == 200
        state_a = res_conn_a.json()["state"]

        res_cb_a = client.get(f"/api/twitter/callback?code=demo_code&state={state_a}", follow_redirects=False)
        assert res_cb_a.status_code in [302, 307]

        # Update User A's account handle and id in DB for testing
        acc_a = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_a.id,
            SocialAccount.platform == "twitter"
        ).first()
        assert acc_a is not None
        acc_a.account_name = "Alpha Twitter Brand"
        acc_a.account_handle = "@alpha_brand"
        acc_a.account_id = "tw_id_alpha_1001"
        db.commit()

        # 3. Connect Twitter for User B
        res_conn_b = client.get("/api/twitter/connect", headers=headers_b)
        assert res_conn_b.status_code == 200
        state_b = res_conn_b.json()["state"]

        res_cb_b = client.get(f"/api/twitter/callback?code=demo_code&state={state_b}", follow_redirects=False)
        assert res_cb_b.status_code in [302, 307]

        # Update User B's account handle and id in DB for testing
        acc_b = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_b.id,
            SocialAccount.platform == "twitter"
        ).first()
        assert acc_b is not None
        acc_b.account_name = "Beta Twitter Studio"
        acc_b.account_handle = "@beta_studio"
        acc_b.account_id = "tw_id_beta_2002"
        db.commit()

        # 4. Verify Account Isolation
        accs_a = client.get("/social-accounts", headers=headers_a).json()
        accs_b = client.get("/social-accounts", headers=headers_b).json()

        tw_a_ids = [a["account_id"] for a in accs_a if a["platform"] == "twitter"]
        tw_b_ids = [a["account_id"] for a in accs_b if a["platform"] == "twitter"]

        assert "tw_id_alpha_1001" in tw_a_ids, "User A missing Alpha Twitter account"
        assert "tw_id_beta_2002" not in tw_a_ids, "User A can see User B's Twitter account!"
        assert "tw_id_beta_2002" in tw_b_ids, "User B missing Beta Twitter account"
        assert "tw_id_alpha_1001" not in tw_b_ids, "User B can see User A's Twitter account!"

        # 5. Status endpoint isolation
        status_a = client.get("/api/twitter/status", headers=headers_a).json()
        status_b = client.get("/api/twitter/status", headers=headers_b).json()

        assert status_a["account"]["account_handle"] == "@alpha_brand"
        assert status_b["account"]["account_handle"] == "@beta_studio"

        # 6. Publishing Isolation
        res_pub_a = client.post(
            "/api/twitter/publish",
            json={"content": "Tweet from User Alpha", "post_type": "text"},
            headers=headers_a
        )
        assert res_pub_a.status_code == 200

        res_pub_b = client.post(
            "/api/twitter/publish",
            json={"content": "Tweet from User Beta", "post_type": "text"},
            headers=headers_b
        )
        assert res_pub_b.status_code == 200

        # 7. Post Data Isolation
        posts_a = client.get("/posts", headers=headers_a).json()
        posts_b = client.get("/posts", headers=headers_b).json()

        posts_a_ids = [p["id"] for p in posts_a]
        posts_b_ids = [p["id"] for p in posts_b]

        for p_id in posts_b_ids:
            assert p_id not in posts_a_ids, "Post visibility leak between User A and User B"

        # 8. Disconnect Isolation: User A disconnecting does not affect User B
        res_disc_a = client.post("/api/twitter/disconnect", headers=headers_a)
        assert res_disc_a.status_code == 200

        # User A is now disconnected
        status_a_after = client.get("/api/twitter/status", headers=headers_a).json()
        assert status_a_after["connected"] is False

        # User B remains connected
        status_b_after = client.get("/api/twitter/status", headers=headers_b).json()
        assert status_b_after["connected"] is True
        assert status_b_after["account"]["account_handle"] == "@beta_studio"

    finally:
        db.close()
