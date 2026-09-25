"""Flag sample data so it can be loaded for demos and removed cleanly."""
from alembic import op
import sqlalchemy as sa

revision = "a21c4e810006"
down_revision = "a21c4e810005"
branch_labels = None
depends_on = None

TABLES = ("social_accounts", "posts", "campaigns")


def upgrade():
    for table in TABLES:
        op.add_column(table, sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    for table in TABLES:
        op.drop_column(table, "is_demo")
