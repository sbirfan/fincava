# FINCAVA Platform — Architectural Review, Feasibility Study & Roadmap

**Date:** June 6, 2026  
**Last updated:** June 6, 2026 (post-Phase A/B/C execution)  
**Prepared by:** Claude Code (Anthropic) — automated architectural review  
**Scope:** Full codebase, database schema (29 tables, 34 migrations), all documentation (75+ files), CI/CD pipeline, and external integrations  
**Repository:** fincava-hub (Cloudflare/pre-prod monorepo)

---

## Version History

| Version | Date | Author | Summary of Changes |
|---------|------|--------|-------------------|
| v1.0 | 2026-06-06 | Claude Code (Anthropic) | Initial automated architectural review — full codebase, schema (28 tables / 33 migrations), feasibility study, phased roadmap |
| v1.1 | 2026-06-06 | Claude Code (Anthropic) | Post Phase A/B/C execution update — 16 FIN items closed; feature flags corrected (ENABLE_TRANSACTIONS + ENABLE_MATCHING now on); schema updated (29 tables / 34 migrations); Phase Immediate roadmap fully struck through; Phase Next roadmap updated; §1.3 documentation gap resolved; Node 22 → Node 24; Investment Risk #3 updated to FIN-002 |

---

## Table of Contents

1. [Documentation Audit — Archive vs. Keep](#1-documentation-audit--archive-vs-keep)
2. [Platform Current State](#2-platform-current-state)
3. [Deep Feasibility Study](#3-deep-feasibility-study)
4. [Phased Future Roadmap](#4-phased-future-roadmap)
5. [Appendix — Technical Stack Reference](#5-appendix--technical-stack-reference)

---

## 1. Documentation Audit — Archive vs. Keep

### 1.1 Files to Archive (move to `docs/archive/`)

These fall into four categories: raw working artifacts superseded by processed versions, v1 docs replaced by v2, Replit/AI session paste files, and completed one-time transition planning docs.

---

#### Category A — Replit/AI Session Paste Files (`attached_assets/` — all 14 files)

These are raw Replit and AI session paste dumps used during active development. Every finding has been absorbed into the processed documentation or implemented in code. They carry no ongoing reference value and will mislead future readers about current system state.

| File | Why Archive |
|------|-------------|
| `CC1B_Replit_Paste_*.md` (3 files) | Raw session pastes from CC-1 compliance feature build; content in compliance routes and system_gap_analysis |
| `CC1B_corrected.md`, `CC1C_corrected.md`, `CC1D_corrected.md`, `CC1E_corrected.md` | Corrected session artifacts; all findings implemented in code |
| `CC1_Gap_Triage_*.md` | Superseded entirely by `FINCAVA_MASTER_REGISTER.md` |
| `CC1_Replit_Prompt_*.md` (2 files) | Build prompts with no ongoing value |
| `CODEBASE_FACTS_*.md` (3 files) | Point-in-time snapshots from April–May 2026; stale vs. current codebase |
| `Discovery_Engine_Audit_*.md` | Audit artifact; recommendations implemented or formally deferred in the register |
| `FINAL_EXECUTION_PLAN_*.md` | Superseded by `FINCAVA_EXECUTION_BACKLOG.md` |
| `FinCava_Hub_Code_Review_*.md` (2 files) | Code review sessions; all findings resolved per `ops/CHANGELOG.md` |
| `Fincava_Buyer_Layer_Architecture_v1_*.md` | v1 superseded by root `Buyer_Layer_Architecture.md` |
| `Intelligence_Layer_Design_v1_*.md` | Design doc for gated feature (ENABLE_INTELLIGENCE_PUBLIC=false); review when activating |
| `Post_Launch_Fixes_*.md` | Superseded by `FINCAVA_MASTER_REGISTER.md` |

---

#### Category B — Raw vs. Processed Pairs (`ops/`)

The `_raw` suffix indicates an unprocessed source that has a corresponding processed version. Keeping both creates ambiguity about which is authoritative.

| Archive | Keep Instead |
|---------|-------------|
| `ops/system_gap_analysis_raw.md` | `ops/system_gap_analysis.md` |
| `ops/supplier_persona_raw.md` | `ops/supplier_persona.md` |
| `ops/buyer_persona_raw.md` | Absorbed into `Buyer_Layer_Architecture.md` |
| `ops/onboarding_flow_raw.md` | `ops/onboarding_flow.md` |

---

#### Category C — Superseded Version 1 Documents

| Archive | Keep Instead |
|---------|-------------|
| `docs/technical-design/FINCAVA_TDD_PhaseI_DomesticRetail.md` (v1) | `FINCAVA_TDD_PhaseI_DomesticRetail_v2.md` — the implemented spec |
| `docs/design-thinking/FINCAVA_DesignThinking_Phase2_IdeatePrototypeTest_v2.md` | `FINCAVA_DesignThinking_Phase2_v2.1.md` |

---

#### Category D — Completed Transition / One-Shot Planning Docs

| File | Reason |
|------|--------|
| `ops/memo_reconciliation.md` | One-time reconciliation of legacy memo epics into phase assignments. Task complete; assignments live in `ops/post_mvp_plan.md` |
| `ops/mvp_validation_plan.md` | MVP has shipped. Validation criteria are met or in the backlog register |
| `README-TESTS-PHASE1.md` | Phase 1 test readme; content absorbed into CI pipeline and test files |
| `ops/execution_system.md` | General task framework superseded by `FINCAVA_EXECUTION_BACKLOG.md` and `ops/task_execution_log.md` |

---

#### Category E — Conditionally Archive (flag before archiving)

| File | Condition for Archive |
|------|----------------------|
| `replit.md` | Archive **after** Cloudflare migration completes. Until then it documents production deployment reality |
| `FINCAVA_PRIORITIZATION.md` | The 60-day plan it describes is mostly enacted. Refresh to reflect current sprint or archive |
| `ops/post_mvp_plan.md` | Describes Phases 2–6 at a high level. Valuable as strategic context but needs reconciliation with the roadmap in Section 4 below |

---

### 1.2 Active Reference Set (never archive)

| Document | Role |
|----------|------|
| `CLAUDE.md` | Operating rules — the highest-authority document in the repo |
| `CLAUDE_REPOSITORY_MAP.md` | Active architecture reference |
| `README.md` | Public project introduction |
| `Buyer_Layer_Architecture.md` | Buyer persona, state machine, BG1–BG13 gap list |
| `Supplier_Layer_Architecture.md` | Dual-system design, graduation state machine |
| `FINCAVA_MASTER_REGISTER.md` | Single source of truth for all improvements (FIN-001 through FIN-112+) |
| `FINCAVA_EXECUTION_BACKLOG.md` | Live sprint board with phase A/B/C sequencing |
| `FINCAVA_CHANGE_LOG.md` | Formal completion record (**needs backfilling — see 1.3 below**) |
| `ai-scoring-design.md` | Claude Haiku scoring contract (prompt, pathway logic) |
| `compliance-enhancements.md` | Compliance requirement system design |
| `marketplace-visibility-bridge.md` | Email-matching bridge for two-supplier-system identity gap |
| `threat_model.md` | Security threat model with identified gaps |
| `ops/OPERATOR_PLAYBOOK.md` | Daily operations reference |
| `ops/DEPLOY_CHECKLIST.md` | Pre-deploy gate checklist |
| `ops/CHANGELOG.md` | Comprehensive implemented-work record |
| `ops/task_execution_log.md` | Detailed implementation log with smoke test results |
| `ops/fincava-architecture.md` | System architecture overview |
| `ops/master_strategy_document.md` | Strategic principles and phase evolution |
| `ops/supplier_persona.md` | Supplier persona reference |
| `ops/system_gap_analysis.md` | Active gap tracking (H1–H5 with fix status) |
| `ops/epic_1_supplier_graduation.md` | Epic 1 delivery record |
| `ops/epic_2_product_enrichment.md` | Epic 2 delivery record |
| `ops/execution_map.md` | Slice-by-slice delivery tracker |
| `docs/FINCAVA_TrustCommerce_NarrativeFoundation.md` | Brand and narrative reference |
| `docs/SOURCE_OF_TRUTH_ROADMAP.md` | Canonical source-of-truth rules |
| `docs/TAKEOVER_PLAN.md` | Business continuity and emergency takeover procedure |
| `docs/design-thinking/Phase1_EmpathyDefine.md` | Design rationale archive |
| `docs/design-thinking/Phase2_v2.1.md` | Current design thinking baseline |
| `docs/phase2_route_inventory.md` | Comprehensive route manifest |
| `docs/runbooks/FIN-043-anthropic-key-rotation.md` | Anthropic API key rotation runbook |
| `docs/technical-design/FINCAVA_TDD_PhaseI_DomesticRetail_v2.md` | Implemented retail spec |
| `docs/testing/RETAIL_FLOW_TEST_PLAN.md` | Retail QA and smoke test plan |
| `lib/db/drizzle/README.md` | Migration discipline reference |

---

### 1.3 Documentation Gap — Resolved

`FINCAVA_CHANGE_LOG.md` was initialized on 2026-05-31 with zero FIN items closed. Backfilling was completed on 2026-06-06. The change log now records all Phase A, B, and C items (FIN-001, 003, 004, 006, 008, 009, 010, 011, 019, 023, 033, 035, 036, 040, 042, 053) with verified outcomes, affected files, and rollback notes.

`FINCAVA_EXECUTION_BACKLOG.md` is fully current: Phases A, B, and C are entirely struck through. Open items are in the Blocked or Future Sprint sections only.

---

## 2. Platform Current State

### 2.1 Executive Summary

FINCAVA is a TypeScript pnpm monorepo (React 19 + Express 5 + PostgreSQL 16 + Drizzle ORM) currently deployed on Replit. The platform has a mature, well-structured codebase with approximately 13,000 lines of API code, 72 frontend pages, 28 database tables, and 33 migrations. Despite this maturity, **the platform has zero live transactions.** Every transactional feature flag is false in production.

### 2.2 Feature Flag State

| Flag | Controls | Status |
|------|----------|--------|
| `ENABLE_TRANSACTIONS` | Orders, RFQs, inquiries | ✅ **On** (set 2026-06-06) |
| `ENABLE_MATCHING` | AI buyer–supplier matching | ✅ **On** (set 2026-06-06) |
| `ENABLE_RETAIL` | Domestic retail storefront | **Off** — activate after Phase Scale gate |
| `ENABLE_FINANCE` | Trade finance, loans | **Off** — requires Colombian legal entity |
| `ENABLE_LOGISTICS` | Shipment tracking | **Off** |
| `ENABLE_INTELLIGENCE_PUBLIC` | Public analytics dashboard | **Off** — Phase Intelligence |

Flags are set in `.replit` `[userenv.shared]` and evaluated at process start. `ENABLE_RETAIL` must not be enabled until Wompi is connected and smoke tests pass per `RETAIL_FLOW_TEST_PLAN.md`.

### 2.3 What Is Fully Built and Operational

**Supplier Graduation Pipeline (Production-Ready)**
The most complete and production-validated component. WhatsApp-onboarded farmers flow through `NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED` with:
- Claude Haiku AI scoring (0–100 export-readiness, pathway A/B/C/D)
- Append-only audit tables (`supplier_evaluations`, `supplier_state_transitions`)
- Admin override controls with justification enforcement
- AI-generated compliance documents (Claude Sonnet, EN/ES, PDF/Word)
- Field officer coordination and onboarding flows

**Admin & Operations Layer (Production-Ready)**
Comprehensive admin panel covering supplier ingestion, compliance queue management, managed case escalation, graduation controls, and publish workflow. The operator can run the full concierge business from the admin panel. Operator playbook documents every manual step.

**Authentication & Multi-Tenancy (Production-Ready)**
HTTP-only cookie sessions, bcrypt password hashing, email verification, password reset, role-based authorization (BUYER/SUPPLIER/ADMIN), and cross-tenant query isolation. Well-tested with good coverage.

**Email Infrastructure (Production-Ready)**
Resend-backed transactional emails for: registration, password reset, email verification, supplier status changes, inquiry notifications, RFQ responses, order status updates, and admin-triggered account events.

**B2B Marketplace (Code-Complete, Feature-Flagged Off)**
Product catalog, inquiry system, RFQ system with responses and awarding, and full order lifecycle state machine (`INQUIRY → SAMPLE_REQUESTED → QUOTED → CONFIRMED → IN_PRODUCTION → SHIPPED → DELIVERED → COMPLETED → CANCELLED`) are fully built. AI buyer–supplier matching service (Claude-powered) is also built and tested. All routes are behind `ENABLE_TRANSACTIONS` and `ENABLE_MATCHING` flags.

**Retail Storefront (Code-Complete as of June 2, 2026, Feature-Flagged Off)**
Sprint 3 shipped the retail layer: 6 `tienda/` frontend pages, 5 backend route files under `routes/retail/`, 27 SQL migrations including all `retail_*` tables, Wompi and Stripe payment service adapters (interface-only — no live credentials), magic-link authentication, and admin retail order management. Zero transactions processed.

**Trade Finance (Code-Complete, Deeply Gated)**
Full loan lifecycle (origination, repayment tracking, credit scoring, APR calculation), payment milestones, and admin loan management are implemented. `ENABLE_FINANCE=false`. Not close to activation without legal structure.

**Logistics (Code-Complete, Gated)**
Shipment tracking per order and payment milestone coordination are implemented. `ENABLE_LOGISTICS=false`.

### 2.4 What Is Not Yet Done

| Gap | Ticket | Impact |
|-----|--------|--------|
| Farmer self-service login | FIN-002 | Compliance self-completion impossible without login path; FIN-001 now resolved — auth model decision needed |
| Payment provider connection | — | Wompi requires Colombian NIT; Stripe sandbox not yet configured; retail cannot transact |
| Durable async job queue | FIN-037 | AI scoring runs via `setImmediate`; process crash = permanent job loss |
| SSRF + prompt-injection hardening | threat_model.md | Discovery-engine URL fetch not sanitised; AI input/output escaping unvalidated |
| Concierge fee schedule | — | $200–$1,500/introduction pricing not formalised; `managed_cases` tracking not wired |
| Backup verification | FIN-042 | Cron scheduled; first run at 03:00 UTC 2026-06-07 — log check pending |

**Resolved since initial review (2026-06-06):**  
FIN-001 (company_supplier_links join table), FIN-023 (RUT/DIAN gate), FIN-019 (AI gaps writeback), FIN-010 (open-introductions dashboard), FIN-009 (RFQ/inquiry email alerts), FIN-033 (batch-confirm auto-scoring), FIN-006 (introduce endpoint), FIN-008 (dynamic admin email), FIN-042 (backup cron scheduled), FIN-011 (operator playbook final), FIN-053 (secret removed from .replit), FIN-040 (sync discipline), FIN-036 (Sentry), FIN-035 (health check), FIN-004 (contact form), FIN-003 (officer path). Change log backfill complete.

### 2.5 Technology Health Assessment

| Dimension | Status | Notes |
|-----------|--------|-------|
| Code maturity | **High** | ~13K API LOC, 72 frontend pages, 28 DB tables |
| Test coverage | **Moderate** | Auth, graduation, feature flags well-tested; retail untested; no E2E |
| Security posture | **Good baseline** | Role auth solid; SSRF and prompt-injection gaps in threat model remain open |
| Observability | **Partial** | Sentry wired; Pino logging present; no uptime dashboard |
| DB backup | **Scheduled** | `[[cron]]` runs at 03:00 UTC daily; first run 2026-06-07 pending verification |
| Async job durability | **Weak** | `setImmediate` fire-and-forget scoring; no durable queue (FIN-037 — deferred) |
| CI/CD | **Solid** | GitHub Actions: typecheck → build → test gates on every PR |
| Documentation | **Excellent** | 40+ maintained markdown files; operational playbooks; threat model |
| Architecture cleanliness | **High** | Monolith with clear module boundaries; no microservices; additive-only DB changes |

### 2.6 Database Schema Summary

29 tables across these domains (34 migrations as of 2026-06-06):

| Domain | Key Tables |
|--------|-----------|
| Users & Auth | `users`, `companies`, `profiles`, `password_reset_tokens`, `email_verification_tokens` |
| Supplier Graduation | `suppliers`, `farms`, `economics`, `compliance_docs`, `certifications`, `supplier_evaluations`, `supplier_state_transitions`, `supplier_payment_methods` |
| Marketplace | `products`, `origin_stories`, `inquiries`, `rfqs`, `rfq_responses`, `orders`, `order_items` |
| Buyer Layer | `buyer_profiles` (37+ cols), `buyer_matches`, `buyer_gap_briefs` |
| Finance | `loans`, `repayments`, `payment_milestones`, `shipments` |
| Supplier ↔ Company Links | `company_supplier_links` — many-to-many join table (FIN-001, migration 0028) |
| Admin & Ops | `staff_roles`, `interaction_logs`, `marketing_campaigns`, `public_metrics`, `compliance_concierge`, `interaction_types` |
| Retail | `retail_buyer_profiles`, `retail_auth_tokens`, `retail_order_details`, `retail_payment_transactions`, `retail_waitlists`, `retail_shipping_zones`, `retail_harvest_updates` |

---

## 3. Deep Feasibility Study

### 3.1 The Problem Being Solved

Colombia has 540,000+ smallholder coffee farmers and is also a significant producer of cacao, avocado, and tropical fruits. The typical export chain has 5–7 layers (farmer → cooperative → processor → exporter → importer → roaster/retailer), each extracting margin and adding delay.

International buyers (European and US roasters, importers, retailers) urgently need verified traceability, origin documentation, and ESG compliance data — driven by the EU Corporate Sustainability Reporting Directive (CSRD) and EU Deforestation Regulation (EUDR), both now in force. Colombian smallholders cannot produce this documentation reliably without assistance. The trust gap is real, costly, and currently "solved" by established commodity trading houses (Olam, ECOM, Louis Dreyfus, Sucafina) that extract most of the margin.

**FINCAVA's core thesis:** Compress the trust gap with a software-and-service layer that verifies suppliers through AI-powered compliance assessment, connects them to buyers on digital rails, and provides working-capital financing to bridge the gap between farm and export.

### 3.2 Market Size

| Segment | Annual Value | FINCAVA's Addressable Slice |
|---------|-------------|----------------------------|
| Colombian coffee exports | ~$3B/year | Specialty subset (~20%): $600M |
| Colombian cacao exports | ~$200M/year | Growing 15%/year |
| Colombian tropical fruit exports | ~$400M/year | Early stage |
| Colombian domestic specialty food retail | $15B/year | Small addressable slice at Phase I |
| Agri-trade finance (Colombia, smallholders) | $2B+/year | 4–6% commission range |

At a 4% platform fee and a $30,000 average B2B order, FINCAVA needs **833 annual orders** to reach $1M in GMV-fee revenue — approximately 16 orders per week. This is a realistic 2-year target after launch, not a 12-month target.

### 3.3 Revenue Model Analysis

**Stream 1 — B2B Transaction Fee (4%)**
The primary long-term revenue stream, directly comparable to Algrano's model. The 4% fee is coded in `fee-service.ts` but has never been collected. Risk: buyers and suppliers may route around the platform once introduced. Mitigation: trade finance and compliance services create switching costs that make this less likely.

**Stream 2 — Concierge Introduction Fees**
The correct go-to-market for today. Founder-operated buyer–supplier matching and facilitation with a one-time or retainer fee. Requires minimal technology, generates immediate cash, and produces the first revenue data needed for investor conversations. No formal pricing has been established in the codebase yet. Recommendation: $200–$1,500 per qualified introduction, tracked in the managed cases system.

**Stream 3 — Trade Finance Spread**
Interest income on supplier loans at approximately 12–18% APR (Colombian agricultural lending norms). At a $500K loan portfolio, this represents $60–90K/year in interest income. High margin but high risk — requires either a licensed financial partner or a Colombian Fintech license (Decreto 1692 framework).

**Stream 4 — Domestic Retail Commission**
The `tienda/` storefront sells directly to Colombian consumers from verified farms. Commission structure not yet defined. The market is real but highly competitive (supermarkets, Rappi, Mercado Libre). Differentiation is the trust and origin story narrative. Lower strategic priority than B2B — requires marketing investment the platform cannot yet self-fund.

**Stream 5 — Compliance-as-a-Service (Latent Opportunity)**
The AI scoring and compliance document generation pipeline is genuinely differentiated and non-trivial to replicate. It could be licensed to agri exporters who want to self-verify suppliers, government agricultural programs (ICA, MADR), NGOs, or certification bodies. This is a SaaS opportunity that the current architecture fully supports without major rework. Not yet explored.

### 3.4 Comparable Platforms and Funding Context

| Platform | Model | Stage | Funding |
|----------|-------|-------|---------|
| **Algrano** (Switzerland) | B2B coffee: roasters → farmers direct | Series A | $11M |
| **Avenews-GT** (Israel) | Agri B2B marketplace + financing | Series A | $7M |
| **Tridge** (South Korea) | Agricultural trade intelligence | Series C | $30M |
| **Choco** (US/EU) | B2B food service ordering | Series B | $100M+ |
| **Harvst** (UK) | Farm-to-business digital | Seed | $2M |

FINCAVA's differentiation over Algrano (the closest comparable):
- AI-powered compliance verification — not just a marketplace but a verifiable trust layer
- Trade finance integration — financing is coded; Algrano does not offer this
- Domestic retail alongside B2B export — dual-market optionality
- Colombian-first go-to-market with a field officer discovery network
- ESG regulatory compliance automation (CSRD/EUDR documentation)

### 3.5 Conservative Revenue Projections

| Period | GMV | B2B Fee (4%) | Concierge | Trade Finance | Total Revenue |
|--------|-----|--------------|-----------|---------------|--------------|
| Q3–Q4 2026 (first transactions) | $100K | $4K | $5K | $0 | **~$9K** |
| Full Year 2027 | $1M | $40K | $25K | $15K | **~$80K** |
| Full Year 2028 | $5M | $200K | $50K | $60K | **~$310K** |
| Full Year 2029 | $15M | $600K | $100K | $120K | **~$820K** |

These projections assume: first live B2B transaction by Q3 2026, 50 verified suppliers by Q4 2026, consistent buyer acquisition from Q1 2027.

### 3.6 Investment Case Assessment

**Investment Readiness Score: 6/10 today → 8/10 after first live transaction + one commercial hire**

---

**Strengths as an Investment**

1. **Differentiated technical moat.** The AI-powered compliance verification and graduation pipeline took 6+ months of focused engineering. It is non-trivial to replicate — a competitor would spend 12–18 months to match it. This is genuine IP.

2. **Real market with documented buyer demand.** Colombian specialty agriculture is a multi-billion-dollar export market. The EU CSRD and EUDR regulations are creating mandatory verified-supply demand that did not exist 3 years ago. Timing is favorable.

3. **Dual-market optionality.** B2B export + domestic retail in one platform is unusual among agri-tech platforms. The domestic retail layer creates a direct consumer relationship and origin story content that pure B2B platforms lack.

4. **Field officer discovery network.** The human layer — officers visiting farms, recording compliance signals — creates a supply pipeline that software alone cannot replicate quickly. It also creates a barrier to competitive entry.

5. **Investment-grade codebase.** Technical due diligence would find few red flags: clean monorepo, migration discipline, feature flags for safe rollout, threat model documentation, audit tables, and comprehensive CI/CD. The platform can scale to 1,000+ suppliers without an architectural rewrite.

6. **ESG and regulatory tailwinds.** The EU CSRD requires companies above a threshold to report supply chain sustainability data beginning in 2025–2026 reporting cycles. EUDR prohibits importing products linked to deforestation. Colombian coffee and cacao are directly in scope. FINCAVA's compliance documentation layer is the product that addresses this regulatory pressure.

---

**Risks to Address Before Fundraising**

1. **Zero revenue.** `ENABLE_TRANSACTIONS` is now on, but no transaction has been processed in production. This is the single largest barrier to a fundraising conversation. One live transaction changes the entire narrative. **Priority: close first B2B order before any investor meeting.**

2. **Solo-founder operational dependency.** The `docs/TAKEOVER_PLAN.md` and operator playbook exist, but a single-founder platform carries key-person risk that institutional investors will require to be mitigated. A co-founder or a committed BD hire is needed before a seed round.

3. **FIN-002 (farmer self-service login) still open.** FIN-001 (the dual-system identity bridge via `company_supplier_links`) was resolved on 2026-06-06. FIN-002 — enabling farmers to log in and complete compliance self-service — is now unblocked but requires an auth model decision. It must be designed and shipped before scaling past ~100 suppliers.

4. **Colombian regulatory gaps.** Wompi payment integration requires a Colombian NIT (tax registration) — the company must have a legal entity in Colombia. Trade finance (lending) requires either a licensed financial partner institution or a Colombian Fintech license. Neither is in place.

5. **No mobile app.** The buyer experience is web-only. The supplier experience is WhatsApp-mediated. This is acceptable for B2B but limits both buyer adoption and domestic retail.

---

**Suggested Seed Round**
- **Amount:** $750K–$1.5M
- **Use of funds:** 1 commercial hire (BD/buyer acquisition), Cloudflare platform migration, Colombian legal entity + NIT formation, Wompi/Stripe integration, retail marketing, 18-month runway to $500K GMV milestone
- **Key milestone to unlock round:** First live B2B transaction and 25+ verified SELLABLE suppliers
- **Longer-term path:** Series A ($3–5M) at $5M GMV trailing; comparable to Algrano at equivalent stage

---

## 4. Phased Future Roadmap

This roadmap replaces the previous Phases 1–5 framing with a revenue-first sequencing anchored on the FIN register and current codebase state.

---

### Phase Immediate — Unlock First Revenue (June–July 2026)

**Goal:** Close first live B2B transaction. Validate the concierge model. Begin formal revenue tracking.

| Task | Ticket | Status |
|------|--------|--------|
| ~~Fix RUT/DIAN gate alignment~~ | FIN-023 | ✅ Done (2026-06-01) |
| ~~AI gaps → compliance_docs writeback~~ | FIN-019 | ✅ Done (2026-06-01) |
| ~~Build admin open-introductions dashboard~~ | FIN-010 | ✅ Done (2026-06-01) |
| ~~Enable `ENABLE_TRANSACTIONS=true`~~ | — | ✅ On in both repos (2026-06-06) |
| ~~Backfill FINCAVA_CHANGE_LOG.md~~ | — | ✅ Done (2026-06-06) |
| **Establish concierge fee schedule** | — | 🔴 Open — founder decision needed; define $200–$1,500/introduction pricing; wire `managed_cases` tracking |

**Phase Immediate is functionally complete.** The single remaining action is a product/pricing decision, not an engineering task.

---

### Phase Next — Trust Pipeline Hardening (August–October 2026)

**Goal:** 50 verified, graduated suppliers. Buyer acquisition begins. Architecture stable to 200+ suppliers.

| Task | Ticket | Status |
|------|--------|--------|
| ~~Fix dual supplier system identity~~ | FIN-001 | ✅ Done (2026-06-06) — `company_supplier_links` join table, migration 0028 |
| **Farmer self-service login path** | FIN-002 | 🔴 Open — FIN-001 unblocked; auth model decision needed; Large effort |
| ~~Enable buyer matching~~ | — | ✅ On — `ENABLE_MATCHING=true` in both repos |
| ~~Email notifications on RFQ/inquiry~~ | FIN-009 | ✅ Done (2026-06-01) — admin + supplier emails fire on creation |
| **Durable async job queue** | FIN-037 | 🔴 Open — `setImmediate` fallback documented in playbook; pg-boss deferred |
| **Verify automated DB backup** | FIN-042 | 🟡 Pending — cron scheduled; first run 2026-06-07 03:00 UTC; check logs |
| **SSRF + prompt-injection hardening** | threat_model.md | 🔴 Open — discovery-engine URL fetch; AI input/output escaping |
| ~~Configurable admin alert email~~ | FIN-008 | ✅ Done (2026-05-06) — `getAdminEmails()` queries DB dynamically |

---

### Phase Scale — Retail and Payment Rails (Q4 2026 – Q1 2027)

**Goal:** Activate retail storefront. Connect live payment processor. First domestic consumer sale.

| Task | Notes |
|------|-------|
| Form Colombian legal entity + obtain NIT | Prerequisite for Wompi; also required for trade finance licensing |
| Wompi sandbox → production | Payment adapters already built; connect live credentials after NIT |
| `ENABLE_RETAIL=true` | After Wompi connected and smoke-tested per `RETAIL_FLOW_TEST_PLAN.md` |
| Stripe sandbox for international buyers | Parallel to Wompi; adapters built |
| Retail content and marketing | First 100 domestic buyers; origin story content as the differentiation |
| Cloudflare migration | Separate initiative; target concurrent with or just after first retail live |

---

### Phase Intelligence — AI-Native Differentiation (Q1–Q2 2027)

**Goal:** Activate the intelligence layer. Launch compliance-as-a-service. Differentiate on AI depth.

| Task | Notes |
|------|-------|
| `ENABLE_INTELLIGENCE_PUBLIC=true` | Public analytics dashboard; builds buyer trust and platform credibility |
| Compliance-as-a-Service pilot | License the graduation/scoring pipeline to 2–3 external agri exporters or NGOs; validate SaaS model |
| AI scoring v2 | Explainable outputs, structured gap recommendations, re-scoring on profile update |
| Buyer gap briefs surface | Expose `buyer_gap_briefs` to admin for curated sourcing proposals to buyers |
| Export knowledge base | Export requirements by product/destination country; compliance rules; pricing benchmarks |
| Origin story AI enrichment | Use Claude Sonnet to enrich supplier narratives with verified farm visit data |

---

### Phase Finance — Trade Finance Activation (Q2–Q3 2027)

**Goal:** Activate `ENABLE_FINANCE`. First supplier loan disbursed and repaid.

| Task | Notes |
|------|-------|
| Legal structure for lending | Partner with a licensed Colombian financial entity OR apply for Fintech license (Decreto 1692) |
| `ENABLE_FINANCE=true` | Turn on loan origination after legal structure confirmed |
| Repayment tracking validation | Built; needs live testing and default-rate calibration |
| Credit scoring model calibration | Calibrate Claude-assisted credit scoring against first real repayment data |
| Loan portfolio reporting | Investor-grade reporting for any debt facility raised |

---

### Phase Automation — Reduce Founder Dependency (Q3–Q4 2027)

**Goal:** Platform runs without constant founder intervention. Team can operate independently.

| Task | Notes |
|------|-------|
| CRM integration | Track buyer conversations, follow-up cadence, deal pipeline beyond admin panel |
| Onboarding automation | Reduce officer-mediated onboarding steps; automated document checklist |
| Workflow notifications | WhatsApp + email automation for all key lifecycle events |
| Progressive Web App (mobile) | PWA as minimum; native app if budget allows |
| Structured onboarding schema | Move away from free-text interactions; typed onboarding fields for scoring reliability |

---

### Summary Milestone Scorecard

| Dimension | Today (June 2026) | 6 Months (Dec 2026) | 18 Months (Dec 2027) |
|-----------|-------------------|---------------------|----------------------|
| Verified suppliers (SELLABLE+) | Pipeline accurate (FIN-023/019 resolved); count unknown | 50 | 200+ |
| Live B2B transactions | 0 | 5–10 | 100+ |
| GMV | $0 | $50–150K | $1M+ |
| Revenue | $0 | $5–15K | $100K+ |
| Retail storefront | Code-complete, off | Live (Wompi) | Growing |
| Trade finance | Built, off | Legal structure in place | Active loans |
| Investment readiness | 6/10 | 8/10 | Series A eligible |
| Founder operational dependency | High | Medium | Reduced |

**The single most important action:** Close one live B2B transaction. Everything else — investor conversations, team hiring, retail activation — becomes dramatically easier after that moment.

---

## 5. Appendix — Technical Stack Reference

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, Framer Motion, Wouter, TanStack Query v5 | Current |
| Backend | Node 24, Express 5, TypeScript, tsx/esbuild | Current |
| Database | PostgreSQL 16, Drizzle ORM 0.45.2 | Current |
| Validation | Zod 3.25.76 | Current |
| AI | @anthropic-ai/sdk ^0.90.0 (Haiku 4.5 scoring, Sonnet 4.6 documents) | Current |
| Email | Resend ^6.12.2 | Current |
| Messaging | Twilio WhatsApp Business API | Current |
| Storage | Google Cloud Storage ^7.19.0 (signed URLs) | Current |
| Monitoring | Sentry ^8, Pino HTTP | Current |
| Package manager | pnpm 10.18.3, Node 24 | Current |
| CI/CD | GitHub Actions (typecheck → build → test) | Current |
| Deployment | Replit (current) → Cloudflare (planned) | Migrating |

---

*Document prepared by Claude Code (Anthropic) — automated architectural review, June 6, 2026.*  
*Updated June 6, 2026 to reflect Phase A/B/C execution: 16 FIN items closed, feature flags corrected, schema updated (29 tables / 34 migrations), roadmap tables revised.*  
*For internal use. Re-run review after major milestones.*
