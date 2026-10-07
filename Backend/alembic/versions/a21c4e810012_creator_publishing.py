"""Separate team management from role; remember publishing actor.

Revision ID: a21c4e810012
Revises: a21c4e810011
"""
from alembic import op
import sqlalchemy as sa

revision = 'a21c4e810012'
down_revision = 'a21c4e810011'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('memberships', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('publishing_jobs', sa.Column('publisher_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.execute("UPDATE memberships SET is_admin = true WHERE role = 'administrator'")
    op.execute('''UPDATE memberships SET is_admin = true FROM workspaces
        WHERE memberships.workspace_id = workspaces.id AND memberships.user_id = workspaces.owner_id''')
    # Only personal job actors can be reconstructed reliably. Unknown team actors
    # remain null and fail closed in the worker until a creator explicitly retries.
    op.execute('''UPDATE publishing_jobs SET publisher_id = user_id
        WHERE user_id IN (SELECT id FROM users WHERE is_workspace = false)''')


def downgrade():
    op.drop_column('publishing_jobs', 'publisher_id')
    op.drop_column('memberships', 'is_admin')
