from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.publishing_log import (
    PublishingLog,
    PublishingLogStatus,
)
from app.models.post import Post
from app.models.post_social_account import (
    PostSocialAccount,
    PublishStatus,
)
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.publishing_service import publishing_service


router = APIRouter(
    prefix="/publishing-logs",
    tags=["Publishing History"],
)


@router.get("/")
def get_publishing_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    logs = (
        db.query(PublishingLog)
        .join(Post)
        .filter(
            Post.user_id == current_user.id
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "post_id": log.post_id,
                "social_account_id": log.social_account_id,
                "status": log.status.value,
                "message": log.message,
                "platform_response": log.platform_response,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }


@router.get("/post/{post_id}")
def get_post_publishing_history(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    post = (
        db.query(Post)
        .filter(
            Post.id == post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    logs = (
        db.query(PublishingLog)
        .filter(
            PublishingLog.post_id == post_id
        )
        .order_by(
            PublishingLog.created_at.desc()
        )
        .all()
    )

    return {
        "post_id": post_id,
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "social_account_id": log.social_account_id,
                "status": log.status.value,
                "message": log.message,
                "platform_response": log.platform_response,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }


@router.post("/{log_id}/retry")
def retry_failed_publishing(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    publishing_log = (
        db.query(PublishingLog)
        .join(Post)
        .filter(
            PublishingLog.id == log_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not publishing_log:
        raise HTTPException(
            status_code=404,
            detail="Publishing log not found",
        )

    if publishing_log.status != PublishingLogStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail="Only failed publishing logs can be retried",
        )

    post = (
        db.query(Post)
        .filter(
            Post.id == publishing_log.post_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    post_account = (
        db.query(PostSocialAccount)
        .filter(
            PostSocialAccount.post_id == post.id,
            PostSocialAccount.social_account_id
            == publishing_log.social_account_id,
        )
        .first()
    )

    if not post_account:
        raise HTTPException(
            status_code=404,
            detail="Post social account connection not found",
        )

    social_account = post_account.social_account

    try:
        print(
            f"Retrying post {post.id} to "
            f"{social_account.platform}..."
        )

        # Mark account as pending while retrying
        post_account.status = PublishStatus.PENDING
        post_account.error_message = None

        integration = (
            publishing_service.get_platform_integration(
                platform=social_account.platform,
                social_account=social_account,
            )
        )

        # Publish the post
        result = integration.publish_post(
            post.content
        )

        # Update social account publishing status
        post_account.status = PublishStatus.PUBLISHED
        post_account.published_at = datetime.now(
            timezone.utc
        )
        post_account.error_message = None

        # Create SUCCESS retry log
        retry_log = PublishingLog(
            post_id=post.id,
            social_account_id=social_account.id,
            status=PublishingLogStatus.SUCCESS,
            message=(
                f"Retry successful: post published to "
                f"{social_account.platform}"
            ),
            platform_response=json.dumps(
                result,
                default=str,
            ),
        )

        db.add(retry_log)
        db.commit()

        return {
            "message": "Publishing retry successful",
            "post_id": post.id,
            "social_account_id": social_account.id,
            "platform": social_account.platform,
            "status": "SUCCESS",
            "result": result,
        }

    except Exception as error:

        db.rollback()

        error_message = str(error)

        # Re-fetch the post account after rollback
        post_account = (
            db.query(PostSocialAccount)
            .filter(
                PostSocialAccount.post_id == post.id,
                PostSocialAccount.social_account_id
                == social_account.id,
            )
            .first()
        )

        if post_account:
            post_account.status = PublishStatus.FAILED
            post_account.error_message = error_message

        # Create FAILED retry log
        retry_log = PublishingLog(
            post_id=post.id,
            social_account_id=social_account.id,
            status=PublishingLogStatus.FAILED,
            message=(
                f"Retry failed: {error_message}"
            ),
            platform_response=None,
        )

        db.add(retry_log)
        db.commit()

        # Return a clean response instead of 500 Internal Server Error
        return {
            "message": "Publishing retry failed",
            "post_id": post.id,
            "social_account_id": social_account.id,
            "platform": social_account.platform,
            "status": "FAILED",
            "error": error_message,
        }


@router.get("/{log_id}")
def get_publishing_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    log = (
        db.query(PublishingLog)
        .join(Post)
        .filter(
            PublishingLog.id == log_id,
            Post.user_id == current_user.id,
        )
        .first()
    )

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Publishing log not found",
        )

    return {
        "id": log.id,
        "post_id": log.post_id,
        "social_account_id": log.social_account_id,
        "status": log.status.value,
        "message": log.message,
        "platform_response": log.platform_response,
        "created_at": log.created_at,
    }