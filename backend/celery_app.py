import os
from dotenv import load_dotenv
from celery import Celery
from celery.schedules import crontab

load_dotenv()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "socialpilot",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "check-scheduled-posts-every-minute": {
        "task": "check_scheduled_posts",
        "schedule": crontab(minute="*"),
    },
}

import tasks  # noqa: F401  -- ensures tasks are registered when celery_app is imported
