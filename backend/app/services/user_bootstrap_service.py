"""Per-user bootstrap: ensures each user's first-use setup runs exactly once.

On the first authenticated request from a new user, this service:
1. Creates a ``profiles`` row for the user (upsert — safe to call multiple times).
2. Inserts a ``user_playbook_seed_audit`` record so the global playbooks are
   "introduced" to the user's session context.

The primary-key uniqueness constraint on ``user_playbook_seed_audit.user_id``
is the idempotency guarantee: concurrent first-requests will race but only
one INSERT wins; the loser receives a constraint violation that is silently
ignored via ON CONFLICT DO NOTHING.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.models.user_playbook_seed_audit import UserPlaybookSeedAudit


def ensure_user_bootstrapped(db: Session, user_id: uuid.UUID) -> None:
    """Idempotently bootstrap a user's first-use records.

    Safe to call on every authenticated request — the audit guard ensures
    the heavy work (profile creation + seed audit) is only written once.
    Fast-path: if the audit row already exists, returns immediately.
    """
    # Fast path: check audit table before any writes
    already_seeded = (
        db.query(UserPlaybookSeedAudit)
        .filter(UserPlaybookSeedAudit.user_id == user_id)
        .first()
    )
    if already_seeded:
        return

    _upsert_profile(db, user_id)
    _insert_seed_audit(db, user_id)


def _upsert_profile(db: Session, user_id: uuid.UUID) -> None:
    """Create a profile row if it does not already exist (ON CONFLICT DO NOTHING)."""
    db.execute(
        text(
            "INSERT INTO profiles (user_id, created_at, updated_at) "
            "VALUES (:user_id, :now, :now) "
            "ON CONFLICT (user_id) DO NOTHING"
        ),
        {"user_id": str(user_id), "now": datetime.now(timezone.utc)},
    )


def _insert_seed_audit(db: Session, user_id: uuid.UUID) -> None:
    """Insert the seed audit row; silently ignore duplicate constraint violations."""
    try:
        audit = UserPlaybookSeedAudit(
            user_id=user_id,
            seeded_at=datetime.now(timezone.utc),
        )
        db.add(audit)
        db.commit()
    except IntegrityError:
        # Another concurrent request won the race — that's fine.
        db.rollback()
