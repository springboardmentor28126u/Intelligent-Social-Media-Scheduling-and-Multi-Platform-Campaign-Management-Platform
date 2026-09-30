"""add publish_logs table
Revision ID: 19770b1ad829
Revises: 3f18fd27c86d
Create Date: 2026-09-05 12:44:35.878760
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '19770b1ad829'
down_revision: Union[str, Sequence[str], None] = '3f18fd27c86d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.create_table(
        'publish_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('event', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_publish_logs_id'), 'publish_logs', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_publish_logs_id'), table_name='publish_logs')
    op.drop_table('publish_logs')
