# Onboarding Flow — Source of Truth

Derived from:

* Codebase (routes/suppliers.ts, schema, services)
* Validated system behavior
* Updated security and compliance endpoints

---

## 0. Classification

All sections are explicitly tagged:

* CURRENT_STATE → validated from code
* GAP → inconsistency, risk, or missing capability
* TARGET_STATE → desired future behavior (from ops roadmap)

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
           ├─ Insert: compliance_docs (idempotent)
           ├─ Insert: interactions (metadata JSONB)
           └─ Return HTTP 201
```

---

#### Phase 2 — Async Scoring (Fire-and-Forget)

```text
scoreSupplier()
→ Claude API call
→ validate output
→ insert ai_outputs
→ send WhatsApp
→ retry (1s, 2s, 4s)
```

---

#### Phase 3 — Async Evaluation

```text
evaluateSupplier()
→ read ai_outputs + compliance_docs
→ compute eligibility + sellableStatus
→ insert supplier_evaluations
→ insert supplier_state_transitions
→ update suppliers
→ retry (NotFoundError)
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

---

### Step 4 — Extended Compliance Inputs (CURRENT_STATE)

Stored in `interactions.metadata` (JSONB)

Includes:

* has_rut
* ica_registered
* business_structure
* certifications
* bank account
* etc.

---

### ⚠ CRITICAL GAP — Compliance Input Disconnect

CURRENT_STATE:

* onboarding collects compliance signals (metadata)
* evaluation reads ONLY compliance_docs

GAP:

* onboarding inputs DO NOT affect eligibility
* supplier-provided compliance is ignored

IMPACT:

* eligibility effectively admin-controlled
* onboarding is misleading

TARGET_STATE:

* explicit mapping OR unified compliance model

---

### Step 5 — Compliance Initialization (CURRENT_STATE)

Stored in `compliance_docs`

* All fields default to false
* Created idempotently
* Updated via:
  PATCH /api/admin/suppliers/:id/compliance (ADMIN only)

---

### Step 6 — Interaction Log (CURRENT_STATE)

Stored in `interactions`

* type: FORM_SUBMISSION
* metadata: Step 4 inputs

---

## 4. AI Scoring (CURRENT_STATE)

Stored in `ai_outputs`

* exportReadinessScore
* pathway (A/B/C/D) ⚠ undefined internally
* gap analysis fields

Behavior:

* retries all errors (3 attempts)
* validates score
* logs latency
* sends WhatsApp

---

## 5. Evaluation (CURRENT_STATE)

Reads:

* ai_outputs
* compliance_docs
* suppliers

Computes:

* eligibilityStatus
* sellableStatus

Writes:

* supplier_evaluations
* supplier_state_transitions
* suppliers (denormalized fields)

---

## 6. Eligibility Gate (CURRENT_STATE)

Requires ALL:

* rutDian
* icaRegistro
* fitosanitarioCert
* consentGiven

---

## 7. Access & Visibility

### CURRENT_STATE

| Data              | Supplier     | Admin | Public                 |
| ----------------- | ------------ | ----- | ---------------------- |
| suppliers         | ❌            | ✔     | ⚠ via `/api/suppliers` |
| farms / economics | ❌            | ✔     | ❌                      |
| compliance_docs   | ❌            | ✔     | ❌                      |
| ai_outputs        | ❌            | ✔     | ❌                      |
| evaluations       | ❌            | ✔     | ❌ (now secured)        |
| transitions       | ❌            | ✔     | ❌ (now secured)        |
| marketplace       | ✔ (indirect) | ✔     | ✔                      |

---

### ⚠ HIGH RISK

CURRENT_STATE:

* `/api/suppliers` exposes full dataset publicly

---

## 8. Async Dependency Chain

### CURRENT_STATE

* evaluation depends on ai_outputs
* retries limited (3 attempts)

---

### GAP

* no recovery if scoring fails permanently
* supplier can remain unevaluated forever

---

### TARGET_STATE

* durable job queue
* reprocessing mechanism

---

## 9. UX Feedback Loop

### CURRENT_STATE

* supplier submits onboarding
* receives NO visibility into:

  * scoring
  * evaluation
  * status

---

### GAP

* no feedback loop
* no progression guidance

---

### TARGET_STATE

* supplier dashboard
* status + next steps
* guided progression

---

## 10. Data Lifecycle

```text
Input (onboarding)
→ suppliers / farms / economics / metadata
→ ai_outputs (AI scoring)
→ supplier_evaluations (decision)
→ suppliers (state update)
→ marketplace exposure
```

---

## 11. Key Risks

### HIGH

* Compliance input disconnect
* Public supplier dataset exposure
* Async scoring dependency without recovery

---

### MEDIUM

* Data type mismatch (economics)
* Incorrect field mapping (harvest_months)
* Supplier invisibility

---

### LOW

* Naming inconsistencies

---

## 12. TARGET_STATE (From Ops)

Onboarding should:

* Produce deterministic evaluation
* Use unified compliance model
* Provide supplier feedback
* Support re-evaluation
* Integrate with product layer (Epic 2)

---

## 13. Summary

The onboarding system today:

* Correctly captures data
* Executes scoring + evaluation pipeline
* Produces valid system state

BUT:

* Ignores key onboarding inputs (compliance)
* Provides no supplier visibility
* Depends on fragile async execution
* Exposes internal data publicly

---

## 14. ICA Sync Fix (Epic 2 Precondition)

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

### Scope

* Applies at onboarding submission only
* Admin can still override via `PATCH /api/admin/suppliers/:id/compliance`
* Re-onboarding blocked by `suppliers.whatsapp_number` UNIQUE constraint

---

### Impact on Eligibility Gate

Eligibility now reflects actual supplier-declared ICA status at onboarding time.
Previously: gate always read `false` for ICA.
Now: gate reads `true` if supplier declared `ica_registered: true`.

---

## 15. T1 — SupplierOnboardingInput Wired (Epic 2)

**Status:** Complete
**Date:** 2026-04-24
**Ticket:** Epic 2 T1 — canonical input normalization layer

### Change

`SupplierOnboardingInput` interface wired into `POST /suppliers/onboard` via a `Partial<SupplierOnboardingInput>` normalization block (`typedInput`). This is additive only — no runtime behavior was altered.

Pattern introduced:

```
LEGACY INPUT (rawBody)
→ NORMALIZATION EXTRACTION (typedInput)
→ FUTURE CONSUMERS (T2 scoring, T3 validation, T4 DB writes)
```

### Drift resolved

All 12 interface fields mapped to their rawBody source expressions before wiring. Zero new drift introduced. Pre-existing gaps (G1–G5) and mismatches (M1–M6) carried forward unchanged — documented in the interface Gap Registry.

### Field usage resolved

`typedInput` is declared at the top of the handler (after `rawBody` declaration, before any destructuring). It is not consumed anywhere in the execution path.

### RUT mapping note

`typedInput.rutDian` maps to `rawBody.has_rut` (metadata-level signal only). It does NOT reflect `compliance_docs.rut_dian` used by the eligibility gate. This mismatch is expected and will be resolved in T4 (compliance alignment).

### Schema lag

None. Interface field definitions are consistent with the DB schema. Pre-existing mismatches are documented in the interface's Mismatch Registry (M1–M6).

### TypeScript

Import added: `import type { SupplierOnboardingInput } from '../types/supplier-onboarding'`
All pre-existing tsc errors in `admin.ts`, `rfqs.ts`, `shipments.ts`, `financing.ts`, and `lib/api-zod` were confirmed pre-existing and not introduced by T1.

---

END
