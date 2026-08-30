
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.database.postgres import SessionLocal
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.services.publisher import publish_to_social_media


def process_scheduled_posts():
    db = SessionLocal()

    try:
        now = datetime.now()

        posts = db.query(Post).filter(
            Post.status == "scheduled",
            Post.scheduled_at <= now
        ).all()

        if not posts:
            return

        print(f"Checking {len(posts)} scheduled post(s)...")

        for post in posts:

            try:
                # Find the social account belonging to this user
                social_account = db.query(SocialAccount).filter(
                    SocialAccount.id == post.social_account_id,
                    SocialAccount.user_id == post.user_id
                ).first()

                # Social account was deleted
                if not social_account:
                    print(
                        f"Social account not found for post {post.id}"
                    )

                    post.status = "failed"
                    continue

                print(
                    f"Publishing post {post.id} to "
                    f"{social_account.platform} "
                    f"({social_account.username})"
                )

                # Call publishing service
                result = publish_to_social_media(
                    platform=social_account.platform,
                    username=social_account.username,
                    content=post.content,
                    access_token=social_account.access_token
                )

                # Publishing successful
                if result.get("success"):

                    post.status = "published"
                    post.scheduled_at = None

                    print(
                        f"Post {post.id} published successfully"
                    )

                # Publishing failed
                else:

                    post.status = "failed"

                    print(
                        f"Failed to publish post {post.id}: "
                        f"{result.get('message', 'Unknown error')}"
                    )

            except Exception as post_error:

                post.status = "failed"

                print(
                    f"Error while processing post "
                    f"{post.id}: {post_error}"
                )

        db.commit()

    except Exception as error:

        db.rollback()

        print(
            f"Scheduler error: {error}"
        )

    finally:

        db.close()


# Create scheduler
scheduler = BackgroundScheduler()


# Check scheduled posts every 10 seconds
scheduler.add_job(
    process_scheduled_posts,
    "interval",
    seconds=10,
    id="scheduled_posts_job",
    replace_existing=True
)


def start_scheduler():

    if not scheduler.running:

        scheduler.start()

        print("Post scheduler started")


def stop_scheduler():

    if scheduler.running:

        scheduler.shutdown()

        print("Post scheduler stopped")

