from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.database.postgres import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    social_account_id = Column(
    Integer,
    ForeignKey("social_accounts.id", ondelete="SET NULL"),
    nullable=True
    )

    content = Column(
        Text,
        nullable=False
    )

    status = Column(
        String,
        nullable=False,
        default="draft"
    )
    
    scheduled_at = Column(
        DateTime,
        nullable=True
    )

    user = relationship(
        "User",
        backref="posts"
    )

    social_account = relationship(
        "SocialAccount",
        backref="posts"
    )