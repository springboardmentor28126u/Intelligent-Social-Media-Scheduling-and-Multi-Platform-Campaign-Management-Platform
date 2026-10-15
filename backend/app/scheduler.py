
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.database.connection import SessionLocal
from app.models.post import Post
from app.tasks.publishing_tasks import publish_post_task
from app.services.notification_service import (
    create_scheduled_post_reminders,
)


scheduler = BackgroundScheduler(timezone="UTC")


def process_scheduled_posts():
    """
    Preserve the existing workflow:
    queue posts for publishing when their scheduled time arrives.
    """

    db = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        posts = (
            db.query(Post)
            .filter(
                Post.status == "scheduled",
                Post.scheduled_at.isnot(None),
                Post.scheduled_at <= now,
            )
            .all()
        )

        for post in posts:
            try:
                publish_post_task.delay(post.id)

                print(
                    f"Scheduled publishing task queued "
                    f"for post #{post.id}"
                )

            except Exception as error:
                print(
                    f"Could not queue publishing task "
                    f"for post #{post.id}: {error}"
                )

    except Exception as error:
        db.rollback()
        print(f"Scheduled publishing error: {error}")

    finally:
        db.close()


def process_scheduled_post_reminders():
    """
    Create in-app reminders for scheduled posts due
    within the next 15 minutes.

    Uses the existing notification service and does not
    change the post status or publishing workflow.
    """

    db = SessionLocal()

    try:
        count = create_scheduled_post_reminders(db)

        if count:
            print(
                f"Created {count} scheduled post reminder(s)."
            )

    except Exception as error:
        db.rollback()
        print(f"Scheduled post reminder error: {error}")

    finally:
        db.close()


def start_scheduler():
    """
    Start the scheduled publishing and reminder jobs.
    """

    if scheduler.running:
        return

    # Existing publishing job — preserved.
    scheduler.add_job(
        process_scheduled_posts,
        trigger="interval",
        minutes=1,
        id="process_scheduled_posts",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # New reminder job — runs independently.
    scheduler.add_job(
        process_scheduled_post_reminders,
        trigger="interval",
        minutes=1,
        id="process_scheduled_post_reminders",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()

    print(
        "SocialPilot scheduler started: "
        "scheduled publishing and post reminders."
    )
