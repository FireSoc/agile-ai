"""Aggregate ops inbox items from projects: blocked/overdue tasks, recommendations, at-risk alerts."""

from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.models.enums import ProjectStatus, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.schemas.ops_inbox import (
    OpsInboxItemRead,
    OpsInboxItemType,
    OpsInboxProjectSummary,
    OpsInboxResponse,
    OpsInboxTotals,
)
from app.schemas.customer import CustomerRead
from app.schemas.recommendation import RecommendationRead
from app.schemas.task import TaskRead

MAX_PROJECTS = 100


def _project_summary(project: OnboardingProject) -> OpsInboxProjectSummary:
    return OpsInboxProjectSummary(
        id=project.id,
        name=project.name,
        current_stage=project.current_stage,
        status=project.status,
        risk_flag=project.risk_flag,
        risk_score=project.risk_score,
    )


def _build_items(projects: list[OnboardingProject]) -> list[OpsInboxItemRead]:
    items: list[OpsInboxItemRead] = []
    for project in projects:
        customer = CustomerRead.model_validate(project.customer) if project.customer else None
        tasks = project.tasks or []
        recommendations = [r for r in (project.recommendations or []) if not r.dismissed]
        is_at_risk = project.status == ProjectStatus.AT_RISK or project.risk_flag

        overdue_tasks = [t for t in tasks if t.status == TaskStatus.OVERDUE]
        blocked_tasks = [t for t in tasks if t.blocker_flag]

        for task in overdue_tasks:
            also_blocked = task.blocker_flag
            if also_blocked and is_at_risk:
                priority = 100
            elif also_blocked:
                priority = 90
            elif task.is_customer_required and is_at_risk:
                priority = 85
            elif task.is_customer_required:
                priority = 82
            else:
                priority = 80
            created = task.updated_at or task.created_at
            items.append(
                OpsInboxItemRead(
                    item_type=OpsInboxItemType.OVERDUE_TASK,
                    priority_score=priority,
                    project=_project_summary(project),
                    customer=customer,
                    task=TaskRead.model_validate(task),
                    created_at=created,
                )
            )

        for task in blocked_tasks:
            if task.status == TaskStatus.OVERDUE:
                continue
            priority = 75 if is_at_risk else 70
            created = task.updated_at or task.created_at
            items.append(
                OpsInboxItemRead(
                    item_type=OpsInboxItemType.BLOCKED_TASK,
                    priority_score=priority,
                    project=_project_summary(project),
                    customer=customer,
                    task=TaskRead.model_validate(task),
                    created_at=created,
                )
            )

        for rec in recommendations:
            priority = 65 if is_at_risk else 60
            items.append(
                OpsInboxItemRead(
                    item_type=OpsInboxItemType.RECOMMENDATION,
                    priority_score=priority,
                    project=_project_summary(project),
                    customer=customer,
                    recommendation=RecommendationRead.model_validate(rec),
                    created_at=rec.created_at,
                )
            )

        if (
            is_at_risk
            and len(overdue_tasks) == 0
            and len(blocked_tasks) == 0
            and len(recommendations) == 0
        ):
            created = project.updated_at or project.created_at
            items.append(
                OpsInboxItemRead(
                    item_type=OpsInboxItemType.PROJECT_ALERT,
                    priority_score=50,
                    project=_project_summary(project),
                    customer=customer,
                    created_at=created,
                )
            )

    items.sort(key=lambda x: (-x.priority_score, x.created_at))
    return items


def get_ops_inbox(
    db: Session,
    *,
    item_type: OpsInboxItemType | None = None,
    stage: str | None = None,
    customer_id: int | None = None,
    limit: int = 200,
    offset: int = 0,
) -> OpsInboxResponse:
    """Return aggregated inbox items and totals. Filters applied after building full list."""
    projects_query = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.recommendations),
            selectinload(OnboardingProject.customer),
        )
        .filter(
            or_(
                OnboardingProject.status.in_([ProjectStatus.ACTIVE, ProjectStatus.AT_RISK]),
                OnboardingProject.risk_flag.is_(True),
            )
        )
        .limit(MAX_PROJECTS)
    )
    projects = projects_query.all()
    all_items = _build_items(projects)

    blocked = sum(1 for i in all_items if i.item_type == OpsInboxItemType.BLOCKED_TASK)
    overdue = sum(1 for i in all_items if i.item_type == OpsInboxItemType.OVERDUE_TASK)
    recs = sum(1 for i in all_items if i.item_type == OpsInboxItemType.RECOMMENDATION)
    at_risk_alerts = sum(1 for i in all_items if i.item_type == OpsInboxItemType.PROJECT_ALERT)
    at_risk_projects = len(
        {i.project.id for i in all_items if i.project.risk_flag or i.project.status == ProjectStatus.AT_RISK}
    )
    needs_attention = sum(1 for i in all_items if i.priority_score >= 85)
    totals = OpsInboxTotals(
        blocked=blocked,
        overdue=overdue,
        recommendations=recs,
        at_risk_project_alerts=at_risk_alerts,
        at_risk_projects=at_risk_projects,
        needs_attention_now=needs_attention,
    )

    filtered = all_items
    if item_type is not None:
        filtered = [i for i in filtered if i.item_type == item_type]
    if stage:
        filtered = [i for i in filtered if i.project.current_stage.value == stage]
    if customer_id is not None:
        filtered = [i for i in filtered if i.customer and i.customer.id == customer_id]

    paginated = filtered[offset : offset + limit]
    return OpsInboxResponse(
        generated_at=datetime.now(timezone.utc),
        totals=totals,
        items=paginated,
    )
