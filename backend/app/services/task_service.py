"""Task-level operations: mark complete, trigger stage gate."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.enums import EventType, ProjectStatus, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.models.task import Task
from app.services.event_service import log_event
from app.services.workflow_service import advance_stage


def complete_task(
    db: Session,
    task: Task,
    project: OnboardingProject,
) -> tuple[Task, bool, object | None, bool]:
    """
    Mark a task as completed and trigger stage progression if possible.

    Returns (task, stage_advanced, new_stage, project_completed).
    """
    task.status = TaskStatus.COMPLETED
    task.updated_at = datetime.now(timezone.utc)
    db.flush()

    log_event(
        db,
        project_id=project.id,
        task_id=task.id,
        event_type=EventType.TASK_COMPLETED,
        message=f"Task '{task.title}' marked as completed.",
    )
    db.commit()

    # Reload project to pick up latest task states after commit.
    db.refresh(project)

    # Only attempt stage advancement when there is a pending template for the
    # next stage (i.e., project is not already completed/blocked beyond repair).
    from app.models.enums import ProjectStatus  # avoid circular at module level

    if project.status == ProjectStatus.COMPLETED:
        return task, False, None, True

    customer = project.customer
    advanced, new_stage, completed = advance_stage(db, project, customer.customer_type)

    return task, advanced, new_stage, completed
