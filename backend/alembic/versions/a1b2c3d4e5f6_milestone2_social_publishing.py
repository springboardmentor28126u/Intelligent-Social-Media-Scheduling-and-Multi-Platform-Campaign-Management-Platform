"""milestone 2 social publishing and multi-platform targets

Revision ID: a1b2c3d4e5f6
Revises: ee002f826242
Create Date: 2026-09-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ee002f826242'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure post_platform_targets exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "post_platform_targets" not in existing_tables:
        op.create_table(
            "post_platform_targets",
            sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
            sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("platform", sa.String(50), nullable=False),
            sa.Column("social_account_id", sa.Integer(), sa.ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True),
            sa.Column("status", sa.String(30), server_default="pending", nullable=False),
            sa.Column("external_post_id", sa.String(255), nullable=True),
            sa.Column("external_url", sa.String(500), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("max_attempts", sa.Integer(), server_default="3", nullable=False),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_post_platform_targets_post_id", "post_platform_targets", ["post_id"], unique=False)
        op.create_index("ix_post_platform_targets_platform", "post_platform_targets", ["platform"], unique=False)
        op.create_index("ix_post_platform_targets_status", "post_platform_targets", ["status"], unique=False)

    if "publishing_logs" not in existing_tables:
        op.create_table(
            "publishing_logs",
            sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
            sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("level", sa.String(20), server_default="info", nullable=False),
            sa.Column("event_name", sa.String(100), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("response_payload", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_publishing_logs_post_id", "publishing_logs", ["post_id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "publishing_logs" in existing_tables:
        op.drop_table("publishing_logs")
    if "post_platform_targets" in existing_tables:
        op.drop_table("post_platform_targets")
