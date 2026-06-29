"""Migración 006 — Campañas / Carpetas para agrupar QR codes

Revision ID: 006_campaigns
Revises: 005_stripe_events
Create Date: 2025-01-06

Agrega:
  - Tabla campaigns (id, user_id, name, description, color, created_at, updated_at)
  - campaign_id FK nullable en qr_codes
  - Índice ix_campaigns_user_id
  - Índice ix_qr_codes_campaign_id
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006_campaigns"
down_revision = "005_stripe_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Tabla campaigns ────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS campaigns (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name        VARCHAR(255) NOT NULL,
            description TEXT,
            color       VARCHAR(7) DEFAULT '#6366f1',
            created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_campaigns_user_id ON campaigns (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_campaigns_created_at ON campaigns (created_at)")

    # ── 2. campaign_id en qr_codes ────────────────────────────
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='qr_codes' AND column_name='campaign_id'
            ) THEN
                ALTER TABLE qr_codes
                    ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
            END IF;
        END$$
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_qr_codes_campaign_id ON qr_codes (campaign_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_qr_codes_campaign_id")
    op.execute("ALTER TABLE qr_codes DROP COLUMN IF EXISTS campaign_id")
    op.execute("DROP INDEX IF EXISTS ix_campaigns_created_at")
    op.execute("DROP INDEX IF EXISTS ix_campaigns_user_id")
    op.execute("DROP TABLE IF EXISTS campaigns")
