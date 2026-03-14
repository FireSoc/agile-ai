from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models.customer import Customer
from app.models.onboarding_project import OnboardingProject
from app.schemas.project import (
    OverdueCheckResponse,
    ProjectCreate,
    ProjectDetail,
    ProjectRead,
    RiskCheckResponse,
)
from app.schemas.task import TaskRead
from app.schemas.workflow_event import WorkflowEventRead
from app.services.reminder_service import check_overdue_tasks
from app.services.risk_service import apply_risk_check
from app.services.workflow_service import create_project

router = APIRouter(prefix="/projects", tags=["Projects"])


def _get_project_or_404(db: Session, project_id: int) -> OnboardingProject:
    project = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.events),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )
    return project


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_onboarding_project(
    payload: ProjectCreate, db: Session = Depends(get_db)
) -> OnboardingProject:
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {payload.customer_id} not found.",
        )
    return create_project(db, customer, notes=payload.notes)


@router.get("", response_model=list[ProjectRead])
def list_projects(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
) -> list[OnboardingProject]:
    return db.query(OnboardingProject).offset(skip).limit(limit).all()


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: Session = Depends(get_db)) -> OnboardingProject:
    return _get_project_or_404(db, project_id)


@router.get("/{project_id}/tasks", response_model=list[TaskRead])
def list_project_tasks(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return project.tasks


@router.get("/{project_id}/events", response_model=list[WorkflowEventRead])
def list_project_events(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return sorted(project.events, key=lambda e: e.created_at)


@router.post("/{project_id}/check-overdue", response_model=OverdueCheckResponse)
def check_overdue(project_id: int, db: Session = Depends(get_db)) -> OverdueCheckResponse:
    project = _get_project_or_404(db, project_id)
    overdue_count, reminder_count = check_overdue_tasks(db, project)
    return OverdueCheckResponse(
        overdue_count=overdue_count,
        reminder_events_created=reminder_count,
        message=(
            f"{overdue_count} overdue task(s) found. "
            f"{reminder_count} reminder event(s) created."
            if overdue_count
            else "No overdue tasks found."
        ),
    )


@router.post("/{project_id}/check-risk", response_model=RiskCheckResponse)
def check_risk(project_id: int, db: Session = Depends(get_db)) -> RiskCheckResponse:
    project = _get_project_or_404(db, project_id)
    risk_flag, was_already_flagged, reason = apply_risk_check(db, project)
    return RiskCheckResponse(
        risk_flag=risk_flag,
        was_already_flagged=was_already_flagged,
        reason=reason,
        message=(
            "Project flagged as at-risk."
            if risk_flag and not was_already_flagged
            else "Risk flag cleared."
            if not risk_flag and was_already_flagged
            else "Project is at-risk (flag was already set)."
            if risk_flag
            else "Project is not at risk."
        ),
    )
