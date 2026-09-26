from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.post("/", response_model=schemas.CampaignOut)
def create_campaign(
    campaign: schemas.CampaignCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_campaign = models.Campaign(**campaign.dict(), user_id=current_user.id)
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign

@router.get("/", response_model=List[schemas.CampaignOut])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Campaign).filter(models.Campaign.user_id == current_user.id).all()

@router.get("/{campaign_id}", response_model=schemas.CampaignOut)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id, models.Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}", response_model=schemas.CampaignOut)
def update_campaign(
    campaign_id: int,
    update: schemas.CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id, models.Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id, models.Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"detail": "Campaign deleted"}

@router.get("/{campaign_id}/posts", response_model=List[schemas.PostOut])
def get_campaign_posts(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id, models.Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign.posts