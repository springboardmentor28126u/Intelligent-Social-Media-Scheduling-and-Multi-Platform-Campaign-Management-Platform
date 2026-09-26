"""add post social accounts

Revision ID: 89781f805073
Revises: fa9381152c36
Create Date: 2026-09-06 19:18:15.806735
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "89781f805073"
down_revision: Union[str, Sequence[str], None] = "fa9381152c36"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Rename the existing table without deleting its data
    op.rename_table("social_account", "social_accounts")

    # Rename the indexes
    op.execute(
        "ALTER INDEX ix_social_account_id RENAME TO ix_social_accounts_id"
    )

    op.execute(
        "ALTER INDEX ix_social_account_user_id RENAME TO ix_social_accounts_user_id"
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Rename indexes back
    op.execute(
        "ALTER INDEX ix_social_accounts_id RENAME TO ix_social_account_id"
    )

    op.execute(
        "ALTER INDEX ix_social_accounts_user_id RENAME TO ix_social_account_user_id"
    )

    # Rename the table back
    op.rename_table("social_accounts", "social_account")