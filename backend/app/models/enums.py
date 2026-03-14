import enum


class CustomerType(str, enum.Enum):
    SMB = "smb"
    ENTERPRISE = "enterprise"


class OnboardingStage(str, enum.Enum):
    KICKOFF = "kickoff"
    SETUP = "setup"
    TRAINING = "training"
    GO_LIVE = "go_live"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    AT_RISK = "at_risk"
    BLOCKED = "blocked"
    COMPLETED = "completed"


class TaskStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    BLOCKED = "blocked"


class EventType(str, enum.Enum):
    PROJECT_CREATED = "project_created"
    TASKS_GENERATED = "tasks_generated"
    TASK_COMPLETED = "task_completed"
    PROJECT_ADVANCED = "project_advanced"
    REMINDER_TRIGGERED = "reminder_triggered"
    RISK_FLAG_ADDED = "risk_flag_added"
    RISK_FLAG_CLEARED = "risk_flag_cleared"
    PROJECT_COMPLETED = "project_completed"
    STAGE_BLOCKED = "stage_blocked"


# Ordered stage progression for look-up.
STAGE_ORDER: list[OnboardingStage] = [
    OnboardingStage.KICKOFF,
    OnboardingStage.SETUP,
    OnboardingStage.TRAINING,
    OnboardingStage.GO_LIVE,
]
