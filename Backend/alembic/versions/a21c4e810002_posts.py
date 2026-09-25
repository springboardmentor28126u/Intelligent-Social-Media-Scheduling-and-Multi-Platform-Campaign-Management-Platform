"""Persist private text drafts."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810002"
down_revision = "a21c4e810001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("platform", sa.String(20), nullable=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_posts_user_id", "posts", ["user_id"])


def downgrade():
    op.drop_index("ix_posts_user_id", table_name="posts")
    op.drop_table("posts")
