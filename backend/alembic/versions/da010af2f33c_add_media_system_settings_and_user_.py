"""add media system_settings and user columns

Revision ID: da010af2f33c
Revises: f84567969f9f
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "da010af2f33c"
down_revision: Union[str, None] = "f84567969f9f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name):
    return sa.inspect(op.get_bind()).has_table(name)


def _has_column(table, column):
    cols = sa.inspect(op.get_bind()).get_columns(table)
    return column in [c["name"] for c in cols]


def upgrade() -> None:
    if not _has_table("system_settings"):
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(), primary_key=True, nullable=False),
            sa.Column("value", sa.JSON(), nullable=False),
            sa.Column("category", sa.String(), nullable=True),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True),
                      server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_system_settings_key", "system_settings", ["key"])

    if not _has_table("media"):
        op.create_table(
            "media",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("filename", sa.String(), nullable=False),
            sa.Column("original_filename", sa.String(), nullable=False),
            sa.Column("file_path", sa.String(), nullable=False),
            sa.Column("file_url", sa.String(), nullable=False),
            sa.Column("media_type", sa.String(), nullable=False),
            sa.Column("mime_type", sa.String(), nullable=True),
            sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True),
                      server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_media_id", "media", ["id"])

    if not _has_column("users", "created_at"):
        op.add_column("users", sa.Column("created_at", sa.DateTime(timezone=True),
                                         server_default=sa.func.now(), nullable=True))
    if not _has_column("users", "updated_at"):
        op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True),
                                         server_default=sa.func.now(), nullable=True))
    if not _has_column("users", "preferences"):
        op.add_column("users", sa.Column("preferences", sa.JSON(), nullable=True))
    if not _has_column("users", "is_active"):
        op.add_column("users", sa.Column("is_active", sa.Boolean(),
                                         nullable=True, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("users", "is_active")
    op.drop_column("users", "preferences")
    op.drop_column("users", "updated_at")
    op.drop_column("users", "created_at")
    op.drop_index("ix_media_id", table_name="media")
    op.drop_table("media")
    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.drop_table("system_settings")