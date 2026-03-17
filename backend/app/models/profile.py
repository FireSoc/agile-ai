import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    """One-to-one extension of auth.users for app-level user metadata.

    ``user_id`` is the primary key and references ``auth.users(id)``
    (FK enforced in DB, not declared in ORM metadata to avoid cross-schema issues).
    """

    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
