"""Add is_admin field to users

Revision ID: 007_admin
Revises: 006_campaigns
Create Date: 2026-06-29

Sprint 5: Panel de administración
"""
from alembic import op
import sqlalchemy as sa

revision = "007_admin"
down_revision = "006_campaigns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_users_is_admin", "users", ["is_admin"])


def downgrade() -> None:
    op.drop_index("ix_users_is_admin", table_name="users")
    op.drop_column("users", "is_admin")
