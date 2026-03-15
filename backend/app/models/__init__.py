# Import all models so SQLAlchemy Base.metadata is fully populated.
from app.models.customer import Customer  # noqa: F401
from app.models.enums import (  # noqa: F401
    CustomerType,
    EventType,
    OnboardingStage,
    ProjectStatus,
    STAGE_ORDER,
    TaskStatus,
)
from app.models.onboarding_project import OnboardingProject  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.workflow_event import WorkflowEvent  # noqa: F401
from app.models.workflow_template import WorkflowTemplate  # noqa: F401
