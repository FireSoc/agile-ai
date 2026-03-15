"""Ops Inbox: aggregated action queue (blocked, overdue, recommendations, at-risk)."""

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_db
from app.schemas.ops_inbox import OpsInboxItemType, OpsInboxResponse
from app.services.ops_inbox_service import get_ops_inbox
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ops", tags=["Ops"])


@router.get("/inbox", response_model=OpsInboxResponse)
def list_ops_inbox(
    item_type: OpsInboxItemType | None = Query(None, alias="type", description="Filter by item type"),
    stage: str | None = Query(None, description="Filter by project stage (kickoff, setup, integration, training, go_live)"),
    customer_id: int | None = Query(None, description="Filter by customer ID"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> OpsInboxResponse:
    """
    Return ops inbox: blocked tasks, overdue tasks, active recommendations, and at-risk project alerts.
    Totals are computed over all relevant projects; filters apply to the returned items list.
    """
    return get_ops_inbox(
        db,
        item_type=item_type,
        stage=stage,
        customer_id=customer_id,
        limit=limit,
        offset=offset,
    )
