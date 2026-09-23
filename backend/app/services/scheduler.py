"""
Publishing Scheduler for SocialPilot.

This module handles:
1. publish_post_now()  — Core publishing logic, called by the scheduler and direct API triggers
2. publish_scheduled_posts() — Periodic job run every minute by APScheduler

Multi-platform publishing:
  When a post has PostPlatformTarget rows, it publishes to each platform independently.
  Each platform's status is tracked separately (pending → publishing → published/failed).
  This allows per-platform retry without affecting successfully published platforms.

Provider selection:
  - If real API credentials are configured for a platform → use real provider
  - Otherwise → use demo provider (graceful fallback, no fake "published" lie)
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models.post import Post, PostMedia, PostPlatformTarget, PublishingLog, PublishingJob
from app.db.models.social_account import SocialAccount
from app.services.providers import get_social_provider
from app.services.notifications import create_notification
from app.services.audit import log_audit_event


def _publish_to_platform_target(
    target: PostPlatformTarget,
    post: Post,
    db: Session
) -> dict:
    """
    Publish a single PostPlatformTarget (one platform for one post).
    Updates target.status, records a PublishingLog, returns result dict.
    """
    # Skip already-published targets
    if target.status == "published":
        return {"status": "already_published", "platform": target.platform}

    # Skip cancelled targets
    if target.status == "cancelled":
        return {"status": "cancelled", "platform": target.platform}

    # Resolve the social account for this target
    account = None
    if target.social_account_id:
        account = db.query(SocialAccount).filter(
            SocialAccount.id == target.social_account_id
        ).first()
    if not account:
        # Fall back to any active account for this user/platform
        account = db.query(SocialAccount).filter(
            SocialAccount.user_id == post.user_id,
            SocialAccount.platform == target.platform,
            SocialAccount.is_active == True
        ).first()

    if not account:
        target.status = "failed"
        target.error_message = f"No active {target.platform.title()} account connected. Please connect your account first."
        db.commit()
        return {"status": "failed", "platform": target.platform, "error": target.error_message}

    # Get the provider (real if credentials exist, demo otherwise)
    is_demo = (account.is_demo if account else True)
    provider = get_social_provider(target.platform, is_demo=is_demo)

    media_urls = [m.file_url for m in post.media] if post.media else []
    if post.media_url and post.media_url not in media_urls:
        media_urls.insert(0, post.media_url)

    access_token = account.access_token

    # Mark as publishing
    target.status = "publishing"
    target.attempt_count += 1
    db.commit()

    try:
        result = provider.publish_post(
            access_token=access_token,
            content=post.content,
            media_urls=media_urls,
            post_type=post.post_type,
            options={
                "author_urn": account.account_id if account else "",
                "ig_account_id": account.account_id if account else "",
                "page_id": account.account_id if account else "me",
                "title": post.title or post.content[:100],
                "description": post.content,
                "board_id": ""  # Pinterest: will auto-detect first board
            }
        )

        if result.success:
            target.status = "published"
            target.external_post_id = result.external_id
            target.external_url = result.url
            target.published_at = datetime.now(timezone.utc)
            target.error_message = None

            # Log success
            acc_id = account.id if account else (target.social_account_id or 1)
            pub_log = PublishingLog(
                post_id=post.id,
                social_account_id=acc_id,
                status="SUCCESS",
                level="success",
                event_name="platform.published",
                message=f"Published to {target.platform.title()} successfully (demo={is_demo})",
                response_payload=result.to_dict()
            )
            db.add(pub_log)
            db.commit()

            return {
                "status": "published",
                "platform": target.platform,
                "external_id": result.external_id,
                "url": result.url,
                "demo": is_demo
            }
        else:
            # Publishing failed
            target.error_message = result.error_message
            target.status = "failed"

            acc_id = account.id if account else (target.social_account_id or 1)
            pub_log = PublishingLog(
                post_id=post.id,
                social_account_id=acc_id,
                status="FAILED",
                level="error",
                event_name="platform.failed",
                message=f"Failed to publish to {target.platform.title()}: {result.error_message}",
                response_payload=result.to_dict()
            )
            db.add(pub_log)
            db.commit()

            return {
                "status": "failed",
                "platform": target.platform,
                "error": result.error_message
            }

    except Exception as e:
        target.status = "failed"
        target.error_message = str(e)
        db.commit()

        acc_id = account.id if account else (target.social_account_id or 1)
        pub_log = PublishingLog(
            post_id=post.id,
            social_account_id=acc_id,
            status="FAILED",
            level="error",
            event_name="platform.error",
            message=f"Exception publishing to {target.platform.title()}: {str(e)}",
            response_payload={"exception": str(e)}
        )
        db.add(pub_log)
        db.commit()

        return {"status": "error", "platform": target.platform, "error": str(e)}


def publish_post_now(post_id: int, db: Session = None) -> dict:
    """
    Core publishing execution logic.
    
    - If the post has PostPlatformTarget rows → publish each platform independently
    - If no platform targets → fall back to legacy single-platform publish
    - Updates post.status based on aggregate platform target statuses
    - Used by scheduler, Celery (if enabled), and direct API triggers
    """
    is_internal_session = False
    if db is None:
        db = SessionLocal()
        is_internal_session = True

    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"status": "failed", "message": f"Post with id {post_id} not found"}

        if post.status == "published":
            # Check if there are any pending platform targets
            pending = [t for t in (post.platform_targets or []) if t.status != "published"]
            if not pending:
                return {"status": "already_published", "post_id": post.id}

        # Mark post as publishing (overall)
        post.status = "publishing"
        db.commit()

        platform_results = []

        # ── Multi-platform mode ──────────────────────────────────────────────
        if post.platform_targets:
            targets_to_publish = [
                t for t in post.platform_targets
                if t.status != "published"
            ]

            for target in targets_to_publish:
                result = _publish_to_platform_target(target, post, db)
                platform_results.append(result)

            # Refresh to get updated statuses
            db.refresh(post)

            # Query fresh targets from DB for accurate status aggregation
            targets = db.query(PostPlatformTarget).filter(PostPlatformTarget.post_id == post.id).all()
            all_statuses = [t.status for t in targets] if targets else []
            if targets and all(s == "published" for s in all_statuses):
                post.status = "published"
                post.published_at = datetime.now(timezone.utc)
                post.failure_reason = None
                # Set external_post_id from first published target
                published_targets = [t for t in targets if t.external_post_id]
                if published_targets:
                    post.external_post_id = published_targets[0].external_post_id
            elif targets and all(s == "failed" for s in all_statuses):
                post.status = "failed"
                failed_targets = [t for t in targets if t.status == "failed"]
                err_msgs = [t.error_message for t in failed_targets if t.error_message]
                post.failure_reason = err_msgs[0] if err_msgs else "All platform targets failed"
            elif any(s == "published" for s in all_statuses):
                # Partial success — some platforms published
                post.status = "published"
                post.published_at = datetime.now(timezone.utc)
                failed_platforms = [t.platform for t in targets if t.status == "failed"]
                post.failure_reason = f"Partial: failed on {', '.join(failed_platforms)}" if failed_platforms else None
            else:
                post.status = "failed"
                post.failure_reason = "Publishing failed"

            db.commit()

        else:
            # ── Legacy single-platform mode ──────────────────────────────────
            account = None
            if post.social_account_id:
                account = db.query(SocialAccount).filter(
                    SocialAccount.id == post.social_account_id
                ).first()
            if not account:
                account = db.query(SocialAccount).filter(
                    SocialAccount.user_id == post.user_id,
                    SocialAccount.platform == post.platform,
                    SocialAccount.is_active == True
                ).first()

            # Use real provider if credentials available (not forced demo anymore)
            is_demo = (account.is_demo if account else True)
            provider = get_social_provider(post.platform, is_demo=is_demo)

            media_urls = [m.file_url for m in post.media] if post.media else []
            if post.media_url and post.media_url not in media_urls:
                media_urls.insert(0, post.media_url)

            access_token = account.access_token if account else "demo_token"

            result = provider.publish_post(
                access_token=access_token,
                content=post.content,
                media_urls=media_urls,
                post_type=post.post_type,
                options={
                    "author_urn": account.account_id if account else "",
                    "ig_account_id": account.account_id if account else "",
                    "page_id": account.account_id if account else "me",
                    "title": post.title or post.content[:100],
                    "description": post.content
                }
            )

            if result.success:
                post.status = "published"
                post.published_at = datetime.now(timezone.utc)
                post.external_post_id = result.external_id
                post.failure_reason = None

                # Engagement metrics from real or demo response
                payload = result.response_payload or {}
                post.likes_count = payload.get("likes", 0)
                post.comments_count = payload.get("comments", 0)
                post.shares_count = payload.get("shares", 0)
                post.reach_count = payload.get("reach", 0)
                post.impressions_count = payload.get("impressions", 0)

                acc_id = account.id if account else (post.social_account_id or 1)
                pub_log = PublishingLog(
                    post_id=post.id,
                    social_account_id=acc_id,
                    status="SUCCESS",
                    level="success",
                    event_name="post.published",
                    message=f"Post published successfully to {post.platform.title()} (demo={is_demo})",
                    response_payload=result.to_dict()
                )
                db.add(pub_log)
                platform_results.append({
                    "status": "published",
                    "platform": post.platform,
                    "external_id": result.external_id,
                    "demo": is_demo
                })
            else:
                post.retry_count += 1
                if post.retry_count >= post.max_retries:
                    post.status = "failed"
                    post.failure_reason = result.error_message or "Max retries exceeded"
                else:
                    post.status = "scheduled"
                    post.failure_reason = f"Attempt {post.retry_count} failed: {result.error_message}"

                acc_id = account.id if account else (post.social_account_id or 1)
                pub_log = PublishingLog(
                    post_id=post.id,
                    social_account_id=acc_id,
                    status="FAILED",
                    level="error",
                    event_name="post.failed",
                    message=f"Failed to publish to {post.platform}: {result.error_message}",
                    response_payload=result.to_dict()
                )
                db.add(pub_log)
                platform_results.append({
                    "status": "failed",
                    "platform": post.platform,
                    "error": result.error_message
                })

            db.commit()

        # ── Notifications & Audit ────────────────────────────────────────────
        has_success = any(r.get("status") == "published" for r in platform_results)
        has_failure = any(r.get("status") in ("failed", "error") for r in platform_results)

        if has_success:
            create_notification(
                db=db,
                user_id=post.user_id,
                title="Post Published! 🎉",
                message=f"Your post is now live on {post.platform.title()}.",
                type="publish_success",
                link="/posts"
            )
            log_audit_event(
                db=db,
                user_id=post.user_id,
                action="post.published",
                module="posts",
                description=f"Published post #{post.id} to {post.platform}"
            )

        if has_failure and not has_success:
            create_notification(
                db=db,
                user_id=post.user_id,
                title="Publishing Failed ⚠️",
                message=f"Could not publish to {post.platform.title()}. Check the post for details.",
                type="publish_failed",
                link="/posts"
            )

        # ── Recurring post generation ────────────────────────────────────────
        if has_success and post.is_recurring and post.recurrence_rule:
            now = datetime.now(timezone.utc)
            next_date = None
            if post.recurrence_rule == "daily":
                next_date = now + timedelta(days=1)
            elif post.recurrence_rule == "weekly":
                next_date = now + timedelta(weeks=1)
            elif post.recurrence_rule == "biweekly":
                next_date = now + timedelta(weeks=2)
            elif post.recurrence_rule == "monthly":
                next_date = now + timedelta(days=30)

            if next_date:
                next_post = Post(
                    user_id=post.user_id,
                    team_id=post.team_id,
                    campaign_id=post.campaign_id,
                    social_account_id=post.social_account_id,
                    title=post.title,
                    content=post.content,
                    platform=post.platform,
                    post_type=post.post_type,
                    status="scheduled",
                    scheduled_at=next_date,
                    is_recurring=True,
                    recurrence_rule=post.recurrence_rule,
                    tags=post.tags
                )
                db.add(next_post)

                # Copy platform targets for the next occurrence
                for target in (post.platform_targets or []):
                    next_target = PostPlatformTarget(
                        post_id=next_post.id,
                        platform=target.platform,
                        social_account_id=target.social_account_id,
                        status="pending"
                    )
                    db.add(next_target)

                db.commit()

        db.refresh(post)

        return {
            "status": post.status,
            "post_id": post.id,
            "platform_results": platform_results
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        if is_internal_session:
            db.close()


def publish_target_now(target_id: int, db: Session = None) -> dict:
    """
    Publish or retry a single specific PostPlatformTarget without re-publishing
    other targets of the same post.
    """
    is_internal_session = False
    if db is None:
        db = SessionLocal()
        is_internal_session = True

    try:
        target = db.query(PostPlatformTarget).filter(PostPlatformTarget.id == target_id).first()
        if not target:
            return {"status": "failed", "message": f"Platform target {target_id} not found"}

        post = db.query(Post).filter(Post.id == target.post_id).first()
        if not post:
            return {"status": "failed", "message": f"Parent post not found"}

        result = _publish_to_platform_target(target, post, db)

        # Re-evaluate parent post status
        all_targets = db.query(PostPlatformTarget).filter(PostPlatformTarget.post_id == post.id).all()
        if all_targets:
            all_statuses = [t.status for t in all_targets]
            if all(s == "published" for s in all_statuses):
                post.status = "published"
                post.failure_reason = None
                if not post.published_at:
                    post.published_at = datetime.now(timezone.utc)
            elif any(s == "published" for s in all_statuses):
                post.status = "published"
                failed_platforms = [t.platform for t in all_targets if t.status == "failed"]
                post.failure_reason = f"Partial: failed on {', '.join(failed_platforms)}" if failed_platforms else None
            elif all(s == "failed" for s in all_statuses):
                post.status = "failed"
                post.failure_reason = "All platform targets failed"
            db.commit()

        return result
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        if is_internal_session:
            db.close()


def publish_scheduled_posts():
    """
    Periodic job to check and publish any scheduled posts whose scheduled_at has arrived.
    Called every minute by APScheduler in app/main.py.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_posts = (
            db.query(Post)
            .filter(
                Post.status.in_(["scheduled", "queued"]),
                Post.scheduled_at <= now
            )
            .all()
        )

        results = []
        for p in due_posts:
            # Change to queued before publishing to prevent duplicate processing
            p.status = "queued"
            db.commit()

            res = publish_post_now(p.id, db=db)
            results.append(res)

        return {"published_count": len(results), "details": results}
    except Exception as e:
        print(f"Error in publish_scheduled_posts: {e}")
        return {"error": str(e)}
    finally:
        db.close()