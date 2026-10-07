"""Email invitations with seven-day expiry."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810009"
down_revision = "a21c4e810008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("team_invitations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "email"))
    op.create_index("ix_team_invitations_workspace_id", "team_invitations", ["workspace_id"])
    op.execute("""INSERT INTO team_invitations (workspace_id, email, role, status, expires_at)
        SELECT m.workspace_id, lower(u.email), m.role, 'pending', CURRENT_TIMESTAMP + INTERVAL '7 days'
        FROM memberships m JOIN users u ON m.user_id = u.id WHERE m.status = 'invited'""")


def downgrade():
    op.drop_table("team_invitations")
