from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/", response_model=schemas.PostOut)
def create_post(
    post_data: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    accounts = db.query(models.SocialAccount).filter(
        models.SocialAccount.id.in_(post_data.social_account_ids),
        models.SocialAccount.user_id == current_user.id,
    ).all()

    if len(accounts) != len(post_data.social_account_ids):
        raise HTTPException(status_code=400, detail="One or more social accounts not found or not yours")

    status = "scheduled" if post_data.scheduled_time else "scheduled"

    post = models.Post(
        user_id=current_user.id,
        title=post_data.title,
        content=post_data.content,
        media_urls=post_data.media_urls,
        scheduled_time=post_data.scheduled_time,
        status=status,
    )
    db.add(post)
    db.flush()

    for account in accounts:
        db.add(models.PostPlatform(
            post_id=post.id,
            social_account_id=account.id,
            platform=account.platform,
            status="pending",
        ))

    db.commit()
    db.refresh(post)

    if not post_data.scheduled_time:
        from tasks import publish_post
        publish_post.delay(post.id)

    return post


@router.get("/", response_model=List[schemas.PostOut])
def list_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Post).filter(
        models.Post.user_id == current_user.id
    ).order_by(models.Post.scheduled_time.asc().nullslast()).all()


@router.get("/{post_id}", response_model=schemas.PostOut)
def get_post(
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
    return post


@router.delete("/{post_id}")
def delete_post(
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
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Cannot delete a published post")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}
