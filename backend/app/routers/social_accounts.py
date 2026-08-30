from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.postgres import SessionLocal
from app.models.social_account import SocialAccount
from app.core.security import get_current_user


router = APIRouter(
    prefix="/social-accounts",
    tags=["Social Accounts"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ADD SOCIAL ACCOUNT
@router.post("/")
def add_social_account(
    platform: str,
    username: str,
    access_token: str | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    platform = platform.lower().strip()
    username = username.strip()

    supported_platforms = [
        "instagram",
        "facebook",
        "linkedin",
        "twitter"
    ]

    if platform not in supported_platforms:
        raise HTTPException(
            status_code=400,
            detail="Unsupported social media platform"
        )

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username cannot be empty"
        )

    social_account = SocialAccount(
        user_id=current_user_id,
        platform=platform,
        username=username,
        access_token=access_token
    )

    db.add(social_account)
    db.commit()
    db.refresh(social_account)

    return {
        "message": "Social account added successfully",
        "id": social_account.id,
        "platform": social_account.platform,
        "username": social_account.username
    }


# GET SOCIAL ACCOUNTS
@router.get("/")
def get_social_accounts(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user_id
    ).all()

    return [
        {
            "id": account.id,
            "platform": account.platform,
            "username": account.username,
            "connected": bool(account.access_token)
        }
        for account in accounts
    ]
    
    
# CONNECT SOCIAL ACCOUNT
@router.put("/{account_id}/connect")
def connect_social_account(
    account_id: int,
    access_token: str,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == current_user_id
    ).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    if not access_token.strip():
        raise HTTPException(
            status_code=400,
            detail="Access token cannot be empty"
        )

    account.access_token = access_token.strip()

    db.commit()
    db.refresh(account)

    return {
        "message": "Social account connected successfully",
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "connected": True
    }


# DISCONNECT SOCIAL ACCOUNT
@router.put("/{account_id}/disconnect")
def disconnect_social_account(
    account_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == current_user_id
    ).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    account.access_token = None

    db.commit()
    db.refresh(account)

    return {
        "message": "Social account disconnected successfully",
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "connected": False
    }


# DELETE SOCIAL ACCOUNT
@router.delete("/{account_id}")
def delete_social_account(
    account_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == current_user_id
    ).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    db.delete(account)
    db.commit()

    return {
        "message": "Social account deleted successfully"
    }