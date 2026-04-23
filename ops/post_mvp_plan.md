# Post-MVP System Plan: Monitoring, Queue Architecture, and Roadmap

## Current Epic: 1
## Status: In Progress
## Last Updated: 2026-04-22

---

## 2. Monitoring Dashboard

* Updates:

### Core Metrics

- Evaluations per minute
- Success vs failure counts
- Retry count and average attempts
- Time to sellable status (latency)
- State distribution (NOT_READY, ELIGIBLE, SELLABLE, PUBLISHED)

### Dashboard Layout

1. **System Health:** success rate, failures, retries
2. **Pipeline Timing:** average and max latency
3. **Funnel:** supplier progression through states
4. **Errors:** NotFoundError frequency and unexpected errors

### Implementation

- Use logs or SQL queries for initial metrics
- Example: evaluations per hour query

---

## 3. Queue-Based V2 (Durability Upgrade)

* Updates:

### Problem

Current system uses in-memory async execution (`setImmediate`), which can lose jobs on crash.

### Solution

Introduce a job queue system for durability and retries.

#### Option A: Database-backed Queue

`jobs` table structure:
- `id`, `type`, `payload` (JSONB), `status`, `attempts`, `run_at`, `created_at`

**Flow:**
- Onboarding inserts job
- Worker polls jobs and executes `evaluateSupplier`
- Retries update `attempts` and `run_at`

#### Option B: External Queue (future)

- Redis + BullMQ, SQS, or Kafka

### Retry Strategy

- attempt 1: immediate
- attempt 2: +10s
- attempt 3: +30s
- attempt 4: +2min

### Benefits

- No lost evaluations
- Persistent retries
- Visibility into failed jobs

---

## 4. Post-MVP Roadmap (V2)

* Updates:
  * Added read APIs for supplier evaluation visibility (GET /api/suppliers, GET /api/suppliers/:id)
  * Confirmed supplier table as source of truth for current evaluation state
  * Deferred evaluation history endpoints to Ticket 1.8
  * Added supplier evaluation and transition history APIs
  * Established separation of current state (suppliers table) vs historical state (evaluation + transition tables)
  * Confirmed lightweight history queries (no joins, capped results)
  * Deferred auth enforcement to future admin/security layer
  * Added admin control endpoints for supplier state transitions and publishing
  * Enforced publish gating logic (SELLABLE prerequisite)
  * Introduced role-based access control for admin actions
  * Confirmed strict separation between route validation and service logic
  * Strengthened audit guarantees for manual overrides
  * Defined Phase 2 marketplace expansion (pagination, filtering, search)
  * Identified dependency on product-level and certification data
  * Separated validation endpoint (Phase 1) from production marketplace (Phase 2)
  * Deferred full marketplace build until buyer requirements validated
  * Thin marketplace UI implemented for validation
  * Connected to marketplace endpoint
  * Confirmed Phase 1 (UI + API) complete
  * Phase 2 remains unchanged (no expansion yet)
  * Deferred integration of supplier readiness into marketplace UX
  * Identified risk of premature merging with product marketplace
  * Confirmed validation-first approach
  * Added requirement to remove or redesign supplier marketplace before full marketplace expansion

### Reliability

- Replace `setImmediate` with queue
- Persist retries
- Dead-letter queue

### Observability

- Metrics dashboard
- Alerting on failures
- Correlation tracing

### Performance

- Batch processing
- Worker concurrency

### Data Integrity

- Prevent duplicate evaluations
- Add constraints if needed

### UX / Product

- Admin re-evaluation tools
- Display evaluation history

### AI Pipeline

- Retry scoring separately
- Track latency

### Infrastructure

- Introduce queue system
- Separate worker service

---

## Known Limitations (MVP)

* Updates:

- In-memory async execution
- Limited retry window
- No guaranteed execution on crash

## Upgrade Priority

* Updates:

1. Queue system
2. Monitoring dashboard
3. Alerting
4. Admin tools

---

## ⚠ Architectural Exceptions (Temporary)

### Supplier Marketplace (Validation Surface)

* Route: `/supplier-marketplace`
* Purpose: Phase 1 validation only
* Not part of final product design

### Required Resolution (Phase II)

* Decide:
  * Merge into product marketplace, OR
  * Build standalone supplier discovery experience

* Must NOT:
  * coexist long-term with product marketplace
  * evolve into a second marketplace surface

### Future Consideration — Compliance Versioning

* Current model:
  * compliance_docs is a single-row, current-state table (1:1 with supplier)

* Rationale:
  * Simplifies evaluation logic
  * Ensures deterministic reads
  * Prevents conflicting compliance states

* If future requirements include:
  * audit history of compliance changes
  * version tracking
  * temporal queries

* Then evolve to:
  * compliance_docs_history (append-only table)
  * keep compliance_docs as current snapshot

* IMPORTANT:
  * Do NOT remove UNIQUE constraint to support history
  * Use separate table instead
