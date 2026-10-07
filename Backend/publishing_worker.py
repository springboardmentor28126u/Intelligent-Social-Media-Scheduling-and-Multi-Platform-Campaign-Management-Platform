"""Run `python publishing_worker.py` alongside the API for automatic publishing."""
import argparse
import logging
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select

from database import SessionLocal
from models import Post, PublishingJob, SocialAccount, SocialCredential, User
from publishers import publish, PublishError
from scheduling import log, sync_post, utc
from roles import permissions_for

LOGGER = logging.getLogger("socialpilot.worker")


def run_due(user_id=None, session_factory=SessionLocal, publisher=publish, batch_size=20):
    processed = 0
    # Recover abandoned claims conservatively: remote success may have occurred.
    with session_factory() as db:
        now = datetime.now(timezone.utc)
        # Video uploads can legitimately take longer than a text post.
        query = db.query(PublishingJob).filter(PublishingJob.status == "processing", or_(
            and_(PublishingJob.provider != "youtube", PublishingJob.claimed_at < now - timedelta(minutes=10)),
            PublishingJob.claimed_at < now - timedelta(minutes=45)))
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        stale_ids = [(job.id, job.post_id) for job in query.all()]
        db.rollback()
        for job_id, post_id in stale_ids:
            post = db.query(Post).filter_by(id=post_id).with_for_update().one()
            job = db.get(PublishingJob, job_id)
            if job.status == "processing":
                job.status, job.error = "uncertain", "Worker interrupted; verify platform before any further action"
                log(db, job, "uncertain", job.error)
                sync_post(db, post)
            db.commit()
    for _ in range(batch_size):
        with session_factory() as db:
            query = select(PublishingJob.id, PublishingJob.post_id).join(
                Post, Post.id == PublishingJob.post_id
            ).where(
                PublishingJob.status.in_(["scheduled", "retry"]), PublishingJob.run_at <= datetime.now(timezone.utc),
                Post.is_demo.is_(False),  # sample data never publishes
            ).order_by(PublishingJob.run_at, PublishingJob.id).with_for_update(
                of=Post, skip_locked=True
            ).limit(1)
            due = select(PublishingJob.id).join(Post, Post.id == PublishingJob.post_id).where(
                PublishingJob.status.in_(["scheduled", "retry"]), PublishingJob.run_at <= datetime.now(timezone.utc),
                Post.is_demo.is_(False),
            ).limit(1)
            if user_id is not None:
                query = query.where(PublishingJob.user_id == user_id)
                due = due.where(PublishingJob.user_id == user_id)
            candidate = db.execute(query).first()
            # Another worker holds the parent post only while claiming a sibling job.
            # Wait briefly instead of idling a whole polling interval.
            for _ in range(10):
                if candidate is not None or db.execute(due).first() is None:
                    break
                db.rollback()
                time.sleep(0.1)
                candidate = db.execute(query).first()
            if candidate is None:
                break
            # Select and lock together so a locked first post cannot starve the
            # rest of the queue. Recheck the job after obtaining its parent lock.
            post = db.get(Post, candidate.post_id)
            job = db.get(PublishingJob, candidate.id)
            if job.status not in {"scheduled", "retry"} or utc(job.run_at) > datetime.now(timezone.utc):
                continue
            job.status, job.claimed_at = "processing", datetime.now(timezone.utc)
            job.attempts += 1
            log(db, job, "processing", "Publishing attempt started")
            post.status = "publishing"
            db.commit()
            try:
                account = db.get(SocialAccount, job.account_id) if job.account_id else None
                owner = db.get(User, job.user_id)
                credential = db.query(SocialCredential).filter_by(account_id=job.account_id, user_id=job.user_id).first()
                from approvals import can_publish_as
                actor = job.publisher_id or (owner.id if owner and not owner.is_workspace else None)
                if not can_publish_as(db, job.user_id, actor):
                    raise PublishError("Scheduling actor is no longer a content creator or is unknown; ask a current creator to retry")
                if account is None or not account.connected or credential is None or account.user_id != job.user_id:
                    raise PublishError("Target account disconnected; reconnect before retrying")
                if credential.provider != job.provider:
                    raise PublishError("Target provider no longer matches the job")
                from approvals import require_approved
                from fastapi import HTTPException
                try:
                    require_approved(db, post)
                except HTTPException as error:
                    raise PublishError(str(error.detail)) from None
                from visibility import can_view_campaign
                if post.campaign_id and not can_view_campaign(db, actor, post.campaign_id):
                    raise PublishError("Scheduling creator no longer has access to this campaign")
                if not can_publish_as(db, job.user_id, actor):
                    raise PublishError("Scheduling actor is no longer a content creator; ask a current creator to retry")
                result = publisher(db, job, credential)
                job.provider_post_id, job.status, job.error = result, "published", None
                log(db, job, "published", "Provider confirmed publication")
            except PublishError as error:
                job.error = str(error)[:300]
                if error.uncertain:
                    job.status = "uncertain"
                elif error.retryable and job.attempts < 5:
                    job.status = "retry"
                    job.run_at = datetime.now(timezone.utc) + timedelta(seconds=max(error.delay, 60 * 2 ** (job.attempts - 1)))
                else:
                    job.status = "failed"
                log(db, job, job.status, job.error)
            except Exception:
                # Do not expose secrets or retry a possibly completed network write.
                db.rollback()
                job = db.get(PublishingJob, candidate.id)
                job.status, job.error = "uncertain", "Unexpected publishing interruption; inspect the platform"
                log(db, job, "uncertain", job.error)
            # Serialize aggregation against other workers finishing sibling jobs.
            with db.no_autoflush:
                post = db.query(Post).filter_by(id=candidate.post_id).with_for_update().one()
            sync_post(db, post)
            db.commit()
            processed += 1
    return processed


def snapshot_audience(session_factory=SessionLocal):
    """Record follower counts for every user with connected Facebook/Instagram accounts."""
    from analytics import collect_audience
    with session_factory() as db:
        user_ids = [row[0] for row in db.query(SocialCredential.user_id).filter(
            SocialCredential.provider.in_(["facebook", "instagram", "linkedin", "x", "youtube"])).distinct()]
        total = 0
        for user_id in user_ids:
            refreshed, _ = collect_audience(db, user_id)
            db.commit()
            total += refreshed
    return total


def sync_all_engagement(session_factory=SessionLocal):
    """Refresh likes/comments/shares for every user's recent Facebook/Instagram posts."""
    from analytics import sync_engagement
    with session_factory() as db:
        user_ids = [row[0] for row in db.query(SocialCredential.user_id).filter(
            SocialCredential.provider.in_(["facebook", "instagram", "linkedin", "x", "youtube"])).distinct()]
        refreshed = 0
        for user_id in user_ids:
            owner = db.get(User, user_id)
            if owner is None or "analytics:write" not in permissions_for(owner.role):
                continue
            refreshed += sync_engagement(db, user_id, days=14, limit=30, audience=False)["refreshed"]
    return refreshed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--interval", type=int, default=10)
    parser.add_argument("--audience-hours", type=float, default=6,
                        help="collect follower snapshots every N hours (0 disables)")
    parser.add_argument("--engagement-minutes", type=float, default=10,
                        help="refresh post engagement every N minutes (0 disables)")
    args = parser.parse_args()
    if args.interval < 1:
        parser.error("interval must be positive")
    logging.basicConfig(level=logging.INFO)
    next_audience = next_engagement = 0.0
    while True:
        if args.engagement_minutes > 0 and time.monotonic() >= next_engagement:
            next_engagement = time.monotonic() + args.engagement_minutes * 60
            try:
                LOGGER.info("Refreshed engagement for %s posts", sync_all_engagement())
            except Exception:
                LOGGER.error("Engagement sync cycle failed")
        if args.audience_hours > 0 and time.monotonic() >= next_audience:
            next_audience = time.monotonic() + args.audience_hours * 3600
            try:
                LOGGER.info("Stored %s audience snapshots", snapshot_audience())
            except Exception:
                LOGGER.error("Audience snapshot cycle failed")
        try:
            count = run_due()
            if count:
                LOGGER.info("Processed %s jobs", count)
        except Exception:
            LOGGER.error("Worker cycle failed; check database availability and migrations")
            if args.once:
                raise SystemExit(1)
        if args.once:
            return
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
