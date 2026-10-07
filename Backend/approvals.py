"""Revision-aware review; content edits always invalidate approval."""
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from visibility import scoped_query
from database import get_db
from models import Post, Workspace, ApprovalEvent, User, Membership
from posts import owned_post
from notifications import notify_scope
from roles import permissions_for


def can_publish_as(db, owner_id, actor_id):
    workspace = db.query(Workspace).filter_by(storage_user_id=owner_id).first()
    if workspace:
        member = db.query(Membership).filter_by(workspace_id=workspace.id, user_id=actor_id, status="active").populate_existing().first()
        return bool(member and "publish:write" in permissions_for(member.role))
    actor = db.query(User).filter_by(id=actor_id).populate_existing().first() if actor_id else None
    return bool(actor and actor.id == owner_id and "publish:write" in permissions_for(actor.role))


def require_approved(db, post):
    # The latest revision's author is replaced on every content edit. A manager
    # cannot inherit the original creator's direct-publishing privilege.
    workspace = db.query(Workspace).filter_by(storage_user_id=post.user_id).first()
    author = post.creator_id or (post.user_id if not workspace else None)
    creator_authored = post.creator_role == "content_creator"
    # Current role cannot establish which role authored a historical revision.
    if creator_authored and can_publish_as(db, post.user_id, author):
        return
    if post.approval_status == "approved":
        approvals = db.query(ApprovalEvent).filter_by(post_id=post.id, revision=post.revision,
                                                    action="creator_approve").all()
        if any(can_publish_as(db, post.user_id, event.actor_id) for event in approvals):
            return
    raise HTTPException(409, "A creator must give final approval to this revision before publishing")


class ReviewInput(BaseModel):
    action: Literal["submit", "approve", "reject", "withdraw", "comment"]
    revision: int = Field(ge=1)
    comment: str = Field(default="", max_length=2000)


def make_router(require_permission):
    router = APIRouter(tags=["Content approval"])

    @router.get("/approvals")
    def queue(payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        rows = scoped_query(db, Post).filter_by(user_id=int(payload["sub"]), status="draft").order_by(Post.updated_at.desc()).limit(500).all()
        return [{"id": p.id, "title": p.title, "content": p.content, "image_url": p.image_url,
                 "video_url": p.video_url, "creator_id": p.creator_id, "approval_status": p.approval_status,
                 "revision": p.revision, "updated_at": p.updated_at} for p in rows]

    @router.get("/posts/{post_id}/reviews")
    def history(post_id: int, payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        owned_post(db, int(payload["sub"]), post_id)
        rows = db.query(ApprovalEvent, User.name).join(User, User.id == ApprovalEvent.actor_id).filter(
            ApprovalEvent.post_id == post_id).order_by(ApprovalEvent.id).all()
        return [{"id": e.id, "actor": name, "revision": e.revision, "action": e.action,
                 "comment": e.comment, "created_at": e.created_at.replace(tzinfo=timezone.utc) if e.created_at.tzinfo is None else e.created_at} for e, name in rows]

    @router.post("/posts/{post_id}/reviews")
    def review(post_id: int, data: ReviewInput, payload=Depends(require_permission("content:write")), db: Session = Depends(get_db)):
        if not payload.get("workspace_id"):
            raise HTTPException(409, "Choose a team workspace to use content approval")
        post = owned_post(db, int(payload["sub"]), post_id, lock=True)
        actor = int(payload.get("actor_sub", payload["sub"]))
        if post.status != "draft":
            raise HTTPException(409, "Only drafts can be reviewed; cancel and restore scheduled posts first")
        if post.revision != data.revision:
            raise HTTPException(409, "This draft changed. Reload and review the latest revision")
        creator = "publish:write" in permissions_for(payload["role"])
        reviewer = creator or payload["role"] == "marketing_manager"
        action = data.action
        if action in {"approve", "reject"}:
            if not reviewer:
                raise HTTPException(403, "A manager or creator must review this post")
            if action == "reject" and not data.comment.strip():
                raise HTTPException(422, "Explain what needs to change")
            if creator:
                if post.approval_status != "awaiting_creator":
                    raise HTTPException(409, "A manager must approve this revision first")
                post.approval_status = "approved" if action == "approve" else "rejected"
                action = "creator_approve" if action == "approve" else "creator_reject"
            else:
                if post.approval_status not in {"draft", "pending", "rejected"}:
                    raise HTTPException(409, "This revision is already awaiting creator review")
                post.approval_status = "awaiting_creator" if action == "approve" else "rejected"
                action = "manager_approve" if action == "approve" else "manager_reject"
        elif action == "submit":
            if post.approval_status not in {"draft", "rejected"}:
                raise HTTPException(409, "This revision has already been submitted or approved")
            post.approval_status = "pending"
        elif action == "withdraw":
            if actor != post.creator_id and not reviewer:
                raise HTTPException(403, "Only the author or a reviewer can withdraw this submission")
            if post.approval_status not in {"pending", "awaiting_creator"}:
                raise HTTPException(409, "This post is not awaiting approval")
            post.approval_status = "draft"
        elif not data.comment.strip():
            raise HTTPException(422, "Enter a comment")
        post.updated_at = datetime.now(timezone.utc)
        event = ApprovalEvent(post_id=post.id, actor_id=actor, revision=post.revision, action=action, comment=data.comment.strip())
        db.add(event)
        db.flush()
        notify_scope(db, post.user_id, "approval", f"{post.title}: {action.replace('_', ' ')}", data.comment.strip() or "Open Content Approval to review this update.",
                     post_id=post.id, key=f"review:{event.id}", reviewers=data.action == "submit",
                     roles={"content_creator"} if action == "manager_approve" else
                           ({"marketing_manager"} if action in {"creator_approve", "creator_reject"} else None))
        db.commit()
        return {"approval_status": post.approval_status, "revision": post.revision}

    return router
