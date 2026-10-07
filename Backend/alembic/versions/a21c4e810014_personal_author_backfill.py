"""Recover missing personal post authorship from the owning real account.

Revision ID: a21c4e810014
Revises: a21c4e810013
"""
from alembic import op

revision = 'a21c4e810014'
down_revision = 'a21c4e810013'
branch_labels = None
depends_on = None


def upgrade():
    # Preserve recorded revision roles: a later promotion must not overwrite
    # known manager authorship. Unknown roles stay NULL, matching normalize_role.
    op.execute("""UPDATE posts SET
        creator_id = COALESCE(posts.creator_id, users.id),
        creator_role = COALESCE(posts.creator_role, CASE users.role
            WHEN 'user' THEN 'content_creator'
            WHEN 'admin' THEN 'administrator'
            WHEN 'content_creator' THEN 'content_creator'
            WHEN 'marketing_manager' THEN 'marketing_manager'
            WHEN 'business_user' THEN 'business_user'
            WHEN 'administrator' THEN 'administrator'
            ELSE NULL END)
        FROM users
        WHERE posts.user_id = users.id AND users.is_workspace = false
          AND (posts.creator_id IS NULL OR posts.creator_role IS NULL)""")


def downgrade():
    # This is a data repair, with no schema change. Erasing it would also erase
    # valid authorship and reintroduce publishing failures. Retain all values.
    pass
