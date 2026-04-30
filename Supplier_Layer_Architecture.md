# Fincava — Supplier Layer Architecture

> Living document. Update this when routes, schemas, pipeline steps, or data contracts change.
> Last updated: April 2026 (T0–T5 ingestion pipeline complete).

---

## Overview

The supplier layer has two distinct data collection mechanisms that write to the same
`suppliers` table but serve different purposes and are initiated by different actors.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPPLIER RECORD (suppliers table)                   │
│                                                                             │
│  Core identity    — nombreCompleto, municipio, department, phone, email     │
│  Ingestion layer  — ingestionStatus, ingestionSource, confidenceScore,      │
│                     normalizedName, description, supplierFingerprint        │
│  Onboarding layer — consentGiven, consentDate, registeredBy                 │
│  Evaluation layer — sellableStatus, lastEvaluatedAt, claimStatus            │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                          │
         ▼                                          ▼
  INGESTION PIPELINE                       ONBOARDING PIPELINE
  (admin-driven, market intel)             (farmer/officer/admin, ground truth)
```

---

## 1. Onboarding Pipeline

### Entry point
`POST /api/suppliers/onboard` — no authentication required.

### Who submits it
- Supplier self-registers at `/onboarding`
- Field officer fills the form during a farm visit (uses `officer_name` + `officer_code` fields)

### Data collected (5 DB tables)

| Table | Fields |
|---|---|
| `suppliers` | name, phone, email, location, consent |
| `farms` | crop type, hectares, harvest months, drying method, years in farm |
| `economics` | volume, price, buyer type, export history, debt, capital needs |
| `compliance_docs` | ICA registration (seeded; never downgraded by later admin edits) |
| `interactions` | `FORM_SUBMISSION` event with officer code + visit notes |

### Post-submission pipeline (async, after HTTP 201)

```
HTTP 201 returned to browser
        │
        ▼  setImmediate (non-blocking)
 ┌──────────────┐
 │ scoreSupplier│  → builds AI input from DB → calls Claude (SCORING_MODEL)
 │              │  → receives: export_readiness_score + pathway (A/B/C/D)
 │              │  → writes: ai_outputs row
 │              │  → sends: WhatsApp confirmation to supplier
 └──────┬───────┘
        │ (requires ai_outputs row)
        ▼
 ┌─────────────────┐
 │ evaluateSupplier│  → reads: AI score + compliance docs
 │                 │  → runs: graduation state machine
 │                 │  → sets: sellableStatus (NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED)
 │                 │  → writes: supplier_evaluations, supplier_state_transitions
 └─────────────────┘
```

### Emails sent
- Supplier: Spanish-language confirmation (if email provided)
- Admin: Alert email with supplier name, location, product, link to admin panel

### sellableStatus state machine

```
NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
```

| State | Meaning |
|---|---|
| `NOT_READY` | Onboarded but did not pass eligibility thresholds |
| `ELIGIBLE` | Passed eligibility gate; not yet commercially scored |
| `SELLABLE` | Commercially scored; ready for buyer matching and marketplace listing |
| `PUBLISHED` | Actively listed on the marketplace |

Only `SELLABLE` and `PUBLISHED` suppliers appear on the public marketplace.

### AI scoring input contract

Claude receives a JSON object with four keys:

```json
{
  "supplier": { "name", "municipio", "supplierType", "consent" },
  "farm":     { "cultivoPrincipal", "hectareasProduccion", "volumenKgUltimaCosecha", ... },
  "economics": { "tipoComprador", "precioVentaBanda", "deudaActual", "haIntentadoExportar", ... },
  "compliance": { "icaRegistro", "rutDian", "fitosanitarioCert", ... }
}
```

Output: `export_readiness_score` (numeric) + `pathway` (A/B/C/D).

---

## 2. Ingestion Pipeline (T0–T5)

### Entry points
- `POST /api/admin/ingestion/suppliers` — manual admin entry
- `POST /api/admin/ingestion/discover` — AI-powered lead discovery
- `POST /api/admin/ingestion/batch-confirm` — bulk promotion to READY

All routes: `requireAuth + requireAdmin`.

### ingestionStatus lifecycle

```
(created) → DRAFT → ENRICHED → READY → [sold / rejected]
                                └──→ REJECTED
```

| Status | Meaning |
|---|---|
| `DRAFT` | Created by admin; not yet enriched or confirmed |
| `ENRICHED` | AI enrichment (Claude Sonnet) applied; normalizedName, description, categoryHints written |
| `READY` | Admin confirmed; supplier is ready for commercial use |
| `REJECTED` | Marked as not suitable |

### Data collected

| Column / Table | Source |
|---|---|
| `suppliers.normalizedName` | Claude AI enrichment |
| `suppliers.description` | Claude AI enrichment |
| `suppliers.confidenceScore` | confidence-scorer.ts (6-factor heuristic, 0.00–1.00) |
| `suppliers.supplierFingerprint` | SHA-256 of normalised name + country |
| `suppliers.sourceUrl` | Admin-provided |
| `product_placeholders` | One row per category hint; verificationStatus=unverified, dataOrigin=inferred |

### Confidence score (T5) — 6 factors

1. Website URL present and valid
2. AI normalised name differs meaningfully from raw input
3. Municipio matches known Colombian municipalities
4. Category matches agricultural taxonomy
5. Contact info present (WhatsApp or email)
6. AI output contained ≤ 7 fields (clean schema, no discarded extras)

Returns 0.00–1.00 stored in `suppliers.confidence_score`.

### Public trust score (T5) — 5 signals (buyer-facing)

Computed at query time from public-safe columns only:

1. Source URL valid
2. Normalised name present
3. Description > 20 chars
4. Municipio recognised
5. Claim status = CLAIMED

Exposed on:
- `GET /api/suppliers/:id/profile` (public, no auth) → `public_trust_score`
- `GET /api/suppliers/marketplace` (public) → `public_trust_score` per supplier
- `GET /api/suppliers/:id` (admin) → `public_trust_score`

### Interaction events logged (INTERACTION_TYPES)

| Event | When |
|---|---|
| `SUPPLIER_DISCOVERED` | Lead found via discovery engine |
| `SUPPLIER_STRUCTURED` | AI enrichment completed |
| `INGESTION_SUBMITTED` | Admin submits to batch |
| `BATCH_CONFIRM_EXECUTED` | Batch confirmed (DRAFT/ENRICHED → READY) |
| `SUPPLIER_SELLABLE` | Supplier promoted to SELLABLE |
| `DUPLICATE_OVERRIDE` | Admin overrides a detected duplicate (logs override_reason + admin_id) |

### Duplicate detection (two-pass)

1. **Exact** — SHA-256 fingerprint match on `suppliers.supplier_fingerprint`
2. **Fuzzy** — word-overlap score ≥ 0.6 on name/normalizedName via ILIKE

Override requires non-empty `overrideJustification` (whitespace-only rejected).

---

## 3. What Each Pipeline Knows (and Doesn't)

| Data dimension | Onboarding | Ingestion |
|---|---|---|
| Farm size / hectares | ✅ | ❌ |
| Harvest months / cycles | ✅ | ❌ |
| Drying / processing method | ✅ | ❌ |
| Compliance (ICA, RUT, VUCE) | ✅ | ❌ |
| Economics (price, volume, debt) | ✅ | ❌ |
| Consent captured | ✅ | ❌ |
| Export readiness score (AI) | ✅ | ❌ |
| Graduation state (sellableStatus) | ✅ | feeds into same |
| Normalised business name (AI) | ❌ | ✅ |
| Description / narrative (AI) | ❌ | ✅ |
| Source URL / web presence | ❌ | ✅ |
| Confidence score | ❌ | ✅ |
| Product placeholders | ❌ | ✅ |
| Batch / ingestion audit trail | ❌ | ✅ |
| Duplicate check | ❌ | ✅ |

---

## 4. Shared Infrastructure

| Layer | Used by |
|---|---|
| `suppliers` table | Both pipelines write to it |
| `interaction_logs` | Both pipelines log events |
| `computePublicTrustScore()` | Ingestion layer; usable by onboarding too |
| `logInteraction()` | Both pipelines |
| `sendEmail()` | Onboarding (confirmation + admin alert) |
| `sendWhatsAppMessage()` | Onboarding (post-scoring confirmation) |
| Drizzle ORM + PostgreSQL | Both |

---

## 5. Current Gaps / Planned Work

| Gap | Priority | Notes |
|---|---|---|
| No field officer launch UI | High | Officers use the same `/onboarding` URL with no dedicated entry point |
| Admin cannot see onboarding completeness per supplier | High | Admin view shows ingestion status but not farm/economics/compliance fill rate |
| Ingestion suppliers have no farm/compliance data | Medium | Ingested suppliers bypass the scoring pipeline |
| No combined AI input (ingestion + onboarding data) | Medium | Both datasets available in DB; scoring prompt only reads onboarding data |
| Supplier dashboard questionnaire launcher | Medium | Supplier can self-register but no resume / "complete your profile" flow |
| Colombian municipio list: ~100 representative only | Low | Full DIVIPOLA list (~1,100) would improve confidence scoring accuracy |

---

## 6. API Route Reference

### Onboarding
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/suppliers/onboard` | None | Submit onboarding form |

### Ingestion (admin)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/ingestion/suppliers` | Admin | Create DRAFT supplier |
| `POST` | `/api/admin/ingestion/enrich` | Admin | Run AI enrichment (+ persist confidenceScore) |
| `GET` | `/api/admin/ingestion/duplicate-check` | Admin | Check for duplicate before save |
| `PATCH` | `/api/admin/ingestion/suppliers/:id/ingestion-status` | Admin | Update ingestion status |
| `POST` | `/api/admin/ingestion/batch-confirm` | Admin | Bulk confirm batch |
| `GET` | `/api/admin/ingestion/batches` | Admin | List ingestion batches |

### Supplier profiles
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/suppliers/marketplace` | None | Public list (SELLABLE/PUBLISHED only) with `public_trust_score` |
| `GET` | `/api/suppliers/:id/profile` | None | Public curated profile + `public_trust_score` (no `confidenceScore`) |
| `GET` | `/api/suppliers/:id` | Admin | Full supplier record + `public_trust_score` |
| `GET` | `/api/admin/ingestion/suppliers/:id/product-placeholders` | Admin | Inferred product list with computed `status` |

---

## 7. Unified Supplier Layer — Design Strategy

> Added: April 2026. Captures the agreed design direction for combining the three entry points and two pipelines.

### Core Mental Model

The two pipelines collect complementary data, not competing data:

- **Ingestion** = *what we discover about the supplier from outside* (market intelligence, AI enrichment, web presence)
- **Onboarding** = *what the supplier tells us about themselves* (ground truth: farm, compliance, economics)

Goal: **one supplier record, two collection modes, one AI that sees both.**

---

### Three Entry Points — Agreed Design

#### 1. Supplier Self-Service (exists, needs small gaps closed)
- 5-step onboarding form at `/onboarding` works for digitally capable suppliers
- **Gap:** No "resume" prompt from the supplier dashboard if they created an account but never completed the questionnaire
- **Gap:** No mechanism for an ingestion-discovered supplier to claim their profile and then fill in farm data

#### 2. Field Officer (backend ready, no UI)
- `officer_name` + `officer_code` fields already exist in the onboarding schema
- **Gap:** No dedicated officer launch page or mobile-optimised entry point
- Officers have an account (`FIELD_OFFICER` role) but no dashboard or onboarding launcher
- Needed: a simple officer dashboard with supplier search + "Start farm visit" button

#### 3. Admin Console (biggest current gap)
- Admin can see ingestion batches but has no unified view of total profile completeness per supplier
- **Gap:** No side-by-side view showing "Ingestion data: complete / Farm data: missing / AI score: missing"
- **Gap:** No "Initiate onboarding for this supplier" action that pre-fills from the existing ingestion record

---

### What to Keep Separate vs. Combine

**Keep separate:**
- The three UI entry points — each serves a different actor with different context and device
- The ingestion workflow (DRAFT → ENRICHED → READY) — internal admin quality gate
- The onboarding consent + compliance capture — carries legal weight, must remain explicit

**Combine — AI scoring input:**

When a supplier has BOTH ingestion data AND onboarding data, the Claude scoring prompt should receive:

```json
{
  "supplier":   { "...core fields..." },
  "farm":       { "...onboarding farm data..." },
  "economics":  { "...onboarding economics..." },
  "compliance": { "...onboarding compliance..." },
  "ingestion":  {
    "normalizedName":             "...",
    "description":                "...",
    "categoryHints":              ["..."],
    "exportReadinessNarrative":   "...",
    "sourceUrl":                  "...",
    "confidenceScore":            0.85
  }
}
```

**Combine — Marketplace profile:**
The supplier's public page should show: AI-written description (from ingestion) + product mix + farm location + certifications + organic status — a far richer buyer-facing profile than either dataset alone.

---

### Completeness Status Model

Each supplier record should expose a `profileCompleteness` summary:

| Dimension | Source | Check |
|---|---|---|
| Ingestion data | `ingestionStatus` | `READY` |
| Farm data | `farms` table | Row exists for `supplierId` |
| Economics data | `economics` table | Row exists for `supplierId` |
| Compliance data | `compliance_docs` table | Row exists for `supplierId` |
| AI score | `ai_outputs` table | Row exists for `supplierId` |
| Graduated | `supplier_evaluations` | `sellableStatus` ≠ `NOT_READY` |

---

### The One Key Architectural Decision

The current `POST /api/suppliers/onboard` always creates a new supplier. To support admin-initiated onboarding for an already-ingested supplier, the route will accept an optional `supplierId` body field:

- **If absent:** current behavior — creates new supplier record
- **If present:** updates the existing record; upserts farms/economics/compliance tables; runs the post-onboard pipeline against the existing ID

This keeps one endpoint, one form, three entry points.

---

### Build Roadmap — Four Phases

#### Phase 1 — Close the Admin Loop *(HIGH priority — unblocks all other phases)*
1. `GET /api/suppliers/:id` returns `profileCompleteness` object (hasFarmData, hasEconomicsData, hasComplianceData, hasAiScore)
2. `POST /api/suppliers/onboard` accepts optional `supplierId` → update mode
3. Admin supplier detail panel shows completeness status for each dimension
4. "Collect Farm Data" button on any ingested supplier → pre-filled onboarding form linked to existing supplierId

#### Phase 2 — Field Officer Launch Point *(MEDIUM priority — quick win, backend already ready)*
1. Officer dashboard page with supplier search + "Start farm visit" action
2. Mobile-optimised entry (most field visits happen on a phone)
3. Onboarding form pre-populates `officer_name`, `officer_code` from logged-in officer

#### Phase 3 — Combined AI Input *(MEDIUM priority — highest long-term value)*
1. When scoring a supplier that also has ingestion enrichment, include ingestion AI output in the Claude prompt
2. Store richer combined profile output in `ai_outputs`
3. Feed combined output to the marketplace profile page

#### Phase 4 — Supplier Self-Completion *(LOWER priority — user-facing polish)*
1. Supplier dashboard shows profile completeness percentage
2. Incomplete sections link back to the questionnaire with progress saved
3. Ingestion-discovered suppliers can claim their profile via a link/code
