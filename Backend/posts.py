"""Private, database-backed text drafts. Scheduling/publishing is a separate step."""
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Campaign, Post, SocialAccount, PublishingJob, PublishingLog

Platform = Literal["facebook", "instagram", "linkedin", "x", "youtube"]
PLATFORMS = {"facebook", "instagram", "linkedin", "x", "youtube"}


class DraftCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=50000)
    image_url: str | None = Field(default=None, max_length=2048)
    video_url: str | None = Field(default=None, max_length=2048)
    platform: Platform | None = None
    account_id: int | None = Field(default=None, gt=0)
    campaign_id: int | None = Field(default=None, gt=0)

    @field_validator("title", mode="before")
    @classmethod
    def clean_title(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("image_url", "video_url")
    @classmethod
    def check_image(cls, value):
        from scheduling import validate_image
        return validate_image(value)


class DraftUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=50000)
    image_url: str | None = Field(default=None, max_length=2048)
    video_url: str | None = Field(default=None, max_length=2048)
    platform: Platform | None = None
    account_id: int | None = Field(default=None, gt=0)
    campaign_id: int | None = Field(default=None, gt=0)

    @field_validator("title", mode="before")
    @classmethod
    def clean_title(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("image_url", "video_url")
    @classmethod
    def check_image(cls, value):
        from scheduling import validate_image
        return validate_image(value)

    @model_validator(mode="after")
    def validate_patch(self):
        if not self.model_fields_set:
            raise ValueError("Supply at least one field")
        for field in ("title", "content"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(field + " cannot be null")
        return self


class CampaignLink(BaseModel):
    model_config = ConfigDict(extra="forbid")
    campaign_id: int | None = Field(default=None, gt=0)


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    image_url: str | None
    video_url: str | None = None
    platform: Platform | None
    account_id: int | None
    campaign_id: int | None = None
    is_demo: bool = False
    status: str
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def utc_timestamp(cls, value):
        # SQLite used by tests drops timezone metadata; persisted times are UTC.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def owned_post(db, user_id, post_id, lock=False):
    query = db.query(Post).filter_by(id=post_id, user_id=user_id)
    post = (query.with_for_update() if lock else query).first()
    if post is None:
        raise HTTPException(404, "Post not found")
    return post


def validate_target(db, user_id, platform, account_id):
    if account_id is None:
        return platform
    account = db.query(SocialAccount).filter_by(id=account_id, user_id=user_id).first()
    if account is None:
        raise HTTPException(404, "Social account not found")
    account_platform = account.platform.lower()
    if account_platform not in PLATFORMS:
        raise HTTPException(422, "Unsupported social account platform")
    if platform is not None and platform != account_platform:
        raise HTTPException(422, "Post platform does not match the social account")
    return account_platform


def validate_campaign(db, user_id, campaign_id):
    if campaign_id is not None and db.query(Campaign).filter_by(id=campaign_id, user_id=user_id).first() is None:
        raise HTTPException(404, "Campaign not found")


def save(db, post):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Account changed while saving; reload and retry") from None
    db.refresh(post)
    return post


def make_router(require_permission):
    router = APIRouter(prefix="/posts", tags=["Posts and drafts"])

    @router.post("", response_model=PostResponse, status_code=201)
    def create_post(data: DraftCreate, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        values = data.model_dump()
        values["platform"] = validate_target(db, int(payload["sub"]), data.platform, data.account_id)
        validate_campaign(db, int(payload["sub"]), data.campaign_id)
        post = Post(user_id=int(payload["sub"]), status="draft", **values)
        db.add(post)
        return save(db, post)

    @router.get("", response_model=list[PostResponse])
    def list_posts(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                   platform: Platform | None = None, campaign_id: int | None = Query(None, gt=0), status: Literal["draft", "scheduled", "publishing", "published", "partially_published", "failed", "cancelled", "needs_review"] | None = None,
                   payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        query = db.query(Post).filter_by(user_id=int(payload["sub"]))
        if platform:
            query = query.filter_by(platform=platform)
        if status:
            query = query.filter_by(status=status)
        if campaign_id:
            query = query.filter_by(campaign_id=campaign_id)
        return query.order_by(Post.created_at.desc(), Post.id.desc()).offset(offset).limit(limit).all()

    @router.get("/{post_id}", response_model=PostResponse)
    def get_post(post_id: int, payload=Depends(require_permission("posts:read")), db: Session = Depends(get_db)):
        return owned_post(db, int(payload["sub"]), post_id)

    @router.patch("/{post_id}", response_model=PostResponse)
    def update_post(post_id: int, data: DraftUpdate, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        post = owned_post(db, int(payload["sub"]), post_id, lock=True)
        if post.status != "draft":
            raise HTTPException(409, "Only drafts can be edited here")
        values = data.model_dump(exclude_unset=True)
        platform = validate_target(db, post.user_id, values.get("platform", post.platform), values.get("account_id", post.account_id))
        if "campaign_id" in values:
            validate_campaign(db, post.user_id, values["campaign_id"])
        for name, value in values.items():
            setattr(post, name, value)
        post.platform = platform
        post.updated_at = datetime.now(timezone.utc)
        return save(db, post)

    @router.patch("/{post_id}/campaign", response_model=PostResponse)
    def set_campaign(post_id: int, data: CampaignLink, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        """Grouping is metadata, so it can change for scheduled and published posts too."""
        post = owned_post(db, int(payload["sub"]), post_id)
        validate_campaign(db, post.user_id, data.campaign_id)
        post.campaign_id = data.campaign_id
        return save(db, post)

    @router.delete("/{post_id}")
    def delete_post(post_id: int, payload=Depends(require_permission("posts:write")), db: Session = Depends(get_db)):
        post = owned_post(db, int(payload["sub"]), post_id, lock=True)
        if post.status != "draft":
            raise HTTPException(409, "Only drafts can be deleted here")
        if db.query(PublishingJob).filter_by(post_id=post.id).first():
            raise HTTPException(409, "Draft has publishing history and cannot be deleted")
        db.delete(post)
        db.commit()
        return {"message": "Draft deleted"}

    return router
