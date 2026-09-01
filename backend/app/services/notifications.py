from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    link: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None
) -> Notification:
    """Creates an in-app notification and dispatches alert hooks."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
        metadata_json=metadata_json,
        is_read=False
    )
    db.add(notification)
    try:
        db.commit()
        db.refresh(notification)
    except Exception:
        db.rollback()
    return notification


def broadcast_team_notification(
    db: Session,
    user_ids: List[int],
    title: str,
    message: str,
    type: str = "team_invite",
    link: Optional[str] = None
):
    """Sends notifications to a list of users."""
    for uid in user_ids:
        create_notification(db, uid, title, message, type=type, link=link)
