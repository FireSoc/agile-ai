from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import OnboardingStage, ProjectStatus


class OnboardingProject(Base):
    __tablename__ = "onboarding_projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    current_stage: Mapped[OnboardingStage] = mapped_column(
        Enum(OnboardingStage), nullable=False, default=OnboardingStage.KICKOFF
    )
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), nullable=False, default=ProjectStatus.ACTIVE
    )
    risk_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
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

    customer: Mapped["Customer"] = relationship(back_populates="projects")  # noqa: F821
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    events: Mapped[list["WorkflowEvent"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
