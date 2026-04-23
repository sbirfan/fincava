# Epic 1 — Supplier Graduation System

## 1. Objective

Build a reliable pipeline from supplier onboarding to marketplace readiness.

## 2. System Overview

[Insert summary]

## 3. User Experience Flow

(Placeholder — image to be added)

Step-by-step:

1. Supplier onboarding
2. AI scoring
3. Evaluation
4. Transition
5. Marketplace exposure

## 4. Architecture

(Placeholder — image to be added)

## 5. Key Decisions

* Async scoring (non-blocking)
* Separation of scoring vs evaluation
* Deterministic compliance model

## 6. Data Model

* suppliers
* ai_outputs
* supplier_evaluations
* supplier_state_transitions
* compliance_docs (1:1)

## 7. API Surface

* /api/suppliers
* /api/suppliers/:id
* /api/suppliers/marketplace
* admin routes

## 8. Reliability & Safeguards

* Retry logic
* Validation
* Logging + Sentry
* No silent failures

## 9. Known Limitations

* No queue (fire-and-forget)
* Thin marketplace UI

## 10. Phase II / Future Enhancements

* Queue-based scoring
* Marketplace expansion
* Product-level data

## 11. Status

Completed

# Epic 1 — Supplier Graduation System

## 1. Objective

Build a reliable, deterministic pipeline that takes a supplier from onboarding to marketplace readiness, with full auditability and no silent failures.

---

## 2. System Overview

Epic 1 establishes the core supply pipeline:

* Suppliers onboard through an API
* AI scoring generates an export readiness score
* A deterministic evaluation service decides eligibility and sellability
* State transitions are recorded as an auditable history
* Only qualified suppliers are exposed to the marketplace

The system separates:

* **Scoring (AI, probabilistic input)**
* **Evaluation (rules-based, deterministic decision)**

This ensures consistency, traceability, and operational reliability.

---

## 3. User Experience Flow

![Supplier Flow](./assets/epic1-flow.png)

### Step-by-step

1. Supplier submits onboarding form
2. Supplier record is created
3. Compliance record initialized (all false)
4. AI scoring triggered asynchronously
5. Score stored in `ai_outputs`
6. `evaluateSupplier` runs
7. Eligibility + sellable status computed
8. State transition recorded (SYSTEM)
9. Supplier becomes visible in marketplace if SELLABLE
10. Admin can override or publish if needed

---

## 4. Architecture

![Architecture Diagram](./assets/epic1-architecture.png)

### Components

* **API Layer**

  * `/api/suppliers/onboard`
  * supplier read endpoints
  * admin endpoints

* **Services**

  * `scoreSupplier` (AI scoring, async)
  * `evaluateSupplier` (decision engine)

* **Database**

  * suppliers
  * ai_outputs
  * compliance_docs
  * supplier_evaluations
  * supplier_state_transitions

* **Async Execution**

  * fire-and-forget pattern
  * retry + backoff

* **Observability**

  * structured logging
  * Sentry error capture

---

## 5. Key Decisions

### 1. Separation of Concerns

* AI scoring does NOT decide outcomes
* Evaluation service owns business logic

### 2. Async Scoring (Non-blocking)

* Onboarding response is immediate
* Scoring happens in background

### 3. Deterministic Evaluation

* No evaluation without valid score
* No silent fallbacks

### 4. Compliance as 1:1 State

* `compliance_docs` has UNIQUE(supplier_id)
* Represents current state only (not history)

### 5. Audit-First Design

* Every decision → evaluation row
* Every state change → transition row

### 6. Failure Visibility

* No silent drops
* All failures logged and sent to Sentry

---

## 6. Data Model

### Tables

#### suppliers

* core entity
* includes sellableStatus, eligibilityStatus, commercialScore

#### ai_outputs

* stores AI scoring results
* filtered by `call_type = ONBOARD_SCORE`

#### compliance_docs

* 1:1 with supplier
* initialized at onboarding
* updated via UPDATE (never re-inserted)

#### supplier_evaluations

* snapshot of each evaluation run
* includes score, eligibility, pathway, thresholdVersion

#### supplier_state_transitions

* audit log of state changes
* includes actor (SYSTEM / ADMIN)
* linked to evaluationId

---

## 7. API Surface

### Supplier APIs

* `POST /api/suppliers/onboard`
* `GET /api/suppliers`
* `GET /api/suppliers/:id`

### History APIs

* `GET /api/suppliers/:id/evaluations`
* `GET /api/suppliers/:id/transitions`

### Marketplace API

* `GET /api/suppliers/marketplace`

  * only SELLABLE / PUBLISHED
  * minimal response shape

### Admin APIs

* `POST /api/admin/suppliers/:id/transition`
* `POST /api/admin/suppliers/:id/publish`

---

## 8. Reliability & Safeguards

### Scoring (scoreSupplier)

* 3 retries with exponential backoff (1s, 2s, 4s)
* latency logging for Claude API
* output validation (`Number.isFinite`)
* final failure → logger.error + Sentry

### Evaluation (evaluateSupplier)

* retry on missing AI output (NotFoundError)
* no partial writes
* idempotent behavior

### Data Integrity

* UNIQUE constraint on compliance_docs(supplier_id)
* deterministic query ordering
* no duplicate compliance rows

### Async Safety

* fire-and-forget execution
* no blocking API responses

---

## 9. Known Limitations

* No job queue (fire-and-forget only)
* No automatic recovery if scoring fails permanently
* Thin marketplace UI (validation only)
* No product-level data yet
* Compliance model is current-state only (no history)

---

## 10. Phase II / Future Enhancements

### Reliability

* Queue-based scoring (durable jobs)
* Automatic retry/recovery pipeline

### Marketplace

* Pagination, filtering, search
* Supplier + product integration

### Data Enrichment

* Product catalog
* Certifications
* Availability and pricing

### Compliance Evolution

* Introduce `compliance_docs_history` if versioning needed

---

## 11. Status

* Epic: Completed
* Production: Deployed
* Last Updated: 2026-04-23

---

# Diagram Specifications

## 1. Flow Diagram (epic1-flow.png)

Nodes:

Onboard → AI Scoring → AI Output Stored → Evaluate Supplier →
[Decision: PASS / FAIL] →
FAIL → NOT_READY
PASS → SELLABLE → Marketplace

Optional branch:
SELLABLE → Admin Publish → PUBLISHED

---

## 2. Architecture Diagram (epic1-architecture.png)

Layers:

Frontend
↓
API Layer
↓
Services:

* scoreSupplier
* evaluateSupplier

↓
Database:

* suppliers
* ai_outputs
* compliance_docs
* evaluations
* transitions

Side components:

* Logging
* Sentry
* Async execution (setImmediate)

---

END
