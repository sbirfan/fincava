# Execution Map V1 — Cross-Epic Delivery Plan

Purpose: Define end-to-end capability slices across epics. This document guides execution order, ensures user-visible value delivery, and must be updated after each ticket or slice completion.

## Current Epic: 1
## Status: In Progress
## Last Updated: 2026-04-22

---

### Slice 1 — Supplier Visibility

* Status: Done
* Last Updated: 2026-04-22
* Changes:
  * Implemented GET /api/suppliers (list endpoint with evaluation fields)
  * Implemented GET /api/suppliers/:id (detail endpoint with evaluation fields)
  * Verified null handling for non-evaluated suppliers
  * Preserved backward compatibility (no response shape changes)
  * Added GET /api/suppliers/:id/evaluations (evaluation history, DESC, limit 20)
  * Added GET /api/suppliers/:id/transitions (state transition history, DESC, limit 20)
  * Ensured no joins and excluded scoreSnapshot for performance
  * Confirmed empty array vs 404 behavior
  * Completed full supplier visibility layer (current + historical state)

**Goal:** Expose supplier evaluation results and status via API for internal/admin visibility.

**Pulls From:**
- Epic 1 (1.7, 1.8)

**Outputs:**
- Supplier status API
- Evaluation history API

**Dependencies:**
- Tickets 1.1–1.6 complete

**Replit Execution Prompt:**
Implement `GET /api/suppliers` with `sellableStatus`, `eligibilityStatus`, `commercialScore`, `pathway`. Add `GET /api/suppliers/:id/evaluations` and transitions endpoints. Do not modify existing schema.

---

### Slice 2 — Admin Control Layer

* Status: Done
* Last Updated: 2026-04-22
* Changes:
  * Implemented POST /api/admin/suppliers/:id/transition (manual override)
  * Implemented POST /api/admin/suppliers/:id/publish (explicit publish action)
  * Enforced justification requirement for ADMIN and FOUNDER actors
  * Blocked SYSTEM actor usage at route layer
  * Added SELLABLE → PUBLISHED gate validation
  * Integrated requireAuth + requireAdmin guards for admin endpoints
  * Confirmed transition audit integrity (actor, justification, fromState)

**Goal:** Allow admin users to override supplier states with audit enforcement.

**Pulls From:**
- Epic 1 (1.9, 1.10)

**Outputs:**
- Admin transition API
- Publish endpoint with gating

**Dependencies:**
- Slice 1 complete

**Replit Execution Prompt:**
Expose `POST /api/admin/suppliers/:id/transition` using `transitionTo`. Enforce justification required for ADMIN/FOUNDER. Add `POST /publish` endpoint using `markPublished` with threshold checks.

---

### Slice 3 — Buyer-Ready Supply

* Status: Not Started
* Last Updated: 2026-04-22
* Changes:

**Goal:** Expose SELLABLE suppliers for external consumption.

**Pulls From:**
- Epic 1
- Marketplace Epic (future)

**Outputs:**
- Filtered supplier listing (SELLABLE only)

**Dependencies:**
- Slice 2 complete (publish gate enforced)

**Replit Execution Prompt:**
Create `GET /api/suppliers?sellable=true` filtering `sellableStatus=SELLABLE` or `PUBLISHED`. Ensure no unpublished suppliers leak.

---

### Slice 4 — AI Scoring Reliability

* Status: Not Started
* Last Updated: 2026-04-22
* Changes:

**Goal:** Improve robustness of AI scoring pipeline.

**Pulls From:**
- Epic 1 service layer
- Future AI improvements

**Outputs:**
- Retry logic for scoring
- Validation of AI outputs

**Dependencies:**
- Existing scoring system

**Replit Execution Prompt:**
Add retry logic to `scoreSupplier`. Validate `exportReadinessScore` is non-null. Log scoring latency and failures.

---

### Slice 5 — System Durability (V2)

* Status: Not Started
* Last Updated: 2026-04-22
* Changes:

**Goal:** Ensure no evaluation jobs are lost using a queue-based architecture.

**Pulls From:**
- Post-MVP System Plan

**Outputs:**
- Job queue
- Worker service
- Persistent retries

**Dependencies:**
- All previous slices stable

**Replit Execution Prompt:**
Create `jobs` table. Insert evaluation job on onboarding instead of `setImmediate`. Build worker to process jobs and retry with backoff. Do not modify evaluation logic.

---

## Maintenance Instructions

After each ticket:
- Update slice status
- Add new dependencies
- Adjust execution order if needed
- Record new risks or learnings
