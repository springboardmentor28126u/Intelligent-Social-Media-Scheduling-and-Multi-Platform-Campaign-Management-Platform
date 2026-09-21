from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b5e8e237d9fe"
down_revision = "4c9d39ab0f0d"
branch_labels = None
depends_on = None


def upgrade():

    # Add role column
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=50),
            nullable=True
        )
    )

    # Copy existing system_role value into role
    op.execute(
        """
        UPDATE users
        SET role = system_role::text
        WHERE role IS NULL
        """
    )

    # Give remaining users a default role
    op.execute(
        """
        UPDATE users
        SET role = 'content_creator'
        WHERE role IS NULL
        """
    )

    # Make role required
    op.alter_column(
        "users",
        "role",
        existing_type=sa.String(length=50),
        nullable=False
    )

    # Add password reset token
    op.add_column(
        "users",
        sa.Column(
            "reset_token",
            sa.String(length=255),
            nullable=True
        )
    )

    # Add password reset expiry
    op.add_column(
        "users",
        sa.Column(
            "reset_token_expiry",
            sa.DateTime(),
            nullable=True
        )
    )


def downgrade():

    op.drop_column(
        "users",
        "reset_token_expiry"
    )

    op.drop_column(
        "users",
        "reset_token"
    )

    op.drop_column(
        "users",
        "role"
    )