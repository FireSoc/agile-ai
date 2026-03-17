"""Global playbook catalog seeding and per-user bootstrap helpers."""

from sqlalchemy.orm import Session

from app.data.playbook_seed_data import PLAYBOOKS
from app.models.onboarding_playbook import OnboardingPlaybook
from app.schemas.playbook import PlaybookCreate


def ensure_playbooks_seeded(db: Session) -> None:
    """Seed the global system playbook catalog on startup.

    Idempotent: skips any playbook whose name already exists.  Safe to call on
    every server startup.  All seeded playbooks are marked ``is_system_template=True``
    and have no ``owner_user_id`` (they belong to the system, not any user).
    """
    for payload in PLAYBOOKS:
        existing = (
            db.query(OnboardingPlaybook)
            .filter(
                OnboardingPlaybook.name == payload.name,
                OnboardingPlaybook.is_system_template.is_(True),
            )
            .first()
        )
        if existing:
            continue
        create_playbook_from_payload(db, payload)


def create_playbook_from_payload(
    db: Session, payload: PlaybookCreate
) -> OnboardingPlaybook:
    """Create and persist an OnboardingPlaybook from a validated PlaybookCreate payload.

    Used by the seed service; playbooks are not created via the public API.
    """
    playbook = OnboardingPlaybook(
        is_system_template=True,
        owner_user_id=None,
        name=payload.name,
        segment=payload.segment,
        supported_products=payload.supported_products,
        default_stages=payload.default_stages,
        default_tasks=[t.model_dump() for t in payload.default_tasks],
        branching_rules=payload.branching_rules,
        duration_rules=payload.duration_rules,
    )
    db.add(playbook)
    db.commit()
    db.refresh(playbook)
    return playbook
