from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from sqlalchemy import String, Integer, ForeignKey, Boolean

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(100))

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True
    )

    password_hash: Mapped[str] = mapped_column(String(255))

    role: Mapped[str] = mapped_column(
        String(50),
        default="user"
    )
class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )

    platform: Mapped[str] = mapped_column(
        String(50)
    )

    account_name: Mapped[str] = mapped_column(
        String(100)
    )

    connected: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )