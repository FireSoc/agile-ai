from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import OnboardingStage, TaskStatus


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


class TaskCompleteResponse(BaseModel):
    task: TaskRead
    stage_advanced: bool
    new_stage: OnboardingStage | None
    project_completed: bool
    message: str
