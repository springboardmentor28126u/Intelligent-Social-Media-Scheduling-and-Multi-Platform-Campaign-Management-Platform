"""
Analytics queries over post_engagement (+ posts / campaigns).
Every query filters by user_id (per-user isolation).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_pg import Post, PostEngagement, Campaign

# Mocked business assumption for ROI: estimated revenue per click (INR)
REVENUE_PER_CLICK = 40.0


def _sum_cols():
    # SUM of each metric; COALESCE turns NULL (no rows) into 0
    return [
        func.coalesce(func.sum(getattr(PostEngagement, m)), 0).label(m)
        for m in ("likes", "shares", "comments", "reach", "impressions", "clicks")
    ]


def _with_rates(d: dict) -> dict:
    # Derived metrics added to any dict that has the raw sums
    imp = d["impressions"]
    interactions = d["likes"] + d["shares"] + d["comments"]
    d["engagement_rate"] = round(interactions / imp * 100, 2) if imp else 0.0
    d["ctr"] = round(d["clicks"] / imp * 100, 2) if imp else 0.0
    return d


def _row_to_dict(row, keys) -> dict:
    return {k: int(getattr(row, k)) for k in keys}


METRICS = ("likes", "shares", "comments", "reach", "impressions", "clicks")


async def content_analytics(db: AsyncSession, user_id: str, days: int) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    base = (PostEngagement.user_id == user_id, PostEngagement.recorded_at >= since)

    # 1) Overall totals
    row = (await db.execute(select(*_sum_cols()).where(*base))).one()
    totals = _with_rates(_row_to_dict(row, METRICS))

    # 2) Per-platform breakdown
    res = await db.execute(
        select(
            PostEngagement.platform,
            func.count(func.distinct(PostEngagement.post_id)).label("posts"),
            *_sum_cols(),
        ).where(*base).group_by(PostEngagement.platform)
    )
    by_platform = []
    for r in res.all():
        d = _row_to_dict(r, METRICS)
        d["platform"] = r.platform
        d["posts"] = int(r.posts)
        by_platform.append(_with_rates(d))

    # 3) Daily trend
    day = func.date_trunc("day", PostEngagement.recorded_at).label("day")
    res = await db.execute(
        select(day, *_sum_cols()).where(*base).group_by(day).order_by(day)
    )
    trend = []
    for r in res.all():
        d = _row_to_dict(r, METRICS)
        d["date"] = r.day.date().isoformat()
        trend.append(d)

    # 4) Top 5 posts by total interactions
    interactions = func.sum(
        PostEngagement.likes + PostEngagement.shares + PostEngagement.comments
    ).label("interactions")
    res = await db.execute(
        select(Post.id, Post.content, interactions, *_sum_cols())
        .join(Post, Post.id == PostEngagement.post_id)
        .where(*base)
        .group_by(Post.id, Post.content)
        .order_by(interactions.desc())
        .limit(5)
    )
    top_posts = []
    for r in res.all():
        d = _row_to_dict(r, METRICS)
        d["post_id"] = r.id
        d["content"] = r.content[:80]
        d["interactions"] = int(r.interactions)
        top_posts.append(_with_rates(d))

    return {
        "period_days": days,
        "totals": totals,
        "by_platform": by_platform,
        "trend": trend,
        "top_posts": top_posts,
    }


def _campaign_metrics(raw: dict, budget: float) -> dict:
    # Adds engagement/CTR + cost and ROI (mocked revenue model) to raw sums
    d = _with_rates(dict(raw))
    d["budget"] = budget
    d["cost_per_click"] = round(budget / d["clicks"], 2) if d["clicks"] else None
    d["estimated_revenue"] = round(d["clicks"] * REVENUE_PER_CLICK, 2)
    d["roi_percent"] = (
        round((d["estimated_revenue"] - budget) / budget * 100, 2) if budget > 0 else None
    )
    return d


async def campaign_analytics(db: AsyncSession, campaign: Campaign) -> dict:
    where = (
        Post.campaign_id == campaign.id,
        Post.user_id == campaign.user_id,
    )
    row = (
        await db.execute(
            select(*_sum_cols())
            .join(Post, Post.id == PostEngagement.post_id)
            .where(*where)
        )
    ).one()
    totals = _campaign_metrics(_row_to_dict(row, METRICS), campaign.budget)

    res = await db.execute(
        select(PostEngagement.platform, *_sum_cols())
        .join(Post, Post.id == PostEngagement.post_id)
        .where(*where)
        .group_by(PostEngagement.platform)
    )
    by_platform = []
    for r in res.all():
        d = _with_rates(_row_to_dict(r, METRICS))
        d["platform"] = r.platform
        by_platform.append(d)

    posts_count = (
        await db.execute(select(func.count()).select_from(Post).where(*where))
    ).scalar_one()

    return {
        "campaign_id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "posts": posts_count,
        "totals": totals,
        "by_platform": by_platform,
    }


async def all_campaigns_summary(db: AsyncSession, user_id: str, campaigns: list[Campaign]) -> list[dict]:
    # One grouped query for every campaign, then merge with campaign info
    res = await db.execute(
        select(Post.campaign_id, *_sum_cols())
        .join(Post, Post.id == PostEngagement.post_id)
        .where(Post.user_id == user_id, Post.campaign_id.isnot(None))
        .group_by(Post.campaign_id)
    )
    sums = {r.campaign_id: _row_to_dict(r, METRICS) for r in res.all()}
    zero = {m: 0 for m in METRICS}

    out = []
    for c in campaigns:
        m = _campaign_metrics(sums.get(c.id, dict(zero)), c.budget)
        out.append({"campaign_id": c.id, "name": c.name, "status": c.status, **m})
    return out