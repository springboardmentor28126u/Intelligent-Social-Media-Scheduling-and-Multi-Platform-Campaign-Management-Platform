
import logging

from app.celery_app import celery_app
from app.database.connection import SessionLocal
from app.services.publishing_service import publish_post

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.publishing_tasks.publish_post_task",
)
def publish_post_task(self, post_id: int):
    logger.info(
        "Scheduled publishing task started for post_id=%s, task_id=%s",
        post_id,
        self.request.id,
    )

    db = SessionLocal()

    try:
        result = publish_post(
            db=db,
            post_id=post_id,
            platform=None,
        )

        logger.info(
            "Scheduled publishing task finished for post_id=%s, result=%s",
            post_id,
            result,
        )

        return result

    except Exception:
        logger.exception(
            "Scheduled publishing task crashed for post_id=%s",
            post_id,
        )
        raise

    finally:
        db.close()
        logger.info(
            "Database session closed for scheduled post_id=%s",
            post_id,
        )
