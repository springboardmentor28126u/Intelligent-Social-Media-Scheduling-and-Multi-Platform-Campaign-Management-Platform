from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.social_account import SocialAccount
from app.schemas.social_account import (
    SocialAccountOut, SocialAccountCreate, SocialAccountConnectRequest
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/social-accounts", tags=["Social Accounts"])

@router.get("", response_model=List[SocialAccountOut])
def list_social_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(SocialAccount).filter(SocialAccount.user_id == current_user.id).all()

@router.post("/connect", response_model=SocialAccountOut)
def connect_account(
    req: SocialAccountConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    platform_name = req.platform.lower().strip()
    handle = req.account_handle or f"@{platform_name}_creator"
    name = req.account_name or f"{current_user.name} ({platform_name.capitalize()})"
    
    # Check if exists
    acc = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user.id,
        SocialAccount.platform == platform_name
    ).first()

    if acc:
        acc.is_connected = True
        acc.token_status = "Valid"
        acc.last_synced_at = datetime.now(timezone.utc)
        if req.account_handle:
            acc.account_handle = req.account_handle
    else:
        acc = SocialAccount(
            user_id=current_user.id,
            platform=platform_name,
            account_name=name,
            account_handle=handle,
            avatar_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
            followers_count=4500,
            growth_rate="+9.5%",
            is_connected=True,
            token_status="Valid"
        )
        db.add(acc)
    
    db.commit()
    db.refresh(acc)
    return acc

@router.post("/{account_id}/disconnect")
def disconnect_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    acc = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    acc.is_connected = False
    acc.token_status = "Disconnected"
    db.commit()
    return {"success": True, "message": f"{acc.platform.capitalize()} account disconnected."}

@router.post("/{account_id}/sync")
def sync_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    acc = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    acc.last_synced_at = datetime.now(timezone.utc)
    acc.token_status = "Valid"
    db.commit()
    return {"success": True, "message": f"{acc.platform.capitalize()} synchronized successfully."}
