"""Central event logging utility used by every other service."""

from sqlalchemy.orm import Session

from app.models.enums import EventType
from app.models.workflow_event import WorkflowEvent


def log_event(
    db: Session,
    *,
    project_id: int,
    event_type: EventType,
    message: str,
    task_id: int | None = None,
) -> WorkflowEvent:
    """Persist a WorkflowEvent and return it.

    Callers are responsible for calling db.commit() after their full
    unit of work is complete so that all writes happen atomically.
    """
    event = WorkflowEvent(
        project_id=project_id,
        task_id=task_id,
        event_type=event_type,
        message=message,
    )
    db.add(event)
    return event
