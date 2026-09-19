import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base


class SocialPlatform(Base):
    __tablename__ = "social_platforms"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # facebook, instagram, linkedin, twitter, youtube, pinterest
    name = Column(String(100), nullable=False)
    icon = Column(String(100), nullable=True)
    character_limit = Column(Integer, default=2200)
    supports_media = Column(Boolean, default=True)
    supports_video = Column(Boolean, default=True)
    supports_carousel = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False, index=True)
    account_name = Column(String(150), nullable=False)
    platform_user_id = Column(String(150), nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="active", nullable=True)
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="social_accounts")

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    # Dynamic properties for schema compatibility
    @property
    def uuid(self):
        return getattr(self, "_uuid", None) or f"sa-{self.id}"

    @uuid.setter
    def uuid(self, val):
        self._uuid = val

    @property
    def account_id(self):
        return getattr(self, "_account_id", None) or self.platform_user_id

    @account_id.setter
    def account_id(self, val):
        self._account_id = val

    @property
    def account_handle(self):
        return getattr(self, "_account_handle", None) or self.account_name

    @account_handle.setter
    def account_handle(self, val):
        self._account_handle = val

    @property
    def avatar_url(self):
        return getattr(self, "_avatar_url", None)

    @avatar_url.setter
    def avatar_url(self, val):
        self._avatar_url = val

    @property
    def followers_count(self):
        return getattr(self, "_followers_count", 0)

    @followers_count.setter
    def followers_count(self, val):
        self._followers_count = val

    @property
    def following_count(self):
        return getattr(self, "_following_count", 0)

    @following_count.setter
    def following_count(self, val):
        self._following_count = val

    @property
    def posts_count(self):
        return getattr(self, "_posts_count", 0)

    @posts_count.setter
    def posts_count(self, val):
        self._posts_count = val

    @property
    def is_demo(self):
        return getattr(self, "_is_demo", False)

    @is_demo.setter
    def is_demo(self, val):
        self._is_demo = val

    @property
    def metadata_json(self):
        return getattr(self, "_metadata_json", None)

    @metadata_json.setter
    def metadata_json(self, val):
        self._metadata_json = val

    @property
    def team_id(self):
        return getattr(self, "_team_id", None)

    @team_id.setter
    def team_id(self, val):
        self._team_id = val