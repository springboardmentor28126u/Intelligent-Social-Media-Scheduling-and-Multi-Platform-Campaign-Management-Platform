"""add recurring post fields

Revision ID: 15b7e60a25e2
Revises: eb11043b428d
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "15b7e60a25e2"
down_revision: Union[str, Sequence[str], None] = "eb11043b428d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_recurring column
    # Existing posts will automatically get False
    op.add_column(
        "posts",
        sa.Column(
            "is_recurring",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false()
        )
    )

    # Add recurrence type
    op.add_column(
        "posts",
        sa.Column(
            "recurrence_type",
            sa.String(),
            nullable=True
        )
    )

    # Add recurrence end date
    op.add_column(
        "posts",
        sa.Column(
            "recurrence_end",
            sa.DateTime(),
            nullable=True
        )
    )


def downgrade() -> None:
    # Remove recurrence fields
    op.drop_column("posts", "recurrence_end")
    op.drop_column("posts", "recurrence_type")
    op.drop_column("posts", "is_recurring")