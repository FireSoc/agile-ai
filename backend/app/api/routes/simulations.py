"""
Simulation endpoints.

POST /simulations/risk
    Run a fully ad-hoc, stateless risk simulation against an arbitrary
    task set and assumption profile. No project needs to exist.

POST /simulations/risk/from-project/{project_id}
    Simulate against the current state of a persisted project (its
    existing tasks, stages, and statuses), then apply delay assumptions
    on top.  Useful for "what-if" analysis on live onboarding projects.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models.onboarding_project import OnboardingProject
from app.schemas.simulation import (
    SimulationAssumptions,
    SimulationRequest,
    SimulationResponse,
)
from app.services.simulation_service import run_simulation, simulate_from_project

router = APIRouter(prefix="/simulations", tags=["Simulations"])


@router.post(
    "/risk",
    response_model=SimulationResponse,
    summary="Run a stateless risk simulation from an ad-hoc task payload",
)
def simulate_risk(payload: SimulationRequest) -> SimulationResponse:
    """
    Supply your own list of task definitions and assumption parameters.
    The engine runs the full deterministic risk analysis and returns stage
    results, risk signals, projected timelines, and recommendations.

    No database access is required — fully stateless.
    """
    if not payload.tasks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one task is required to run a simulation.",
        )

    return run_simulation(
        customer_type=payload.customer_type,
        tasks=payload.tasks,
        assumptions=payload.assumptions,
    )


@router.post(
    "/risk/from-project/{project_id}",
    response_model=SimulationResponse,
    summary="Run a risk simulation against a persisted project's current state",
)
def simulate_risk_from_project(
    project_id: int,
    assumptions: SimulationAssumptions = Body(default=SimulationAssumptions()),
    db: Session = Depends(get_db),
) -> SimulationResponse:
    """
    Loads the project and all its tasks from the database, then runs the
    deterministic risk simulation on top of their current status.

    Optionally supply assumption overrides via the request body (all
    fields have sensible defaults — an empty body is valid).

    Use this to answer: "Given where this project is right now, what
    happens if customers are consistently N days late?"
    """
    project = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == project_id)
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )

    if not project.tasks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Project {project_id} has no tasks to simulate against.",
        )

    return simulate_from_project(project, assumptions)
