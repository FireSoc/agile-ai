from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import CustomerType


class CustomerCreate(BaseModel):
    company_name: str
    customer_type: CustomerType
    industry: str | None = None


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    customer_type: CustomerType
    industry: str | None
    created_at: datetime
