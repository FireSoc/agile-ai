"""
Deterministic, stateless workflow risk simulation engine.

Design principles
-----------------
- Pure functions: no DB writes, no side effects — safe to call any time.
- Deterministic: identical input always produces identical output.
- Composable: build SimulationTaskInput lists from either raw payloads
  or from persisted Task/Project ORM objects (see `simulate_from_project`).
- Config-aware: reuses the same risk thresholds as the live risk service.

Public API
----------
  run_simulation(customer_type, tasks, assumptions) -> SimulationResponse
  simulate_from_project(project, assumptions)       -> SimulationResponse
"""

from collections import defaultdict

from app.core.config import settings
from app.models.enums import OnboardingStage, ProjectStatus, STAGE_ORDER, TaskStatus
from app.schemas.simulation import (
    SimulationAssumptions,
    SimulationRequest,
    SimulationResponse,
    SimulationRiskSignal,
    SimulationStageResult,
    SimulationTaskInput,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _projected_due_day(task: SimulationTaskInput, assumptions: SimulationAssumptions) -> float:
    """
    Return the projected calendar day (from project start) when this task
    will actually be complete under the given assumptions.

    The base is due_offset_days (from the template), plus any already-known
    delay (task.delay_days), plus the assumption-based expected slip.
    """
    base = float(task.due_offset_days + task.delay_days)

    if task.is_customer_required:
        base += assumptions.avg_customer_delay_days
    else:
        base += assumptions.avg_internal_delay_days

    if task.requires_setup_data:
        base += assumptions.setup_data_delay_days

    return base


def _is_projected_overdue(
    task: SimulationTaskInput,
    projected_completion_day: float,
) -> bool:
    """A task is overdue if it will finish after its nominal due_offset_days."""
    return projected_completion_day > float(task.due_offset_days)


def _simulate_stage(
    stage: OnboardingStage,
    stage_tasks: list[SimulationTaskInput],
    assumptions: SimulationAssumptions,
    overdue_threshold_days: int,
) -> tuple[SimulationStageResult, list[SimulationRiskSignal]]:
    """
    Evaluate a single stage and return its result plus any risk signals.

    Stage gate logic mirrors workflow_service.check_stage_gate:
    - All required_for_stage_completion tasks must be complete.
    - Customer-required tasks are hard blockers.
    - requires_setup_data tasks are hard blockers.
    """
    required_tasks = [t for t in stage_tasks if t.required_for_stage_completion]

    blocker_titles: list[str] = []
    overdue_titles: list[str] = []
    risk_signals: list[SimulationRiskSignal] = []
    gate_blocked_reason: str | None = None
    can_advance = True

    # Track the latest projected completion day across required tasks to
    # determine stage duration.
    max_required_day: float = 0.0
    all_task_days: list[float] = []

    for task in stage_tasks:
        proj_day = _projected_due_day(task, assumptions)
        all_task_days.append(proj_day)

        if task.required_for_stage_completion:
            max_required_day = max(max_required_day, proj_day)

        # Already-completed tasks never block or become overdue in simulation.
        if task.current_status == TaskStatus.COMPLETED:
            continue

        if _is_projected_overdue(task, proj_day):
            overdue_titles.append(task.title)

            if task.required_for_stage_completion:
                slip = proj_day - task.due_offset_days
                if slip > overdue_threshold_days:
                    risk_signals.append(
                        SimulationRiskSignal(
                            rule="overdue_threshold",
                            stage=stage,
                            task_title=task.title,
                            detail=(
                                f"Required task '{task.title}' is projected to be "
                                f"{slip:.1f} day(s) overdue, exceeding the "
                                f"{overdue_threshold_days}-day risk threshold."
                            ),
                        )
                    )

        # Gate blocker evaluation: only flag if projected to slip past due date.
        if task.required_for_stage_completion:
            is_late = _is_projected_overdue(task, proj_day)
            if task.is_customer_required and assumptions.avg_customer_delay_days > 0 and is_late:
                blocker_titles.append(task.title)
                if can_advance:
                    gate_blocked_reason = (
                        f"Customer-required task '{task.title}' will be delayed "
                        f"by {assumptions.avg_customer_delay_days:.1f} day(s)."
                    )
                    can_advance = False
            elif task.requires_setup_data and assumptions.setup_data_delay_days > 0 and is_late:
                blocker_titles.append(task.title)
                if can_advance:
                    gate_blocked_reason = (
                        f"Task '{task.title}' requires setup data; "
                        f"{assumptions.setup_data_delay_days:.1f}-day data lag projected."
                    )
                    can_advance = False

    # Multi-overdue risk signal (≥ threshold count required tasks are overdue)
    required_overdue = [
        t for t in required_tasks
        if t.current_status != TaskStatus.COMPLETED
        and _is_projected_overdue(t, _projected_due_day(t, assumptions))
    ]
    if len(required_overdue) >= settings.risk_required_overdue_count:
        risk_signals.append(
            SimulationRiskSignal(
                rule="multi_overdue",
                stage=stage,
                task_title=None,
                detail=(
                    f"{len(required_overdue)} required task(s) are projected overdue "
                    f"in stage '{stage.value}', meeting the multi-overdue risk rule "
                    f"(threshold: {settings.risk_required_overdue_count})."
                ),
            )
        )

    stage_result = SimulationStageResult(
        stage=stage,
        total_tasks=len(stage_tasks),
        required_tasks=len(required_tasks),
        customer_required_tasks=sum(1 for t in stage_tasks if t.is_customer_required),
        setup_data_tasks=sum(1 for t in stage_tasks if t.requires_setup_data),
        projected_duration_days=max_required_day if max_required_day > 0 else (max(all_task_days) if all_task_days else 0.0),
        blocker_tasks=blocker_titles,
        overdue_tasks=overdue_titles,
        can_advance=can_advance,
        gate_blocked_reason=gate_blocked_reason,
    )

    return stage_result, risk_signals


def _build_recommendations(
    stage_results: list[SimulationStageResult],
    all_signals: list[SimulationRiskSignal],
    assumptions: SimulationAssumptions,
) -> list[str]:
    """
    Produce a ranked, deduplicated list of actionable recommendations
    based on simulation findings. Ordered by severity/impact.
    """
    recs: list[str] = []

    # Count stages where gate cannot advance
    blocked_stages = [r for r in stage_results if not r.can_advance]
    if blocked_stages:
        for sr in blocked_stages:
            recs.append(
                f"Stage '{sr.stage.value}' has {len(sr.blocker_tasks)} blocker task(s). "
                "Consider sending pre-filled forms or scheduling these earlier to "
                "reduce dependency on customer response time."
            )

    # Customer delay recommendations
    if assumptions.avg_customer_delay_days > 0:
        customer_required_total = sum(r.customer_required_tasks for r in stage_results)
        if customer_required_total > 0:
            recs.append(
                f"With a {assumptions.avg_customer_delay_days:.1f}-day customer delay "
                f"assumption, {customer_required_total} customer-required task(s) will slip. "
                "Move customer tasks to the earliest possible position within each stage."
            )

    # Setup data delay recommendations
    if assumptions.setup_data_delay_days > 0:
        setup_data_total = sum(r.setup_data_tasks for r in stage_results)
        if setup_data_total > 0:
            recs.append(
                f"Setup data is delayed by {assumptions.setup_data_delay_days:.1f} day(s), "
                f"affecting {setup_data_total} task(s). "
                "Collect setup data at kickoff (e.g. via intake form) to unblock downstream work."
            )

    # Overdue threshold signals
    threshold_signals = [s for s in all_signals if s.rule == "overdue_threshold"]
    if threshold_signals:
        recs.append(
            f"{len(threshold_signals)} required task(s) are projected to breach the "
            f"{settings.risk_overdue_threshold_days}-day overdue risk threshold. "
            "Reduce due_offset_days for these tasks or add earlier reminder triggers."
        )

    # Multi-overdue signals
    multi_signals = [s for s in all_signals if s.rule == "multi_overdue"]
    if multi_signals:
        affected_stages = {s.stage.value for s in multi_signals}
        recs.append(
            f"Stage(s) {sorted(affected_stages)} each have multiple required tasks "
            "projected overdue simultaneously. "
            "Stagger due dates to avoid compounding delays."
        )

    # High task density warning
    dense_stages = [r for r in stage_results if r.required_tasks > 5]
    if dense_stages:
        names = [r.stage.value for r in dense_stages]
        recs.append(
            f"Stage(s) {names} each have more than 5 required tasks. "
            "Consider splitting them into sub-stages to reduce cognitive load on customers."
        )

    # Healthy outcome reinforcement
    if not recs:
        recs.append(
            "No significant risk signals detected under these assumptions. "
            "The workflow is well-structured for the given scenario."
        )

    return recs


def _build_summary(
    customer_type: str,
    stage_results: list[SimulationStageResult],
    all_signals: list[SimulationRiskSignal],
    projected_ttfv: float,
    projected_total: float,
    at_risk: bool,
) -> str:
    blocked_count = sum(1 for r in stage_results if not r.can_advance)
    overdue_count = sum(len(r.overdue_tasks) for r in stage_results)

    status_word = "AT-RISK" if at_risk else "HEALTHY"
    return (
        f"[{status_word}] {customer_type.upper()} workflow simulation: "
        f"{len(stage_results)} stage(s) simulated across "
        f"{sum(r.total_tasks for r in stage_results)} total task(s). "
        f"Projected time-to-first-value: {projected_ttfv:.1f} day(s). "
        f"Projected total onboarding: {projected_total:.1f} day(s). "
        f"{blocked_count} stage gate(s) blocked, "
        f"{overdue_count} task(s) projected overdue, "
        f"{len(all_signals)} risk signal(s) detected."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_simulation(
    customer_type: str,
    tasks: list[SimulationTaskInput],
    assumptions: SimulationAssumptions,
) -> SimulationResponse:
    """
    Core deterministic simulation engine.

    Groups tasks by stage (in STAGE_ORDER order), evaluates each stage,
    and assembles the full SimulationResponse.
    """
    # Group tasks by stage, preserving stage order.
    by_stage: dict[OnboardingStage, list[SimulationTaskInput]] = defaultdict(list)
    for task in tasks:
        by_stage[task.stage].append(task)

    # Only simulate stages that have tasks, but respect STAGE_ORDER ordering.
    stages_to_simulate = [s for s in STAGE_ORDER if s in by_stage]

    stage_results: list[SimulationStageResult] = []
    all_signals: list[SimulationRiskSignal] = []
    cumulative_days: float = 0.0
    ttfv_days: float | None = None

    for stage in stages_to_simulate:
        stage_tasks = by_stage[stage]
        result, signals = _simulate_stage(
            stage,
            stage_tasks,
            assumptions,
            settings.risk_overdue_threshold_days,
        )

        # Stagger stage start: each stage begins after the prior stage ends.
        # Adjust the result's projected_duration_days to be cumulative.
        stage_start = cumulative_days
        stage_duration = result.projected_duration_days
        cumulative_days = stage_start + stage_duration

        # Replace with absolute end day for this stage.
        result = SimulationStageResult(
            **{
                **result.model_dump(),
                "projected_duration_days": cumulative_days,
            }
        )

        # TTFV = end of first stage.
        if ttfv_days is None:
            ttfv_days = cumulative_days

        stage_results.append(result)
        all_signals.extend(signals)

    # Stalled-project signal: if no activity assumptions make total > stalled threshold.
    if cumulative_days > settings.risk_stalled_threshold_days and not tasks:
        all_signals.append(
            SimulationRiskSignal(
                rule="stalled",
                stage=STAGE_ORDER[0],
                task_title=None,
                detail=(
                    f"No tasks defined; project would stall immediately, "
                    f"exceeding the {settings.risk_stalled_threshold_days}-day stalled threshold."
                ),
            )
        )

    at_risk = len(all_signals) > 0
    projected_ttfv = ttfv_days or 0.0
    projected_total = cumulative_days

    recommendations = _build_recommendations(stage_results, all_signals, assumptions)
    summary = _build_summary(
        customer_type, stage_results, all_signals, projected_ttfv, projected_total, at_risk
    )

    return SimulationResponse(
        customer_type=customer_type,
        total_tasks=len(tasks),
        stages_simulated=len(stage_results),
        projected_ttfv_days=projected_ttfv,
        projected_total_days=projected_total,
        at_risk=at_risk,
        risk_signals=all_signals,
        stage_results=stage_results,
        recommendations=recommendations,
        summary=summary,
    )


def simulate_from_project(
    project,  # OnboardingProject ORM object — typed loosely to avoid circular imports
    assumptions: SimulationAssumptions,
) -> SimulationResponse:
    """
    Build a SimulationTaskInput list from a persisted OnboardingProject and
    its tasks, then run the standard deterministic simulation.

    This lets callers test "what happens if delays occur" against the
    project's current state — including tasks that are already in-progress,
    overdue, or completed.
    """
    from datetime import datetime, timezone as tz

    now = datetime.now(tz.utc)

    def _make_aware(dt: datetime) -> datetime:
        """Coerce a naive datetime to UTC-aware (SQLite strips tz info)."""
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=tz.utc)

    project_created = _make_aware(project.created_at)

    sim_tasks: list[SimulationTaskInput] = []
    for task in project.tasks:
        # Compute actual delay: how many days past due is this task right now?
        delay = 0
        if task.due_date is not None and task.status != TaskStatus.COMPLETED:
            due_aware = _make_aware(task.due_date)
            if due_aware < now:
                delay = int((now - due_aware).days)

        # Convert due_date to a due_offset_days equivalent from project start.
        if task.due_date is not None:
            due_aware = _make_aware(task.due_date)
            offset = max(0, (due_aware - project_created).days)
        else:
            offset = 7  # fallback for tasks with no due date

        sim_tasks.append(
            SimulationTaskInput(
                title=task.title,
                stage=task.stage,
                due_offset_days=offset,
                required_for_stage_completion=task.required_for_stage_completion,
                is_customer_required=task.is_customer_required,
                requires_setup_data=task.requires_setup_data,
                current_status=task.status,
                delay_days=delay,
            )
        )

    customer_type = project.customer.customer_type.value if project.customer else "unknown"
    return run_simulation(customer_type, sim_tasks, assumptions)
