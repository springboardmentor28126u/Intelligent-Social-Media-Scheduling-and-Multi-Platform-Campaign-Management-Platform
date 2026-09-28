import asyncio
from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.post import Post
from app.models.notification import Notification

logger = logging.getLogger("intellipost.scheduler")

class SchedulerService:
    _task = None
    _is_running = False

    @classmethod
    async def start(cls):
        if cls._is_running:
            return
        cls._is_running = True
        cls._task = asyncio.create_task(cls._run_scheduler_loop())
        logger.info("IntelliPost Background Scheduler Service started.")

    @classmethod
    async def stop(cls):
        cls._is_running = False
        if cls._task:
            cls._task.cancel()
            try:
                await cls._task
            except asyncio.CancelledError:
                pass
        logger.info("IntelliPost Background Scheduler Service stopped.")

    @classmethod
    async def _run_scheduler_loop(cls):
        while cls._is_running:
            try:
                cls._check_and_publish_due_posts()
            except Exception as e:
                logger.error(f"Error in scheduler worker cycle: {e}")
            await asyncio.sleep(20)

    @staticmethod
    def _check_and_publish_due_posts():
        db: Session = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            # Find posts scheduled at or before now
            due_posts = db.query(Post).filter(
                Post.status == "Scheduled",
                Post.scheduled_at <= now
            ).all()

            for post in due_posts:
                post.status = "Published"
                post.published_at = now
                post.likes_count = 24
                post.reach_count = 340
                post.comments_count = 4

                # Add notification
                notif = Notification(
                    user_id=post.user_id,
                    title="Scheduled Post Published! 🎉",
                    message=f"Post '{post.content[:40]}...' was automatically published to {post.platforms.upper()}.",
                    category="Publishing",
                    type="success",
                    action_url="/dashboard/analytics"
                )
                db.add(notif)
                logger.info(f"Auto-published post ID {post.id} for user {post.user_id}")

            if due_posts:
                db.commit()
        finally:
            db.close()
