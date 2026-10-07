# app/services/publisher.py
#
# This file's ONE job: run in the background, forever, while the server
# is up. Every few seconds it checks: "any scheduled posts whose time has
# arrived?" and fake-publishes them (simulated delay + simulated failure),
# writing a log row and updating the post either way.
# Add this import at the top:
from app.services.social_apis import publish_to_platform
import asyncio
import random
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.database_pg import AsyncSessionLocal
from app.db.models_pg import Post, PublishingLog, PostEngagement
from app.services.engagement import generate_mock_engagement

# --- Tunable settings ---
POLL_INTERVAL_SECONDS = 10   # how often the loop checks for due posts
MAX_RETRIES = 3              # after this many failed attempts, give up


async def _publish_one_post(db, post: Post) -> None:
    """
    Handles exactly one post: calls the mock API for EACH platform the
    post targets, writes one log row summarizing all platforms, and
    updates the post's status. Post succeeds only if ALL platforms succeed.
    """
    results = []
    all_succeeded = True

    for platform in post.platforms:
        success, message = await publish_to_platform(db, post.user_id, platform, post.content)
        results.append(message)
        if not success:
            all_succeeded = False

    summary = " | ".join(results)

    if all_succeeded:
        post.status = "published"
        post.published_at = datetime.now(timezone.utc)
        log = PublishingLog(
            post_id=post.id,
            user_id=post.user_id,
            status="success",
            message=summary,
        )
                # One mock engagement row per platform the post went out on
        for platform in post.platforms:
            db.add(PostEngagement(
                post_id=post.id,
                user_id=post.user_id,
                platform=platform,
                **generate_mock_engagement(platform),
            ))

        if post.is_recurring:
            await _create_next_recurrence(db, post)
    else:
        post.retry_count += 1
        if post.retry_count >= MAX_RETRIES:
            post.status = "failed"
        # else: leave status "scheduled" so next cycle retries automatically
        log = PublishingLog(
            post_id=post.id,
            user_id=post.user_id,
            status="failed",
            message=summary,
        )

    db.add(log)


async def publish_due_posts() -> None:
    """
    One full cycle: find every post that's scheduled and due, publish
    (or fail) each one, commit all changes together.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Post).where(
                Post.status == "scheduled",
                Post.scheduled_at <= datetime.now(timezone.utc),
            )
        )
        due_posts = list(result.scalars().all())

        for post in due_posts:
            await _publish_one_post(db, post)

        if due_posts:
            await db.commit()


async def run_publisher_loop() -> None:
    """
    Runs forever: check for due posts, wait, repeat. Started once as a
    background task when the server starts (see main.py), and cancelled
    when the server shuts down.
    """
    while True:
        try:
            await publish_due_posts()
        except Exception as exc:
            # Never let one bad cycle kill the whole background loop —
            # log it and keep going.
            print(f"⚠️ Publisher loop error: {exc}")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)

# Add this import at the top with the others:
from datetime import timedelta
from app.db.models_pg import Post, PublishingLog  # (already imported — no change if already there)


# Add this new function anywhere above _publish_one_post:
def _next_scheduled_time(current: datetime, rule: str) -> datetime | None:
    """
    Given the current post's scheduled_at and its recurrence_rule,
    returns when the NEXT copy should be scheduled. Returns None for
    an unrecognized rule (so we skip creating a next post safely).
    """
    if rule == "daily":
        return current + timedelta(days=1)
    elif rule == "weekly":
        return current + timedelta(weeks=1)
    elif rule == "monthly":
        return current + timedelta(days=30)  # simple approximation, not calendar-accurate
    return None


async def _create_next_recurrence(db, original: Post) -> None:
    """
    Called right after an is_recurring post publishes successfully.
    Creates the NEXT post as a fresh row, copying content/platforms,
    scheduled at the next interval, status back to "scheduled".
    """
    if not original.recurrence_rule:
        return

    next_time = _next_scheduled_time(original.scheduled_at, original.recurrence_rule)
    if next_time is None:
        return

    next_post = Post(
        user_id=original.user_id,
        post_type=original.post_type,
        platforms=original.platforms,
        content=original.content,
        scheduled_at=next_time,
        status="scheduled",
        campaign_id=original.campaign_id,
        is_recurring=True,
        recurrence_rule=original.recurrence_rule,
    )
    db.add(next_post)