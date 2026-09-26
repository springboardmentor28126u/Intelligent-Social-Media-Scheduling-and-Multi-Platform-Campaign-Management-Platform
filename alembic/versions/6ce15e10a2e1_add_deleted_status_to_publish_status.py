"""add deleted status to publish status

Revision ID: 6ce15e10a2e1
Revises: e737d18661a2
Create Date: 2026-09-12 16:24:40.217696
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "6ce15e10a2e1"
down_revision: Union[str, Sequence[str], None] = "e737d18661a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TYPE publishing_log_status ADD VALUE IF NOT EXISTS 'DELETED'"
    )


def downgrade() -> None:
    # PostgreSQL does not easily support removing enum values.
    pass