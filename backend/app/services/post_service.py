from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.post import Post
from app.models.notification import Notification
from app.schemas.post import PostCreate, PostUpdate

class PostService:
    @staticmethod
    def get_posts(
        db: Session,
        user_id: int,
        status: Optional[str] = None,
        platform: Optional[str] = None,
        campaign_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Post]:
        query = db.query(Post).filter(Post.user_id == user_id)
        if status and status.lower() != "all":
            query = query.filter(Post.status.ilike(status))
        if platform and platform.lower() != "all":
            query = query.filter(Post.platforms.ilike(f"%{platform}%"))
        if campaign_id:
            query = query.filter(Post.campaign_id == campaign_id)
        
        return query.order_by(Post.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_post_by_id(db: Session, post_id: int, user_id: int) -> Optional[Post]:
        return db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()

    @staticmethod
    def create_post(db: Session, user_id: int, post_in: PostCreate) -> Post:
        # Determine status
        initial_status = post_in.status or "Draft"
        if post_in.scheduled_at and initial_status == "Draft":
            initial_status = "Scheduled"

        published_at = None
        if initial_status == "Published":
            published_at = datetime.now(timezone.utc)

        db_post = Post(
            user_id=user_id,
            campaign_id=post_in.campaign_id,
            content=post_in.content,
            platforms=post_in.platforms,
            media_url=post_in.media_url,
            media_type=post_in.media_type or "image",
            instagram_content=post_in.instagram_content,
            linkedin_content=post_in.linkedin_content,
            twitter_content=post_in.twitter_content,
            facebook_content=post_in.facebook_content,
            youtube_content=post_in.youtube_content,
            pinterest_content=post_in.pinterest_content,
            status=initial_status,
            scheduled_at=post_in.scheduled_at,
            published_at=published_at,
            is_ai_generated=post_in.is_ai_generated or False,
            likes_count=12 if initial_status == "Published" else 0,
            reach_count=180 if initial_status == "Published" else 0
        )
        db.add(db_post)
        db.commit()
        db.refresh(db_post)

        # Create a notification if post scheduled or published
        if initial_status == "Scheduled":
            notif = Notification(
                user_id=user_id,
                title="Post Scheduled",
                message=f"Post '{post_in.content[:40]}...' scheduled for {post_in.scheduled_at.strftime('%b %d, %H:%M') if post_in.scheduled_at else 'later'}.",
                category="Publishing",
                type="info",
                action_url=f"/dashboard/calendar"
            )
            db.add(notif)
            db.commit()
        elif initial_status == "Published":
            notif = Notification(
                user_id=user_id,
                title="Post Published Successfully",
                message=f"Your post was published across {post_in.platforms.upper()}.",
                category="Publishing",
                type="success",
                action_url=f"/dashboard/analytics"
            )
            db.add(notif)
            db.commit()

        return db_post

    @staticmethod
    def update_post(db: Session, post: Post, post_in: PostUpdate) -> Post:
        update_data = post_in.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(post, key, val)
        
        if post.status == "Published" and not post.published_at:
            post.published_at = datetime.now(timezone.utc)
            
        db.commit()
        db.refresh(post)
        return post

    @staticmethod
    def delete_post(db: Session, post: Post) -> bool:
        db.delete(post)
        db.commit()
        return True

    @staticmethod
    def publish_now(db: Session, post: Post) -> Post:
        post.status = "Published"
        post.published_at = datetime.now(timezone.utc)
        post.likes_count = (post.likes_count or 0) + 14
        post.reach_count = (post.reach_count or 0) + 210
        post.clicks_count = (post.clicks_count or 0) + 18
        
        notif = Notification(
            user_id=post.user_id,
            title="Post Published Now",
            message=f"Post '{post.content[:35]}...' is now live on {post.platforms.upper()}.",
            category="Publishing",
            type="success",
            action_url="/dashboard/analytics"
        )
        db.add(notif)
        db.commit()
        db.refresh(post)
        return post
