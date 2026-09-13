import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.models.notification import Notification
from app.db.models.user import User

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    actor_user_id: Optional[int] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    link: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None
) -> Optional[Notification]:
    """
    Creates an in-app notification persistently in the database.
    Catches errors gracefully to prevent breaking caller business logic.
    """
    try:
        notification = Notification(
            user_id=user_id,
            actor_user_id=actor_user_id,
            title=title,
            message=message,
            type=type,
            related_entity_type=related_entity_type,
            related_entity_id=str(related_entity_id) if related_entity_id is not None else None,
            link=link,
            metadata_json=metadata_json,
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    except Exception as e:
        logger.error(f"Failed to create notification for user {user_id}: {e}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        return None


def broadcast_team_notification(
    db: Session,
    user_ids: List[int],
    title: str,
    message: str,
    type: str = "team_invite",
    actor_user_id: Optional[int] = None,
    link: Optional[str] = None
) -> List[Notification]:
    """Sends notifications to a list of user IDs."""
    created = []
    for uid in user_ids:
        n = create_notification(
            db=db,
            user_id=uid,
            title=title,
            message=message,
            type=type,
            actor_user_id=actor_user_id,
            link=link
        )
        if n:
            created.append(n)
    return created


def notify_admins(
    db: Session,
    title: str,
    message: str,
    type: str,
    actor_user_id: Optional[int] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    link: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None
) -> List[Notification]:
    """
    Broadcasts a notification to all workspace Administrators and Business Users.
    Safely skips the actor if they are an admin, unless no other admins exist.
    """
    try:
        admins = db.query(User).filter(
            User.role.in_(["administrator", "business_user"]),
            User.is_active == True
        ).all()

        created_notifs = []
        for admin in admins:
            # If the actor is an admin performing the action, we can still notify or skip self
            if actor_user_id and admin.id == actor_user_id and len(admins) > 1:
                continue
            notif = create_notification(
                db=db,
                user_id=admin.id,
                title=title,
                message=message,
                type=type,
                actor_user_id=actor_user_id,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                link=link,
                metadata_json=metadata_json
            )
            if notif:
                created_notifs.append(notif)
        return created_notifs
    except Exception as e:
        logger.error(f"Error in notify_admins: {e}", exc_info=True)
        return []


# ── Specialized Notification Helpers ──────────────────────────────────────────

def notify_admins_new_user(db: Session, new_user: Any) -> List[Notification]:
    """Notifies Admins when a new user registers on the platform."""
    user_name = getattr(new_user, "name", "A new user")
    user_id = getattr(new_user, "id", None)
    title = "New user registered"
    message = f"{user_name} has joined SocialPilot."
    
    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="NEW_USER",
        actor_user_id=user_id,
        related_entity_type="user",
        related_entity_id=str(user_id) if user_id else None,
        link="/admin/users",
        metadata_json={
            "user_id": user_id,
            "user_name": user_name,
            "user_email": getattr(new_user, "email", ""),
            "role": getattr(new_user, "role", "content_creator")
        }
    )


def notify_admins_post_created(db: Session, post: Any, actor_user: Any) -> List[Notification]:
    """Notifies Admins when a creator creates a new post draft."""
    actor_name = getattr(actor_user, "name", "Creator")
    actor_id = getattr(actor_user, "id", None)
    platform = (getattr(post, "platform", "social") or "social").title()
    post_id = getattr(post, "id", None)
    
    title = "New post created"
    message = f"{actor_name} created a new {platform} post."

    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="POST_CREATED",
        actor_user_id=actor_id,
        related_entity_type="post",
        related_entity_id=str(post_id) if post_id else None,
        link=f"/posts?post_id={post_id}" if post_id else "/posts",
        metadata_json={
            "post_id": post_id,
            "platform": getattr(post, "platform", ""),
            "title": getattr(post, "title", ""),
            "creator_name": actor_name,
            "creator_id": actor_id,
            "status": getattr(post, "status", "draft")
        }
    )


def notify_admins_post_scheduled(db: Session, post: Any, actor_user: Any) -> List[Notification]:
    """Notifies Admins when a creator schedules a post."""
    actor_name = getattr(actor_user, "name", "Creator")
    actor_id = getattr(actor_user, "id", None)
    platform = (getattr(post, "platform", "social") or "social").title()
    post_id = getattr(post, "id", None)
    scheduled_at = getattr(post, "scheduled_at", None)

    date_str = scheduled_at.strftime("%B %d, %Y at %I:%M %p") if scheduled_at else "the future"
    title = "Post scheduled"
    message = f"{actor_name} scheduled a {platform} post for {date_str}."

    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="POST_SCHEDULED",
        actor_user_id=actor_id,
        related_entity_type="post",
        related_entity_id=str(post_id) if post_id else None,
        link=f"/posts?post_id={post_id}" if post_id else "/calendar",
        metadata_json={
            "post_id": post_id,
            "platform": getattr(post, "platform", ""),
            "title": getattr(post, "title", ""),
            "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
            "creator_name": actor_name,
            "creator_id": actor_id,
            "status": getattr(post, "status", "scheduled")
        }
    )


def notify_admins_post_published(db: Session, post: Any, actor_user: Any) -> List[Notification]:
    """Notifies Admins when a post is published."""
    actor_name = getattr(actor_user, "name", "Creator")
    actor_id = getattr(actor_user, "id", None)
    platform = (getattr(post, "platform", "social") or "social").title()
    post_id = getattr(post, "id", None)

    title = "Post published"
    message = f"{actor_name} published a {platform} post."

    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="POST_PUBLISHED",
        actor_user_id=actor_id,
        related_entity_type="post",
        related_entity_id=str(post_id) if post_id else None,
        link=f"/posts?post_id={post_id}" if post_id else "/posts",
        metadata_json={
            "post_id": post_id,
            "platform": getattr(post, "platform", ""),
            "title": getattr(post, "title", ""),
            "creator_name": actor_name,
            "creator_id": actor_id,
            "status": getattr(post, "status", "published")
        }
    )


def notify_admins_post_updated(db: Session, post: Any, actor_user: Any) -> List[Notification]:
    """Notifies Admins when a post is updated."""
    actor_name = getattr(actor_user, "name", "Creator")
    actor_id = getattr(actor_user, "id", None)
    platform = (getattr(post, "platform", "social") or "social").title()
    post_id = getattr(post, "id", None)
    status = getattr(post, "status", "draft")

    if status == "scheduled":
        message = f"{actor_name} updated a scheduled {platform} post."
    else:
        message = f"{actor_name} updated a {platform} post."

    title = "Post updated"
    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="POST_UPDATED",
        actor_user_id=actor_id,
        related_entity_type="post",
        related_entity_id=str(post_id) if post_id else None,
        link=f"/posts?post_id={post_id}" if post_id else "/posts",
        metadata_json={
            "post_id": post_id,
            "platform": getattr(post, "platform", ""),
            "title": getattr(post, "title", ""),
            "creator_name": actor_name,
            "creator_id": actor_id,
            "status": status
        }
    )


def notify_admins_post_deleted(
    db: Session,
    post_id: int,
    platform: str,
    title_or_snippet: str,
    actor_user: Any
) -> List[Notification]:
    """Notifies Admins when a creator deletes a post."""
    actor_name = getattr(actor_user, "name", "Creator")
    actor_id = getattr(actor_user, "id", None)

    title = "Post deleted"
    message = f"{actor_name} deleted a post."

    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="POST_DELETED",
        actor_user_id=actor_id,
        related_entity_type="post",
        related_entity_id=str(post_id),
        link="/posts",
        metadata_json={
            "post_id": post_id,
            "platform": platform,
            "title": title_or_snippet,
            "creator_name": actor_name,
            "creator_id": actor_id
        }
    )


def notify_admins_social_account_connected(db: Session, account: Any, actor_user: Any) -> List[Notification]:
    """Notifies Admins when a social account is connected."""
    actor_name = getattr(actor_user, "name", "User")
    actor_id = getattr(actor_user, "id", None)
    platform = (getattr(account, "platform", "social") or "social").title()
    account_id = getattr(account, "id", None)

    title = "Social account connected"
    message = f"{actor_name} connected a {platform} account."

    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="SOCIAL_ACCOUNT_CONNECTED",
        actor_user_id=actor_id,
        related_entity_type="social_account",
        related_entity_id=str(account_id) if account_id else None,
        link="/accounts",
        metadata_json={
            "account_id": account_id,
            "platform": getattr(account, "platform", ""),
            "account_name": getattr(account, "account_name", ""),
            "actor_name": actor_name,
            "actor_id": actor_id
        }
    )


def notify_admins_social_account_disconnected(
    db: Session,
    platform: str,
    account_name: str,
    actor_user: Any,
    account_id: Optional[int] = None
) -> List[Notification]:
    """Notifies Admins when a social account is disconnected."""
    actor_name = getattr(actor_user, "name", "User")
    actor_id = getattr(actor_user, "id", None)
    platform_title = platform.title()

    title = "Social account disconnected"
    message = f"{actor_name} disconnected a {platform_title} account."

    return notify_admins(
        db=db,
        title=title,
        message=message,
        type="SOCIAL_ACCOUNT_DISCONNECTED",
        actor_user_id=actor_id,
        related_entity_type="social_account",
        related_entity_id=str(account_id) if account_id else None,
        link="/accounts",
        metadata_json={
            "platform": platform,
            "account_name": account_name,
            "actor_name": actor_name,
            "actor_id": actor_id
        }
    )


# Backward compatibility alias
def notify_admins_of_creator_activity(
    db: Session,
    creator_user: Any,
    post: Any,
    action: str = "New Post"
) -> List[Notification]:
    """Maintained for backward compatibility."""
    if action in ["Post Scheduled", "scheduled"]:
        return notify_admins_post_scheduled(db, post, creator_user)
    elif action in ["Published", "published"]:
        return notify_admins_post_published(db, post, creator_user)
    else:
        return notify_admins_post_created(db, post, creator_user)
