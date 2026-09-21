"""add campaign performance history

Revision ID: a152000a6516
Revises: 0987c2220805
Create Date: 2026-09-19 15:31:11.183368

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a152000a6516"
down_revision: Union[str, Sequence[str], None] = "0987c2220805"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create campaign performance history table."""

    op.create_table(
        "campaign_performance_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column("reach", sa.Integer(), nullable=True),
        sa.Column("engagement", sa.Float(), nullable=True),
        sa.Column("clicks", sa.Integer(), nullable=True),
        sa.Column("roi", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["campaigns.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_campaign_performance_history_id",
        "campaign_performance_history",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_campaign_performance_history_campaign_id",
        "campaign_performance_history",
        ["campaign_id"],
        unique=False,
    )

    op.create_index(
        "ix_campaign_performance_history_recorded_at",
        "campaign_performance_history",
        ["recorded_at"],
        unique=False,
    )


def downgrade() -> None:
    """Remove campaign performance history table."""

    op.drop_index(
        "ix_campaign_performance_history_recorded_at",
        table_name="campaign_performance_history",
    )

    op.drop_index(
        "ix_campaign_performance_history_campaign_id",
        table_name="campaign_performance_history",
    )

    op.drop_index(
        "ix_campaign_performance_history_id",
        table_name="campaign_performance_history",
    )

    op.drop_table("campaign_performance_history")