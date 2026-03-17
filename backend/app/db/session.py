from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    # Connection pool settings tuned for a typical Supabase connection pooler
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Import all models so SQLAlchemy metadata is populated.

    Table creation is intentionally NOT performed here — Alembic migrations are
    the sole source of truth for schema.  This function exists only to ensure
    model imports happen at startup (required for relationship resolution).
    """
    import app.models  # noqa: F401  registers all models with Base.metadata
