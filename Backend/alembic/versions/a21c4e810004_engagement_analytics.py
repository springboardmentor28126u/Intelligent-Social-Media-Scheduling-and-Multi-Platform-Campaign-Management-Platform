"""Persistent engagement snapshots and review workflows."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810004"
down_revision = "a21c4e810003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("engagement_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("publishing_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comments", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shares", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reach", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("impressions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_engagement_snapshots_user_id", "engagement_snapshots", ["user_id"])
    op.create_index("ix_engagement_user_collected", "engagement_snapshots", ["user_id", "collected_at"])
    op.create_index("ix_engagement_job_collected", "engagement_snapshots", ["job_id", "collected_at"])
    op.create_table("engagement_workflows",
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("publishing_jobs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="monitoring"),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.String(300), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_engagement_workflows_user_id", "engagement_workflows", ["user_id"])


def downgrade():
    op.drop_index("ix_engagement_workflows_user_id", table_name="engagement_workflows")
    op.drop_table("engagement_workflows")
    op.drop_index("ix_engagement_job_collected", table_name="engagement_snapshots")
    op.drop_index("ix_engagement_user_collected", table_name="engagement_snapshots")
    op.drop_index("ix_engagement_snapshots_user_id", table_name="engagement_snapshots")
    op.drop_table("engagement_snapshots")
