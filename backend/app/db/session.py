from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # required for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables on startup."""
    # Import models here so Base has all metadata registered before create_all.
    from app.db.base import Base  # noqa: F401
    import app.models  # noqa: F401  triggers __init__ side-effects

    Base.metadata.create_all(bind=engine)

    # One-time migration: add name column to onboarding_projects if missing (e.g. existing DBs)
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT 1 FROM pragma_table_info('onboarding_projects') WHERE name='name'")
        )
        if result.scalar() is None:
            conn.execute(text("ALTER TABLE onboarding_projects ADD COLUMN name VARCHAR(255)"))
            conn.commit()
