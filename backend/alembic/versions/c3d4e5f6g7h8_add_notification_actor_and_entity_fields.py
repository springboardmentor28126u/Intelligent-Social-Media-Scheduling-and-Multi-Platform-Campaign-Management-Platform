"""add notification actor and entity fields

Revision ID: c3d4e5f6g7h8
Revises: a1b2c3d4e5f6
Create Date: 2026-09-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("notifications")]

    with op.batch_alter_table("notifications") as batch_op:
        if "actor_user_id" not in columns:
            batch_op.add_column(sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
            try:
                batch_op.create_index("ix_notifications_actor_user_id", ["actor_user_id"], unique=False)
            except Exception:
                pass
        if "related_entity_type" not in columns:
            batch_op.add_column(sa.Column("related_entity_type", sa.String(50), nullable=True))
        if "related_entity_id" not in columns:
            batch_op.add_column(sa.Column("related_entity_id", sa.String(100), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("notifications")]

    with op.batch_alter_table("notifications") as batch_op:
        if "related_entity_id" in columns:
            batch_op.drop_column("related_entity_id")
        if "related_entity_type" in columns:
            batch_op.drop_column("related_entity_type")
        if "actor_user_id" in columns:
            try:
                batch_op.drop_index("ix_notifications_actor_user_id")
            except Exception:
                pass
            batch_op.drop_column("actor_user_id")

