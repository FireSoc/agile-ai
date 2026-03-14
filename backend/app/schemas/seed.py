from pydantic import BaseModel


class SeedResponse(BaseModel):
    templates_created: int
    customers_created: int
    projects_created: int
    message: str
