from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationMarkReadRequest
from app.core.security import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user["user_id"])
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return notifications


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
