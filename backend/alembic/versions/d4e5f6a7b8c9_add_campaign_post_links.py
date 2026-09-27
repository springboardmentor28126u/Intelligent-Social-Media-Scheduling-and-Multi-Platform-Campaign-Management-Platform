"""add campaign account and post links

Revision ID: d4e5f6a7b8c9
Revises: c1a2b3d4e5f6
Create Date: 2026-09-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "06bf3536135c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaign_social_accounts",
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("social_account_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["social_account_id"], ["social_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("campaign_id", "social_account_id"),
    )
    op.add_column("posts", sa.Column("campaign_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_posts_campaign_id"), "posts", ["campaign_id"], unique=False)
    op.create_foreign_key(None, "posts", "campaigns", ["campaign_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint(None, "posts", type_="foreignkey")
    op.drop_index(op.f("ix_posts_campaign_id"), table_name="posts")
    op.drop_column("posts", "campaign_id")
    op.drop_table("campaign_social_accounts")