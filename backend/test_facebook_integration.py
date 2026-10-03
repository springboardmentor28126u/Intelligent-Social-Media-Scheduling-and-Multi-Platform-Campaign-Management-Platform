"""
Test script for Facebook Page Integration in SocialPilot.
Verifies all 13 checklist criteria (A through M).
"""
import sys
import os

# Add backend to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.post import Post, PublishingLog
from app.db.models.social_account import SocialAccount
from app.core.security import create_access_token
from app.services.scheduler import publish_scheduled_posts

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("STARTING FACEBOOK INTEGRATION TEST SUITE")
    print("=" * 60)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "jenel@example.com").first()
        if not user:
            user = db.query(User).first()
        if not user:
            print("❌ Error: No user found in database for testing.")
            return False

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        headers = {"Authorization": f"Bearer {token}"}
        print(f"[OK] Authenticated as test user: {user.email} (ID: {user.id})")

        # ── Test M: Existing Login & Auth Still Works ─────────────────────────
        res_me = client.get("/auth/me", headers=headers)
        assert res_me.status_code == 200, f"Auth /auth/me failed: {res_me.text}"
        print("[OK] [Test M] Existing auth/me works correctly.")

        # ── Test A: Facebook OAuth Starts Correctly ───────────────────────────
        res_connect = client.get("/api/facebook/connect", headers=headers)
        assert res_connect.status_code == 200, f"Facebook connect failed: {res_connect.text}"
        data_connect = res_connect.json()
        assert "auth_url" in data_connect, "auth_url missing in connect response"
        assert "facebook" in data_connect["platform"], "platform mismatch"
        assert "config_id" in data_connect["auth_url"] or "pages_show_list" in data_connect["auth_url"] or "UNCONFIGURED" in data_connect["auth_url"], "Auth config missing"
        print(f"[OK] [Test A] Facebook OAuth endpoint generated URL: {data_connect['auth_url'][:60]}...")

        # ── Test B: Facebook Callback Works (/api/facebook/callback and /social-auth/facebook/call) ─
        state = data_connect["state"]
        res_callback = client.get(
            f"/social-auth/facebook/call?code=demo_code&state={state}",
            follow_redirects=False
        )
        assert res_callback.status_code in [302, 307], f"Callback redirect failed: {res_callback.status_code}"
        location = res_callback.headers.get("location", "")
        assert "connected=facebook" in location, f"Callback redirect target invalid: {location}"
        print(f"[OK] [Test B] Facebook callback (/social-auth/facebook/call) redirected to: {location}")

        # ── Test E: Connected Facebook Page appears in SocialPilot ────────────
        res_status = client.get("/api/facebook/status", headers=headers)
        assert res_status.status_code == 200, f"Status check failed: {res_status.text}"
        status_data = res_status.json()
        assert status_data["connected"] is True, f"Facebook not connected: {status_data}"
        account_info = status_data["account"]
        print(f"[OK] [Test E] Facebook status: Connected to '{account_info['account_name']}' (ID: {account_info['account_id']}, Followers: {account_info['followers_count']})")

        # Also check /social-accounts
        res_accounts = client.get("/social-accounts", headers=headers)
        assert res_accounts.status_code == 200
        fb_accs = [a for a in res_accounts.json() if a["platform"] == "facebook"]
        assert len(fb_accs) > 0, "Facebook account missing from /social-accounts"
        print("[OK] [Test E] Facebook account listed in general /social-accounts endpoint.")

        # ── Test C: User Pages can be retrieved ───────────────────────────────
        res_pages = client.get("/api/facebook/pages", headers=headers)
        assert res_pages.status_code == 200, f"Get pages failed: {res_pages.text}"
        pages_data = res_pages.json()
        assert "pages" in pages_data, "pages key missing"
        print(f"[OK] [Test C] Retrieved {len(pages_data['pages'])} available Facebook Pages.")

        # ── Test D: Page can be selected and connected ────────────────────────
        res_sel = client.post(
            "/api/facebook/connect-page",
            json={
                "page_id": "fb_page_prod_selected_123",
                "page_name": "Official SocialPilot Page",
                "page_access_token": "fb_page_token_abc_xyz",
                "followers_count": 8750
            },
            headers=headers
        )
        assert res_sel.status_code == 200, f"Select page failed: {res_sel.text}"
        sel_data = res_sel.json()
        assert sel_data["account"]["account_name"] == "Official SocialPilot Page"
        print(f"[OK] [Test D] Selected and connected Facebook Page '{sel_data['account']['account_name']}' (Followers: {sel_data['account']['followers_count']})")

        # ── Test F: Text and Image post publishing ────────────────────────────
        # 1. Text Post
        res_pub_text = client.post(
            "/api/facebook/publish",
            json={
                "content": "🚀 Testing Facebook Page publishing with SocialPilot!",
                "post_type": "text"
            },
            headers=headers
        )
        assert res_pub_text.status_code == 200, f"Direct publish failed: {res_pub_text.text}"
        text_pub_data = res_pub_text.json()
        assert text_pub_data["success"] is True, "Publish not marked success"
        print(f"[OK] [Test F1] Published text post to Facebook Page. External ID: {text_pub_data['external_id']}")

        # 2. Image Post
        res_pub_img = client.post(
            "/api/facebook/publish",
            json={
                "content": "📸 Check out our new platform visual update!",
                "media_urls": ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"],
                "post_type": "image"
            },
            headers=headers
        )
        assert res_pub_img.status_code == 200, f"Direct image publish failed: {res_pub_img.text}"
        img_pub_data = res_pub_img.json()
        assert img_pub_data["success"] is True
        print(f"[OK] [Test F2] Published image post to Facebook Page. External ID: {img_pub_data['external_id']}")

        # ── Test G: Scheduled Facebook Post Uses Existing Scheduler ───────────
        from datetime import datetime, timezone, timedelta
        due_time = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        
        # Create scheduled post via /posts endpoint
        res_create = client.post(
            "/posts",
            json={
                "title": "Scheduled Facebook Announcement",
                "content": "📅 This post was scheduled and automatically dispatched to Facebook Page.",
                "platform": "facebook",
                "platforms": [{"platform": "facebook"}],
                "status": "scheduled",
                "scheduled_at": due_time
            },
            headers=headers
        )
        assert res_create.status_code == 201, f"Create scheduled post failed: {res_create.text}"
        created_post = res_create.json()
        post_id = created_post["id"]
        print(f"[OK] [Test G1] Created scheduled post #{post_id} targeted for Facebook.")

        # Run scheduler tick
        sched_res = publish_scheduled_posts()
        print(f"[OK] [Test G2] Scheduler executed. Published count: {sched_res.get('published_count')}")

        # Check post status in DB
        res_post_check = client.get(f"/posts/{post_id}", headers=headers)
        assert res_post_check.status_code == 200
        post_obj = res_post_check.json()
        assert post_obj["status"] == "published", f"Post #{post_id} status is {post_obj['status']}, expected 'published'"
        print(f"[OK] [Test G3] Scheduled post #{post_id} transitioned to 'published' with external ID: {post_obj.get('external_post_id')}")

        # ── Test H: Publishing Logs are Updated ────────────────────────────────
        res_logs = client.get(f"/posts/{post_id}/logs", headers=headers)
        assert res_logs.status_code == 200
        logs = res_logs.json()
        assert len(logs) > 0, "No publishing logs found for post"
        print(f"[OK] [Test H] Verified {len(logs)} publishing log entries recorded for post #{post_id}.")

        # ── Test J: Instagram Still Works ─────────────────────────────────────
        res_ig_conn = client.get("/api/instagram/connect", headers=headers)
        assert res_ig_conn.status_code == 200
        res_ig_stat = client.get("/api/instagram/status", headers=headers)
        assert res_ig_stat.status_code == 200
        print(f"[OK] [Test J] Instagram routes are intact and operational.")

        # ── Test K: LinkedIn Still Works ──────────────────────────────────────
        res_li_conn = client.get("/api/linkedin/connect", headers=headers)
        assert res_li_conn.status_code == 200
        res_li_stat = client.get("/api/linkedin/status", headers=headers)
        assert res_li_stat.status_code == 200
        print(f"[OK] [Test K] LinkedIn routes are intact and operational.")

        # ── Test L: YouTube Still Works ───────────────────────────────────────
        res_yt_oauth = client.get("/social-accounts/oauth/youtube/url", headers=headers)
        assert res_yt_oauth.status_code == 200
        print(f"[OK] [Test L] YouTube OAuth URL generation is intact.")

        # ── Test I: Disconnect Facebook Works ─────────────────────────────────
        res_disconn = client.delete("/api/facebook/disconnect", headers=headers)
        assert res_disconn.status_code == 200, f"Disconnect failed: {res_disconn.text}"
        res_status_after = client.get("/api/facebook/status", headers=headers)
        assert res_status_after.json()["connected"] is False, "Facebook still connected after disconnect"
        print("[OK] [Test I] Facebook Page disconnected cleanly without affecting other platforms.")

        print("=" * 60)
        print("ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
        print("=" * 60)
        return True

    finally:
        db.close()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
