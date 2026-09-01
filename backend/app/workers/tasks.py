from datetime import datetime, timezone
from app.workers.celery_worker import celery_app
from app.services.scheduler import publish_post_now, publish_scheduled_posts


@celery_app.task(name="app.workers.tasks.publish_post", bind=True, max_retries=3)
def publish_post(self, post_id: int):
    """Celery async worker task to publish a post."""
    result = publish_post_now(post_id)
    if result.get("status") == "failed" and self.request.retries < self.max_retries:
        raise self.retry(countdown=60 * (2 ** self.request.retries))
    return result


@celery_app.task(name="app.workers.tasks.check_scheduled_posts")
def check_scheduled_posts_task():
    """Celery beat recurring task."""
    return publish_scheduled_posts()
