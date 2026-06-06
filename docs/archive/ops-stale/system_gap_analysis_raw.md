# System Gap Analysis
*Derived from: code (schema, routes, services) vs. architecture doc vs. ops intent files*
*Sources: fincava-architecture.md, ops/post_mvp_plan.md (intent), ops/execution_map.md (intent)*

---

## HIGH — Mismatches, Missing Validation, Ownership Gaps

### H1 — Public endpoints expose sensitive supplier data
**Risk: HIGH**

`GET /suppliers`, `GET /suppliers/:id/evaluations`, `GET /suppliers/:id/transitions` have no authentication guard.

- Commercial scores are readable without login
- Evaluation history (all scores, pathways, threshold versions) is readable without login
- Transition audit log (actor names, justification text) is readable without login

**Expected behaviour**: at minimum, evaluation and transition endpoints should require `requireAuth`. Full supplier list may need role gating.

**Status**: CONFIRMED gap in code. Not documented as intentional.

---

### H2 — `interactions.metadata.ica_registered` does not sync to `compliance_docs.ica_registro`
**Risk: HIGH**

At onboarding, `ica_registered` is captured in `interactions.metadata`. The eligibility gate reads `compliance_docs.ica_registro` (always `false` at onboarding). These two fields are parallel with no reconciliation.

**Result**: a supplier who says `ica_registered: true` at onboarding will still have `ica_registro = false` in `compliance_docs` and will fail the eligibility gate.

**Ownership**: unclear — no code path exists to move data from interactions metadata to compliance_docs.

---

### H3 — No admin endpoint to update `compliance_docs` fields
**Risk: HIGH**

The eligibility gate depends entirely on `compliance_docs` boolean fields. To pass eligibility, an admin must manually run an `UPDATE` SQL statement. There is no API endpoint for setting `rutDian`, `icaRegistro`, `fitosanitarioCert`, or `dianExportador`.

**Result**: no supplier can reach SELLABLE through the normal flow unless the data is updated directly in the database.

---

### H4 — `compliance_docs.compliance_score` and `last_reviewed_at` are always null
**Risk: MEDIUM-HIGH**

These columns exist in the schema and are presumably intended for future use, but no code path ever writes to them. Any dashboard or report relying on them will always see null.

---

### H5 — Products marketplace has no graduation gate
**Risk: HIGH (business logic)**

`GET /products` returns products for ALL suppliers regardless of `sellableStatus`. A product from a `NOT_READY` supplier is visible to buyers. The graduation pipeline has no connection to the product catalogue.

**Expected**: products from suppliers below SELLABLE should be hidden or flagged.

---

### H6 — `volumen_kg_ultima_cosecha` type mismatch
**Risk: MEDIUM-HIGH**

Schema: `integer`. Onboarding code: inserts as `String(annualVolume)`. Postgres will coerce if the string is numeric, but this is fragile. Non-numeric strings (e.g. `"unknown"`) would cause a runtime insert error.

---

### H7 — `scoreSupplier` and `evaluateSupplier` run in-memory (no durability)
**Risk: HIGH (operational)**

Both functions are triggered via `scoreSupplier()` (fire-and-forget) and `setImmediate`. A process crash after the HTTP 201 response but before scoring completes means the supplier is permanently stuck at `NOT_READY` with no evaluation. There is no recovery mechanism.

**Intent**: database-backed job queue planned in Slice 5 and `ops/post_mvp_plan.md`. Not yet implemented.

---

### H8 — Pathway label (A/B/C/D) has no defined meaning in code
**Risk: MEDIUM-HIGH**

Claude assigns a pathway (`A`, `B`, `C`, `D`) and the value is stored and used in the graduation system. No code defines what each letter means. The meaning exists only in the Claude prompt and possibly in undocumented product decisions. If Claude changes its output pattern, the pathway breaks silently.

---

## MEDIUM — Redundancy, Unclear Visibility, Design Debt

### M1 — Two parallel representations of compliance truth
`compliance_docs` (boolean flags, used by eligibility gate) and `interactions.metadata` (rich categorical, captured at onboarding) represent overlapping compliance data with no reconciliation. `compliance_docs` is the authoritative gate; `interactions.metadata` is a richer record with no downstream consumer.

### M2 — `ai_outputs.pathway` is plain text; `suppliers.graduation_pathway` and `supplier_evaluations.pathway` are enums
Three pathway fields exist with different types. The AI-level pathway (`ai_outputs.pathway`) is free text and not constrained. The schema-level pathway (`graduation_pathway` enum: A/B/C/D) is constrained. Inconsistency makes cross-table queries fragile.

### M3 — Legacy `status` field (`ACTIVE`/`INACTIVE`/`PENDING`) coexists with `sellable_status`
Two status systems exist on the suppliers table. The schema comment warns against using `status` for the graduation flow, but both are present and populated. No code enforces they stay in sync. External consumers may use either field.

### M4 — `supplier-marketplace` route is public and unlisted but not removed
`/supplier-marketplace` is accessible to anyone with the URL, marked as temporary in code, but still in production. The amber banner labels it internal, but there is no auth guard or redirect.

### M5 — Supplier type `PROCESSOR` removed from enum but referenced in docs
The schema comment and some documentation references mention PROCESSOR as a supplier type. It was removed from the `supplier_type` enum. Any existing data with that value would fail enum validation.

### M6 — No public GET `/suppliers/:id` evaluation state in detail response
The supplier detail endpoint (`GET /suppliers/:id`) does not currently expose `sellableStatus`, `commercialScore`, or `eligibilityStatus`. Buyers cannot see graduation state on individual supplier profiles. (Confirmed by routes audit — detail response shape needs verification.)

### M7 — `harvest_months` mapped to `variedad_cafe` column
In the onboarding route, `body.harvest_months` is mapped to `farms.variedad_cafe`. This is a field name mismatch — harvest timing is not coffee variety. Data stored in this column is semantically incorrect for coffee-variety queries.

---

## LOW — Naming Inconsistencies

### L1 — Spanish/English field name duality throughout onboarding
The onboarding endpoint accepts both English (`contact_name`, `phone`, `primary_product`) and Spanish (`nombreCompleto`, `whatsappNumber`, `cultivoPrincipal`) field names via OR logic. This is intentional for backward compatibility but creates ambiguity for API consumers. No schema documents which names are canonical.

### L2 — `export_readiness_score` in `ai_outputs` vs `commercial_score` in evaluations
The AI produces `export_readiness_score`. The evaluation layer renames it `commercial_score`. Both refer to the same value but the terminology differs across tables and the `scoreSnapshot` JSONB preserves the original name.

### L3 — `currently_exporting` body field maps to two different columns
`body.currently_exporting` populates both `economics.tipo_comprador` (as `"EXPORT"`) and `economics.ha_intentado_exportar` (as `true`/`false`). One input feeds two columns with different semantics.

### L4 — Interaction type is free text, not an enum
`interactions.interaction_type` is a plain text column. Currently only `"FORM_SUBMISSION"` is inserted. No validation prevents arbitrary strings.

---

## Top 10 Insights

1. The eligibility gate is effectively blocked for all new suppliers — `compliance_docs` fields are always `false` at onboarding and there is no UI or API to update them.
2. The supplier graduation pipeline is operationally sound but has no durability — a process crash silently drops scoring and evaluation jobs.
3. Three compliance representations exist: `compliance_docs` (gate), `interactions.metadata` (rich capture), and `compliance_score` (schema only, never written). No single source of truth.
4. The public API exposes commercial scores, evaluation history, and audit logs without authentication.
5. The product marketplace and the supplier graduation system are completely decoupled — a PUBLISHED supplier's products are no more visible than a NOT_READY supplier's products.
6. Pathway labels (A/B/C/D) are opaque — no code or schema defines their meaning. This is a product definition gap, not a technical one.
7. The validation marketplace surface (`/supplier-marketplace`) is in production with no auth guard and no nav exposure — it is findable and accessible to anyone.
8. `harvest_months` is mapped to `variedad_cafe` — data stored in this column for coffee-variety queries will be semantically wrong.
9. The `interactions.ica_registered` field and `compliance_docs.ica_registro` are parallel without sync — a supplier who confirms ICA registration at onboarding will still fail the eligibility gate.
10. There is no supplier self-service path. Suppliers cannot view their own graduation state, compliance status, or AI score. The supplier dashboard exists but has no connection to the graduation system.

---

## Top 5 Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | No admin UI to update compliance docs — eligibility gate is functionally blocked | Critical | Build `PATCH /admin/suppliers/:id/compliance` endpoint |
| R2 | Public evaluation and transition endpoints expose commercial scores and audit data | High | Add `requireAuth` guard to `/suppliers/:id/evaluations` and `/suppliers/:id/transitions` |
| R3 | In-memory scoring/evaluation — job loss on crash | High | Implement database-backed job queue (Slice 5) |
| R4 | Products from non-graduated suppliers visible in marketplace | High | Add graduation gate to product listing or surface readiness signal |
| R5 | `ica_registered` in onboarding metadata not synced to compliance_docs | Medium | Either auto-sync at onboarding or build explicit admin review flow |

---

## Role Matrix

| Action | SUPPLIER | BUYER | ADMIN | SYSTEM |
|---|---|---|---|---|
| Register / onboard | Self or officer | — | On behalf | — |
| View own graduation state | No endpoint ⚠ | — | Yes | — |
| Update compliance docs | No | No | No endpoint ⚠ | — |
| Score supplier | — | — | — | Yes (async) |
| Evaluate supplier | — | — | — | Yes (async) |
| Manual state transition | No | No | Yes (with justification) | Yes (automated) |
| Publish supplier | No | No | Yes (with justification) | No |
| Browse products | Yes (dashboard) | Yes (public) | Yes | — |
| Browse graduated suppliers | No | Via `/supplier-marketplace` (public) | Yes (admin-list) | — |
| Generate compliance document | No | No | Yes | — |
| Send WhatsApp | No | No | Yes (manual trigger) | Yes (auto on score) |
| View evaluation history | No | Via public endpoint ⚠ | Yes | — |
| View transition history | No | Via public endpoint ⚠ | Yes | — |
