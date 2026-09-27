"""add post publishing fields

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("published_at", sa.DateTime(), nullable=True))
    op.add_column("posts", sa.Column("platform_post_id", sa.String(), nullable=True))
    op.add_column("posts", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column(
        "posts",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.add_column(
        "posts",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_check_constraint(
        "post_status_check",
        "posts",
        "status IN ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')",
    )


def downgrade() -> None:
    op.drop_constraint("post_status_check", "posts", type_="check")
    op.drop_column("posts", "updated_at")
    op.drop_column("posts", "created_at")
    op.drop_column("posts", "error_message")
    op.drop_column("posts", "platform_post_id")
    op.drop_column("posts", "published_at")