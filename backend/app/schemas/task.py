from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OnboardingStage, TaskStatus


class TaskCreate(BaseModel):
    project_id: int
    stage: OnboardingStage
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    assigned_to: str | None = Field(default=None, max_length=255)
    due_date: datetime | None = None
    required_for_stage_completion: bool = True
    is_customer_required: bool = False
    requires_setup_data: bool = False


class TaskCreateResponse(BaseModel):
    task: "TaskRead"
    message: str


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    stage: OnboardingStage
    title: str
    description: str | None
    assigned_to: str | None
    status: TaskStatus
    due_date: datetime | None
    required_for_stage_completion: bool
    is_customer_required: bool
    requires_setup_data: bool
    created_at: datetime
    updated_at: datetime


class TaskCalendarItem(BaseModel):
    """Task with project and customer info for calendar view."""

    id: int
    title: str
    status: TaskStatus
    due_date: datetime | None
    required_for_stage_completion: bool
    project_id: int
    customer_id: int
    company_name: str


class TaskCompleteResponse(BaseModel):
    task: TaskRead
    stage_advanced: bool
    new_stage: OnboardingStage | None
    project_completed: bool
    message: str


# Resolve forward reference
TaskCreateResponse.model_rebuild()
