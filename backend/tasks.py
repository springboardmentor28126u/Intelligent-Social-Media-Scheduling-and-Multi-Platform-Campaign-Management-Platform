from datetime import datetime, timezone
from celery_app import celery_app
from database import SessionLocal
import models
from publishers import publish_linkedin, publish_youtube


@celery_app.task(name="publish_post")
def publish_post(post_id: int):
    db = SessionLocal()
    try:
        post = db.query(models.Post).filter(models.Post.id == post_id).first()
        if not post:
            return f"Post {post_id} not found"

        post.status = "publishing"
        db.commit()

        any_success = False
        any_failure = False

        for pp in post.platform_posts:
            if pp.status == "published":
                any_success = True
                continue

            pp.status = "publishing"
            db.commit()

            account = pp.social_account
            platform_lower = pp.platform.lower()

            try:
                if platform_lower == "linkedin":
                    success, result = publish_linkedin(
                        account.access_token,
                        account.platform_user_id,
                        post.content,
                    )
                elif platform_lower == "youtube":
                    video_url = (post.media_urls or [None])[0]
                    if not video_url:
                        success, result = False, "No video URL provided for YouTube post"
                    else:
                        success, result = publish_youtube(
                            db, account, video_url, post.title, post.content,
                        )
                else:
                    success, result = False, f"Unsupported platform: {pp.platform}"
            except Exception as e:
                success, result = False, f"Unexpected error: {e}"

            if success:
                pp.status = "published"
                pp.external_post_id = result
                pp.published_at = datetime.now(timezone.utc)
                pp.error_message = None
                any_success = True
            else:
                pp.status = "failed"
                pp.error_message = result
                any_failure = True

            db.commit()

        if any_success and not any_failure:
            post.status = "published"
        elif any_success and any_failure:
            post.status = "partially_published"
        else:
            post.status = "failed"
        db.commit()

        return f"Post {post_id} processed: status={post.status}"
    finally:
        db.close()

