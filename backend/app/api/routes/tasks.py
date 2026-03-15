from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models.customer import Customer
from app.models.onboarding_project import OnboardingProject
from app.models.task import Task
from app.schemas.task import (
    TaskCalendarItem,
    TaskCompleteResponse,
    TaskCreate,
    TaskCreateResponse,
    TaskRead,
)
from app.services.task_service import complete_task, create_task

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/calendar", response_model=list[TaskCalendarItem])
def list_tasks_calendar(
    start: date = Query(..., description="Start of date range (YYYY-MM-DD)"),
    end: date = Query(..., description="End of date range (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> list[TaskCalendarItem]:
    """List tasks with due_date in range for calendar view; includes project and company info."""
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before or equal to end",
        )
    start_str = start.isoformat()
    end_str = end.isoformat()
    tasks = (
        db.query(Task)
        .options(
            selectinload(Task.project).selectinload(OnboardingProject.customer),
        )
        .filter(
            Task.due_date.isnot(None),
            func.date(Task.due_date) >= start_str,
            func.date(Task.due_date) <= end_str,
        )
        .order_by(Task.due_date)
        .all()
    )
    result = []
    for task in tasks:
        customer: Customer | None = task.project.customer if task.project else None
        if not customer:
            continue
        result.append(
            TaskCalendarItem(
                id=task.id,
                title=task.title,
                status=task.status,
                due_date=task.due_date,
                required_for_stage_completion=task.required_for_stage_completion,
                project_id=task.project_id,
                customer_id=customer.id,
                company_name=customer.company_name,
            )
        )
    return result


@router.post("", response_model=TaskCreateResponse, status_code=status.HTTP_201_CREATED)
def create_new_task(
    payload: TaskCreate, db: Session = Depends(get_db)
) -> TaskCreateResponse:
    """
    Create an ad-hoc task on an existing project.

    The task is attached to the project's current or any earlier stage.
    Future-stage tasks are generated automatically by the workflow engine
    when the project advances; this endpoint is for manual additions only.
    """
    try:
        task = create_task(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    return TaskCreateResponse(
        task=TaskRead.model_validate(task),
        message=(
            f"Task '{task.title}' created successfully for stage "
            f"'{task.stage.value}' on project {task.project_id}."
        ),
    )


@router.post("/{task_id}/complete", response_model=TaskCompleteResponse)
def mark_task_complete(task_id: int, db: Session = Depends(get_db)) -> TaskCompleteResponse:
    task = (
        db.query(Task)
        .options(selectinload(Task.project).selectinload(OnboardingProject.tasks))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    from app.models.enums import TaskStatus

    if task.status == TaskStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already completed.",
        )

    project = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == task.project_id)
        .first()
    )

    task, advanced, new_stage, project_completed = complete_task(db, task, project)

    if project_completed:
        msg = "Task completed. All stages finished — project marked as completed."
    elif advanced:
        msg = f"Task completed. Project advanced to stage '{new_stage.value}'."
    else:
        msg = "Task completed. Stage gate not yet satisfied; project remains in current stage."

    return TaskCompleteResponse(
        task=TaskRead.model_validate(task),
        stage_advanced=advanced,
        new_stage=new_stage,
        project_completed=project_completed,
        message=msg,
    )
