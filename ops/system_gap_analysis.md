# System Gap Analysis — Source of Truth

Derived from:

* Codebase (schema, routes, services)
* supplier_persona.md
* onboarding_flow.md
* buyer_persona.md
* ops documents

---

## 0. Classification

* CURRENT_STATE → validated from code
* GAP → system deficiency or inconsistency
* TARGET_STATE → desired behavior

---

## 1. Cross-Document Alignment

This analysis consolidates:

* Supplier persona (data + lifecycle)
* Onboarding flow (execution pipeline)
* Buyer persona (experience layer)

---

## 2. Gap Categories

* SECURITY
* DATA_INTEGRITY
* PRODUCT_LOGIC
* ARCHITECTURE
* UX

---

## 3. HIGH Priority Gaps

---

### H1 — ICA Sync Mismatch (DATA_INTEGRITY)

CURRENT_STATE:

* `ica_registered` stored in interactions.metadata
* `ica_registro` in compliance_docs remains false

GAP:

* onboarding input ignored by eligibility gate

TARGET_STATE:

* explicit mapping OR unified compliance model

---

### H2 — Marketplace / Graduation Disconnect (PRODUCT_LOGIC)

CURRENT_STATE:

* products visible regardless of supplier readiness

GAP:

* graduation system not used in buyer experience

TARGET_STATE:

* products gated or annotated by sellableStatus

---

### H3 — Async Job Durability (ARCHITECTURE)

CURRENT_STATE:

* scoring + evaluation run in-memory

GAP:

* process crash = permanent job loss

TARGET_STATE:

* durable job queue

---

### H4 — Public Supplier Dataset Exposure (SECURITY)

CURRENT_STATE:

* `/api/suppliers` publicly accessible
* includes internal fields

GAP:

* unintended exposure of internal data

TARGET_STATE:

* restrict or sanitize

Fix Applied (P0.2 — Epic 2 Precondition)
- GET /api/suppliers restricted to ADMIN-only
- Middleware: requireAuth + requireAdmin (in that order)
- Public buyer access served via /suppliers/marketplace (unchanged)
- Internal evaluation fields no longer externally accessible
- Date: 2026-04-23

OPEN FINDINGS (not fixed in P0.2):
- GET /suppliers/:id unguarded — exposes full supplier row by ID, fix separately
- artifacts/fincava/src/pages/suppliers.tsx:15 calls useListSuppliers() (→ GET /api/suppliers)
  with no auth header — public /suppliers page will 401 for all non-admin users
  Must be migrated to /suppliers/marketplace before public re-enablement

---

### H4-B — GET /suppliers/:id Unguarded (SECURITY)

CURRENT_STATE:
- GET /suppliers/:id has no auth middleware (line 691)
- Returns full supplier row via db.select() with no field restriction
- Exposes commercialScore, eligibilityStatus, graduationPathway
  for any supplier by ID to any unauthenticated caller

GAP:
- Same class of exposure as H4
- Any caller with a valid supplier ID can retrieve internal data

TARGET_STATE:
- requireAuth + requireAdmin applied (same pattern as H4 fix)
- Fix before any external-facing supplier detail work in Epic 2

SEVERITY: High
STATUS: Open — fix in P0.4

---

### H5 — Compliance Fragmentation (ARCHITECTURE)

CURRENT_STATE:

* compliance_docs
* interactions.metadata
* compliance_score (unused)

GAP:

* no single source of truth

TARGET_STATE:

* unified compliance model

---

## 4. MEDIUM Priority Gaps

* Type mismatch (economics)
* Pathway undefined (AI dependency)
* Dual status fields
* Supplier marketplace not integrated
* Missing readiness in supplier detail

---

## 5. LOW Priority

* Naming inconsistencies
* Language duality
* Free-text interaction types

---

## 6. Execution Priority

### DO NOW (Before Epic 2)

* ICA sync fix
* Type mismatch fix
* Define marketplace gating strategy (do not implement yet)

---

### DO NEXT (Epic 2)

* Integrate readiness into marketplace
* Improve supplier visibility

---

### DEFER (Post Epic 2)

* Job queue
* Compliance unification
* Pathway standardization

---

## 7. Updated Top Risks

| #  | Risk                                        | Severity    |
| -- | ------------------------------------------- | ----------- |
| R1 | ICA mismatch breaks eligibility correctness | Critical    |
| R2 | No job durability                           | High        |
| R3 | Marketplace ignores graduation              | High        |
| R4 | Compliance fragmentation                    | High        |
| R5 | Public supplier dataset exposure            | Medium-High |

---

## 8. Summary

The system is:

* Functionally correct
* Operationally usable
* Architecturally incomplete

Key insight:

```text
The system produces high-quality signals (scoring, evaluation)
but does not consistently use them (marketplace, UX, compliance).
```

---

END
