# Fincava — Buyer Layer Architecture

> Living document. Update this when routes, schemas, pipeline steps, or data contracts change.
> Last updated: April 2026 — v1.0, derived from buyer persona drafts + platform audit.
> AI model for buyer services: **Claude Sonnet 4.6 (Anthropic-only, shared SDK client).**

---

## Critical Architectural Note — What Already Exists

The buyer layer is **not a greenfield build**. Significant infrastructure already exists and must be extended, not replaced.

| System | Status | Notes |
|---|---|---|
| `users` table with `role = 'BUYER'` | ✅ Exists | BUYER is the default role on registration |
| `companies` table | ✅ Exists | `company_type` ENUM missing `ROASTER` — see BG2 |
| `buyer_profiles` table | ✅ Exists | Missing Phase 2 columns (state, p2_completion_pct, etc.) — see BG1 |
| `rfqs` + `rfq_responses` tables | ✅ Exists | Missing rich matching columns — see BG3 |
| `inquiries`, `orders`, `order_items` | ✅ Exists | No changes needed |
| `messages` (conversations) | ✅ Exists | No changes needed |
| `loans`, `repayments` (financing) | ✅ Exists | **Hidden from buyer layer** — see Finance section |
| Buyer dashboard pages (`/dashboard/*`) | ✅ Exists | 9 sub-pages already wired |
| `POST /api/buyers/onboard` | ✅ Exists | Used by current registration; compatible with new flow |
| `GET /api/buyers/profile` | ✅ Exists | Returns current buyer's profile |
| `GET /api/buyer/stats` | ✅ Exists | Stat cards on dashboard |
| `GET /api/buyer/inquiries` | ✅ Exists | Buyer inquiry list |
| `GET /api/buyer/orders` | ✅ Exists | Buyer order list |
| Financing routes (`/api/finance/*`) | ✅ Exists | **Park/hide from buyers — backlog only** |

**New tables needed:** `buyer_matches`, `buyer_gap_briefs` (see BG4, BG5).

---

## Persona Strategy

### Approach: General Buyer Profile with Archetype Signals

The platform serves a spectrum of buyers. Rather than hard-coding persona-specific flows now, we build one **General Buyer Profile** that collects enough signal to serve all archetypes well. The `company_type` field is the primary differentiator — match quality and UI emphasis adapt based on it. Individual persona targeting is a future enhancement.

### Primary Design Target: "Marco Vogel" (Specialty Roaster)

> Every architectural decision made to satisfy Marco automatically satisfies commodity importers and distributors, whose requirements are a subset of his.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MARCO VOGEL  │  38  │  Hamburg, Germany                                    │
│  Co-founder, Volta Coffee Roasters  │  €2.1M revenue  │  12 employees       │
│  Colombia sourcing: 18–22 MT/year                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  SEEKING: Specialty green coffee (84–88 SCA), washed/natural/honey           │
│           Varietals: Castillo, Caturra, Gesha, Tabi, Pink Bourbon           │
│           Fine-flavor cacao — Sierra Nevada de Santa Marta                  │
│  CERTS REQUIRED: EU Organic. Preferred: Fair Trade, Rainforest Alliance      │
│  VOLUME: 3–8 MT/order × 3–4 orders/year  │  FOB Buenaventura / Cartagena    │
│  PAIN: Broker adds 12–18% margin, hides the farm, controls the relationship  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Secondary Archetypes (architecture must remain compatible)

| Archetype | Geography | Volume | Key Signal | Trust Threshold |
|---|---|---|---|---|
| **GCC Boutique Roaster** | UAE, Saudi, Qatar | 100–500 kg/month | Origin story + differentiation | MEDIUM — tolerates partial data |
| **Asian SME Importer** | Malaysia, Indonesia, Vietnam, Pakistan | 500 kg–5 MT/month | Price clarity + MOQ + verification | MEDIUM–HIGH |
| **Specialty Brand Builder** | Asia / GCC | Low volume | Story-rich origin, branding | LOW–MEDIUM — flexible |
| **"The Trader"** (compat only) | Rotterdam | 200–500 MT/year | Volume reliability, price | None — no story required |
| **"The Distributor"** (compat only) | US market | 50–150 MT/year | Catalog breadth, RFQ speed | USDA NOP |

**Architecture rule:** Where archetype needs conflict with Marco's, Marco wins. The `company_type` value is passed to the matching prompt so Sonnet 4.6 can weight results appropriately per archetype.

### Friction Map (Marco's drop-off points)

```
/buyer-register (Phase 1 — 7 fields)
  ↓ [MEDIUM FRICTION]
  ⚠ "Company type" — Marco identifies as Roaster, not Importer.
    Fix: ROASTER in company_type ENUM (BG2)
  ⚠ Volume question — Marco thinks in lots, not annual MT.
    Fix: Conversion helper "3–8 MT/order × 3 orders ≈ 15 MT/year"

Email verification
  ↓ [LOW FRICTION — expected]

Dashboard Phase 2 widget
  ↓ [HIGH FRICTION — biggest drop-off risk]
  ⚠ 6 sections feels like homework. Marco closes the tab.
    Fix: Teaser match banner shown immediately using Phase 1 data (BG13)
  ⚠ Section E (Gap Sourcing) feels intrusive before trust is built.
    Fix: Section E is last, styled amber, shown only after initial matches seen.

Sections A + B complete → Initial matching run
  ↓ [CRITICAL MOMENT — Marco must see real supplier profiles, not placeholders]

Section E complete → Gap brief → Ingestion pipeline triggered
  ↓ [HIGHEST VALUE MOMENT for Fincava — buyer's gaps commission new supplier sourcing]
```

---

## Buyer State Machine

State is stored in `buyer_profiles.state` (VARCHAR 20).

```
UNREGISTERED
    ↓  POST /api/buyers/register (Phase 1 form)
REGISTERED          email_verification_token created → verification email sent
    ↓  Email link clicked → GET /api/buyers/verify-email?token=
ACTIVE              welcome email sent; nudge scheduled at +48h if p2_completion_pct < 30
    ↓  Any Phase 2 field saved
PROFILING           p2_completion_pct > 0; nudge at +7d if p2_completion_pct < 50
    ↓  Sections A + B complete
MATCHED             buyer_matches records created; "Your matches are ready" email
    ↓  Any Section E field answered
GAP_SCANNED         buyer_gap_briefs created; HIGH gaps → auto-escalate to ingestion pipeline
    ↓  Buyer responds to a match / issues RFQ
ENGAGING            rfqs.status = 'OPEN'; admin notified for facilitation
    ↓  Order placed
TRADING             orders record created; ongoing relationship
```

Valid state values: `REGISTERED` · `ACTIVE` · `PROFILING` · `MATCHED` · `GAP_SCANNED` · `ENGAGING` · `TRADING`

---

## DB Schema

### Existing Tables (no structural changes except additive columns)

#### `users`
- `role` enum: `BUYER` (default), `SUPPLIER`, `ADMIN` — no change

#### `companies` — needs additive ENUM change (BG2)
- `company_type`: currently `IMPORTER | DISTRIBUTOR | MANUFACTURER | COOPERATIVE | OTHER`
- **Add:** `ROASTER` — Marco's archetype. Cognitive friction if absent.

#### `buyer_profiles` — additive column migrations (BG1)

Current columns: `id`, `user_id`, `company_name`, `country`, `destination_port`, `target_products[]`, `preferred_incoterm`, `intended_volume_mt`, `import_frequency`, `onboarded_at`, `updated_at`.

New columns to add via migration:

```sql
ALTER TABLE buyer_profiles
  -- State machine
  ADD COLUMN IF NOT EXISTS state                      VARCHAR(20) DEFAULT 'REGISTERED',

  -- Phase 1 enrichment
  ADD COLUMN IF NOT EXISTS volume_band                VARCHAR(20),   -- <10MT | 10-50MT | 50-200MT | 200+MT
  ADD COLUMN IF NOT EXISTS required_certs_p1          TEXT[],
  ADD COLUMN IF NOT EXISTS time_to_first_order        VARCHAR(20),   -- WITHIN_30D | 1_3M | 3_6M | EXPLORATORY

  -- Phase 2 progress tracking
  ADD COLUMN IF NOT EXISTS p2_completion_pct          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS p2_sections_done           TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS matching_run_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_matched_at            TIMESTAMP,
  ADD COLUMN IF NOT EXISTS gap_flag_count             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_recommendation VARCHAR(10),

  -- Phase 2 Section A — Product Detail
  ADD COLUMN IF NOT EXISTS traceability_level         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS existing_colombia_rel      BOOLEAN,

  -- Phase 2 Section B — Commercial Terms
  ADD COLUMN IF NOT EXISTS trade_finance_open         BOOLEAN DEFAULT false,

  -- Phase 2 Section C — Quality & Compliance
  ADD COLUMN IF NOT EXISTS audit_standard             VARCHAR(50),

  -- Phase 2 Section D — Logistics
  ADD COLUMN IF NOT EXISTS logistics_partner          TEXT,

  -- Phase 2 Section E — Gap Sourcing (amber, distinct)
  -- gap data stored in buyer_gap_briefs, not buyer_profiles

  -- Phase 2 Section F — Platform Intent
  ADD COLUMN IF NOT EXISTS platform_intent            TEXT[],
  ADD COLUMN IF NOT EXISTS sample_ready               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prev_sourcing_channel      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discovery_budget_band      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS supplier_dev_open          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_type_pref         TEXT[],
  ADD COLUMN IF NOT EXISTS social_impact_reqs         TEXT[],
  ADD COLUMN IF NOT EXISTS early_stage_supplier_open  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS language_preference        TEXT[],

  -- Marketing opt-in (per user answer #6)
  ADD COLUMN IF NOT EXISTS marketing_opt_in           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_topics           TEXT[];   -- e.g. ['new_matches','price_alerts','supplier_updates']

CREATE INDEX IF NOT EXISTS idx_buyer_profiles_state      ON buyer_profiles(state);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_completion ON buyer_profiles(p2_completion_pct);
```

#### `rfqs` — additive column migrations (BG3)

```sql
ALTER TABLE rfqs
  ADD COLUMN IF NOT EXISTS origin_requirements        TEXT,
  ADD COLUMN IF NOT EXISTS processing_method          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS quality_grade              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS required_certifications    TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_certifications   TEXT[],
  ADD COLUMN IF NOT EXISTS required_documents         TEXT[],
  ADD COLUMN IF NOT EXISTS import_regs                TEXT,
  ADD COLUMN IF NOT EXISTS annual_volume_mt           DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS moq_mt                     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS order_frequency            VARCHAR(30),
  ADD COLUMN IF NOT EXISTS price_range_min_usd_kg     DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS price_range_max_usd_kg     DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS incoterms                  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS lead_time_weeks            INTEGER,
  ADD COLUMN IF NOT EXISTS cold_chain_required        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS packaging_requirements     TEXT[];
```

### New Tables

#### `buyer_matches` (BG4)

```sql
CREATE TABLE buyer_matches (
  id                   SERIAL PRIMARY KEY,
  buyer_profile_id     INTEGER NOT NULL REFERENCES buyer_profiles(id),
  supplier_id          INTEGER NOT NULL REFERENCES suppliers(id),
  match_score          DECIMAL(3,2) NOT NULL CHECK(match_score BETWEEN 0.00 AND 1.00),
  score_breakdown      JSONB NOT NULL,    -- { category: 0.30, cert: 0.25, origin: 0.20, ... }
  disqualifiers        TEXT[],            -- reasons supplier was hard-excluded
  match_notes          TEXT,             -- Sonnet 4.6 plain-language explanation
  sections_at_run      TEXT[] NOT NULL,  -- which sections were complete when run fired
  is_current           BOOLEAN DEFAULT true,
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_buyer_matches_profile  ON buyer_matches(buyer_profile_id, is_current);
CREATE INDEX idx_buyer_matches_supplier ON buyer_matches(supplier_id);
CREATE INDEX idx_buyer_matches_score    ON buyer_matches(buyer_profile_id, match_score DESC);
```

**Notes:**
- `is_current = false` is set on all existing rows before each new matching run.
- `supplier_id` references `suppliersTable` (farmer graduation system), not `companiesTable`.
- Only `SELLABLE` / `PUBLISHED` suppliers are eligible as match candidates.

#### `buyer_gap_briefs` (BG5)

```sql
CREATE TABLE buyer_gap_briefs (
  id                       SERIAL PRIMARY KEY,
  buyer_profile_id         INTEGER NOT NULL REFERENCES buyer_profiles(id),
  gap_type                 VARCHAR(30) NOT NULL,   -- PRODUCT | ORIGIN | CERTIFICATION | VOLUME | SOCIAL_IMPACT | LOGISTICS | CATEGORY_EXPANSION
  priority                 VARCHAR(10) NOT NULL,   -- HIGH | MEDIUM | LOW
  pipeline_action          VARCHAR(30) NOT NULL,   -- IMMEDIATE_SOURCING | NEXT_BATCH | BACKLOG | ADMIN_REVIEW
  is_real_gap              BOOLEAN NOT NULL DEFAULT true,
  search_category          VARCHAR(50),
  search_region            TEXT,
  required_attributes      TEXT[],
  volume_target_mt         DECIMAL(10,2),
  buyer_urgency_note       TEXT,
  discovery_search_terms   TEXT[],
  ingestion_batch_id       INTEGER REFERENCES supplier_ingestion_batches(id),
  resolved_at              TIMESTAMP,
  created_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_buyer_gaps_profile    ON buyer_gap_briefs(buyer_profile_id);
CREATE INDEX idx_buyer_gaps_priority   ON buyer_gap_briefs(priority, pipeline_action);
CREATE INDEX idx_buyer_gaps_unresolved ON buyer_gap_briefs(resolved_at) WHERE resolved_at IS NULL;
```

**Notes:**
- `HIGH` priority gaps auto-escalate to the supplier ingestion pipeline (BuyerGapBridgeService).
- `MEDIUM` / `LOW` gaps are queued for admin review in `/admin/buyer-gaps`.
- `ingestion_batch_id` is set when a gap is escalated — links back to `supplier_ingestion_batches`.

### Entity Relationship (Buyer-Relevant)

```
users (id, email, role='BUYER')
  │ 1:1
  ▼
companies (id, user_id FK, company_type [includes ROASTER], country, name)
  │ 1:1
  ▼
buyer_profiles (id, user_id FK, state, p2_completion_pct, p2_sections_done, ...)
  │                          │
  │ 1:N                      │ 1:N
  ▼                          ▼
buyer_matches              buyer_gap_briefs
(supplier_id FK →            (ingestion_batch_id FK →
 suppliersTable)              supplier_ingestion_batches)
  │
  │ 1:N (draft RFQs seeded from buyer profile)
  ▼
rfqs (buyer_id FK, status=DRAFT|OPEN|CLOSED, ...)
  │ 1:N
  ▼
rfq_responses (rfq_id FK, company_id FK)
```

---

## Service Layer

### Service Catalogue

| Service | File | Responsibility | DB Tables Written | Calls |
|---|---|---|---|---|
| `BuyerRegistrationService` | `services/buyer-registration-service.ts` | Phase 1: create company, user, buyer_profile, seed RFQ draft | companies, users, buyer_profiles, rfqs | BuyerNotificationService |
| `BuyerProfileService` | `services/buyer-profile-service.ts` | Phase 2 field auto-save, completion % recalc, section tracking | buyer_profiles, rfqs | BuyerMatchingTrigger |
| `BuyerMatchingTrigger` | `services/buyer-matching-trigger.ts` | Watches p2_sections_done. Fires matching when thresholds met. Prevents duplicate runs. | buyer_profiles (read) | BuyerMatchingService |
| `BuyerMatchingService` | `services/buyer-matching-service.ts` | Calls Sonnet 4.6 with buyer profile + supplier catalog. Writes match results. | buyer_matches, buyer_profiles | Anthropic SDK, BuyerNotificationService |
| `BuyerGapService` | `services/buyer-gap-service.ts` | Calls Sonnet 4.6 gap analysis. Writes gap briefs. | buyer_gap_briefs | Anthropic SDK, BuyerGapBridgeService |
| `BuyerGapBridgeService` | `services/buyer-gap-bridge.ts` | Escalates HIGH priority gaps to ingestion pipeline. | ingestion_audit_log | IngestionBatchService, DiscoveryEngine |
| `BuyerNotificationService` | `services/buyer-notification-service.ts` | All buyer emails: verification, welcome, match-ready, nudges, marketing opt-in | — | Resend SDK |

**Critical:** Do not create a new `AnthropicClient` instance in buyer services. Import the shared client from `lib/anthropic-client.ts` (same pattern as `supplier-graduation-service.ts`).

### Anthropic Model Assignments

```typescript
// Supplier scoring (existing — unchanged)
const SCORING_MODEL  = process.env.SCORING_MODEL ?? 'claude-haiku-4-5';

// Buyer matching + gap analysis (new)
const MATCHING_MODEL = 'claude-sonnet-4-6';   // quality-critical — permanent match storage
const GAP_MODEL      = 'claude-sonnet-4-6';   // quality-critical — pipeline escalation
```

### BuyerMatchingService — Scoring Weights

Weights applied by Sonnet 4.6 when ranking the supplier catalog:

| Dimension | Weight | Hard Disqualifier |
|---|---|---|
| Product category match | 30% | — |
| Certification match | 25% | Required cert absent → score = 0.0, excluded |
| Origin match (region/department) | 20% | — |
| Volume capacity match | 15% | — |
| Supplier type preference | 10% | — |

Additional hard disqualifiers:
- `sellable_status NOT IN ('SELLABLE','PUBLISHED')` — excluded from catalog entirely
- `cold_chain_required = true` on buyer profile + no cold-chain documentation on supplier

### Matching Trigger Conditions

| Event | Trigger | AI Call |
|---|---|---|
| sections_done includes `['A','B']` for first time | Initial matching run | Sonnet 4.6 ~8K tokens |
| New section added after initial run | Re-run matching | Sonnet 4.6 ~8K tokens |
| Any Section E field saved (non-null) | Gap analysis | Sonnet 4.6 ~4K tokens |
| All 6 sections complete | Full matching run | Sonnet 4.6 ~10K tokens |

**Cost note:** As the supplier catalog grows, pre-filter by `product_categories` before passing to Sonnet to control token costs.

### Prompt Registry

```
artifacts/api-server/src/config/
  scoring-prompts.ts              ← existing, unchanged
  buyer-matching-prompts.ts       ← NEW: BUYER_MATCHING_SYSTEM_PROMPT
  buyer-gap-prompts.ts            ← NEW: BUYER_GAP_SYSTEM_PROMPT
```

---

## API Contract

All endpoints: `{ success: boolean, data?: T, error?: string }`. Buyer-authenticated endpoints require `requireAuth`. Admin endpoints require `requireAdmin`.

### Existing Endpoints (no changes)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/buyers/onboard` | Current buyer profile create/update — compatible with new registration flow |
| GET | `/api/buyers/profile` | Returns authenticated buyer's profile |
| GET | `/api/buyer/stats` | Dashboard stat cards |
| GET | `/api/buyer/inquiries` | Buyer inquiry list |
| POST | `/api/inquiries` | Create inquiry from product/supplier detail |
| GET | `/api/buyer/orders` | Buyer order list |
| POST | `/api/buyer/orders` | Place order |
| GET | `/api/buyer/orders/:id` | Order detail |
| GET/POST | `/api/messages/*` | Messaging (conversations, threads, send) |
| GET | `/api/buyer/rfqs` | Buyer RFQ list |
| POST | `/api/rfqs` | Post new RFQ |

### New Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/buyers/register` | None | Phase 1 form — create company, user, buyer_profile, seed RFQ draft |
| GET | `/api/buyers/verify-email?token=` | None | Email verification → redirect `/dashboard` |
| PATCH | `/api/buyers/:id/profile` | requireAuth | Phase 2 field auto-save (debounced). Returns `{ section, completion_pct, sections_done, matching_triggered }` |
| GET | `/api/buyers/:id/matches` | requireAuth | Current matches + `fields_that_improve_match` |
| GET | `/api/admin/buyers` | requireAdmin | Buyer list: state, completion %, match count, gap count |
| GET | `/api/admin/buyers/:id` | requireAdmin | Full buyer profile detail |
| GET | `/api/admin/buyers/:id/matches` | requireAdmin | All match runs for a buyer |
| GET | `/api/admin/buyers/:id/gaps` | requireAdmin | Gap briefs, priority-sorted |
| POST | `/api/admin/buyers/:id/suppress-match` | requireAdmin | Suppress a match before it surfaces to buyer |
| POST | `/api/admin/gaps/:id/escalate` | requireAdmin | Manually escalate MEDIUM gap to ingestion pipeline |
| PATCH | `/api/buyers/:id/marketing-preferences` | requireAuth | Update marketing opt-in + topic subscriptions |

### Phase 1 Registration Schema (Zod)

```typescript
const Phase1RegistrationSchema = z.object({
  company_name:        z.string().min(2),
  company_type:        z.enum(['IMPORTER','DISTRIBUTOR','ROASTER','MANUFACTURER','COOPERATIVE','OTHER']),
  country:             z.string().min(2),
  product_categories:  z.array(z.enum(['COFFEE','CACAO','AVOCADO','EXOTIC_FRUIT','SUPERFOOD','PROCESSED','TEXTILE','OTHER'])).min(1),
  volume_band:         z.enum(['<10MT','10-50MT','50-200MT','200+MT']),
  required_certs:      z.array(z.string()).default([]),
  time_to_first_order: z.enum(['WITHIN_30D','1_3M','3_6M','EXPLORATORY']),
  email:               z.string().email(),
  password:            z.string().min(8),
});
```

### Phase 2 Auto-Save Pattern

```typescript
// PATCH /api/buyers/:id/profile
// Body: { section: 'A'|'B'|'C'|'D'|'E'|'F', field: string, value: unknown }
// Response: { success: true, data: { section, field, completion_pct, sections_done, matching_triggered } }
//
// Note: matching_triggered = true if this save pushed sections_done to include ['A','B']
// for the first time, or added a new section that triggered a re-run.
```

---

## UI Layer

### Page Map

```
/buyer-register               ← Phase 1 form (no auth required) [BG14]
  └── /verify-email           ← Email verification holding page [BG12]

/dashboard                    ← Post-login landing (requireAuth, BUYER role)
  ├── /dashboard/profile      ← Phase 2 overview + progress bar + section cards [BG9]
  │   ├── /profile/section-a  ← Product Detail (traceability, Colombia relationships)
  │   ├── /profile/section-b  ← Commercial Terms (payment, incoterms, lead time, finance open)
  │   ├── /profile/section-c  ← Quality & Compliance (certifications, audit standards)
  │   ├── /profile/section-d  ← Logistics (cold chain, packaging, logistics partners)
  │   ├── /profile/section-e  ← Gap Sourcing [amber styling — commissions new sourcing]
  │   └── /profile/section-f  ← Platform Intent (sample ready, discovery budget, impact prefs)
  ├── /dashboard/matches      ← Matched suppliers panel [BG10]
  ├── /dashboard/inquiries    ← Existing
  ├── /dashboard/orders       ← Existing
  ├── /dashboard/messages     ← Existing
  ├── /dashboard/market-intel ← Existing
  ├── /dashboard/analytics    ← Existing
  ├── /dashboard/rfqs         ← Existing
  └── /dashboard/profile      ← Existing basic profile (extended with Phase 2 widget)

/admin/buyers                 ← Admin buyer list [BG11]
/admin/buyer-matches          ← AI matching results review [BG11]
/admin/buyer-gaps             ← Gap escalation queue [BG11]
```

### Dashboard Component Architecture

```
<Dashboard>
  ├── <TeaserMatchBanner>              [BG13 — shown from Phase 1 onwards]
  │   "Based on your profile, we found potential matches.
  │    Complete Product Detail + Commercial Terms to see them."
  │   Uses Phase 1 data only for a low-confidence coarse preview.
  │
  ├── <ProfileCompletionWidget>        [BG9]
  │   ├── p2_completion_pct (from PATCH response)
  │   ├── sections_done[]
  │   └── <SectionCard section="A|B|C|D|E|F" status="done|in_progress|locked" />
  │       Section E: amber border, distinct icon, tooltip explaining it commissions sourcing
  │
  └── <MatchResultsPanel>              [BG10 — shown once matching has run]
      ├── <SupplierMatchCard score={0.82} />   [surfaces SCA, altitude, certs prominently]
      ├── <MatchConfidenceIndicator sections_complete={['A','B','C']} />
      └── <ImproveMatchPrompt fields={['traceability_level', 'origin_requirements']} />
```

### Design Decisions

| Decision | Rationale |
|---|---|
| Teaser match shown before Section A/B | Marco closes the tab without an immediate hook. Phase 1 alone gives enough signal for a coarse preview. |
| Section E amber, distinct from A–D | Marco must understand this is different — it actively commissions new supplier sourcing on his behalf. |
| `ROASTER` in `company_type` ENUM | Marco identifies as Roaster, not Importer. Wrong label increases Phase 1 drop-off. |
| Volume band shows lot-conversion helper | Marco thinks in lots (3–8 MT), not annual totals. Helper prevents under-reporting that degrades match quality. |
| Match card shows SCA and altitude first | Quality is Marco's primary filter. Certs and altitude shown first — not buried in a detail view. |
| `fields_that_improve_match` in API | Telling Marco exactly which fields improve his results is the most effective Phase 2 completion driver. |
| Marketing opt-in explicit, topic-level | Admin can send, or buyer self-selects topics. No undifferentiated newsletters. |

---

## Event & Notification Architecture

```
buyer.registered
  → BuyerNotificationService.sendEmailVerification()

buyer.email_verified
  → buyer_profiles.state = 'ACTIVE'
  → BuyerNotificationService.sendWelcome()
  → Schedule: nudge.48h (if p2_completion_pct < 30)

buyer.profile_field_saved  (PATCH /api/buyers/:id/profile)
  → BuyerProfileService.updateField()
  → BuyerProfileService.recalculateCompletion()
  → BuyerMatchingTrigger.checkAndFire()
      ├── IF sections_done ⊇ ['A','B'] AND matching_run_count === 0
      │     → BuyerMatchingService.runMatching() → buyer.match_ready
      ├── IF new section added AND matching_run_count > 0
      │     → BuyerMatchingService.runMatching()  [re-run]
      └── IF section === 'E' AND any E field non-null
            → BuyerGapService.analyseGaps()
              → BuyerGapBridgeService.escalateIfHigh()

buyer.match_ready
  → BuyerNotificationService.sendMatchReady()
  → buyer_profiles.state = 'MATCHED'

buyer.gap_escalated  (HIGH priority only)
  → IngestionBatchService.create()
  → DiscoveryEngine.discover()
  → ingestion_audit_log.insert()

nudge.48h  (scheduled)
  → IF p2_completion_pct < 30: BuyerNotificationService.sendNudge(1)

nudge.7d  (scheduled)
  → IF p2_completion_pct < 50: BuyerNotificationService.sendNudge(2)

marketing.send  (admin-triggered or buyer-opt-in)
  → BuyerNotificationService.sendMarketing(topic, buyerIds)
  → Gated by: buyer.marketing_opt_in = true AND topic ∈ buyer.marketing_topics
```

---

## Admin Interface

### New Admin Pages

**`/admin/buyers`** — Buyer overview table
- Columns: Name, Company, Country, Company Type, State, Phase 2 %, Match Count, Gap Count, Marketing Opt-in, Registered At
- Filters: State, completion %, company_type, marketing_opt_in
- Actions: Click row → detail drawer (same UX pattern as admin/suppliers.tsx)
- Drawer shows: full profile, phase 2 completeness, matches list, gap briefs
- Marketing: admin can send targeted emails to filtered buyer segments (opt-in only)

**`/admin/buyer-matches`** — Matching results review
- All `buyer_matches` where `is_current = true`
- Shows match_notes from Sonnet 4.6
- Admin can suppress a specific match (sets `disqualifiers` before it surfaces to buyer)

**`/admin/buyer-gaps`** — Gap escalation queue
- Sorted: HIGH → MEDIUM → LOW
- Shows: gap_type, buyer_urgency_note, pipeline_action, ingestion_batch_id (if escalated)
- Admin can manually escalate MEDIUM gaps or mark as ADMIN_REVIEW
- HIGH gaps are auto-escalated; admin view is read/audit only for those

---

## Buyer Gaps (BG-Series) — Implementation Checklist

These map to actionable development tasks.

| Gap | Description | Status | Priority |
|---|---|---|---|
| **BG1** | Add Phase 2 columns + state machine + marketing_opt_in columns to `buyer_profiles` via Drizzle migration | ⬜ Open | High |
| **BG2** | Add `ROASTER` to `company_type` ENUM in `companies` table schema | ⬜ Open | High |
| **BG3** | Add rich RFQ columns (origin, quality grade, certs, price range, incoterms, cold chain, etc.) to `rfqs` | ⬜ Open | Medium |
| **BG4** | Create `buyer_matches` table (Drizzle schema + migration) | ⬜ Open | High |
| **BG5** | Create `buyer_gap_briefs` table (Drizzle schema + migration) | ⬜ Open | High |
| **BG6** | `BuyerMatchingService` — Sonnet 4.6 matching + `buyer-matching-prompts.ts` | ⬜ Open | High |
| **BG7** | `BuyerGapService` + `buyer-gap-prompts.ts` | ⬜ Open | High |
| **BG8** | `BuyerGapBridgeService` (HIGH gaps → IngestionBatchService + DiscoveryEngine) | ⬜ Open | Medium |
| **BG9** | `BuyerMatchingTrigger` (watches sections_done, fires BG6 when thresholds met) | ⬜ Open | High |
| **BG10** | `BuyerProfileService` — Phase 2 auto-save (PATCH `/api/buyers/:id/profile`) | ⬜ Open | High |
| **BG11** | Phase 1 UI — `/buyer-register` form (7 fields, ROASTER option, volume helper) | ⬜ Open | High |
| **BG12** | Email verification flow (`GET /api/buyers/verify-email`) + state transition REGISTERED → ACTIVE | ⬜ Open | High |
| **BG13** | `BuyerNotificationService` — verification, welcome, match-ready, nudge emails | ⬜ Open | High |
| **BG14** | Phase 2 UI — dashboard ProfileCompletionWidget + 6 section pages (A–F) | ⬜ Open | High |
| **BG15** | `/dashboard/matches` page — MatchResultsPanel + SupplierMatchCard + ImproveMatchPrompt | ⬜ Open | High |
| **BG16** | Teaser match banner (coarse Phase 1 preview on dashboard before sections A+B done) | ⬜ Open | Medium |
| **BG17** | Admin pages — `/admin/buyers` + `/admin/buyer-matches` + `/admin/buyer-gaps` | ⬜ Open | High |
| **BG18** | Admin buyer detail drawer — profile completeness + gap list + suppress-match action | ⬜ Open | High |
| **BG19** | Marketing email opt-in: buyer preferences UI + `PATCH /api/buyers/:id/marketing-preferences` | ⬜ Open | Medium |
| **BG20** | Admin marketing send — filtered email blast to opted-in buyers by topic | ⬜ Open | Medium |
| **BG21** | Hide finance routes from buyer-facing navigation (park `/dashboard/finance` placeholder) | ⬜ Open | Low |

---

## Implementation Sequence (Phased)

Build in this order — each phase is independently testable.

### Phase 1 — Foundation (BG1–BG5, BG11–BG12)
DB migrations, registration form, email verification. No AI yet.
1. BG1 + BG2 + BG3 + BG4 + BG5 — DB migrations (~45 min)
2. BG11 — Phase 1 registration UI `/buyer-register` (~2h)
3. BG12 — Email verification flow + state REGISTERED → ACTIVE (~1h)
4. BG13 — BuyerNotificationService: verification + welcome emails (~1h)
5. BG21 — Hide finance from buyer dashboard (~30 min)

### Phase 2 — Profiling (BG10, BG14)
Auto-save Phase 2 sections. No AI yet, but sections complete = matching unlock.
6. BG10 — BuyerProfileService + `PATCH /api/buyers/:id/profile` (~2h)
7. BG14 — Dashboard ProfileCompletionWidget + sections A–F UI (~4h)

### Phase 3 — Matching (BG6, BG9, BG15–BG16)
AI matching goes live once sections A + B are complete.
8. BG6 — BuyerMatchingService + `buyer-matching-prompts.ts` + `GET /api/buyers/:id/matches` (~3h)
9. BG9 — BuyerMatchingTrigger (watches sections_done) (~1h)
10. BG15 — `/dashboard/matches` MatchResultsPanel UI (~2h)
11. BG16 — Teaser match banner (Phase 1-only coarse preview) (~1h)

### Phase 4 — Gap Analysis (BG7–BG8)
AI gap analysis fires when Section E is answered.
12. BG7 — BuyerGapService + `buyer-gap-prompts.ts` (~2h)
13. BG8 — BuyerGapBridgeService (HIGH → ingestion pipeline) (~2h)

### Phase 5 — Admin & Marketing (BG17–BG20, nudges)
Admin visibility + marketing email layer.
14. BG17 + BG18 — Admin pages: buyer list + detail drawer + match review + gap queue (~3h)
15. BG19 + BG20 — Marketing opt-in UI + admin send (~2h)
16. BG13 supplement — Nudge emails at +48h and +7d (~1h)

**Estimated total: ~32 hours (excluding QA)**

---

## Finance Layer — Buyer Scope Decision

**Current state:** Finance routes (`GET /api/finance/credit`, `GET /api/finance/loans`, `POST /api/finance/loan`, `POST /api/finance/repay`) exist and are working, but they serve the supplier layer's needs.

**Decision (April 2026):** Finance is **hidden from buyer-facing navigation**. The `/dashboard/finance` tab shows a "coming soon" placeholder (already the case). No buyer-visible finance UI is built in this phase.

**Future state (Backlog — see below):** Fincava partners with a Fintech company to offer purchase financing to buyers as a pass-through. The buyer initiates financing from an order detail page. Fincava collects a referral fee; all underwriting is done by the Fintech partner. Architecture will be a lightweight pass-through: `POST /api/buyers/finance/initiate-application` → Fintech API → redirect buyer to partner flow.

---

## Backlog — Future Enhancements

These are documented here so they are not lost. **Do not build now.**

### B-BACKLOG-1: Fincava Certified Buyer Badge
**What:** Buyers who meet defined criteria (verified email + completed Phase 2 + placed ≥1 order) earn a "Fincava Certified" badge visible on their profile and in admin.
**Why deferred:** Criteria are not yet defined. Easy to add once criteria are locked — it's an additive column (`fincava_certified_at TIMESTAMP`) + badge UI.
**When to build:** After first cohort of active trading buyers. Define criteria from real transaction data.

### B-BACKLOG-2: Buyer Financing (Fintech Pass-Through)
**What:** Buyers can apply for purchase financing to fund large orders. Fincava acts as a referral layer to a Fintech partner.
**Architecture sketch:** `POST /api/buyers/finance/initiate` → Fintech API call → redirect URL. No underwriting on Fincava side.
**Why deferred:** Requires a Fintech partnership that does not yet exist.

### B-BACKLOG-3: Buyer Notification Preferences (Granular)
**What:** Buyers set per-topic notification preferences (new matches, price alerts, supply updates, platform news). Admin interface respects those preferences when sending campaigns.
**Why deferred:** Simpler binary opt-in (BG19) covers MVP. Granular topic control is Phase 2+ when buyer base is established.

### B-BACKLOG-4: Persona-Specific UI Modes
**What:** Company type drives a tailored dashboard experience (e.g. Roaster sees cupping-score fields prominently; Trader sees price/volume grid; Distributor sees category breadth view).
**Why deferred:** Single general profile serves all archetypes at MVP. Persona branching adds significant front-end complexity.

### B-BACKLOG-5: Buyer-Supplier Direct Messaging from Match Card
**What:** One-click "Start conversation" on a match card that pre-populates a message thread with the matched supplier.
**Why deferred:** Messaging infra exists. This is a UI link — low effort but needs supplier account email mapping to be reliable first.

---

## Cross-Layer Connections

| Buyer Layer | ↔ | Supplier Layer | Notes |
|---|---|---|---|
| `buyer_matches.supplier_id` | FK | `suppliersTable.id` | Only SELLABLE/PUBLISHED suppliers appear in match catalog |
| `buyer_gap_briefs.ingestion_batch_id` | FK | `supplier_ingestion_batches.id` | HIGH buyer gaps trigger new ingestion batches |
| `BuyerGapBridgeService` | calls | `DiscoveryEngine` (TI-4) | Buyer gap search terms used as discovery context |
| Public supplier profiles `/suppliers/:id` | viewed by | Buyers after matching | Contact Supplier button opens inquiry dialog |
| Inquiry email notifications | received by | Supplier (companiesTable user) | POST /api/inquiries → supplier email via Resend |

---

*Fincava Buyer Layer Architecture — v1.0 — April 2026*
*Persona: Marco Vogel (Specialty Roaster, Hamburg) + GCC/Asian archetypes*
*AI: Claude Sonnet 4.6 (Anthropic-only, shared SDK client)*
*Principle: Build on what exists. No expensive rewrites. Major changes go to backlog.*
