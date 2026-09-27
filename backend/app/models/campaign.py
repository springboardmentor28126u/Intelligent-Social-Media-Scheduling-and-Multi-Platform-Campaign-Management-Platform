from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Table,
)
from sqlalchemy.orm import relationship

from app.database.postgres import Base
from app.models.user import User
from app.models.social_account import SocialAccount


campaign_social_accounts = Table(
    "campaign_social_accounts",
    Base.metadata,
    Column("campaign_id", ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True),
    Column("social_account_id", ForeignKey("social_accounts.id", ondelete="CASCADE"), primary_key=True),
)


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Draft', 'Scheduled', 'Active', 'Paused', 'Completed', 'Archived')",
            name="campaign_status_check",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default="Draft",
        server_default="Draft",
    )
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    target_audience = Column(Text, nullable=True)
    budget = Column(Numeric(12, 2), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user = relationship("User", backref="campaigns")
    social_accounts = relationship(
        "SocialAccount",
        secondary=campaign_social_accounts,
        backref="campaigns",
    )
    posts = relationship("Post", back_populates="campaign", cascade="all, delete-orphan")