import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
from analytics import get_campaign_analytics, get_post_analytics, get_overview_analytics

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/overview/export")
def export_overview_report(
    format: str = Query("csv"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export overview analytics report across all posts as CSV."""
    if format.lower() != "csv":
        raise HTTPException(status_code=400, detail="Only 'csv' format is supported")

    data = get_overview_analytics(db=db, current_user=current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Post ID",
        "Post Title",
        "Campaign ID",
        "Platform",
        "Status",
        "Available",
        "Likes",
        "Comments",
        "Views",
        "Reach",
        "Shares",
        "Saved",
        "Reason / Note",
    ])

    for post in data.get("posts", []):
        post_id = post.get("post_id")
        post_title = post.get("title") or ""
        campaign_id = post.get("campaign_id") or "N/A"
        for plat in post.get("platforms", []):
            is_available = plat.get("available", False)
            writer.writerow([
                post_id,
                post_title,
                campaign_id,
                plat.get("platform", ""),
                plat.get("status", ""),
                "Yes" if is_available else "No",
                plat.get("likes") if is_available and "likes" in plat else "",
                plat.get("comments") if is_available and "comments" in plat else "",
                plat.get("views") if is_available and "views" in plat else "",
                plat.get("reach") if is_available and "reach" in plat else "",
                plat.get("shares") if is_available and "shares" in plat else "",
                plat.get("saved") if is_available and "saved" in plat else "",
                plat.get("reason", "") if not is_available else "",
            ])

    csv_content = output.getvalue()
    filename = "socialpilot_analytics_overview.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )



@router.get("/campaigns/{campaign_id}/export")
def export_campaign_report(
    campaign_id: int,
    format: str = Query("csv"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export campaign analytics report as CSV."""
    if format.lower() != "csv":
        raise HTTPException(status_code=400, detail="Only 'csv' format is supported")

    # get_campaign_analytics verifies ownership and generates unified platform stats
    data = get_campaign_analytics(campaign_id=campaign_id, db=db, current_user=current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Campaign ID",
        "Campaign Name",
        "Post ID",
        "Post Title",
        "Platform",
        "Status",
        "Available",
        "Likes",
        "Comments",
        "Views",
        "Reach",
        "Shares",
        "Saved",
        "Reason / Note",
    ])

    for post in data.get("posts", []):
        post_id = post.get("post_id")
        post_title = post.get("title") or ""
        for plat in post.get("platforms", []):
            is_available = plat.get("available", False)
            writer.writerow([
                data.get("campaign_id"),
                data.get("campaign_name"),
                post_id,
                post_title,
                plat.get("platform", ""),
                plat.get("status", ""),
                "Yes" if is_available else "No",
                plat.get("likes") if is_available and "likes" in plat else "",
                plat.get("comments") if is_available and "comments" in plat else "",
                plat.get("views") if is_available and "views" in plat else "",
                plat.get("reach") if is_available and "reach" in plat else "",
                plat.get("shares") if is_available and "shares" in plat else "",
                plat.get("saved") if is_available and "saved" in plat else "",
                plat.get("reason", "") if not is_available else "",
            ])

    csv_content = output.getvalue()
    filename = f"campaign_{campaign_id}_report.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/posts/{post_id}/export")
def export_post_report(
    post_id: int,
    format: str = Query("csv"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export single post analytics report as CSV."""
    if format.lower() != "csv":
        raise HTTPException(status_code=400, detail="Only 'csv' format is supported")

    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.user_id == current_user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    data = get_post_analytics(post_id=post_id, db=db, current_user=current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Post ID",
        "Post Title",
        "Platform",
        "Status",
        "Available",
        "Likes",
        "Comments",
        "Views",
        "Reach",
        "Shares",
        "Saved",
        "Reason / Note",
    ])

    for plat in data.get("platforms", []):
        is_available = plat.get("available", False)
        writer.writerow([
            post_id,
            post.title or "",
            plat.get("platform", ""),
            plat.get("status", ""),
            "Yes" if is_available else "No",
            plat.get("likes") if is_available and "likes" in plat else "",
            plat.get("comments") if is_available and "comments" in plat else "",
            plat.get("views") if is_available and "views" in plat else "",
            plat.get("reach") if is_available and "reach" in plat else "",
            plat.get("shares") if is_available and "shares" in plat else "",
            plat.get("saved") if is_available and "saved" in plat else "",
            plat.get("reason", "") if not is_available else "",
        ])

    csv_content = output.getvalue()
    filename = f"post_{post_id}_report.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
