"""Overdue task detection and reminder event generation."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.enums import EventType, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.models.task import Task
from app.services.event_service import log_event


def check_overdue_tasks(
    db: Session, project: OnboardingProject
) -> tuple[int, int]:
    """
    Identify tasks that are past their due_date and not completed.
    Marks them as OVERDUE and creates a reminder WorkflowEvent for each.

    Returns (overdue_count, reminder_events_created).
    """
    now = datetime.now(timezone.utc)

    incomplete_statuses = {TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE}

    overdue_tasks: list[Task] = [
        t
        for t in project.tasks
        if t.due_date is not None
        and t.due_date < now
        and t.status in incomplete_statuses
    ]

    reminder_count = 0
    for task in overdue_tasks:
        if task.status != TaskStatus.OVERDUE:
            task.status = TaskStatus.OVERDUE

        log_event(
            db,
            project_id=project.id,
            task_id=task.id,
            event_type=EventType.REMINDER_TRIGGERED,
            message=(
                f"Reminder triggered for task '{task.title}' "
                f"(assigned to: {task.assigned_to or 'unassigned'}). "
                f"Due date was {task.due_date.strftime('%Y-%m-%d')}."
            ),
        )
        reminder_count += 1

    if overdue_tasks:
        db.commit()

    return len(overdue_tasks), reminder_count
