# Supplier Persona — Source of Truth
*Derived from: codebase (schema, routes, services) + fincava-architecture.md*
*Validation key: CONFIRMED = in code | PARTIAL = exists but differs | MISSING = not in code | DERIVED = computed*

---

## 1. Identity

| Field | Table/Column | Type | Status |
|---|---|---|---|
| Full name | `suppliers.nombre_completo` | text, required | CONFIRMED |
| WhatsApp number | `suppliers.whatsapp_number` | text, required, unique | CONFIRMED |
| Municipality | `suppliers.municipio` | text, required | CONFIRMED |
| Department | `suppliers.department` | text, nullable | CONFIRMED |
| Vereda | `suppliers.vereda` | text, nullable | CONFIRMED |
| Supplier type | `suppliers.supplier_type` | enum: FARMER \| COOPERATIVE \| EXPORTER | CONFIRMED |
| Registered by | `suppliers.registered_by` | text, nullable (officer name) | CONFIRMED |
| Consent given | `suppliers.consent_given` | boolean | CONFIRMED |
| Consent date | `suppliers.consent_date` | timestamp | CONFIRMED |
| Created at | `suppliers.created_at` | timestamp | CONFIRMED |

> **Note — PROCESSOR missing from enum**: Schema comment references PROCESSOR but it was removed from the `supplier_type` enum. Only FARMER, COOPERATIVE, EXPORTER are valid.

---

## 2. Farm Profile

Stored in `farms` table (1:many with suppliers, though onboarding inserts exactly 1 row).

| Field | Column | Type | Status |
|---|---|---|---|
| Primary crop | `cultivo_principal` | text | CONFIRMED |
| Coffee variety | `variedad_cafe` | text | CONFIRMED |
| Farm size (ha) | `hectareas_produccion` | decimal(6,2) | CONFIRMED |
| Plant age (years) | `edad_plantas_anos` | integer | CONFIRMED |
| Harvests per year | `cosechas_por_ano` | integer | CONFIRMED |
| Drying method | `metodo_secado` | text | CONFIRMED |
| Water access | `acceso_agua` | text | CONFIRMED |
| Years on farm | `anos_en_finca` | integer | CONFIRMED |
| Land tenure | `tenencia_tierra` | text | CONFIRMED |
| Technical assistance | `asistencia_tecnica` | text | CONFIRMED |

---

## 3. Economic Profile

Stored in `economics` table.

| Field | Column | Type | Status |
|---|---|---|---|
| Buyer type | `tipo_comprador` | text | CONFIRMED |
| Volume kg (last harvest) | `volumen_kg_ultima_cosecha` | integer | PARTIAL — schema is integer but code inserts as String; potential type coercion issue |
| Price band | `precio_venta_banda` | text | CONFIRMED |
| Payment days | `tiempo_pago_dias` | integer | CONFIRMED |
| Current debt | `deuda_actual` | text | CONFIRMED |
| Capital use (multi-value) | `uso_capital` | text array | CONFIRMED |
| Payment comfort | `comodidad_pagos` | text | CONFIRMED |
| Dependents | `personas_dependientes` | integer | CONFIRMED |
| Other income sources | `otras_fuentes_ingreso` | text | CONFIRMED |
| Economic situation | `situacion_economica` | text | CONFIRMED |
| Interest in premium channel | `interes_canal_premium` | boolean | CONFIRMED |
| Knows export price | `conoce_precio_exportacion` | boolean | CONFIRMED |
| Has tried to export | `ha_intentado_exportar` | boolean | CONFIRMED |

---

## 4. Compliance State

Stored in `compliance_docs` table — **1:1 with supplier** (UNIQUE constraint on `supplier_id`). Represents current state only, not history.

| Field | Column | Type | Status |
|---|---|---|---|
| RUT DIAN | `rut_dian` | boolean, default false | CONFIRMED |
| ICA registration | `ica_registro` | boolean, default false | CONFIRMED |
| Fitosanitario cert | `fitosanitario_cert` | boolean, default false | CONFIRMED |
| DIAN exportador | `dian_exportador` | boolean, default false | CONFIRMED |
| Compliance score | `compliance_score` | smallint | CONFIRMED in schema, MISSING in code — never written |
| Last reviewed | `last_reviewed_at` | timestamp | CONFIRMED in schema, MISSING in code — never written |

> **Gap**: `compliance_score` and `last_reviewed_at` exist in the table but no code path sets them. They are always null.

### Compliance initialization
Inserted at onboarding via `ON CONFLICT (supplier_id) DO NOTHING` — all fields default to false. Updating compliance requires an explicit `UPDATE` by an admin. There is currently no admin endpoint to update individual compliance fields.

---

## 5. Extended Compliance — Interactions Metadata

Richer compliance assessment captured at onboarding and stored in `interactions.metadata` (JSONB). This is separate from `compliance_docs` and is NOT used in the eligibility gate.

| Field | Type | Status |
|---|---|---|
| `officer_code` | text | CONFIRMED |
| `department` | text | CONFIRMED |
| `organic_certified` | boolean | CONFIRMED |
| `has_rut` | 5-choice string | CONFIRMED |
| `has_bank_account` | 3-choice string | CONFIRMED |
| `business_structure` | string | CONFIRMED |
| `part_of_cooperative` | boolean | CONFIRMED |
| `vuce_registered` | boolean | CONFIRMED |
| `invima_required` | boolean | CONFIRMED |
| `invima_approved` | boolean | CONFIRMED |
| `ica_registered` | boolean | CONFIRMED |

> **Gap**: `ica_registered` is captured in `interactions.metadata` but does NOT sync to `compliance_docs.ica_registro`. These fields exist in parallel with no reconciliation logic.

---

## 6. AI Scoring Attributes

Stored in `ai_outputs` table (one row per Claude call, append-only).

| Field | Column | Type | Status |
|---|---|---|---|
| Export readiness score | `export_readiness_score` | smallint (0–100) | CONFIRMED |
| Pathway | `pathway` | text (A/B/C/D) | PARTIAL — plain text, not the graduation_pathway enum |
| Capital capacity (COP) | `capital_capacity_cop` | integer | CONFIRMED |
| Compliance gaps | `compliance_gaps` | text (comma-joined array) | CONFIRMED |
| Gap analysis | `gap_analysis` | text | CONFIRMED |
| Document content | `document_content` | text | CONFIRMED |
| WhatsApp SID | `whatsapp_message_sent` | text | CONFIRMED |
| AI model | `ai_model` | text | CONFIRMED |
| Call type | `call_type` | text (ONBOARD_SCORE \| DOCUMENT_GENERATION) | CONFIRMED |

> **Note**: Pathway label meaning (A/B/C/D) is not defined in code or schema. Claude assigns it; no internal mapping exists.

---

## 7. Evaluation State

Stored in `supplier_evaluations` (append-only snapshot, one row per `evaluateSupplier()` call).

| Field | Column | Type | Status |
|---|---|---|---|
| Eligibility status | `eligibility_status` | enum: PASS \| FAIL | CONFIRMED |
| Commercial score | `commercial_score` | integer | CONFIRMED |
| Sellable status | `sellable_status` | enum: NOT_READY \| ELIGIBLE \| SELLABLE \| PUBLISHED | CONFIRMED |
| Pathway | `pathway` | graduation_pathway enum (A/B/C/D) | CONFIRMED |
| Score snapshot | `score_snapshot` | JSONB: {exportReadinessScore, pathway, complianceGaps, aiOutputId} | CONFIRMED |
| Threshold version | `threshold_version` | varchar(64), required | CONFIRMED |
| Evaluated at | `evaluated_at` | timestamp | CONFIRMED |

---

## 8. Lifecycle States

Managed by `supplier-graduation-service.ts`. Current state denormalized onto `suppliers` table for query performance.

```
NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
```

| State | Trigger | Condition | Actor |
|---|---|---|---|
| NOT_READY | evaluateSupplier | eligibility FAIL OR score < 30 | SYSTEM |
| ELIGIBLE | evaluateSupplier | eligibility PASS AND 30 ≤ score < 60 | SYSTEM |
| SELLABLE | evaluateSupplier | eligibility PASS AND score ≥ 60 | SYSTEM |
| PUBLISHED | markPublished | must be SELLABLE first (409 if not) | ADMIN or FOUNDER only |

**Eligibility gate — all four must be true** (`lib/config/thresholds.ts`, version `v0_pre_buyer_calls`):
- `rutDian`
- `icaRegistration`
- `fitosanitario`
- `consentGiven`

> ADMIN/FOUNDER can override any transition via `/admin/suppliers/:id/transition` with mandatory justification. SYSTEM is blocked at the route layer.

---

## 9. Visibility Matrix

| Data | Public (unauthenticated) | BUYER (auth) | SUPPLIER (own data) | ADMIN |
|---|---|---|---|---|
| Name, location, sellableStatus | Via `/suppliers/marketplace` (SELLABLE/PUBLISHED only) | Same | CONFIRMED | CONFIRMED |
| Full supplier list (all states) | Via `/suppliers` — NO AUTH REQUIRED ⚠ | Same | Same | Via `/suppliers/admin-list` (richer) |
| Commercial score | Via `/suppliers` (public, no auth) ⚠ | Same | — | CONFIRMED |
| Compliance docs | — | — | — | CONFIRMED |
| AI outputs (score, pathway) | — | — | — | Via `/suppliers/admin-list` |
| Evaluation history | Via `/suppliers/:id/evaluations` (no auth) ⚠ | Same | — | CONFIRMED |
| Transition history | Via `/suppliers/:id/transitions` (no auth) ⚠ | Same | — | CONFIRMED |
| Document content | — | — | — | Via `/suppliers/:id/document` |

> **Risk**: `/suppliers`, `/suppliers/:id/evaluations`, and `/suppliers/:id/transitions` have no authentication guard. Commercial scores and evaluation history are publicly accessible.

---
## 10. Compliance Model — Structural Issue

CURRENT_STATE:
- Three independent representations
- No synchronization
- Eligibility depends on only one

GAP:
- No single source of truth
- Conflicting signals possible

TARGET_STATE:
- Unified compliance model (future)
- Clear ownership of each field

---

## 11. Supplier — Operational Reality

CURRENT_STATE:

- Supplier has NO visibility into:
  - their evaluation
  - their compliance status
  - why they are NOT_READY

- Supplier cannot:
  - update compliance
  - trigger re-evaluation
  - view scoring output

GAP:

- Supplier is passive entity
- System is admin-driven

TARGET_STATE:

- Supplier dashboard
- Self-service visibility
- Guided progression to SELLABLE