from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CustomerType


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_type: Mapped[CustomerType] = mapped_column(
        Enum(CustomerType), nullable=False
    )
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    projects: Mapped[list["OnboardingProject"]] = relationship(  # noqa: F821
        back_populates="customer", cascade="all, delete-orphan"
    )
