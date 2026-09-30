from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/notifications", tags=["notifications"])


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_post_id: Optional[int] = None,
    related_campaign_id: Optional[int] = None,
) -> models.Notification:
    """Single insert point for creating notifications."""
    notification = models.Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_post_id=related_post_id,
        related_campaign_id=related_campaign_id,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get("", response_model=schemas.NotificationListResponse)
@router.get("/", response_model=schemas.NotificationListResponse)
def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch current user's notifications, newest first, paginated, plus unread count."""
    query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    total = query.count()
    unread_count = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id, models.Notification.is_read == False)
        .count()
    )
    notifications = (
        query.order_by(models.Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "total": total,
    }


@router.post("/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark a single notification as read. Returns 404 if not found or not owned."""
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark all notifications belonging to current user as read."""
    updated = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id, models.Notification.is_read == False)
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return {"message": "All notifications marked as read", "updated_count": updated}
