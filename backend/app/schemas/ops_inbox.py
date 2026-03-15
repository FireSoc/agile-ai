"""Response schemas for GET /ops/inbox."""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field

from app.models.enums import OnboardingStage, ProjectStatus
from app.schemas.customer import CustomerRead
from app.schemas.recommendation import RecommendationRead
from app.schemas.task import TaskRead


class OpsInboxItemType(str, Enum):
    BLOCKED_TASK = "blocked_task"
    OVERDUE_TASK = "overdue_task"
    RECOMMENDATION = "recommendation"
    PROJECT_ALERT = "project_alert"


class OpsInboxProjectSummary(BaseModel):
    """Minimal project context for an inbox item."""

    id: int
    name: str | None
    current_stage: OnboardingStage
    status: ProjectStatus
    risk_flag: bool
    risk_score: int | None


class OpsInboxItemRead(BaseModel):
    item_type: OpsInboxItemType
    priority_score: int = Field(..., ge=0, le=100)
    project: OpsInboxProjectSummary
    customer: CustomerRead | None = None
    task: TaskRead | None = None
    recommendation: RecommendationRead | None = None
    created_at: datetime


class OpsInboxTotals(BaseModel):
    blocked: int = 0
    overdue: int = 0
    recommendations: int = 0
    at_risk_project_alerts: int = 0
    at_risk_projects: int = 0
    needs_attention_now: int = 0


class OpsInboxResponse(BaseModel):
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    totals: OpsInboxTotals
    items: list[OpsInboxItemRead] = Field(default_factory=list)
