# Phase 2 Backlog — Onboarding Ops Co-pilot

Additions to implement after the refocus strip is complete. Scope: CRM-to-onboarding automation, risk explainability, recommendations, and customer visibility.

---

## 1. CRM deal ingestion and mapping

- Introduce a **Deal** (or equivalent) source model: opportunity id, stage, value, close date, owner, customer/account link.
- Provide CRM ingestion path: webhook receiver and/or sync job for deal creation/updates.
- No first-class Deal-to-Project conversion yet; this phase is about modeling and ingesting deals.

**Outcome:** Deals exist in the system and can be referenced when creating or linking onboarding projects.

---

## 2. Deal-to-onboarding project conversion

- When a deal closes (or reaches a defined stage), support **creating an onboarding project** from that deal.
- Use **customer type** (and optionally industry) to select the appropriate **playbook/template** for task generation.
- Link the new project to the source deal (e.g. `deal_id` or equivalent on `OnboardingProject`).

**Outcome:** Post-sale teams can turn CRM deals into onboarding projects in one step, with tasks generated from the right playbook.

---

## 3. First-class blocker model

- Add a **Blocker** entity: owner, severity, ETA, status (open/resolved), reason/description, optional link to task or project.
- Expose blocker CRUD and list-by-project (or list-by-account) in API and in the project execution UI.
- Replace or supplement implicit “blocked” state derived only from task/stage-gate logic.

**Outcome:** Blockers are visible, assignable, and trackable with clear reasons and ETAs.

---

## 4. Persistent account health score and explainable risk

- Store a **health score** (and optionally trend/history) per project or account, not only a boolean `risk_flag`.
- Persist **risk reasons** (e.g. overdue tasks, stalled stage, multiple blockers) so at-risk accounts have clear, explainable causes.
- Surface these in the internal project detail view and, where relevant, in portfolio/at-risk views.

**Outcome:** At-risk accounts show a score and explicit reasons (e.g. “2 overdue tasks”, “Stage blocked 5+ days”), enabling prioritization and action.

---

## 5. Next-best-action recommendation queue (live ops)

- Introduce a **Recommendation** (or action) entity tied to live projects/tasks, not only to simulation responses.
- Backend: generate and store recommendations (e.g. “Complete task X”, “Follow up on blocker Y”, “Check risk for project Z”) from rules or a small engine.
- Expose a **recommendation queue** (or “Recommended actions”) in the UI—e.g. on Dashboard and/or Project Detail—with ability to dismiss or mark done.

**Outcome:** Internal teams see a clear, actionable list of next steps derived from live state, not only from the playbook testing simulator.

---

## 6. Customer-facing portal visibility

- Define **visibility rules**: which projects, stages, tasks, or events are visible to the customer (e.g. via a `is_visible_to_customer` or role-based view).
- Implement **customer-facing API surface** (filtered reads) and/or a **customer portal** UI that shows only allowed data (e.g. their onboarding progress, upcoming actions, status).
- Add minimal **auth/identity** for customer users (e.g. by link token or customer-scoped login) so the portal is secure.

**Outcome:** Customers have a dedicated view of their onboarding from kickoff to go-live, while internal teams keep full control and visibility.

---

## Implementation order (suggested)

1. **Deal model + ingestion** (foundation for conversion).  
2. **Deal-to-project conversion** (playbook selection by customer type).  
3. **Blocker model + API + UI** (immediate ops value).  
4. **Health score + risk reasons** (persisted, explainable at-risk).  
5. **Recommendation queue** (live next-best-action).  
6. **Customer portal** (visibility model + API + optional UI).
