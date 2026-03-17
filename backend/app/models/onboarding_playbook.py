import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, JSON, String, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CustomerType


class OnboardingPlaybook(Base):
    """Reusable onboarding blueprint.

    ``is_system_template=True`` marks server-seeded global playbooks.
    ``owner_user_id`` is null for system templates and populated for
    user-created custom playbooks (future capability).
    """

    __tablename__ = "onboarding_playbooks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    is_system_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # null for system templates; FK to auth.users enforced in DB
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    segment: Mapped[CustomerType] = mapped_column(
        Enum(CustomerType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    supported_products: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    default_stages: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    default_tasks: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    branching_rules: Mapped[list | dict] = mapped_column(JSON, nullable=True)
    duration_rules: Mapped[dict | None] = mapped_column(JSON, nullable=True)
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

    projects: Mapped[list["OnboardingProject"]] = relationship(  # noqa: F821
        back_populates="playbook"
    )
