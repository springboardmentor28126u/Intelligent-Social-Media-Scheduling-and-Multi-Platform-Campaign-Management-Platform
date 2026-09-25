"""Add encrypted credentials and single-use OAuth attempts."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810001"
down_revision = "df8126c1a3e4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("social_credentials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("encrypted_token", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=True),
        sa.UniqueConstraint("user_id", "provider", "external_id"))
    op.create_table("oauth_attempts",
        sa.Column("state_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("browser_hash", sa.String(64), nullable=False),
        sa.Column("encrypted_verifier", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False))


def downgrade():
    op.drop_table("oauth_attempts")
    op.drop_table("social_credentials")
