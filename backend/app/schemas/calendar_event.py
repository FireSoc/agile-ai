from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OnboardingStage, TaskStatus

EntryType = Literal["task", "deadline", "project"]


class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    entry_type: EntryType
    start_date: date
    end_date: date | None = None
    duration_days: int | None = Field(default=None, ge=1)
    criticality: int | None = Field(default=None, ge=1, le=4)
    stage: OnboardingStage | None = None
    status: TaskStatus = TaskStatus.NOT_STARTED
    project_id: int | None = None


class CalendarEventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    entry_type: EntryType | None = None
    start_date: date | None = None
    end_date: date | None = None
    duration_days: int | None = Field(default=None, ge=1)
    criticality: int | None = Field(default=None, ge=1, le=4)
    stage: OnboardingStage | None = None
    status: TaskStatus | None = None
    project_id: int | None = None


class CalendarEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    entry_type: str
    start_date: date
    end_date: date | None
    duration_days: int | None
    criticality: int | None
    stage: OnboardingStage | None
    status: TaskStatus
    project_id: int | None
    created_at: datetime
    updated_at: datetime
