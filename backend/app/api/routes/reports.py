import os
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.report import Report
from app.db.models.post import Post
from app.db.models.campaign import Campaign
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.core.config import settings
from app.core.security import get_current_user, require_permission
from app.services.reports import generate_pdf_report, generate_excel_report
from app.services.audit import log_audit_event


router = APIRouter(
    prefix="/reports",
    tags=["Reports & Exports"]
)


@router.get("", response_model=List[ReportResponse])
def list_reports(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .all()
    )
    return reports


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    data: ReportGenerateRequest,
    current_user: dict = Depends(require_permission("reports.generate")),
    db: Session = Depends(get_db)
):
    from app.db.models.social_account import SocialAccount
    from app.db.models.campaign import CampaignPost
    from sqlalchemy import or_

    # Collect data for report
    posts_q = db.query(Post)
    campaigns_q = db.query(Campaign)

    if data.campaign_id:
        camp_post_ids = [cp.post_id for cp in db.query(CampaignPost).filter(CampaignPost.campaign_id == data.campaign_id).all()]
        if camp_post_ids:
            posts_q = posts_q.filter(or_(Post.campaign_id == data.campaign_id, Post.id.in_(camp_post_ids)))
        else:
            posts_q = posts_q.filter(Post.campaign_id == data.campaign_id)
        campaigns_q = campaigns_q.filter(Campaign.id == data.campaign_id)

    posts = posts_q.all()
    campaigns = campaigns_q.all()
    accounts = db.query(SocialAccount).filter(SocialAccount.is_active == True).all()

    pub_posts = [p for p in posts if str(p.status).lower() == "published"]
    tot_reach = sum(p.reach_count or 0 for p in pub_posts)
    tot_impressions = sum(p.impressions_count or 0 for p in pub_posts)
    tot_likes = sum(p.likes_count or 0 for p in pub_posts)
    tot_comments = sum(p.comments_count or 0 for p in pub_posts)
    tot_shares = sum(p.shares_count or 0 for p in pub_posts)
    tot_engagement = tot_likes + tot_comments + tot_shares
    tot_followers = sum(a.followers_count or 0 for a in accounts)

    # Compute platform breakdown
    plat_map = {}
    for p in pub_posts:
        plat_name = (p.platform or "Other").title()
        if plat_name not in plat_map:
            plat_map[plat_name] = {"posts": 0, "reach": 0, "engagement": 0}
        plat_map[plat_name]["posts"] += 1
        plat_map[plat_name]["reach"] += p.reach_count or 0
        plat_map[plat_name]["engagement"] += (p.likes_count or 0) + (p.comments_count or 0) + (p.shares_count or 0)

    plat_list = []
    for plat_name, p_stat in plat_map.items():
        eng_rate = f"{round((p_stat['engagement'] / p_stat['reach'] * 100), 1)}%" if p_stat['reach'] > 0 else "0.0%"
        plat_list.append({
            "platform": plat_name,
            "posts": p_stat["posts"],
            "reach": f"{p_stat['reach']:,}",
            "engagement": f"{p_stat['engagement']:,}",
            "rate": eng_rate
        })

    report_payload = {
        "title": data.title,
        "user_name": current_user["name"],
        "summary": {
            "total_reach": tot_reach,
            "total_impressions": tot_impressions,
            "total_engagement": tot_engagement,
            "followers_growth": 0,
            "total_posts": len(posts),
            "active_campaigns": len([c for c in campaigns if c.status == "active"])
        },
        "platforms": plat_list if plat_list else [
            {"platform": "Channels", "posts": len(pub_posts), "reach": f"{tot_reach:,}", "engagement": f"{tot_engagement:,}", "rate": "0.0%"}
        ],
        "top_posts": [
            {
                "title": p.title or (p.content[:35] if p.content else "Untitled"),
                "platform": (p.platform or "general").title(),
                "likes": p.likes_count or 0,
                "comments": p.comments_count or 0,
                "shares": p.shares_count or 0,
                "reach": p.reach_count or 0
            } for p in pub_posts[:8]
        ],
        "raw_posts": [
            {
                "id": p.id,
                "content": p.content,
                "platform": p.platform,
                "status": p.status,
                "scheduled_at": p.scheduled_at,
                "published_at": p.published_at,
                "likes_count": p.likes_count,
                "comments_count": p.comments_count,
                "shares_count": p.shares_count,
                "reach_count": p.reach_count
            } for p in posts
        ],
        "raw_campaigns": [
            {
                "name": c.name,
                "platform": c.platform,
                "status": c.status,
                "budget": c.budget,
                "spent": c.spent,
                "target_reach": c.target_reach,
                "actual_reach": c.actual_reach,
                "roi": c.roi
            } for c in campaigns
        ]
    }

    report_fmt = data.format.lower()
    ext = "pdf" if report_fmt == "pdf" else "xlsx"
    filename = f"report_{uuid.uuid4().hex[:10]}.{ext}"
    output_path = os.path.join(settings.UPLOAD_DIR, "reports", filename)

    if report_fmt == "pdf":
        generate_pdf_report(report_payload, output_path)
    else:
        generate_excel_report(report_payload, output_path)

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    report = Report(
        user_id=current_user["user_id"],
        title=data.title,
        report_type=data.report_type,
        format=report_fmt,
        platform=data.platform or "all",
        start_date=data.start_date,
        end_date=data.end_date,
        file_url=f"/uploads/reports/{filename}",
        file_size=file_size,
        status="completed",
        summary_data=report_payload["summary"]
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    log_audit_event(
        db=db,
        user_id=current_user["user_id"],
        action="report.generate",
        module="reports",
        description=f"Generated {report_fmt.upper()} report '{report.title}'"
    )

    return report


@router.get("/{report_id}/pdf")
def download_report_pdf(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Generate if not on disk
    rel_path = report.file_url.replace("/uploads/", "") if report.file_url else f"reports/report_{report_id}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, rel_path)

    if not os.path.exists(file_path):
        # Regenerate on the fly
        generate_pdf_report({
            "title": report.title,
            "user_name": "SocialPilot User",
            "summary": report.summary_data or {"total_reach": 0, "total_engagement": 0, "total_impressions": 0, "followers_growth": 0}
        }, file_path)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"{report.title.replace(' ', '_')}.pdf"
    )


@router.get("/{report_id}/excel")
def download_report_excel(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    rel_path = report.file_url.replace("/uploads/", "") if report.file_url else f"reports/report_{report_id}.xlsx"
    file_path = os.path.join(settings.UPLOAD_DIR, rel_path)

    if not os.path.exists(file_path):
        generate_excel_report({
            "title": report.title,
            "summary": report.summary_data or {"total_reach": 0, "total_engagement": 0, "total_impressions": 0, "followers_growth": 0}
        }, file_path)

    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{report.title.replace(' ', '_')}.xlsx"
    )
