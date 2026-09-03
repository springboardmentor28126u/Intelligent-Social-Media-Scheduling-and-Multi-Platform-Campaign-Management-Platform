import pytest
from datetime import datetime, timezone, timedelta


def test_create_and_publish_post(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    # 1. Create a draft post
    res = client.post("/posts", json={
        "title": "Test Post 1",
        "content": "Exciting product feature release! #Launch",
        "platform": "instagram",
        "post_type": "image",
        "status": "draft"
    }, headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 201
    post_data = res.json()
    post_id = post_data["id"]
    assert post_data["status"] == "draft"

    # 2. Publish post now
    pub_res = client.post(f"/posts/{post_id}/publish", headers={
        "Authorization": f"Bearer {token}"
    })
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"
    assert pub_res.json()["external_post_id"] is not None


def test_schedule_post(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    res = client.post("/posts", json={
        "title": "Scheduled Announcement",
        "content": "Save the date for our upcoming webinar! #Webinar",
        "platform": "linkedin",
        "status": "scheduled",
        "scheduled_at": future_time
    }, headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 201
    assert res.json()["status"] == "scheduled"


def test_create_post_with_image_upload(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    fake_image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    res = client.post(
        "/posts",
        data={
            "caption": "Check out this visual launch graphic! #Launch",
            "campaign_title": "Summer Visual Campaign",
            "platform": "instagram",
            "status": "draft"
        },
        files={
            "media_file": ("test_promo.png", fake_image_bytes, "image/png")
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert res.status_code == 201
    data = res.json()
    assert data["content"] == "Check out this visual launch graphic! #Launch"
    assert data["title"] == "Summer Visual Campaign"
    assert data["media_type"] == "image"
    assert data["media_url"] is not None
    assert data["media_url"].startswith("/uploads/")
    assert len(data["media"]) == 1
    assert data["media"][0]["file_name"] == "test_promo.png"


def test_create_post_with_video_upload(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    fake_video_bytes = b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free..."

    res = client.post(
        "/posts",
        data={
            "caption": "Watch our new video demo in action! #Demo #Video",
            "campaign_title": "Product Video Teaser",
            "platform": "youtube",
            "status": "draft"
        },
        files={
            "media_file": ("demo_walkthrough.mp4", fake_video_bytes, "video/mp4")
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert res.status_code == 201
    data = res.json()
    assert data["content"] == "Watch our new video demo in action! #Demo #Video"
    assert data["media_type"] == "video"
    assert data["media_url"] is not None
    assert data["media_url"].endswith(".mp4")
    assert len(data["media"]) == 1


def test_dashboard_summary_and_stats(client):
    login_res = client.post("/auth/login", json={
        "email": "marketing@socialpilot.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Initial stats
    init_res = client.get("/dashboard/summary", headers=headers)
    assert init_res.status_code == 200
    init_summary = init_res.json()
    assert "total_posts" in init_summary
    assert "connected_accounts" in init_summary
    initial_drafts = init_summary["drafts"]
    initial_total = init_summary["total_posts"]

    # Create draft
    draft_res = client.post("/posts", json={
        "title": "Dashboard Verification Draft",
        "content": "Testing dashboard automatic count updates",
        "platform": "linkedin",
        "status": "draft"
    }, headers=headers)
    assert draft_res.status_code == 201
    post_id = draft_res.json()["id"]

    # Check updated stats
    after_draft = client.get("/dashboard/summary", headers=headers).json()
    assert after_draft["total_posts"] == initial_total + 1
    assert after_draft["drafts"] == initial_drafts + 1

    # Publish draft
    pub_res = client.post(f"/posts/{post_id}/publish", headers=headers)
    assert pub_res.status_code == 200

    # Check after publish
    after_pub = client.get("/dashboard/summary", headers=headers).json()
    assert after_pub["drafts"] == initial_drafts
    assert after_pub["published"] >= 1


