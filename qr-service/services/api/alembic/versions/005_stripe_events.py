"""Migración 005 — Tabla stripe_events para idempotencia de webhooks

Revision ID: 005_stripe_events
Revises: 004_qr_types
Create Date: 2025-01-05

Agrega:
  - Tabla stripe_events con event_id único
  - Columnas device_type, os_family, browser_family en qr_scans
  - Elimina el valor 'annual' del enum subscriptionplan (si existe)
"""
from alembic import op
import sqlalchemy as sa

revision = "005_stripe_events"
down_revision = "004_qr_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Tabla stripe_events (IF NOT EXISTS — idempotente) ──
    op.execute("""
        CREATE TABLE IF NOT EXISTS stripe_events (
            id          SERIAL PRIMARY KEY,
            event_id    VARCHAR(255) NOT NULL,
            event_type  VARCHAR(128) NOT NULL,
            processed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            status      VARCHAR(32) NOT NULL DEFAULT 'processed',
            error       TEXT
        )
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_stripe_events_event_id'
            ) THEN
                ALTER TABLE stripe_events
                    ADD CONSTRAINT uq_stripe_events_event_id UNIQUE (event_id);
            END IF;
        END$$
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_stripe_events_event_id
        ON stripe_events (event_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_stripe_events_processed_at
        ON stripe_events (processed_at)
    """)

    # ── 2. Columnas de analytics en qr_scans (IF NOT EXISTS) ─
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='qr_scans' AND column_name='device_type'
            ) THEN
                ALTER TABLE qr_scans ADD COLUMN device_type VARCHAR(32);
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='qr_scans' AND column_name='os_family'
            ) THEN
                ALTER TABLE qr_scans ADD COLUMN os_family VARCHAR(64);
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='qr_scans' AND column_name='browser_family'
            ) THEN
                ALTER TABLE qr_scans ADD COLUMN browser_family VARCHAR(64);
            END IF;
        END$$
    """)

    # ── 3. Agregar valores al enum subscriptionplan si faltan ─
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'starter'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'pro'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'business'")
    op.execute(
        "UPDATE subscriptions SET plan = 'business' WHERE plan = 'annual'"
    )


def downgrade() -> None:
    # Revertir columnas de analytics
    op.drop_column("qr_scans", "browser_family")
    op.drop_column("qr_scans", "os_family")
    op.drop_column("qr_scans", "device_type")

    # Revertir tabla stripe_events
    op.drop_index("ix_stripe_events_processed_at", "stripe_events")
    op.drop_index("ix_stripe_events_event_id", "stripe_events")
    op.drop_table("stripe_events")
    # Nota: no se puede hacer DROP VALUE en PostgreSQL — el downgrade
    # no elimina los nuevos valores del enum.