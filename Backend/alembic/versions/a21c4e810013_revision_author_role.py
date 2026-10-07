"""Record the role that authored each content revision.

Revision ID: a21c4e810013
Revises: a21c4e810012
"""
from alembic import op
import sqlalchemy as sa

revision = 'a21c4e810013'
down_revision = 'a21c4e810012'
branch_labels = None
depends_on = None


def upgrade():
    # Do not infer historical team authorship from today's role: a manager may
    # have been promoted since writing the draft. Existing rows are preserved.
    op.add_column('posts', sa.Column('creator_role', sa.String(30), nullable=True))


def downgrade():
    op.drop_column('posts', 'creator_role')
