from datetime import datetime, timezone, timedelta
import calendar
import json

from app.database.session import SessionLocal
from app.models.post import Post, PostStatus
from app.models.post_media import PostMedia
from app.models.post_social_account import (
    PostSocialAccount,
    PublishStatus,
)
from app.models.publishing_log import (
    PublishingLog,
    PublishingLogStatus,
)
from app.services.publishing_service import publishing_service

def calculate_next_occurrence(
    scheduled_at: datetime,
    recurrence_type: str,
) -> datetime:
    if recurrence_type == "daily":
        return scheduled_at + timedelta(days=1)

    if recurrence_type == "weekly":
        return scheduled_at + timedelta(weeks=1)

    if recurrence_type == "monthly":
        year = scheduled_at.year
        month = scheduled_at.month

        if month == 12:
            next_year = year + 1
            next_month = 1
        else:
            next_year = year
            next_month = month + 1

        last_day = calendar.monthrange(
            next_year,
            next_month,
        )[1]

        next_day = min(
            scheduled_at.day,
            last_day,
        )

        return scheduled_at.replace(
            year=next_year,
            month=next_month,
            day=next_day,
        )

    raise ValueError(
        f"Unsupported recurrence type: {recurrence_type}"
    )
def create_next_recurring_post(db, post):
    if not post.is_recurring:
        return None

    if not post.recurrence_type:
        print(
            f"Scheduler: Recurring post ID {post.id} "
            "has no recurrence type."
        )
        return None

    if not post.scheduled_at:
        print(
            f"Scheduler: Recurring post ID {post.id} "
            "has no scheduled time."
        )
        return None

    next_scheduled_at = calculate_next_occurrence(
        post.scheduled_at,
        post.recurrence_type,
    )

    if (
        post.recurrence_end_at
        and next_scheduled_at > post.recurrence_end_at
    ):
        print(
            f"Scheduler: Recurring post ID {post.id} "
            "has reached its recurrence end date."
        )
        return None

    next_post = Post(
        user_id=post.user_id,
        content=post.content,
        content_type=post.content_type,
        status=PostStatus.SCHEDULED,
        platforms=post.platforms,
        scheduled_at=next_scheduled_at,
        is_recurring=True,
        recurrence_type=post.recurrence_type,
        recurrence_end_at=post.recurrence_end_at,
    )

    db.add(next_post)
    db.flush()

    for post_account in post.social_accounts:
        next_post_account = PostSocialAccount(
            post_id=next_post.id,
            social_account_id=post_account.social_account_id,
            status=PublishStatus.PENDING,
        )

        db.add(next_post_account)

    for media in post.media:
        next_media = PostMedia(
            post_id=next_post.id,
            media_type=media.media_type,
            file_name=media.file_name,
            file_path=media.file_path,
            mime_type=media.mime_type,
            file_size=media.file_size,
        )

        db.add(next_media)

    db.flush()

    print(
        f"Scheduler: Created next recurring post "
        f"ID {next_post.id} scheduled for "
        f"{next_scheduled_at}."
    )

    return next_post
def publish_scheduled_posts():
    db = SessionLocal()

    try:
        current_time = datetime.now(timezone.utc)

        scheduled_posts = (
            db.query(Post)
            .filter(
                Post.status == PostStatus.SCHEDULED,
                Post.scheduled_at <= current_time,
            )
            .all()
        )

        if not scheduled_posts:
            print("Scheduler: No posts ready for publishing.")
            return

        print(
            f"Scheduler: Found {len(scheduled_posts)} "
            f"post(s) ready for publishing."
        )

        for post in scheduled_posts:

            try:
                print(
                    f"Scheduler: Publishing post ID {post.id}..."
                )

                # Mark post as currently publishing
                post.status = PostStatus.PUBLISHING
                post.updated_at = datetime.now(timezone.utc)

                db.commit()

                post_social_accounts = (
                    db.query(PostSocialAccount)
                    .filter(
                        PostSocialAccount.post_id == post.id
                    )
                    .all()
                )

                if not post_social_accounts:

                    print(
                        f"Scheduler: Post ID {post.id} "
                        f"has no connected social accounts."
                    )

                    post.status = PostStatus.FAILED
                    post.updated_at = datetime.now(timezone.utc)

                    db.commit()

                    continue

                successful_accounts = 0
                failed_accounts = 0

                for post_account in post_social_accounts:

                    social_account = post_account.social_account

                    try:
                        print(
                            f"Scheduler: Publishing post "
                            f"{post.id} to "
                            f"{social_account.platform}..."
                        )

                        integration = (
                            publishing_service
                            .get_platform_integration(
                                platform=social_account.platform,
                                social_account=social_account,
                            )
                        )

                        result = integration.publish_post(
                            post.content
                        )

                        # Update post-social-account status
                        post_account.status = (
                            PublishStatus.PUBLISHED
                        )

                        post_account.published_at = (
                            datetime.now(timezone.utc)
                        )

                        post_account.error_message = None

                        # Create SUCCESS publishing log
                        publishing_log = PublishingLog(
                            post_id=post.id,
                            social_account_id=social_account.id,
                            status=PublishingLogStatus.SUCCESS,
                            message=(
                                f"Post published successfully to "
                                f"{social_account.platform}"
                            ),
                            platform_response=json.dumps(
                                result,
                                default=str,
                            ),
                        )

                        db.add(publishing_log)

                        successful_accounts += 1

                        print(
                            f"Scheduler: Successfully "
                            f"published post {post.id} to "
                            f"{social_account.platform}."
                        )

                        print(result)

                    except Exception as error:

                        failed_accounts += 1

                        error_message = str(error)

                        post_account.status = (
                            PublishStatus.FAILED
                        )

                        post_account.error_message = (
                            error_message
                        )

                        # Create FAILED publishing log
                        publishing_log = PublishingLog(
                            post_id=post.id,
                            social_account_id=social_account.id,
                            status=PublishingLogStatus.FAILED,
                            message=error_message,
                            platform_response=None,
                        )

                        db.add(publishing_log)

                        print(
                            f"Scheduler: Failed publishing "
                            f"post {post.id} to "
                            f"{social_account.platform}: "
                            f"{error_message}"
                        )

                # Final post status
                if successful_accounts > 0:

                    post.status = PostStatus.PUBLISHED

                    print(
                        f"Scheduler: Post ID {post.id} "
                        f"published successfully."
                    )

                    # Create the next occurrence
                    # for recurring posts
                    if post.is_recurring:
                        create_next_recurring_post(
                            db,
                            post,
                        )

                else:

                    post.status = PostStatus.FAILED

                    print(
                        f"Scheduler: Post ID {post.id} "
                        f"failed on all social accounts."
                    )

                post.updated_at = datetime.now(timezone.utc)

                db.commit()

            except Exception as error:

                db.rollback()

                print(
                    f"Scheduler: Failed processing "
                    f"post ID {post.id}: {str(error)}"
                )

        print(
            "Scheduler: Publishing cycle completed."
        )

    except Exception as error:

        db.rollback()

        print(
            f"Scheduler error: {str(error)}"
        )

    finally:

        db.close()