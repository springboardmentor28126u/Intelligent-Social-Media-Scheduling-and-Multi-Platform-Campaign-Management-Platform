"""Campaign management and audience growth snapshots (Milestone 3)."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810005"
down_revision = "a21c4e810004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("campaigns",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("objective", sa.String(30), nullable=False, server_default="engagement"),
        sa.Column("platforms", sa.String(200), nullable=False, server_default=""),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("budget", sa.Float(), nullable=False, server_default="0"),
        sa.Column("revenue", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("target_engagements", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target_posts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_campaigns_user_id", "campaigns", ["user_id"])
    op.add_column("posts", sa.Column("campaign_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_posts_campaign_id", "posts", "campaigns", ["campaign_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_posts_campaign_id", "posts", ["campaign_id"])
    op.create_table("audience_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("followers", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("following", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("media_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_audience_snapshots_user_id", "audience_snapshots", ["user_id"])
    op.create_index("ix_audience_account_collected", "audience_snapshots", ["account_id", "collected_at"])


def downgrade():
    op.drop_index("ix_audience_account_collected", table_name="audience_snapshots")
    op.drop_index("ix_audience_snapshots_user_id", table_name="audience_snapshots")
    op.drop_table("audience_snapshots")
    op.drop_index("ix_posts_campaign_id", table_name="posts")
    op.drop_constraint("fk_posts_campaign_id", "posts", type_="foreignkey")
    op.drop_column("posts", "campaign_id")
    op.drop_index("ix_campaigns_user_id", table_name="campaigns")
    op.drop_table("campaigns")
