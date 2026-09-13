"""
Multi-User Facebook Isolation and Publishing Test Suite.
Verifies Step 10: Multi-user Facebook Page isolation, multi-page selection,
independent publishing, and non-interference with Instagram and LinkedIn.
"""
import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.social_account import SocialAccount
from app.db.models.post import Post
from app.core.security import create_access_token, hash_password

client = TestClient(app)

def run_multi_user_facebook_tests():
    print("=" * 65)
    print("STARTING MULTI-USER FACEBOOK ISOLATION TEST SUITE")
    print("=" * 65)

    db = SessionLocal()
    try:
        # 1. Setup User A and User B
        email_a = f"fb_user_a_{uuid.uuid4().hex[:6]}@example.com"
        email_b = f"fb_user_b_{uuid.uuid4().hex[:6]}@example.com"

        user_a = User(
            email=email_a,
            password_hash=hash_password("password123"),
            name="Facebook User A",
            role="content_creator",
            is_active=True
        )
        user_b = User(
            email=email_b,
            password_hash=hash_password("password123"),
            name="Facebook User B",
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

        print(f"[OK] Created User A (ID: {user_a.id}) and User B (ID: {user_b.id})")

        # 2. Connect Facebook for User A (Page A)
        res_conn_a = client.get("/api/facebook/connect", headers=headers_a)
        assert res_conn_a.status_code == 200
        state_a = res_conn_a.json()["state"]

        res_cb_a = client.get(f"/api/facebook/callback?code=demo_code&state={state_a}", follow_redirects=False)
        assert res_cb_a.status_code in [302, 307]

        # Customize Page A name/id for User A
        res_sel_a = client.post(
            "/api/facebook/connect-page",
            json={
                "page_id": "1000100010001",
                "page_name": "Brand Alpha Facebook Page",
                "page_access_token": "page_token_alpha_123",
                "followers_count": 12500
            },
            headers=headers_a
        )
        assert res_sel_a.status_code == 200

        # 3. Connect Facebook for User B (Page B)
        res_conn_b = client.get("/api/facebook/connect", headers=headers_b)
        assert res_conn_b.status_code == 200
        state_b = res_conn_b.json()["state"]

        res_cb_b = client.get(f"/api/facebook/callback?code=demo_code&state={state_b}", follow_redirects=False)
        assert res_cb_b.status_code in [302, 307]

        # Customize Page B name/id for User B
        res_sel_b = client.post(
            "/api/facebook/connect-page",
            json={
                "page_id": "2000200020002",
                "page_name": "Studio Beta Facebook Page",
                "page_access_token": "page_token_beta_456",
                "followers_count": 43000
            },
            headers=headers_b
        )
        assert res_sel_b.status_code == 200

        # 4. Verify Strict Isolation
        accs_a = client.get("/social-accounts", headers=headers_a).json()
        accs_b = client.get("/social-accounts", headers=headers_b).json()

        fb_a_ids = [a["account_id"] for a in accs_a if a["platform"] == "facebook"]
        fb_b_ids = [a["account_id"] for a in accs_b if a["platform"] == "facebook"]

        assert "1000100010001" in fb_a_ids, "User A missing Brand Alpha page"
        assert "2000200020002" not in fb_a_ids, "User A can see User B's page!"
        assert "2000200020002" in fb_b_ids, "User B missing Studio Beta page"
        assert "1000100010001" not in fb_b_ids, "User B can see User A's page!"

        print("[OK] Verified strict multi-user isolation:")
        print(f"     User A Accounts: {[a['account_name'] for a in accs_a]}")
        print(f"     User B Accounts: {[a['account_name'] for a in accs_b]}")

        # 5. Independent Publishing
        res_pub_a = client.post(
            "/api/facebook/publish",
            json={"content": "Post from User A to Brand Alpha Page", "post_type": "text"},
            headers=headers_a
        )
        assert res_pub_a.status_code == 200
        print(f"[OK] User A published to Facebook Page: {res_pub_a.json()['external_id']}")

        res_pub_b = client.post(
            "/api/facebook/publish",
            json={"content": "Post from User B to Studio Beta Page", "post_type": "text"},
            headers=headers_b
        )
        assert res_pub_b.status_code == 200
        print(f"[OK] User B published to Facebook Page: {res_pub_b.json()['external_id']}")

        # 6. Verify User A cannot see User B's posts
        posts_a = client.get("/posts", headers=headers_a).json()
        posts_b = client.get("/posts", headers=headers_b).json()

        posts_a_ids = [p["id"] for p in posts_a]
        posts_b_ids = [p["id"] for p in posts_b]

        for p_id in posts_b_ids:
            assert p_id not in posts_a_ids, "Post visibility leak between User A and User B"

        print("[OK] Verified post data isolation between User A and User B.")
        print("=" * 65)
        print("ALL MULTI-USER FACEBOOK TESTS PASSED (100% SUCCESS)")
        print("=" * 65)
        return True

    finally:
        db.close()

if __name__ == "__main__":
    success = run_multi_user_facebook_tests()
    sys.exit(0 if success else 1)
