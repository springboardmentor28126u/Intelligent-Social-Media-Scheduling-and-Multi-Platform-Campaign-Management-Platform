"""campaign indices and relations check

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Ensure campaigns table exists
    if "campaigns" not in existing_tables:
        op.create_table(
            "campaigns",
            sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
            sa.Column("uuid", sa.String(36), nullable=False, unique=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id", ondelete="SET NULL"), nullable=True),
            sa.Column("name", sa.String(150), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("platform", sa.String(100), server_default="All Platforms", nullable=False),
            sa.Column("status", sa.String(30), server_default="active", nullable=False),
            sa.Column("start_date", sa.DateTime(), nullable=True),
            sa.Column("end_date", sa.DateTime(), nullable=True),
            sa.Column("budget", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("spent", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("currency", sa.String(10), server_default="USD", nullable=True),
            sa.Column("objectives", sa.String(255), nullable=True),
            sa.Column("target_audience", sa.String(255), nullable=True),
            sa.Column("target_reach", sa.Integer(), server_default="50000", nullable=True),
            sa.Column("target_engagement", sa.Float(), server_default="5.0", nullable=True),
            sa.Column("target_clicks", sa.Integer(), server_default="2000", nullable=True),
            sa.Column("actual_reach", sa.Integer(), server_default="0", nullable=True),
            sa.Column("actual_engagement", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("actual_clicks", sa.Integer(), server_default="0", nullable=True),
            sa.Column("roi", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("color", sa.String(30), server_default="#2563eb", nullable=True),
            sa.Column("tags", sa.String(255), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )

    # Ensure campaign_posts table exists
    if "campaign_posts" not in existing_tables:
        op.create_table(
            "campaign_posts",
            sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
            sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
            sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )

    # Check and add index on posts.campaign_id if missing
    if "posts" in existing_tables:
        post_indexes = [idx["name"] for idx in inspector.get_indexes("posts")]
        if "ix_posts_campaign_id" not in post_indexes and "idx_posts_campaign_id" not in post_indexes:
            try:
                op.create_index("ix_posts_campaign_id", "posts", ["campaign_id"], unique=False)
            except Exception:
                pass


def downgrade() -> None:
    pass
