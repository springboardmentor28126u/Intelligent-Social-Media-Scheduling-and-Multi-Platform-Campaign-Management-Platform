from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "4c9d39ab0f0d"
down_revision = "e1a042d5d956"
branch_labels = None
depends_on = None


def upgrade():
    # Add platforms first as nullable because existing posts may already exist.
    op.add_column(
        "posts",
        sa.Column(
            "platforms",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )

    # Add content_type as nullable first for existing rows.
    op.add_column(
        "posts",
        sa.Column(
            "content_type",
            sa.String(length=50),
            nullable=True,
        ),
    )

    # Give existing posts safe values.
    op.execute(
        """
        UPDATE posts
        SET platforms = '[]'::json
        WHERE platforms IS NULL
        """
    )

    op.execute(
        """
        UPDATE posts
        SET content_type = 'text'
        WHERE content_type IS NULL
        """
    )

    # Make both columns required.
    op.alter_column(
        "posts",
        "platforms",
        existing_type=postgresql.JSON(astext_type=sa.Text()),
        nullable=False,
    )

    op.alter_column(
        "posts",
        "content_type",
        existing_type=sa.String(length=50),
        nullable=False,
    )


def downgrade():
    op.drop_column("posts", "content_type")
    op.drop_column("posts", "platforms")