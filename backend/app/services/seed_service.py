"""Seed the database with default workflow templates and sample data."""

import json

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.enums import CustomerType, OnboardingStage
from app.models.workflow_template import WorkflowTemplate
from app.services.workflow_service import create_project

# ---------------------------------------------------------------------------
# Template definitions
# ---------------------------------------------------------------------------

SMB_TEMPLATES: list[dict] = [
    {
        "stage": OnboardingStage.KICKOFF,
        "name": "SMB Kickoff",
        "tasks": [
            {
                "title": "Kickoff Form",
                "description": (
                    "Send the customer a kickoff intake form to capture key contacts, "
                    "goals, and technical details."
                ),
                "assigned_to": "csm@agile.io",
                "due_offset_days": 2,
                "required_for_stage_completion": True,
                "is_customer_required": True,
                "requires_setup_data": False,
            },
            {
                "title": "Welcome Email",
                "description": "Send the welcome email with onboarding guide and portal access.",
                "assigned_to": "csm@agile.io",
                "due_offset_days": 1,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
        ],
    },
    {
        "stage": OnboardingStage.SETUP,
        "name": "SMB Setup",
        "tasks": [
            {
                "title": "Basic Setup",
                "description": (
                    "Configure the customer workspace with default settings, "
                    "branding, and user roles."
                ),
                "assigned_to": "onboarding@agile.io",
                "due_offset_days": 5,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": True,
            },
            {
                "title": "Admin Invite",
                "description": "Invite the customer's admin user and confirm account activation.",
                "assigned_to": "onboarding@agile.io",
                "due_offset_days": 5,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
        ],
    },
    {
        "stage": OnboardingStage.TRAINING,
        "name": "SMB Training",
        "tasks": [
            {
                "title": "Product Walkthrough",
                "description": "Conduct a 30-minute walkthrough session covering core features.",
                "assigned_to": "csm@agile.io",
                "due_offset_days": 7,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
        ],
    },
    {
        "stage": OnboardingStage.GO_LIVE,
        "name": "SMB Go-Live",
        "tasks": [
            {
                "title": "Go-Live Check",
                "description": (
                    "Verify all setup items are complete, confirm the customer is "
                    "live, and document any open issues."
                ),
                "assigned_to": "csm@agile.io",
                "due_offset_days": 3,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Customer Sign-Off",
                "description": "Obtain written sign-off from the customer confirming successful go-live.",
                "assigned_to": "csm@agile.io",
                "due_offset_days": 5,
                "required_for_stage_completion": True,
                "is_customer_required": True,
                "requires_setup_data": False,
            },
        ],
    },
]

ENTERPRISE_TEMPLATES: list[dict] = [
    {
        "stage": OnboardingStage.KICKOFF,
        "name": "Enterprise Kickoff",
        "tasks": [
            {
                "title": "Kickoff Call",
                "description": (
                    "Schedule and run a structured kickoff call with the customer's "
                    "project sponsor, technical lead, and key stakeholders. "
                    "Align on success criteria and project timeline."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 3,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Technical Discovery Questionnaire",
                "description": (
                    "Send and collect the technical discovery questionnaire covering "
                    "SSO requirements, data residency, IP allowlisting, and existing "
                    "integrations. Customer must submit before proceeding."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 5,
                "required_for_stage_completion": True,
                "is_customer_required": True,
                "requires_setup_data": False,
            },
            {
                "title": "Executive Alignment Email",
                "description": (
                    "Send an executive-level summary email confirming partnership goals, "
                    "SLAs, escalation paths, and primary CSM contact."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 2,
                "required_for_stage_completion": False,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
        ],
    },
    {
        "stage": OnboardingStage.SETUP,
        "name": "Enterprise Setup",
        "tasks": [
            {
                "title": "Security Review",
                "description": (
                    "Complete an internal security review of the customer's environment. "
                    "Verify SOC2 compliance, data handling requirements, and access control needs. "
                    "Requires technical discovery data."
                ),
                "assigned_to": "security@agile.io",
                "due_offset_days": 7,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": True,
            },
            {
                "title": "SSO / SAML Configuration",
                "description": (
                    "Configure SAML/SSO based on the customer's identity provider (Okta, Azure AD, etc.). "
                    "Test end-to-end login flow with at least two user accounts."
                ),
                "assigned_to": "integrations@agile.io",
                "due_offset_days": 8,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": True,
            },
            {
                "title": "Admin Invite",
                "description": (
                    "Invite all designated admin users with the correct roles and permissions. "
                    "Confirm activation and run a permission audit."
                ),
                "assigned_to": "onboarding@agile.io",
                "due_offset_days": 6,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Integration Setup",
                "description": (
                    "Connect all required third-party integrations (CRM, ticketing, BI tools). "
                    "Run integration smoke tests and document each connection status."
                ),
                "assigned_to": "integrations@agile.io",
                "due_offset_days": 10,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": True,
            },
            {
                "title": "Data Migration Review",
                "description": (
                    "Review any legacy data to be migrated. Define field mapping, "
                    "validate source data quality, and schedule migration window."
                ),
                "assigned_to": "data-eng@agile.io",
                "due_offset_days": 12,
                "required_for_stage_completion": False,
                "is_customer_required": False,
                "requires_setup_data": True,
            },
        ],
    },
    {
        "stage": OnboardingStage.TRAINING,
        "name": "Enterprise Training",
        "tasks": [
            {
                "title": "Admin Training Session",
                "description": (
                    "Run a dedicated admin training session (60–90 min) covering "
                    "user management, permission settings, reporting, and audit logs."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 7,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Team Training",
                "description": (
                    "Conduct end-user training across the customer's relevant teams. "
                    "Deliver recorded sessions and provide access to training material library."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 10,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Customer Training Confirmation",
                "description": (
                    "Collect written confirmation from the customer that all required "
                    "personnel have completed training."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 12,
                "required_for_stage_completion": True,
                "is_customer_required": True,
                "requires_setup_data": False,
            },
            {
                "title": "Champions Enablement",
                "description": (
                    "Identify and enable 2–3 internal champions at the customer who will "
                    "drive adoption. Provide advanced feature access and escalation paths."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 14,
                "required_for_stage_completion": False,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
        ],
    },
    {
        "stage": OnboardingStage.GO_LIVE,
        "name": "Enterprise Go-Live",
        "tasks": [
            {
                "title": "Go-Live Readiness Review",
                "description": (
                    "Conduct a formal readiness review: verify all setup tasks complete, "
                    "confirm no blocking issues, and obtain sign-off from the technical lead."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 3,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Hypercare Monitoring Setup",
                "description": (
                    "Activate hypercare monitoring (48–72 hr post-launch). "
                    "Set up Slack/Teams channel for rapid issue response."
                ),
                "assigned_to": "support@agile.io",
                "due_offset_days": 2,
                "required_for_stage_completion": True,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
            {
                "title": "Executive Go-Live Sign-Off",
                "description": (
                    "Obtain written executive sign-off confirming successful launch "
                    "and acceptance of the platform."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 5,
                "required_for_stage_completion": True,
                "is_customer_required": True,
                "requires_setup_data": False,
            },
            {
                "title": "Success Plan Handoff",
                "description": (
                    "Transition the customer from the onboarding team to the dedicated "
                    "Customer Success team. Share 90-day success plan."
                ),
                "assigned_to": "enterprise-csm@agile.io",
                "due_offset_days": 7,
                "required_for_stage_completion": False,
                "is_customer_required": False,
                "requires_setup_data": False,
            },
        ],
    },
]


def seed_database(db: Session) -> dict:
    """
    Idempotent seed: inserts default templates and sample customers/projects
    only if they do not already exist.

    Returns counts of records created.
    """
    templates_created = 0
    customers_created = 0
    projects_created = 0

    # --- Workflow Templates ---
    existing_templates = db.query(WorkflowTemplate).count()
    if existing_templates == 0:
        for tpl in SMB_TEMPLATES:
            db.add(
                WorkflowTemplate(
                    name=tpl["name"],
                    customer_type=CustomerType.SMB,
                    stage_name=tpl["stage"],
                    template_json=json.dumps(tpl["tasks"]),
                )
            )
            templates_created += 1

        for tpl in ENTERPRISE_TEMPLATES:
            db.add(
                WorkflowTemplate(
                    name=tpl["name"],
                    customer_type=CustomerType.ENTERPRISE,
                    stage_name=tpl["stage"],
                    template_json=json.dumps(tpl["tasks"]),
                )
            )
            templates_created += 1

        db.commit()

    # --- Sample Customers ---
    existing_customers = db.query(Customer).count()
    if existing_customers == 0:
        smb_customer = Customer(
            company_name="Bright Path Solutions",
            customer_type=CustomerType.SMB,
            industry="Professional Services",
        )
        enterprise_customer = Customer(
            company_name="Apex Global Corp",
            customer_type=CustomerType.ENTERPRISE,
            industry="Financial Services",
        )
        db.add(smb_customer)
        db.add(enterprise_customer)
        db.commit()
        db.refresh(smb_customer)
        db.refresh(enterprise_customer)
        customers_created = 2

        # --- Sample Projects ---
        create_project(db, smb_customer, name="SMB pilot", notes="SMB pilot onboarding.")
        create_project(db, enterprise_customer, name="Enterprise flagship", notes="Enterprise flagship onboarding.")
        projects_created = 2

    return {
        "templates_created": templates_created,
        "customers_created": customers_created,
        "projects_created": projects_created,
    }
