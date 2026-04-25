# Onboarding Flow — Source of Truth

Derived from:

* Codebase (routes/suppliers.ts, schema, services)
* Validated system behavior
* Updated security and compliance endpoints

Last Updated: 2026-04-25

---

## 0. Classification

All sections are explicitly tagged:

* CURRENT_STATE → validated from code
* GAP → inconsistency, risk, or missing capability
* TARGET_STATE → desired future behavior (from ops roadmap)
* FIXED → gap resolved

---

## 1. Definition

Onboarding is initiated by a single API call:

POST /api/suppliers/onboard

But functionally executes as a **multi-stage pipeline**:

* Synchronous data capture (DB inserts)
* Asynchronous scoring (AI)
* Asynchronous evaluation (graduation)

---

## 2. Execution Model

### CURRENT_STATE

#### Phase 1 — Synchronous (Blocking HTTP Response)

```text
Client → POST /api/suppliers/onboard
           │
           ├─ Insert: suppliers
           ├─ Insert: farms
           ├─ Insert: economics
           ├─ Insert: compliance_docs (idempotent, seeds ica_registro from body)
           ├─ Update: compliance_docs.ica_registro = true (if ica_registered === true)
           ├─ Insert: interactions (metadata JSONB)
           └─ Return HTTP 201
```

---

#### Phase 2 — Async Scoring (Fire-and-Forget)

```text
scoreSupplier()
→ buildScoringInput() [reads supplier, farm, economics, compliance_docs]
→ Claude API call (claude-haiku-4-5)
→ validate output (Number.isFinite)
→ insert ai_outputs
→ send WhatsApp (Twilio)
→ retry (1s, 2s, 4s) on any error
→ logger.error + Sentry on final failure
```

---

#### Phase 3 — Async Evaluation

```text
evaluateSupplier()
→ read ai_outputs + compliance_docs
→ compute eligibility + sellableStatus
→ insert supplier_evaluations (append-only snapshot)
→ insert supplier_state_transitions (actor = SYSTEM)
→ update suppliers (denormalized state fields)
→ retry on NotFoundError (missing ai_outputs)
```

---

## 3. Data Collection (By Step)

### Step 1 — Identity (CURRENT_STATE)

Stored in `suppliers`

* nombreCompleto
* whatsappNumber (unique)
* municipio, department, vereda
* supplierType
* registeredBy
* consentGiven

---

### Step 2 — Farm Profile (CURRENT_STATE)

Stored in `farms`

Key issue:

GAP:

* `harvest_months` incorrectly mapped to `variedad_cafe`

---

### Step 3 — Economic Profile (CURRENT_STATE)

Stored in `economics`

GAP:

* `volumen_kg_ultima_cosecha` receives string → integer mismatch ⚠
* To be resolved in Epic 2 T3 (validation layer)

---

### Step 4 — Extended Compliance Inputs (CURRENT_STATE)

Stored in `interactions.metadata` (JSONB)

Includes:

* has_rut
* ica_registered (also synced to compliance_docs — see Section 14)
* business_structure
* certifications
* bank account
* etc.

---

### ⚠ PARTIAL GAP — Compliance Input Disconnect

CURRENT_STATE:

* `ica_registered` is now synced to `compliance_docs.ica_registro` (H1 fix — P0.1)
* All other compliance signals (has_rut, bank_account, etc.) remain in interactions.metadata only
* Evaluation reads ONLY `compliance_docs` — other onboarding inputs still do not affect eligibility

GAP (remaining):

* `has_rut`, `vuce_registered`, `invima_approved`, and other onboarding compliance signals are ignored by the eligibility gate
* Supplier-provided compliance is still partially ignored
* Admin must manually update `compliance_docs` to reflect remaining fields

IMPACT:

* Eligibility is partially admin-controlled for non-ICA fields
* Onboarding captures data that isn't fully acted upon

TARGET_STATE:

* Unified compliance model where onboarding inputs automatically populate `compliance_docs`
* Epic 2 T4 (compliance alignment) will resolve this

---

### Step 5 — Compliance Initialization (CURRENT_STATE)

Stored in `compliance_docs`

* `ica_registro` seeded from `ica_registered` in the onboarding body (P0.1 fix)
* All other fields default to false
* Created idempotently via `ON CONFLICT (supplier_id) DO NOTHING`
* Updated via:
  PATCH /api/admin/suppliers/:id/compliance (ADMIN only)

---

### Step 6 — Interaction Log (CURRENT_STATE)

Stored in `interactions`

* type: FORM_SUBMISSION
* metadata: Step 4 inputs (JSONB)

---

## 4. AI Scoring (CURRENT_STATE)

Stored in `ai_outputs`

* exportReadinessScore (0–100)
* pathway (A/B/C/D) ⚠ undefined internally (no internal pathway business logic yet)
* gap analysis fields

Behavior:

* `buildScoringInput()` abstracts DB reads into typed `ScoringInput` contract (Epic 2 T2)
* Retries all errors (3 attempts, exponential backoff: 1s, 2s, 4s)
* `Number.isFinite` validation on score — throws on invalid output, triggers retry
* Logs latency per Claude API call
* Sends WhatsApp on success
* `logger.error` + Sentry on final failure (no silent drops)

---

## 5. Evaluation (CURRENT_STATE)

Reads:

* ai_outputs (validated)
* compliance_docs
* suppliers

Computes:

* eligibilityStatus (PASS/FAIL based on 4 compliance fields + consentGiven)
* sellableStatus (NOT_READY/ELIGIBLE/SELLABLE based on commercialScore thresholds)

Writes:

* supplier_evaluations (append-only, immutable after insert)
* supplier_state_transitions (actor = SYSTEM, evaluationId linked)
* suppliers (denormalized state fields updated)

---

## 6. Eligibility Gate (CURRENT_STATE)

Requires ALL (reads from `compliance_docs`):

* rutDian
* icaRegistro (now synced from onboarding body — P0.1)
* fitosanitarioCert
* consentGiven

---

## 7. Access & Visibility

### CURRENT_STATE

| Data              | Supplier     | Admin | Public                         |
| ----------------- | ------------ | ----- | ------------------------------ |
| suppliers         | ❌            | ✔     | ❌ ADMIN-only (P0.2 fixed)      |
| GET /suppliers/:id | ❌           | ✔     | ❌ ADMIN-only (P0.4 fixed)      |
| farms / economics | ❌            | ✔     | ❌                              |
| compliance_docs   | ❌            | ✔     | ❌                              |
| ai_outputs        | ❌            | ✔     | ❌                              |
| evaluations       | ❌            | ✔     | ❌ (secured)                    |
| transitions       | ❌            | ✔     | ❌ (secured)                    |
| marketplace       | ✔ (indirect) | ✔     | ✔ (SELLABLE/PUBLISHED only)    |

All security exposure gaps from H4 and H4-B are FIXED.

---

## 8. Async Dependency Chain

### CURRENT_STATE

* evaluation depends on ai_outputs existing
* retries limited to 3 attempts (then Sentry capture)
* WhatsApp send is non-blocking within scoring phase

---

### GAP

* no recovery if scoring fails permanently after all retries
* supplier can remain unevaluated if process crashes mid-retry

---

### TARGET_STATE

* durable job queue with persistent retries across restarts
* reprocessing mechanism for permanently-failed suppliers

---

## 9. UX Feedback Loop

### CURRENT_STATE

* supplier submits onboarding
* WhatsApp message sent on successful scoring
* no in-app visibility into scoring, evaluation, or status

---

### GAP

* no supplier dashboard
* no in-app progression guidance
* no next-steps communication

---

### TARGET_STATE

* supplier dashboard (Phase 2 — System Hardening)
* status + next steps visible to supplier
* guided progression toward SELLABLE

---

## 10. Data Lifecycle

```text
Input (onboarding)
→ suppliers / farms / economics / interactions.metadata
→ compliance_docs (seeded + ica_registered synced)
→ ai_outputs (AI scoring via Claude)
→ supplier_evaluations (decision snapshot)
→ supplier_state_transitions (audit log)
→ suppliers (state update — denormalized)
→ marketplace exposure (SELLABLE/PUBLISHED only)
```

---

## 11. Key Risks

### HIGH

* Async scoring dependency without durable recovery (no queue)
* Compliance input partially ignored by eligibility gate (non-ICA fields)

### MEDIUM

* Data type mismatch (economics — volumen_kg_ultima_cosecha)
* Incorrect field mapping (harvest_months → variedad_cafe)
* Supplier invisibility (no dashboard)
* SupplierDetail UI calling ADMIN-only route (Epic 2 blocker)

### LOW

* Naming inconsistencies (Spanish/English field mixing)

### RESOLVED

* Public supplier dataset exposure (H4 — FIXED P0.2)
* GET /suppliers/:id unguarded (H4-B — FIXED P0.4)
* ICA sync disconnect (H1 — FIXED P0.1)

---

## 12. TARGET_STATE (From Ops)

Onboarding should:

* Produce deterministic evaluation
* Use unified compliance model (all fields from onboarding → compliance_docs)
* Provide supplier feedback (dashboard, WhatsApp status)
* Support re-evaluation (admin-triggered or automatic)
* Integrate with product layer (Epic 2)

---

## 13. Summary

The onboarding system today:

* Correctly captures data across all steps
* Executes scoring + evaluation pipeline reliably
* Produces valid system state with full audit trail
* ICA compliance now correctly synced

BUT:

* Other compliance inputs still ignored by eligibility gate
* Provides no supplier in-app visibility (WhatsApp only)
* Depends on in-process async execution (no durable queue)
* SupplierDetail UI blocked pending buyer-facing route

---

## 14. ICA Sync Fix (Epic 2 Precondition — DONE)

### Problem (PREVIOUS STATE)

* Onboarding captured `ica_registered` from body
* Stored only in `interactions.metadata` (JSONB)
* `compliance_docs.ica_registro` defaulted to `false` for all new suppliers
* Eligibility gate read `compliance_docs.ica_registro` — ignored onboarding input
* Supplier declaring ICA registration still failed the eligibility gate

---

### Fix (CURRENT_STATE)

Two-step sync in `POST /api/suppliers/onboard`:

**Step 1 — INSERT seeds value for new rows**

```
INSERT INTO compliance_docs (supplier_id, ica_registro)
VALUES (?, ica_registered === true)
ON CONFLICT (supplier_id) DO NOTHING
```

**Step 2 — UPDATE enforces value for existing rows**

```
if (ica_registered === true) {
  UPDATE compliance_docs
  SET ica_registro = true
  WHERE supplier_id = ?

  log: "ICA sync applied", supplierId
}
```

---

### Behaviour

| Scenario | ica_registered | Result |
|---|---|---|
| New supplier, ica_registered = true | true | ica_registro = true (INSERT + UPDATE) |
| New supplier, ica_registered = false | false | ica_registro = false (INSERT, no UPDATE) |
| Existing row, ica_registered = true | true | ica_registro = true (UPDATE only) |
| Existing row, ica_registered = false | false | ica_registro unchanged (no UPDATE) |

---

### Safety

* Never downgrades a value (only syncs `true`, never overwrites `true` → `false`)
* Respects UNIQUE constraint on `compliance_docs.supplier_id`
* No schema changes
* Does not affect evaluation logic

---

## 15. T1 — SupplierOnboardingInput Wired (Epic 2 — DONE)

**Status:** Complete
**Date:** 2026-04-24

`SupplierOnboardingInput` interface wired into `POST /suppliers/onboard` via a `Partial<SupplierOnboardingInput>` normalization block (`typedInput`). Additive only — no runtime behavior altered.

Pattern introduced:

```
LEGACY INPUT (rawBody)
→ NORMALIZATION EXTRACTION (typedInput)
→ FUTURE CONSUMERS (T2 scoring, T3 validation, T4 DB writes)
```

---

## 16. T2 — buildScoringInput Abstraction (Epic 2 — DONE)

**Status:** Complete
**Date:** 2026-04-24

`buildScoringInput` introduced in `artifacts/api-server/src/services/scoring-input.ts`. Extracts 4 DB reads (supplier, farm, economics, compliance_docs) from `scoreSupplier` into typed `ScoringInput` contract. Destructured inside `attemptScore` (retry-loop placement preserves per-attempt fresh-read behaviour). Dev-only `logger.debug` of AI input added.

---

END
