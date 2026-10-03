import io
import pytest
from datetime import datetime, timedelta
from models import Post, PostStatus


def test_create_post(client, test_user):
    resp = client.post(
        "/posts",
        json={
            "content": "Excited to launch our Q4 omni-channel growth campaign! #SaaS #Growth",
            "platforms": ["linkedin", "twitter"],
            "content_type": "text",
            "status": "DRAFT",
        },
    )
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert "id" in data or "post" in data or "content" in data


def test_schedule_post(client, test_user):
    future_time = (datetime.utcnow() + timedelta(days=2)).isoformat()
    resp = client.post(
        "/posts",
        json={
            "content": "Scheduled launch post for upcoming product release",
            "platforms": ["instagram", "facebook"],
            "content_type": "image",
            "status": "SCHEDULED",
            "scheduled_at": future_time,
        },
    )
    assert resp.status_code in [200, 201]


def test_publish_multi_platform(client, test_user):
    resp = client.post(
        "/publish/multi-platform",
        json={
            "content": "Live announcement across all brand networks! 🚀",
            "platforms": ["twitter", "instagram"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True
    assert "dispatched_platforms" in data
    assert "twitter" in data["dispatched_platforms"]
    assert "instagram" in data["dispatched_platforms"]


def test_media_upload_endpoint(client, test_user):
    # Simulated PNG image bytes
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("banner.png", io.BytesIO(fake_png), "image/png")}
    resp = client.post("/media/upload", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert "url" in data
    assert data["url"].endswith(".png")
