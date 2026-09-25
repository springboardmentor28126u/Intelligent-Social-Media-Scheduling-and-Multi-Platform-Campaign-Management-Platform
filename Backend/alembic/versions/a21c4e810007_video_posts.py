"""Video URL on posts and publishing jobs (YouTube uploads)."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810007"
down_revision = "a21c4e810006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("posts", sa.Column("video_url", sa.Text(), nullable=True))
    op.add_column("publishing_jobs", sa.Column("video_url", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("publishing_jobs", "video_url")
    op.drop_column("posts", "video_url")
