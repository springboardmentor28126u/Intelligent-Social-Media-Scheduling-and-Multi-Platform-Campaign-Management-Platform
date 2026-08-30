from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.postgres import SessionLocal
from app.models.post import Post
from app.models.social_account import SocialAccount
from app.core.security import get_current_user
from app.services.publisher import publish_to_social_media


router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()



@router.post("/")
def create_post(
    social_account_id: int,
    content: str,
    scheduled_at: datetime | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    social_account = db.query(SocialAccount).filter(
        SocialAccount.id == social_account_id,
        SocialAccount.user_id == current_user_id
    ).first()

    if not social_account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found"
        )

    if scheduled_at:
        

        if scheduled_at <= datetime.now():
            raise HTTPException(
                status_code=400,
                detail="Scheduled time must be in the future"
        )

        status = "scheduled"
    else:
        status = "draft"

    post = Post(
        user_id=current_user_id,
        social_account_id=social_account_id,
        content=content,
        status=status,
        scheduled_at=scheduled_at
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return {
        "message": "Post created successfully",
        "id": post.id,
        "social_account_id": post.social_account_id,
        "content": post.content,
        "status": post.status,
        "scheduled_at": post.scheduled_at
    }


@router.put("/{post_id}")
def update_post(
    post_id: int,
    content: str,
    scheduled_at: datetime | None = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.user_id == current_user_id
    ).first()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    
    post.content = content

    if scheduled_at:
        if scheduled_at <= datetime.now():
            raise HTTPException(
               status_code=400,
               detail="Scheduled time must be in the future"
          )

        post.scheduled_at = scheduled_at
        post.status = "scheduled"
    else:
        post.scheduled_at = None
        post.status = "draft"

    db.commit()
    db.refresh(post)

    return {
        "message": "Post updated successfully",
        "id": post.id,
        "content": post.content,
        "status": post.status,
        "scheduled_at": post.scheduled_at
    }
    


@router.get("/")
def get_posts(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    posts = db.query(Post).filter(
        Post.user_id == current_user_id
    ).all()

    result = []

    for post in posts:
        social_account = db.query(SocialAccount).filter(
            SocialAccount.id == post.social_account_id,
            SocialAccount.user_id == current_user_id
        ).first()

        result.append({
            "id": post.id,
            "user_id": post.user_id,
            "social_account_id": post.social_account_id,
            "platform": social_account.platform if social_account else None,
            "username": social_account.username if social_account else None,
            "content": post.content,
            "status": post.status,
            "scheduled_at": post.scheduled_at
        })

    return result

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.user_id == current_user_id
    ).first()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    db.delete(post)
    db.commit()

    return {
        "message": "Post deleted successfully"
    }

@router.put("/{post_id}/publish")
def publish_post(
    post_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the post belonging to the logged-in user
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.user_id == current_user_id
    ).first()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    # Find the social account connected to this post
    social_account = db.query(SocialAccount).filter(
        SocialAccount.id == post.social_account_id,
        SocialAccount.user_id == current_user_id
    ).first()

    if not social_account:
        raise HTTPException(
            status_code=404,
            detail="Social account not found or disconnected"
        )

    # Check whether the social account is connected
    if not social_account.access_token:
        raise HTTPException(
            status_code=400,
            detail="Social account is not connected"
        )

    # Call publishing service
    result = publish_to_social_media(
        platform=social_account.platform,
        username=social_account.username,
        content=post.content,
        access_token=social_account.access_token
    )

    # Publishing failed
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get(
                "message",
                "Failed to publish post"
            )
        )

    # Publishing successful
    post.status = "published"
    post.scheduled_at = None

    db.commit()
    db.refresh(post)

    return {
        "message": "Post published successfully",
        "id": post.id,
        "social_account_id": post.social_account_id,
        "platform": social_account.platform,
        "username": social_account.username,
        "content": post.content,
        "status": post.status
    }

