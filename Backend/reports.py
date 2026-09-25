"""Reports: campaign comparison/ROI, audience growth and publishing performance."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from analytics import as_utc, count, latest_snapshots
from campaigns import comparison_rows, pct
from database import get_db
from models import AudienceSnapshot, PublishingJob, SocialAccount


def parse_ids(value):
    if not value:
        return None
    try:
        ids = sorted({int(part) for part in value.split(",") if part.strip()})
    except ValueError:
        raise HTTPException(422, "ids must be comma-separated integers") from None
    if not ids or len(ids) > 50 or any(i <= 0 for i in ids):
        raise HTTPException(422, "Provide between 1 and 50 positive campaign IDs")
    return ids


def zone(name):
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(422, "Unknown IANA timezone") from None


def make_router(require_permission):
    router = APIRouter(prefix="/reports", tags=["Reports"])

    @router.get("/campaigns")
    def campaign_comparison(ids: str | None = None, days: int | None = Query(None, ge=1, le=730),
                            payload=Depends(require_permission("analytics:read")), db: Session = Depends(get_db)):
        """Side-by-side campaign performance, cost per engagement and ROI."""
        rows = comparison_rows(db, int(payload["sub"]), parse_ids(ids), days)
        budget = sum(r["budget"] for r in rows)
        revenue = sum(r["revenue"] for r in rows)
        engagements = sum(r["metrics"]["engagements"] for r in rows)
        currencies = sorted({r["currency"] for r in rows})
        return {
            "campaigns": rows,
            "totals": {
                "campaigns": len(rows), "budget": round(budget, 2), "revenue": round(revenue, 2),
                "engagements": engagements, "published": sum(r["metrics"]["published_jobs"] for r in rows),
                "roi_pct": round((revenue - budget) * 100 / budget, 1) if budget else None,
                "cost_per_engagement": round(budget / engagements, 2) if budget and engagements else None,
                "mixed_currency": len(currencies) > 1, "currency": currencies[0] if len(currencies) == 1 else None,
            },
            "best": {
                "engagement": max(rows, key=lambda r: r["metrics"]["engagements"])["id"] if rows else None,
                "roi": max((r for r in rows if r["metrics"]["roi_pct"] is not None),
                           key=lambda r: r["metrics"]["roi_pct"], default={}).get("id"),
            },
        }

    @router.get("/audience")
    def audience_growth(days: int = Query(30, ge=1, le=365), payload=Depends(require_permission("analytics:read")),
                        db: Session = Depends(get_db)):
        """Follower growth per connected account from stored snapshots."""
        user_id = int(payload["sub"])
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        accounts = {a.id: a for a in db.query(SocialAccount).filter_by(user_id=user_id).all()}
        snapshots = db.query(AudienceSnapshot).filter(
            AudienceSnapshot.user_id == user_id, AudienceSnapshot.collected_at >= cutoff,
        ).order_by(AudienceSnapshot.collected_at, AudienceSnapshot.id).all()
        series = defaultdict(dict)
        for snap in snapshots:
            if snap.account_id in accounts:
                # keep the last reading of each day
                series[snap.account_id][as_utc(snap.collected_at).date().isoformat()] = snap
        result, timeline = [], defaultdict(dict)
        for account_id, by_day in series.items():
            ordered = [by_day[d] for d in sorted(by_day)]
            first, last = ordered[0], ordered[-1]
            account = accounts[account_id]
            key = f"{account.account_name} ({last.provider})"
            for day, snap in by_day.items():
                timeline[day][key] = snap.followers
            result.append({
                "account_id": account_id, "account_name": account.account_name, "provider": last.provider,
                "key": key, "followers": last.followers, "following": last.following,
                "media_count": last.media_count, "start_followers": first.followers,
                "growth": last.followers - first.followers,
                "growth_pct": pct(last.followers - first.followers, first.followers),
                "last_synced_at": as_utc(last.collected_at),
                "points": [{"date": d, "followers": by_day[d].followers} for d in sorted(by_day)],
            })
        result.sort(key=lambda r: r["followers"], reverse=True)
        total_start = sum(r["start_followers"] for r in result)
        total_now = sum(r["followers"] for r in result)
        return {
            "range_days": days, "accounts": result,
            "totals": {"followers": total_now, "growth": total_now - total_start,
                       "growth_pct": pct(total_now - total_start, total_start), "accounts": len(result)},
            "timeline": [{"date": d, **values} for d, values in sorted(timeline.items())],
            "series_keys": [r["key"] for r in result],
        }

    @router.get("/performance")
    def publishing_performance(days: int = Query(30, ge=1, le=365), timezone_name: str = Query("UTC", max_length=100),
                               payload=Depends(require_permission("analytics:read")), db: Session = Depends(get_db)):
        """Publishing reliability, per-platform comparison and audience activity by hour/weekday."""
        user_id, tz = int(payload["sub"]), zone(timezone_name)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        jobs = db.query(PublishingJob).filter(PublishingJob.user_id == user_id,
                                              PublishingJob.scheduled_at >= cutoff).all()
        published = [j for j in jobs if j.status == "published"]
        snapshots = latest_snapshots(db, user_id, [j.id for j in published])
        status_counts = defaultdict(int)
        platforms = defaultdict(lambda: {"published": 0, "failed": 0, "engagements": 0, "reach": 0,
                                         "likes": 0, "comments": 0, "shares": 0})
        daily = defaultdict(lambda: {"published": 0, "failed": 0, "engagements": 0})
        hours = defaultdict(lambda: {"posts": 0, "engagements": 0})
        weekdays = defaultdict(lambda: {"posts": 0, "engagements": 0})
        grid = defaultdict(lambda: {"posts": 0, "engagements": 0})
        for job in jobs:
            status_counts[job.status] += 1
            local = as_utc(job.scheduled_at).astimezone(tz)
            day = local.date().isoformat()
            if job.status == "failed":
                platforms[job.provider]["failed"] += 1
                daily[day]["failed"] += 1
            if job.status != "published":
                continue
            snap = snapshots.get(job.id)
            engagement = (snap.likes + snap.comments + snap.shares + snap.clicks) if snap else 0
            row = platforms[job.provider]
            row["published"] += 1
            row["engagements"] += engagement
            if snap:
                for key in ("likes", "comments", "shares", "reach"):
                    row[key] += count(getattr(snap, key))
            daily[day]["published"] += 1
            daily[day]["engagements"] += engagement
            hours[local.hour]["posts"] += 1
            hours[local.hour]["engagements"] += engagement
            weekdays[local.weekday()]["posts"] += 1
            weekdays[local.weekday()]["engagements"] += engagement
            grid[(local.weekday(), local.hour)]["posts"] += 1
            grid[(local.weekday(), local.hour)]["engagements"] += engagement
        names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        hour_rows = [{"hour": h, "label": f"{h:02d}:00", **hours[h],
                      "avg_engagement": round(hours[h]["engagements"] / hours[h]["posts"], 1) if hours[h]["posts"] else 0}
                     for h in range(24)]
        weekday_rows = [{"weekday": names[d], **weekdays[d],
                         "avg_engagement": round(weekdays[d]["engagements"] / weekdays[d]["posts"], 1) if weekdays[d]["posts"] else 0}
                        for d in range(7)]
        best_hour = max((r for r in hour_rows if r["posts"]), key=lambda r: r["avg_engagement"], default=None)
        best_day = max((r for r in weekday_rows if r["posts"]), key=lambda r: r["avg_engagement"], default=None)
        heatmap = [{"weekday": names[d], "day": d, "hour": h, **grid[(d, h)],
                    "avg_engagement": round(grid[(d, h)]["engagements"] / grid[(d, h)]["posts"], 1) if grid[(d, h)]["posts"] else 0}
                   for d in range(7) for h in range(24)]
        best_slot = max((c for c in heatmap if c["posts"]), key=lambda c: (c["avg_engagement"], c["posts"]), default=None)
        total_published, total_failed = status_counts["published"], status_counts["failed"]
        return {
            "range_days": days, "timezone": timezone_name,
            "totals": {"jobs": len(jobs), "published": total_published, "failed": total_failed,
                       "cancelled": status_counts["cancelled"], "uncertain": status_counts["uncertain"],
                       "pending": sum(status_counts[s] for s in ("scheduled", "retry", "processing")),
                       "success_rate": pct(total_published, total_published + total_failed),
                       "engagements": sum(p["engagements"] for p in platforms.values()),
                       "avg_engagement_per_post": round(sum(p["engagements"] for p in platforms.values()) / total_published, 1) if total_published else 0},
            "platforms": [{"platform": k, **v, "success_rate": pct(v["published"], v["published"] + v["failed"]),
                           "avg_engagement": round(v["engagements"] / v["published"], 1) if v["published"] else 0,
                           "engagement_rate": pct(v["engagements"], v["reach"])}
                          for k, v in sorted(platforms.items())],
            "daily": [{"date": d, **v} for d, v in sorted(daily.items())],
            "hours": hour_rows, "weekdays": weekday_rows,
            "best_hour": best_hour["label"] if best_hour else None,
            "best_weekday": best_day["weekday"] if best_day else None,
            "heatmap": heatmap,
            "best_slot": {"weekday": best_slot["weekday"], "hour": best_slot["hour"],
                          "label": f"{best_slot['weekday']} {best_slot['hour']:02d}:00",
                          "avg_engagement": best_slot["avg_engagement"]} if best_slot else None,
        }

    return router
