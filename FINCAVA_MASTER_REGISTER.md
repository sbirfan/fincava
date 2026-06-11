# FINCAVA Master Improvement Register

**Status:** Active source of truth  
**Owner:** Founder + Engineering  
**Last updated:** 2026-05-31  
**Scope:** Inventory only — no implementation prescribed in this document  

**Sources:** Repository Discovery Report, `Supplier_Layer_Architecture.md`, `ops/system_gap_analysis_raw.md`, codebase verification  

**How to use:** Each item has a stable ID (`FIN-###`). When closing an item, add `Status: Resolved` and date in a changelog section at the bottom. Do not delete IDs.

---

## Classification categories

| # | Category | Description |
|---|----------|-------------|
| 1 | Revenue Blocking | Prevents or severely limits revenue and concierge deal flow today |
| 2 | Revenue Enabling | Improves conversion, leads, or operator velocity without blocking revenue |
| 3 | Trust & Verification | Supplier trust, compliance, graduation, and buyer-facing verification |
| 4 | Operational Stability | Uptime, deploys, backups, monitoring, pipelines, documentation |
| 5 | Security | Auth, secrets, access control, abuse prevention |
| 6 | Compliance | Regulatory readiness, officer workflows, audit trails |
| 7 | Technical Debt | Maintainability, consistency, dead code, test gaps |
| 8 | Architecture | Structural design, scale, platform coupling |
| 9 | Future Enhancements | Explicitly deferred Phase II+ capabilities |

## Priority levels

| Priority | Meaning |
|----------|---------|
| **Must Do Now** | Critical to Phase I concierge ops, trust pipeline, or security — target within 30 days |
| **Next** | High value within 30–90 days; strengthens core loops |
| **Later** | Important but not blocking Phase I; after core loops are stable |
| **Parking Lot** | Deferred by product strategy (Phase II+), cosmetic, or intentionally gated |

## Field definitions

| Field | Meaning |
|-------|---------|
| **Technical risk** | Likelihood of bugs, data corruption, or security failure if unaddressed |
| **Operational risk** | Impact on solo-founder ability to run the business day-to-day |
| **Effort** | Tiny (<1 day) · Small (1–3 days) · Medium (1–2 weeks) · Large (2–4 weeks) · XL (1+ month) |

---

## 1. Revenue Blocking

### FIN-001 — Two supplier systems with no database link

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Must Do Now |
| **Status** | **Resolved — 2026-06-06** |
| **Description** | Farmer records (`suppliers`) and B2B web accounts (`companies`/`users`) are separate populations connected only by email matching on `my-profile`. No FK exists. |
| **Resolution** | `company_supplier_links` join table added (migration `0028`). Many-to-many model supports cooperatives natively. Admin CRUD endpoints live at `GET/POST/DELETE /api/admin/suppliers/:id/links`. Introduce route email resolution improved. |
| **Why it matters** | Breaks product linking, profile completeness, and operator mental model. |
| **Business impact** | High confusion; manual reconciliation required |
| **Revenue impact** | Blocks scalable supplier onboarding and listing accuracy |
| **Supplier impact** | Farmers may complete onboarding but never appear correctly in B2B dashboard |
| **Buyer impact** | Buyers may see incomplete or mismatched supplier identity |
| **Technical risk** | Medium — wrong joins cause silent data bugs |
| **Operational risk** | High — operator must manually bridge records |
| **Effort** | Large |
| **Dependencies** | Product decision on identity model |
| **Recommended timing** | Must Do Now |

### FIN-002 — Farm suppliers lack self-service login for compliance

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Must Do Now |
| **Description** | WhatsApp-onboarded farmers have no standard auth path to compliance UI; B2B dashboard assumes SUPPLIER web account. |
| **Why it matters** | Compliance concierge (CC-1) targets farmers who cannot log in. |
| **Business impact** | Field/officer mediation required for every compliance step |
| **Revenue impact** | Delays verified supplier supply |
| **Supplier impact** | Cannot self-complete compliance; depends on officers/admins |
| **Buyer impact** | Fewer verified suppliers available |
| **Technical risk** | Medium |
| **Operational risk** | High — does not scale past founder-led ops |
| **Effort** | Large |
| **Dependencies** | FIN-001, auth model decision |
| **Recommended timing** | Must Do Now |
| **Status** | **Resolved — 2026-06-08** — WhatsApp OTP (6-digit, 10min TTL, Twilio) + email magic link (UUID, 24hr TTL, Resend) both shipped. Migration 0037 (`supplier_auth_tokens`). Public `/supplier-login` page + admin drawer "Send Login Link" button. Pre-flight claim on self-registration links existing unclaimed supplier record by WhatsApp number or email. Commits: `e1b4503`, `4853ca0`. Unblocks FIN-065. |

### FIN-003 — Officer registration API path bug

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | `officers.ts` registers `POST /api/officers/register` while router mounts at `/api`, yielding effective path `/api/api/officers/register`. Frontend calls `/api/officers/register`. |
| **Why it matters** | Field officer recruitment form likely returns 404. |
| **Business impact** | Cannot scale Colombian field discovery |
| **Revenue impact** | Delays supplier pipeline at source |
| **Supplier impact** | No new officers onboarded via self-serve |
| **Buyer impact** | Fewer discovered suppliers |
| **Technical risk** | Low fix |
| **Operational risk** | High if recruiting officers |
| **Effort** | Tiny |
| **Dependencies** | Developer |
| **Recommended timing** | Must Do Now |

### FIN-004 — Contact form has no backend

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Must Do Now |
| **Description** | `/contact` submits to `console.log` + toast only; no email or CRM capture. |
| **Why it matters** | Loses inbound buyer/supplier/partner leads. |
| **Business impact** | Direct lead loss |
| **Revenue impact** | Missed concierge revenue opportunities |
| **Supplier impact** | Cannot reach platform via contact |
| **Buyer impact** | Poor first impression for serious buyers |
| **Technical risk** | None |
| **Operational risk** | Medium — invisible lead loss |
| **Effort** | Tiny |
| **Dependencies** | Resend template |
| **Recommended timing** | Must Do Now |

### FIN-005 — No payment processor integrated

| Field | Value |
|-------|-------|
| **Category** | Revenue Blocking |
| **Priority** | Parking Lot |
| **Description** | Orders and 4% platform fee exist in code but `ENABLE_TRANSACTIONS=false` and no Stripe/payment rail. |
| **Why it matters** | Phase I is concierge; even manual fee collection has no tooling when ready. |
| **Business impact** | Cannot monetize transactions when ready |
| **Revenue impact** | No transaction revenue path |
| **Supplier impact** | N/A until orders enabled |
| **Buyer impact** | N/A until orders enabled |
| **Technical risk** | Low (deferred by design) |
| **Operational risk** | Low today |
| **Effort** | XL |
| **Dependencies** | Legal, Stripe, product decision |
| **Recommended timing** | Parking Lot |

### FIN-006 — Concierge introduction workflow not operator-optimized

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Must Do Now |
| **Description** | RFQs, inquiries, and messaging exist but no unified admin triage queue for open introductions. |
| **Why it matters** | Founder must navigate multiple admin pages to connect buyers and suppliers. |
| **Business impact** | Slower deal velocity |
| **Revenue impact** | Lower conversion from discovery to paid intro |
| **Supplier impact** | Slower response to inquiries |
| **Buyer impact** | Slower buyer satisfaction |
| **Technical risk** | Low |
| **Operational risk** | High — bottleneck on solo founder |
| **Effort** | Medium |
| **Dependencies** | None |
| **Recommended timing** | Must Do Now |

### FIN-007 — Buyer matching gated and not workflow-integrated

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Next |
| **Description** | AI buyer–supplier matching requires `ENABLE_MATCHING` and is admin-only; no operator playbook for match → intro → follow-up. |
| **Why it matters** | Built capability underused for core concierge value prop. |
| **Business impact** | Manual matching remains default |
| **Revenue impact** | Missed curated introduction revenue |
| **Supplier impact** | Good suppliers not surfaced to buyers |
| **Buyer impact** | Buyers don't receive best matches |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Admin workflow design |
| **Recommended timing** | Next |

### FIN-008 — Hardcoded admin alert email on supplier onboard

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | Supplier application admin alert sends to hardcoded `sbirfan@gmail.com` in onboard route. |
| **Why it matters** | Single point of failure; wrong recipient if team grows. |
| **Business impact** | Alerts missed |
| **Revenue impact** | Delayed supplier review |
| **Supplier impact** | Slower onboarding approval |
| **Buyer impact** | Delayed supplier availability |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Tiny |
| **Dependencies** | `ADMIN_EMAIL` env var |
| **Recommended timing** | Next |

---

## 2. Revenue Enabling

### FIN-009 — Email notifications on new RFQ/inquiry

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Next |
| **Description** | No automated operator/supplier email when buyer creates RFQ or inquiry. |
| **Why it matters** | Relies on users checking dashboards. |
| **Business impact** | Slower response times |
| **Revenue impact** | Lower intro conversion |
| **Supplier impact** | Missed inquiry opportunities |
| **Buyer impact** | Poor responsiveness perception |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Resend templates |
| **Recommended timing** | Next |

### FIN-010 — Admin "open introductions" dashboard

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Next |
| **Description** | No single view of open RFQs, inquiries, and unmatched buyers awaiting action. |
| **Why it matters** | Core concierge ops need one queue. |
| **Business impact** | Faster deal flow |
| **Revenue impact** | Higher intro-to-revenue conversion |
| **Supplier impact** | Faster supplier engagement |
| **Buyer impact** | Faster buyer response |
| **Technical risk** | Low |
| **Operational risk** | High without it |
| **Effort** | Medium |
| **Dependencies** | None |
| **Recommended timing** | Next |

### FIN-011 — Operator playbook documentation

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | Critical ops knowledge spread across 5+ docs and 213 `attached_assets` files. |
| **Why it matters** | Solo founder cannot run platform without engineering context. |
| **Business impact** | Slower operations; errors |
| **Revenue impact** | Indirect revenue drag |
| **Supplier impact** | Inconsistent supplier handling |
| **Buyer impact** | Inconsistent buyer experience |
| **Technical risk** | None |
| **Operational risk** | High |
| **Effort** | Small |
| **Dependencies** | Founder time |
| **Recommended timing** | Must Do Now |

### FIN-012 — Public `/supplier-marketplace` validation page in production

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Next |
| **Description** | `/supplier-marketplace` is routed, public, labeled "Internal Validation — Not part of public marketplace." |
| **Why it matters** | Findable URL creates brand confusion. |
| **Business impact** | Looks unfinished to discoverers |
| **Revenue impact** | Minor trust erosion |
| **Supplier impact** | Misleading marketplace view |
| **Buyer impact** | Confusing duplicate of `/suppliers` |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | Product decision: remove or auth-gate |
| **Recommended timing** | Next |

### FIN-013 — Marketing campaign service underutilized

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Later |
| **Description** | `marketing-campaign-service.ts` and admin campaign processing exist; unclear operator workflow for buyer outreach. |
| **Why it matters** | Built outreach tooling may be dormant. |
| **Business impact** | Missed buyer acquisition |
| **Revenue impact** | Lower buyer pipeline |
| **Supplier impact** | N/A |
| **Buyer impact** | Fewer buyer signups |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Campaign strategy |
| **Recommended timing** | Later |

### FIN-014 — Origin stories and public metrics CMS need content ops

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Later |
| **Description** | Admin can manage origin stories and public metrics; requires ongoing content discipline. |
| **Why it matters** | Trust/discovery asset if maintained; empty if not. |
| **Business impact** | Brand/trust variable |
| **Revenue impact** | Indirect conversion lift |
| **Supplier impact** | Better storytelling |
| **Buyer impact** | Richer discovery |
| **Technical risk** | None |
| **Operational risk** | Medium |
| **Effort** | Small (ops) |
| **Dependencies** | Content creation |
| **Recommended timing** | Later |

### FIN-015 — AI lead discovery is ephemeral (no DB persistence)

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Later |
| **Description** | Admin ingestion discover runs AI lead discovery without persisting leads to batches automatically. |
| **Why it matters** | Manual step to convert discoveries to suppliers. |
| **Business impact** | Slower supplier pipeline |
| **Revenue impact** | Delays supply growth |
| **Supplier impact** | N/A |
| **Buyer impact** | Fewer suppliers over time |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Ingestion workflow UX |
| **Recommended timing** | Later |

### FIN-016 — Claim flow token-based path still open

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | Email-match claim implemented; token-based `claimToken` claim flow documented as still open (G9). |
| **Why it matters** | Limits self-serve supplier account linking. |
| **Business impact** | Manual claim handling |
| **Revenue impact** | Slows supplier activation |
| **Supplier impact** | Cannot claim profile via link |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-001 |
| **Recommended timing** | Later |

### FIN-017 — Buyer onboarding vs buyer-register dual entry paths

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Later |
| **Description** | Separate `/buyer-register` and `/buyer/onboarding` flows may confuse buyer activation. |
| **Why it matters** | Friction in buyer signup. |
| **Business impact** | Lower buyer completion rate |
| **Revenue impact** | Fewer buyer introductions |
| **Supplier impact** | N/A |
| **Buyer impact** | Confusing signup |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | UX review |
| **Recommended timing** | Later |

### FIN-018 — No CRM or pipeline tracking for concierge deals

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Later |
| **Description** | Platform tracks RFQs/inquiries/messages but not deal stage, value, or close status. |
| **Why it matters** | Cannot measure concierge revenue or pipeline. |
| **Business impact** | No revenue visibility |
| **Revenue impact** | Cannot optimize sales |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | None |
| **Operational risk** | High for business |
| **Effort** | Medium |
| **Dependencies** | Product/process design |
| **Recommended timing** | Later |

---

## 3. Trust & Verification

### FIN-019 — AI compliance gaps not written back to `compliance_docs`

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Must Do Now |
| **Description** | AI scoring writes `complianceGaps` to `ai_outputs` but does not update `compliance_docs` boolean fields. Admin sees stale self-reported data. |
| **Why it matters** | Trust badges and graduation gate may not reflect AI analysis. |
| **Business impact** | Verification story weakened |
| **Revenue impact** | Buyers may distrust badges |
| **Supplier impact** | Incorrect compliance status |
| **Buyer impact** | Misleading trust signals |
| **Technical risk** | Low |
| **Operational risk** | High |
| **Effort** | Small–Medium |
| **Dependencies** | Scoring pipeline |
| **Recommended timing** | Must Do Now |

### FIN-020 — Three parallel compliance representations

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Must Do Now |
| **Description** | `compliance_docs` (gate), `interactions.metadata` (onboarding capture), and `compliance_docs.compliance_score` (never written) coexist without single source of truth. |
| **Why it matters** | Operators cannot trust which field is authoritative. |
| **Business impact** | Verification inconsistency |
| **Revenue impact** | Trust erosion |
| **Supplier impact** | Confusing compliance state |
| **Buyer impact** | Unreliable verification |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | FIN-019 |
| **Recommended timing** | Must Do Now |

### FIN-021 — `compliance_score` and `last_reviewed_at` never populated

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | Schema columns exist; no code path writes them. Dashboards/reports using them always show null. |
| **Why it matters** | Future trust UI blocked or shows empty data. |
| **Business impact** | Incomplete trust metrics |
| **Revenue impact** | Cannot display scored compliance |
| **Supplier impact** | No review timestamp |
| **Buyer impact** | No compliance freshness signal |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Compliance write-back design |
| **Recommended timing** | Next |

### FIN-022 — Verification level field not implemented

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | SoT doc approves `self_reported` / `document_uploaded` / `fincava_verified` levels; not in schema/UI yet. |
| **Why it matters** | Cannot communicate graduated trust to buyers. |
| **Business impact** | Weak differentiation vs generic directories |
| **Revenue impact** | Limits premium positioning |
| **Supplier impact** | Unclear verification status |
| **Buyer impact** | Cannot assess supplier trust level |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Schema + UI additive change |
| **Recommended timing** | Next |

### FIN-023 — `rut_dian` body field vs eligibility gate mismatch

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Must Do Now |
| **Description** | Onboarding comment notes `rut_dian` body field does not align with `compliance_docs.rutDian` used by eligibility gate (T4 alignment pending). |
| **Why it matters** | Suppliers may declare RUT at onboarding but fail eligibility gate. |
| **Business impact** | Graduation blocked incorrectly |
| **Revenue impact** | Fewer sellable suppliers |
| **Supplier impact** | Stuck at NOT_READY |
| **Buyer impact** | Fewer verified suppliers |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Small |
| **Dependencies** | Onboarding route review |
| **Recommended timing** | Must Do Now |

### FIN-024 — Manual admin transitions bypass re-evaluation (G15)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | `POST /admin/suppliers/:id/transition` sets state without running `evaluateSupplier()`; evaluation snapshot may diverge. |
| **Why it matters** | Audit trail and displayed scores may not match state. |
| **Business impact** | Trust/compliance audit risk |
| **Revenue impact** | Legal/reputation risk if challenged |
| **Supplier impact** | Incorrect displayed status |
| **Buyer impact** | Misleading supplier readiness |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Small |
| **Dependencies** | Graduation service |
| **Recommended timing** | Next |

### FIN-025 — Compliance admin PATCH does not log to interactions (G13)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | Admin compliance updates re-evaluate but no `interactions` audit row is created. |
| **Why it matters** | No audit trail for compliance changes. |
| **Business impact** | Compliance audit gap |
| **Revenue impact** | Trust dispute risk |
| **Supplier impact** | Changes not traceable |
| **Buyer impact** | Cannot verify admin actions |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Tiny |
| **Dependencies** | Interactions insert |
| **Recommended timing** | Next |

### FIN-026 — `product_placeholders` not visible in admin drawer (G12)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | Ingestion category hints feed AI scoring but admin UI does not surface them. |
| **Why it matters** | Operators miss context during review. |
| **Business impact** | Slower/missed verification decisions |
| **Revenue impact** | Indirect |
| **Supplier impact** | Incomplete admin view |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Admin UI |
| **Recommended timing** | Later |

### FIN-027 — Pathway labels A/B/C/D undefined in code (H8)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | Claude assigns pathway; meaning exists only in prompts, not code or schema documentation. |
| **Why it matters** | Silent breakage if AI output pattern changes. |
| **Business impact** | Opaque graduation decisions |
| **Revenue impact** | Cannot explain supplier pathway to buyers |
| **Supplier impact** | Confusing pathway messaging |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Product definition doc |
| **Recommended timing** | Later |

### FIN-028 — Legacy `status` coexists with `sellable_status` (M3)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | `ACTIVE/PENDING/INACTIVE` and graduation `sellableStatus` both populated; not kept in sync by code. |
| **Why it matters** | External consumers may read wrong status field. |
| **Business impact** | Inconsistent supplier visibility |
| **Revenue impact** | Wrong suppliers shown/hidden |
| **Supplier impact** | Incorrect status in exports |
| **Buyer impact** | Wrong marketplace view |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Schema/docs alignment |
| **Recommended timing** | Later |

### FIN-029 — Public trust badge refinement needed

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | Compliance widget and trust badges exist; verification level not yet buyer-meaningful at scale. |
| **Why it matters** | Core Phase I promise is verified sourcing. |
| **Business impact** | Brand differentiation |
| **Revenue impact** | Conversion lift when trustworthy |
| **Supplier impact** | Recognition of verification work |
| **Buyer impact** | Confidence in supplier selection |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-019, FIN-022 |
| **Recommended timing** | Next |

### FIN-030 — Supplier self-service graduation visibility limited

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | Farmers cannot easily view own graduation state, AI score, or compliance status without admin/B2B bridge. |
| **Why it matters** | Transparency gap for supplier trust loop. |
| **Business impact** | Support burden on founder |
| **Revenue impact** | Slower supplier completion |
| **Supplier impact** | Cannot track own progress |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-001, FIN-002 |
| **Recommended timing** | Next |

### FIN-031 — `farms` and `economics` allow duplicate rows (G14)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | No unique constraint on `supplier_id`; query code reads first row only. |
| **Why it matters** | Duplicate onboarding submissions create ambiguous data. |
| **Business impact** | Wrong scoring inputs |
| **Revenue impact** | Incorrect graduation |
| **Supplier impact** | Data integrity issues |
| **Buyer impact** | Wrong supplier profile data |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | DB constraint + migration |
| **Recommended timing** | Later |

### FIN-032 — `harvest_months` mapped to `variedad_cafe` column (M7)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | Onboarding maps harvest timing to coffee variety column — semantically incorrect. |
| **Why it matters** | Coffee variety queries return wrong data. |
| **Business impact** | Data quality degradation |
| **Revenue impact** | N/A |
| **Supplier impact** | Incorrect farm profile |
| **Buyer impact** | Wrong product attributes |
| **Technical risk** | Medium |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | Onboarding field mapping fix |
| **Recommended timing** | Later |

### FIN-033 — Ingestion batch confirm does not auto-trigger scoring (G9)

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Next |
| **Description** | Ingestion → scoring pipeline not auto-connected; admin must manually score after batch confirm. |
| **Why it matters** | Ingested suppliers sit unscored until manual action. |
| **Business impact** | Pipeline stall |
| **Revenue impact** | Delayed supplier publication |
| **Supplier impact** | Stuck in DRAFT/READY |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | High |
| **Effort** | Small |
| **Dependencies** | Pipeline hook on batch confirm |
| **Recommended timing** | Next |

### FIN-034 — Intelligence surfaces mix live API with static placeholder data

| Field | Value |
|-------|-------|
| **Category** | Trust & Verification |
| **Priority** | Later |
| **Description** | Market intel and analytics pages include hardcoded benchmarks/alerts alongside API data. |
| **Why it matters** | Admin may act on stale static data. |
| **Business impact** | Wrong operational decisions |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A (admin-only today) |
| **Technical risk** | Low |
| **Operational risk** | Medium until public |
| **Effort** | Small |
| **Dependencies** | Content refresh or remove static |
| **Recommended timing** | Later |

---

## 4. Operational Stability

### FIN-035 — Shallow health check (no DB probe)

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | `GET /api/healthz` returns OK without verifying PostgreSQL or object storage. |
| **Why it matters** | Replit/reverse proxy may route traffic to broken API. |
| **Business impact** | Undetected outages |
| **Revenue impact** | Platform appears up while broken |
| **Supplier impact** | Failed onboarding/scoring |
| **Buyer impact** | Failed login/inquiries |
| **Technical risk** | Low |
| **Operational risk** | High |
| **Effort** | Tiny |
| **Dependencies** | DB ping query |
| **Recommended timing** | Must Do Now |

### FIN-036 — No error monitoring or alerting (Sentry/Datadog)

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | No APM, error tracking, or uptime alerting in repo or config. |
| **Why it matters** | Failures discovered by users, not ops. |
| **Business impact** | Reputation damage |
| **Revenue impact** | Revenue loss during outages |
| **Supplier impact** | Broken flows unnoticed |
| **Buyer impact** | Poor experience |
| **Technical risk** | None |
| **Operational risk** | Critical |
| **Effort** | Small |
| **Dependencies** | Monitoring SaaS account |
| **Recommended timing** | Must Do Now |

### FIN-037 — Onboard/scoring pipeline has no durable job queue (H7)

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | `scoreSupplier` and `evaluateSupplier` run via in-process `setImmediate`; crash after HTTP 201 loses job permanently. |
| **Why it matters** | Suppliers stuck at NOT_READY with no recovery. |
| **Business impact** | Supply pipeline stall |
| **Revenue impact** | Fewer sellable suppliers |
| **Supplier impact** | Never scored after crash |
| **Buyer impact** | Fewer verified suppliers |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | Large |
| **Dependencies** | Job queue (DB or external) |
| **Recommended timing** | Next |

### FIN-038 — Email queue is in-memory only

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Later |
| **Description** | `email-queue.ts` retries in memory; queue lost on process restart. |
| **Why it matters** | Verification/notification emails may never send after restart. |
| **Business impact** | Auth/onboarding failures |
| **Revenue impact** | Signup friction |
| **Supplier impact** | Missing confirmations |
| **Buyer impact** | Failed verification |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Persistent queue |
| **Recommended timing** | Later |

### FIN-039 — CD pipeline is broken scaffold

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Later |
| **Description** | `.github/workflows/cd.yml` has corrupted YAML indentation; builds artifacts but performs no deploy. |
| **Why it matters** | No automated GitHub → production path. |
| **Business impact** | Manual deploy only |
| **Revenue impact** | Deploy delays |
| **Supplier impact** | Deploy delays |
| **Buyer impact** | Deploy delays |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Replit deploy API or webhook |
| **Recommended timing** | Later |

### FIN-040 — Replit ↔ GitHub sync drift risk

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | Documented in `TAKEOVER_PLAN.md`: Replit agent commits may not push; branches diverge. |
| **Why it matters** | Lost work or production running stale code. |
| **Business impact** | Data/code inconsistency |
| **Revenue impact** | Unexpected behavior |
| **Supplier impact** | Wrong features live |
| **Buyer impact** | Wrong features live |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Small (process) |
| **Dependencies** | Git discipline |
| **Recommended timing** | Must Do Now |

### FIN-041 — Migration hygiene issues

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | Orphan SQL files not in journal; duplicate `0012_*` entries; post-merge uses `drizzle push` not `migrate`; filter typo `db` vs `@workspace/db`. |
| **Why it matters** | Schema drift on deploy; data corruption risk. |
| **Business impact** | Production DB inconsistency |
| **Revenue impact** | Platform breakage |
| **Supplier impact** | Data loss risk |
| **Buyer impact** | Data loss risk |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | Developer, migration audit |
| **Recommended timing** | Next |

### FIN-042 — Automated DB backup not scheduled

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | Backup service exists (`pg_dump` → object storage) but requires manual/cron trigger via `POST /admin/backup/run`. |
| **Why it matters** | Data loss if DB failure without recent backup. |
| **Business impact** | Business continuity risk |
| **Revenue impact** | Total platform loss possible |
| **Supplier impact** | Data loss |
| **Buyer impact** | Data loss |
| **Technical risk** | Low |
| **Operational risk** | Critical |
| **Effort** | Small |
| **Dependencies** | Replit cron + `BACKUP_SECRET_V2` |
| **Recommended timing** | Must Do Now |
| **Status** | **Resolved — 2026-06-08** — Cron confirmed active in `.replit`; `BACKUP_SECRET_V2` confirmed in Replit Secrets (not shared env). |

### FIN-043 — AI (Anthropic) dependency with limited fallback

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Must Do Now |
| **Description** | Scoring, matching, docs, RFQ drafts, discovery all require Anthropic; most paths throw or degrade without key. |
| **Why it matters** | API outage/key expiry stops trust pipeline. |
| **Business impact** | Core ops halt |
| **Revenue impact** | Pipeline stops |
| **Supplier impact** | No scoring/graduation |
| **Buyer impact** | No matching/drafts |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Small (monitoring) |
| **Dependencies** | API key rotation process |
| **Recommended timing** | Must Do Now |

### FIN-044 — WhatsApp (Twilio) fails silently without credentials

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | Post-score WhatsApp is non-fatal; fails silently if Twilio unset. |
| **Why it matters** | Suppliers miss onboarding confirmation via preferred channel. |
| **Business impact** | Lower supplier engagement |
| **Revenue impact** | Lower completion rates |
| **Supplier impact** | No WhatsApp confirmation |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Tiny |
| **Dependencies** | Twilio secrets + alert on failure |
| **Recommended timing** | Next |

### FIN-045 — Resend email skips send without API key

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | `sendEmail` skips if no `RESEND_API_KEY`; auth flows break. |
| **Why it matters** | Registration/verification broken silently in misconfigured env. |
| **Business impact** | Users cannot register |
| **Revenue impact** | No signups |
| **Supplier impact** | Cannot verify email |
| **Buyer impact** | Cannot register |
| **Technical risk** | Low |
| **Operational risk** | High |
| **Effort** | Tiny |
| **Dependencies** | Secrets validation at startup |
| **Recommended timing** | Next |

### FIN-046 — README outdated vs actual platform

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | Root README describes landing-page plans, not live B2B concierge platform. |
| **Why it matters** | New engineers/operators misorient immediately. |
| **Business impact** | Onboarding friction |
| **Revenue impact** | Indirect |
| **Supplier impact** | Indirect |
| **Buyer impact** | Indirect |
| **Technical risk** | None |
| **Operational risk** | Medium |
| **Effort** | Tiny |
| **Dependencies** | Doc update |
| **Recommended timing** | Next |

### FIN-047 — Documentation fragmented across 5+ locations

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | Truth split across `Supplier_Layer_Architecture.md`, SoT roadmap, TAKEOVER_PLAN, ops/, attached_assets/. |
| **Why it matters** | Wrong decisions from stale docs. |
| **Business impact** | Operational errors |
| **Revenue impact** | Indirect |
| **Supplier impact** | Indirect |
| **Buyer impact** | Indirect |
| **Technical risk** | None |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | Doc consolidation |
| **Recommended timing** | Next |

### FIN-048 — `attached_assets/` noise (213 historical files)

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Later |
| **Description** | Agent prompts and audits not part of runtime; clutter discovery. |
| **Why it matters** | Wastes time; may contain outdated "facts." |
| **Business impact** | Slower onboarding |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | None |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | Archive policy |
| **Recommended timing** | Later |

### FIN-049 — Test coverage thin on HTTP routes

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Later |
| **Description** | Vitest covers auth, flags, graduation logic, fees; most route modules untested. |
| **Why it matters** | Regressions ship undetected. |
| **Business impact** | Production bugs |
| **Revenue impact** | Broken flows |
| **Supplier impact** | Broken onboarding |
| **Buyer impact** | Broken buyer flows |
| **Technical risk** | High |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | Engineering time |
| **Recommended timing** | Later |

### FIN-050 — No background job system beyond in-process events

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Later |
| **Description** | No Redis/SQS/worker; pipelines, email, campaigns all in-process. |
| **Why it matters** | Cannot scale or recover async work. |
| **Business impact** | Ops ceiling |
| **Revenue impact** | Scale limit |
| **Supplier impact** | Delayed processing |
| **Buyer impact** | Delayed notifications |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Large |
| **Dependencies** | Infrastructure decision |
| **Recommended timing** | Later |

### FIN-051 — Admin seed accounts via `ADMIN_DEFAULT_PASSWORD`

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Next |
| **Description** | Startup seeds admin users if env set; passwords logged once. |
| **Why it matters** | Misconfiguration creates known credentials. |
| **Business impact** | Security/ops risk |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Tiny |
| **Dependencies** | Remove after initial setup |
| **Recommended timing** | Next |

### FIN-052 — CI active but no production deploy gate beyond Replit manual

| Field | Value |
|-------|-------|
| **Category** | Operational Stability |
| **Priority** | Later |
| **Description** | GitHub CI runs typecheck/build/tests; production deploy is Replit-side. |
| **Why it matters** | Two systems to monitor. |
| **Business impact** | Deploy inconsistency |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-039 |
| **Recommended timing** | Later |

---

## 5. Security

### FIN-053 — `UPLOAD_TOKEN_SECRET` in `.replit` shared env

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Must Do Now |
| **Description** | Literal secret in committed `.replit` shared env block; should be Replit Secrets only. |
| **Why it matters** | Token forgery for uploads if exposed. |
| **Business impact** | File upload compromise |
| **Revenue impact** | N/A |
| **Supplier impact** | Document theft |
| **Buyer impact** | N/A |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | Tiny |
| **Dependencies** | Move to secrets |
| **Recommended timing** | Must Do Now |
| **Status** | **Resolved — 2026-06-08** — `UPLOAD_TOKEN_SECRET` confirmed in Replit Secrets only; not present in shared `.replit` env. Orphaned `SESSION_SECRET` and `RESEND_FINCAVA_EMAIL_API_KEY` entries also deleted from Replit Secrets. |

### FIN-054 — Plaintext token columns not yet dropped

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Next |
| **Description** | Reset/verification tokens dual-write plaintext + hash; Phase 2 drop commented out in migration. |
| **Why it matters** | DB breach exposes active tokens. |
| **Business impact** | Account takeover risk |
| **Revenue impact** | N/A |
| **Supplier impact** | Account compromise |
| **Buyer impact** | Account compromise |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Migration completion |
| **Recommended timing** | Next |

### FIN-055 — `claim_token` stored plaintext in DB

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Later |
| **Description** | Supplier claim tokens in `suppliers.claim_token` without hashing. |
| **Why it matters** | Token leak enables profile claim abuse. |
| **Business impact** | Supplier identity fraud |
| **Revenue impact** | N/A |
| **Supplier impact** | Account takeover |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Hash at rest |
| **Recommended timing** | Later |
| **Status** | **Partially Mitigated — 2026-06-08** — Column confirmed dormant: no route reads or writes `claim_token` in the current codebase. Annotated with hash-contract comment in `suppliers.ts`. No active exploitation risk while dormant; full remediation (hash + migration) deferred. |

### FIN-056 — Partial API rate limiting

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Next |
| **Description** | Rate limits on auth, onboard, AI assistant only; no global API limit. |
| **Why it matters** | DoS via expensive endpoints (AI, discovery). |
| **Business impact** | Service outage |
| **Revenue impact** | Platform down |
| **Supplier impact** | Cannot onboard |
| **Buyer impact** | Cannot browse |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Rate limit middleware |
| **Recommended timing** | Next |

### FIN-057 — AI cost exposure / unbounded AI calls

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Next |
| **Description** | Many AI endpoints; only ai-assistant has per-user rate limit. |
| **Why it matters** | Cost attack or runaway bills. |
| **Business impact** | Financial damage |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | AI rate limits + budgets |
| **Recommended timing** | Next |

### FIN-058 — Field officers require full ADMIN role (G8)

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Must Do Now |
| **Description** | Officer dashboard/compliance requires ADMIN; no scoped FIELD_OFFICER permissions. |
| **Why it matters** | Officers get full platform admin access. |
| **Business impact** | Privilege escalation by design |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | FIN-059 role design |
| **Recommended timing** | Must Do Now |

### FIN-059 — FIELD_OFFICER role not implemented in route guards

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Must Do Now |
| **Description** | Role exists in schema/UI but routes use `roles={["ADMIN"]}` for officer pages. |
| **Why it matters** | Cannot grant least-privilege officer access. |
| **Business impact** | Over-permission or no access |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | Route audit |
| **Recommended timing** | Must Do Now |

### FIN-060 — Backup endpoint non-timing-safe secret comparison

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Later |
| **Description** | Code review notes backup token comparison may be timing-vulnerable. |
| **Why it matters** | Backup trigger abuse if secret guessed. |
| **Business impact** | Data exfiltration vector |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | `crypto.timingSafeEqual` |
| **Recommended timing** | Later |
| **Status** | **Resolved — 2026-06-08** — Backup endpoint now uses `crypto.timingSafeEqual` with length pre-check before comparison. Committed `da0da0e` in `artifacts/api-server/src/routes/admin.ts`. |

### FIN-061 — Discovery engine external fetch SSRF surface

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Later |
| **Description** | `discovery-engine.ts` fetches external URLs via AI workflow; threat model flags SSRF risk. |
| **Why it matters** | Malicious URL injection in admin discovery. |
| **Business impact** | Infrastructure abuse |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Low (admin-only) |
| **Effort** | Small |
| **Dependencies** | URL allowlist |
| **Recommended timing** | Later |

### FIN-062 — `ENABLE_TRANSACTIONS` partial gate inconsistency

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Later |
| **Description** | Orders gated by flag; inquiries and RFQs are not gated despite being transactional-adjacent. |
| **Why it matters** | Inconsistent attack/business surface if flags misconfigured. |
| **Business impact** | Unexpected exposure |
| **Revenue impact** | Early transaction data |
| **Supplier impact** | Order data when off |
| **Buyer impact** | Inquiry data always on |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | Flag policy alignment |
| **Recommended timing** | Later |

### FIN-063 — Thin integration tests for IDOR/BFLA on business routes

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Later |
| **Description** | Threat model identifies orders, RFQs, messages, storage as IDOR risk; few route-level auth tests. |
| **Why it matters** | Cross-tenant data access bugs possible. |
| **Business impact** | Data breach |
| **Revenue impact** | Legal/reputation |
| **Supplier impact** | Data leak |
| **Buyer impact** | Data leak |
| **Technical risk** | High |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | Test suite expansion |
| **Recommended timing** | Later |

### FIN-064 — Feature flag backend/frontend manual sync

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Priority** | Next |
| **Description** | Backend `ENABLE_*` env vars vs frontend `VITE_ENABLE_*` must match manually. |
| **Why it matters** | UI exposes routes backend rejects or vice versa. |
| **Business impact** | Confusing errors |
| **Revenue impact** | N/A |
| **Supplier impact** | Broken flows |
| **Buyer impact** | Broken flows |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Shared flag doc/checklist |
| **Recommended timing** | Next |
| **Status** | **Improved — 2026-06-08** — `ENABLE_CART` added consistently to both `artifacts/api-server/src/lib/flags.ts` (backend) and `artifacts/fincava/src/lib/flags.ts` (frontend), to `FlagName` union, to all `PHASE_BASELINES`, and to `LIVE_FLAGS`. Pattern now serves as the reference for future flags. Full automated sync still deferred. |

---

## 6. Compliance

### FIN-065 — Compliance Concierge layer complete but farmer auth gap

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Must Do Now |
| **Description** | CC-1 tables and routes exist; farmers cannot self-serve without login (see FIN-002). |
| **Why it matters** | Compliance readiness blocked at UX layer. |
| **Business impact** | Phase I priority unmet |
| **Revenue impact** | Delayed verified supply |
| **Supplier impact** | Officer-mediated only |
| **Buyer impact** | Fewer compliant suppliers |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Large |
| **Dependencies** | FIN-002 |
| **Recommended timing** | Must Do Now |

### FIN-066 — Officer applications have no promotion flow (G10)

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Next |
| **Description** | `officer_applications` stored; no flow creates FIELD_OFFICER user accounts from applications. |
| **Why it matters** | Manual officer onboarding only. |
| **Business impact** | Cannot scale field compliance |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | FIN-003, FIN-059 |
| **Recommended timing** | Next |

### FIN-067 — Officer compliance workflow ADMIN-gated

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Next |
| **Description** | `/officer/compliance` requires ADMIN role today. |
| **Why it matters** | Real officers cannot use compliance tools without full admin. |
| **Business impact** | Field compliance bottleneck |
| **Revenue impact** | N/A |
| **Supplier impact** | Delayed doc collection |
| **Buyer impact** | Delayed verification |
| **Technical risk** | Low |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | FIN-059 |
| **Recommended timing** | Next |

### FIN-068 — Document prescreening exists without operator SLA workflow

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Next |
| **Description** | AI prescreening service built; unclear triage SLA for admin review queue. |
| **Why it matters** | Docs may sit unreviewed. |
| **Business impact** | Compliance backlog |
| **Revenue impact** | N/A |
| **Supplier impact** | Unclear doc status |
| **Buyer impact** | Unverified suppliers |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small (process) |
| **Dependencies** | Admin queue discipline |
| **Recommended timing** | Next |

### FIN-069 — Managed service cases need operational playbook

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Next |
| **Description** | `managed_service_cases` CRUD exists; concierge service delivery process not codified. |
| **Why it matters** | Inconsistent managed compliance service. |
| **Business impact** | Service quality variance |
| **Revenue impact** | Managed service revenue variable |
| **Supplier impact** | Uneven support |
| **Buyer impact** | Uneven buyer confidence |
| **Technical risk** | None |
| **Operational risk** | Medium |
| **Effort** | Small (ops) |
| **Dependencies** | Service definition |
| **Recommended timing** | Next |

### FIN-070 — Export mode declaration underused

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Later |
| **Description** | `supplier_export_mode` tracks direct vs intermediary export; buyer visibility signals admin-gated. |
| **Why it matters** | Compliance story for export readiness incomplete publicly. |
| **Business impact** | Missed trust signal |
| **Revenue impact** | N/A |
| **Supplier impact** | Unclear export path |
| **Buyer impact** | Cannot assess export readiness |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | FIN-022, public badges |
| **Recommended timing** | Later |

### FIN-071 — Token hashing migration incomplete (compliance-adjacent)

| Field | Value |
|-------|-------|
| **Category** | Compliance |
| **Priority** | Next |
| **Description** | Password reset and email verification tokens retain plaintext columns (see FIN-054). |
| **Why it matters** | Regulatory audit finding on credential storage. |
| **Business impact** | Audit risk |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-054 |
| **Recommended timing** | Next |

---

## 7. Technical Debt

### FIN-072 — Mixed API client patterns (Orval vs raw fetch)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | ~19 Orval hooks used; admin/compliance/RFQ pages use raw `fetch`; `apiFetch` wrapper third pattern. |
| **Why it matters** | Harder to maintain; inconsistent error handling. |
| **Business impact** | Slower feature delivery |
| **Revenue impact** | Indirect |
| **Supplier impact** | Indirect |
| **Buyer impact** | Indirect |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | OpenAPI spec expansion |
| **Recommended timing** | Later |

### FIN-073 — Orval codegen covers ~50% of frontend API usage

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Generated hooks exist for ~40 endpoints; many admin flows bypass codegen. |
| **Why it matters** | Contract drift between frontend and API. |
| **Business impact** | Runtime errors |
| **Revenue impact** | Broken admin flows |
| **Supplier impact** | Broken admin ops |
| **Buyer impact** | Broken buyer ops |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | api-spec updates |
| **Recommended timing** | Later |

### FIN-074 — ~25 unused shadcn UI components installed

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | sidebar, carousel, chart, drawer, etc. installed but never imported by app pages. |
| **Why it matters** | Bundle size and maintenance noise. |
| **Business impact** | None direct |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | None |
| **Recommended timing** | Parking Lot |

### FIN-075 — `lib/auth.ts` frontend stub unused

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | `getToken()` always returns null; dead code. |
| **Why it matters** | Confusion for developers. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | None |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | None |
| **Recommended timing** | Parking Lot |

### FIN-076 — `lib/api-routes.ts` underused

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Partial API path constants; most pages hardcode `/api/...`. |
| **Why it matters** | Path typos (see FIN-003 pattern). |
| **Business impact** | Broken endpoints |
| **Revenue impact** | Broken flows |
| **Supplier impact** | Broken flows |
| **Buyer impact** | Broken flows |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | Centralize paths |
| **Recommended timing** | Later |

### FIN-077 — `ENABLE_LOGISTICS` defined but unused in frontend

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | Flag exported and tested; no UI consumer. |
| **Why it matters** | Dead configuration surface. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | Remove or wire |
| **Recommended timing** | Parking Lot |

### FIN-078 — `@workspace/config` package bypassed

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Package exists; api-server imports thresholds via filesystem path. |
| **Why it matters** | Workspace package inconsistency. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | Import fix |
| **Recommended timing** | Later |

### FIN-079 — Intelligence gating pattern inconsistent

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Backend uses `ENABLE_INTELLIGENCE_PUBLIC`; frontend uses ADMIN role gating. |
| **Why it matters** | Two mechanisms to maintain. |
| **Business impact** | Misconfiguration |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Align patterns |
| **Recommended timing** | Later |

### FIN-080 — `requireRole` middleware underused

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Exported from auth.ts; routes use inline checks or `adminOnly`. |
| **Why it matters** | Inconsistent authorization patterns. |
| **Business impact** | Auth bugs |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Low |
| **Effort** | Medium |
| **Dependencies** | Route standardization |
| **Recommended timing** | Later |

### FIN-081 — Pathway type inconsistency across tables (M2)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | `ai_outputs.pathway` free text; `suppliers.graduation_pathway` enum A/B/C/D. |
| **Why it matters** | Cross-table query fragility. |
| **Business impact** | Data inconsistency |
| **Revenue impact** | N/A |
| **Supplier impact** | Wrong pathway display |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | Schema alignment |
| **Recommended timing** | Later |

### FIN-082 — Spanish/English dual field names in onboarding API (L1)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Onboarding accepts both English and Spanish field names via OR logic. |
| **Why it matters** | API consumer ambiguity. |
| **Business impact** | Integration errors |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Medium |
| **Dependencies** | API documentation |
| **Recommended timing** | Later |

### FIN-083 — `export_readiness_score` vs `commercial_score` terminology (L2)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | Same value, different names across tables and JSONB snapshots. |
| **Why it matters** | Reporting confusion. |
| **Business impact** | Wrong metrics |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | Doc/glossary |
| **Recommended timing** | Parking Lot |

### FIN-084 — `currently_exporting` maps to two columns (L3)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | One input populates `tipo_comprador` and `ha_intentado_exportar`. |
| **Why it matters** | Semantic ambiguity in economics data. |
| **Business impact** | Scoring inaccuracy |
| **Revenue impact** | N/A |
| **Supplier impact** | Wrong economic profile |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | Field mapping fix |
| **Recommended timing** | Later |

### FIN-085 — `interaction_type` is free text not enum (L4)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | Only `FORM_SUBMISSION` used; no validation on arbitrary strings. |
| **Why it matters** | Log pollution possible. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Tiny |
| **Dependencies** | Enum constraint |
| **Recommended timing** | Parking Lot |

### FIN-086 — `volumen_kg_ultima_cosecha` type coercion fragility (H6)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Later |
| **Description** | Schema integer; onboarding may insert string values. |
| **Why it matters** | Insert errors on non-numeric input. |
| **Business impact** | Onboarding failure |
| **Revenue impact** | N/A |
| **Supplier impact** | Failed submission |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Tiny |
| **Dependencies** | Zod coercion |
| **Recommended timing** | Later |

### FIN-087 — Sparkles import unused in dashboard-layout

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | Dead import; AI nav item commented/hidden. |
| **Why it matters** | Lint noise. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | None |
| **Operational risk** | None |
| **Effort** | Tiny |
| **Dependencies** | None |
| **Recommended timing** | Parking Lot |

### FIN-088 — `mockup-sandbox` duplicated shadcn kit

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | Separate artifact with full UI kit copy for design preview. |
| **Why it matters** | Duplication drift from main app. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | None |
| **Dependencies** | Keep as design tool |
| **Recommended timing** | Parking Lot |

### FIN-089 — Supplier finance page is placeholder (G11)

| Field | Value |
|-------|-------|
| **Category** | Technical Debt |
| **Priority** | Parking Lot |
| **Description** | `/supplier-dashboard/finance` shows "coming soon" when `ENABLE_FINANCE` on. |
| **Why it matters** | Misleading if flag accidentally enabled. |
| **Business impact** | Brand damage if exposed |
| **Revenue impact** | N/A |
| **Supplier impact** | Disappointment |
| **Buyer impact** | N/A |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | N/A until finance phase |
| **Dependencies** | FIN-100 |
| **Recommended timing** | Parking Lot |

---

## 8. Architecture

### FIN-090 — Monorepo surface area too large for solo maintainer

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Must Do Now |
| **Description** | ~45 tables, 28 route groups, 63 pages, 20+ services — high cognitive load. |
| **Why it matters** | Every change requires expert developer. |
| **Business impact** | Velocity ceiling |
| **Revenue impact** | Slow feature delivery |
| **Supplier impact** | Slow fixes |
| **Buyer impact** | Slow fixes |
| **Technical risk** | Medium |
| **Operational risk** | Critical for solo founder |
| **Effort** | N/A (structural) |
| **Dependencies** | Hiring/partnering |
| **Recommended timing** | Must Do Now |

### FIN-091 — `products.supplier_id` optional without FK constraint

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Later |
| **Description** | Products link to graduation suppliers optionally; no enforced referential integrity. |
| **Why it matters** | Orphan or wrong product–supplier links. |
| **Business impact** | Catalog errors |
| **Revenue impact** | Wrong listings |
| **Supplier impact** | Wrong product attribution |
| **Buyer impact** | Wrong supplier on product |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | Schema FK decision |
| **Recommended timing** | Later |

### FIN-092 — Physical module split deferred but documented

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Parking Lot |
| **Description** | SoT targets `/core`, `/intelligence`, `/transactions` folders; not moved (gating-first policy). |
| **Why it matters** | Logical boundaries exist only in docs. |
| **Business impact** | Navigational complexity |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | XL |
| **Dependencies** | Team size > 1 |
| **Recommended timing** | Parking Lot |

### FIN-093 — OpenAPI contract pipeline incomplete

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Later |
| **Description** | `api-spec` → `api-zod` + `api-client-react` exists but many routes/schemas not in OpenAPI. |
| **Why it matters** | Contract drift. |
| **Business impact** | Integration breaks |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | Spec coverage project |
| **Recommended timing** | Later |
| **Status** | **Improved — 2026-06-08** — Phase 2 added 13 new paths and 13 new component schemas to `lib/api-spec/openapi.yaml` (type-schemas, enrich, admin products CRUD, cart, checkout). Orval regenerated `lib/api-client-react/` and `lib/api-zod/`. Coverage meaningfully extended but full spec parity still deferred. |

### FIN-094 — Single PostgreSQL instance, no read replicas

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Later |
| **Description** | All reads/writes to one DB; no pooling config visible. |
| **Why it matters** | Scale ceiling. |
| **Business impact** | Performance at growth |
| **Revenue impact** | Slow pages |
| **Supplier impact** | Slow onboarding |
| **Buyer impact** | Slow marketplace |
| **Technical risk** | Medium |
| **Operational risk** | Medium at scale |
| **Effort** | Medium |
| **Dependencies** | Infra upgrade |
| **Recommended timing** | Later |

### FIN-095 — Replit object storage via local sidecar

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Later |
| **Description** | GCS access through `127.0.0.1:1106` workload identity sidecar. |
| **Why it matters** | Replit-specific coupling. |
| **Business impact** | Migration cost if leaving Replit |
| **Revenue impact** | N/A |
| **Supplier impact** | Upload failures if sidecar down |
| **Buyer impact** | Broken images |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | Platform decision |
| **Recommended timing** | Later |

### FIN-096 — Feature flags encode product strategy (by design)

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Next |
| **Description** | Layers I–IV mapped to flags; correct but requires discipline on every deploy. |
| **Why it matters** | Accidental flag misconfiguration exposes wrong layer. |
| **Business impact** | Wrong features live |
| **Revenue impact** | Premature transactions |
| **Supplier impact** | Wrong UX |
| **Buyer impact** | Wrong UX |
| **Technical risk** | Low |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Deploy checklist |
| **Recommended timing** | Next |

### FIN-097 — Admin forces English; public site bilingual

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Later |
| **Description** | `admin-layout.tsx` overrides language to English; public supports en/es. |
| **Why it matters** | Colombian operators may prefer Spanish admin. |
| **Business impact** | Operator friction |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | None |
| **Operational risk** | Low |
| **Effort** | Small |
| **Dependencies** | i18n admin |
| **Recommended timing** | Later |

### FIN-098 — No Stripe/payment architecture for Phase I

| Field | Value |
|-------|-------|
| **Category** | Architecture |
| **Priority** | Parking Lot |
| **Description** | Transaction layer built without payment rail — correct for concierge but blocks self-serve revenue. |
| **Why it matters** | Future activation requires new integration. |
| **Business impact** | Revenue model transition needed |
| **Revenue impact** | No self-serve fees |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | N/A |
| **Operational risk** | N/A |
| **Effort** | XL |
| **Dependencies** | FIN-005 |
| **Recommended timing** | Parking Lot |

---

## 9. Future Enhancements

### FIN-099 — Enable `ENABLE_TRANSACTIONS` (orders + 4% fee)

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Full order checkout, fee computation, buyer/supplier order dashboards built but gated. |
| **Why it matters** | Self-serve transaction revenue when concierge proven. |
| **Business impact** | Business model shift |
| **Revenue impact** | Direct transaction revenue |
| **Supplier impact** | Order management |
| **Buyer impact** | Self-serve ordering |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | Stripe, legal, FIN-005 |
| **Recommended timing** | Parking Lot |

### FIN-100 — Enable `ENABLE_FINANCE` (loans, credit)

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Financing routes, loans schema, investor page, supplier finance placeholder. |
| **Why it matters** | Embedded finance deferred per Phase I. |
| **Business impact** | New revenue stream later |
| **Revenue impact** | Finance revenue |
| **Supplier impact** | Capital access |
| **Buyer impact** | Financing options |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | XL |
| **Dependencies** | Legal, underwriting |
| **Recommended timing** | Parking Lot |

### FIN-101 — Enable `ENABLE_LOGISTICS` (shipments, milestones)

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Shipment and payment milestone routes built but gated. |
| **Why it matters** | Logistics orchestration deferred. |
| **Business impact** | Fulfillment capability |
| **Revenue impact** | N/A |
| **Supplier impact** | Shipment tracking |
| **Buyer impact** | Delivery visibility |
| **Technical risk** | Medium |
| **Operational risk** | High |
| **Effort** | Large |
| **Dependencies** | Carrier integrations |
| **Recommended timing** | Parking Lot |

### FIN-102 — Enable `ENABLE_INTELLIGENCE_PUBLIC`

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Public analytics, trust rankings, market intel when flag on. |
| **Why it matters** | AI rankings create trust/legal risk if premature. |
| **Business impact** | Differentiation when ready |
| **Revenue impact** | Conversion lift |
| **Supplier impact** | Visibility |
| **Buyer impact** | Better discovery |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | Medium |
| **Dependencies** | Legal review |
| **Recommended timing** | Parking Lot |

### FIN-103 — Enable `ENABLE_MATCHING` for buyers

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | AI matching public-facing when flag on; today admin-only. |
| **Why it matters** | Automated introductions vs concierge curation. |
| **Business impact** | Scale matching |
| **Revenue impact** | Faster intros |
| **Supplier impact** | More buyer leads |
| **Buyer impact** | Better matches |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Small |
| **Dependencies** | Operator model decision |
| **Recommended timing** | Parking Lot |

### FIN-104 — WhatsApp OTP auth for farm suppliers

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Alternative to web accounts for farmer compliance access. |
| **Why it matters** | Solves FIN-002 without full web signup. |
| **Business impact** | Field-friendly auth |
| **Revenue impact** | N/A |
| **Supplier impact** | Mobile-native access |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Large |
| **Dependencies** | Twilio, FIN-001 |
| **Recommended timing** | Parking Lot |

### FIN-105 — AI agent automation layer

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | AI assistant exists; full agent orchestration deferred. |
| **Why it matters** | Automation after intelligence layer proven in admin use. |
| **Business impact** | Ops efficiency |
| **Revenue impact** | Cost reduction |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | High |
| **Operational risk** | Medium |
| **Effort** | XL |
| **Dependencies** | FIN-102 |
| **Recommended timing** | Parking Lot |

### FIN-106 — Microservices split

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Explicitly out of scope per founder rules and SoT. |
| **Why it matters** | Would increase solo maintainer burden. |
| **Business impact** | Negative for solo ops |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | High |
| **Operational risk** | High |
| **Effort** | XL |
| **Dependencies** | Team growth |
| **Recommended timing** | Parking Lot |

### FIN-107 — Merge supplier tables with FK

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Conflating `suppliers` and `companies` — high-risk schema change. |
| **Why it matters** | Could simplify model but risks data loss. |
| **Business impact** | High migration risk |
| **Revenue impact** | N/A |
| **Supplier impact** | Identity disruption |
| **Buyer impact** | Catalog disruption |
| **Technical risk** | Critical |
| **Operational risk** | Critical |
| **Effort** | XL |
| **Dependencies** | Never without full plan |
| **Recommended timing** | Parking Lot |

### FIN-108 — Lots entity introduction

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | SoT-approved additive schema for lot-level data. |
| **Why it matters** | Richer product traceability. |
| **Business impact** | Premium positioning |
| **Revenue impact** | N/A |
| **Supplier impact** | Lot-level listing |
| **Buyer impact** | Better sourcing detail |
| **Technical risk** | Low |
| **Operational risk** | Low |
| **Effort** | Medium |
| **Dependencies** | Schema design |
| **Recommended timing** | Parking Lot |

### FIN-109 — Product certifications relational migration

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | SoT-approved dual-write from array to relational certifications table. |
| **Why it matters** | Better certification queries. |
| **Business impact** | Trust data quality |
| **Revenue impact** | N/A |
| **Supplier impact** | Cert management |
| **Buyer impact** | Cert visibility |
| **Technical risk** | Medium |
| **Operational risk** | Low |
| **Effort** | Large |
| **Dependencies** | Schema migration |
| **Recommended timing** | Parking Lot |

### FIN-110 — CD pipeline automation to Replit

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Fix and complete GitHub CD workflow for automated deploy. |
| **Why it matters** | Reduces manual deploy errors. |
| **Business impact** | Faster releases |
| **Revenue impact** | N/A |
| **Supplier impact** | N/A |
| **Buyer impact** | N/A |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-039 |
| **Recommended timing** | Parking Lot |

### FIN-111 — Remove unused shadcn components

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | Bundle cleanup when frontend stable (see FIN-074). |
| **Why it matters** | Minor maintenance win. |
| **Business impact** | None |
| **Revenue impact** | None |
| **Supplier impact** | None |
| **Buyer impact** | None |
| **Technical risk** | Low |
| **Operational risk** | None |
| **Effort** | Small |
| **Dependencies** | None |
| **Recommended timing** | Parking Lot |

### FIN-112 — Self-serve checkout on product detail

| Field | Value |
|-------|-------|
| **Category** | Future Enhancements |
| **Priority** | Parking Lot |
| **Description** | "Place Order" dialog exists but gated by `ENABLE_TRANSACTIONS`. |
| **Why it matters** | Contradicts concierge model until Phase II. |
| **Business impact** | Model conflict if early |
| **Revenue impact** | Transaction revenue |
| **Supplier impact** | Order flow |
| **Buyer impact** | Instant purchase |
| **Technical risk** | Medium |
| **Operational risk** | Medium |
| **Effort** | Medium |
| **Dependencies** | FIN-099 |
| **Recommended timing** | Parking Lot |

---

### FIN-113 — Supplier payment method self-configuration

| Field | Value |
|-------|-------|
| **Category** | Revenue Enabling |
| **Priority** | Phase 4 prerequisite |
| **Description** | Suppliers have no way to configure how they receive payment. Operator must ask manually on every deal close. |
| **Why it matters** | Fincava disburses COP to suppliers after deal close. Without stored payment details, every payout requires out-of-band communication with the supplier. |
| **Business impact** | Bottleneck on every closed deal |
| **Revenue impact** | Delays payout → delays supplier trust → delays repeat deals |
| **Supplier impact** | Poor experience; Nequi is their natural rail |
| **Buyer impact** | None direct |
| **Technical risk** | Low — new table, two screens, two endpoints |
| **Operational risk** | Low if built before first paid deal |
| **Effort** | Small–Medium |
| **Dependencies** | None — data capture only. Wompi disbursement automation (V2) depends on NIT + Wompi merchant account. |
| **Recommended timing** | Phase 4 — before first paid deal closes |
| **Status** | ✅ Complete — `supplier_payment_methods` table + `/supplier-dashboard/payment-method` self-config screen + admin read endpoint |

---

## Summary

### Total items: **112**

### Total by classification category

| Category | Count |
|----------|------:|
| Revenue Blocking | 8 |
| Revenue Enabling | 10 |
| Trust & Verification | 16 |
| Operational Stability | 18 |
| Security | 12 |
| Compliance | 7 |
| Technical Debt | 18 |
| Architecture | 9 |
| Future Enhancements | 14 |
| **Total** | **112** |

### Total by recommended priority

| Priority | Count |
|----------|------:|
| **Must Do Now** | 22 |
| **Next** | 38 |
| **Later** | 30 |
| **Parking Lot** | 22 |

### Total by priority × category

| Category | Must Do Now | Next | Later | Parking Lot |
|----------|------------:|-----:|------:|------------:|
| Revenue Blocking | 4 | 3 | 0 | 1 |
| Revenue Enabling | 2 | 5 | 3 | 0 |
| Trust & Verification | 4 | 7 | 5 | 0 |
| Operational Stability | 5 | 6 | 6 | 1 |
| Security | 3 | 5 | 3 | 1 |
| Compliance | 1 | 5 | 1 | 0 |
| Technical Debt | 1 | 2 | 10 | 5 |
| Architecture | 1 | 1 | 5 | 2 |
| Future Enhancements | 0 | 0 | 0 | 14 |
| **Total** | **22** | **38** | **30** | **22** |

### Must Do Now — quick index (FIN-001–FIN-090 subset)

| ID | Title |
|----|-------|
| FIN-001 | Two supplier systems with no database link |
| FIN-002 | Farm suppliers lack self-service login for compliance |
| FIN-003 | Officer registration API path bug |
| FIN-004 | Contact form has no backend |
| FIN-006 | Concierge introduction workflow not operator-optimized |
| FIN-011 | Operator playbook documentation |
| FIN-019 | AI compliance gaps not written back to `compliance_docs` |
| FIN-020 | Three parallel compliance representations |
| FIN-023 | `rut_dian` body field vs eligibility gate mismatch |
| FIN-035 | Shallow health check (no DB probe) |
| FIN-036 | No error monitoring or alerting |
| FIN-040 | Replit ↔ GitHub sync drift risk |
| FIN-042 | Automated DB backup not scheduled |
| FIN-043 | AI (Anthropic) dependency with limited fallback |
| FIN-053 | `UPLOAD_TOKEN_SECRET` in `.replit` shared env |
| FIN-058 | Field officers require full ADMIN role |
| FIN-059 | FIELD_OFFICER role not implemented in route guards |
| FIN-065 | Compliance Concierge complete but farmer auth gap |
| FIN-090 | Monorepo surface area too large for solo maintainer |

---

## Related documents

| Document | Role |
|----------|------|
| `docs/SOURCE_OF_TRUTH_ROADMAP.md` | Product layers and feature-flag policy |
| `Supplier_Layer_Architecture.md` | Supplier domain flows and gap register (G1–G16) |
| `docs/TAKEOVER_PLAN.md` | Engineer onboarding and fragile areas |
| `threat_model.md` | Security scope |
| `ops/system_gap_analysis_raw.md` | Historical code vs doc gaps (verify against `main` before acting) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-31 | Initial register created from Repository Discovery Report (112 items, FIN-001–FIN-112) |

<!-- When resolving an item, add a row above and set Status on the item header, e.g. **Status:** Resolved 2026-06-15 -->
