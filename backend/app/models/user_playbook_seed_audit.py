import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserPlaybookSeedAudit(Base):
    """Records that a user's initial playbook bootstrap has been completed.

    One row per user. The primary key ``user_id`` provides the uniqueness
    guarantee that prevents duplicate bootstraps even under concurrent requests.
    ``user_id`` references ``auth.users(id)`` (FK enforced in DB only).
    """

    __tablename__ = "user_playbook_seed_audit"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    seeded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
