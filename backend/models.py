from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import DateTime, Text, JSON
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Content Creator")
    social_accounts = relationship("SocialAccount", back_populates="owner")
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    platform = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    platform_user_id = Column(String, nullable=True)
    status = Column(String, default="connected")

    owner = relationship("User", back_populates="social_accounts")
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    media_urls = Column(JSON, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="draft")
    created_at = Column(DateTime(timezone=True), server_default="now()")

    user = relationship("User", back_populates="posts")
    platform_posts = relationship("PostPlatform", back_populates="post", cascade="all, delete-orphan")


class PostPlatform(Base):
    __tablename__ = "post_platforms"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id"), nullable=False)
    platform = Column(String, nullable=False)
    status = Column(String, default="pending")
    published_at = Column(DateTime(timezone=True), nullable=True)
    external_post_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)

    post = relationship("Post", back_populates="platform_posts")
    social_account = relationship("SocialAccount")
