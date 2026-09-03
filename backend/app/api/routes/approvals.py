from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.approval import ApprovalRequest
from app.db.models.post import Post
from app.db.models.user import User
from app.schemas.post import ApprovalRequestResponse, PostApprovalAction, PostResponse
from app.core.security import get_current_user, require_permission, require_roles
from app.services.notifications import create_notification
from app.services.audit import log_audit_event


router = APIRouter(
    prefix="/approvals",
    tags=["Post Approvals Workflow"]
)


def _format_approval_response(req: ApprovalRequest) -> ApprovalRequestResponse:
    post = req.post
    requester = req.requester
    reviewer = req.reviewer
    media_url = (post.media_url or (post.media[0].file_url if post.media else None)) if post else None
    media_type = (post.media_type or (post.media[0].file_type if post.media else None)) if post else None

    return ApprovalRequestResponse(
        id=req.id,
        uuid=req.uuid,
        post_id=req.post_id,
        requested_by=req.requested_by,
        reviewed_by=req.reviewed_by,
        status=req.status,
        rejection_reason=req.rejection_reason,
        created_at=req.created_at,
        reviewed_at=req.reviewed_at,
        creator_name=requester.name if requester else "Creator",
        reviewer_name=reviewer.name if reviewer else None,
        post_title=post.title if post else None,
        post_content=post.content if post else "",
        post_platform=post.platform if post else "social",
        scheduled_at=post.scheduled_at if post else None,
        media_url=media_url,
        media_type=media_type
    )


@router.get("", response_model=List[ApprovalRequestResponse])
def list_approval_requests(
    status_filter: Optional[str] = Query(None, alias="status", description="pending, approved, rejected"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List approval requests.
    - Administrators, Business Owners & Managers see all workspace approval requests.
    - Content Creators see their own submitted approval requests.
    """
    query = db.query(ApprovalRequest)

    if current_user.get("role") == "content_creator":
        query = query.filter(ApprovalRequest.requested_by == current_user["user_id"])

    if status_filter:
        query = query.filter(ApprovalRequest.status == status_filter)

    requests = query.order_by(ApprovalRequest.created_at.desc()).all()
    return [_format_approval_response(r) for r in requests]


@router.get("/pending", response_model=List[ApprovalRequestResponse])
def get_pending_approvals(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending approval requests."""
    query = db.query(ApprovalRequest).filter(ApprovalRequest.status == "pending")
    if current_user.get("role") == "content_creator":
        query = query.filter(ApprovalRequest.requested_by == current_user["user_id"])

    requests = query.order_by(ApprovalRequest.created_at.desc()).all()
    return [_format_approval_response(r) for r in requests]


@router.get("/stats")
def get_approval_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of pending approvals."""
    query = db.query(ApprovalRequest).filter(ApprovalRequest.status == "pending")
    if current_user.get("role") == "content_creator":
        query = query.filter(ApprovalRequest.requested_by == current_user["user_id"])

    pending_count = query.count()
    return {"pending_count": pending_count}


@router.post("/{approval_id}/decide", response_model=ApprovalRequestResponse)
def decide_approval_request(
    approval_id: int,
    data: PostApprovalAction,
    current_user: dict = Depends(require_permission("posts.approve")),
    db: Session = Depends(get_db)
):
    """Approve or reject an approval request by its ID."""
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")

    post = req.post
    if not post:
        raise HTTPException(status_code=404, detail="Associated post not found")

    if current_user["user_id"] == post.user_id and current_user.get("role") == "content_creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Content creators cannot approve their own posts. An administrator must approve it."
        )

    req.reviewed_by = current_user["user_id"]
    req.reviewed_at = datetime.now(timezone.utc)
    req.status = "approved" if data.action == "approve" else "rejected"
    req.rejection_reason = data.rejection_reason if data.action == "reject" else None

    reviewer_user = db.query(User).filter(User.id == current_user["user_id"]).first()
    creator_user = db.query(User).filter(User.id == post.user_id).first()
    creator_name = creator_user.name if creator_user else "Creator"
    reviewer_name = reviewer_user.name if reviewer_user else "Admin"
    platform_title = (post.platform or "social").title()

    if data.action == "approve":
        post.approval_status = "approved"
        post.status = "scheduled" if post.scheduled_at else "draft"
        post.failure_reason = None
        for target in (post.platform_targets or []):
            target.status = "pending"
            target.error_message = None

        audit_desc = f"{reviewer_name} approved {creator_name}'s {platform_title} post."
        notif_msg = f"Your {platform_title} post has been APPROVED by {reviewer_name}! 👍 It is scheduled for publishing."
        notif_type = "publish_success"
    else:
        post.approval_status = "rejected"
        post.status = "draft"
        post.failure_reason = f"Rejected: {data.rejection_reason or 'Needs revision'}"
        for target in (post.platform_targets or []):
            target.status = "draft"

        audit_desc = f"{reviewer_name} rejected {creator_name}'s {platform_title} post."
        notif_msg = f"Your {platform_title} post was rejected by {reviewer_name}. Reason: {data.rejection_reason or 'Needs revision'}"
        notif_type = "publish_failed"

    db.commit()
    db.refresh(req)
    db.refresh(post)

    create_notification(
        db=db,
        user_id=post.user_id,
        title=f"Post {'Approved 👍' if data.action == 'approve' else 'Rejected ❌'}",
        message=notif_msg,
        type=notif_type,
        link="/posts"
    )

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action=f"post.{data.action}d",
        module="approvals",
        description=audit_desc
    )

    return _format_approval_response(req)


@router.post("/{approval_id}/approve", response_model=ApprovalRequestResponse)
def approve_approval_request(
    approval_id: int,
    current_user: dict = Depends(require_permission("posts.approve")),
    db: Session = Depends(get_db)
):
    return decide_approval_request(
        approval_id=approval_id,
        data=PostApprovalAction(action="approve"),
        current_user=current_user,
        db=db
    )


@router.post("/{approval_id}/reject", response_model=ApprovalRequestResponse)
def reject_approval_request(
    approval_id: int,
    data: Optional[PostApprovalAction] = None,
    current_user: dict = Depends(require_permission("posts.approve")),
    db: Session = Depends(get_db)
):
    reason = data.rejection_reason if data else "Needs revision"
    return decide_approval_request(
        approval_id=approval_id,
        data=PostApprovalAction(action="reject", rejection_reason=reason),
        current_user=current_user,
        db=db
    )
