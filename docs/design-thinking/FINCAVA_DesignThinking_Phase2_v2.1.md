# FINCAVA Trust Commerce Retail Expansion
## Design Thinking Document — Phase 2 of 2: Ideate, Prototype, Test

**Document Status:** Working draft, Design Thinking Phase 2 of 2.
**Scope:** Colombian domestic retail launch only. International expansion appears only as a forward-looking flag, not as a designed flow.
**Date:** May 2026.
**Builds on:** `FINCAVA_DesignThinking_Phase1_EmpathyDefine.md` (Empathy + Define). Every reference to a numbered Problem refers to that document's Section 2.
**Audience:** Product, UX, operations, engineering, content, AI-assisted development teams, and investors evaluating the retail readiness of the platform.

---

## 0. Document Posture

### 0.1 What this document is and is not

This is a Design Thinking deliverable. It contains ideated solution approaches, conceptual flows, interaction descriptions, and a test plan. It does not contain code, schema migrations, API specifications, or implementation tasks. Those belong to Phase 3 (Implementation), which this document handoffs into but does not author.

The "prototype phase" below uses prototype in the Design Thinking sense — conceptual flow descriptions and low-fidelity mockup-level thinking expressed in prose, not interactive prototypes or production code.

### 0.2 Disambiguation: two meanings of "Phase 2"

Two different "Phase 2" concepts appear in FINCAVA materials:

- **Design Thinking Phase 2** refers to this document — Ideate, Prototype, and Test as the second phase of the Design Thinking series.
- **Buyer Onboarding P2 (B2B)** refers to a buyer-funnel concept tracked in the `buyer_profiles` columns `p2CompletionPct`, `p2SectionsDone`, `p2ApprovalStatus`. This is a B2B importer onboarding sub-flow inside the existing platform. It has nothing structurally to do with this document's Phase 2.

Throughout this document, the unqualified term "Phase 2" means Design Thinking Phase 2. Where the buyer-funnel concept is meant, the term used is "Buyer Onboarding P2 (B2B)."

### 0.3 Grounding refinements that this document carries

Twelve findings from a code-vs-Phase-1 reconnaissance pass were approved before drafting. They are summarized inline where they matter, but the document-wide refinements are:

1. There is no `payment_milestones` table. Payment state today is `orders.feeStatus` (WAIVED | PENDING | INVOICED | PAID). Wompi is greenfield — Phase 2 ideation is free to introduce a payment lifecycle without working around legacy infrastructure.
2. The AI pipeline has six model constants (`SCORING_MODEL`, `DOCUMENT_MODEL`, `ENRICHMENT_MODEL`, `DISCOVERY_MODEL`, `TRANSLATION_MODEL`, `PRESCREENING_MODEL`) and six named prompts (`SCORING_PROMPT_V2`, `ORIGIN_STORY_PROMPT`, `SEED_STORY_PROMPT`, `ENRICHMENT_PROMPT`, `DISCOVERY_PROMPT`, `PRESCREENING_PROMPT`).
3. The existing `POST /api/orders/buyer/intent` flow creates an `orders` row with `status = INQUIRY` and triggers an admin alert email. This is the platform's only "buyer commits to a supplier" pattern that exists in code today, and it is treated throughout this document as Approach 0 (current state) for any retail order ideation.
4. Runtime farmer↔buyer translation uses `TRANSLATION_MODEL` on the `messages` table only. Authored content translation (origin stories, product copy) is a human content production workflow with optional Sonnet-tier AI assistance; it does not use `TRANSLATION_MODEL`.
5. The `buyer_matches` table is the structural pattern for similar-farm recommendation. It carries `matchScore`, `scoreBreakdown` (jsonb), `disqualifiers` (text[]), `sectionsAtRun` (text[]), `isCurrent`. Phase 2 ideation extends this pattern; it does not invent a new ranking primitive.
6. `suppliers.harvestMonths` (text[]) exists today. Phase 2 harvest cycle ideation extends this column rather than introducing a parallel structure where the extension suffices.
7. The CC-1 compliance family is live: `supplier_requirement_status`, `compliance_enablement_flows`, `compliance_documents_v2`, `admin_compliance_reviews`, `buyer_visibility_signals`, `supplier_export_mode`, `managed_service_cases`. Phase I requirement codes: `DIAN_RUT | ICA_CONTEXT | FNC_COFFEE`. Modes: `self_serve | assisted | managed`. Phase 2 ideation for documentation-gates (Problem 2.5.1) references these by name.
8. Sellable status is canonical. The legacy `supplier_status` enum (ACTIVE | INACTIVE | PENDING) is out of scope. All retail surfaces filter by `sellable_status = PUBLISHED`.
9. Field officer verification is sourced from the `interactions` audit log filtered by `users.role = FIELD_OFFICER`. There is no field-officer assignment table.
10. WhatsApp send infrastructure (Twilio via `lib/whatsapp.ts`) is wired. Phase 2 WhatsApp ideation is template and protocol authoring on top of the existing primitive, not infrastructure build.
11. Dual terminology: **Origin Story** = the published artifact. **Farm Biography Records** = the admin panel where it is authored, edited, and re-linked to suppliers.
12. **The platform has zero live transactions of any kind.** Retail Trust Commerce may be the platform's first live transactional channel. Phase 2 ideation treats all transactional flows — including B2B inquiry-to-order — as unproven in production. Where Phase 2 proposes manual fallbacks for V1, those fallbacks may extend to flows that Phase 1 implied were already operational.

These refinements are the operational floor for everything below.

---

## SECTION 3 — IDEATE PHASE

The ideate phase translates each defined problem from Phase 1 Section 2 into two or three solution approaches, with tradeoffs and a recommended path. Approaches are described in prose. Where an approach builds on a named existing pattern (table, route, model constant, audit log), the pattern is named.

The order below follows the Phase 1 problem numbering exactly.

### 3.1 Problems 2.1.1 through 2.1.4 — Core Trust-Commerce Problems

#### 3.1.1 Problem 2.1.1 — Retail buyer has no place to live in the data model

**Approach A — Parallel `retail_buyer_profiles` table, one-to-one with `users` by `userId` FK.**
A new profile structure modeled on the retail buyer's reality: name, preferred Nequi handle, default shipping address(es), filter preferences (women_led, organic, smallholder, region), language preference, marketing opt-in. The existing `buyer_profiles` table remains exclusively for B2B importers and continues to drive Buyer Onboarding P2 (B2B). The split is total: a `users` row with `role = BUYER` carries either a retail profile, an importer profile, or both, and the application chooses which to expose by route.

Tradeoffs: cleanest conceptual model, lowest risk of confusing fields across personas, simplest admin UI per persona. Slightly more code (two profile loaders, two settings screens). Profile-presence check on login.

**Approach B — Extend the existing `buyer_profiles` table with nullable retail fields.**
Add columns to `buyer_profiles` for retail-only attributes; treat any row missing destination port and incoterm as a retail buyer. The `buyer_profiles` table becomes polymorphic.

Tradeoffs: minimum migration scope. High long-term confusion cost — the column inventory becomes a mix of "applies to B2B," "applies to retail," "applies to both." Risk that admin tools designed for B2B render meaningless fields for retail buyers and vice versa. Increases the surface area for Buyer Onboarding P2 (B2B) logic to accidentally apply to retail buyers.

**Approach C — `users.profileVariant` discriminator with profile child tables.**
A discriminator column on `users` plus child tables per variant. Cleaner than B for future-proofing (third buyer type, e.g., wholesaler-retailer hybrid), but is overengineered for two known buyer types.

**Recommended approach: A.** A parallel `retail_buyer_profiles` table keeps the B2B funnel untouched and gives retail buyers a profile shape that fits their reality. The discriminator approach is a future option if a third buyer type is ever needed. The polymorphic extension creates more long-term debt than it saves in upfront work.

**Builds on:** existing `users` table with role enum and `buyer_profiles` pattern. Mirrors the relational style (one-to-one with users via userId FK) already used by `profiles` and `buyer_profiles`.

**Success criterion check:** Approach A lets a retail buyer register, save filters, save addresses, and view order history without ever touching a B2B field.

#### 3.1.2 Problem 2.1.2 — Order vocabulary is B2B export, not retail parcel

**Approach 0 (current state) — The buyer-intent flow.**
Today, `POST /api/orders/buyer/intent` creates an `orders` row with `status = INQUIRY` and a `supplierId` FK, plus an admin alert email via Resend. This is the only buyer-to-supplier commitment flow that exists in code. It is B2B-shaped (intended for importer inquiries) but has not yet processed a live transaction.

**Approach A — Extend the `orders` table with retail-specific statuses and nullable retail fields.**
Add statuses to the `order_status` enum: `AUTHORIZED` (payment authorized, awaiting farmer ready), `READY_TO_SHIP` (farmer marked ready, payment captured), `IN_TRANSIT` (label generated, with carrier), `DELIVERED_RETAIL` (POD). Add nullable columns: `shippingAddress`, `shippingCity`, `shippingDepartment`, `shippingPostalCode`, `carrier`, `trackingNumber`, `parcelWeightG`, `paymentAuthorizationRef`. The existing `incoterm` and `destinationPort` columns remain nullable and are simply ignored for retail.

Tradeoffs: single order table to query, reuses the fee model, retail and B2B orders are visible in the same admin queue. Risk of mixed-vocabulary confusion — `incoterm = FOB` for B2B sitting next to `parcelWeightG = 280` for retail. Status enum grows long.

**Approach B — Parallel `retail_orders` table.**
A new `retail_orders` table with retail-shaped columns and its own status enum (`PENDING_PAYMENT` | `AUTHORIZED` | `READY_TO_SHIP` | `CAPTURED` | `IN_TRANSIT` | `DELIVERED` | `CANCELLED` | `REFUNDED`). The B2B `orders` table is left alone. A shared `payment_transactions` ledger sits orthogonally and references either by polymorphic key.

Tradeoffs: clean separation, retail vocabulary stays retail-shaped, B2B order analytics stay clean. Higher migration cost, two order tables to query for any "all orders" view, fees logic must be duplicated or abstracted.

**Approach C — Hybrid: shared `orders` table, retail-specific child table.**
`orders` continues to be the canonical order record. A `retail_order_details` child table holds shipping address, parcel weight, carrier, etc., joined when the order is retail. Status enum gains retail statuses but does not duplicate them across tables.

Tradeoffs: middle path. Reasonable conceptual cleanliness, single table for ID generation and fee calculation, retail-specific fields isolated. Slight join overhead. Requires discipline to keep B2B-only fields out of `retail_order_details` and vice versa.

**Recommended approach: C.** The hybrid preserves the single source of truth for order identity and the existing fee model, gives retail orders their own vocabulary surface, and avoids the long-status-enum-and-nullable-column drift of Approach A. It also lets the buyer-intent flow (Approach 0) remain as a B2B INQUIRY pattern without retrofitting it for retail.

**Builds on:** `orders` table, `order_status` enum, `artifacts/api-server/src/services/fee-service.ts` per-order fee computation (4% standard, first 10 orders WAIVED), the existing `POST /api/orders/buyer/intent` precedent.

**Manual fallback for V1 (carrying Finding 12 forward):** because no transactional flow has been proven in production, the first 10–25 retail orders should be processed with an admin-in-the-loop. The order is created on confirmation. A human reads the admin alert email, authorizes payment manually in Wompi's dashboard, notifies the farmer over WhatsApp, captures payment manually on ready, and generates the label manually. The system records each event; the human triggers each event. Automation grows incrementally as each step's failure modes are observed.

#### 3.1.3 Problem 2.1.3 — Payment at shipping readiness

**Reframed context (per Finding 1):** there is no `payment_milestones` table. Wompi integration is greenfield. The only legacy constraint is `orders.feeStatus` column convention.

**Approach A — Wompi authorize-now, capture-on-ready, refund-on-SLA-breach. Manual capture in V1.**
At checkout, the buyer's chosen instrument (Nequi, PSE, Bancolombia card) is authorized through Wompi for the order total plus shipping. The authorization holds funds without debiting. When the farmer marks the order ready (via WhatsApp acknowledgement or admin action), the capture is triggered. If the order is not marked ready within an SLA window (initially proposed as fourteen calendar days, configurable per product category), the authorization is voided automatically and the buyer is notified.

Tradeoffs: matches Phase 1 approved baseline #1 exactly. Wompi natively supports this pattern. Buyer's bank may show a "pending" line that disappears on void — this needs a buyer-facing explanation. Some instruments (Nequi instant settlement) may not support pure authorization; Phase 2 ideation must accept that for those instruments, the capture happens immediately and an explicit refund is the failure mode.

**Approach B — Two-stage: an intent record now, payment request sent when ready.**
At checkout, the buyer commits intent (a `retail_order_intents` row) but enters no payment details. When the farmer marks the order ready, the buyer receives a payment link by email and SMS. The buyer completes payment in Wompi. The order moves to `CAPTURED` and ships.

Tradeoffs: simpler integration (no authorize/capture state machine), no risk of half-captured authorizations. Worse buyer experience — the buyer must come back to pay, increasing drop-off. Risk that ready inventory sits unpaid while the buyer's attention has moved on.

**Approach C — Pre-authorization with Nequi/PSE fallback to Approach B for cash/Bancolombia button.**
A hybrid: instruments that support authorization use Approach A; instruments that do not use Approach B.

Tradeoffs: most operationally honest, but two flows to test and explain to buyers. Conceptually fragmented.

**Recommended approach: A**, with the explicit V1 caveat that the authorize/capture state machine is run manually by the admin (founder) for the first 10–25 orders. The Wompi dashboard becomes the operating console. Automation is added once failure modes are catalogued from real captures.

**Builds on:** `orders.feeStatus` column convention (WAIVED | PENDING | INVOICED | PAID will need to accept new values such as AUTHORIZED, CAPTURED, REFUNDED — to be designed in Phase 3). New conceptual ledger `payment_transactions` referenced earlier as part of the order architecture.

#### 3.1.4 Problem 2.1.4 — Harvest cycles structural, not narrative

**Approach A — Extend `suppliers.harvestMonths` with `nextExpectedWindow` and `lastReplenishedAt` columns on the product row.**
The supplier-level `harvestMonths` array (e.g., `["10","11","12"]` for October–December coffee) stays. The product row gains `nextExpectedWindow` as a stored range or two timestamps (`nextWindowStart`, `nextWindowEnd`) and `lastReplenishedAt`. When `availableKg` drops to zero, the product surfaces `nextWindowStart..nextWindowEnd` as the waitlist trigger window. When the farmer marks new stock available, `lastReplenishedAt` is set, the product becomes purchasable again, and the waitlist is notified.

Tradeoffs: minimal schema change. Builds on existing field. Easy for the admin to update. Limited expressiveness — no support for staggered batches, no provenance per batch.

**Approach B — New `product_harvest_windows` child table.**
A child table per product with rows for each scheduled or observed harvest event: window start, window end, expected_kg, actual_kg, status (PLANNED | IN_PROGRESS | HARVESTED | FAILED). The waitlist references a specific harvest window. Failures are recorded against the specific window.

Tradeoffs: most expressive. Supports the trust-failure scenario where a harvest fails — there is a discrete row to update with cause and date. Supports multi-cycle crops (cacao, exotic fruit) with distinct micro-harvests. More schema. Requires admin tooling to manage windows.

**Approach C — JSON column on product row.**
A `harvestCycles` jsonb column with an array of windows. Same expressiveness as B in principle, but unenforced shape and harder to query.

**Recommended approach: B**, deferred. Start with Approach A in V1 (minimal change, sufficient for the first cohort of single-harvest-cycle coffee farmers) and migrate to B when a multi-cycle crop joins the catalog or when the first harvest failure forces a structured record.

**Builds on:** `suppliers.harvestMonths`, `products.availableKg`, `products.harvestSeason`, `products.harvestDate`.

### 3.2 Problems 2.2.1 through 2.2.4 — Operational Friction Points

#### 3.2.1 Problem 2.2.1 — Translation layer not staffed or scheduled

**Approach A — Founder-led pipeline with templates and AI-assisted first draft.**
The founder is the field officer, the content producer, and the reviewer in V1. Templates standardize: shot list, interview question list, origin story first-draft prompt, marketing-copy first-draft prompt. AI assistance produces a Spanish first draft using `SCORING_MODEL` or `DOCUMENT_MODEL` (Sonnet tier for narrative work). Founder edits, sends to farmer over WhatsApp, farmer approves with voice note or thumbs up, founder publishes.

Tradeoffs: lowest cost, slowest cadence (one farmer per two weeks realistic). Founder is the bottleneck. Quality is whatever the founder's day produces.

**Approach B — Founder plus paid Colombian content contractor (writer, photographer).**
Founder does the visit and interview. Contractor produces photos, video, copy. Founder reviews and publishes. Cadence accelerates to one farmer per week.

Tradeoffs: higher cost (per-farmer content production). Requires contractor sourcing and a quality bar. Farmer review loop adds latency.

**Approach C — Cooperative-anchored intake.**
Partner with a Colombian cooperative (Federación Nacional de Cafeteros, regional cooperatives). The cooperative provides the introduction to the farmer, vouches for the field officer's visit, and acts as the trust intermediary for consent. Content production runs the same as A or B but the intake bottleneck shifts.

Tradeoffs: structural acceleration, but introduces a partner relationship that takes months to establish. Out of scope for V1.

**Recommended approach: A in months 1–3, B in months 4–12, C in year 2.**
This phasing matches solo-founder execution capacity and accepts that catalog growth is gated by content production, not software.

**Builds on:** existing `ORIGIN_STORY_PROMPT` and `SEED_STORY_PROMPT` services. The `Farm Biography Records` admin panel is the publication surface. Cadence of one farmer per two weeks is consistent with Phase 1 Section 3.2.

#### 3.2.2 Problem 2.2.2 — `sellable_status` legibility to farmer

**Approach A — Spanish-labeled status surface on the farmer's claim portal.**
When a farmer claims their profile (`claim_status = CLAIMED`), they land on a Spanish dashboard that shows their current `sellable_status` translated into plain Spanish: "Estamos conociendo tu finca" (NOT_READY), "Cumples los requisitos básicos" (ELIGIBLE), "Listo para vender" (SELLABLE), "Publicada en el mercado" (PUBLISHED). Next step is shown as a single sentence: "Lo siguiente: completar tu RUT" if `DIAN_RUT` requirement is `not_started`, etc.

**Approach B — WhatsApp-delivered status updates triggered by state transitions.**
Each time `sellable_status` transitions, a WhatsApp message goes to the farmer with the plain-Spanish status name and next step. No web dashboard required.

Tradeoffs: meets the low-bandwidth reality. The farmer never has to log in. Limited surface — only state transitions trigger messages, not continuous visibility.

**Approach C — Both, with B as primary, A as fallback.**
WhatsApp is the default channel. The web dashboard is for the moment when the farmer (or a family member) wants to see the full picture.

**Recommended approach: C.** WhatsApp first because connectivity is the binding constraint; web dashboard for completeness.

**Builds on:** `sellable_status` column on suppliers, `claim_status` enum, `lib/whatsapp.ts` Twilio integration. State transitions are already observable in code at the points where `sellable_status` is updated.

**Note on `supplier_requirement_status`:** the CC-1 table already tracks per-requirement progress with states (not_started, not_sure, self_serve_in_progress, assisted_in_progress, managed_service_candidate, submitted, needs_fix, conditionally_approved, verified, rejected). The farmer-facing translation should collapse these to two or three states per requirement in Spanish: "Por empezar," "En proceso," "Listo." Internal granularity stays in the table; the farmer sees the summary.

#### 3.2.3 Problem 2.2.3 — Shipping cost variance

**Approach A — Zone-based shipping table.**
A static table mapping origin department × destination department to a flat rate per small parcel (250g or 500g). Published openly. Reviewed quarterly against carrier invoices. Variance is absorbed by FINCAVA.

Tradeoffs: simplest, fastest to launch, most legible to the buyer. Variance from real carrier cost means FINCAVA loses or gains a few thousand pesos per shipment. Cross-subsidy is minimal at small scale.

**Approach B — Real-time carrier API integration.**
At checkout, the platform queries Servientrega or Coordinadora for the actual rate. The buyer sees the real cost.

Tradeoffs: most accurate, but heavier integration and slower checkout. Carrier API quality in Colombia varies. Not suitable for V1.

**Approach C — Tiered approximation by parcel weight and distance class.**
Three tiers (local, regional, national). Simpler than A, less accurate.

**Recommended approach: A**, with explicit disclosure that the rate is an approximation and FINCAVA covers variance. Phase 3 may introduce B once order volume justifies the integration work.

**Builds on:** Nothing existing — this is greenfield logistics tooling. Phase 2 frames it as a conceptual table; Phase 3 builds the table and the admin UI.

#### 3.2.4 Problem 2.2.4 — Retail SKU alongside B2B bulk

**Approach A — Retail SKU columns on `products`.**
Add `retailEnabled`, `retailUnitLabel` (e.g., "Bolsa 250g"), `retailUnitWeightG`, `retailPriceCop`, `retailStockUnits`, and `retailMaxPerOrder`. A single product can carry both B2B bulk pricing (`pricePerKgUSD`, `minOrderKg`, `availableKg`) and retail unit pricing. The marketplace shows whichever applies to the viewing buyer.

Tradeoffs: minimum schema change, single product table. Risk that retail and B2B stock counts diverge from physical reality unless reconciled. Reasonable for V1.

**Approach B — Child `product_skus` table.**
A child table per product with rows for each SKU (250g bag, 500g bag, 1kg bag). Each SKU carries its own price, stock count, weight, dimensions. The product row carries the shared narrative (origin story, farmer, farm).

Tradeoffs: most expressive, supports multiple retail SKUs per product (250g, 500g, 1kg of the same coffee). Standard e-commerce pattern. More schema, more admin UI.

**Recommended approach: A in V1, B when the first product needs a second SKU.**
Migration path is straightforward: the columns on `products` become the first row in `product_skus`.

**Builds on:** existing `products` table.

### 3.3 Problems 2.3.1 through 2.3.3 — Transparency Gaps

#### 3.3.1 Problem 2.3.1 — Stock counts can lie

**Approach 0 (current state) — `products.availableKg` as the sole stock primitive.**
The platform today holds a single `availableKg` column per product, updated manually by an admin. This column serves the B2B marketplace (minimum orders of 100kg or more, bulk pricing) and has not been exercised at retail scale. It does not distinguish between stock designated for FINCAVA and stock the farmer is simultaneously selling through other channels, and it has no retail-unit equivalent (no concept of a 250g bag, no unit count). Approach 0 is the starting point; it has not been proven under any live transaction.

**Approach A — Designated FINCAVA-channel stock with farmer pre-commitment.**
The farmer designates a specific batch as FINCAVA inventory. The platform's `retailStockUnits` is the designated batch's unit count. The farmer agrees in onboarding (in Spanish, with a one-line plain-language explanation) that the designated batch is not sold through other channels.

Tradeoffs: simplest. Trades capacity for accuracy. Requires the farmer to understand the constraint.

**Approach B — Daily WhatsApp stock confirmation tool.**
A WhatsApp template message ("Tu inventario actual: 12 bolsas. ¿Sigue siendo correcto? Responde SÍ, o el número actual.") sent each morning to active sellers. Farmer responds; platform updates `retailStockUnits`.

Tradeoffs: highest farmer-effort burden. Risk of fatigue and ignored messages.

**Approach C — Single-channel exclusivity for the listed product.**
The farmer's listed product is sold only through FINCAVA. Stock count is canonical.

Tradeoffs: simplest of all but excludes farmers who sell at local markets and through FINCAVA simultaneously.

**Recommended approach: A.** Phase 1 baseline of "we surface what is real at the moment of viewing" requires a pre-commitment model. Approach C is too exclusionary; B is too high-friction. Approach A is honest, low-friction, and the farmer retains the right to sell other batches through other channels.

**Builds on:** `products.availableKg` and the proposed `retailStockUnits`. Onboarding consent text managed via the existing translation/content workflow.

#### 3.3.2 Problem 2.3.2 — Harvest date precision mismatch

**Approach A — Date ranges with explicit disclaimer.**
Harvest dates are always shown as a range ("late October to early November") with a one-line disclaimer ("La cosecha depende del clima"). The waitlist conversion email is sent on actual harvest readiness, not on calendar date.

**Approach B — Single date with confidence indicator.**
A single date plus a confidence label (Approximate, Likely, Confirmed). The label changes as the harvest approaches.

**Approach C — Phase-based labels (Bloom, Cherry, Picking, Drying, Ready).**
Phase labels track the agricultural cycle and update as the farmer reports progress.

**Recommended approach: A**, with the option to evolve into C as a second-year enhancement once buyer behavior is observed.

**Builds on:** `products.harvestSeason` (free-text), `products.harvestDate` (single timestamp). The proposed `nextWindowStart` / `nextWindowEnd` from Problem 2.1.4 satisfies the range model.

#### 3.3.3 Problem 2.3.3 — Platform economics opacity

**Approach A — Dedicated transparency page with rate disclosure.**
A page accessible from the footer ("Cómo funciona FINCAVA") explains in plain Spanish: of every COP 38,000 paid by the buyer, COP X reaches the farmer, COP Y covers shipping, COP Z is FINCAVA's commission, COP W is payment processing. The breakdown is illustrative, not per-product, but is accurate within a stated range.

**Approach B — Per-product price transparency disclosure on the product page.**
A small expandable section on each product page shows the rough split for that specific product.

Tradeoffs: highest transparency, most affecting. Higher admin overhead — each price change requires recalculating the disclosed split. Risk of buyer fixation on the percentage.

**Approach C — Annual transparency report.**
Aggregate data published once a year covering total revenue, total farmer payouts, total shipping, and operating margin.

**Recommended approach: A in V1, B in year 2.**
A page disclosure is enough to establish the trust posture. Per-product transparency is more rigorous but is operationally heavy and is better introduced once the platform has stable product volume.

**Builds on:** new static page in the existing React frontend (`artifacts/fincava/src/pages/`). No schema change.

### 3.4 Problems 2.4.1 through 2.4.3 — Buyer Trust Challenges

#### 3.4.1 Problem 2.4.1 — In-stock vs harvest-wait differentiation

**Approach A — Two distinct product page templates.**
A product with `availableKg > 0` and `retailStockUnits > 0` uses the in-stock template (price, buy button, "Envío en 3–5 días hábiles"). A product with zero stock uses the harvest-wait template (no price prominence, "Próxima cosecha: octubre", waitlist signup as the primary action).

**Approach B — Same template with conditional regions.**
Single template, swaps the primary call-to-action and inventory line based on stock state.

**Approach C — Card label and color differentiation in the catalog grid plus template differentiation on the detail page.**
Adds a clear visual cue in the catalog before the buyer clicks.

**Recommended approach: C.** Catalog cards carry a label ("Disponible ahora" or "Próxima cosecha: octubre"), the detail page swaps templates. The buyer never moves from one mental model to the other without seeing the change.

**Builds on:** existing marketplace and product detail patterns in `artifacts/fincava/src/pages/`. References the proposed `nextWindowStart` / `nextWindowEnd` columns for the harvest-wait variant.

#### 3.4.2 Problem 2.4.2 — Surface FINCAVA's verification

**Approach A — Verification signal sourced from `interactions` filtered by `FIELD_OFFICER`.**
Every supplier profile shows a single line: "Visitada por FINCAVA el [date]" sourced from the most recent `interactions` row authored by a user with `role = FIELD_OFFICER` and `interactionType = FARM_VISIT` (or equivalent). Optionally names the officer.

**Approach B — Per-requirement visibility signals via `buyer_visibility_signals`.**
The CC-1 `buyer_visibility_signals` table already exists for admin-gated buyer-facing compliance signals. Use it to surface verified requirements (DIAN_RUT verified, ICA verified) as small badges on the supplier profile.

**Approach C — Combine A and B.**
The "Visitada por FINCAVA" line is the headline signal. The compliance badges are secondary, visible on an expanded view.

**Recommended approach: C.** The visit signal is the human, plain-Spanish trust signal that meets Phase 1's "feels like a friend's introduction" criterion. The compliance badges are present but secondary, available for buyers who want regulatory detail. To preserve the "friend's introduction, not a regulatory stamp" quality from Phase 1 Section 2.4.2, the visual hierarchy is explicit: the "Visitada por FINCAVA" line renders in headline-weight, warm typography — large, human, and prominent; the compliance badges render as small, quiet secondary elements below the fold or behind an expand control, present for buyers who seek regulatory confirmation but never competing with the human signal for visual dominance.

**Builds on:** `interactions` table, `users.role = FIELD_OFFICER`, `buyer_visibility_signals` table (with `visible = true` toggled by admin).

#### 3.4.3 Problem 2.4.3 — Graceful exit

**Approach A — One-click unsubscribe in every email, one-click waitlist leave, one-click account delete.**
Standard pattern, applied rigorously. Account deletion is honored within seven days. Marketing permissions are revoked immediately.

**Approach B — Two-tier exit: pause vs delete.**
Pause stops emails for 90 days. Delete removes the account. Some buyers might want a break, not a divorce.

**Recommended approach: A**, with the option to introduce pause in year 2 if buyer feedback suggests it. The cooperative commerce principle in Phase 1 Section 12.5 is best served by minimum friction at exit.

**Builds on:** existing email templates (Resend), user account management. No schema change beyond a `deletedAt` column and email opt-out columns on `retail_buyer_profiles`.

### 3.5 Problems 2.5.1 through 2.5.3 — Farmer Market-Access Barriers

#### 3.5.1 Problem 2.5.1 — Documentation gates as managed service

**Approach A — Default every consenting farmer into the `managed` mode for each required code.**
At onboarding, the farmer is offered three modes for each Phase I requirement (`DIAN_RUT`, `ICA_CONTEXT`, `FNC_COFFEE`): `self_serve`, `assisted`, `managed`. The default is `managed`. The farmer can opt down to `assisted` or `self_serve` if confident. The `managed_service_cases` table holds one row per (supplier, requirement) and is owned by a FINCAVA staff member (initially the founder).

**Approach B — Triage by farmer pathway.**
Pathway D farmers default to `managed`. Pathway C to `assisted`. Pathway A and B to `self_serve` with admin review.

Tradeoffs: matches farmer capacity to mode. Requires the pathway to be assigned before mode selection.

**Approach C — All-self-serve with help button.**
Farmers proceed self-serve; a "Pedir ayuda" button escalates to `assisted` or `managed`.

**Recommended approach: A** in V1 because the farmer cohort is small enough for the founder to handle every case manually, and B once the cohort exceeds the founder's capacity (estimated at 20 active cases). Approach C is too passive for the Phase 1 farmer persona (Doña Esperanza) who would not click "ayuda" before failing silently.

**Builds on:** CC-1 tables: `supplier_requirement_status`, `compliance_enablement_flows`, `compliance_documents_v2`, `admin_compliance_reviews`, `managed_service_cases`. Phase I requirement codes (`DIAN_RUT`, `ICA_CONTEXT`, `FNC_COFFEE`) are canonical.

#### 3.5.2 Problem 2.5.2 — Claim flow over WhatsApp

**Approach 0 (current state) — `POST /api/admin/ingestion/claim` with `claim_status` enum.**
The claim endpoint exists in code. The `claim_status` enum (`UNCLAIMED → PENDING_CLAIM → CLAIMED`) is defined in the `suppliers` schema. When a supplier completes the claim, their `userId` FK is set and their profile record is owned. This mechanism has not been exercised at scale — no farmer has completed the full claim flow in a live deployment. The endpoint currently assumes the farmer can navigate a standard web registration form directly; it does not have a WhatsApp-initiated entry point. Approaches A through C below are evolutions of this starting point.

**Approach A — WhatsApp-initiated, web-completed claim.**
A field officer adds the supplier and triggers a WhatsApp message: "Hola Doña Esperanza, soy [officer name] de FINCAVA. Para tomar control de tu perfil, responde con tu nombre y te enviamos un enlace." The farmer responds, receives a link, taps the link, sets a password on a single-screen web form. The link is one-tap, mobile-optimized, and Spanish.

**Approach B — Fully WhatsApp claim with no web step.**
The entire claim is conducted over WhatsApp message exchange. Password is set by the farmer typing a six-digit code into WhatsApp. No web form.

Tradeoffs: lowest farmer friction. Higher security risk (passwords over WhatsApp). Higher implementation complexity.

**Approach C — Officer-assisted in-person claim.**
The field officer sits with the farmer at the kitchen table, taps through the web form together. No WhatsApp claim flow at all.

**Recommended approach: A in V1, with C as the manual fallback for any farmer who cannot complete the WhatsApp step.**

**Builds on:** `lib/whatsapp.ts` send primitive, `claim_status` enum, existing claim endpoint at `POST /api/admin/ingestion/claim`. The web step uses the existing user registration plumbing.

#### 3.5.3 Problem 2.5.3 — Demand signals to farmer

**Approach A — Monthly WhatsApp digest in plain Spanish.**
Once a month, each PUBLISHED farmer receives a WhatsApp message: "En el último mes, 12 compradores buscaron café orgánico de Huila. Tienes 8 bolsas disponibles. Si quieres, podemos avisar a los compradores en lista de espera." A single recommendation, no analytics dashboard.

**Approach B — Web dashboard with charts.**
A dashboard accessible from the farmer's claimed account showing search volume, waitlist size, view counts.

Tradeoffs: more data, fewer farmers will look at it.

**Approach C — Quarterly summary by region and category.**
Less frequent, less actionable, lower farmer engagement.

**Recommended approach: A.** The WhatsApp digest is operationally simple, reaches the farmer in their primary channel, and respects the Phase 1 principle of one practical recommendation rather than analytics overload.

**Builds on:** `lib/whatsapp.ts`, the existing waitlist counts (to be designed in Phase 3), the existing search volume implicit in product views.

### 3.6 Problems 2.6.1 through 2.6.2 — The Translation Problem

#### 3.6.1 Problem 2.6.1 — Farmer reality is not buyer-facing copy

**Approach A — Dual-voice authoring workflow with farmer review.**
The content production session captures two things: the farmer's voice (direct quotes in Spanish, lightly edited) and the buyer-facing translation (flavor notes, brewing tips, harvest precision). Both appear on the product page in distinct sections labeled "En sus palabras" (the farmer's voice) and "Notas de cata y preparación" (buyer-facing). The farmer reviews both before publication.

**Approach B — Single farmer-voice presentation with admin-authored marketing copy.**
The farmer's voice is the only narrative shown. Flavor notes and brewing tips are a small admin-authored block, attributed to FINCAVA (not the farmer).

Tradeoffs: simpler, but loses the buyer's information need. Buyers want flavor notes; pretending they don't degrades the platform's usefulness.

**Approach C — Buyer-only marketing copy, farmer story relegated to an "about" section.**
This is what conventional e-commerce does. It violates Phase 1 Section 12.2 (the farmer is named) and 4.2 (lead with the farmer, not the product).

**Recommended approach: A.** It is the only approach consistent with the cooperative commerce principles.

**Builds on:** `origin_stories` table (already holds `story`, `challenges`, `impact`, `farmerName`, `farmerPhoto`, `farmName`, `region`). The Farm Biography Records admin panel is the authoring surface. Content production team workflow as described in Phase 1 Section 3.

**Important boundary (per Finding 5 refinement):** authored content translation does NOT use `TRANSLATION_MODEL`. That model is reserved for runtime farmer↔buyer message translation on the `messages` table. Authored content is a human pipeline with optional Sonnet-tier AI first-draft assistance (using `DOCUMENT_MODEL` or `SCORING_MODEL`, consistent with the existing `ORIGIN_STORY_PROMPT` pattern).

#### 3.6.2 Problem 2.6.2 — Content production rate-limiting

**Approach A — Standardized templates and AI-assisted Spanish first draft.**
Shot list (portrait, wide farm, close-up of crop, packaging, working shot). Sixty-second video script. Interview question template (twelve questions). AI first draft via the existing `ORIGIN_STORY_PROMPT` service. Content producer revision. Farmer review via WhatsApp. Total active production time: half a day per farmer.

**Approach B — Pre-recorded farmer self-capture.**
The farmer captures their own photos and video via a WhatsApp tool. The platform stitches the assets together into a draft, which the founder edits.

Tradeoffs: low founder time per farmer. Quality variance high. Requires farmers with smartphone fluency.

**Approach C — Contractor field network with central editorial.**
Multiple contractors do farm visits, central editor produces final content.

**Recommended approach: A in V1, evolving toward C in year 2. B can be layered onto A for ongoing harvest update content where production polish matters less.**

**Builds on:** `ORIGIN_STORY_PROMPT` and `SEED_STORY_PROMPT` services. The Farm Biography Records admin panel.

### 3.7 Problem 2.7.1 — The Harvest-Alignment Problem

This problem is largely addressed by the structural harvest cycle proposal in Problem 2.1.4 (Approach A initially, B over time). The waitlist conversion trigger is specifically stock-replenishment-driven, not calendar-driven.

**Conceptual flow:** when `availableKg` transitions from zero to positive on a product with a non-empty waitlist, a conversion email is sent to the waitlist members in the order they joined. The email is authored in the farmer's voice (per Phase 1 Section 1.7) and includes the specific product, the available stock count at the moment of harvest, and a buy button.

**Trigger mechanism end-to-end:** the farmer sends a WhatsApp stock update using the template from Section 3.15 ("Buenos días, ¿cuántas bolsas tienes disponibles hoy?"). The admin (founder in V1) confirms the farmer's response and updates `products.availableKg` manually — in V1 this is a direct admin panel edit; in later phases it is automated via the WhatsApp parsing flow. The increment event fires the waitlist conversion email to waitlist members in signup order, authored in the farmer's voice per Section 3.12. If the expected window (defined by `nextWindowStart..nextWindowEnd`) passes without a stock increment event, the platform triggers the harvest-failure dual-option exit (per Section 3.16) — presenting waitlist members with the choice to wait longer, move to a similar farm, or leave gracefully. This detection is the structural safeguard against the trust-failure scenario of a harvest failing silently after waitlist signup (Phase 1 Section 1.6 (a)).

**Builds on:** `suppliers.harvestMonths`, the proposed `nextWindowStart` / `nextWindowEnd`, `products.availableKg`, the existing email primitives in `lib/email.ts`.

### 3.8 Problem 2.8.1 — Domestic Shipping Cost Transparency

Same approach as Problem 2.2.3. Zone-based table, published openly, variance absorbed by FINCAVA, with a stated migration path to real-time carrier API in a future phase. The two problems are essentially the same problem viewed from different angles (one from operational friction, one from transparency).

### 3.9 Trust-Building UX Concepts

The six transparency principles from Phase 1 Section 4 operationalize as follows.

**4.1 Surface real numbers, not range estimates.** Every product page shows `retailStockUnits` ("12 bolsas disponibles"), not "limited stock." Every harvest is shown with `nextWindowStart..nextWindowEnd` and an honest disclaimer. Every shipping cost is the actual zone rate, not a "from" price.

**4.2 Lead with the farmer, not the product.** The product detail page header is the farmer name, farm name, region, and farmer photo, in that order. The product name and price are below. The catalog card shows farmer photo as the dominant visual, product name as secondary text.

**4.3 Make exit easier than entry.** Waitlist signup is a single field (email or WhatsApp number, buyer's choice). Waitlist exit is a single click in the waitlist confirmation email. Account deletion is a single click in the account settings, executed within seven days.

**4.4 Name the constraint, then offer an option.** Out-of-stock products show "Sin stock hasta [next window]" plus the dual-option presentation (waitlist + similar farms). Harvest failures show "Esta cosecha no salió bien" plus the dual-option exit. Shipping delays show "Tu paquete está demorado" plus a next step (wait, request refund).

**4.5 Speak in the language of the participant.**

ES + EN both ship at V1. Retail surfaces inherit the existing B2B platform's bilingual infrastructure (LanguageProvider, fincava_lang toggle, useLanguage hook) automatically. No additional i18n infrastructure is required for retail at launch.

Bilingual applies to buyer-facing surfaces only:
- Product catalog pages
- Product detail pages
- Checkout flow
- Order status pages
- Waitlist signup and notification emails
- Transactional email templates

Farmer-facing surfaces remain Spanish-only:
- Farmer WhatsApp templates
- Farm Biography Records admin panel
- Field officer mobile views
- Admin console (operations team is Spanish-speaking)

Rationale: the farmer cohort is Spanish-speaking by definition. Bilingual farmer-facing surfaces add complexity with zero user value for Phase I.

The Buyer Onboarding P2 (B2B) flow remains untouched (its own bilingual concerns apply to importers). The runtime `messages.translatedContent` capability is exposed in the buyer-farmer thread UI for farmer↔buyer conversations.

**4.6 Never substitute marketing for honesty.** Every piece of buyer-facing copy is reviewed against this principle. Common offenders: words like "exquisito," "artesanal," "tradicional" without specific referent; floral metaphors for poor farms; "limited edition" framing for naturally-scarce-because-small-harvest products. Replace with specific facts ("primer cosecha de María, 2026").

### 3.10 Community Interaction Concepts

**Buyer reviews authored in the farmer's voice context.** After delivery, the buyer is asked one question: "¿Qué le dirías a [farmer name] sobre su café?" Reviews are addressed to the farmer, not the platform. FINCAVA optionally surfaces a short translated summary to the farmer via WhatsApp.

**Harvest update posts.** Mid-cycle and at-ready, the farmer sends a photo and a one-line note to FINCAVA (via WhatsApp). The content producer translates into a brief marketplace post that appears on the product page and goes out to waitlist members. Phase 1 Section 1.7 cadence (two updates per harvest cycle).

**Buyer-introduces-buyer.** A post-delivery email asks the buyer if they would introduce FINCAVA to one friend. The introduction is one-click and shares the product page link. No referral incentive in V1 — Phase 1 Section 12.3 forbids artificial promotional pressure.

### 3.11 Transparency Mechanisms

**The "Cómo funciona FINCAVA" page.** Per Problem 2.3.3, accessible from the footer. Contains: an illustrative price breakdown for a typical 250g bag, a paragraph on payment timing (authorize at order, capture at shipping), a paragraph on what happens if a harvest fails, and a paragraph on the platform's relationship to the farmer.

**The per-supplier transparency line.** Each supplier profile shows: "Doña Esperanza recibe COP X de cada bolsa." Illustrative for V1, exact in year 2.

**The annual transparency note.** Once per year, FINCAVA publishes a short note (one page) covering: number of farmers active, number of orders fulfilled, total paid to farmers, total received by FINCAVA, what FINCAVA spent it on.

### 3.12 Waitlist Flow Refinements

**Signup.** Single field. Email or WhatsApp, buyer's choice. Confirmation message includes the specific harvest window expected and the unsubscribe link.

**Mid-cycle update.** One message per waitlist member at the midpoint of the wait window. Sourced from the farmer (photo plus one line). Authored in farmer's voice. Includes unsubscribe link.

**At-ready conversion.** Sent when `availableKg` transitions to positive. Includes the actual stock count, the actual harvest date, a buy button. Authored in the farmer's voice (e.g., "Cosechamos el martes. Las primeras 25 bolsas están listas. — Doña Esperanza"). Includes unsubscribe link.

**Decline / exit.** One-click unsubscribe from every message. The buyer remains on Doña Esperanza's general restock list unless they explicitly opt out of all communications from that supplier.

### 3.13 Farm-Story Presentation Approaches

**The narrative arc** (Phase 1 Section 5): who, how, when, what it means. Implemented as four sections on the product page, in that order:

1. **Quién** — farmer name, farm name, region, farmer photo, a one-line "Visitada por FINCAVA el [date]."
2. **Cómo** — variety, altitude, process (washed/honey/natural), drying method. Sourced from the `farms` table fields (`cultivoPrincipal`, `variedadCafe`, `metodoSecado`, `altitudeMeters`).
3. **Cuándo** — harvest date or window, current stock count.
4. **Qué significa** — origin story narrative from `origin_stories.story`, families supported, impact line.

**Avoidance principle.** No romanticism. No "humble" for poor, no "boutique" for small, no "ancestral" for old. Specific facts only.

### 3.14 Shipping Expectation Communication

**Pre-purchase.** The product page shows a shipping estimate calculator: enter your department, see the cost. The cost is the zone rate from the static table.

**Confirmation.** The order confirmation says: "Te enviaremos cuando [farmer name] tenga listo el pedido. Estimamos 3–7 días desde que esté listo. Te avisamos en cada paso."

**Mid-shipping.** When the label is generated, the buyer receives a WhatsApp or email with the tracking number and a one-line update.

**SLA breach.** If the package is in transit beyond the promised window (initially 7 days domestic), an automatic message goes to the buyer: "Tu paquete está demorado. Lo estamos rastreando con el courier. Te avisamos en 24 horas con un próximo paso."

### 3.15 WhatsApp-Based Farmer Interaction Patterns

Templates are authored in Spanish. They are short, plain, and end with a clear action.

**New order notification:**
> Hola [farmer first name], tienes un nuevo pedido. [Buyer first name] de [city] compró [X] bolsas. Cuando esté listo para enviar, responde LISTO. — FINCAVA

**Ready confirmation:**
> ¡Listo! [Buyer first name] sabe que su pedido está en camino. Generaremos la guía de envío y te avisamos cuándo recogerla. — FINCAVA

**Stock update prompt:**
> Buenos días, [farmer first name]. ¿Cuántas bolsas tienes disponibles hoy? Responde con el número. — FINCAVA

**Harvest update request:**
> Hola, [farmer first name]. Las personas en lista de espera quieren saber cómo va la cosecha. ¿Nos mandas una foto y una frase? — FINCAVA

**Sellable status transition (NOT_READY → ELIGIBLE):**
> ¡Buenas noticias! Cumples los requisitos básicos. Lo siguiente es [next requirement in plain Spanish]. Te ayudamos paso a paso. — FINCAVA

### 3.16 Out-of-Stock Dual-Option Presentation Refinement

When a buyer hits an out-of-stock product, the dual-option presentation appears.

**Section 1 — Wait for [farmer name]:** "Próxima cosecha: [window]. Únete a la lista de espera y serás de los primeros en saber cuando esté lista." Single field (email or WhatsApp), confirm button.

**Section 2 — Conoce otras fincas que coinciden con lo que buscas:** Three to five supplier cards ranked by the buyer's original filter selections. Each card leads with the farmer's photo and farm name, not the product. The narrative framing is "introduce a new farmer," not "here are substitutes."

**Section 3 — Decline:** "Quizás luego. Vuelve cuando quieras." A small, calm exit that does not capture any data.

The dual-option presentation is built on the `buyer_matches` pattern (filter-based ranking, scoreBreakdown for explainability, isCurrent for the current snapshot).

### 3.17 Retail Buyer Onboarding Concepts

A retail buyer does not need to "onboard" in the B2B sense (no destination port, no incoterm, no audit standards). The retail buyer's first interaction is a purchase or a waitlist signup. Account creation happens at checkout, with the minimum fields needed: email, name, shipping address.

**Approach A — Guest checkout with optional account.**
The buyer can complete the purchase without creating an account. After the order is placed, they receive an email offering to claim the account for future orders.

**Approach B — Required account at checkout.**
Standard pattern. Lowers anonymous orders but raises checkout friction.

**Approach C — Magic-link account on first purchase.**
The buyer enters an email; an account is created automatically; access is via magic link sent to the email.

**Recommended approach: C in V1 — magic link with SMS OTP fallback.** Magic links eliminate the password-creation friction at checkout while still creating a persistent identity for order history. The buyer receives an email with the order details and a one-click link to "ver tus pedidos" that signs them in. For mobile buyers on 4G where email delivery may be delayed, an SMS OTP is the required fallback, delivered via the existing Twilio primitive (`lib/whatsapp.ts` wrapper covers SMS). Magic-link-only is insufficient as a standalone mobile checkout solution; the OTP fallback is a launch requirement, not a contingency.

**Builds on:** new `retail_buyer_profiles` table (from Problem 2.1.1), magic-link auth pattern (not yet present in code; introduced in Phase 3 alongside Wompi integration).

### 3.18 Translation Layer Workflow Tooling Concepts

**The Farm Biography Records admin panel** is the authoring surface for the Origin Story artifact. It already supports the linking of stories to suppliers via the `supplierId` FK and tracks content maturity via `originStoryStatus` (SEED_DRAFT | GENERATED | EDITED). Phase 2 ideation introduces two refinements:

1. **A side-by-side authoring view.** Left column: farmer voice (Spanish quotes, captured from interview). Right column: buyer-facing copy (flavor notes, brewing tips, harvest precision). The authoring session produces both.

2. **A farmer review trigger.** A button on the admin panel that generates a WhatsApp message to the farmer with a preview link. The farmer reviews and replies (voice note, thumbs up, or a correction). The admin captures the farmer's approval in a `farmerApprovedAt` column on `origin_stories`. The story does not transition to `published = true` until the farmer has approved.

**Builds on:** `origin_stories` table, Farm Biography Records admin panel, `lib/whatsapp.ts`.

---

## SECTION 4 — PROTOTYPE PHASE

This section describes conceptual user flows for the retail experience. Every flow is described in prose. No code, no schema, no API specifications.

### 4.1 Buyer Journey Conceptual Flow

**Discovery.** Andrés sees a Café Fest video on Instagram. He follows the link to FINCAVA. He arrives at a Spanish landing page that says, in one paragraph, what FINCAVA is: "Compra directamente a fincas colombianas verificadas. Solo pagas cuando tu pedido esté listo para enviar." Below the paragraph: three product cards from currently-PUBLISHED suppliers. (Trust Moment from Phase 1 Section 1.5 — first read of the concept page.)

**Marketplace.** Andrés taps "Ver todo el café." A grid of cards appears. Each card shows the farmer's photo as the dominant visual, the farm name, the region, and a small label: "Disponible ahora" or "Próxima cosecha: octubre." He filters: women-led, organic, Huila. Four cards remain.

**Product page (in-stock branch).** Andrés taps Doña Esperanza's card. The page loads in under three seconds on his iPhone 12 on Bogotá 4G (per Phase 1 Section 8 mobile-first criterion). The page header shows her name, her farm name, her region, her photo, and "Visitada por FINCAVA el 14 de marzo de 2026 — Diana Martínez." Below: the four-section narrative (Quién, Cómo, Cuándo, Qué significa). Stock count: "25 bolsas de 250g disponibles." Price: "COP 38,000." A buy button. (Trust Moment — first product page.)

**Checkout.** Andrés taps buy. He selects two bags. Total: COP 76,000. Shipping: "COP 12,000 a Bogotá (tarifa por zona)." Final: COP 88,000. He enters his email and address. He chooses Nequi as payment. He sees one sentence: "Tu pago se autoriza ahora y se cobra solo cuando Doña Esperanza tenga listo tu pedido." He taps confirm. Nequi authorizes the COP 88,000. (Trust Moment — payment screen.)

**Authorization confirmation.** Andrés sees a confirmation page: "Doña Esperanza recibió tu pedido. Te avisamos en cuanto esté listo para enviar." He receives an email with the same content and a link to "ver tu pedido."

**Wait period.** Two days later, Andrés receives a WhatsApp from FINCAVA on behalf of Doña Esperanza: "Hola Andrés, tu pedido está siendo empacado. Te avisamos cuando esté en camino." (Trust Moment — wait period.)

**Shipping notification.** Three days after order, Doña Esperanza marks ready. Nequi captures COP 88,000. A label is generated. Andrés receives an email with the tracking number and a one-line note.

**Delivery.** Four days later, the package arrives at his apartment doorman. He picks it up that evening. Inside: two bags of coffee, a small printed card with Doña Esperanza's name, the farm name, the harvest date (14 de febrero de 2026), and a one-line note in her words. (Trust Moment — package arrival.)

**Post-delivery.** Three days later, Andrés receives an email: "¿Qué le dirías a Doña Esperanza sobre su café?" He replies with two sentences. FINCAVA forwards a translated summary via WhatsApp to Doña Esperanza.

**Out-of-stock branch.** If Andrés had arrived at the product page after stock had depleted, the page would have used the harvest-wait template (per Problem 2.4.1, Approach C). Header still leads with Doña Esperanza, the same narrative sections appear, but the buy region is replaced with the dual-option presentation (per Section 3.16): wait for her next harvest, see similar farms, or decline.

### 4.2 Farmer Journey Conceptual Flow

**Publication.** Doña Esperanza's `sellable_status` advances to PUBLISHED after compliance documentation is verified through the `managed` service mode (CC-1 tables). The Farm Biography Records admin panel surfaces her for origin story authoring. A field visit produces photos and an interview. The story is drafted (AI first draft via `ORIGIN_STORY_PROMPT`), the content producer revises, the farmer reviews via WhatsApp preview link, the farmer approves. The story transitions to `originStoryStatus = EDITED` and `published = true`. (Trust Moment — first listing.)

**First listing visible.** The product appears on the marketplace. Doña Esperanza is told this via WhatsApp: "Tu café está ahora en la tienda. Aquí está el enlace: [link]." She taps the link and sees her own page.

**First sale notification.** Two weeks later, Andrés purchases two bags. Doña Esperanza receives a WhatsApp: "Hola Doña Esperanza, tienes un nuevo pedido. Andrés de Bogotá compró 2 bolsas. Cuando esté listo para enviar, responde LISTO." (Trust Moment — first sale notification.)

**Fulfillment.** She packages the two bags. She replies LISTO over WhatsApp. FINCAVA generates the shipping label, prints it remotely (or sends to a local Servientrega office), and arranges pickup or drop-off. Doña Esperanza hands the package to the carrier.

**Payment received.** Two days after Andrés receives, Nequi notifies Doña Esperanza of an incoming transfer of COP X (her share, with FINCAVA's commission and shipping deducted). The transfer is on the day promised. (Trust Moment — first payment received.)

**Next harvest.** Doña Esperanza continues operating her farm. At mid-harvest cycle, FINCAVA sends a WhatsApp: "¿Nos mandas una foto de la cosecha?" She sends a photo and a one-line note. The content producer turns it into a marketplace post that goes out to the waitlist.

### 4.3 FINCAVA Operations Conceptual Flow

**Order received.** A retail order is created at checkout. The admin queue surfaces it. The founder reads the order email. (V1 manual fallback: every order is reviewed by the founder for the first 10–25 orders, per Finding 12.)

**Farmer notified.** The founder triggers a WhatsApp to the farmer using the "new order notification" template. The notification is logged in the `interactions` table.

**Shipping ready.** The farmer replies LISTO. The founder confirms the reply. The Wompi capture is triggered manually for the first 10–25 orders.

**Label generation.** The founder uses Servientrega's web tool to generate a label with the buyer's address and the parcel weight. (V1 manual fallback. Phase 3 designs the API integration.)

**Buyer notification.** The founder triggers an email to the buyer with the tracking number and a personal-sounding note.

**Review request.** Three days after delivery (POD or estimated), the founder triggers a review request email.

**Payment to farmer.** Two business days after delivery, the founder initiates a Nequi transfer to the farmer for their share.

This entire operational flow is manual in V1. Automation grows incrementally as each step's failure modes are observed. Trust-failure scenarios (Phase 1 Section 1.6) are managed by the founder personally for the first 10–25 orders.

### 4.4 Out-of-Stock Experience Description

The buyer arrives at a product page where `availableKg = 0` and `retailStockUnits = 0`. The page header is identical to the in-stock version: farmer name, farm name, region, farmer photo, "Visitada por FINCAVA."

Below the header, the four-section narrative is identical, with one change: the Cuándo section reads "Esta cosecha terminó. La próxima es [nextWindowStart..nextWindowEnd]" rather than the current stock count.

Below the narrative, the buy region is replaced with the dual-option panel:

> **Espera la próxima cosecha de [farmer name].** Únete a la lista de espera. Cuando esté lista, te avisamos primero.
> [Field: email or WhatsApp] [Button: Unirme]
>
> **O conoce otras fincas que coinciden con lo que buscas.**
> [Three to five supplier cards, each leading with the farmer's photo and name, with a small line of why they match: "También orgánica, también de Huila."]
>
> **Quizás luego.** [Small text link to return to the marketplace.]

Tone: calm, specific, not promotional. The buyer is given three real options without urgency.

### 4.5 Similar-Farm Recommendation Flow

The recommendation is built on the existing `buyer_matches` pattern, applied to the retail buyer's filter selections at the moment of viewing.

When the dual-option panel renders, the system performs a filter match:

- Read the buyer's current filter selections (women_led, organic, region, certifications) from session state.
- Query `products` joined to `suppliers` where `sellable_status = PUBLISHED`, `availableKg > 0`, and the selected filter attributes match.
- Rank by a simple weighted match score (each matched filter adds to the score; mismatched filters do not subtract but exclude).
- Return the top three to five.

This is filter pattern matching, not AI (per Phase 1 approved baseline #3). The `scoreBreakdown` jsonb pattern from `buyer_matches` is repurposed for explainability.

### 4.6 Trust-First Product Page Structural Description

Top to bottom, the product page:

1. **Hero band** — farmer photo (right or above on mobile), farmer name (large), farm name (medium), region (small), "Visitada por FINCAVA el [date] — [officer name]" (one line). No product name yet.

2. **Stock and price band** — "25 bolsas de 250g disponibles. COP 38,000 por bolsa." Or in the harvest-wait variant: "Próxima cosecha: [window]."

3. **Buy region** — quantity selector, address estimator, payment timing explainer ("Solo pagas cuando esté listo para enviar"), buy button. In the harvest-wait variant: dual-option panel.

4. **Quién section** — narrative, 2–3 paragraphs of farmer story (from `origin_stories.story`).

5. **Cómo section** — variety, altitude, process, drying. Bulleted facts.

6. **Cuándo section** — harvest date or window, current stock, harvest cycle context.

7. **Qué significa section** — families supported, impact line, the farmer's "in her words" quote section.

8. **Honest disclosures** — shipping zone rate, return policy, what happens if the harvest fails.

9. **Other farms you might also like** — three cards. Same farmer-led card design.

### 4.7 Mobile-First Experience Description

Andrés is on his iPhone 12. The product page renders in 2.4 seconds on Bogotá 4G. Hero image is served at 720px wide, lazy-loaded gallery follows. Touch targets are 48px (above the 44px floor). The filter chips are sticky at the top of the marketplace scroll. The checkout form uses appropriate keyboards (email field triggers email keyboard, phone field triggers numeric).

The buy button is the largest tap target on the page, positioned within thumb reach on a standard hand grip. The shipping estimator is one tap to expand. The dual-option panel (out-of-stock case) is scrollable as a single visual block; the buyer never has to choose without seeing all three options.

### 4.8 Farmer-Facing WhatsApp Interaction Templates

All templates are in Spanish, with English translations in parentheses for review by non-Spanish-speaking stakeholders. Templates are short, plain, and end with a clear action.

**Sellable status transition (NOT_READY → ELIGIBLE):**
> Hola [first name], buenas noticias: cumples los requisitos básicos para vender en FINCAVA. Lo siguiente es completar tu [next requirement, e.g., RUT]. Te ayudamos paso a paso. ¿Quieres empezar ahora? — FINCAVA
> *(Hi [first name], good news: you meet the basic requirements to sell on FINCAVA. The next step is to complete your [next requirement]. We'll help you step by step. Want to start now?)*

**New order notification:**
> Hola [first name], tienes un nuevo pedido. [Buyer first name] de [city] compró [X] bolsas de [product]. Cuando esté listo para enviar, responde LISTO. — FINCAVA
> *(Hi [first name], you have a new order. [Buyer first name] from [city] bought [X] bags of [product]. When it's ready to ship, reply READY.)*

**Stock confirmation prompt:**
> Buenos días, [first name]. ¿Cuántas bolsas tienes disponibles hoy? Responde con el número. — FINCAVA
> *(Good morning, [first name]. How many bags do you have available today? Reply with the number.)*

**Harvest update request:**
> Hola, [first name]. Las personas en lista de espera quieren saber cómo va la cosecha. ¿Nos mandas una foto y una frase corta? — FINCAVA
> *(Hi, [first name]. The people on the waitlist want to know how the harvest is going. Could you send us a photo and a short sentence?)*

**Payment confirmation:**
> [First name], hoy te transferimos COP [amount] por la venta de [X] bolsas a [buyer first name]. Revisa tu Nequi. Cualquier duda, escribe aquí. — FINCAVA
> *([First name], today we transferred COP [amount] for the sale of [X] bags to [buyer first name]. Check your Nequi. Any questions, write here.)*

**Harvest failure outreach (initiated by farmer):**
> [First name], lamentamos que esta cosecha no salió como esperabas. ¿Nos cuentas qué pasó (helada, lluvia, plaga)? Vamos a avisar con cuidado a los compradores. — FINCAVA
> *([First name], we're sorry this harvest didn't go as you hoped. Could you tell us what happened (frost, rain, pest)? We'll carefully notify the buyers.)*

### 4.9 Retail Buyer Onboarding Flow Description

Andrés' first interaction is the purchase (Section 4.1) or a waitlist signup. There is no separate onboarding step.

At checkout, he provides email, name, shipping address, payment instrument. On confirmation, an account is created implicitly via magic-link (per Section 3.17). His order is the first row in his order history.

If he returns to the platform from a different device, he enters his email; a magic link is sent; he taps the link and is signed in. No password.

If he joined a waitlist instead of purchasing, the same email field is the only field; the magic-link account is created the same way.

### 4.10 Harvest Cycle Communication Cadence

For a hypothetical six-week wait between waitlist signup and harvest readiness:

- **Day 0 (signup confirmation):** "Te confirmamos. La cosecha de [farmer name] está prevista para [window]. Te avisamos cuando esté lista." Includes unsubscribe link.

- **Day 21 (mid-cycle update):** "Así va la cosecha de [farmer name]." Photo from the farmer, one line in her voice, signed by her. Includes unsubscribe link.

- **Day 42 (at-ready conversion):** "Cosechamos el [date]. Las primeras [X] bolsas están listas. — [Farmer name]." Buy button. Includes unsubscribe link.

Three messages total. Two cadence (mid-cycle and at-ready) is the minimum that meets Phase 1 Section 1.7's "meaningful versus frustrating wait" criterion. The signup confirmation is required for opt-in clarity.

---

## SECTION 5 — TEST PHASE

The test phase defines how each prototyped solution is validated. Methods favor low-cost, manual approaches consistent with solo-founder execution.

### 5.1 Usability Validation Methods

**Concept page comprehension test.** Five buyer recruits read the landing page for one minute. They are then asked, without looking back, to describe (a) what FINCAVA is, (b) when they would pay, (c) what happens if the product is out of stock. Pass criterion: four of five describe all three correctly.

**Product page first-impression test.** Five buyer recruits view a product page for thirty seconds. They are asked: (a) who grew this, (b) is it in stock, (c) how much does it cost. Pass criterion: five of five answer all three correctly.

**Out-of-stock dual-option comprehension.** Five buyer recruits view the dual-option panel. They are asked to choose one option and explain why. Pass criterion: zero confusion about what each option does. Each option chosen by at least one recruit (the three options must all feel viable to someone).

**Checkout completion under sixty seconds.** Five returning buyer recruits complete a purchase from the product page. Pass criterion: median time under sixty seconds, no recruit takes more than ninety seconds.

### 5.2 Farmer Onboarding Validation

**Claim flow with three real farmers.** Three farmers from the Café Fest Villa de Leyva cohort attempt the WhatsApp-initiated, web-completed claim flow with field officer support nearby but not actively guiding. Pass criterion: all three complete within thirty minutes of starting. Any farmer who cannot complete falls back to the in-person manual flow (Approach C) and the failure mode is recorded.

**Sellable status legibility test.** Three farmers read the Spanish status names ("Estamos conociendo tu finca," "Cumples los requisitos básicos," "Listo para vender," "Publicada en el mercado") and the next-step sentences. They are asked to explain what state they are in and what they need to do next. Pass criterion: three of three explain correctly without help.

**Stock confirmation WhatsApp tool.** Three PUBLISHED farmers receive the daily stock confirmation prompt for two weeks. Pass criterion: response rate above 60%; no farmer reports the prompt as annoying when interviewed at end of period.

**WhatsApp template clarity.** Five WhatsApp templates (new order, stock prompt, harvest update request, payment confirmation, status transition) are reviewed by three farmers and two Colombian-Spanish copy reviewers. Pass criterion: every reviewer rates each template as "clear" or "very clear"; no template requires the reader to ask for clarification.

### 5.3 Buyer Trust Validation

**Payment-at-shipping comprehension.** Ten buyer recruits read the one-sentence payment timing explainer at checkout ("Tu pago se autoriza ahora y se cobra solo cuando [farmer name] tenga listo tu pedido"). They are asked: (a) when will money leave your account, (b) what happens if the farmer never ships. Pass criterion: nine of ten answer (a) correctly; eight of ten answer (b) with "I get a refund" or equivalent.

**Verification signal interpretation.** Ten buyer recruits view a supplier profile that shows "Visitada por FINCAVA el 14 de marzo de 2026 — Diana Martínez." They are asked: (a) what does this tell you, (b) how confident are you that this farmer is real. Pass criterion: ten of ten interpret the line correctly; median confidence rating above 4 on a 5-point scale.

**Dual-option presentation as introduction, not substitute.** Ten buyer recruits land on an out-of-stock product (Doña Esperanza) and see the dual-option panel. They are asked to describe the experience. Pass criterion: no recruit uses words like "substitute," "downgrade," or "second choice"; at least three recruits use language like "introduction" or "new farmer to consider."

**Graceful exit confidence.** Ten buyer recruits are shown the unsubscribe link in a waitlist confirmation. They are asked: how easy is it to leave. Pass criterion: ten of ten rate it 5 of 5 on a "very easy" scale.

### 5.4 Shipping Expectation Validation

**Zone-based pricing transparency.** Five buyer recruits use the shipping estimator and view the resulting price. They are asked: (a) does this seem fair, (b) do you understand why this is the cost. Pass criterion: four of five rate it fair or better; four of five can articulate that the cost is based on origin-to-destination distance.

**Variance disclosure comprehension.** Five buyer recruits read the disclosure that FINCAVA absorbs variance between the zone rate and the actual carrier cost. They are asked: do you trust this. Pass criterion: four of five report increased trust as a result of the disclosure.

**Delivery window comprehension.** Five buyer recruits complete a checkout where the delivery window is shown as "3–7 días hábiles desde que [farmer] tenga listo el pedido." They are asked: (a) when will you receive the package, (b) is this acceptable. Pass criterion: five of five describe the two-stage window correctly (wait for ready, then 3–7 days); four of five rate acceptability above 3 of 5.

### 5.5 Trust-Commerce Adoption Metrics — First 90 Days Post-Launch

The first 90 days post-launch are managed with the assumption that the first 10–25 orders are operationally manual (per Finding 12). Metrics in this period are validation indicators, not growth targets.

**Volume metrics:**

- Number of unique retail buyers who completed a purchase (target: ≥ 25)
- Number of orders fulfilled (target: ≥ 35; some buyers reorder)
- Number of waitlist signups (target: ≥ 50)
- Number of farmers with at least one retail order (target: ≥ 3 of the published cohort)

**Trust metrics:**

- Number of payment authorizations completed without buyer abandonment (target: ≥ 80% of started checkouts)
- Number of orders fulfilled within promised window (target: ≥ 90%)
- Number of harvest failures handled without buyer complaint escalation (target: 100%)
- Number of buyer-initiated unsubscribes from any list (target: ≤ 15%, not a growth signal but a friction signal — high unsubscribes mean the cadence is wrong, low unsubscribes mean the cadence works)

**Repeat metrics:**

- Number of buyers who placed a second order within 90 days (target: ≥ 30%)
- Number of waitlist members who converted on at-ready (target: ≥ 25% per conversion email)
- Net Promoter Score from post-delivery survey (target: ≥ 50)

**Operational metrics:**

- Median time from order placement to farmer notification (target: ≤ 1 hour in V1 manual mode)
- Median time from farmer ready to label generated (target: ≤ 4 hours in V1)
- Median time from delivery to farmer payment (target: ≤ 2 business days)

These metrics inform the decision to automate each manual fallback. A metric consistently below target indicates either the manual capacity is insufficient (automate that step) or the design is wrong (revisit ideation).

### 5.6 Success Criteria Mapped to Phase 1 Problems

Each Phase 1 problem's success criterion maps to a specific test method above.

| Phase 1 problem | Success criterion summary | Test method |
|---|---|---|
| 2.1.1 (retail buyer profile) | Retail buyer registers without B2B fields | Onboarding flow walkthrough with 5 buyers |
| 2.1.2 (retail order vocabulary) | Retail order creates, pays, fulfills with parcel statuses | End-to-end order completion test, V1 manual |
| 2.1.3 (payment at shipping) | Authorize at checkout, capture at ready, refund on SLA | Payment-at-shipping comprehension (Section 5.3) + Wompi sandbox test |
| 2.1.4 (harvest cycle structural) | Stock zero surfaces next-harvest, waitlist conversion on replenishment | Harvest cycle communication cadence test (Section 5.4) |
| 2.2.1 (translation layer staffing) | Cadence of one farmer per two weeks | Calendar review at 30, 60, 90 days |
| 2.2.2 (sellable_status legibility) | Farmer explains current state and next step | Sellable status legibility test (Section 5.2) |
| 2.2.3 (shipping cost variance) | Zone-based table within 10% of actual carrier cost | Quarterly carrier-invoice reconciliation |
| 2.2.4 (retail SKU) | Single product carries B2B bulk + retail unit pricing | Product page render test, both views |
| 2.3.1 (stock counts can lie) | Channel exclusivity or daily WhatsApp tool maintains accuracy | Stock confirmation WhatsApp tool test (Section 5.2) |
| 2.3.2 (harvest precision) | Date ranges with disclaimer, waitlist on actual harvest | Harvest cycle test (Section 5.4) |
| 2.3.3 (platform economics) | Transparency page accessible from footer | Transparency page comprehension review with 5 buyers |
| 2.4.1 (in-stock vs harvest-wait) | Explicit labeling at every step | Product page first-impression test (Section 5.1) |
| 2.4.2 (verify farmer is real) | "Visitada por FINCAVA" signal interpretable | Verification signal interpretation (Section 5.3) |
| 2.4.3 (graceful exit) | One-click unsubscribe, 7-day account deletion | Graceful exit confidence test (Section 5.3) |
| 2.5.1 (documentation gates) | Every NOT_READY farmer has assigned managed service case | Cohort tracking by sellable_status at 30, 60, 90 days |
| 2.5.2 (claim flow literacy) | WhatsApp + web flow completable with shared device | Claim flow test with 3 farmers (Section 5.2) |
| 2.5.3 (demand signals to farmer) | Monthly WhatsApp digest with one recommendation | Demand digest delivered to 5 farmers; interview at 30 days |
| 2.6.1 (farmer reality vs buyer copy) | Dual-voice presentation with farmer review | Origin story authoring session walkthrough + farmer approval recording |
| 2.6.2 (content production rate) | Half-day per farmer with AI assistance | Time tracking per farmer over first 10 publications |
| 2.7.1 (harvest-alignment) | Conversions triggered by stock replenishment | End-to-end waitlist conversion test |
| 2.8.1 (domestic shipping transparency) | Buyer sees actual zone rate at checkout | Zone-based pricing transparency test (Section 5.4) |

### 5.7 Test Sequencing

Tests run in three sequential cohorts.

**Cohort 1 — Pre-launch (weeks 1–4):**
- Concept page comprehension
- Product page first-impression
- Payment-at-shipping comprehension
- Verification signal interpretation
- Graceful exit confidence
- Sellable status legibility (with three farmers)
- WhatsApp template clarity (with three farmers, two copy reviewers)

**Cohort 2 — Soft launch (weeks 5–8):**
- Checkout completion under sixty seconds (with returning recruits)
- Out-of-stock dual-option comprehension
- Dual-option as introduction not substitute
- Claim flow with three real farmers
- Stock confirmation WhatsApp tool (two-week run)
- Zone-based pricing transparency
- Variance disclosure comprehension
- Delivery window comprehension

**Cohort 3 — Public launch (weeks 9–13, the 90-day metric window begins):**
- All adoption metrics tracked continuously
- Quarterly reconciliation of zone rates against carrier invoices
- 30-, 60-, 90-day cohort analysis on farmer sellable_status progression
- Time tracking on origin story content production
- Monthly review of harvest cycle communication metrics (open rates, conversion rates)

### 5.8 Manual Fallback Approaches for V1

Solo-founder execution requires explicit manual fallbacks at every step that has not been automated.

**Order processing.** First 10–25 orders: founder reviews each order email, manually authorizes payment in Wompi dashboard, manually triggers WhatsApp to farmer, manually captures payment on ready, manually generates label on a courier web tool, manually notifies buyer.

**Stock updates.** First two weeks: founder personally messages each PUBLISHED farmer daily for stock confirmation. Failure rate informs decision to build the WhatsApp template automation.

**Origin story production.** First ten publications: founder is the field officer, photographer, interviewer, and content producer. Contractor is engaged only when the founder's calendar is fully booked.

**Compliance managed-service cases.** First twenty cases: founder is the assigned staff for every case. Field officer or contractor support introduced only as needed.

**Harvest failure handling.** First instance: founder personally calls the affected farmer, drafts the buyer notification in the farmer's voice, sends the dual-option panel email manually. The failure is the test case for the structural workflow.

**Buyer support.** All buyer inquiries in the first 90 days are answered personally by the founder, in Spanish, within 4 hours. Response template library is built from the first 25 inquiries.

The manual fallback posture is not failure-mode; it is the V1 operating model. Automation is introduced one step at a time, in the order that the manual workload becomes unsustainable.

---

## 6. Phase 2 Conclusions and Recommendations

### 6.1 Conclusions

The retail Trust Commerce launch is feasible on the existing FINCAVA platform with additive schema changes and a deliberate manual-first operating posture. The Phase 1 problems decompose into solvable ideation paths, the existing platform provides material structural starting points (the buyer-intent flow, the CC-1 compliance family, the `buyer_matches` ranking pattern, the WhatsApp send primitive, the Farm Biography Records admin panel, the AI prompt service ecosystem), and the gaps are well-bounded (retail buyer profile, retail order vocabulary, payment gateway, retail SKU columns, harvest cycle expressiveness, transparency surfaces).

The single largest gap is not technical. It is content production capacity. Catalog growth is limited by the rate at which farmers can be onboarded, photographed, interviewed, and translated into honest Spanish marketplace presence. The recommended cadence of one farmer per two weeks (rising to one per week) is the operational ceiling for V1 and V2.

The second-largest gap is operational maturity. The platform has zero live transactions of any kind. The retail flow may be the first live transactional channel. Every transactional flow should be treated as unproven and manually piloted before being automated.

### 6.2 Recommendations

1. **Adopt the additive schema posture.** New tables (`retail_buyer_profiles`, `retail_order_details`, optionally `product_skus` later, `payment_transactions`) and new nullable columns on existing tables (`products` retail fields, `origin_stories.farmerApprovedAt`, `suppliers` waitlist counters). Do not alter existing B2B vocabulary.

2. **Pilot with three farmers and twenty-five buyers.** The first 90 days post-launch are a validation cohort, not a growth cohort.

3. **Run the operating model manually for the first 10–25 orders.** Automate after observing failure modes.

4. **Establish the Farm Biography Records authoring workflow as the rate-limiting discipline.** Templates, shot list, interview questions, AI-assisted first draft, farmer review, content producer revision, founder approval. Document the workflow as a living operations memo.

5. **Make `sellable_status` legible to the farmer in Spanish on WhatsApp.** This is the single highest-leverage trust intervention with the farmer cohort.

6. **Establish the Wompi authorize-now, capture-on-ready pattern as the canonical retail payment lifecycle.** Manual capture in V1. Automate after the first 25 captures.

7. **Build the dual-option out-of-stock panel as the canonical out-of-stock experience.** It is the design surface that most directly operationalizes Phase 1's trust posture.

8. **Treat the harvest cycle as a first-class structural concept**, starting with the minimal extension of `suppliers.harvestMonths` and `products.nextWindowStart/End`, evolving toward `product_harvest_windows` when the first multi-cycle crop is published.

---

## 7. Phase 2 to Phase 3 Handoff

Phase 3 is the Implementation phase. It is not covered in this document. The handoff to Phase 3 consists of the following inputs.

**Inputs to Phase 3:**

- Phase 1 Empathy + Define document (`FINCAVA_DesignThinking_Phase1_EmpathyDefine.md`)
- This Phase 2 Ideate + Prototype + Test document
- The twelve grounding findings (Section 0.3 above)
- The existing FINCAVA codebase

**Phase 3 produces:**

- Schema migrations for the additive retail layer
- Drizzle schema files for `retail_buyer_profiles`, `retail_order_details` (or equivalent per the approach selected), `payment_transactions`, optional `product_skus`
- Nullable column additions to `products`, `origin_stories`, `suppliers`
- Wompi integration service (authorize, capture, refund, webhook handler)
- Magic-link authentication for retail buyers
- Marketplace storefront UI (Spanish-first)
- Farm Biography Records refinements (side-by-side authoring, farmer approval trigger)
- WhatsApp template definitions and admin triggers
- Zone-based shipping table and admin UI
- Transparency page and per-supplier transparency line
- Manual operations runbook for the founder for the first 90 days

**Phase 3 sequencing recommendation:**

- Sprint 0: schema migrations, Wompi sandbox integration, magic-link auth
- Sprint 1: marketplace storefront with in-stock and harvest-wait variants
- Sprint 2: checkout, payment authorization, order management
- Sprint 3: Farm Biography Records refinements, WhatsApp template integration
- Sprint 4: dual-option out-of-stock panel, waitlist machinery
- Sprint 5: transparency page, shipping estimator, harvest cycle communication

Each sprint produces a deployable increment. After sprint 5, the platform is in soft-launch posture and the test cohorts above begin.

---

## 8. Risks and Unknowns

**Risk: Wompi authorize/capture behavior varies by instrument.** Nequi may settle immediately; PSE may require redirect; cards may support full authorize/capture cleanly. The actual behavior is unknown until Wompi sandbox testing. Phase 3 must validate per instrument and document fallback behavior.

**Risk: Carrier API quality.** Servientrega and Coordinadora APIs are reportedly inconsistent. The V1 manual fallback (admin generates labels on the courier web tool) mitigates the risk, but Phase 3 should pilot the API integration with a small order subset.

**Risk: Farmer WhatsApp response latency.** The new order notification assumes the farmer responds LISTO within a reasonable window. Real response times may be hours or days. The trust-failure scenario for unresponsive farmers (Phase 1 Section 1.6 (d)) must be operationally tested early.

**Risk: Content production capacity.** One farmer per two weeks is an estimate. Real cadence may be slower. The retail catalog ceiling is sensitive to this rate.

**Risk: Harvest failure frequency.** The first harvest failure handling event is the test case for the entire trust posture. The unknown is whether the founder can execute the dual-option exit gracefully and quickly enough to preserve buyer trust.

**Risk: Stock drift between channels.** Approach A (designated FINCAVA-channel stock) requires farmer discipline. Drift is possible. The first incident of oversold stock will inform whether the discipline holds.

**Risk: Magic-link adoption.** Magic links eliminate password friction but assume buyers can receive email in real time at checkout. Mobile email apps with delayed delivery may break the flow. Phase 3 will need a fallback OTP. Magic-link-only is acceptable for desktop checkout where email delivery is reliable. For mobile checkout on 4G, an OTP delivered by SMS via the existing Twilio primitive (`lib/whatsapp.ts` wrapper covers SMS) is the required fallback path.

**Unknown: Real exchange rate exposure.** Wompi settles in COP. If the buyer pays in COP and the carrier and farmer payments are in COP, FINCAVA's exposure is minimal. International expansion changes this materially.

**Unknown: Tax and electronic invoicing burden.** DIAN electronic invoicing for retail e-commerce has specific obligations. Phase 3 must address.

**Unknown: Buyer-side language preference enforcement.** Phase 2 (Phase 1 of this document; the design series) addresses this only via the language preference column, not via locale routing.

---

## 9. International Expansion (Forward-Looking — Flag Only)

This section flag-plants commitments that Phase 1 decisions in this document must not foreclose. International expansion is not designed here; it is Commercial Phase II (FINCAVA's international launch roadmap).

**Payment.** Stripe is the international payment path (per Phase 1 Section 10). The retail order data model should be currency-aware (currency column on the order, prices stored in cents). The payment_transactions ledger should be gateway-agnostic.

**Shipping.** Direct international shipping at COP-converted cost is not viable. The path is a Miami-based consolidation 3PL (first), Madrid (second), Dubai or Singapore (third). The retail SKU data model should carry weight and dimensions sufficient for international shipping computation (`retailUnitWeightG` covers weight; dimensions are to be added in Phase 3).

**Addressing.** Retail buyer profile should not hard-code Colombian addressing fields. `shippingDepartment` is Colombia-specific; an `addressLine1`, `addressLine2`, `city`, `region`, `postalCode`, `countryCode` shape is more portable.

**Compliance.** Food import compliance applies at Commercial Phase II (FDA Prior Notice for US, EU food import, HS codes, commercial invoice, packing list). The compliance family is the structural extension point.

**Tax.** International tax (sales tax for US, VAT for EU) requires gateway and accounting integration. Out of scope for this document.

---

## 10. Implementation Priorities for the First 90 Days Post-Phase 2 Approval

This is a prioritized list. Not implementation specs. Phase 3 produces specs.

**Highest priority (weeks 1–4):**

1. Retail buyer profile schema (Problem 2.1.1, Approach A).
2. Retail order schema with hybrid pattern (Problem 2.1.2, Approach C). Include a `currency` column from the start (default `'COP'` for V1); store all monetary amounts as integers in the smallest currency unit (centavos). This ensures Commercial Phase II (international expansion) requires no migration to add currency awareness — a Phase 1 decision that must not be foreclosed (per Section 9).
3. Wompi sandbox integration: authorize, capture, refund (Problem 2.1.3, Approach A).
4. Retail SKU columns on `products` (Problem 2.2.4, Approach A).
5. Sellable status WhatsApp transition messages (Problem 2.2.2, Approach C).
6. Farm Biography Records side-by-side authoring view (Problem 2.6.1, Approach A).

**Mid priority (weeks 5–8):**

7. Marketplace storefront with in-stock and harvest-wait templates (Problem 2.4.1, Approach C).
8. Trust-first product page (Section 3.13 narrative arc).
9. Dual-option out-of-stock panel (Section 3.16).
10. Magic-link retail buyer onboarding (Section 3.17, Approach C).
11. Zone-based shipping table and admin UI (Problems 2.2.3 and 2.8.1).
12. Harvest cycle minimal extension (`nextWindowStart`, `nextWindowEnd`) (Problem 2.1.4, Approach A).
13. "Visitada por FINCAVA" verification signal (Problem 2.4.2, Approach C).
14. Transparency page (Problem 2.3.3, Approach A).

**Lower priority (weeks 9–13):**

15. Waitlist mid-cycle and at-ready cadence (Section 3.12, Section 4.10).
16. WhatsApp template library wired to admin triggers (Section 4.8).
17. Stock confirmation WhatsApp tool (Problem 2.3.1, Approach A; B as fallback).
18. Monthly demand digest to farmers (Problem 2.5.3, Approach A).
19. Origin story farmer approval trigger (Section 3.18).
20. Review request flow (Section 3.10).

**Manual operations runbook (continuous):**

- The first 10–25 orders are admin-in-the-loop, end-to-end.
- Origin story production: founder is field officer, content producer, reviewer.
- Compliance managed-service cases: founder is assigned staff.
- Buyer support: founder responds within 4 hours, in Spanish.

---

*End of Design Thinking Phase 2 document. Phase 3 (Implementation) begins on approval of this document.*

---

## Document Revision Log

**v2 (May 2026):** Six targeted refinements applied to the approved v1 draft. (1) Approach 0 (current state) framing added to Section 3.3.1 (stock counts — `products.availableKg` as the unproven starting point) and Section 3.5.2 (claim flow — existing `POST /api/admin/ingestion/claim` endpoint and `claim_status` enum) for consistency with the Approach 0 convention established in Section 3.1.2. (2) Waitlist conversion trigger mechanism made explicit in Section 3.7 — end-to-end flow from farmer WhatsApp stock update through admin increment through conversion email fire, with the harvest-failure dual-option exit triggered if the expected window passes without replenishment. (3) Visual hierarchy specified for the verification signal recommendation in Section 3.4.2 — "Visitada por FINCAVA" as headline-weight human typography, compliance badges as quiet secondary elements below the fold, preserving the "friend's introduction, not a regulatory stamp" quality. (4) Magic-link OTP fallback elevated from contingency to launch requirement in Section 3.17 (Approach C recommendation updated to "magic link with SMS OTP fallback") and in Section 8 (risk entry updated to specify SMS OTP via existing Twilio primitive as required for mobile 4G checkout). (5) Currency column added as a first-priority schema requirement in Section 10 item 2 — `currency` column defaulting to `'COP'` and amounts stored as centavos integers from day one, so Commercial Phase II requires no migration. (6) Three-way "Phase 2" collision resolved in Section 9 — FINCAVA's international expansion roadmap renamed "Commercial Phase II (FINCAVA's international launch roadmap)" throughout, leaving only two "Phase 2" usages in the document ("Design Thinking Phase 2" and "Buyer Onboarding P2 (B2B)"), both already disambiguated in Section 0.2.

---

## Document Revision Log

**v2 (May 2026):** Six corrections applied based on codebase reconnaissance. See v2 for full log.

**v2.1 (May 2026):** Four corrections applied based on codebase verification and product decisions made after v2 was published.
(1) feeStatus enum values corrected to WAIVED | PENDING | INVOICED | PAID — COLLECTED and EXEMPT do not exist in code.
(2) Buyer intent route path corrected to POST /api/orders/buyer/intent — verified against routes/orders.ts.
(3) fee-service.ts module path corrected to artifacts/api-server/src/services/fee-service.ts.
(4) Bilingual posture corrected: ES + EN both ship at V1 because retail surfaces inherit the existing B2B platform's LanguageProvider. Farmer-facing surfaces, admin console, and farmer WhatsApp templates remain Spanish-only. Commercial Phase II list updated: English UI surfaces removed (now V1).
No other content changes. v2 is archived as prior version.
