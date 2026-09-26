"""add recurring post fields

Revision ID: afac50855262
Revises: 6ce15e10a2e1
Create Date: 2026-09-14 22:59:48.080791
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "afac50855262"
down_revision: Union[str, Sequence[str], None] = "6ce15e10a2e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column(
            "is_recurring",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "posts",
        sa.Column(
            "recurrence_type",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "posts",
        sa.Column(
            "recurrence_end_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("posts", "recurrence_end_at")
    op.drop_column("posts", "recurrence_type")
    op.drop_column("posts", "is_recurring")
