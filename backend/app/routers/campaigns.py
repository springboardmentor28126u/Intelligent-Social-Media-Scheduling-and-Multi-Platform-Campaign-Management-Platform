from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.campaign import Campaign
from app.models.post import Post
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

@router.get("", response_model=List[CampaignOut])
def list_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Campaign).filter(Campaign.user_id == current_user.id)
    if status and status.lower() != "all":
        query = query.filter(Campaign.status.ilike(status))
    
    campaigns = query.order_by(Campaign.created_at.desc()).all()
    results = []
    for c in campaigns:
        p_count = db.query(Post).filter(Post.campaign_id == c.id).count()
        c_dict = {
            "id": c.id,
            "user_id": c.user_id,
            "name": c.name,
            "description": c.description,
            "platforms": c.platforms,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "budget": c.budget,
            "objective": c.objective,
            "status": c.status,
            "progress_percent": c.progress_percent,
            "target_reach": c.target_reach,
            "actual_reach": c.actual_reach,
            "target_engagement": c.target_engagement,
            "actual_engagement": c.actual_engagement,
            "posts_count": p_count,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        }
        results.append(CampaignOut(**c_dict))
    return results

@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_campaign = Campaign(
        user_id=current_user.id,
        name=campaign_in.name,
        description=campaign_in.description,
        platforms=campaign_in.platforms,
        start_date=campaign_in.start_date,
        end_date=campaign_in.end_date,
        budget=campaign_in.budget or 0.0,
        objective=campaign_in.objective or "Increase Brand Awareness",
        status=campaign_in.status or "Active",
        progress_percent=10,
        target_reach=campaign_in.target_reach or 50000,
        actual_reach=3500,
        target_engagement=campaign_in.target_engagement or 10000,
        actual_engagement=850
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    p_count = db.query(Post).filter(Post.campaign_id == c.id).count()
    return CampaignOut(
        id=c.id,
        user_id=c.user_id,
        name=c.name,
        description=c.description,
        platforms=c.platforms,
        start_date=c.start_date,
        end_date=c.end_date,
        budget=c.budget,
        objective=c.objective,
        status=c.status,
        progress_percent=c.progress_percent,
        target_reach=c.target_reach,
        actual_reach=c.actual_reach,
        target_engagement=c.target_engagement,
        actual_engagement=c.actual_engagement,
        posts_count=p_count,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int,
    c_update: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    update_data = c_update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(c, key, val)
        
    db.commit()
    db.refresh(c)
    p_count = db.query(Post).filter(Post.campaign_id == c.id).count()
    return CampaignOut(
        id=c.id,
        user_id=c.user_id,
        name=c.name,
        description=c.description,
        platforms=c.platforms,
        start_date=c.start_date,
        end_date=c.end_date,
        budget=c.budget,
        objective=c.objective,
        status=c.status,
        progress_percent=c.progress_percent,
        target_reach=c.target_reach,
        actual_reach=c.actual_reach,
        target_engagement=c.target_engagement,
        actual_engagement=c.actual_engagement,
        posts_count=p_count,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    db.delete(c)
    db.commit()
    return {"success": True, "message": "Campaign deleted successfully"}
