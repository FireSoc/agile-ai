"""FastAPI dependency helpers: DB session + auth-scoped DB session."""

import uuid
from collections.abc import Generator

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_auth_db(
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> Generator[Session, None, None]:
    """Yield a DB session with the caller's JWT claims set as Postgres session variables.

    This enables RLS policies that use ``auth.uid()`` to return the correct UUID,
    providing defense-in-depth security at the database layer alongside the
    application-layer owner_user_id filters.

    The role is temporarily set to ``authenticated`` within the transaction so that
    Supabase RLS policies apply. The role and claim are both LOCAL to the transaction
    and reset automatically on commit/rollback.
    """
    try:
        db.execute(
            text("SET LOCAL request.jwt.claim.sub = :sub"),
            {"sub": str(current_user)},
        )
        db.execute(text("SET LOCAL ROLE authenticated"))
        yield db
    finally:
        # Ensure role is always reset even if the request is abandoned mid-flight.
        # This is a no-op if the connection is returned to the pool immediately.
        try:
            db.execute(text("RESET ROLE"))
        except Exception:
            pass
