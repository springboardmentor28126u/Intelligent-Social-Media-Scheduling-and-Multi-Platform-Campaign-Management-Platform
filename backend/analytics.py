from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
from publishers import get_linkedin_post_stats, get_youtube_video_stats

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _fetch_platform_stats(db, pp: models.PostPlatform):
    """Fetch live stats for one PostPlatform. Returns a dict, always including platform/status."""
    base = {"platform": pp.platform, "status": pp.status}

    if pp.status != "published" or not pp.external_post_id:
        return {**base, "available": False, "reason": "Not published yet"}

    account = pp.social_account
    platform_lower = pp.platform.lower()

    try:
        if platform_lower == "linkedin":
            success, result = get_linkedin_post_stats(account.access_token, pp.external_post_id)
        elif platform_lower == "youtube":
            success, result = get_youtube_video_stats(db, account, pp.external_post_id)
        else:
            return {**base, "available": False, "reason": f"Unsupported platform: {pp.platform}"}
    except Exception as e:
        return {**base, "available": False, "reason": f"Unexpected error: {e}"}

    if not success:
        return {**base, "available": False, "reason": result}

    return {**base, "available": True, **result}


@router.get("/posts/{post_id}")
def get_post_analytics(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.user_id == current_user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return {
        "post_id": post.id,
        "platforms": [_fetch_platform_stats(db, pp) for pp in post.platform_posts],
    }


@router.get("/campaigns/{campaign_id}")
def get_campaign_analytics(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id,
        models.Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    totals = {"likes": 0, "comments": 0, "views": 0}
    post_results = []

    for post in campaign.posts:
        platform_stats = [_fetch_platform_stats(db, pp) for pp in post.platform_posts]
        for s in platform_stats:
            if s.get("available"):
                totals["likes"] += s.get("likes", 0)
                totals["comments"] += s.get("comments", 0)
                totals["views"] += s.get("views", 0)
        post_results.append({
            "post_id": post.id,
            "title": post.title,
            "platforms": platform_stats,
        })

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "totals": totals,
        "posts": post_results,
    }