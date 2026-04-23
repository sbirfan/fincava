# Epic 1 — Supplier Graduation System

## 1. Objective

Build a reliable, deterministic pipeline that takes a supplier from onboarding to marketplace readiness, with full auditability and no silent failures.

---

## 2. System Overview

Epic 1 establishes the core supply pipeline:

* Onboarding → async AI scoring → deterministic evaluation → state transitions → marketplace exposure
* Clear separation:

  * **Scoring (AI, probabilistic)**
  * **Evaluation (rules-based, deterministic)**

This ensures consistency, traceability, and operational reliability.

---

## 3. User Experience Flow

Step-by-step:

1. Supplier submits onboarding form  
2. System creates supplier record  
3. System initializes compliance record (all fields set to false)  

4. System triggers AI scoring asynchronously (non-blocking)  

5. AI scoring process:
   - Calls external AI service (Claude)
   - Validates response (export_readiness_score must be a finite number)
   - Stores result in `ai_outputs`

6. Evaluation process (`evaluateSupplier`):
   - Reads AI output
   - Validates required fields exist
   - Computes:
     - eligibilityStatus
     - commercialScore
     - sellableStatus

7. System writes evaluation result:
   - Inserts row into `supplier_evaluations`
   - Updates supplier fields

8. System records state transition:
   - Inserts row into `supplier_state_transitions`
   - actor = SYSTEM
   - evaluationId linked

9. Outcome:
   - If FAIL → supplier remains NOT_READY
   - If PASS → supplier becomes SELLABLE

10. Marketplace exposure:
   - Only SELLABLE or PUBLISHED suppliers appear in marketplace API

11. Optional admin actions:
   - Admin can override status (transition)
   - Admin can publish supplier (SELLABLE → PUBLISHED)

---

Flow Summary:

Onboard  
→ Async AI Scoring  
→ AI Output Stored  
→ Evaluate Supplier  
→ State Transition  
→ Marketplace Visibility

### Steps

1. Supplier submits onboarding form
2. Supplier record created
3. Compliance initialized (all false, 1:1)
4. AI scoring triggered asynchronously
5. Score stored in `ai_outputs`
6. `evaluateSupplier` runs
7. Eligibility + sellable status computed
8. SYSTEM transition recorded
9. Supplier appears in marketplace if SELLABLE
10. Admin can override/publish if needed

---

## 4. Architecture

The system is organized into layered components with clear separation of concerns.

### 1. Frontend Layer
- Handles user interaction (onboarding, marketplace view)
- Calls API endpoints
- Does not contain business logic

---

### 2. API Layer
- Entry point for all requests
- Routes:
  - /api/suppliers/onboard
  - /api/suppliers
  - /api/suppliers/:id
  - /api/suppliers/marketplace
  - admin routes

Responsibilities:
- Input validation
- Authentication (for admin routes)
- Delegation to services

---

### 3. Service Layer

#### scoreSupplier (AI Scoring)
- Triggered asynchronously after onboarding
- Calls external AI (Claude)
- Retries on failure (1s, 2s, 4s)
- Validates output (Number.isFinite)
- Stores result in ai_outputs
- Logs latency and failures
- No silent errors (Sentry + logger)

---

#### evaluateSupplier (Decision Engine)
- Reads AI output
- Validates presence of required fields
- Applies business rules
- Computes:
  - eligibilityStatus
  - commercialScore
  - sellableStatus
- Writes:
  - supplier_evaluations
  - supplier_state_transitions
- Updates supplier record
- Deterministic (no partial writes)

---

### 4. Database Layer

Core tables:

- suppliers
  - main entity
  - stores current state

- ai_outputs
  - stores AI scoring results
  - filtered by call_type

- compliance_docs
  - 1:1 with supplier (UNIQUE constraint)
  - represents current compliance state

- supplier_evaluations
  - snapshot of each evaluation

- supplier_state_transitions
  - audit log of state changes
  - includes actor and justification

---

### 5. Async Execution Model

- scoreSupplier runs in fire-and-forget mode
- evaluateSupplier runs after scoring
- Both include retry logic
- API responses are never blocked by scoring

---

### 6. Observability Layer

- Structured logging (info, warn, error)
- Latency tracking for AI calls
- Error capture via Sentry
- No silent failures anywhere in pipeline

---

### Architecture Summary

Frontend  
→ API Layer  
→ Service Layer (Scoring + Evaluation)  
→ Database  

Side components:
- Async execution (non-blocking)
- Logging + monitoring

### Components

* **API**

  * `/api/suppliers/onboard`
  * supplier read endpoints
  * admin endpoints
* **Services**

  * `scoreSupplier` (async, retries, validation, latency logs)
  * `evaluateSupplier` (deterministic decision engine)
* **Database**

  * suppliers, ai_outputs, compliance_docs (1:1), supplier_evaluations, supplier_state_transitions
* **Async**

  * fire-and-forget with bounded retries
* **Observability**

  * structured logs + Sentry

---

## 5. Key Decisions

* Separate scoring from evaluation
* Async, non-blocking onboarding
* No evaluation without valid AI output
* Compliance as current state (UNIQUE supplier_id)
* Audit-first: evaluations + transitions
* No silent failures (logs + Sentry)

---

## 6. Data Model

* **suppliers** (status fields)
* **ai_outputs** (call_type = ONBOARD_SCORE)
* **compliance_docs** (1:1, UNIQUE supplier_id)
* **supplier_evaluations** (snapshots)
* **supplier_state_transitions** (audit log)

---

## 7. API Surface

* `POST /api/suppliers/onboard`
* `GET /api/suppliers`
* `GET /api/suppliers/:id`
* `GET /api/suppliers/:id/evaluations`
* `GET /api/suppliers/:id/transitions`
* `GET /api/suppliers/marketplace`
* Admin:

  * `POST /api/admin/suppliers/:id/transition`
  * `POST /api/admin/suppliers/:id/publish`

---

## 8. Reliability & Safeguards

* **scoreSupplier**

  * 3 retries (1s/2s/4s), retry on all errors
  * latency logging (Claude)
  * `Number.isFinite` validation
  * final failure → logger.error + Sentry
* **evaluateSupplier**

  * NotFoundError on missing/invalid AI output (no writes)
  * idempotent, transactional
* **Data integrity**

  * UNIQUE(compliance_docs.supplier_id)
  * deterministic queries
* **Async safety**

  * fire-and-forget, non-blocking

---

## 9. Known Limitations

* No durable queue (fire-and-forget)
* Thin supplier marketplace (validation surface)
* No product-level data yet
* Compliance is current-state only (no history)

---

## 10. Phase II / Future

* Queue-based scoring
* Marketplace expansion (filters/search)
* Product + certification data
* Optional compliance history table (separate, not replacing UNIQUE)

---

## 11. Status

* Completed, deployed
* Last Updated: 2026-04-23

---

## Diagram Specs

### epic1-flow.png

Onboard → AI Scoring → AI Output → Evaluate → Decision:

* FAIL → NOT_READY
* PASS → SELLABLE → Marketplace
  Optional: SELLABLE → Admin Publish → PUBLISHED

### epic1-architecture.png

Frontend → API → Services (scoreSupplier, evaluateSupplier) → DB (suppliers, ai_outputs, compliance_docs, evaluations, transitions)
Side: Logging, Sentry, Async execution

END
