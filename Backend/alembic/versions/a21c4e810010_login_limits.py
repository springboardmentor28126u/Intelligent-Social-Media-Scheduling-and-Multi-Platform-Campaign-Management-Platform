"""Shared login rate-limit buckets."""
from alembic import op
import sqlalchemy as sa
revision = 'a21c4e810010'
down_revision = 'a21c4e810009'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('login_buckets', sa.Column('key', sa.String(64), primary_key=True),
                    sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('attempts', sa.Integer(), nullable=False))


def downgrade():
    op.drop_table('login_buckets')
