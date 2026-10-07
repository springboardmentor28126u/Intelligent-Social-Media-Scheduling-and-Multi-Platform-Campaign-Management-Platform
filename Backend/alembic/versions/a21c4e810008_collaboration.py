"""Teams, approvals and persistent notification delivery."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810008"
down_revision = "a21c4e810007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("is_workspace", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("posts", sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("posts", sa.Column("approval_status", sa.String(20), server_default="draft", nullable=False))
    op.add_column("posts", sa.Column("revision", sa.Integer(), server_default="1", nullable=False))
    op.execute("UPDATE posts SET creator_id = user_id")
    op.add_column("oauth_attempts", sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.create_table("workspaces", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("storage_user_id", sa.Integer(), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("require_approval", sa.Boolean(), nullable=False))
    op.create_table("memberships", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", sa.String(30), nullable=False), sa.Column("status", sa.String(20), nullable=False),
        sa.UniqueConstraint("workspace_id", "user_id"))
    op.create_index("ix_memberships_workspace_id", "memberships", ["workspace_id"])
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
    op.create_table("approval_events", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False), sa.Column("action", sa.String(20), nullable=False),
        sa.Column("comment", sa.String(2000), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_approval_events_post_id", "approval_events", ["post_id"])
    op.create_table("notifications", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("event_key", sa.String(200), nullable=False), sa.Column("category", sa.String(30), nullable=False),
        sa.Column("title", sa.String(250), nullable=False), sa.Column("body", sa.Text(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=True), sa.Column("read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("user_id", "event_key"))
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_table("notification_preferences", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("email", sa.Boolean(), nullable=False), sa.Column("push", sa.Boolean(), nullable=False))
    op.create_table("push_subscriptions", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False), sa.Column("endpoint_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("keys_json", sa.Text(), nullable=False))
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])
    op.create_table("notification_deliveries", sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("notification_id", sa.Integer(), sa.ForeignKey("notifications.id"), nullable=False),
        sa.Column("channel", sa.String(10), nullable=False), sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False), sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt", sa.DateTime(timezone=True), nullable=False), sa.Column("error", sa.String(200), nullable=True),
        sa.UniqueConstraint("notification_id", "channel", "target_id"))


def downgrade():
    connection = op.get_bind()
    if connection.execute(sa.text("SELECT count(*) FROM workspaces")).scalar():
        raise RuntimeError("Export and resolve workspace data before downgrading collaboration")
    for table in ("notification_deliveries", "push_subscriptions", "notification_preferences", "notifications", "approval_events", "memberships", "workspaces"):
        op.drop_table(table)
    op.drop_column("oauth_attempts", "actor_id")
    for column in ("revision", "approval_status", "creator_id"):
        op.drop_column("posts", column)
    op.drop_column("users", "is_workspace")
