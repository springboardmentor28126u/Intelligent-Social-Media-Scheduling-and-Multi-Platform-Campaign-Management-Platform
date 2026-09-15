from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.postgres import Base


class PublishingLog(Base):
    __tablename__ = "publishing_logs"

    id = Column(Integer, primary_key=True, index=True)

    post_id = Column(
        Integer,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    social_account_id = Column(
        Integer,
        ForeignKey("social_accounts.id", ondelete="SET NULL"),
        nullable=True
    )

    platform = Column(String, nullable=False)

    status = Column(String, nullable=False)

    message = Column(Text, nullable=True)

    published_at = Column(DateTime, nullable=False)

    post = relationship("Post")
    user = relationship("User")
    social_account = relationship("SocialAccount")