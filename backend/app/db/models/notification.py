import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info", nullable=False)  
    # types: NEW_USER, POST_CREATED, POST_SCHEDULED, POST_PUBLISHED, POST_UPDATED, POST_DELETED,
    # SOCIAL_ACCOUNT_CONNECTED, SOCIAL_ACCOUNT_DISCONNECTED, publish_success, publish_failed, reminder, campaign_alert, team_invite, system_alert

    related_entity_type = Column(String(50), nullable=True)  # user, post, social_account, campaign
    related_entity_id = Column(String(100), nullable=True)

    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_user_id])
