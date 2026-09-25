"""Durable schedules, publishing jobs and logs."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810003"
down_revision = "a21c4e810002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("posts", sa.Column("image_url", sa.Text(), nullable=True))
    op.create_table("publishing_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone_name", sa.String(100), nullable=False),
        sa.Column("recurrence", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_post_id", sa.String(255), nullable=True),
        sa.Column("container_id", sa.String(255), nullable=True),
        sa.Column("error", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_jobs_due", "publishing_jobs", ["status", "run_at"])
    op.create_index("ix_jobs_user", "publishing_jobs", ["user_id"])
    op.create_table("publishing_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("publishing_jobs.id"), nullable=False),
        sa.Column("event", sa.String(30), nullable=False),
        sa.Column("message", sa.String(300), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_publishing_logs_job_id", "publishing_logs", ["job_id"])


def downgrade():
    op.drop_index("ix_publishing_logs_job_id", table_name="publishing_logs")
    op.drop_table("publishing_logs")
    op.drop_index("ix_jobs_user", table_name="publishing_jobs")
    op.drop_index("ix_jobs_due", table_name="publishing_jobs")
    op.drop_table("publishing_jobs")
    op.drop_column("posts", "image_url")
