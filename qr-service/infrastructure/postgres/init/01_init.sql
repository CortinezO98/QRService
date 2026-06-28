-- ============================================================
-- PostgreSQL Initialization Script
-- SWEBOK v4: Software Configuration Management — DB bootstrap
-- OWASP: Least-privilege DB user
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto (for potential future server-side hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Read-only role for analytics/reporting ─────────────────
-- OWASP: Least privilege — analytics tools get read-only access
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'qr_readonly') THEN
        CREATE ROLE qr_readonly;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE qr_service_db TO qr_readonly;
GRANT USAGE ON SCHEMA public TO qr_readonly;
-- (Tables granted after migrations run via Alembic)

-- ── Performance settings ───────────────────────────────────
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
