from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models.approval import ApprovalRequest
from app.db.models.post import Post
from app.db.models.user import User
from app.services.notifications import notify_admins_of_creator_activity
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

    platform_name = (post.platform or "social").title()
    action = "Post Scheduled" if post.scheduled_at else "New Post"

    # Send admin notifications immediately
    notify_admins_of_creator_activity(
        db=db,
        creator_user=requester_user,
        post=post,
        action=action
    )

    log_audit_event(
        db=db,
        user_id=requester_user.id,
        action="post.submit_approval",
        module="posts",
        description=f"Creator submitted a {platform_name} post for approval."
    )

    return approval_req

