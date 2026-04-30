# Fincava — Supplier Layer Architecture

> Living document. Update this when routes, schemas, pipeline steps, or data contracts change.
> Last updated: April 2026 — G1–G7 supplier layer gaps closed; Phase 1–4 complete.

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
  - **Profile Completeness panel** (5 dimensions: Farm data, Economics, Compliance, AI readiness score, Graduated) with ✓/○ per row
  - Amber "Collect farm data →" link when hasFarmData=false → `/onboarding?supplierId=&prefill=1`
  - **"⚡ Score Now" button** — triggers `POST /api/admin/suppliers/:id/score` to re-run AI pipeline on demand
  - Status change dropdown (ACTIVE/PENDING/INACTIVE)
  - Document generation (English/Spanish AI document via Claude)
  - Manual WhatsApp resend button
- Manual state transitions via `POST /api/admin/suppliers/:id/transition` (ADMIN/FOUNDER actor, requires justification)
- Manual publish via `POST /api/admin/suppliers/:id/publish` (requires supplier to be SELLABLE first)
- Compliance doc patch via `PATCH /api/admin/suppliers/:id/compliance` (now auto re-evaluates if AI score exists)

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

**⚠️ Gap (G8):** Officer dashboard is ADMIN-only (`requireAdmin`). Real officers would need ADMIN role (full access) or a new FIELD_OFFICER role.

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
- `/suppliers` — public supplier directory calling `GET /api/suppliers/marketplace` (no auth required; SELLABLE/PUBLISHED only)

**Supplier profile:**
- `/suppliers/:id` — public profile using `GET /api/suppliers/:id/profile` (no auth)
- Shows: identity, trust score, categories, products, origin story, certifications
- **"Contact Supplier" button** — hidden for guests; authenticated buyers open an in-page inquiry dialog with:
  - Product picker dropdown (from the supplier's products list)
  - Quantity field (optional)
  - Message textarea (required)
  - Posts to `POST /api/inquiries`; supplier notified by email

**Inquiry creation:**
- Product-detail "Request Quote / Inquiry" button opens an in-page dialog (no redirect) for authenticated users
- Guests are redirected to `/login`
- Backend `POST /api/inquiries` sends email notification to supplier

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
 │                 │  → if → SELLABLE (first time): logs SUPPLIER_SELLABLE interaction
 │                 │    + sends graduation email to supplier (non-fatal, async)
 └─────────────────┘
```

The same pipeline is also triggered by:
- `POST /api/admin/suppliers/:id/score` (G5 — admin "Score Now" button)

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

### ⚠️ Gap (G9): Ingestion → Scoring is NOT auto-connected

Ingested suppliers (status=READY) are **not automatically scored**. Scoring only runs after:
1. `POST /api/suppliers/onboard` (field officer collects farm data)
2. `POST /api/admin/suppliers/:id/score` (admin manually triggers via "Score Now" button)

### ingestionStatus lifecycle
```
(created) → DRAFT → ENRICHED → READY
                              └──→ REJECTED
```

---

## 5. AI Scoring Contract

### Scoring prompt version
`SCORING_PROMPT_V1` is the active prompt (in `artifacts/api-server/src/config/scoring-prompts.ts`). It provides:
- Field-by-field guidance for all 5 input blocks (supplier, farm, economics, compliance, ingestion)
- Explicit scoring rubric: land rights, production volume, post-harvest quality, compliance, commitment (20pts each)
- Pathway thresholds: A≥75, B 60–74, C 40–59, D<40
- `primary_recommendation` returned in Spanish for the farmer

`SCORING_PROMPT_V0` retained as reference. Update `SCORING_PROMPT` export to switch versions.

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

### Score Now (G5)
`POST /api/admin/suppliers/:id/score`
- Fires `runOnboardPipeline()` asynchronously (same pipeline as onboarding)
- Response returns immediately (202-style) with `correlationId`
- UI shows "⚡ Score Now" button in the admin detail drawer with started/failed feedback
- Use when: ingested supplier has farm data but no AI score, or after data corrections

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

### Compliance update (G6)
`PATCH /api/admin/suppliers/:id/compliance`
- Updates: rutDian, icaRegistro, fitosanitarioCert, dianExportador, consentGiven (partial)
- **Auto re-evaluates** via `evaluateSupplier()` if an `ONBOARD_SCORE` ai_outputs row exists
- Returns `{ complianceDocs, consentGiven, fieldsUpdated, evaluation? }` — `evaluation` present when re-evaluation ran
- No-op re-evaluation if supplier has never been scored (safe guard)

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
| Graduation to SELLABLE (first time) | Email (ES) | Supplier | `evaluateSupplier()` — `supplierGraduationEmail(state:"SELLABLE")` — non-fatal async |
| Promotion to PUBLISHED | Email (ES) | Supplier | ⚠️ Template exists (`supplierGraduationEmail(state:"PUBLISHED")`) but not yet wired into `markPublished()` |

---

## 8. Public-Facing Supplier Pages

### `/suppliers` (public supplier directory)
- Component: `suppliers.tsx`
- Data: `GET /api/suppliers/marketplace` (no auth — SELLABLE/PUBLISHED only)
- Client-side search filter over returned results
- Shows: supplier name, location, public_trust_score, product count

### `/suppliers/:id` (public supplier profile)
- Component: `supplier-detail.tsx`
- Data: `GET /api/suppliers/:id/profile` (no auth)
- Shows: identity, trust score, categories, products, origin story, certifications
- **"Contact Supplier" button:**
  - Hidden for unauthenticated visitors
  - Authenticated buyers → opens in-page dialog with product picker, quantity, message
  - Dialog posts to `POST /api/inquiries`; supplier receives email notification

### `/product/:id` (public product detail)
- "Request Quote / Inquiry" button:
  - Unauthenticated → redirects to `/login`
  - Authenticated → opens in-page inquiry dialog with quantity + message fields
  - Posts to `POST /api/inquiries`

### Public profile endpoint
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
| `GET` | `/api/suppliers/my-profile` | User | Matches logged-in email to suppliersTable; returns profileCompleteness + claimStatus |
| `PATCH` | `/api/suppliers/:id/claim` | User | Claim a farmer record by email match; sets claimStatus=CLAIMED |

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
| `POST` | `/api/admin/suppliers/:id/score` | Admin | Trigger AI scoring pipeline on demand (G5) |
| `POST` | `/api/admin/suppliers/:id/transition` | Admin | Manual state transition (requires justification) |
| `POST` | `/api/admin/suppliers/:id/publish` | Admin | Publish (requires SELLABLE status first) |
| `PATCH` | `/api/admin/suppliers/:id/status` | Admin | Update supplier status (ACTIVE/PENDING/INACTIVE) + email |
| `PATCH` | `/api/admin/suppliers/:id/compliance` | Admin | Patch compliance doc booleans + auto re-evaluates if AI score exists (G6) |

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

## 11. Gaps and Status

### ✅ Resolved (G1–G7)

**G1: Contact Supplier button wired** — `supplier-detail.tsx` now opens an in-page dialog (product picker + quantity + message); hidden for unauthenticated users; posts to `POST /api/inquiries`.

**G2: Buyer inquiry creation form exists** — `product-detail.tsx` "Request Quote" now opens an in-page inquiry dialog instead of redirecting to the read-only inquiry list.

**G3: Supplier directory uses public endpoint** — `suppliers.tsx` calls `GET /api/suppliers/marketplace` (no auth, SELLABLE/PUBLISHED only) with client-side search.

**G4: Supplier detail uses public profile endpoint** — `supplier-detail.tsx` fetches `GET /api/suppliers/:id/profile` (no auth) via `useEffect/fetch` instead of the admin-restricted generated hook.

**G5: Admin Score Now endpoint** — `POST /api/admin/suppliers/:id/score` fires `runOnboardPipeline()` asynchronously; "⚡ Score Now" button in admin detail drawer.

**G6: Compliance update triggers re-evaluation** — `PATCH /api/admin/suppliers/:id/compliance` now calls `evaluateSupplier()` after update, guarded by checking an ONBOARD_SCORE row exists first.

**G7: Graduation notifications implemented** — `supplierGraduationEmail()` template (ES) added to `email.ts` for both SELLABLE and PUBLISHED states; SELLABLE notification wired in `evaluateSupplier()` at the transition guard (non-fatal async).

### 🔴 Still Open

**G8: No FIELD_OFFICER user role**
- `officer_applications` table stores applications, but no promotion flow to user account exists
- Officers currently need full ADMIN role (`requireAdmin` on `/officer/dashboard`)
- Exposes user management, commercial data, and all admin actions to officers

**G9: Claim flow — email-match claim implemented** (token-based claim still open)
- `PATCH /api/suppliers/:id/claim` — auth required; verifies logged-in user email matches `suppliersTable.email`; sets `claimStatus = 'CLAIMED'`; 403 if mismatch
- Supplier dashboard shows amber "Claim your profile" panel with button; confirms with green banner on success
- `claimToken`-based claim (shareable link) not yet implemented — `claimToken` column exists but is never populated

**G10: Officer applications have no promotion flow**
- No admin UI to view, approve, or reject officer applications
- No flow to convert an application into a user account

### 🟡 Notable — Incomplete Features

**G11: finance.tsx is a placeholder** — "coming soon" stub; no financing endpoints implemented.

**G12: productPlaceholders not visible in admin drawer** — category hints feed AI scoring but are not surfaced in the admin detail panel.

**G13: Compliance update does not log to interactions** — no audit trail row when admin changes compliance booleans.

**G14: farms and economics tables have no uniqueness constraint** — multiple rows per supplier are possible; query code reads first row only.

**G15: Manual transitions bypass re-evaluation** — `POST /api/admin/suppliers/:id/transition` sets state without running `evaluateSupplier()`, so the evaluation snapshot may diverge.

**G16: PUBLISHED email not wired** — `supplierGraduationEmail(state:"PUBLISHED")` template exists but `markPublished()` does not call it yet.

---

## 12. Build Roadmap — Status

#### Phase 1 — Close the Admin Loop ✅ COMPLETE
1. `GET /api/suppliers/:id` returns `profileCompleteness` object
2. `POST /api/suppliers/onboard` accepts optional `supplierId` → update mode
3. Admin drawer: 5-dimension completeness panel with ✓/○ badges
4. Amber "Collect farm data →" link → `/onboarding?supplierId=&prefill=1`
5. Onboarding: `?supplierId=&prefill=1` pre-fills and locks identity fields

#### Phase 2 — Field Officer Launch Point ✅ COMPLETE
1. `/officer/dashboard` — mobile-first, green header with name + FO-{userId} code
2. Server-side ILIKE supplier search (`?q=` on admin-list)
3. "Visit →" links to pre-filled onboarding
4. "+ Register new supplier" CTA
5. "Field Visits" link added to admin sidebar

#### Phase 3 — Combined AI Input ✅ COMPLETE
1. `buildScoringInput` fetches `productPlaceholdersTable`
2. Returns `ingestion` block to Claude: normalizedName, description, confidenceScore, categoryHints[]
3. All suppliers get market context; ingestion-enriched suppliers score more accurately

#### Phase 4 — Supplier Self-Completion ✅ COMPLETE
1. `GET /api/suppliers/my-profile` — email-match bridge to suppliersTable
2. `ProfileCompletenessWidget` in supplier dashboard — % bar, 5 dimensions, "Complete →" links
3. Widget silently hides when no linked supplier record found

#### Supplier Layer Hardening ✅ COMPLETE (G1–G7)
- G1: Contact Supplier dialog with product picker (auth-gated)
- G2: Product-detail inquiry dialog (no redirect)
- G3: Public supplier directory → marketplace endpoint
- G4: Public supplier profile → profile endpoint
- G5: Admin Score Now endpoint + UI button
- G6: Compliance update auto re-evaluates graduation state
- G7: SELLABLE graduation email notification

#### Next — Phase 2 Expansion (queued)
- **Field officer mobile dashboard** — mobile-optimised `/field-officer` route with assigned-area supplier list and quick-launch onboarding
- **Combined AI prompt** — inject farm + economics + compliance rows into scoring prompt for richer evaluations
- **Supplier self-claim** — `PATCH /api/suppliers/:id/claim` to set CLAIMED status + supplier dashboard "Complete Profile" card
