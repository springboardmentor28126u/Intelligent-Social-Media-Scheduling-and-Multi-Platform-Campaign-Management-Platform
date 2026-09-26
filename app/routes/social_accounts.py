from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.social_account import SocialAccount
from app.models.user import User


router = APIRouter(
    prefix="/social-accounts",
    tags=["Social Accounts"],
)


# GET all social accounts for the logged-in user
@router.get("/")
def get_social_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accounts = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == current_user.id)
        .order_by(SocialAccount.created_at.desc())
        .all()
    )

    return [
        {
            "id": account.id,
            "platform": account.platform,
            "account_name": account.account_name,
            "platform_user_id": account.platform_user_id,
            "status": account.status,
            "is_active": account.is_active,
            "last_synced_at": account.last_synced_at,
            "created_at": account.created_at,
        }
        for account in accounts
    ]


# POST create a new social account
@router.post("/")
def create_social_account(
    platform: str,
    account_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_account = SocialAccount(
        user_id=current_user.id,
        platform=platform,
        account_name=account_name,
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return new_account
from fastapi import APIRouter, Depends, HTTPException
@router.delete("/{account_id}")
def delete_social_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user.id,
        )
        .first()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Social account not found",
        )

    db.delete(account)
    db.commit()

    return {
        "message": "Social account deleted successfully"
    }
@router.put("/{account_id}")
def update_social_account(
    account_id: int,
    platform: str,
    account_name: str,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.id == account_id,
            SocialAccount.user_id == current_user.id,
        )
        .first()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Social account not found",
        )

    account.platform = platform
    account.account_name = account_name
    account.is_active = is_active

    db.commit()
    db.refresh(account)

    return account