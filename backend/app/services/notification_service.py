
# backend/app/services/notification_service.py

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.post import Post
from app.models.campaign import Campaign


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    post_id: int | None = None,
    platform: str | None = None,
    prevent_duplicate: bool = True,
):
    """
    Create an in-app notification.

    Notification failures are isolated from publishing and scheduling.
    Duplicate checks use the existing Notification columns.
    """

    try:
        if prevent_duplicate:
            existing_query = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.notification_type == notification_type,
                Notification.title == title,
                Notification.message == message,
            )

            if post_id is None:
                existing_query = existing_query.filter(
                    Notification.post_id.is_(None)
                )
            else:
                existing_query = existing_query.filter(
                    Notification.post_id == post_id
                )

            if platform is None:
                existing_query = existing_query.filter(
                    Notification.platform.is_(None)
                )
            else:
                existing_query = existing_query.filter(
                    Notification.platform == platform
                )

            if existing_query.first():
                return None

        notification = Notification(
            user_id=user_id,
            post_id=post_id,
            title=title,
            message=message,
            notification_type=notification_type,
            platform=platform,
            is_read=False,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification

    except Exception:
        db.rollback()

        # Notifications must not prevent a post from publishing.
        return None


def create_scheduled_post_reminders(db: Session):
    """
    Create one reminder for each scheduled post that is due
    within the next 5 minutes.

    One reminder is created per post, rather than one per scheduler run.
    """

    now = datetime.now(timezone.utc)
    reminder_deadline = now + timedelta(minutes=5)

    posts = (
        db.query(Post)
        .filter(
            Post.status == "scheduled",
            Post.scheduled_at.isnot(None),
            Post.scheduled_at > now,
            Post.scheduled_at <= reminder_deadline,
        )
        .all()
    )

    created_count = 0

    for post in posts:
        scheduled_at = post.scheduled_at

        if scheduled_at is None:
            continue

        # Normalize naive timestamps if the database driver returns one.
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

        message = (
            f"Your scheduled post #{post.id} is due at "
            f"{scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}. "
            "Check your selected social accounts before publishing."
        )

        notification = create_notification(
            db=db,
            user_id=post.user_id,
            post_id=post.id,
            title="Upcoming scheduled post",
            message=message,
            notification_type="scheduled_reminder",
            prevent_duplicate=True,
        )

        if notification is not None:
            created_count += 1

    return created_count


def create_campaign_date_alerts(db: Session):
    """
    Create alerts for campaigns starting or ending within 24 hours.

    Alerts are deduplicated using their title and message.
    """

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(hours=24)

    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.status.notin_(["completed", "cancelled"]),
        )
        .all()
    )

    created_count = 0

    for campaign in campaigns:
        if campaign.start_date is not None:
            start_date = campaign.start_date

            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)

            if now <= start_date <= deadline:
                notification = create_notification(
                    db=db,
                    user_id=campaign.user_id,
                    title="Campaign starting soon",
                    message=(
                        f"Campaign '{campaign.name}' "
                        f"(ID {campaign.id}) is scheduled to start "
                        f"at {start_date.strftime('%Y-%m-%d %H:%M UTC')}."
                    ),
                    notification_type="campaign_alert",
                )

                if notification is not None:
                    created_count += 1

        if campaign.end_date is not None:
            end_date = campaign.end_date

            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)

            if now <= end_date <= deadline:
                notification = create_notification(
                    db=db,
                    user_id=campaign.user_id,
                    title="Campaign ending soon",
                    message=(
                        f"Campaign '{campaign.name}' "
                        f"(ID {campaign.id}) is scheduled to end "
                        f"at {end_date.strftime('%Y-%m-%d %H:%M UTC')}."
                    ),
                    notification_type="campaign_alert",
                )

                if notification is not None:
                    created_count += 1

    return created_count
