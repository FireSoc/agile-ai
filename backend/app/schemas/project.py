from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import OnboardingStage, ProjectStatus
from app.schemas.task import TaskRead
from app.schemas.workflow_event import WorkflowEventRead


class ProjectCreate(BaseModel):
    customer_id: int
    name: str | None = None
    notes: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    name: str | None
    current_stage: OnboardingStage
    status: ProjectStatus
    risk_flag: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectRead):
    tasks: list[TaskRead] = []
    events: list[WorkflowEventRead] = []


class OverdueCheckResponse(BaseModel):
    overdue_count: int
    reminder_events_created: int
    message: str


class RiskCheckResponse(BaseModel):
    risk_flag: bool
    was_already_flagged: bool
    reason: str | None
    message: str
