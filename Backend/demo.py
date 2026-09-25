"""One-click sample data for demos. Everything is flagged is_demo and removable.

Demo accounts have no credentials and demo posts are ignored by the publishing
worker and by engagement sync, so nothing is ever sent to a real provider.
"""
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from analytics import DEMO_PREFIX
from database import get_db
from models import (AudienceSnapshot, Campaign, EngagementSnapshot, EngagementWorkflow, Post,
                    PublishingJob, PublishingLog, SocialAccount)

CAPTIONS = [
    "New arrivals are here! Which one is your favourite?",
    "Behind the scenes of our latest photo shoot",
    "Weekend flash sale: 20% off everything until Sunday",
    "Customer spotlight: thank you for sharing your story",
    "3 tips to get more from your morning routine",
    "Meet the team that makes it all happen",
    "Poll time: A or B? Tell us in the comments",
    "Our bestseller is back in stock",
    "Festive collection drops tonight at 7 PM",
    "How we pack every order with care",
    "Throwback to our very first product",
    "Giveaway! Tag a friend to enter",
]
IMAGES = [f"https://picsum.photos/seed/socialpilot{i}/1080/1080" for i in range(12)]


def has_demo(db, user_id):
    return db.query(Post.id).filter_by(user_id=user_id, is_demo=True).first() is not None


def seed(db, user_id, now=None):
    """Create ~6 weeks of realistic activity: accounts, campaigns, posts, metrics, followers."""
    rng = random.Random(user_id)  # stable numbers for the same user
    now = now or datetime.now(timezone.utc)
    today = now.date()
    accounts = {}
    for provider, name in (("facebook", "Demo Brand (sample)"), ("instagram", "demo.brand (sample)")):
        account = SocialAccount(user_id=user_id, platform=provider.title(), account_name=name,
                                connected=False, is_demo=True)
        db.add(account)
        db.flush()
        accounts[provider] = account
    campaigns = [
        Campaign(user_id=user_id, name="Festive Season Sale", objective="sales", platforms="facebook,instagram",
                 description="Drive festive purchases with offers, reels and giveaways.",
                 start_date=today - timedelta(days=20), end_date=today + timedelta(days=10),
                 budget=40000, revenue=112000, currency="INR", target_engagements=9000, target_posts=16),
        Campaign(user_id=user_id, name="Brand Awareness Q3", objective="awareness", platforms="facebook,instagram",
                 description="Grow reach and followers with educational content.",
                 start_date=today - timedelta(days=45), end_date=today - timedelta(days=21),
                 budget=25000, revenue=18000, currency="INR", target_engagements=6000, target_posts=10,
                 status="completed"),
        Campaign(user_id=user_id, name="New Year Launch", objective="engagement", platforms="instagram",
                 description="Teasers and countdown for the January launch.",
                 start_date=today + timedelta(days=12), end_date=today + timedelta(days=40),
                 budget=30000, revenue=0, currency="INR", target_engagements=8000, target_posts=12),
    ]
    for campaign in campaigns:
        campaign.is_demo = True
        campaign.created_at = campaign.updated_at = now
        db.add(campaign)
    db.flush()
    festive, awareness, launch = campaigns

    # Evenings and weekends perform best so the heatmap tells a clear story.
    hours = [8, 9, 11, 12, 13, 15, 17, 18, 19, 20, 21, 22]
    for index, days_ago in enumerate(range(44, 0, -1)):
        provider = "instagram" if index % 3 else "facebook"
        when = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=days_ago)
        when = when.replace(hour=rng.choice(hours) - 5, minute=30)  # stored UTC ≈ IST evening slots
        campaign = awareness if days_ago > 21 else festive
        caption = CAPTIONS[index % len(CAPTIONS)]
        failed = index in (5, 17, 31)
        post = Post(user_id=user_id, title=caption.split(":")[0][:60], content=caption, image_url=IMAGES[index % 12],
                    platform=provider, account_id=accounts[provider].id, status="failed" if failed else "published",
                    campaign_id=campaign.id, is_demo=True, created_at=when - timedelta(days=1), updated_at=when)
        db.add(post)
        db.flush()
        job = PublishingJob(post_id=post.id, user_id=user_id, account_id=accounts[provider].id, provider=provider,
                            content=caption, image_url=post.image_url, scheduled_at=when, run_at=when,
                            timezone_name="Asia/Kolkata", status="failed" if failed else "published", attempts=1,
                            provider_post_id=None if failed else f"{DEMO_PREFIX}{post.id}",
                            error="Provider rejected the content or request" if failed else None)
        db.add(job)
        db.flush()
        db.add(PublishingLog(job_id=job.id, event="scheduled", message="Publishing occurrence added to queue", created_at=when - timedelta(days=1)))
        db.add(PublishingLog(job_id=job.id, event=job.status, message=job.error or "Provider confirmed publication", created_at=when))
        if failed:
            continue
        local_hour = (when.hour + 5) % 24
        boost = (1.8 if local_hour >= 18 else 1.0) * (1.5 if when.weekday() >= 5 else 1.0) * (1.25 if provider == "instagram" else 1.0)
        growth = 1 + (44 - days_ago) / 60
        likes = int(rng.randint(70, 200) * boost * growth)
        comments, shares = int(likes * rng.uniform(0.06, 0.12)), int(likes * rng.uniform(0.03, 0.08))
        reach = int(likes * rng.uniform(11, 16))
        db.add(EngagementSnapshot(job_id=job.id, user_id=user_id, provider=provider, likes=likes, comments=comments,
                                  shares=shares, reach=reach, impressions=int(reach * rng.uniform(1.3, 1.7)),
                                  clicks=int(likes * rng.uniform(0.05, 0.15)), collected_at=now - timedelta(minutes=rng.randint(3, 40))))
        status = "needs_attention" if days_ago <= 6 and index % 2 else ("reviewed" if days_ago > 14 else "monitoring")
        db.add(EngagementWorkflow(job_id=job.id, user_id=user_id, status=status, note="", last_synced_at=now, updated_at=now))

    for offset, caption in ((1, "Countdown: 3 days to go"), (2, "Sneak peek of what's coming"), (3, "Final call: festive offers end soon")):
        when = now + timedelta(days=offset, hours=2)
        post = Post(user_id=user_id, title=caption, content=caption, image_url=IMAGES[offset], platform="instagram",
                    account_id=accounts["instagram"].id, status="scheduled", campaign_id=festive.id if offset == 3 else launch.id,
                    is_demo=True, created_at=now, updated_at=now)
        db.add(post)
        db.flush()
        db.add(PublishingJob(post_id=post.id, user_id=user_id, account_id=accounts["instagram"].id, provider="instagram",
                             content=caption, image_url=post.image_url, scheduled_at=when, run_at=when,
                             timezone_name="Asia/Kolkata", status="scheduled"))
    db.add(Post(user_id=user_id, title="Draft: holiday gift guide", content="Our top picks for gifting this season",
                status="draft", campaign_id=festive.id, is_demo=True, created_at=now, updated_at=now))

    for provider, base, daily in (("facebook", 4200, 18), ("instagram", 9800, 42)):
        followers = base
        for days_ago in range(45, -1, -1):
            followers += int(daily * rng.uniform(0.4, 1.6))
            db.add(AudienceSnapshot(account_id=accounts[provider].id, user_id=user_id, provider=provider,
                                    followers=followers, following=310 if provider == "instagram" else 0,
                                    media_count=180 + (45 - days_ago) // 2 if provider == "instagram" else 0,
                                    collected_at=now - timedelta(days=days_ago, hours=1)))
    db.commit()


def clear(db, user_id):
    post_ids = [row[0] for row in db.query(Post.id).filter_by(user_id=user_id, is_demo=True)]
    job_ids = [row[0] for row in db.query(PublishingJob.id).filter(PublishingJob.post_id.in_(post_ids))] if post_ids else []
    if job_ids:
        for model in (EngagementSnapshot, EngagementWorkflow, PublishingLog):
            db.query(model).filter(model.job_id.in_(job_ids)).delete(synchronize_session=False)
        db.query(PublishingJob).filter(PublishingJob.id.in_(job_ids)).delete(synchronize_session=False)
    if post_ids:
        db.query(Post).filter(Post.id.in_(post_ids)).delete(synchronize_session=False)
    account_ids = [row[0] for row in db.query(SocialAccount.id).filter_by(user_id=user_id, is_demo=True)]
    if account_ids:
        db.query(AudienceSnapshot).filter(AudienceSnapshot.account_id.in_(account_ids)).delete(synchronize_session=False)
        db.query(Post).filter(Post.account_id.in_(account_ids)).update({"account_id": None}, synchronize_session=False)
        db.query(SocialAccount).filter(SocialAccount.id.in_(account_ids)).delete(synchronize_session=False)
    campaign_ids = [row[0] for row in db.query(Campaign.id).filter_by(user_id=user_id, is_demo=True)]
    if campaign_ids:
        db.query(Post).filter(Post.campaign_id.in_(campaign_ids)).update({"campaign_id": None}, synchronize_session=False)
        db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).delete(synchronize_session=False)
    db.commit()
    return {"posts": len(post_ids), "campaigns": len(campaign_ids), "accounts": len(account_ids)}


def make_router(require_permission):
    router = APIRouter(prefix="/demo", tags=["Demo data"])

    @router.get("")
    def demo_status(payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        return {"loaded": has_demo(db, int(payload["sub"]))}

    @router.post("", status_code=201)
    def load_demo(payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        user_id = int(payload["sub"])
        if has_demo(db, user_id):
            raise HTTPException(409, "Demo data is already loaded")
        seed(db, user_id)
        return {"loaded": True}

    @router.delete("")
    def remove_demo(payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        return {"removed": clear(db, int(payload["sub"]))}

    return router
