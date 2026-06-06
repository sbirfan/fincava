# Fincava — Buyer Layer Architecture v1.0
**Audience:** Dev Team Implementation Guide  
**AI:** Claude Sonnet 4.6 (Anthropic-only)  
**Date:** 2026-04-30  
**Status:** READY FOR IMPLEMENTATION

---

## Table of Contents

1. [Design Thinking — Primary Buyer Persona](#1-design-thinking--primary-buyer-persona)
2. [Buyer Layer Overview](#2-buyer-layer-overview)
3. [Buyer State Machine](#3-buyer-state-machine)
4. [Data Model](#4-data-model)
5. [Service Layer Architecture](#5-service-layer-architecture)
6. [API Contract](#6-api-contract)
7. [UI Layer Architecture](#7-ui-layer-architecture)
8. [AI Integration Points](#8-ai-integration-points)
9. [Event & Trigger Architecture](#9-event--trigger-architecture)
10. [Admin Interface](#10-admin-interface)
11. [Implementation Sequence](#11-implementation-sequence)

---

## 1. Design Thinking — Primary Buyer Persona

### 1.1 Who We Are Designing For

> **Primary Persona: Marco Vogel**  
> Independent Specialty Coffee Roaster · Hamburg, Germany  
> Archetype covers: Specialty Roasters (EU/US) · Fine-Flavor Cacao Buyers · High-Cert Importers

Marco represents the most demanding buyer Fincava will serve. Every architectural decision made to satisfy Marco will automatically serve commodity importers and distributors, whose requirements are a subset of his.

---

### 1.2 Persona Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MARCO VOGEL  │  38 years old  │  Hamburg, Germany                          │
│  Co-founder, Volta Coffee Roasters  │  Founded 2018  │  12 employees         │
│  Annual revenue: €2.1M  │  Colombia sourcing: 18–22 MT/year                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ROLE ON FINCAVA                                                             │
│  Buyer — Coffee (primary) + Cacao (exploratory, new drinking chocolate line) │
├─────────────────────────────────────────────────────────────────────────────┤
│  CURRENT SOURCING STACK                                                      │
│  • 60% through a Hamburg-based green coffee broker                           │
│  • 30% via annual trips to Colombia (Huila, Nariño, Antioquia)               │
│  • 10% direct from one cooperative he found at World of Coffee 2024          │
│  Pain: broker adds 12–18% margin, controls the relationship, hides the farm  │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRODUCTS SOUGHT                                                             │
│  Coffee:  Specialty green beans, 84–88 SCA score, washed/natural/honey      │
│           Varietals: Castillo, Caturra, Gesha, Tabi, Pink Bourbon           │
│           Altitude: 1,600m+  │  Regions: Huila, Nariño, Cauca, Sierra Nevada│
│  Cacao:   Fine-flavor, fermented & dried, 70%+ flavour index                │
│           Origin: Sierra Nevada de Santa Marta (preferred)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  CERTIFICATIONS                                                              │
│  Required:   EU Organic (NOP equivalent accepted)                            │
│  Preferred:  Fair Trade, Rainforest Alliance, Direct Trade declaration       │
│  Would pay premium for: Women-led cooperative, indigenous community origin   │
├─────────────────────────────────────────────────────────────────────────────┤
│  COMMERCIAL PROFILE                                                          │
│  Volume/order:     3–8 MT per lot  │  Frequency: 3–4 orders/year            │
│  Price range:      $4.50–$7.00 USD/kg FOB Colombia (specialty premium)       │
│  Payment terms:    60 days from B/L  │  Sometimes LC for new relationships   │
│  Incoterms:        FOB Buenaventura / FOB Cartagena                          │
│  Lead time:        Can accommodate 10–16 weeks from order to Hamburg         │
├─────────────────────────────────────────────────────────────────────────────┤
│  TECH BEHAVIOUR                                                              │
│  • Uses Cropster for roast tracking, Notion for supplier notes               │
│  • Comfortable with B2B SaaS platforms — not intimidated by forms            │
│  • Will complete a detailed profile IF he sees value (matches) quickly       │
│  • Checks email daily, WhatsApp constantly, ignores cold LinkedIn            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.3 Empathy Map

```
┌──────────────────────────────┬──────────────────────────────┐
│           THINKS             │            FEELS             │
│                              │                              │
│ "My broker is my biggest     │  Frustrated — he's paying    │
│  competitor. He owns the     │  for access he should have   │
│  farm relationship, not me." │  directly.                   │
│                              │                              │
│ "I flew to Huila last year   │  Excited — Colombia has      │
│ and found the best lot of    │  origin stories his customers │
│ my career. I need a way to   │  will pay for.               │
│ do that without the flight." │                              │
│                              │  Anxious — he needs 4 lots   │
│ "My cacao supplier dried up  │  from Nariño by Q3 and has   │
│  — I have no backup."        │  no backup.                  │
├──────────────────────────────┼──────────────────────────────┤
│            SAYS              │             DOES             │
│                              │                              │
│ "I need farm-level           │  Attends SCA, World of       │
│  traceability — my           │  Coffee, BioFach annually.   │
│  customers ask."             │                              │
│                              │  Cupping session every Fri   │
│ "Show me the farm, the       │  with his team — rejects     │
│ farmer, the altitude."       │  anything below 84 SCA.      │
│                              │                              │
│ "I'll pay more for           │  Keeps a spreadsheet of 22   │
│  certified organic —         │  suppliers with quality,     │
│  it's not optional."         │  price, and reliability      │
│                              │  scores updated after        │
│                              │  every delivery.             │
└──────────────────────────────┴──────────────────────────────┘
```

---

### 1.4 Jobs To Be Done

| Priority | Job | Current Solution | Fincava Opportunity |
|----------|-----|-----------------|---------------------|
| 🔴 Critical | Find Organic-certified specialty lots in Huila/Nariño without flying there | Broker + annual trip | Matching engine → top-5 vetted suppliers with cert docs |
| 🔴 Critical | Verify supplier sustainability claims before committing | Request PDFs from broker (slow, incomplete) | Certifications table + compliance docs on profile |
| 🟡 High | Build a backup supply chain for Nariño lots | None — single-source | Gap escalation → ingestion pipeline finds alternatives |
| 🟡 High | Source fine-flavor cacao for new product line | No current solution | Gap signal → DiscoveryEngine cacao-scoped search |
| 🟢 Medium | Tell his customers the farm's story | Broker provides vague "Colombia" origin | Supplier origin stories, farm profiles, farm-level traceability |
| 🟢 Medium | Reduce broker margin (12–18%) | Accepts it as cost of business | Direct supplier relationship via Fincava |

---

### 1.5 Friction Map — Where Marco Drops Off

```
SIGNUP PAGE
  ↓  [LOW FRICTION — Simple form, clear value prop]

PHASE 1 FORM (7 fields)
  ↓  [MEDIUM FRICTION]
  ⚠ Risk: "Company type" dropdown — Marco may not identify as Importer.
    Fix: Add "Roaster" as explicit option in company_type ENUM.
  ⚠ Risk: Volume band question — Marco thinks in lots (3–8 MT), not annual MT.
    Fix: Show conversion helper: "3–8 MT/order × 3 orders = ~15 MT/year"

EMAIL VERIFICATION
  ↓  [LOW FRICTION — Expected step]

DASHBOARD — PHASE 2 WIDGET
  ↓  [HIGH FRICTION — Biggest drop-off risk]
  ⚠ Risk: 6 sections feels like homework. Marco closes the tab.
    Fix: Show a "teaser match" immediately using Phase 1 data only.
         Even a low-confidence match with "Complete your profile to see 4 more"
         creates a pull that brings him back.
  ⚠ Risk: Section E (Gap Sourcing) feels intrusive without trust built.
    Fix: Position Section E last, after Marco has seen value in matches.

SECTION A + B COMPLETE → INITIAL MATCHING
  ↓  [CRITICAL MOMENT — Marco must see real supplier profiles, not placeholders]

SECTION E COMPLETE → GAP BRIEF
  ↓  [HIGHEST VALUE MOMENT for Fincava]
     Marco's gap signals are the most actionable intelligence Fincava has.
     The gap brief directly commissions new supplier sourcing.
```

---

### 1.6 Secondary Buyer Archetypes

> Not developed as full personas — used for architecture compatibility testing only.

| Archetype | Volume | Cert Req. | Key Difference from Marco |
|-----------|--------|-----------|--------------------------|
| **"The Trader"** — commodity importer, Rotterdam | 200–500 MT/year | None / 4C only | Price over story. Needs volume reliability. No origin specificity. |
| **"The Distributor"** — wholesale, US market | 50–150 MT/year | USDA NOP Organic | Catalog breadth over depth. Needs multiple categories. Fast RFQ turnaround. |

The architecture must satisfy Marco and remain usable for The Trader and The Distributor. Where their needs conflict, Marco wins — he is the target.

---

## 2. Buyer Layer Overview

```
╔══════════════════════════════════════════════════════════════════════════╗
║                     FINCAVA BUYER LAYER                                  ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  BUYER-FACING UI  (React 19 + Vite)                             │    ║
║  │  • Phase 1: /buyer-register     (static form — no AI)           │    ║
║  │  • Dashboard: /dashboard        (Phase 2 widget + matches)      │    ║
║  │  • Profile:   /dashboard/profile/[section-a through f]          │    ║
║  │  • Matches:   /dashboard/matches                                │    ║
║  └─────────────────┬───────────────────────────────────────────────┘    ║
║                    │ HTTP (REST)                                         ║
║  ┌─────────────────▼───────────────────────────────────────────────┐    ║
║  │  API ROUTES  (Express 5 — EP3: routes call services only)       │    ║
║  │  POST /api/buyers/register                                      │    ║
║  │  PATCH /api/buyers/:id/profile   (auto-save, debounced 500ms)   │    ║
║  │  GET  /api/buyers/:id/matches                                   │    ║
║  │  GET  /api/buyers/:id/gaps                                      │    ║
║  └─────────────────┬───────────────────────────────────────────────┘    ║
║                    │                                                     ║
║  ┌─────────────────▼───────────────────────────────────────────────┐    ║
║  │  SERVICE LAYER  (EP3-compliant — all DB access here)            │    ║
║  │                                                                 │    ║
║  │  BuyerRegistrationService ──────────────────────► companies     │    ║
║  │                           ──────────────────────► users         │    ║
║  │                           ──────────────────────► buyer_profiles│    ║
║  │                           ──────────────────────► rfqs (draft)  │    ║
║  │                                                                 │    ║
║  │  BuyerProfileService ───────────────────────────► buyer_profiles│    ║
║  │                      ───────────────────────────► rfqs          │    ║
║  │                      ──► BuyerMatchingTrigger                   │    ║
║  │                                                                 │    ║
║  │  BuyerMatchingService ──► Anthropic SDK (Sonnet 4.6)            │    ║
║  │                       ──► suppliers (read: SELLABLE/PUBLISHED)  │    ║
║  │                       ──► buyer_matches (write)                 │    ║
║  │                                                                 │    ║
║  │  BuyerGapService ───────► Anthropic SDK (Sonnet 4.6)            │    ║
║  │                 ───────► buyer_gap_briefs (write)               │    ║
║  │                 ───────► BuyerGapBridgeService                  │    ║
║  │                                                                 │    ║
║  │  BuyerGapBridgeService ─► IngestionBatchService (TI-8)          │    ║
║  │                        ─► DiscoveryEngine (TI-4)                │    ║
║  │                        ─► ingestion_audit_log                   │    ║
║  │                                                                 │    ║
║  │  BuyerNotificationService ─► Resend (email)                     │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  DATABASE  (Postgres + Drizzle ORM)                             │    ║
║  │  Existing: companies · users · buyer_profiles · rfqs            │    ║
║  │  New:      buyer_matches · buyer_gap_briefs                     │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  ADMIN INTERFACE  (existing /admin + new buyer views)           │    ║
║  │  /admin/buyers           — buyer list, profile completion       │    ║
║  │  /admin/buyer-matches    — review matching results              │    ║
║  │  /admin/buyer-gaps       — gap escalation queue                 │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. Buyer State Machine

```
                         ┌───────────────┐
                         │  UNREGISTERED │
                         └──────┬────────┘
                                │  POST /api/buyers/register (Phase 1 form)
                                ▼
                         ┌───────────────┐
                         │  REGISTERED   │  buyer_profiles.state = 'REGISTERED'
                         │  (unverified) │  email_verification_token created
                         └──────┬────────┘
                                │  Email link clicked
                                ▼
                         ┌───────────────┐
                         │    ACTIVE     │  buyer_profiles.state = 'ACTIVE'
                         │  (dashboard)  │  Welcome email sent (Resend)
                         └──────┬────────┘
                                │  Phase 2 sections saved
                                ▼
                       ┌────────────────┐
                       │   PROFILING    │  buyer_profiles.p2_completion_pct > 0
                       │  (in progress) │  Nudge emails at 48h + 7d if < 50%
                       └──────┬─────────┘
                              │  Sections A + B complete
                              ▼
                       ┌────────────────┐
                       │    MATCHED     │  buyer_matches records created
                       │  (has matches) │  "Your matches are ready" email sent
                       └──────┬─────────┘
                              │  Section E answered (any field)
                              ▼
                       ┌────────────────┐
                       │  GAP_SCANNED   │  buyer_gap_briefs created
                       │               │  HIGH priority gaps → ingestion batch
                       └──────┬─────────┘
                              │  Buyer responds to a match / issues RFQ
                              ▼
                       ┌────────────────┐
                       │   ENGAGING     │  rfqs.status = 'OPEN'
                       │               │  Admin notified for facilitation
                       └──────┬─────────┘
                              │  Order placed
                              ▼
                       ┌────────────────┐
                       │    TRADING     │  orders record created
                       │               │  Ongoing relationship managed
                       └────────────────┘

State transitions stored in: buyer_profiles.state (VARCHAR 20)
Valid states: REGISTERED · ACTIVE · PROFILING · MATCHED · GAP_SCANNED · ENGAGING · TRADING
```

---

## 4. Data Model

### 4.1 New Tables

```sql
-- Stores all AI matching runs. is_current = true for latest run only.
CREATE TABLE buyer_matches (
  id                   SERIAL PRIMARY KEY,
  buyer_profile_id     INTEGER NOT NULL REFERENCES buyer_profiles(id),
  supplier_id          INTEGER NOT NULL REFERENCES suppliers(id),
  match_score          DECIMAL(3,2) NOT NULL CHECK(match_score BETWEEN 0.00 AND 1.00),
  score_breakdown      JSONB NOT NULL,     -- { category: 0.30, cert: 0.25, origin: 0.18, ... }
  disqualifiers        TEXT[],             -- reasons supplier was hard-excluded (if any)
  match_notes          TEXT,              -- Sonnet 4.6 plain-language explanation
  sections_at_run      TEXT[] NOT NULL,   -- which Phase 2 sections were complete when run fired
  is_current           BOOLEAN DEFAULT true,
  created_at           TIMESTAMP DEFAULT NOW(),

  CONSTRAINT buyer_matches_score_range CHECK (match_score >= 0.00 AND match_score <= 1.00)
);

CREATE INDEX idx_buyer_matches_profile    ON buyer_matches(buyer_profile_id, is_current);
CREATE INDEX idx_buyer_matches_supplier   ON buyer_matches(supplier_id);
CREATE INDEX idx_buyer_matches_score      ON buyer_matches(buyer_profile_id, match_score DESC);

-- Stores gap briefs produced by Sonnet 4.6 gap analysis
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
  ingestion_batch_id       INTEGER REFERENCES supplier_ingestion_batches(id),  -- set if escalated
  resolved_at              TIMESTAMP,              -- set when gap is filled by new supplier
  created_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_buyer_gaps_profile    ON buyer_gap_briefs(buyer_profile_id);
CREATE INDEX idx_buyer_gaps_priority   ON buyer_gap_briefs(priority, pipeline_action);
CREATE INDEX idx_buyer_gaps_unresolved ON buyer_gap_briefs(resolved_at) WHERE resolved_at IS NULL;
```

### 4.2 Additive Column Migrations — `buyer_profiles`

```sql
-- Phase 1 columns
ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS volume_band                VARCHAR(20),  -- <10MT | 10-50MT | 50-200MT | 200+MT
  ADD COLUMN IF NOT EXISTS required_certs_p1          TEXT[],
  ADD COLUMN IF NOT EXISTS time_to_first_order        VARCHAR(20),  -- WITHIN_30D | 1_3M | 3_6M | EXPLORATORY
  ADD COLUMN IF NOT EXISTS state                      VARCHAR(20) DEFAULT 'REGISTERED',

-- Phase 2 tracking
  ADD COLUMN IF NOT EXISTS p2_completion_pct          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS p2_sections_done           TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS matching_run_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_matched_at            TIMESTAMP,
  ADD COLUMN IF NOT EXISTS gap_flag_count             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_recommendation VARCHAR(10),

-- Phase 2 Section A
  ADD COLUMN IF NOT EXISTS traceability_level         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS existing_colombia_rel      BOOLEAN,

-- Phase 2 Section B
  ADD COLUMN IF NOT EXISTS trade_finance_open         BOOLEAN DEFAULT false,

-- Phase 2 Section C
  ADD COLUMN IF NOT EXISTS audit_standard             VARCHAR(50),

-- Phase 2 Section D
  ADD COLUMN IF NOT EXISTS logistics_partner          TEXT,

-- Phase 2 Section F
  ADD COLUMN IF NOT EXISTS platform_intent            TEXT[],
  ADD COLUMN IF NOT EXISTS sample_ready               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prev_sourcing_channel      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discovery_budget_band      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS supplier_dev_open          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_type_pref         TEXT[],
  ADD COLUMN IF NOT EXISTS social_impact_reqs         TEXT[],
  ADD COLUMN IF NOT EXISTS early_stage_supplier_open  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS language_preference        TEXT[];

CREATE INDEX idx_buyer_profiles_state      ON buyer_profiles(state);
CREATE INDEX idx_buyer_profiles_completion ON buyer_profiles(p2_completion_pct);
```

### 4.3 Additive Column Migrations — `rfqs`

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

### 4.4 Full Entity Relationship (Buyer-Relevant Tables)

```
users (id, email, role=BUYER, ...)
  │ 1:1
  ▼
companies (id, user_id FK, company_type, country, name, ...)
  │ 1:1
  ▼
buyer_profiles (id, user_id FK, state, p2_completion_pct, p2_sections_done, ...)
  │                          │
  │ 1:N                      │ 1:N
  ▼                          ▼
buyer_matches              buyer_gap_briefs
(supplier_id FK →            (ingestion_batch_id FK →
 suppliers)                   supplier_ingestion_batches)
  │
  │ 1:N (draft RFQs seeded from profile)
  ▼
rfqs (buyer_id FK, status=DRAFT|OPEN|CLOSED, product_category, ...)
```

---

## 5. Service Layer Architecture

### 5.1 Service Catalogue

| Service | File | Responsibility | DB Tables Written | Calls |
|---------|------|---------------|-------------------|-------|
| `BuyerRegistrationService` | `services/buyer-registration-service.ts` | Phase 1 form processing: create company, user, buyer_profile, seed RFQ draft | companies, users, buyer_profiles, rfqs | BuyerNotificationService |
| `BuyerProfileService` | `services/buyer-profile-service.ts` | Phase 2 field auto-save, completion % recalculation, section tracking | buyer_profiles, rfqs | BuyerMatchingTrigger |
| `BuyerMatchingTrigger` | `services/buyer-matching-trigger.ts` | Watches p2_sections_done. Fires BuyerMatchingService when thresholds met. Prevents duplicate runs. | buyer_profiles (read) | BuyerMatchingService |
| `BuyerMatchingService` | `services/buyer-matching-service.ts` | Calls Anthropic Sonnet 4.6 with buyer profile + supplier catalog. Writes match results. | buyer_matches, buyer_profiles (update last_matched_at) | Anthropic SDK, BuyerNotificationService |
| `BuyerGapService` | `services/buyer-gap-service.ts` | Calls Anthropic Sonnet 4.6 gap analysis. Writes gap briefs. | buyer_gap_briefs | Anthropic SDK, BuyerGapBridgeService |
| `BuyerGapBridgeService` | `services/buyer-gap-bridge.ts` | Escalates HIGH priority gaps to ingestion pipeline. | ingestion_audit_log | IngestionBatchService, DiscoveryEngine |
| `BuyerNotificationService` | `services/buyer-notification-service.ts` | All buyer emails via Resend: verification, welcome, match-ready, nudges. | — | Resend SDK |

### 5.2 BuyerMatchingService — Internal Logic

```typescript
// services/buyer-matching-service.ts

async function runMatching(buyerProfileId: number): Promise<BuyerMatchOutput> {
  // 1. Load buyer profile with all completed Phase 2 data
  const profile = await db.query.buyerProfiles.findFirst({
    where: eq(buyerProfiles.id, buyerProfileId),
    with: { company: true, rfqs: { where: eq(rfqs.status, 'DRAFT') } }
  });

  // 2. Mark all previous matches as not current
  await db.update(buyerMatches)
    .set({ is_current: false })
    .where(eq(buyerMatches.buyer_profile_id, buyerProfileId));

  // 3. Fetch supplier catalog (SELLABLE + PUBLISHED only)
  const catalog = await db.query.suppliers.findMany({
    where: inArray(suppliers.sellable_status, ['SELLABLE', 'PUBLISHED']),
    with: { certifications: true, farms: true, compliance_docs: true }
  });

  // 4. Call Sonnet 4.6 (prompt from config/buyer-matching-prompts.ts — EP8)
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: BUYER_MATCHING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify({ buyer_profile: profile, supplier_catalog: catalog }) }]
  });

  // 5. Extract + validate JSON (Zod — BuyerMatchOutputSchema)
  const json = extractJSON(response.content[0].text, 'buyer_match_json');
  const validated = BuyerMatchOutputSchema.parse(json);

  // 6. Write match results
  for (const match of validated.match_results) {
    await db.insert(buyerMatches).values({
      buyer_profile_id: buyerProfileId,
      supplier_id: match.supplier_id,
      match_score: match.match_score,
      score_breakdown: match.score_breakdown,
      disqualifiers: match.disqualifiers,
      match_notes: match.match_notes,
      sections_at_run: profile.p2_sections_done,
      is_current: true
    });
  }

  // 7. Update buyer profile metadata
  await db.update(buyerProfiles).set({
    matching_run_count: sql`${buyerProfiles.matching_run_count} + 1`,
    last_matched_at: new Date(),
    subscription_recommendation: validated.subscription_recommendation,
    state: 'MATCHED'
  }).where(eq(buyerProfiles.id, buyerProfileId));

  // 8. Notify buyer
  await BuyerNotificationService.sendMatchReady(buyerProfileId, validated.match_results.length);

  return validated;
}
```

### 5.3 BuyerGapBridgeService — Internal Logic

```typescript
// services/buyer-gap-bridge.ts

async function escalateGap(gap: GapBrief, buyerProfileId: number): Promise<void> {
  if (!gap.is_real_gap) {
    // Data quality issue — log for admin, no pipeline escalation
    await BuyerNotificationService.notifyAdminDataQuality(gap, buyerProfileId);
    return;
  }

  if (gap.priority !== 'HIGH') {
    // MEDIUM/LOW — log only, admin reviews in next batch cycle
    await db.update(buyerGapBriefs).set({ pipeline_action: gap.pipeline_action })
      .where(/* matching gap record */);
    return;
  }

  // HIGH priority: auto-create ingestion batch
  const batch = await IngestionBatchService.create({
    admin_id: SYSTEM_ADMIN_ID,
    batch_size: 3,
    source: 'BUYER_GAP_AUTO_ESCALATION',
    gap_context: {
      gap_type: gap.gap_type,
      buyer_profile_id: buyerProfileId,
      product_category: gap.search_category,
      volume_mt: gap.volume_target_mt,
      priority: 'HIGH'
    }
  });

  // Fire DiscoveryEngine with buyer's search terms
  await DiscoveryEngine.discover({
    category: gap.search_category,
    region: gap.search_region ?? 'Colombia',
    certifications: gap.required_attributes ?? [],
    max_results: 5,
    batch_id: batch.id,
    search_context: gap.buyer_urgency_note,
    search_terms: gap.discovery_search_terms
  });

  // Update gap brief with batch reference
  await db.update(buyerGapBriefs)
    .set({ ingestion_batch_id: batch.id })
    .where(/* matching gap record */);

  // Audit log (Ley 1581 traceability)
  await AuditLogger.log({
    action: 'BUYER_GAP_ESCALATED_TO_INGESTION',
    batch_id: batch.id,
    details: { gap_type: gap.gap_type, buyer_profile_id: buyerProfileId, priority: 'HIGH' },
    admin_id: SYSTEM_ADMIN_ID
  });
}
```

---

## 6. API Contract

All endpoints follow EP7: `{ success: boolean, data?: T, error?: string }`.  
All buyer-authenticated endpoints require `requireAuth` middleware.

### 6.1 Phase 1 — Registration

```
POST /api/buyers/register
Auth: None (public endpoint)
Body: Phase1RegistrationSchema (Zod)
  {
    company_name: string,
    company_type: 'IMPORTER'|'DISTRIBUTOR'|'ROASTER'|'MANUFACTURER'|'COOPERATIVE'|'OTHER',
    country: string,
    product_categories: ('COFFEE'|'CACAO'|'AVOCADO'|'EXOTIC_FRUIT'|'SUPERFOOD'|'PROCESSED'|'TEXTILE'|'OTHER')[],
    volume_band: '<10MT'|'10-50MT'|'50-200MT'|'200+MT',
    required_certs: string[],
    time_to_first_order: 'WITHIN_30D'|'1_3M'|'3_6M'|'EXPLORATORY',
    email: string,
    password: string
  }
Response 201:
  { success: true, data: { user_id, company_id, buyer_profile_id } }
Response 400:
  { success: false, error: 'Validation error: ...' }
Response 409:
  { success: false, error: 'Email already registered' }
```

### 6.2 Phase 2 — Profile Auto-Save

```
PATCH /api/buyers/:id/profile
Auth: requireAuth (own profile only)
Body: { section: 'A'|'B'|'C'|'D'|'E'|'F', field: string, value: unknown }
Response 200:
  { success: true, data: { section, field, completion_pct, sections_done, matching_triggered: boolean } }

Note: matching_triggered = true if this save pushed sections_done to include ['A','B']
      for the first time, or added a new section that triggered a re-run.
```

### 6.3 Buyer Matches

```
GET /api/buyers/:id/matches
Auth: requireAuth (own profile only)
Query: ?current_only=true (default true)
Response 200:
  { success: true, data: {
    matches: [{ supplier_id, match_score, score_breakdown, match_notes, supplier: { name, category, certifications } }],
    matching_confidence: number,
    fields_that_improve_match: string[],
    last_matched_at: string,
    run_count: number
  }}
```

### 6.4 Buyer Gap Briefs (Admin only)

```
GET /api/admin/buyers/:id/gaps
Auth: requireAdmin
Response 200:
  { success: true, data: {
    gap_briefs: [{ gap_type, priority, pipeline_action, is_real_gap, buyer_urgency_note, ingestion_batch_id }],
    gap_count: number
  }}
```

### 6.5 Email Verification

```
GET /api/buyers/verify-email?token=<token>
Auth: None
Response 302: Redirect to /dashboard on success
Response 400: { success: false, error: 'Invalid or expired token' }
```

---

## 7. UI Layer Architecture

### 7.1 Page Map

```
/buyer-register               ← Phase 1 form (no auth required)
  └── /verify-email           ← Email verification holding page

/dashboard                    ← Post-login landing (requireAuth)
  ├── /dashboard/profile      ← Phase 2 overview + progress bar
  │   ├── /profile/section-a  ← Product Detail
  │   ├── /profile/section-b  ← Commercial Terms
  │   ├── /profile/section-c  ← Quality & Compliance
  │   ├── /profile/section-d  ← Logistics
  │   ├── /profile/section-e  ← Gap Sourcing (amber, distinct styling)
  │   └── /profile/section-f  ← Platform Intent
  └── /dashboard/matches      ← Buyer's matched suppliers

/admin/buyers                 ← Admin buyer list (requireAdmin)
/admin/buyer-matches          ← Review AI matching results
/admin/buyer-gaps             ← Gap escalation queue
```

### 7.2 Dashboard Component Architecture

```
<Dashboard>
  ├── <ProfileCompletionWidget>          // progress bar + section cards
  │   ├── completion_pct (from API)
  │   ├── sections_done[]
  │   └── <SectionCard section="A|B|C|D|E|F" status="done|in_progress|locked" />
  │
  ├── <TeaserMatchBanner>               // shown immediately after Phase 1
  │   // "Based on your initial profile, we found potential matches.
  │   //  Complete Product Detail + Commercial Terms to see them."
  │   // Uses Phase 1 data only for coarse match preview
  │
  └── <MatchResultsPanel>               // shown once matching has run
      ├── <SupplierMatchCard supplier={...} score={0.82} />
      ├── <MatchConfidenceIndicator sections_complete={['A','B','C']} />
      └── <ImproveMatchPrompt fields={['traceability_level', 'origin_requirements']} />
```

### 7.3 Phase 2 Auto-Save Pattern

```typescript
// Shared hook for all Phase 2 section forms
function useAutoSave(buyerProfileId: number, section: string) {
  const debouncedSave = useMemo(
    () => debounce(async (field: string, value: unknown) => {
      await fetch(`/api/buyers/${buyerProfileId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ section, field, value })
      });
    }, 500),
    [buyerProfileId, section]
  );

  return { onFieldChange: debouncedSave };
}
```

### 7.4 Design Decisions Driven by Marco Persona

| Decision | Rationale from Persona |
|----------|----------------------|
| Show teaser match on dashboard before Section A/B complete | Marco closes the tab without an immediate hook. Phase 1 data gives enough signal for a coarse teaser. |
| Section E styled distinctly in amber | Marco needs to understand this section is different — it's not just profile data, it's actively commissioning new supplier sourcing on his behalf. |
| "Add Roaster" to company_type ENUM | Marco identifies as a Roaster, not an Importer. Seeing "Importer" creates cognitive friction. |
| Volume band shows conversion helper | Marco thinks in lots (3–8 MT), not annual totals. Helper prevents under-reporting. |
| Match card shows SCA-adjacent quality signals | Marco's primary filter is quality. Match cards should surface cupping data and altitude prominently. |
| `fields_that_improve_match` API field | Marco is quality-driven. Telling him exactly which fields improve his matches is the most effective Phase 2 completion driver. |

---

## 8. AI Integration Points

### 8.1 Anthropic SDK Usage (Buyer Layer)

```typescript
// Shared Anthropic client — same instance as scoring-service.ts
// DO NOT create a new AnthropicClient for buyer services
import { anthropic } from '../lib/anthropic-client';

// Model assignments
const MATCHING_MODEL = 'claude-sonnet-4-6';   // quality-critical, permanent match storage
const GAP_MODEL      = 'claude-sonnet-4-6';   // quality-critical, pipeline escalation

// Both services inherit 3x retry + exponential backoff from scoring-service pattern
// Retry delays: 1000ms, 2000ms, 4000ms
```

### 8.2 Prompt Registry (EP8)

```
config/
  scoring-prompts.ts          ← existing, unchanged
  buyer-matching-prompts.ts   ← NEW: export BUYER_MATCHING_SYSTEM_PROMPT
  buyer-gap-prompts.ts        ← NEW: export BUYER_GAP_SYSTEM_PROMPT
```

### 8.3 AI Trigger Conditions

| Trigger | Condition | Model | Estimated Tokens | Cost Signal |
|---------|-----------|-------|-----------------|-------------|
| Initial matching run | `p2_sections_done` includes `['A','B']` for first time | Sonnet 4.6 | ~8,000 input + ~2,000 output | Medium |
| Matching re-run | New section added to `p2_sections_done` after initial run | Sonnet 4.6 | ~8,000 input + ~2,000 output | Medium |
| Gap analysis | Any field saved in Section E | Sonnet 4.6 | ~4,000 input + ~2,000 output | Medium |
| Final matching run | All 6 sections complete | Sonnet 4.6 | ~10,000 input + ~3,000 output | High |

> **Cost note:** Matching runs are bounded by supplier catalog size. As catalog grows, consider caching the catalog embedding or pre-filtering suppliers by category before passing to Sonnet to control token costs.

### 8.4 Matching Input Construction

```typescript
// What gets sent to Sonnet 4.6 for matching
const matchingInput = {
  buyer_profile: {
    // From Phase 1
    company_type, country, product_categories, volume_band,
    required_certs_p1, time_to_first_order,
    // From Phase 2 (only completed sections — omit null fields)
    ...pick(profile, completedSectionFields(profile.p2_sections_done))
  },
  // Only suppliers with sellable_status IN ('SELLABLE','PUBLISHED')
  // Only fields relevant to matching (not raw DB row)
  supplier_catalog: catalog.map(s => ({
    id: s.id, name: s.name, category: s.category,
    certifications: s.certifications.map(c => c.cert_type),
    origin_region: s.origin_region, altitude_m: s.altitude_m,
    capacity_mt_per_year: s.capacity_mt_per_year,
    sellable_status: s.sellable_status
  }))
};
```

---

## 9. Event & Trigger Architecture

```
buyer.registered
  → BuyerNotificationService.sendEmailVerification()

buyer.email_verified
  → buyer_profiles.state = 'ACTIVE'
  → BuyerNotificationService.sendWelcome()
  → Schedule: nudge at +48h if p2_completion_pct < 30

buyer.profile_field_saved (PATCH /api/buyers/:id/profile)
  → BuyerProfileService.updateField()
  → BuyerProfileService.recalculateCompletion()
  → BuyerMatchingTrigger.checkAndFire()
    ├── IF sections_done includes ['A','B'] AND matching_run_count === 0
    │     → BuyerMatchingService.runMatching()
    │       → buyer.match_ready
    ├── IF new section added AND matching_run_count > 0
    │     → BuyerMatchingService.runMatching()    [re-run]
    └── IF section === 'E' AND any E field is non-null
          → BuyerGapService.analyseGaps()
            → BuyerGapBridgeService.escalateIfHigh()

buyer.match_ready
  → BuyerNotificationService.sendMatchReady()
  → buyer_profiles.state = 'MATCHED'

buyer.gap_escalated (HIGH priority only)
  → IngestionBatchService.create()
  → DiscoveryEngine.discover()
  → ingestion_audit_log.insert()

nudge.48h (scheduled)
  → IF p2_completion_pct < 30: BuyerNotificationService.sendNudge(1)

nudge.7d (scheduled)
  → IF p2_completion_pct < 50: BuyerNotificationService.sendNudge(2)
```

---

## 10. Admin Interface

### 10.1 New Admin Pages

**`/admin/buyers`** — Buyer overview table
- Columns: Name, Company, Country, State, Phase 2 %, Match Count, Gap Count, Registered At
- Filters: State, completion %, subscription recommendation
- Sortable: completion %, match_score desc

**`/admin/buyer-matches`** — Matching results review
- Shows all buyer_matches where is_current = true
- Admin can suppress a match (add to disqualifiers) before it surfaces to buyer
- Shows match_notes from Sonnet 4.6 for each result

**`/admin/buyer-gaps`** — Gap escalation queue
- Priority sorted: HIGH first
- Shows: gap_type, buyer_urgency_note, pipeline_action, ingestion_batch_id (if escalated)
- Admin can manually escalate MEDIUM gaps or mark as ADMIN_REVIEW

### 10.2 Admin API Additions

```
GET  /api/admin/buyers                   ← buyer list with filters
GET  /api/admin/buyers/:id               ← full buyer profile detail
GET  /api/admin/buyers/:id/matches       ← all match runs for a buyer
GET  /api/admin/buyers/:id/gaps          ← gap briefs for a buyer
POST /api/admin/buyers/:id/suppress-match ← suppress a specific match
POST /api/admin/gaps/:id/escalate        ← manual escalation of MEDIUM gap
```

---

## 11. Implementation Sequence

Build in this order. Each task is independently testable before the next begins.

| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| 1 | DB migrations (buyer_matches, buyer_gap_briefs, buyer_profiles columns) | Nothing | ~30 min |
| 2 | `BuyerRegistrationService` + `POST /api/buyers/register` | Migration | ~2h |
| 3 | Email verification flow + `BuyerNotificationService` (verification + welcome) | Task 2 | ~1h |
| 4 | Phase 1 UI: `/buyer-register` form | Task 2 | ~2h |
| 5 | `BuyerProfileService` + `PATCH /api/buyers/:id/profile` (auto-save) | Task 2 | ~2h |
| 6 | Phase 2 UI: dashboard widget + 6 section pages | Task 5 | ~4h |
| 7 | `BuyerMatchingService` + Anthropic integration + `buyer-matching-prompts.ts` | Tasks 5, DB | ~3h |
| 8 | `BuyerMatchingTrigger` (watches sections_done, fires matching) | Task 7 | ~1h |
| 9 | `GET /api/buyers/:id/matches` + MatchResultsPanel UI | Task 7 | ~2h |
| 10 | `BuyerGapService` + `buyer-gap-prompts.ts` | Tasks 5, DB | ~2h |
| 11 | `BuyerGapBridgeService` (HIGH priority → IngestionBatchService) | Task 10, TI-8 | ~2h |
| 12 | Nudge emails (Resend, scheduled at 48h + 7d) | Tasks 3, 5 | ~1h |
| 13 | Admin pages: `/admin/buyers`, `/admin/buyer-matches`, `/admin/buyer-gaps` | Tasks 7, 10 | ~3h |
| 14 | Teaser match banner (Phase 1-only coarse match) | Task 9 | ~1h |
| 15 | End-to-end test: register → verify → profile → match → gap → escalation | All | ~2h |

**Total estimated effort: ~32 hours**

---

*Fincava Buyer Layer Architecture v1.0 — 2026-04-30*  
*Persona: Marco Vogel (Specialty Roaster, Hamburg)*  
*AI: Claude Sonnet 4.6 (Anthropic-only)*  
*Audience: Dev Team Implementation Guide*
