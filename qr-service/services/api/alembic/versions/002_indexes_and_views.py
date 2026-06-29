"""Add performance indexes and scan analytics view

Revision ID: 002_indexes_and_views
Revises: 001_initial
Create Date: 2025-01-02 00:00:00.000000

SWEBOK v4: Software Maintenance — Performance optimization
"""
from alembic import op
import sqlalchemy as sa

revision = "002_indexes_and_views"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Additional performance indexes ────────────────────────
    # Partial index: only active QR codes (most queries filter by is_active=true)
    op.execute("""
        CREATE INDEX ix_qr_codes_active_only
        ON qr_codes (user_id, created_at DESC)
        WHERE is_active = true;
    """)

    # Partial index: only active subscriptions
    op.execute("""
        CREATE INDEX ix_subscriptions_active_only
        ON subscriptions (user_id, expires_at DESC)
        WHERE status = 'active';
    """)

    # Partial index: non-revoked refresh tokens
    op.execute("""
        CREATE INDEX ix_refresh_tokens_valid
        ON refresh_tokens (token_hash, expires_at)
        WHERE revoked_at IS NULL;
    """)

    # ── Materialized view for analytics ───────────────────────
    # Pre-aggregate scan counts per QR per day (updated nightly by Celery)
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS qr_daily_scans AS
        SELECT
            qr_code_id,
            DATE(scanned_at) AS scan_date,
            COUNT(*) AS scan_count
        FROM qr_scans
        GROUP BY qr_code_id, DATE(scanned_at)
        WITH DATA;
    """)

    op.execute("""
        CREATE UNIQUE INDEX ix_qr_daily_scans_unique
        ON qr_daily_scans (qr_code_id, scan_date);
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS qr_daily_scans;")
    op.execute("DROP INDEX IF EXISTS ix_qr_codes_active_only;")
    op.execute("DROP INDEX IF EXISTS ix_subscriptions_active_only;")
    op.execute("DROP INDEX IF EXISTS ix_refresh_tokens_valid;")