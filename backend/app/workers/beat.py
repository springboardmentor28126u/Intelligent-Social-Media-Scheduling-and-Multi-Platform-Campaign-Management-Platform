from celery import Celery
from datetime import timedelta


celery = Celery(
    "socialpilot",
    broker="redis://localhost:6379/0"
)


celery.conf.beat_schedule = {

    "check-scheduled-posts-every-minute": {
        "task": "app.workers.tasks.check_scheduled_posts",
        "schedule": timedelta(minutes=1),
    },

}