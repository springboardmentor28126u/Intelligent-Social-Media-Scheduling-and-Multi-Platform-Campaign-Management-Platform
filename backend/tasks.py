from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import or_
from celery_app import celery_app
from database import SessionLocal
import models
from publishers import publish_linkedin, publish_youtube


def _log(db, post_id, platform, event, message=None):
    db.add(models.PublishLog(
        post_id=post_id,
        platform=platform,
        event=event,
        message=message,
    ))
    db.commit()


def _next_occurrence(current_time, pattern):
    if pattern == "daily":
        return current_time + timedelta(days=1)
    elif pattern == "weekly":
        return current_time + timedelta(weeks=1)
    elif pattern == "monthly":
        return current_time + relativedelta(months=1)
    return None


def _spawn_next_recurrence(db, post):
    if not post.is_recurring or not post.recurrence_pattern:
        return
    if not post.scheduled_time:
        return

    next_time = _next_occurrence(post.scheduled_time, post.recurrence_pattern)
    if next_time is None:
        return

    if post.recurrence_end_date and next_time > post.recurrence_end_date:
        return

    # Check for idempotency: avoid spawning twice for the same post
    existing_log = db.query(models.PublishLog).filter(
        models.PublishLog.post_id == post.id,
        models.PublishLog.event == "recurrence_spawned",
    ).first()
    if existing_log:
        return

    existing_post = db.query(models.Post).filter(
        models.Post.user_id == post.user_id,
        models.Post.scheduled_time == next_time,
        models.Post.content == post.content,
        models.Post.is_recurring == True,
    ).first()
    if existing_post:
        return

    new_post = models.Post(
        user_id=post.user_id,
        title=post.title,
        content=post.content,
        media_urls=post.media_urls,
        scheduled_time=next_time,
        status="scheduled",
        is_recurring=True,
        recurrence_pattern=post.recurrence_pattern,
        recurrence_end_date=post.recurrence_end_date,
        post_as_short=post.post_as_short,
        campaign_id=post.campaign_id,
    )
    db.add(new_post)
    db.flush()

    for pp in post.platform_posts:
        db.add(models.PostPlatform(
            post_id=new_post.id,
            social_account_id=pp.social_account_id,
            platform=pp.platform,
            status="pending",
        ))

    _log(db, post.id, "system", "recurrence_spawned", f"Auto-generated next recurrence from post {post.id} -> post {new_post.id}")
    _log(db, new_post.id, "system", "success", f"Auto-generated next recurrence from post {post.id}")
    db.commit()


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
            _log(db, post.id, pp.platform, "attempt", f"Attempting to publish to {pp.platform}")

            account = pp.social_account
            platform_lower = pp.platform.lower()
            video_url = (post.media_urls or [None])[0]

            try:
                if platform_lower == "linkedin":
                    success, result = publish_linkedin(
                        account.access_token,
                        account.platform_user_id,
                        post.content,
                        video_url=video_url,
                    )
                elif platform_lower == "youtube":
                    if not video_url:
                        success, result = False, "No video URL provided for YouTube post"
                    else:
                        success, result = publish_youtube(
                            db, account, video_url, post.title, post.content, is_short=post.post_as_short,
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
                _log(db, post.id, pp.platform, "success", f"Published successfully, external_id={result}")
            else:
                pp.status = "failed"
                pp.error_message = result
                any_failure = True
                _log(db, post.id, pp.platform, "failure", result)

            db.commit()

        if any_success and not any_failure:
            post.status = "published"
        elif any_success and any_failure:
            post.status = "partially_published"
        else:
            post.status = "failed"
        db.commit()

        if post.status == "published":
            _spawn_next_recurrence(db, post)

        return f"Post {post_id} processed: status={post.status}"
    finally:
        db.close()


@celery_app.task(name="check_scheduled_posts")
def check_scheduled_posts():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_posts = db.query(models.Post).filter(
            models.Post.status == "scheduled",
            or_(
                models.Post.scheduled_time <= now,
                models.Post.scheduled_time.is_(None),
            ),
        ).all()

        triggered = []
        for post in due_posts:
            publish_post.delay(post.id)
            triggered.append(post.id)

        return f"Checked at {now.isoformat()}, triggered posts: {triggered}"
    finally:
        db.close()

