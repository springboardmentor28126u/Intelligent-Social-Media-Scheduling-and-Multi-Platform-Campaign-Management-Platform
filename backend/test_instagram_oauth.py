"""
Test script specifically checking Instagram OAuth flow and token exchange diagnostics.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models.user import User
from app.core.security import create_access_token

client = TestClient(app)

def test_instagram_flow():
    print("Testing Instagram OAuth endpoints...")
    db = SessionLocal()
    try:
        user = db.query(User).first()
        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Test connect
        res_conn = client.get("/api/instagram/connect", headers=headers)
        assert res_conn.status_code == 200
        data_conn = res_conn.json()
        print(f"[OK] Instagram auth URL generated: {data_conn['auth_url'][:70]}...")
        assert "instagram.com/oauth/authorize" in data_conn["auth_url"]
        assert "client_id=" in data_conn["auth_url"]
        assert "redirect_uri=" in data_conn["auth_url"]

        # 2. Test callback with demo code
        state = data_conn["state"]
        res_cb = client.get(
            f"/api/instagram/callback?code=demo_code&state={state}",
            follow_redirects=False
        )
        assert res_cb.status_code == 302
        loc = res_cb.headers.get("location")
        print(f"[OK] Demo callback redirected to: {loc}")
        assert "connected=instagram" in loc

        # 3. Test status
        res_stat = client.get("/api/instagram/status", headers=headers)
        assert res_stat.status_code == 200
        assert res_stat.json()["connected"] is True
        print(f"[OK] Instagram status: Connected to {res_stat.json()['account']['account_name']}")

        # 4. Test error handling on invalid code (should give helpful diagnostic error, not generic oops)
        from app.services.providers.instagram_provider import InstagramProvider
        provider = InstagramProvider()
        try:
            provider.exchange_code_for_token("invalid_test_code", "http://localhost:8000/api/instagram/callback")
            print("[ERROR] Expected ValueError on invalid code")
        except ValueError as ve:
            print(f"[OK] Handled invalid code with helpful diagnostic error: {str(ve)[:120]}...")

        print("Instagram OAuth tests completed successfully!")
        return True
    finally:
        db.close()

if __name__ == "__main__":
    success = test_instagram_flow()
    sys.exit(0 if success else 1)
