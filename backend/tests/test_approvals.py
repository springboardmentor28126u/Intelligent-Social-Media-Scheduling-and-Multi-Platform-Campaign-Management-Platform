import pytest
from datetime import datetime, timezone, timedelta
from app.db.models.approval import ApprovalRequest
from app.db.models.notification import Notification


def test_complete_approval_workflow(client, db_session):
    # 1. Login as Content Creator
    creator_login = client.post("/auth/login", json={
        "email": "creator@socialpilot.io",
        "password": "password123"
    })
    assert creator_login.status_code == 200
    creator_token = creator_login.json()["access_token"]
    creator_user_id = creator_login.json()["user"]["id"]

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
        "title": "Creator Q3 LinkedIn Announcement",
        "content": "Excited to share our Q3 strategic achievements with the network! #Leadership",
        "platform": "linkedin",
        "status": "scheduled",
        "scheduled_at": future_time
    }, headers={"Authorization": f"Bearer {creator_token}"})

    assert post_res.status_code == 201
    post_data = post_res.json()
    post_id = post_data["id"]

    # Post must be pending_approval and approval_status pending for content_creator
    assert post_data["status"] == "pending_approval"
    assert post_data.get("approval_status") == "pending"

    # 4. Check ApprovalRequest record in database
    approval_req = db_session.query(ApprovalRequest).filter(
        ApprovalRequest.post_id == post_id,
        ApprovalRequest.status == "pending"
    ).first()
    assert approval_req is not None
    assert approval_req.requested_by == creator_user_id

    # 5. Check Admin received real Notification in database
    admin_notif = db_session.query(Notification).filter(
        Notification.user_id == admin_user_id,
        Notification.type == "campaign_alert"
    ).order_by(Notification.created_at.desc()).first()
    assert admin_notif is not None
    assert "Approval Required" in admin_notif.title
    assert "Q3" in admin_notif.message

    # 6. Admin queries /approvals/pending endpoint
    pending_res = client.get("/approvals/pending", headers={"Authorization": f"Bearer {admin_token}"})
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    matching = [p for p in pending_list if p["post_id"] == post_id]
    assert len(matching) == 1
    assert matching[0]["post_platform"] == "linkedin"
    assert matching[0]["creator_name"] is not None

    # 7. Creator tries to publish pending_approval post -> blocked
    pub_attempt = client.post(f"/posts/{post_id}/publish", headers={"Authorization": f"Bearer {creator_token}"})
    assert pub_attempt.status_code == 400
    assert "pending approval" in pub_attempt.json()["detail"].lower()

    # 8. Creator tries to approve own post -> blocked (403)
    self_approve = client.post(f"/posts/{post_id}/approve", json={
        "action": "approve"
    }, headers={"Authorization": f"Bearer {creator_token}"})
    assert self_approve.status_code in [403, 401]

    # 9. Admin approves the post
    approve_res = client.post(f"/posts/{post_id}/approve", json={
        "action": "approve"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert approve_res.status_code == 200
    approved_post = approve_res.json()
    assert approved_post["status"] == "scheduled"
    assert approved_post["approval_status"] == "approved"

    # 10. Verify ApprovalRequest status updated to "approved"
    db_session.refresh(approval_req)
    assert approval_req.status == "approved"
    assert approval_req.reviewed_by == admin_user_id

    # 11. Verify creator received confirmation notification
    creator_notif = db_session.query(Notification).filter(
        Notification.user_id == creator_user_id,
        Notification.type == "publish_success"
    ).order_by(Notification.created_at.desc()).first()
    assert creator_notif is not None
    assert "APPROVED" in creator_notif.message

    # 12. Test Rejection flow: Creator creates draft & submits for approval
    draft_res = client.post("/posts", json={
        "title": "Draft post needing revision",
        "content": "Work in progress draft content #WIP",
        "platform": "twitter",
        "status": "draft"
    }, headers={"Authorization": f"Bearer {creator_token}"})
    assert draft_res.status_code == 201
    draft_id = draft_res.json()["id"]

    submit_res = client.post(f"/posts/{draft_id}/submit-approval", headers={"Authorization": f"Bearer {creator_token}"})
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "pending_approval"
    assert submit_res.json()["approval_status"] == "pending"

    # Admin rejects post with a note
    reject_res = client.post(f"/posts/{draft_id}/approve", json={
        "action": "reject",
        "rejection_reason": "Please add relevant hashtags and check brand tone."
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert reject_res.status_code == 200
    rejected_post = reject_res.json()
    assert rejected_post["approval_status"] == "rejected"
    assert "Rejected" in rejected_post["failure_reason"]

    # Verify ApprovalRequest marked as rejected
    reject_req = db_session.query(ApprovalRequest).filter(
        ApprovalRequest.post_id == draft_id
    ).order_by(ApprovalRequest.created_at.desc()).first()
    assert reject_req.status == "rejected"
    assert "brand tone" in reject_req.rejection_reason
