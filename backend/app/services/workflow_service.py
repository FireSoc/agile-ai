"""Workflow orchestration: template selection, task generation, stage progression."""

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.enums import (
    CustomerType,
    EventType,
    OnboardingStage,
    ProjectStatus,
    STAGE_ORDER,
    TaskStatus,
)
from app.models.onboarding_project import OnboardingProject
from app.models.task import Task
from app.models.workflow_template import WorkflowTemplate
from app.services.event_service import log_event


def _get_template(
    db: Session, customer_type: CustomerType, stage: OnboardingStage
) -> WorkflowTemplate | None:
    return (
        db.query(WorkflowTemplate)
        .filter(
            WorkflowTemplate.customer_type == customer_type,
            WorkflowTemplate.stage_name == stage,
        )
        .first()
    )


def _generate_tasks_for_stage(
    db: Session,
    project: OnboardingProject,
    customer_type: CustomerType,
    stage: OnboardingStage,
) -> list[Task]:
    """Create Task rows from a WorkflowTemplate for the given stage."""
    template = _get_template(db, customer_type, stage)
    if not template:
        return []

    task_defs: list[dict] = json.loads(template.template_json)
    now = datetime.now(timezone.utc)
    created_tasks: list[Task] = []

    for td in task_defs:
        due_offset = td.get("due_offset_days", 7)
        task = Task(
            project_id=project.id,
            stage=stage,
            title=td["title"],
            description=td.get("description"),
            assigned_to=td.get("assigned_to"),
            status=TaskStatus.NOT_STARTED,
            due_date=now + timedelta(days=due_offset),
            required_for_stage_completion=td.get("required_for_stage_completion", True),
            is_customer_required=td.get("is_customer_required", False),
            requires_setup_data=td.get("requires_setup_data", False),
        )
        db.add(task)
        created_tasks.append(task)

    return created_tasks


def create_project(
    db: Session, customer: Customer, name: str | None = None, notes: str | None = None
) -> OnboardingProject:
    """
    Create a new OnboardingProject for the given customer:
    1. Initialise project at kickoff stage.
    2. Generate kickoff tasks from the matching workflow template.
    3. Log project_created and tasks_generated events.
    """
    project = OnboardingProject(
        customer_id=customer.id,
        name=name,
        current_stage=OnboardingStage.KICKOFF,
        status=ProjectStatus.ACTIVE,
        risk_flag=False,
        notes=notes,
    )
    db.add(project)
    db.flush()  # assign project.id before creating tasks/events

    tasks = _generate_tasks_for_stage(
        db, project, customer.customer_type, OnboardingStage.KICKOFF
    )

    log_event(
        db,
        project_id=project.id,
        event_type=EventType.PROJECT_CREATED,
        message=(
            f"Onboarding project created for {customer.company_name} "
            f"({customer.customer_type.value.upper()})."
        ),
    )

    if tasks:
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.TASKS_GENERATED,
            message=(
                f"{len(tasks)} task(s) generated for stage "
                f"'{OnboardingStage.KICKOFF.value}'."
            ),
        )

    db.commit()
    db.refresh(project)
    return project


def _next_stage(current: OnboardingStage) -> OnboardingStage | None:
    try:
        idx = STAGE_ORDER.index(current)
        return STAGE_ORDER[idx + 1] if idx + 1 < len(STAGE_ORDER) else None
    except ValueError:
        return None


def check_stage_gate(
    db: Session, project: OnboardingProject, customer_type: CustomerType
) -> tuple[bool, str]:
    """
    Evaluate whether the current stage's required tasks are all complete.

    Returns (can_advance, reason_if_blocked).
    Customer-required tasks and tasks needing setup data are treated as hard
    blockers: if any are not completed, advancement is prevented.
    """
    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]

    required = [t for t in stage_tasks if t.required_for_stage_completion]

    for task in required:
        if task.is_customer_required and task.status != TaskStatus.COMPLETED:
            return (
                False,
                f"Customer-required task '{task.title}' is not yet complete. "
                "Stage is blocked until the customer fulfils this requirement.",
            )
        if task.requires_setup_data and task.status != TaskStatus.COMPLETED:
            return (
                False,
                f"Task '{task.title}' requires setup data that has not been submitted.",
            )
        if task.status not in (TaskStatus.COMPLETED,):
            return (
                False,
                f"Required task '{task.title}' is not yet completed (status: {task.status.value}).",
            )

    return True, ""


def advance_stage(
    db: Session, project: OnboardingProject, customer_type: CustomerType
) -> tuple[bool, OnboardingStage | None, bool]:
    """
    Attempt to advance the project to the next stage.

    Returns (advanced, new_stage, project_completed).
    If the gate check fails, the project status is set to blocked.
    """
    can_advance, reason = check_stage_gate(db, project, customer_type)

    if not can_advance:
        if project.status not in (ProjectStatus.AT_RISK, ProjectStatus.BLOCKED):
            project.status = ProjectStatus.BLOCKED
            db.flush()
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.STAGE_BLOCKED,
            message=f"Stage '{project.current_stage.value}' blocked: {reason}",
        )
        db.commit()
        return False, None, False

    next_stage = _next_stage(project.current_stage)

    if next_stage is None:
        # All stages complete
        project.status = ProjectStatus.COMPLETED
        db.flush()
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.PROJECT_COMPLETED,
            message="All stages completed. Project marked as completed.",
        )
        db.commit()
        return True, None, True

    project.current_stage = next_stage
    project.status = ProjectStatus.ACTIVE
    project.risk_flag = False
    db.flush()

    tasks = _generate_tasks_for_stage(db, project, customer_type, next_stage)

    log_event(
        db,
        project_id=project.id,
        event_type=EventType.PROJECT_ADVANCED,
        message=f"Project advanced to stage '{next_stage.value}'.",
    )
    if tasks:
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.TASKS_GENERATED,
            message=f"{len(tasks)} task(s) generated for stage '{next_stage.value}'.",
        )

    db.commit()
    db.refresh(project)
    return True, next_stage, False
