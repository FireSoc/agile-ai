from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.calendar_event import CalendarEvent
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events", response_model=list[CalendarEventResponse])
def list_events(
    start: date = Query(..., description="Start of date range (YYYY-MM-DD)"),
    end: date = Query(..., description="End of date range (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> list[CalendarEventResponse]:
    """List calendar events within the given date range (inclusive)."""
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before or equal to end",
        )
    events = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.start_date >= start,
            CalendarEvent.start_date <= end,
        )
        .order_by(CalendarEvent.start_date, CalendarEvent.created_at)
        .all()
    )
    return [CalendarEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
) -> CalendarEventResponse:
    """Create a new calendar event."""
    event = CalendarEvent(
        title=payload.title,
        description=payload.description,
        entry_type=payload.entry_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        duration_days=payload.duration_days,
        criticality=payload.criticality,
        stage=payload.stage,
        status=payload.status,
        project_id=payload.project_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return CalendarEventResponse.model_validate(event)


@router.get("/events/{event_id}", response_model=CalendarEventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
) -> CalendarEventResponse:
    """Get a single calendar event by id."""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found",
        )
    return CalendarEventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=CalendarEventResponse)
def update_event(
    event_id: int,
    payload: CalendarEventUpdate,
    db: Session = Depends(get_db),
) -> CalendarEventResponse:
    """Update a calendar event (partial update)."""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found",
        )
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return CalendarEventResponse.model_validate(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete a calendar event."""
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found",
        )
    db.delete(event)
    db.commit()
