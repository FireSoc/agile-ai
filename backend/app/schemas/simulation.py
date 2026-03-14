"""
Pydantic schemas for the deterministic, stateless workflow risk simulator.

Caller supplies either:
  (a) a fully ad-hoc SimulationRequest (no DB required), or
  (b) a project_id to simulate against the current persisted project state.

The simulator returns a SimulationResponse with per-stage results, risk
signals, projected time-to-value, and structured recommendations.
"""

from pydantic import BaseModel, Field

from app.models.enums import OnboardingStage, TaskStatus


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class SimulationTaskInput(BaseModel):
    """Describes one task definition for an ad-hoc simulation."""

    title: str = Field(..., min_length=1, max_length=255)
    stage: OnboardingStage
    due_offset_days: int = Field(..., ge=0)
    required_for_stage_completion: bool = True
    is_customer_required: bool = False
    requires_setup_data: bool = False
    # Optionally simulate a known current status for in-flight projects.
    current_status: TaskStatus = TaskStatus.NOT_STARTED
    # Optionally simulate an existing delay (positive = already overdue by N days).
    delay_days: int = Field(default=0, ge=0)


class SimulationAssumptions(BaseModel):
    """
    Behavioural assumptions applied uniformly across all tasks.

    avg_customer_delay_days  - expected number of days a customer-required task
                               will slip beyond its due_offset.
    avg_internal_delay_days  - expected slip for internal tasks.
    setup_data_delay_days    - additional lag before setup-data tasks can start.
    """

    avg_customer_delay_days: float = Field(default=0.0, ge=0)
    avg_internal_delay_days: float = Field(default=0.0, ge=0)
    setup_data_delay_days: float = Field(default=0.0, ge=0)


class SimulationRequest(BaseModel):
    """Fully ad-hoc simulation payload (no existing project required)."""

    customer_type: str = Field(..., description="smb or enterprise")
    tasks: list[SimulationTaskInput]
    assumptions: SimulationAssumptions = SimulationAssumptions()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class SimulationRiskSignal(BaseModel):
    """A single detected risk trigger within the simulation."""

    rule: str = Field(
        ...,
        description="Machine-readable rule ID (overdue_threshold | stalled | multi_overdue)",
    )
    stage: OnboardingStage
    task_title: str | None = None
    detail: str = Field(..., description="Human-readable explanation.")


class SimulationStageResult(BaseModel):
    """Per-stage simulation output."""

    stage: OnboardingStage
    total_tasks: int
    required_tasks: int
    customer_required_tasks: int
    setup_data_tasks: int
    projected_duration_days: float = Field(
        ...,
        description="Projected calendar days for this stage to complete under given assumptions.",
    )
    blocker_tasks: list[str] = Field(
        default_factory=list,
        description="Titles of tasks that will block stage gate advancement.",
    )
    overdue_tasks: list[str] = Field(
        default_factory=list,
        description="Titles of tasks projected to be overdue under the given assumptions.",
    )
    can_advance: bool = Field(
        ...,
        description="Whether all stage gate conditions are met under the given assumptions.",
    )
    gate_blocked_reason: str | None = None


class SimulationResponse(BaseModel):
    """Top-level stateless simulation result."""

    customer_type: str
    total_tasks: int
    stages_simulated: int

    projected_ttfv_days: float = Field(
        ...,
        description=(
            "Projected time-to-first-value in calendar days: the number of days "
            "from project start until the first stage completes."
        ),
    )
    projected_total_days: float = Field(
        ...,
        description="Projected end-to-end onboarding duration in calendar days.",
    )

    at_risk: bool
    risk_signals: list[SimulationRiskSignal]

    stage_results: list[SimulationStageResult]

    recommendations: list[str] = Field(
        default_factory=list,
        description="Structured, actionable recommendations to improve workflow health.",
    )
    summary: str = Field(..., description="Human-readable narrative summary.")
