from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models.approval import ApprovalRequest
from app.db.models.post import Post
from app.db.models.user import User
from app.services.notifications import create_notification
from app.services.audit import log_audit_event


def create_approval_request_for_post(db: Session, post: Post, requester_user: User) -> ApprovalRequest:
    """
    Creates an approval request for a post and sends real-time notifications
    to all Administrators and Business Users in the system.
    """
    # Check if there is already an active pending approval request
    existing = (
        db.query(ApprovalRequest)
        .filter(ApprovalRequest.post_id == post.id, ApprovalRequest.status == "pending")
        .first()
    )
    if existing:
        approval_req = existing
    else:
        approval_req = ApprovalRequest(
            post_id=post.id,
            requested_by=requester_user.id,
            status="pending",
            created_at=datetime.now(timezone.utc)
        )
        db.add(approval_req)
        db.commit()
        db.refresh(approval_req)

    # Resolve platform & scheduled details
    platform_name = (post.platform or "social").title()
    scheduled_str = f" scheduled for {post.scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}" if post.scheduled_at else ""
    preview = (post.content[:50] + "...") if len(post.content) > 50 else post.content

    # Notify Admins and Managers
    admins = (
        db.query(User)
        .filter(User.role.in_(["administrator", "business_user"]))
        .all()
    )

    for admin in admins:
        # Don't notify the user if they happen to be an admin creating their own post
        if admin.id == requester_user.id:
            continue

        create_notification(
            db=db,
            user_id=admin.id,
            title="Approval Required 📩",
            message=f"{requester_user.name} submitted a {platform_name} post{scheduled_str}: \"{preview}\"",
            type="campaign_alert",
            link=f"/posts?status=pending_approval&post_id={post.id}",
            metadata_json={
                "post_id": post.id,
                "approval_id": approval_req.id,
                "creator_id": requester_user.id,
                "creator_name": requester_user.name,
                "platform": post.platform,
                "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
                "preview": preview,
                "status": "pending_approval"
            }
        )

    log_audit_event(
        db=db,
        user_id=requester_user.id,
        action="post.submit_approval",
        module="posts",
        description=f"Creator submitted a {platform_name} post for approval."
    )

    return approval_req
