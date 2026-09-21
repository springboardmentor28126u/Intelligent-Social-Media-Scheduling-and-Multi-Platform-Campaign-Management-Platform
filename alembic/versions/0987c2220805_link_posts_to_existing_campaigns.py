"""link posts to existing campaigns

Revision ID: 0987c2220805
Revises: afac50855262
Create Date: 2026-09-18

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0987c2220805"
down_revision: Union[str, Sequence[str], None] = "afac50855262"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add campaign relationship to posts."""

    op.add_column(
        "posts",
        sa.Column(
            "campaign_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_posts_campaign_id",
        "posts",
        ["campaign_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_posts_campaign_id_campaigns",
        "posts",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Remove campaign relationship from posts."""

    op.drop_constraint(
        "fk_posts_campaign_id_campaigns",
        "posts",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_posts_campaign_id",
        table_name="posts",
    )

    op.drop_column(
        "posts",
        "campaign_id",
    )