from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database.postgres import Base


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    platform = Column(
        String,
        nullable=False
    )

    username = Column(
        String,
        nullable=False
    )

    access_token = Column(
        String,
        nullable=True
    )

    user = relationship(
        "User",
        backref="social_accounts"
    )