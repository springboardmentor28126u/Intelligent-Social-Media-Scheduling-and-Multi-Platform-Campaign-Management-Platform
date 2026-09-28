from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.core.database import Base

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # facebook, instagram, linkedin, twitter, youtube, pinterest
    account_name = Column(String(100), nullable=False)
    account_handle = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    growth_rate = Column(String(20), default="+0%")
    is_connected = Column(Boolean, default=True)
    token_status = Column(String(50), default="Valid")  # Valid, Expiring Soon, Needs Reconnection
    access_token = Column(String(500), nullable=True)
    connected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_synced_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="social_accounts")
