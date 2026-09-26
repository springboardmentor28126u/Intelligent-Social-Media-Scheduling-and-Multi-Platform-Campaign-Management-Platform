"""add campaigns and analytics

Revision ID: c31a0001
Revises: b5e8e237d9fe
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "c31a0001"
down_revision = "b5e8e237d9fe"
branch_labels = None
depends_on = None


def upgrade():

    op.create_table(
        "campaigns",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "name",
            sa.String(150),
            nullable=False
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True
        ),

        sa.Column(
            "platform",
            sa.String(100),
            nullable=False
        ),

        sa.Column(
            "status",
            sa.String(30),
            nullable=False
        ),

        sa.Column(
            "start_date",
            sa.DateTime(),
            nullable=True
        ),

        sa.Column(
            "end_date",
            sa.DateTime(),
            nullable=True
        ),

        sa.Column(
            "budget",
            sa.Float(),
            nullable=True
        ),

        sa.Column(
            "spent",
            sa.Float(),
            nullable=True
        ),

        sa.Column(
            "currency",
            sa.String(10),
            nullable=True
        ),

        sa.Column(
            "objectives",
            sa.String(255),
            nullable=True
        ),

        sa.Column(
            "target_audience",
            sa.String(255),
            nullable=True
        ),

        sa.Column(
            "target_reach",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "target_engagement",
            sa.Float(),
            nullable=True
        ),

        sa.Column(
            "target_clicks",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "actual_reach",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "actual_engagement",
            sa.Float(),
            nullable=True
        ),

        sa.Column(
            "actual_clicks",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "roi",
            sa.Float(),
            nullable=True
        ),

        sa.Column(
            "color",
            sa.String(30),
            nullable=True
        ),

        sa.Column(
            "tags",
            sa.String(255),
            nullable=True
        ),

        sa.Column(
            "metadata_json",
            postgresql.JSON(),
            nullable=True
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE"
        )
    )

    op.create_index(
        "ix_campaigns_user_id",
        "campaigns",
        ["user_id"],
        unique=False
    )

    op.add_column(
        "posts",
        sa.Column(
            "campaign_id",
            sa.Integer(),
            nullable=True
        )
    )

    op.create_index(
        "ix_posts_campaign_id",
        "posts",
        ["campaign_id"],
        unique=False
    )

    op.create_foreign_key(
        "fk_posts_campaign_id",
        "posts",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL"
    )

    op.create_table(
        "campaign_performance_history",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False
        ),

        sa.Column(
            "campaign_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "recorded_at",
            sa.DateTime(),
            nullable=False
        ),

        sa.Column(
            "reach",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "engagement",
            sa.Float(),
            nullable=True
        ),

        sa.Column(
            "clicks",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "roi",
            sa.Float(),
            nullable=True
        ),

        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["campaigns.id"],
            ondelete="CASCADE"
        )
    )

    op.create_index(
        "ix_campaign_performance_history_campaign_id",
        "campaign_performance_history",
        ["campaign_id"],
        unique=False
    )

    op.create_index(
        "ix_campaign_performance_history_recorded_at",
        "campaign_performance_history",
        ["recorded_at"],
        unique=False
    )


def downgrade():

    op.drop_index(
        "ix_campaign_performance_history_recorded_at",
        table_name="campaign_performance_history"
    )

    op.drop_index(
        "ix_campaign_performance_history_campaign_id",
        table_name="campaign_performance_history"
    )

    op.drop_table(
        "campaign_performance_history"
    )

    op.drop_constraint(
        "fk_posts_campaign_id",
        "posts",
        type_="foreignkey"
    )

    op.drop_index(
        "ix_posts_campaign_id",
        table_name="posts"
    )

    op.drop_column(
        "posts",
        "campaign_id"
    )

    op.drop_index(
        "ix_campaigns_user_id",
        table_name="campaigns"
    )

    op.drop_table(
        "campaigns"
    )
