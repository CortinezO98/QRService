"""
Database Session Management — Async SQLAlchemy 2.0
SWEBOK v4: Software Construction + Data Management
OWASP: A03 Injection Prevention via ORM-only access
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models.models import Base

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for async DB sessions.
    Ensures session is closed after request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()