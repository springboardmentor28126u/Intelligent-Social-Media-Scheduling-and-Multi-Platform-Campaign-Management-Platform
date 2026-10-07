"""Private campaign ownership, assignments and notification scope.

Revision ID: a21c4e810011
Revises: a21c4e810010
"""
from alembic import op
import sqlalchemy as sa

revision = 'a21c4e810011'
down_revision = 'a21c4e810010'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('campaigns', sa.Column('creator_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('campaigns', sa.Column('shared_with_team', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table('campaign_assignments',
        sa.Column('campaign_id', sa.Integer(), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), primary_key=True))
    op.add_column('notifications', sa.Column('campaign_id', sa.Integer(), nullable=True))
    op.execute('''UPDATE campaigns SET creator_id = COALESCE(
        (SELECT owner_id FROM workspaces WHERE storage_user_id = campaigns.user_id), user_id)''')
    # Historical team accounts have no connector actor. Preserve current creator
    # access explicitly, without exposing old campaigns to managers/business users.
    op.execute('''INSERT INTO campaign_assignments (campaign_id, user_id)
        SELECT c.id, m.user_id FROM campaigns c
        JOIN workspaces w ON w.storage_user_id = c.user_id
        JOIN memberships m ON m.workspace_id = w.id
        WHERE m.status = 'active' AND m.role = 'content_creator' ''')
    op.execute('''UPDATE notifications SET campaign_id = posts.campaign_id
        FROM posts WHERE notifications.post_id = posts.id''')
    op.execute('''UPDATE notifications SET campaign_id = campaigns.id FROM campaigns
        WHERE notifications.category = 'campaign'
        AND notifications.event_key LIKE 'campaign:' || campaigns.id::text || ':%' ''')


def downgrade():
    op.drop_column('notifications', 'campaign_id')
    op.drop_table('campaign_assignments')
    op.drop_column('campaigns', 'shared_with_team')
    op.drop_column('campaigns', 'creator_id')
