from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import CustomerType, OnboardingStage


class WorkflowTemplate(Base):
    """
    Stores a stage-level onboarding template for a customer type.

    template_json contains a list of task definitions:
    [
      {
        "title": "Kickoff Call",
        "description": "...",
        "assigned_to": "csm@company.com",
        "due_offset_days": 3,
        "required_for_stage_completion": true,
        "is_customer_required": false,
        "requires_setup_data": false
      },
      ...
    ]
    """

    __tablename__ = "workflow_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_type: Mapped[CustomerType] = mapped_column(
        Enum(CustomerType), nullable=False, index=True
    )
    stage_name: Mapped[OnboardingStage] = mapped_column(
        Enum(OnboardingStage), nullable=False
    )
    template_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
