"""Risk evaluation logic: flags projects as at-risk when thresholds are exceeded."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import EventType, ProjectStatus, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.services.event_service import log_event


def evaluate_risk(
    db: Session, project: OnboardingProject
) -> tuple[bool, str | None]:
    """
    Evaluate whether the project should be flagged as at-risk.

    Rules:
    1. Any required task has been overdue for more than RISK_OVERDUE_THRESHOLD_DAYS.
    2. The project has had no updates in more than RISK_STALLED_THRESHOLD_DAYS.
    3. Multiple (≥ RISK_REQUIRED_OVERDUE_COUNT) required tasks in the current
       stage are overdue regardless of duration.

    Returns (should_be_at_risk, reason).
    """
    now = datetime.now(timezone.utc)

    # Already completed projects are never at risk.
    if project.status == ProjectStatus.COMPLETED:
        return False, None

    overdue_threshold = timedelta(days=settings.risk_overdue_threshold_days)
    stalled_threshold = timedelta(days=settings.risk_stalled_threshold_days)

    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]
    required_tasks = [t for t in stage_tasks if t.required_for_stage_completion]

    # Rule 1: a required task overdue beyond the threshold.
    for task in required_tasks:
        if (
            task.status == TaskStatus.OVERDUE
            and task.due_date is not None
            and (now - task.due_date) > overdue_threshold
        ):
            return (
                True,
                f"Required task '{task.title}' has been overdue for more than "
                f"{settings.risk_overdue_threshold_days} day(s).",
            )

    # Rule 2: project stalled (no updates in threshold period).
    # updated_at is naive in SQLite; make it timezone-aware before comparing.
    project_updated = project.updated_at
    if project_updated.tzinfo is None:
        project_updated = project_updated.replace(tzinfo=timezone.utc)

    if (now - project_updated) > stalled_threshold:
        return (
            True,
            f"Project has had no activity for more than "
            f"{settings.risk_stalled_threshold_days} day(s).",
        )

    # Rule 3: multiple required tasks are overdue.
    overdue_required = [
        t
        for t in required_tasks
        if t.status == TaskStatus.OVERDUE
    ]
    if len(overdue_required) >= settings.risk_required_overdue_count:
        return (
            True,
            f"{len(overdue_required)} required task(s) in the current stage are overdue.",
        )

    return False, None


def apply_risk_check(
    db: Session, project: OnboardingProject
) -> tuple[bool, bool, str | None]:
    """
    Run risk evaluation and persist the result.

    Returns (risk_flag, was_already_flagged, reason).
    """
    should_flag, reason = evaluate_risk(db, project)
    was_already_flagged = project.risk_flag

    if should_flag and not was_already_flagged:
        project.risk_flag = True
        project.status = ProjectStatus.AT_RISK
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.RISK_FLAG_ADDED,
            message=f"Project flagged as at-risk. Reason: {reason}",
        )
        db.commit()
        db.refresh(project)
    elif not should_flag and was_already_flagged:
        # Clear the flag if conditions have resolved.
        project.risk_flag = False
        project.status = ProjectStatus.ACTIVE
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.RISK_FLAG_CLEARED,
            message="Risk flag cleared. Project conditions have improved.",
        )
        db.commit()
        db.refresh(project)

    return project.risk_flag, was_already_flagged, reason
