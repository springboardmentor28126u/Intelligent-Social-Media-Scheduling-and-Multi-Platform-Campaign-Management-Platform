from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import (
    BackgroundScheduler
)

from dateutil.relativedelta import relativedelta

from app.database.postgres import SessionLocal
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.models.publishing_log import (
    PublishingLog
)
from app.services.publisher import (
    publish_to_social_media
)


# ============================================================
# INDIAN TIMEZONE
# ============================================================

INDIA_TIMEZONE = ZoneInfo(
    "Asia/Kolkata"
)


# ============================================================
# CURRENT INDIA TIME
# ============================================================

def get_current_india_time():

    return datetime.now(
        INDIA_TIMEZONE
    ).replace(
        tzinfo=None
    )


# ============================================================
# NEXT RECURRING DATE
# ============================================================

def get_next_schedule(
    current_time,
    recurrence_type
):

    if recurrence_type == "daily":

        return (
            current_time +
            relativedelta(days=1)
        )

    elif recurrence_type == "weekly":

        return (
            current_time +
            relativedelta(weeks=1)
        )

    elif recurrence_type == "monthly":

        return (
            current_time +
            relativedelta(months=1)
        )

    return None


# ============================================================
# CREATE PUBLISHING LOG
# ============================================================

def create_publishing_log(
    db,
    post,
    social_account,
    status,
    message
):

    log = PublishingLog(
        post_id=post.id,
        user_id=post.user_id,
        social_account_id=(
            post.social_account_id
        ),
        platform=social_account.platform,
        status=status,
        message=message,
        published_at=(
            get_current_india_time()
        )
    )

    db.add(log)


# ============================================================
# PROCESS SCHEDULED POSTS
# ============================================================

def process_scheduled_posts():

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # CURRENT INDIA TIME
        # ----------------------------------------------------

        now = get_current_india_time()

        print(
            "Scheduler checking scheduled posts..."
        )

        print(
            f"Current India time: {now}"
        )

        # ----------------------------------------------------
        # FIND DUE POSTS
        # ----------------------------------------------------

        posts = (
            db.query(Post)
            .filter(
                Post.status == "scheduled",
                Post.scheduled_at <= now
            )
            .all()
        )

        if not posts:

            print(
                "Found 0 scheduled post(s) ready to publish."
            )

            return

        print(
            f"Found {len(posts)} scheduled post(s) ready to publish."
        )

        # ----------------------------------------------------
        # PROCESS POSTS
        # ----------------------------------------------------

        for post in posts:

            social_account = None

            try:

                # ------------------------------------------------
                # SOCIAL ACCOUNT
                # ------------------------------------------------

                social_account = (
                    db.query(
                        SocialAccount
                    )
                    .filter(
                        SocialAccount.id ==
                            post.social_account_id,
                        SocialAccount.user_id ==
                            post.user_id
                    )
                    .first()
                )

                if not social_account:

                    print(
                        f"Social account not found for post {post.id}"
                    )

                    post.status = "failed"

                    log = PublishingLog(
                        post_id=post.id,
                        user_id=post.user_id,
                        social_account_id=None,
                        platform="unknown",
                        status="failed",
                        message=(
                            "Social media account not found"
                        ),
                        published_at=(
                            get_current_india_time()
                        )
                    )

                    db.add(log)

                    continue

                # ------------------------------------------------
                # PRINT
                # ------------------------------------------------

                print(
                    f"Processing post ID: {post.id}"
                )

                print(
                    f"Publishing post {post.id} "
                    f"to {social_account.platform} "
                    f"({social_account.username})"
                )

                # ------------------------------------------------
                # PUBLISH
                # ------------------------------------------------

                result = (
                    publish_to_social_media(
                        platform=(
                            social_account.platform
                        ),
                        username=(
                            social_account.username
                        ),
                        content=post.content,
                        access_token=(
                            social_account.access_token
                        )
                    )
                )

                # ------------------------------------------------
                # SUCCESS
                # ------------------------------------------------

                if result.get("success"):

                    success_message = (
                        result.get(
                            "message",
                            "Post published successfully"
                        )
                    )

                    create_publishing_log(
                        db=db,
                        post=post,
                        social_account=social_account,
                        status="published",
                        message=success_message
                    )

                    # --------------------------------------------
                    # RECURRING POST
                    # --------------------------------------------

                    if (
                        post.is_recurring
                        and post.recurrence_type
                        and post.recurrence_end
                    ):

                        next_schedule = (
                            get_next_schedule(
                                post.scheduled_at,
                                post.recurrence_type
                            )
                        )

                        if (
                            next_schedule
                            and
                            next_schedule <=
                            post.recurrence_end
                        ):

                            new_post = Post(

                                user_id=
                                    post.user_id,

                                social_account_id=
                                    post.social_account_id,

                                content=
                                    post.content,

                                status=
                                    "scheduled",

                                scheduled_at=
                                    next_schedule,

                                is_recurring=
                                    True,

                                recurrence_type=
                                    post.recurrence_type,

                                recurrence_end=
                                    post.recurrence_end
                            )

                            db.add(new_post)

                            post.status = (
                                "published"
                            )

                            post.scheduled_at = (
                                None
                            )

                            print(
                                "Next recurring post "
                                f"scheduled for {next_schedule}"
                            )

                        else:

                            post.status = (
                                "published"
                            )

                            post.scheduled_at = (
                                None
                            )

                            post.is_recurring = (
                                False
                            )

                            print(
                                f"Recurring schedule "
                                f"completed for post {post.id}"
                            )

                    # --------------------------------------------
                    # NORMAL POST
                    # --------------------------------------------

                    else:

                        post.status = (
                            "published"
                        )

                        post.scheduled_at = (
                            None
                        )

                    print(
                        f"Post {post.id} "
                        "published successfully"
                    )

                # ------------------------------------------------
                # PUBLISH FAILED
                # ------------------------------------------------

                else:

                    error_message = (
                        result.get(
                            "message",
                            "Unknown publishing error"
                        )
                    )

                    post.status = (
                        "failed"
                    )

                    create_publishing_log(
                        db=db,
                        post=post,
                        social_account=social_account,
                        status="failed",
                        message=error_message
                    )

                    print(
                        f"Failed to publish post "
                        f"{post.id}: {error_message}"
                    )

            except Exception as post_error:

                post.status = "failed"

                try:

                    create_publishing_log(
                        db=db,
                        post=post,
                        social_account=social_account,
                        status="failed",
                        message=str(post_error)
                    )

                except Exception:
                    pass

                print(
                    f"Error while processing post "
                    f"{post.id}: {post_error}"
                )

        # ----------------------------------------------------
        # SAVE
        # ----------------------------------------------------

        db.commit()

        print(
            "Scheduler processing completed."
        )

    except Exception as error:

        db.rollback()

        print(
            f"Scheduler error: {error}"
        )

    finally:

        db.close()


# ============================================================
# APSCHEDULER
# ============================================================

scheduler = BackgroundScheduler(
    timezone="Asia/Kolkata"
)


scheduler.add_job(
    process_scheduled_posts,
    "interval",
    seconds=10,
    id="scheduled_posts_job",
    replace_existing=True,
    max_instances=1,
    coalesce=True
)


# ============================================================
# START
# ============================================================

def start_scheduler():

    if not scheduler.running:

        scheduler.start()

        print(
            "Post scheduler started "
            "(Asia/Kolkata)"
        )


# ============================================================
# STOP
# ============================================================

def stop_scheduler():

    if scheduler.running:

        scheduler.shutdown()

        print(
            "Post scheduler stopped"
        )