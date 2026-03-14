from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.seed import SeedResponse
from app.services.seed_service import seed_database

router = APIRouter(prefix="/seed", tags=["Seed"])


@router.post("", response_model=SeedResponse, status_code=status.HTTP_200_OK)
def seed(db: Session = Depends(get_db)) -> SeedResponse:
    result = seed_database(db)
    return SeedResponse(
        templates_created=result["templates_created"],
        customers_created=result["customers_created"],
        projects_created=result["projects_created"],
        message=(
            "Database seeded successfully."
            if result["templates_created"] > 0
            else "Database already seeded — no changes made."
        ),
    )
