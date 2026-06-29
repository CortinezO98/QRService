"""Migración 004 — Agregar tipo y payload a QR codes

Revision ID: 004_qr_types
Revises: 003_new_plans
Create Date: 2025-01-04

Agrega:
  - qr_type: tipo de QR (url, wifi, whatsapp, vcard, etc.)
  - payload: datos estructurados del QR (JSONB)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004_qr_types"
down_revision = "003_new_plans"
branch_labels = None
depends_on = None


# Todos los tipos soportados
QR_TYPES = [
    "url", "text", "email", "phone", "whatsapp",
    "wifi", "sms", "vcard", "maps", "pdf",
    "youtube", "spotify", "facebook", "instagram",
    "twitter", "tiktok", "linkedin", "telegram",
    "calendar", "paypal", "crypto", "reddit",
    "amazon", "wechat", "snapchat", "venmo",
    "barcode2d", "upi", "office365", "googledoc",
    "googleforms", "googlesheets", "googlereview",
    "logo", "shaped", "booking", "etsy", "png",
    "pptx", "excel", "archivo", "linktree", "line",
    "kakaotalk", "pcr", "video",
]


def upgrade() -> None:
    # Crear enum de tipos
    qr_type_enum = postgresql.ENUM(*QR_TYPES, name="qrtype")
    qr_type_enum.create(op.get_bind())

    # Agregar columna qr_type con default "url" para no romper datos existentes
    op.add_column("qr_codes", sa.Column(
        "qr_type",
        sa.Enum(*QR_TYPES, name="qrtype"),
        nullable=False,
        server_default="url",
    ))

    # Agregar columna payload JSONB para datos estructurados del QR
    op.add_column("qr_codes", sa.Column(
        "payload",
        postgresql.JSONB(),
        nullable=True,
        comment="Datos estructurados según el tipo de QR"
    ))

    # Índice para buscar por tipo
    op.create_index("ix_qr_codes_type", "qr_codes", ["user_id", "qr_type"])


def downgrade() -> None:
    op.drop_index("ix_qr_codes_type", "qr_codes")
    op.drop_column("qr_codes", "payload")
    op.drop_column("qr_codes", "qr_type")
    op.execute("DROP TYPE IF EXISTS qrtype")