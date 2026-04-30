# Fincava — Supplier Layer Architecture

> Living document. Update this when routes, schemas, pipeline steps, or data contracts change.
> Last updated: April 2026 — full end-to-end audit, all four phases complete.

---

## Critical Architectural Note — Two "Supplier" Systems

**There are two completely separate supplier concepts in this codebase. They do not share tables.**

| System | Table(s) | Purpose | Who uses it |
|---|---|---|---|
| **Farmer/Graduation system** | `suppliersTable`, `farmsTable`, `economicsTable`, `compliance_docs`, `ai_outputs`, `supplier_evaluations`, `supplier_state_transitions` | Onboard Colombian farmers, score their export readiness, graduate them to the marketplace | Admin, Field Officer, Farmer self-register |
| **B2B Marketplace system** | `companiesTable`, `productsTable`, `ordersTable`, `inquiriesTable`, `rfqsTable` | Manage products, orders, inquiries, RFQs for registered B2B seller accounts | Logged-in SUPPLIER-role users |

These are connected **only through the `my-profile` email-matching bridge** (Phase 4). A supplier-role user account (B2B) must have the same email as a farmer record (suppliersTable) for the ProfileCompletenessWidget to appear in their dashboard. No foreign key exists between the two systems.

---

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FARMER RECORD (suppliersTable)                          │
│                                                                                 │
│  Core identity    — nombreCompleto, municipio, department, phone, email         │
│  Ingestion layer  — ingestionStatus, ingestionSource, confidenceScore,          │
│                     normalizedName, description, supplierFingerprint            │
│  Onboarding layer — consentGiven, consentDate, registeredBy                     │
│  Evaluation layer — sellableStatus, eligibilityStatus, commercialScore,         │
│                     lastEvaluatedAt, thresholdVersion                           │
│  Claim layer      — claimStatus (UNCLAIMED/PENDING/CLAIMED), claimToken         │
└─────────────────────────────────────────────────────────────────────────────────┘
         │                              │                         │
         ▼                              ▼                         ▼
  INGESTION PIPELINE            ONBOARDING PIPELINE        MARKETPLACE OUTPUT
  (admin-driven,                (farmer/officer/admin,     (SELLABLE/PUBLISHED
  market intel)                  ground truth)              farmers on /suppliers)
```

---

## 1. Role Flows

### 1a. Admin Role

**Entry:** Admin logs in (ADMIN role) at `/login`, lands on `/admin`.

**Admin sidebar navigation:**
- `/admin` — dashboard summary
- `/admin/users` — all platform users
- `/admin/suppliers` — farmer supplier management (graduation pipeline)
- `/admin/ingestion` — ingestion batches + lead discovery
- `/officer/dashboard` — field visit management
- `/admin/orders` — order management
- `/admin/team` — team management

**Supplier management actions (admin/suppliers.tsx):**
- View paginated supplier list with search, filters (pathway, municipio, date range)
- Click any row → right-side detail drawer showing:
  - Contact, phone, location, product, type, status
  - AI Score, Commercial Score, Sellable Status, Eligibility, Pathway
  - **Profile Completeness panel** (5 dimensions: Farm data, Economics, Compliance, AI readiness score, Graduated)
  - Amber "Collect farm data →" link when hasFarmData=false → `/onboarding?supplierId=&prefill=1`
  - Status change dropdown (ACTIVE/PENDING/INACTIVE)
  - Document generation (English/Spanish AI document via Claude)
  - Manual WhatsApp resend button
- Manual state transitions via `POST /api/admin/suppliers/:id/transition` (ADMIN/FOUNDER actor, requires justification)
- Manual publish via `POST /api/admin/suppliers/:id/publish` (requires supplier to be SELLABLE first)
- Compliance doc patch via `PATCH /api/admin/suppliers/:id/compliance`

**Ingestion actions (admin/ingestion/):**
- `/admin/ingestion` — list batches, create new batch
- `/admin/ingestion/discover` — AI lead discovery (ephemeral, no DB writes)
- `/admin/ingestion/new` — create ingested supplier (DRAFT)
- Enrich with AI, confirm batch (DRAFT/ENRICHED → READY)

---

### 1b. Field Officer Role

**Current state:** Officers use ADMIN accounts. No dedicated FIELD_OFFICER user role exists.
The `officer_applications` table stores applications but no promotion flow creates user accounts from them.

**Entry:** Admin logs in, navigates to "Field Visits" in admin sidebar → `/officer/dashboard`.

**Officer dashboard (officer/dashboard.tsx):**
- Green header: officer name + code `FO-{userId}`
- "+ Register new supplier" → `/onboarding` (fresh registration)
- Search suppliers by name/location/product (server-side ILIKE, `?q=` on admin-list endpoint)
- "Visit →" per result → `/onboarding?supplierId={id}&prefill=1&officerName={name}&officerCode={code}`
- "How to use" instructions section

**Onboarding pre-fill (triggered from officer dashboard):**
- Reads `?officerName=` and `?officerCode=` from URL
- Pre-fills Step 4 officer fields (locked)
- Reads `?supplierId=&prefill=1` → pre-fills and locks identity fields with existing supplier data
- Sends `supplierId` in submit payload → update mode (rather than create new)

**⚠️ Gap:** Officer dashboard is ADMIN-only (`requireAdmin`). Real officers would need the ADMIN role (full access) or a new FIELD_OFFICER role. See gaps section.

---

### 1c. Farmer Self-Registration

**Entry:** Farmer visits `/onboarding` directly or follows a link.

**Onboarding form (5 steps):**
1. Identity — name, WhatsApp, email, municipio, department
2. Farm data — crop type, hectares, harvest months, drying method
3. Economics — volume, price, buyer type, export history, debt
4. Consent + officer — consent checkbox, officer name/code (optional)
5. Review + submit

**URL modes:**
- Plain `/onboarding` → creates new supplier
- `/onboarding?supplierId=&prefill=1` → update mode (locks identity fields, shows "Completing profile for: [name]" banner)
- `/onboarding?officerName=&officerCode=` → pre-fills officer fields

**Post-submit:** HTTP 201 (new) or 200 + `mode: "profile_completion"` (update), then async pipeline triggers.

---

### 1d. Supplier Self-Completion (B2B dashboard)

**Entry:** Logged-in SUPPLIER-role user at `/supplier-dashboard`.

**What they see:**
- Stats cards: listed products, active inquiries, total orders, total revenue
- **ProfileCompletenessWidget** (Phase 4) — visible only if logged-in email matches a farmer record in suppliersTable
  - % progress bar (completedDimensions / 5)
  - 5 rows: Farm data, Economics, Compliance, AI readiness score, Graduated — each with ✓/○ and "Complete →" link
  - "Complete your farm profile" CTA → `/onboarding?supplierId=&prefill=1`
- Recent inquiries / recent orders

**Other supplier dashboard pages:**
- `/supplier-dashboard/products` — list/create/edit/delete products
- `/supplier-dashboard/inquiries` — view inquiries, mark RESPONDED/CLOSED
- `/supplier-dashboard/orders` — view orders, update status
- `/supplier-dashboard/rfqs` — view open RFQs, navigate to bid
- `/supplier-dashboard/performance` — trust score + trade history
- `/supplier-dashboard/finance` — ⚠️ placeholder ("coming soon")
- `/supplier-dashboard/profile` — B2B company profile settings

---

### 1e. Buyer Flow (how buyers interact with suppliers)

**Discovery:**
- `/marketplace` — browse products (useListProducts) with filters: search, category, sort, impact flags
- `/suppliers` — supplier directory (useListSuppliers) with search by name/region/product

**Supplier profile:**
- `/supplier/:id` — public profile showing identity, products, origin story, certifications
- "Contact Supplier" button is present **but not wired** — no click handler implemented (⚠️ gap)

**Inquiry creation:**
- `POST /api/inquiries` endpoint exists with full implementation
- Product-detail "Request Quote / Inquiry" button redirects to `/dashboard/inquiries` (read-only list) — **no create-inquiry form exists in buyer UI** (⚠️ gap)
- Backend sends email notification to supplier on inquiry creation

**Order flow:**
- Buyer places order from product detail via "Place Order" dialog
- Creates order via `POST /api/buyer/orders`
- Supplier sees it in `/supplier-dashboard/orders` and can update status

---

## 2. Complete DB Schema

### Core farmer/supplier tables

**`suppliers`** — root of the farmer graduation system
```
id, nombreCompleto, whatsappNumber, email, municipio, department, vereda
supplierType (FARMER default), registeredBy, status (ACTIVE/PENDING/INACTIVE)
consentGiven, consentDate, createdAt, updatedAt

-- State machine (set by evaluateSupplier)
eligibilityStatus, commercialScore, sellableStatus
graduationPathway, nextActions (jsonb), commercialScoreAtOnboarding
lastEvaluatedAt, thresholdVersion

-- Ingestion metadata (null for field-collected suppliers)
normalizedName, description, sourceUrl, sourceType
supplierFingerprint, claimStatus (UNCLAIMED/PENDING/CLAIMED), claimToken
ingestionSource (FIELD_COLLECTED default), ingestionStatus (DRAFT/ENRICHED/READY/REJECTED)
createdByAdminId (FK→users), batchId (FK→supplier_ingestion_batches)
country, dataCompletenessScore, confidenceScore
```

Indexes: partial unique on `whatsappNumber` (non-null only); partial on `sellableStatus` (SELLABLE/PUBLISHED).

**`farms`** — farm data from onboarding
```
id, supplierId (FK→suppliers), cultivoPrincipal, variedadCafe
hectareasProduccion, edadPlantasAnos, cosechasPorAno, metodoSecado
accesoAgua, anosEnFinca, tenenciaTierra, asistenciaTecnica
```
No unique constraint on supplierId (multiple rows possible).

**`economics`** — economic data from onboarding
```
id, supplierId (FK→suppliers), tipoComprador, volumenKgUltimaCosecha
precioVentaBanda, tiempoPagoDias, deudaActual, usoCapital (text[])
comodidadPagos, personasDependientes, otrasFuentesIngreso
situacionEconomica, interesCanalPremium, conocePrecioExportacion, haIntentadoExportar
```

**`compliance_docs`** — 1:1 per supplier (UNIQUE constraint)
```
id, supplierId (FK→suppliers, UNIQUE), rutDian, icaRegistro
fitosanitarioCert, dianExportador, complianceScore, lastReviewedAt
```

**`ai_outputs`** — all AI calls (multiple per supplier)
```
id, supplierId (FK→suppliers), createdAt, aiModel, callType
exportReadinessScore, pathway, capitalCapacityCop
complianceGaps, gapAnalysis, documentContent, whatsappMessageSent
```
callType values: `ONBOARD_SCORE`, `DOCUMENT_GENERATION`.

**`supplier_evaluations`** — append-only evaluation snapshots
```
id, supplierId (FK→suppliers, ON DELETE CASCADE)
eligibilityStatus, commercialScore, sellableStatus, pathway
scoreSnapshot (jsonb), thresholdVersion, evaluatedAt
```

**`supplier_state_transitions`** — append-only state change audit log
```
id, supplierId (FK→suppliers, ON DELETE CASCADE)
fromState, toState, thresholdVersion, commercialScoreAtTransition
actor (SYSTEM/ADMIN/FOUNDER), justification, evaluationId (FK→supplier_evaluations)
createdAt
```

**`product_placeholders`** — inferred product categories from ingestion
```
id, supplierId (FK→suppliers), categoryHint, dataOrigin, verificationStatus, createdAt
```

**`supplier_ingestion_batches`** — admin ingestion batch metadata
```
id, batchUuid (UNIQUE), createdByAdminId (FK→users)
status (DRAFT/SUBMITTED), batchSize, notes, createdAt, submittedAt
```

**`interactions`** — event log for supplier lifecycle events
```
id, supplierId (FK→suppliers), createdAt, interactionType, actor, notes, metadata (jsonb)
```

**`officer_applications`** — field officer applications (not linked to users)
```
id, fullName, email, phone, department, municipio, languages, experienceYears
hasMotorcycle, availableDays, motivation, referralCode, status ('pending' default), createdAt
```
⚠️ No FK to usersTable. No promotion flow from application to user account.

---

## 3. Onboarding Pipeline (end-to-end)

### API: `POST /api/suppliers/onboard` — no auth required

**DB writes (5 tables):**

| Table | Action | Notes |
|---|---|---|
| `suppliers` | INSERT or UPDATE | UPDATE if `supplierId` in body (update mode) |
| `farms` | INSERT or UPSERT | Farm data; update mode upserts |
| `economics` | INSERT or UPSERT | Economics data |
| `compliance_docs` | INSERT (ON CONFLICT DO NOTHING) | ICA seeded; never downgraded |
| `interactions` | INSERT | Type: `FORM_SUBMISSION`, carries officer code + notes |

**Update mode:** Body contains `supplierId` → verified supplier exists → updates core fields, upserts child tables. Returns HTTP 200 + `{ mode: "profile_completion" }`. Create mode returns HTTP 201.

**Emails (fire-and-forget, after 201):**
- **Supplier** (if email present): `supplierApplicationConfirmationEmail` — subject: "Hemos recibido su solicitud — Fincava" (Spanish)
- **Admin** (hardcoded to sbirfan@gmail.com): `supplierApplicationAdminAlertEmail` — name, location, product, admin panel link

**Async pipeline** (via `pipelineEmitter.emit(SUPPLIER_ONBOARD_EVENT)` + setImmediate):

```
HTTP 201 returned to browser
        │
        ▼  setImmediate → pipelineEmitter → SUPPLIER_ONBOARD_EVENT
 ┌──────────────────┐
 │  runOnboardPipeline  │  (onboard-pipeline.ts)
 └────────┬─────────┘
          │
          ▼
 ┌──────────────┐
 │ scoreSupplier│  → buildScoringInput (reads 5 tables + product_placeholders)
 │              │  → calls Claude (SCORING_MODEL) with SCORING_PROMPT
 │              │  → validates: export_readiness_score (finite) + pathway (A/B/C/D)
 │              │  → writes: ai_outputs row (callType="ONBOARD_SCORE")
 │              │  → sends: WhatsApp to supplier (non-fatal if fails)
 │              │  → retries: up to 3× with exponential backoff
 └──────┬───────┘
        │ (guard: ai_outputs row must exist before evaluation)
        ▼
 ┌─────────────────┐
 │ evaluateSupplier│  (supplier-graduation-service.ts)
 │                 │  → reads: latest ONBOARD_SCORE + compliance_docs
 │                 │  → computeEligibility: requires rutDian, icaRegistration,
 │                 │    fitosanitario, consentGiven (from THRESHOLDS.eligibility)
 │                 │  → computeSellableStatus: score<30→NOT_READY, 30-59→ELIGIBLE,
 │                 │    ≥60→SELLABLE (from THRESHOLDS.commercial, version "v0_pre_buyer_calls")
 │                 │  → writes: supplier_evaluations (append-only snapshot)
 │                 │  → if changed: writes supplier_state_transitions (actor=SYSTEM)
 │                 │  → updates: suppliers (eligibilityStatus, commercialScore,
 │                 │    sellableStatus, graduationPathway, nextActions, lastEvaluatedAt)
 │                 │  → if → SELLABLE: logs SUPPLIER_SELLABLE interaction
 └─────────────────┘
```

**⚠️ No email or notification when supplier reaches SELLABLE or PUBLISHED** — graduation is silent.

---

## 4. Ingestion Pipeline (end-to-end)

All routes: `requireAuth + requireAdmin`.

### Step 1 — Batch creation
`POST /api/admin/ingestion/batches` → writes `supplier_ingestion_batches` (status=DRAFT)

### Step 2 — Lead discovery (ephemeral)
`POST /api/admin/ingestion/discover` → calls `discoverLeads()` (Claude + DISCOVERY_PROMPT) → returns candidate suppliers. **Nothing written to DB.** Admin reviews candidates and selects which to save.

### Step 3 — Create ingested supplier
`POST /api/admin/ingestion/suppliers` → writes:
- `suppliersTable` with `ingestionSource=ADMIN_ENTRY`, `ingestionStatus=DRAFT`, `claimStatus=UNCLAIMED`, `createdByAdminId`
- `productPlaceholdersTable` (one row per `categoryHint`, if provided)

Includes duplicate detection (two-pass: SHA-256 fingerprint exact + fuzzy word-overlap ≥0.6). Override requires non-empty `overrideJustification`.

### Step 4 — AI enrichment (optional)
`POST /api/admin/ingestion/enrich` → calls `enrichSupplierWithAI()` (Claude + ENRICHMENT_MODEL) → computes `confidenceScore`. **Service does NOT write to DB.** Route persists `suppliersTable.confidenceScore` and `updatedAt` if `supplierId` provided.

### Step 5 — Status update
`PATCH /api/admin/ingestion/suppliers/:id/ingestion-status` → updates `suppliersTable.ingestionStatus` to `DRAFT|ENRICHED|READY|REJECTED`. Logs `INGESTION_BATCH_SUBMITTED` interaction.

### Step 6 — Batch submit
`POST /api/admin/ingestion/batches/:id/submit` → updates batch row to `status=SUBMITTED`, `submittedAt=now`. **Does NOT change supplier statuses.**

### Step 7 — Batch confirm (promote to READY)
`POST /api/admin/ingestion/batch-confirm` → for each `leadId`: updates `suppliersTable.ingestionStatus` → READY (no-op if already READY; error if REJECTED).

### ⚠️ Critical Gap: Ingestion → Scoring is NOT connected

Ingested suppliers (status=READY) are **never automatically scored**. Scoring only runs after `POST /api/suppliers/onboard`. There is no "promote ingested READY supplier to scored supplier" endpoint or flow. A field officer must visit the farm and submit the onboarding form before scoring and graduation can happen.

### ingestionStatus lifecycle
```
(created) → DRAFT → ENRICHED → READY
                              └──→ REJECTED
```

---

## 5. AI Scoring Contract

### Input to Claude (current — 5 keys)

```json
{
  "supplier":   { full suppliersTable row },
  "farm":       { full farmsTable row | undefined },
  "economics":  { full economicsTable row | undefined },
  "compliance": { full complianceDocsTable row | undefined },
  "ingestion":  {
    "normalizedName":        "...",
    "description":           "...",
    "confidenceScore":       "0.85",
    "dataCompletenessScore": "0.70",
    "ingestionSource":       "ADMIN_ENTRY",
    "ingestionStatus":       "READY",
    "sourceType":            "website",
    "categoryHints":         ["coffee", "cacao"]
  }
}
```

`undefined` values are omitted by JSON.stringify. `ingestion` block is present for all suppliers (ingestion-only fields are null for field-collected suppliers). `categoryHints` is empty array when no product_placeholders rows exist.

### Output expected from Claude

```json
{
  "export_readiness_score": 72,
  "pathway": "B",
  "pathway_label": "Export Ready with Support",
  "capital_capacity_cop": 15000000,
  "compliance_gaps": ["RUT-DIAN not registered", "Fitosanitario missing"],
  "gap_analysis": "...",
  "primary_recommendation": "..."
}
```

Fields stored: `exportReadinessScore`, `pathway`, `capitalCapacityCop`, `complianceGaps`, `gapAnalysis`. Fields `pathway_label` and `primary_recommendation` are parsed but not persisted.

### Graduation thresholds (v0_pre_buyer_calls)

| Gate | Fields / Threshold | Outcome |
|---|---|---|
| Eligibility | rutDian + icaRegistration + fitosanitario + consentGiven all true | PASS or FAIL |
| Commercial | score < 30 | NOT_READY |
| Commercial | 30 ≤ score < 60 | ELIGIBLE |
| Commercial | score ≥ 60 | SELLABLE |

---

## 6. Manual Admin Actions (post-onboarding)

### State transitions
`POST /api/admin/suppliers/:id/transition`
- Actor: ADMIN or FOUNDER (not SYSTEM)
- Required: non-empty `justification`
- Allowed states: NOT_READY, ELIGIBLE, SELLABLE, PUBLISHED
- Writes: `supplier_state_transitions` + updates `suppliers.sellableStatus`

### Publish
`POST /api/admin/suppliers/:id/publish`
- Preflight: supplier.sellableStatus must be `"SELLABLE"` (not NOT_READY/ELIGIBLE)
- Required: actor (ADMIN/FOUNDER) + non-empty justification
- Calls `markPublished()` → `transitionTo(..., "PUBLISHED", actor, { justification })`

### Compliance update
`PATCH /api/admin/suppliers/:id/compliance`
- Updates: rutDian, icaRegistro, fitosanitarioCert, dianExportador, consentGiven (partial)
- Does NOT trigger re-evaluation or re-scoring
- ⚠️ If a supplier was NOT_READY due to missing compliance, admin fixing it has no automatic effect — manual re-score/transition required

### AI document generation
`POST /api/suppliers/:id/generate-document` (Admin)
- Calls Claude (DOCUMENT_MODEL) with supplier + farm + compliance + latestScore
- Stores in `ai_outputs` (callType=DOCUMENT_GENERATION)
- Supports EN/ES language flag

### Manual WhatsApp resend
`POST /api/suppliers/:id/send-whatsapp` (Admin)
- Reads latest ONBOARD_SCORE for the supplier
- Sends WhatsApp with score + pathway
- Records returned SID in `ai_outputs.whatsappMessageSent`

---

## 7. Communications Summary

| Trigger | Channel | Recipient | When |
|---|---|---|---|
| Onboarding submitted | Email (ES) | Supplier | After `POST /suppliers/onboard` — `supplierApplicationConfirmationEmail` |
| Onboarding submitted | Email (EN) | Admin (sbirfan@gmail.com) | After `POST /suppliers/onboard` — `supplierApplicationAdminAlertEmail` |
| Scoring complete | WhatsApp | Supplier | Inside `scoreSupplier()` — score + pathway (non-fatal) |
| Status changed (ACTIVE/PENDING/INACTIVE) | Email | Supplier | Admin patches status via `PATCH /admin/suppliers/:id/status` |
| Manual resend | WhatsApp | Supplier | Admin triggers `POST /suppliers/:id/send-whatsapp` |
| RFQ awarded | Email | Winning supplier | `POST /rfqs/:id/award/:responseId` — fire-and-forget |
| Inquiry created | Email | Supplier (company) | `POST /api/inquiries` — link to `/supplier-dashboard/inquiries` |
| ⚠️ Graduation to SELLABLE | — | — | **Not sent. No notification.** |
| ⚠️ Promotion to PUBLISHED | — | — | **Not sent. No notification.** |

---

## 8. Public-Facing Supplier Pages

### `/suppliers` (public supplier directory)
- Component: `suppliers.tsx`
- Data: `useListSuppliers({ search })` → `GET /api/suppliers` (**requireAdmin**)
- ⚠️ **Potential gap:** If `useListSuppliers` calls `/api/suppliers` (admin-only), public users cannot view the directory

### `/supplier/:id` (public supplier profile)
- Component: `supplier-detail.tsx`
- Data: `useGetSupplier(id)` — source route unclear; may call admin-restricted `GET /api/suppliers/:id`
- Shows: identity, trust score, categories, products, origin story, certifications
- ⚠️ **"Contact Supplier" button has no click handler** — not wired to inquiry creation

### `/supplier-marketplace` (internal validation page)
- Labeled "TEMP: Internal Validation Page"
- Calls `GET /api/suppliers/marketplace` (public, no auth)
- Shows SELLABLE/PUBLISHED suppliers only

### Public profile endpoint (correct for unauthenticated users)
`GET /api/suppliers/:id/profile` — no auth — returns safe public fields + `public_trust_score`

---

## 9. Confidence Score vs Public Trust Score

Both are computed at query time (not stored permanently in supplier row after ingestion).

### Confidence Score (internal, ingestion quality signal)
File: `confidence-scorer.ts`
6 factors → stored in `suppliers.confidenceScore` (decimal 0.00–1.00):
1. Website URL present and valid
2. AI normalised name differs meaningfully from raw input
3. Municipio matches known Colombian municipalities
4. Category matches agricultural taxonomy
5. Contact info present (WhatsApp or email)
6. AI output contained ≤ 7 fields

### Public Trust Score (buyer-facing)
Computed at query time from 5 public-safe signals:
1. sourceUrl valid
2. normalizedName present
3. description > 20 chars
4. municipio recognised
5. claimStatus = CLAIMED

Exposed on: `GET /api/suppliers/:id/profile`, `GET /api/suppliers/marketplace`, `GET /api/suppliers/:id` (admin).

---

## 10. Full API Route Reference

### Farmer Onboarding
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/suppliers/onboard` | None | Submit onboarding form (create or update mode) |

### Farmer Profiles — Public
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/suppliers/marketplace` | None | SELLABLE/PUBLISHED suppliers with public_trust_score and products |
| `GET` | `/api/suppliers/:id/profile` | None | Public curated supplier profile + public_trust_score |

### Farmer Profiles — Authenticated
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/suppliers/my-profile` | User | Matches logged-in email to suppliersTable; returns profileCompleteness |

### Farmer Management — Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/suppliers/admin-list` | Admin | Paginated supplier list with filters (?pathway, municipio, from, to, q) |
| `GET` | `/api/suppliers` | Admin | All suppliers with graduation fields |
| `GET` | `/api/suppliers/:id` | Admin | Full supplier + public_trust_score + profileCompleteness |
| `GET` | `/api/suppliers/:id/evaluations` | Admin | Up to 20 evaluation snapshots |
| `GET` | `/api/suppliers/:id/transitions` | Admin | Up to 20 state transition history rows |
| `GET` | `/api/suppliers/:id/document` | Admin | Latest generated document content |
| `POST` | `/api/suppliers/:id/generate-document` | Admin | Generate AI document (EN/ES) |
| `POST` | `/api/suppliers/:id/send-whatsapp` | Admin | Manually resend WhatsApp with latest score |
| `POST` | `/api/admin/suppliers/:id/transition` | Admin | Manual state transition (requires justification) |
| `POST` | `/api/admin/suppliers/:id/publish` | Admin | Publish (requires SELLABLE status first) |
| `PATCH` | `/api/admin/suppliers/:id/status` | Admin | Update supplier status (ACTIVE/PENDING/INACTIVE) + email |
| `PATCH` | `/api/admin/suppliers/:id/compliance` | Admin | Patch compliance doc booleans (does NOT re-trigger evaluation) |

### Ingestion — Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/ingestion/batches` | Admin | Create ingestion batch (DRAFT) |
| `POST` | `/api/admin/ingestion/batches/:id/submit` | Admin | Submit batch (status → SUBMITTED) |
| `POST` | `/api/admin/ingestion/discover` | Admin | AI lead discovery (ephemeral, no DB write) |
| `POST` | `/api/admin/ingestion/suppliers` | Admin | Create ingested supplier (DRAFT) + optional product placeholder |
| `POST` | `/api/admin/ingestion/enrich` | Admin | AI enrichment (caller persists confidenceScore if supplierId given) |
| `POST` | `/api/admin/ingestion/batch-confirm` | Admin | Bulk promote leads to READY |
| `PATCH` | `/api/admin/ingestion/suppliers/:id/ingestion-status` | Admin | Update ingestion status |
| `GET` | `/api/admin/ingestion/batches` | Admin | List ingestion batches |
| `GET` | `/api/admin/ingestion/suppliers/:id/product-placeholders` | Admin | Inferred product list with computed status |

### B2B Supplier (company accounts)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/supplier/stats` | User | Dashboard stats (products, inquiries, orders, revenue) |
| `GET` | `/api/supplier/profile` | User | B2B company profile |
| `PATCH` | `/api/supplier/profile` | User | Update B2B company profile |
| `GET` | `/api/supplier/products` | User | List supplier's products |
| `POST` | `/api/supplier/products` | User | Create product |
| `PATCH` | `/api/supplier/products/:id` | User | Update product (ownership check) |
| `DELETE` | `/api/supplier/products/:id` | User | Delete product (ownership check) |
| `GET` | `/api/supplier/inquiries` | User | List inquiries for supplier's products |
| `PATCH` | `/api/supplier/inquiries/:id` | User | Update inquiry status (ownership check) |
| `GET` | `/api/supplier/orders` | User | List orders containing supplier's products |
| `PATCH` | `/api/supplier/orders/:id/status` | User | Update order status (ownership check) |
| `GET` | `/api/supplier/rfqs` | User | List open RFQs with hasResponded flag |
| `POST` | `/api/rfqs/:id/respond` | User | Submit RFQ bid |

---

## 11. Gaps and Broken Connections

### 🔴 Critical — Broken Functionality

**G1: Buyer "Contact Supplier" button is unwired**
- File: `artifacts/fincava/src/pages/supplier-detail.tsx`
- `<Button>Contact Supplier</Button>` has no click handler, no routing, no modal
- `POST /api/inquiries` exists but is not called from supplier-detail.tsx
- Impact: buyers cannot contact suppliers from the supplier profile page

**G2: Buyer inquiry creation has no form**
- File: `artifacts/fincava/src/pages/product-detail.tsx`
- "Request Quote / Inquiry" redirects to `/dashboard/inquiries` (read-only list)
- No form to compose and submit a new inquiry is wired into the buyer UI
- `POST /api/inquiries` backend is complete and functional but unused by the UI

**G3: Public supplier directory may be admin-restricted**
- File: `artifacts/fincava/src/pages/suppliers.tsx`
- `useListSuppliers()` — if the underlying hook calls `GET /api/suppliers` (requireAdmin), public users get a 401
- `GET /api/suppliers/marketplace` is the correct public endpoint but is not used here

**G4: Supplier detail page may use admin-restricted profile endpoint**
- File: `artifacts/fincava/src/pages/supplier-detail.tsx`
- `useGetSupplier(id)` may hit `GET /api/suppliers/:id` (requireAdmin) rather than `GET /api/suppliers/:id/profile` (no auth)
- If so, non-admin visitors cannot view supplier profiles

### 🟠 Significant — Missing Flows

**G5: Ingestion → Scoring is not connected**
- Ingested suppliers marked READY have no mechanism to enter the scoring/graduation pipeline
- Scoring only triggers from `POST /api/suppliers/onboard`
- A field officer visit is required to bridge ingestion-discovered suppliers into the graduation pipeline
- There is no "score this ingested supplier" admin action

**G6: No re-evaluation after compliance update**
- `PATCH /api/admin/suppliers/:id/compliance` updates compliance docs but does NOT re-run `evaluateSupplier()`
- If a supplier was NOT_READY due to missing ICA/RUT, admin fixing those docs has no automatic effect
- Admin must manually transition state via the transition endpoint

**G7: No graduation notifications**
- No email or WhatsApp is sent when a supplier reaches SELLABLE (eligible for marketplace)
- No notification when a supplier is PUBLISHED (listed on marketplace)
- Supplier has no way to know they've been approved without checking back

**G8: No FIELD_OFFICER user role**
- `officer_applications` table stores field officer applications
- No flow exists to promote an application to a user account with a dedicated role
- Officers currently need full ADMIN role access (exposes user management, commercial data, etc.)
- The `/officer/dashboard` route guards with `requireAdmin`, not a dedicated role

**G9: Claim flow is not implemented**
- `claimStatus` (UNCLAIMED/PENDING/CLAIMED) and `claimToken` columns exist in suppliersTable
- No endpoint generates a claim token or sets claimStatus to CLAIMED
- `GET /api/suppliers/my-profile` bridges via email-match only — no token-based claim UX
- The public trust score awards 1 point for claimStatus=CLAIMED but this can never be achieved

**G10: Officer applications have no promotion flow**
- `officer_applications` table stores pending applications
- No admin UI to view, approve, or reject officer applications
- No flow to convert an application into a FIELD_OFFICER user account

### 🟡 Notable — Incomplete Features

**G11: finance.tsx is a placeholder**
- `artifacts/fincava/src/pages/supplier-dashboard/finance.tsx` shows "coming soon"
- `GET /api/financing/...` endpoints referenced in the generated client may not be implemented

**G12: productPlaceholders not shown in admin supplier detail**
- Product category hints from ingestion feed into Claude scoring
- They are not visible in the admin supplier detail drawer
- Admin cannot see or edit what category hints are influencing the AI score

**G13: Compliance update does not log interaction**
- `PATCH /api/admin/suppliers/:id/compliance` updates the DB but does not write to `interactions` table
- No audit trail for who changed which compliance fields and when

**G14: farms and economics tables have no uniqueness constraint**
- Multiple rows per supplier are possible (no `UNIQUE(supplier_id)`)
- The onboarding route uses UPSERT logic but the DB does not enforce 1:1
- Query code reads `[farmRow]` (first row), so second rows are silently ignored

**G15: Manual transitions bypass re-evaluation**
- Admin can use `POST /api/admin/suppliers/:id/transition` to set any state
- This does not run `evaluateSupplier()` so the evaluation snapshot may be out of sync with actual state

---

## 12. Build Roadmap — Four Completed Phases

#### Phase 1 — Close the Admin Loop ✅ COMPLETE
1. `GET /api/suppliers/:id` returns `profileCompleteness` object (hasFarmData, hasEconomicsData, hasComplianceData, hasAiScore, isGraduated)
2. `POST /api/suppliers/onboard` accepts optional `supplierId` → update mode (HTTP 200 + `mode: "profile_completion"`)
3. Admin supplier detail panel shows completeness panel with 5 dimensions (Farm data, Economics, Compliance, AI readiness score, Graduated) each with ✓/○
4. Amber "Collect farm data →" Link when hasFarmData=false → `/onboarding?supplierId=&prefill=1`
5. Onboarding page: reads `?supplierId=&prefill=1` → fetches supplier, locks identity fields, shows banner

#### Phase 2 — Field Officer Launch Point ✅ COMPLETE
1. `/officer/dashboard` — mobile-first page with green officer header (name + FO-{userId} code)
2. Supplier search uses server-side ILIKE on name/municipio/department/product (GET /api/suppliers/admin-list?q=)
3. Each result card has a "Visit →" link to `/onboarding?supplierId=&prefill=1&officerName=&officerCode=`
4. "+ Register new supplier" CTA for new registrations
5. "Field Visits" link added to admin sidebar between Ingestion and Orders

#### Phase 3 — Combined AI Input ✅ COMPLETE
1. `buildScoringInput` now fetches `productPlaceholdersTable` in addition to the four core tables
2. Returns `ingestion` block: normalizedName, description, confidenceScore, dataCompletenessScore, ingestionSource, ingestionStatus, sourceType, categoryHints[]
3. `scoreSupplier` passes `{ supplier, farm, economics, compliance, ingestion }` to Claude prompt
4. Ingestion-enriched suppliers get richer market context in the AI scoring call

#### Phase 4 — Supplier Self-Completion ✅ COMPLETE
1. `GET /api/suppliers/my-profile` — resolves logged-in user's supplier record by email match, returns profileCompleteness
2. Supplier dashboard (`/supplier-dashboard`) shows `ProfileCompletenessWidget` when a linked record exists
3. Widget shows % progress bar + 5 dimensions with ✓/○ + "Complete →" links per incomplete section
4. "Complete your farm profile" CTA button links to `/onboarding?supplierId=&prefill=1`
5. Widget silently hides for users with no linked supplier record (no error state shown)

---

## 13. Key File Reference

| File | Purpose |
|---|---|
| `artifacts/api-server/src/routes/suppliers.ts` | All farmer supplier routes (onboard, admin-list, my-profile, scoring, documents, state transitions) |
| `artifacts/api-server/src/routes/admin.ts` | Admin ingestion routes, compliance update, status change, trust recompute |
| `artifacts/api-server/src/services/scoring-service.ts` | `scoreSupplier()` — Claude scoring pipeline with retries |
| `artifacts/api-server/src/services/scoring-input.ts` | `buildScoringInput()` — reads 5 tables, builds ingestion block |
| `artifacts/api-server/src/services/supplier-graduation-service.ts` | `evaluateSupplier()`, `transitionTo()`, `markPublished()` |
| `artifacts/api-server/src/services/onboard-pipeline.ts` | Runs scoreSupplier → evaluateSupplier after onboard event |
| `artifacts/api-server/src/services/discovery-engine.ts` | Ephemeral AI lead discovery (no DB writes) |
| `artifacts/api-server/src/services/ingestion-structuring-service.ts` | AI enrichment (no DB writes; caller persists) |
| `artifacts/api-server/src/services/confidence-scorer.ts` | `computePublicTrustScore()` and `computeConfidenceScore()` |
| `artifacts/api-server/src/config/scoring-prompts.ts` | `SCORING_PROMPT` sent to Claude for scoring |
| `artifacts/api-server/src/lib/email.ts` | All email templates and `sendEmail()` |
| `artifacts/api-server/src/lib/whatsapp.ts` | `sendWhatsAppMessage()` |
| `lib/config/thresholds.ts` | Graduation threshold values (version, eligibility fields, commercial cutoffs) |
| `lib/db/src/schema/suppliers.ts` | suppliersTable, farmsTable, economicsTable, complianceDocsTable, aiOutputsTable, interactionsTable, productPlaceholdersTable, supplierIngestionBatchesTable |
| `lib/db/src/schema/supplier-evaluations.ts` | supplierEvaluationsTable |
| `lib/db/src/schema/supplier-state-transitions.ts` | supplierStateTransitionsTable |
| `lib/db/src/schema/officer-applications.ts` | officerApplicationsTable |
| `artifacts/fincava/src/pages/onboarding.tsx` | Multi-step farmer onboarding form (create + update + prefill modes) |
| `artifacts/fincava/src/pages/officer/dashboard.tsx` | Field officer supplier search + farm visit launcher |
| `artifacts/fincava/src/pages/admin/suppliers.tsx` | Admin supplier management + completeness panel |
| `artifacts/fincava/src/pages/supplier-dashboard/index.tsx` | B2B supplier dashboard + ProfileCompletenessWidget |
| `artifacts/fincava/src/pages/supplier-detail.tsx` | Public supplier profile (⚠️ auth gap, ⚠️ Contact button unwired) |
| `artifacts/fincava/src/pages/suppliers.tsx` | Public supplier directory (⚠️ may call admin-restricted endpoint) |
