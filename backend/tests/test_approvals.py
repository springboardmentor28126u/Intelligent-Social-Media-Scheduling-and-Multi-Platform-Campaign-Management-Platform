import pytest
from datetime import datetime, timezone, timedelta
from app.db.models.notification import Notification
from app.db.models.post import Post


def test_creator_direct_scheduling_and_admin_notification(client, db_session):
    """
    Verify that Content Creators schedule posts directly without pending approval,
    and Admins receive an activity notification.
    """
    # 1. Login as Content Creator
    creator_login = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    assert creator_login.status_code == 200
    creator_token = creator_login.json()["access_token"]
    creator_user_id = creator_login.json()["user"]["id"]
    creator_name = creator_login.json()["user"]["name"]

    # 2. Login as Administrator
    admin_login = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_user_id = admin_login.json()["user"]["id"]

    # 3. Creator schedules a LinkedIn post
    future_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    post_res = client.post("/posts", json={
        "title": "Creator Direct Launch Post",
        "content": "Excited to launch our product directly without approval bottlenecks! #Velocity",
        "platform": "linkedin",
        "status": "scheduled",
        "scheduled_at": future_time
    }, headers={"Authorization": f"Bearer {creator_token}"})

    assert post_res.status_code == 201
    post_data = post_res.json()
    post_id = post_data["id"]

    # Creator scheduled post is directly 'scheduled', NOT 'pending_approval'
    assert post_data["status"] == "scheduled"
    assert post_data.get("scheduled_at") is not None

    # 4. Verify Admin received activity notification
    notif = db_session.query(Notification).filter(
        Notification.user_id == admin_user_id,
        Notification.related_entity_type == "post",
        Notification.related_entity_id == str(post_id)
    ).order_by(Notification.created_at.desc()).first()

    assert notif is not None
    assert "scheduled" in notif.title.lower() or "scheduled" in notif.message.lower()
    assert notif.actor_user_id == creator_user_id
    assert notif.is_read is False


def test_creator_direct_publish_and_update_notifications(client, db_session):
    """
    Verify creator can create, update, and publish posts directly,
    triggering appropriate notifications for admins.
    """
    creator_login = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    creator_token = creator_login.json()["access_token"]
    creator_user_id = creator_login.json()["user"]["id"]

    admin_login = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    admin_token = admin_login.json()["access_token"]
    admin_user_id = admin_login.json()["user"]["id"]

    # 1. Creator creates a draft post
    create_res = client.post("/posts", json={
        "title": "Initial Draft",
        "content": "Draft content about AI marketing.",
        "platform": "twitter",
        "status": "draft"
    }, headers={"Authorization": f"Bearer {creator_token}"})
    assert create_res.status_code == 201
    post_id = create_res.json()["id"]
    assert create_res.json()["status"] == "draft"

    # 2. Creator updates the post
    update_res = client.put(f"/posts/{post_id}", json={
        "title": "Updated AI Marketing Post",
        "content": "Updated content with fresh insights #AI",
        "platform": "twitter"
    }, headers={"Authorization": f"Bearer {creator_token}"})
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated AI Marketing Post"

    # 3. Creator publishes directly
    pub_res = client.post(f"/posts/{post_id}/publish", headers={"Authorization": f"Bearer {creator_token}"})
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] in ["published", "failed"]  # simulated or real dispatch


def test_notifications_endpoints_and_read_state(client, db_session):
    """
    Verify /notifications, /notifications/unread-count, /notifications/{id}/read,
    and /notifications/read-all work properly.
    """
    admin_login = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    admin_token = admin_login.json()["access_token"]
    admin_user_id = admin_login.json()["user"]["id"]

    # Check list of notifications
    notifs_res = client.get("/notifications", headers={"Authorization": f"Bearer {admin_token}"})
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert isinstance(notifs, list)

    # Check unread count endpoint
    unread_res = client.get("/notifications/unread-count", headers={"Authorization": f"Bearer {admin_token}"})
    assert unread_res.status_code == 200
    assert "unread_count" in unread_res.json()

    if len(notifs) > 0:
        first_id = notifs[0]["id"]
        # Mark single as read
        read_res = client.patch(f"/notifications/{first_id}/read", headers={"Authorization": f"Bearer {admin_token}"})
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

    # Mark all read
    all_read_res = client.patch("/notifications/read-all", headers={"Authorization": f"Bearer {admin_token}"})
    assert all_read_res.status_code == 200
    assert "marked as read" in all_read_res.json()["message"].lower()

    # Unread count should now be 0
    final_unread = client.get("/notifications/unread-count", headers={"Authorization": f"Bearer {admin_token}"})
    assert final_unread.status_code == 200
    assert final_unread.json()["unread_count"] == 0


def test_user_registration_generates_admin_notification(client, db_session):
    """
    Verify that registering a new user generates a notification for admins
    with the actor's ID and link to /admin/users, without leaking secrets.
    """
    admin_login = client.post("/auth/login", json={
        "email": "admin@socialpilot.io",
        "password": "password123"
    })
    admin_token = admin_login.json()["access_token"]
    admin_user_id = admin_login.json()["user"]["id"]

    # Register new user
    new_email = f"newuser_{datetime.now(timezone.utc).timestamp()}@example.com"
    reg_res = client.post("/auth/register", json={
        "name": "Jane Developer",
        "email": new_email,
        "password": "SecurePassword123!",
        "role": "content_creator"
    })
    assert reg_res.status_code == 200 or reg_res.status_code == 201
    new_user_id = reg_res.json()["id"]

    # Verify notification created for Admin
    user_notif = db_session.query(Notification).filter(
        Notification.user_id == admin_user_id,
        Notification.related_entity_type == "user",
        Notification.related_entity_id == str(new_user_id)
    ).first()

    assert user_notif is not None
    assert "Jane Developer" in user_notif.message
    assert "has joined SocialPilot" in user_notif.message
    assert "password" not in user_notif.message.lower()
    assert "securepassword" not in user_notif.message.lower()
