import pytest
from datetime import datetime, timezone, timedelta


def test_google_auth_url(client):
    res = client.get("/auth/google/url")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data


def test_dashboard_endpoints(client):
    login_res = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Stats
    stats_res = client.get("/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_posts" in stats
    assert "scheduled_posts" in stats
    assert "published_posts" in stats
    assert "failed_posts" in stats
    assert "connected_accounts" in stats

    # 2. Recent posts
    recent_res = client.get("/dashboard/recent-posts", headers=headers)
    assert recent_res.status_code == 200
    assert isinstance(recent_res.json(), list)

    # 3. Upcoming posts
    upcoming_res = client.get("/dashboard/upcoming-posts", headers=headers)
    assert upcoming_res.status_code == 200
    assert isinstance(upcoming_res.json(), list)

    # 4. Activity stream
    activity_res = client.get("/dashboard/activity", headers=headers)
    assert activity_res.status_code == 200
    assert isinstance(activity_res.json(), list)


def test_profile_management(client):
    login_res = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. View profile
    me_res = client.get("/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "creator@socialpilot.io"

    # 2. Update profile
    update_res = client.put("/users/me", json={
        "name": "Alex Content Creator",
        "company": "Creator Studio HQ",
        "job_title": "Senior Content Lead",
        "bio": "Specialist in video & story campaign growth.",
        "timezone": "America/New_York"
    }, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Alex Content Creator"
    assert updated_data["job_title"] == "Senior Content Lead"
    assert updated_data["timezone"] == "America/New_York"


def test_post_targets_and_selective_retry(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create post
    create_res = client.post("/posts", json={
        "title": "Multi-Target Post Test",
        "content": "Publishing across platforms with independent targets!",
        "platform": "twitter",
        "post_type": "text",
        "status": "draft"
    }, headers=headers)
    assert create_res.status_code == 201
    post = create_res.json()
    post_id = post["id"]
    targets = post.get("platform_targets", [])
    assert len(targets) >= 1
    target_id = targets[0]["id"]

    # 2. Selective retry
    retry_res = client.post(f"/posts/{post_id}/targets/{target_id}/retry", headers=headers)
    assert retry_res.status_code == 200
    assert retry_res.json()["id"] == post_id

    # 3. Post logs
    logs_res = client.get(f"/posts/{post_id}/logs", headers=headers)
    assert logs_res.status_code == 200
    assert isinstance(logs_res.json(), list)

    # 4. All logs
    all_logs_res = client.get("/posts/logs/all", headers=headers)
    assert all_logs_res.status_code == 200
    assert isinstance(all_logs_res.json(), list)
