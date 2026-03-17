"""reset_and_rebuild — drop all app tables, rebuild normalized schema with auth.users FKs.

Revision ID: 20250318000000
Revises: 20250317000000
Create Date: 2025-03-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "20250318000000"
down_revision: Union[str, None] = "20250317000000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_enum_if_not_exists(name: str, values: str) -> None:
    op.execute(
        f"DO $$ BEGIN CREATE TYPE {name} AS ENUM ({values}); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )


def _drop_table_if_exists(name: str) -> None:
    op.execute(f"DROP TABLE IF EXISTS {name} CASCADE")


def _drop_enum_if_exists(name: str) -> None:
    op.execute(f"DROP TYPE IF EXISTS {name} CASCADE")


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    # ── 1. Drop existing app tables (cascade handles FK deps) ────────────────
    for tbl in [
        "recommendations",
        "risk_signals",
        "onboarding_events",
        "tasks",
        "onboarding_projects",
        "crm_deals",
        "customers",
        "user_playbook_seed_audit",
        "onboarding_playbooks",
        "profiles",
    ]:
        _drop_table_if_exists(tbl)

    # ── 2. Drop old enum types ───────────────────────────────────────────────
    for enum_name in [
        "recommendationactiontype",
        "eventtype",
        "tasktype",
        "taskstatus",
        "onboardingstage",
        "risklevel",
        "projectstatus",
        "dealstatus",
        "customertype",
    ]:
        _drop_enum_if_exists(enum_name)

    # ── 3. Recreate enum types (idempotent) ──────────────────────────────────
    _create_enum_if_not_exists("customertype", "'smb', 'mid_market', 'enterprise'")
    _create_enum_if_not_exists("dealstatus", "'open', 'closed_won', 'closed_lost'")
    _create_enum_if_not_exists(
        "onboardingstage", "'kickoff', 'setup', 'integration', 'training', 'go_live'"
    )
    _create_enum_if_not_exists("projectstatus", "'active', 'at_risk', 'blocked', 'completed'")
    _create_enum_if_not_exists("risklevel", "'low', 'medium', 'high'")
    _create_enum_if_not_exists("tasktype", "'internal', 'customer'")
    _create_enum_if_not_exists(
        "taskstatus", "'not_started', 'in_progress', 'completed', 'overdue', 'blocked'"
    )
    _create_enum_if_not_exists(
        "eventtype",
        "'deal_ingested', 'project_created', 'playbook_selected', 'tasks_generated', "
        "'task_completed', 'project_advanced', 'reminder_triggered', 'risk_flag_added', "
        "'risk_flag_cleared', 'risk_score_changed', 'project_completed', 'stage_blocked', "
        "'blocker_detected', 'stage_delayed', 'escalation_triggered'",
    )
    _create_enum_if_not_exists(
        "recommendationactiontype",
        "'remind_customer_admin', 'escalate_blocker', 'reschedule_training', "
        "'shift_projected_go_live', 'assign_technical_specialist'",
    )

    # ── 4. profiles ──────────────────────────────────────────────────────────
    # One-to-one with auth.users; created automatically on first sign-in.
    op.create_table(
        "profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["auth.users.id"],
            ondelete="CASCADE",
            name="fk_profiles_user_id",
        ),
    )

    # ── 5. onboarding_playbooks (global system catalog) ──────────────────────
    # is_system_template=true → seeded by server; false → user-created (future).
    # owner_user_id=null for system templates; populated for user-custom playbooks.
    op.create_table(
        "onboarding_playbooks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("is_system_template", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("owner_user_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "segment",
            postgresql.ENUM("smb", "mid_market", "enterprise", name="customertype", create_type=False),
            nullable=False,
        ),
        sa.Column("supported_products", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("default_stages", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("default_tasks", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("branching_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["auth.users.id"],
            ondelete="SET NULL",
            name="fk_playbooks_owner_user_id",
        ),
    )
    op.create_index("ix_onboarding_playbooks_id", "onboarding_playbooks", ["id"])
    op.create_index("ix_onboarding_playbooks_name", "onboarding_playbooks", ["name"])
    op.create_index("ix_onboarding_playbooks_segment", "onboarding_playbooks", ["segment"])
    op.create_index(
        "ix_onboarding_playbooks_system",
        "onboarding_playbooks",
        ["is_system_template"],
    )
    # Composite: owner + name (find user-custom playbooks by name quickly)
    op.create_index(
        "ix_onboarding_playbooks_owner_name",
        "onboarding_playbooks",
        ["owner_user_id", "name"],
    )

    # ── 6. user_playbook_seed_audit ──────────────────────────────────────────
    # Records that global playbooks have been "introduced" to this user's session.
    # Unique constraint prevents duplicate bootstrap races.
    op.create_table(
        "user_playbook_seed_audit",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "seeded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["auth.users.id"],
            ondelete="CASCADE",
            name="fk_seed_audit_user_id",
        ),
    )

    # ── 7. customers ─────────────────────────────────────────────────────────
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("owner_user_id", sa.UUID(), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column(
            "customer_type",
            postgresql.ENUM("smb", "mid_market", "enterprise", name="customertype", create_type=False),
            nullable=False,
        ),
        sa.Column("industry", sa.String(255), nullable=True),
        # primary_contacts kept as JSONB for backward-compat; structured data optional
        sa.Column("primary_contacts", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("onboarding_status", sa.String(64), nullable=True),
        sa.Column("current_risk_level", sa.String(32), nullable=True),
        sa.Column("health_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["auth.users.id"],
            ondelete="CASCADE",
            name="fk_customers_owner_user_id",
        ),
    )
    op.create_index("ix_customers_id", "customers", ["id"])
    op.create_index("ix_customers_owner_user_id", "customers", ["owner_user_id"])
    # Composite indexes for common query patterns (owner + type, owner + date)
    op.create_index(
        "ix_customers_owner_type",
        "customers",
        ["owner_user_id", "customer_type"],
    )
    op.create_index(
        "ix_customers_owner_created",
        "customers",
        ["owner_user_id", sa.text("created_at DESC")],
    )

    # ── 8. crm_deals ─────────────────────────────────────────────────────────
    op.create_table(
        "crm_deals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("owner_user_id", sa.UUID(), nullable=False),
        sa.Column("crm_source", sa.String(128), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column(
            "segment",
            postgresql.ENUM("smb", "mid_market", "enterprise", name="customertype", create_type=False),
            nullable=False,
        ),
        sa.Column("products_purchased", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("target_go_live_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("contract_start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("implementation_owner", sa.String(255), nullable=True),
        sa.Column("csm_owner", sa.String(255), nullable=True),
        sa.Column("special_requirements", sa.Text(), nullable=True),
        sa.Column(
            "deal_status",
            postgresql.ENUM("open", "closed_won", "closed_lost", name="dealstatus", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["auth.users.id"],
            ondelete="CASCADE",
            name="fk_crm_deals_owner_user_id",
        ),
    )
    op.create_index("ix_crm_deals_id", "crm_deals", ["id"])
    op.create_index("ix_crm_deals_owner_user_id", "crm_deals", ["owner_user_id"])
    op.create_index("ix_crm_deals_crm_source", "crm_deals", ["crm_source"])
    op.create_index("ix_crm_deals_segment", "crm_deals", ["segment"])
    op.create_index("ix_crm_deals_deal_status", "crm_deals", ["deal_status"])
    # Composite: owner + status (pipeline view), owner + created (feed)
    op.create_index(
        "ix_crm_deals_owner_status",
        "crm_deals",
        ["owner_user_id", "deal_status"],
    )
    op.create_index(
        "ix_crm_deals_owner_created",
        "crm_deals",
        ["owner_user_id", sa.text("created_at DESC")],
    )

    # ── 9. onboarding_projects ────────────────────────────────────────────────
    op.create_table(
        "onboarding_projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("source_deal_id", sa.Integer(), nullable=True),
        sa.Column("playbook_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column(
            "current_stage",
            postgresql.ENUM(
                "kickoff", "setup", "integration", "training", "go_live",
                name="onboardingstage", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "active", "at_risk", "blocked", "completed",
                name="projectstatus", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("risk_flag", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("risk_score", sa.Integer(), nullable=True),
        sa.Column(
            "risk_level",
            postgresql.ENUM("low", "medium", "high", name="risklevel", create_type=False),
            nullable=True,
        ),
        sa.Column("kickoff_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("target_go_live_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("projected_go_live_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("health_summary", sa.Text(), nullable=True),
        sa.Column("next_best_action", sa.String(500), nullable=True),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["customer_id"], ["customers.id"], ondelete="CASCADE",
            name="fk_projects_customer_id",
        ),
        sa.ForeignKeyConstraint(
            ["source_deal_id"], ["crm_deals.id"], ondelete="SET NULL",
            name="fk_projects_source_deal_id",
        ),
        sa.ForeignKeyConstraint(
            ["playbook_id"], ["onboarding_playbooks.id"], ondelete="SET NULL",
            name="fk_projects_playbook_id",
        ),
    )
    op.create_index("ix_onboarding_projects_id", "onboarding_projects", ["id"])
    op.create_index("ix_onboarding_projects_customer_id", "onboarding_projects", ["customer_id"])
    op.create_index("ix_onboarding_projects_source_deal_id", "onboarding_projects", ["source_deal_id"])
    # Composite: customer + status (at-risk view), customer + stage + status (detail)
    op.create_index(
        "ix_onboarding_projects_customer_status",
        "onboarding_projects",
        ["customer_id", "status"],
    )
    op.create_index(
        "ix_onboarding_projects_customer_stage",
        "onboarding_projects",
        ["customer_id", "current_stage", "status"],
    )

    # ── 10. tasks ─────────────────────────────────────────────────────────────
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column(
            "stage",
            postgresql.ENUM(
                "kickoff", "setup", "integration", "training", "go_live",
                name="onboardingstage", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assigned_to", sa.String(255), nullable=True),
        sa.Column("owner_type", sa.String(32), nullable=True),
        sa.Column("owner_id", sa.String(255), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "not_started", "in_progress", "completed", "overdue", "blocked",
                name="taskstatus", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dependency_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("blocker_flag", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("blocker_reason", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("task_type", sa.String(32), nullable=True),
        sa.Column("required_for_stage_completion", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_customer_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("requires_setup_data", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"], ["onboarding_projects.id"], ondelete="CASCADE",
            name="fk_tasks_project_id",
        ),
    )
    op.create_index("ix_tasks_id", "tasks", ["id"])
    op.create_index("ix_tasks_project_id", "tasks", ["project_id"])
    # Composite indexes for stage gate queries and overdue detection
    op.create_index("ix_tasks_project_stage", "tasks", ["project_id", "stage"])
    op.create_index("ix_tasks_project_status", "tasks", ["project_id", "status"])
    op.create_index(
        "ix_tasks_project_stage_status",
        "tasks",
        ["project_id", "stage", "status"],
    )
    # Partial index: only active/overdue tasks need due_date checked frequently
    op.execute(
        "CREATE INDEX ix_tasks_due_date_active "
        "ON tasks (due_date) "
        "WHERE status IN ('not_started', 'in_progress', 'overdue')"
    )

    # ── 11. onboarding_events ─────────────────────────────────────────────────
    op.create_table(
        "onboarding_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column(
            "event_type",
            postgresql.ENUM(
                "deal_ingested", "project_created", "playbook_selected", "tasks_generated",
                "task_completed", "project_advanced", "reminder_triggered", "risk_flag_added",
                "risk_flag_cleared", "risk_score_changed", "project_completed", "stage_blocked",
                "blocker_detected", "stage_delayed", "escalation_triggered",
                name="eventtype", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"], ["onboarding_projects.id"], ondelete="CASCADE",
            name="fk_events_project_id",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"], ["tasks.id"], ondelete="SET NULL",
            name="fk_events_task_id",
        ),
    )
    op.create_index("ix_onboarding_events_id", "onboarding_events", ["id"])
    op.create_index("ix_onboarding_events_project_id", "onboarding_events", ["project_id"])
    # Event feed is always sorted descending
    op.create_index(
        "ix_onboarding_events_project_created",
        "onboarding_events",
        ["project_id", sa.text("created_at DESC")],
    )

    # ── 12. risk_signals ──────────────────────────────────────────────────────
    op.create_table(
        "risk_signals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("signal_type", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"], ["onboarding_projects.id"], ondelete="CASCADE",
            name="fk_risk_signals_project_id",
        ),
    )
    op.create_index("ix_risk_signals_id", "risk_signals", ["id"])
    op.create_index("ix_risk_signals_project_id", "risk_signals", ["project_id"])
    op.create_index("ix_risk_signals_signal_type", "risk_signals", ["signal_type"])

    # ── 13. recommendations ───────────────────────────────────────────────────
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column(
            "action_type",
            postgresql.ENUM(
                "remind_customer_admin", "escalate_blocker", "reschedule_training",
                "shift_projected_go_live", "assign_technical_specialist",
                name="recommendationactiontype", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dismissed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"], ["onboarding_projects.id"], ondelete="CASCADE",
            name="fk_recommendations_project_id",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"], ["tasks.id"], ondelete="SET NULL",
            name="fk_recommendations_task_id",
        ),
    )
    op.create_index("ix_recommendations_id", "recommendations", ["id"])
    op.create_index("ix_recommendations_project_id", "recommendations", ["project_id"])
    # Partial index: undismissed recommendations (the only ones surfaced to users)
    op.execute(
        "CREATE INDEX ix_recommendations_project_active "
        "ON recommendations (project_id, priority DESC) "
        "WHERE dismissed = false"
    )

    # ── 14. Enable RLS on user-owned tables ───────────────────────────────────
    for tbl in [
        "profiles",
        "customers",
        "crm_deals",
        "onboarding_projects",
        "tasks",
        "onboarding_events",
        "risk_signals",
        "recommendations",
        "user_playbook_seed_audit",
    ]:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY")

    # ── 15. Grant table privileges to Supabase roles ──────────────────────────
    # `authenticated` is Supabase's built-in role for logged-in users.
    # Service-role (used by Supabase internals) bypasses RLS by default.
    for tbl in [
        "profiles",
        "customers",
        "crm_deals",
        "onboarding_projects",
        "tasks",
        "onboarding_events",
        "risk_signals",
        "recommendations",
        "onboarding_playbooks",
        "user_playbook_seed_audit",
    ]:
        op.execute(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON {tbl} TO authenticated"
        )

    # Sequences must be granted separately so INSERT (autoincrement) works
    for seq in [
        "customers_id_seq",
        "crm_deals_id_seq",
        "onboarding_projects_id_seq",
        "tasks_id_seq",
        "onboarding_events_id_seq",
        "risk_signals_id_seq",
        "recommendations_id_seq",
        "onboarding_playbooks_id_seq",
    ]:
        op.execute(f"GRANT USAGE ON SEQUENCE {seq} TO authenticated")

    # ── 16. RLS Policies ─────────────────────────────────────────────────────
    # profiles: own row only
    op.execute("""
        CREATE POLICY "profiles_own_row"
        ON profiles FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    """)

    # customers: owned by auth user
    op.execute("""
        CREATE POLICY "customers_owner"
        ON customers FOR ALL
        TO authenticated
        USING (owner_user_id = auth.uid())
        WITH CHECK (owner_user_id = auth.uid())
    """)

    # crm_deals: owned by auth user
    op.execute("""
        CREATE POLICY "crm_deals_owner"
        ON crm_deals FOR ALL
        TO authenticated
        USING (owner_user_id = auth.uid())
        WITH CHECK (owner_user_id = auth.uid())
    """)

    # onboarding_projects: accessible when parent customer is owned by auth user
    op.execute("""
        CREATE POLICY "projects_via_customer_owner"
        ON onboarding_projects FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM customers c
                WHERE c.id = onboarding_projects.customer_id
                  AND c.owner_user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM customers c
                WHERE c.id = onboarding_projects.customer_id
                  AND c.owner_user_id = auth.uid()
            )
        )
    """)

    # tasks: accessible when parent project's customer is owned by auth user
    op.execute("""
        CREATE POLICY "tasks_via_project_owner"
        ON tasks FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = tasks.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = tasks.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
    """)

    # onboarding_events: same ancestry check as tasks
    op.execute("""
        CREATE POLICY "events_via_project_owner"
        ON onboarding_events FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = onboarding_events.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = onboarding_events.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
    """)

    # risk_signals
    op.execute("""
        CREATE POLICY "risk_signals_via_project_owner"
        ON risk_signals FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = risk_signals.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = risk_signals.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
    """)

    # recommendations
    op.execute("""
        CREATE POLICY "recommendations_via_project_owner"
        ON recommendations FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = recommendations.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM onboarding_projects p
                JOIN customers c ON c.id = p.customer_id
                WHERE p.id = recommendations.project_id
                  AND c.owner_user_id = auth.uid()
            )
        )
    """)

    # user_playbook_seed_audit: own row only
    op.execute("""
        CREATE POLICY "seed_audit_own_row"
        ON user_playbook_seed_audit FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    """)

    # onboarding_playbooks: all authenticated users can read; only service/postgres writes
    op.execute("""
        CREATE POLICY "playbooks_read_all"
        ON onboarding_playbooks FOR SELECT
        TO authenticated
        USING (true)
    """)
    op.execute("""
        CREATE POLICY "playbooks_own_custom"
        ON onboarding_playbooks FOR INSERT
        TO authenticated
        WITH CHECK (is_system_template = false AND owner_user_id = auth.uid())
    """)


# ---------------------------------------------------------------------------
# Downgrade — restore previous 2-migration state
# ---------------------------------------------------------------------------

def downgrade() -> None:
    # Drop all app tables (order respects FKs)
    for tbl in [
        "recommendations",
        "risk_signals",
        "onboarding_events",
        "tasks",
        "onboarding_projects",
        "crm_deals",
        "customers",
        "user_playbook_seed_audit",
        "onboarding_playbooks",
        "profiles",
    ]:
        _drop_table_if_exists(tbl)

    for enum_name in [
        "recommendationactiontype",
        "eventtype",
        "tasktype",
        "taskstatus",
        "onboardingstage",
        "risklevel",
        "projectstatus",
        "dealstatus",
        "customertype",
    ]:
        _drop_enum_if_exists(enum_name)
