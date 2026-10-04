"""add notification type

Revision ID: 60fb47da5edb
Revises: a152000a6516
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "60fb47da5edb"
down_revision: Union[str, Sequence[str], None] = "a152000a6516"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column(
            "notification_type",
            sa.String(length=50),
            nullable=False,
            server_default="GENERAL",
        ),
    )


def downgrade() -> None:
    op.drop_column("notifications", "notification_type")