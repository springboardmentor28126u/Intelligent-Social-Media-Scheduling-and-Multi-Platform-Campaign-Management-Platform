from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.notification import Notification
from app.db.models.user import User
from app.schemas.notification import NotificationResponse, NotificationMarkReadRequest
from app.core.security import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


def _format_notification(n: Notification) -> NotificationResponse:
    actor_name = None
    if n.actor:
        actor_name = n.actor.name
    elif n.metadata_json and isinstance(n.metadata_json, dict):
        actor_name = n.metadata_json.get("creator_name") or n.metadata_json.get("user_name") or n.metadata_json.get("actor_name")

    return NotificationResponse(
        id=n.id,
        uuid=n.uuid,
        user_id=n.user_id,
        actor_user_id=n.actor_user_id,
        actor_name=actor_name,
        title=n.title,
        message=n.message,
        type=n.type,
        related_entity_type=n.related_entity_type,
        related_entity_id=n.related_entity_id,
        link=n.link,
        is_read=n.is_read,
        metadata_json=n.metadata_json,
        created_at=n.created_at
    )


@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Notification)
        .filter(Notification.user_id == current_user["user_id"])
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = (
        query.order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_format_notification(n) for n in notifications]


@router.get("/unread-count")
def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user["user_id"],
            Notification.is_read == False
        )
        .count()
    )
    return {"unread_count": count}


@router.patch("/read-all")
def mark_all_notifications_as_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = current_user["user_id"]
    db.query(Notification).filter(Notification.user_id == uid, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_single_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user["user_id"]
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return _format_notification(notif)


@router.post("/mark-read")
def mark_notifications_as_read(
    data: NotificationMarkReadRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = current_user["user_id"]
    if data.mark_all:
        db.query(Notification).filter(Notification.user_id == uid).update({"is_read": True})
    elif data.notification_ids:
        db.query(Notification).filter(
            Notification.user_id == uid,
            Notification.id.in_(data.notification_ids)
        ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "Notifications updated successfully"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user["user_id"]
        )
        .first()
    )
    if notif:
        db.delete(notif)
        db.commit()
    return None
