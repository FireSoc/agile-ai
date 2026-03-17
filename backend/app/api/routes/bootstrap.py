"""User bootstrap endpoint — called once per user after sign-in.

The frontend calls ``POST /bootstrap`` immediately after a successful login to
ensure the user's ``profiles`` row and ``user_playbook_seed_audit`` record
exist.  The operation is idempotent: repeated calls are a no-op after the
first successful bootstrap.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_auth_db
from app.core.auth import get_current_user
from app.services.user_bootstrap_service import ensure_user_bootstrapped

router = APIRouter(prefix="/bootstrap", tags=["Bootstrap"])


@router.post("", status_code=status.HTTP_200_OK)
def bootstrap_user(
    db: Session = Depends(get_auth_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> dict:
    """Idempotently bootstrap the current user's profile and playbook seed audit."""
    ensure_user_bootstrapped(db, current_user)
    return {"bootstrapped": True, "user_id": str(current_user)}
