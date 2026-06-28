"""Migración 003 — Nuevo modelo de negocio 4 planes

Revision ID: 003_new_plans
Revises: 002_indexes_and_views
Create Date: 2025-01-03

Cambios:
  - subscriptions: nuevos valores en enum plan (starter, pro, business)
  - subscriptions: columnas qr_quota y qr_used
  - qr_codes: columna status (active, inactive, expired)
  - qr_codes: columna subscription_id
"""
from alembic import op
import sqlalchemy as sa

revision = "003_new_plans"
down_revision = "002_indexes_and_views"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Agregar nuevos valores al enum de plan ─────────────
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'starter'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'pro'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'business'")

    # ── 2. Crear enum QRStatus ────────────────────────────────
    op.execute("CREATE TYPE qrstatus AS ENUM ('active', 'inactive', 'expired')")

    # ── 3. Columnas nuevas en subscriptions ───────────────────
    op.add_column("subscriptions", sa.Column("qr_quota", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("subscriptions", sa.Column("qr_used",  sa.Integer(), nullable=False, server_default="0"))

    # ── 4. Columna status en qr_codes ─────────────────────────
    op.add_column("qr_codes", sa.Column(
        "status",
        sa.Enum("active", "inactive", "expired", name="qrstatus"),
        nullable=False,
        server_default="active",
    ))

    # ── 5. FK a subscription en qr_codes ─────────────────────
    # Primero añadir la columna como nullable para no romper datos existentes
    op.add_column("qr_codes", sa.Column(
        "subscription_id",
        sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=True,
    ))
    op.create_foreign_key(
        "fk_qr_codes_subscription_id",
        "qr_codes", "subscriptions",
        ["subscription_id"], ["id"],
    )

    # ── 6. Migrar is_active → status ──────────────────────────
    op.execute("""
        UPDATE qr_codes
        SET status = CASE WHEN is_active = true THEN 'active'::qrstatus ELSE 'inactive'::qrstatus END
    """)

    # ── 7. Índice parcial para QR activos ────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_qr_codes_status
        ON qr_codes (user_id, status)
        WHERE status = 'active'
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_qr_codes_status")
    op.drop_constraint("fk_qr_codes_subscription_id", "qr_codes", type_="foreignkey")
    op.drop_column("qr_codes", "subscription_id")
    op.drop_column("qr_codes", "status")
    op.drop_column("subscriptions", "qr_used")
    op.drop_column("subscriptions", "qr_quota")
    op.execute("DROP TYPE IF EXISTS qrstatus")
