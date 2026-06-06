# FINCAVA Trust Commerce Retail Expansion
## Design Thinking Document — Phase 1 of 2: Empathy + Define

**Document Status:** Working draft, Phase 1 of 2
**Scope:** Colombian domestic retail launch only. International expansion appears only as a forward-looking consideration, not as a designed flow.
**Date:** May 2026
**Audience:** Product, UX, operations, engineering, content, and AI-assisted development teams.

---

## 0. Platform State of Play

Before any empathy or definition work, the team must hold an accurate picture of the platform as it actually exists today. The retail layer is being added to a structurally extensive platform that has not yet processed a real transaction.

### What is already built

The FINCAVA platform runs on Replit with Express, Drizzle ORM, PostgreSQL, and React. The database contains 52 tables organized around a B2B sourcing architecture with the following live components.

**Identity and access.** Five user roles exist: BUYER, SUPPLIER, ADMIN, FIELD_OFFICER, and EMPLOYEE. Authentication, email verification, and password reset flows are operational.

**Two parallel entity models for the seller side.** The platform maintains both `companies` (B2B exporter accounts with user logins, subscription tiers, trust scores, export destinations) and `suppliers` (field-collected farmer records with WhatsApp numbers, municipal and veredal location data, consent tracking, and an ingestion provenance). Products link primarily to `companies`. Farmers in the field exist as `suppliers` and may or may not have a corresponding `users` login.

**A sellable-state machine for marketplace visibility.** Every supplier moves through `NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED → INACTIVE`. Only suppliers in `PUBLISHED` state appear in the marketplace. At time of this document, one supplier (Hacienda Cauca Organic) holds `PUBLISHED` status.

**A graduation pathway classification.** Suppliers are assigned a pathway A, B, C, or D based on AI-assessed export readiness. The four lowest-readiness suppliers currently in the system sit in pathway D.

**An AI evaluation pipeline.** Claude Haiku 4.5 produces `ONBOARD_SCORE` evaluations with export readiness scores. Claude Sonnet 4.6 produces `DOCUMENT_GENERATION` outputs (compliance documents, WhatsApp messages, gap analyses). The pipeline runs against `suppliers` and writes to `ai_outputs`.

**Origin Stories infrastructure.** A dedicated `origin_stories` table holds farmer photos, farm names, region, elevation, farm size in hectares, years farming, narrative, challenges, impact, and images per supplier or product. One origin story is currently published.

**Product catalog with retail-relevant attributes already present.** The `products` table holds `women_led`, `smallholder`, `direct_trade`, `climate_resilient`, `organic`, `farm_name`, `farmer_name`, `farm_lat`, `farm_lng`, `harvest_date`, `harvest_season`, `available_kg`, `origin_story`, and `families_supported`. The filter vocabulary the Trust Commerce model depends on is already in the schema.

**Order and shipment data models.** Orders progress through `INQUIRY → SAMPLE_REQUESTED → QUOTED → CONFIRMED → IN_PRODUCTION → SHIPPED → DELIVERED → COMPLETED → CANCELLED`. Shipments track origin port, destination port, carrier, tracking number, container number, ETA, departure, and arrival. The current vocabulary is B2B export (ports, containers, incoterms, FOB defaults), not retail parcel.

**Buyer profile architecture.** A `buyer_profiles` table holds extensive B2B buyer attributes — target products, destination port, intended volume, import frequency, certifications required, audit standards, logistics partner, trade finance status, and a P2 (Phase 2) approval workflow. No retail buyer profile structure exists.

**Compliance engine.** `compliance_documents_v2`, `compliance_requirements`, `compliance_enablement_flows`, and `admin_compliance_reviews` together implement a compliance management workflow tied to supplier eligibility.

**Managed service cases.** `managed_service_cases` records when FINCAVA staff are assigned to help a supplier complete a specific compliance requirement, with consent records and fee status. This is the manual translation and support layer in operational form.

**Ingestion infrastructure.** `supplier_ingestion_batches`, `supplier_contacts`, `product_placeholders`, and supplier `claim_status` (UNCLAIMED, etc.) allow admins to add suppliers from field collection, social media, or other sources before those suppliers have any login or self-managed presence.

**RFQs, inquiries, messages, reviews, trust scores.** These tables exist but hold zero or near-zero rows. The B2B flow is structurally complete but has not been transactionally exercised.

### What is not yet operational

There are zero orders, zero order_items, zero inquiries, zero RFQs, zero RFQ responses, zero buyer_profiles, zero buyer_matches, zero shipments, zero reviews, zero compliance_documents_v2 records, and zero managed_service_cases. The platform has nine products, four suppliers, two farms, one origin story, ten users (of whom only Carlos at cafehuilas.co has verified email), six AI outputs, and four supplier evaluations.

### What this means for the retail layer

The retail Trust Commerce launch is not, strictly speaking, an extension of a working B2B platform. It is being added to a structurally complete B2B platform that has not yet completed a single live transaction. The B2B flow may complete its first real transaction before, after, or in parallel with the retail launch.

This reframes the work. The retail layer is not a small additive feature on a busy marketplace; it may become FINCAVA's first live transactional channel of any kind. The Trust Commerce flow may therefore be the platform's introduction to real buyers, real money, and real shipping — not a sideline.

### Approved baselines carried forward from prior work

1. Payment occurs at shipping readiness, not at order placement or waitlist signup.
2. Out-of-stock flow presents two options to the buyer (choose one, the other, or both): restock notification and similar farms matching the buyer's own filter selections. A decline option always exits gracefully.
3. Similar-farm matching uses the buyer's own declared filter selections via SQL-level pattern matching, not an autonomous AI agent.
4. Waitlist activates only when a product is out of stock, never upfront.
5. No harvest equals no transaction. If a harvest fails, the consumer is informed and offered alternative farms.

These baselines are inputs to the empathy and definition work that follows. They are not open for redesign.

---

## 1. Empathy Phase

The empathy phase establishes the lived realities of the three actors at the heart of FINCAVA Trust Commerce. Each persona is grounded in either the database state above or the Café Fest fieldwork in Villa de Leyva.

### 1.1 The Farmer Persona — Doña Esperanza Villamil

Doña Esperanza Villamil is composite-real. She represents the kind of farmer already in the FINCAVA database — women-led, smallholder, organic, direct-trade, growing washed Castillo coffee at Finca Cacao Verde in Huila with an October-to-December primary harvest. Her sellable status today is `NOT_READY` because her compliance documentation is incomplete and her AI-assessed export readiness score sits in pathway D. She is not yet visible in any marketplace.

**Day in her life.** She wakes before dawn. She walks ten minutes from her house to her plot. She inspects cherries, talks to two seasonal pickers, weighs the morning's collection, runs water through the washing station her cooperative shares. In the afternoon she drives forty minutes to the nearest town to deliver coffee to a local roaster who buys at COP rates that have not changed in two years. On Sundays she sells small bags of her own roast at a regional market, where buyers come from Bogotá and sometimes from abroad. She does not have a website. Her WhatsApp is her storefront. Her phone has intermittent signal at the farm.

**Emotional drivers.** Pride in coffee quality. Concern for her two children's education. A specific pride in being a woman who farms her own land, in a region where most farms are inherited father-to-son. A growing desire to be known by name to the people who drink her coffee, not just by the broker who buys it.

**Motivations.** Higher price per kilogram for the same coffee. A way to tell her story without being filtered through a buyer's marketing copy. Income that does not depend on a single domestic buyer's mood. A path her daughter could see and aspire to.

**Fears.** That the platform will ask for too much paperwork. That her phone will not be able to handle the platform. That a foreign buyer will pay and she will not be able to deliver because her harvest failed. That her coffee will be misrepresented and her name attached to a product she did not produce. That the platform will charge her fees she cannot understand. That she will be embarrassed in front of her cooperative if she fails.

**Frustrations.** Every existing export-readiness program treats her as a problem to be fixed rather than a producer to be supported. The local middleman pays her less than half of what her coffee retails for in Bogotá. The Spanish in most agricultural apps is technical and unfamiliar. Her elder daughter has explained Mercado Libre to her three times, and she still does not trust it.

**Operational realities.** Connectivity at the farm is intermittent. WhatsApp works. Smartphones are shared in her household. She reads Spanish but does not write English. Her literacy is functional but not fast. She does not have a credit card. She has a Bancolombia account and uses Nequi. She does not have a separate business identity registered with DIAN. The cooperative has a RUT but she does not personally. She has never shipped anything outside her department by a national carrier; her coffee leaves her hands either to the local buyer or in person at a market.

**Where Doña Esperanza meets the FINCAVA platform today.** She would enter the platform as a `supplier` record, typed FARMER, with WhatsApp number, municipio (Pitalito), department (Huila), `ingestion_source = FIELD_COLLECTED`, `claim_status = UNCLAIMED` until she completes the claim flow. She would be onboarded by a FIELD_OFFICER. Her sellable_status would begin at NOT_READY. To reach PUBLISHED — the state required to sell to retail buyers — she must pass through the eligibility evaluation, the compliance documentation flow, and a state transition to SELLABLE and then PUBLISHED. None of that has been redesigned in this document; it is the existing pipeline she traverses before retail enters her life.

### 1.2 The Domestic Buyer Persona — Andrés Mejía

Andrés Mejía is a 34-year-old creative director living in Chapinero, Bogotá. He earns about COP 9 million per month. He drinks specialty coffee daily. He follows three Colombian roasters on Instagram and has been to two Café Fest events. He cares where his food comes from and reads ingredient lists. He pays for things with Nequi on his phone or with a Bancolombia card. He has bought small-batch coffee directly from farmers at fairs and has paid by Nequi transfer in person, with a paper receipt scribbled on a market bag.

**Day in his life.** He works from a co-working space and from home. He buys coffee for himself and for an office of twelve. He has a partner, a dog, and a habit of supporting things that feel real. He spent COP 240,000 on a coffee subscription from a Bogotá roaster last year before canceling because the curation felt anonymous. He follows two cacao producers on Instagram who post photos of their farms.

**Emotional drivers.** Wanting to participate in something honest. Wanting to give his money to a person rather than a brand. A particular pleasure in knowing the name of the farmer whose coffee he is drinking. Quietly resenting the way most "specialty" Colombian coffee is marketed in Colombia — by foreign-sounding brands that obscure the producer.

**Motivations.** To find producers whose values match his own (women-led, smallholder, organic, climate-resilient — values that are, not coincidentally, already filter attributes in the FINCAVA schema). To pay a price he knows benefits the producer. To support a market that does not collapse small farms into anonymous lots.

**Fears.** That he will pay and the product will not arrive. That the product will arrive damaged. That he will become the kind of consumer who treats farmers as content. That the platform will turn into Mercado Libre in two years. That the "story" of the farm is marketing rather than truth.

**Frustrations.** Most direct-from-farm Colombian products are difficult to find online. Payment in person at fairs is great but he cannot replicate it from his couch. Shipping in Colombia is reliable but tracking is poor. The few specialty platforms he has tried use English-first interfaces and pricing in USD even when they are Colombian companies.

**Operational realities.** He pays in COP via Nequi (preferred), PSE (sometimes), or Bancolombia card (least often). He reads Spanish primarily. He owns an iPhone and a laptop. His apartment has a doorman who receives packages. He buys coffee in 250g and 500g bags. He does not need same-day delivery; three to five business days is acceptable. He has accepted longer waits when the producer has been transparent about why.

**Where Andrés Mejía meets the FINCAVA platform today.** There is no schema for him. The existing `buyer_profiles` table is designed for B2B importers asking about destination ports, audit standards, and trade finance. A retail buyer like Andrés has no place to live in the data model. He would today have to be registered as a generic `users` row with role BUYER, with no profile structure that fits him. This is the most consequential schema-level absence in the platform.

### 1.3 The FINCAVA Persona — Trust Commerce Orchestrator

FINCAVA is not Amazon. FINCAVA is not Mercado Libre. FINCAVA most closely resembles a farmers' market with a global storefront — relationships and stories matter as much as transactions. The platform itself behaves as a persona with its own emotional contract.

**Role.** FINCAVA bridges farmer production reality and buyer trust expectations. It does this through content translation, transparent inventory display, payment timing aligned to shipping readiness, and graceful handling of harvest failures. It is operated by a solo founder with selective contractor support, working in Replit with AI-assisted development.

**Operational stance.** FINCAVA does not hold inventory in Phase 1. It does not warehouse, pre-position, or pre-ship. It surfaces what is real on the farm at the moment of viewing. It commits to a buyer only when the farmer commits to a ready-to-ship product. It carries the farmer's voice without overwriting it.

**What FINCAVA is not.** Not a fast-commerce platform. Not a marketing scarcity tool. Not an inventory-bearing reseller. Not a generic e-commerce site with farm photos on top. Not a logistics company. Not a roaster. Not a curator imposing taste judgments on the farmers in its network.

**The two-sided trust contract.** FINCAVA must hold the farmer's trust (we will not exploit you, we will represent you accurately, we will only commit your harvest when you say it is ready) and the buyer's trust (we will not take your money for a product that does not exist, we will tell you the truth about when it will ship, we will give you a graceful exit) simultaneously. These are not the same trust. They use different language, different signals, different proof.

### 1.4 Journey Maps

**Farmer journey — from invisible to PUBLISHED to first sale.**

A field officer meets Doña Esperanza at a Café Fest or a cooperative meeting. She gives WhatsApp-based consent to be added. She is created as a `suppliers` row with `ingestion_source = FIELD_COLLECTED`, `claim_status = UNCLAIMED`, sellable_status NOT_READY. The field officer collects basic data — name, WhatsApp, municipio, vereda, primary crop, harvest months, farm size, years farming, photos. The AI pipeline produces an export readiness score of 32 and a pathway D classification. The compliance documentation gap analysis flags missing RUT, missing food handler certificate, and missing INVIMA registration. A managed service case is opened to assist her with documentation. Three months later, those documents are complete. Her sellable_status advances to ELIGIBLE, then SELLABLE on admin review, then PUBLISHED. Her origin story is authored — photos taken on a field visit, a story written from a one-hour interview translated into Spanish marketplace copy. Her first product is posted: 250g bag of washed Castillo, COP 38,000, available_kg = 25 (matching her actual ready-to-ship stock). Within two weeks Andrés Mejía buys two bags. She is notified by WhatsApp that an order is ready to be packed. She packs, hands to a Servientrega driver, and is paid two days after the buyer receives.

The retail layer enters this journey only in the final stretch — after PUBLISHED, after origin story authoring, after the first retail product is posted. The retail layer is invisible to the farmer from NOT_READY through ELIGIBLE; she lives inside the existing compliance and supplier pipeline during those months.

**Domestic buyer journey — from Instagram to delivered package.**

Andrés sees a Café Fest video on Instagram showing Doña Esperanza talking about her coffee. He follows the link to FINCAVA. The marketplace page loads in Spanish. The concept page explains, in three short sections, what Trust Commerce means: that he is buying directly from a farmer who has been verified by FINCAVA, that products may be out of stock between harvests, that he will only pay when his order is ready to ship, that he can leave at any time without obligation. He browses by filter: women-led, organic, single-origin Huila. He sees four products. He reads Doña Esperanza's farm story. He sees her photo. He sees that the bag is 250g, COP 38,000, with twenty-five bags available before the next harvest in November. He buys two. He sees a Nequi payment screen confirming the payment is held until the bag is ready to ship — explained in one short sentence. Two days later, Doña Esperanza marks the order ready. His Nequi is debited. He receives a tracking number. The bag arrives in three days. Inside the bag there is a small printed card with her name, her farm, the date of harvest, and a one-line note. He photographs it and posts to Instagram, tagging FINCAVA. That single post is the source of the next four buyers.

**FINCAVA journey — from supplier ingestion to buyer delight.**

FINCAVA's operational journey runs in parallel. A field officer captures Doña Esperanza. The admin queue surfaces her for evaluation. The AI scoring runs. The managed service case is opened. A contractor visits her farm to produce origin story content. The story is translated into marketplace copy and reviewed. Her sellable_status is advanced. A retail product listing is created — manually for the first cohort of farmers, eventually via a self-service tool. The marketplace surfaces the product. The buyer purchases. FINCAVA's role at the moment of purchase is light — confirm payment intent, hold the authorization, notify the farmer. When the farmer marks ready, FINCAVA captures the payment, generates a shipping label, and triggers buyer notification. When the buyer receives, FINCAVA releases payment to the farmer. The post-delivery role is again about trust maintenance — soliciting a review, surfacing the next harvest update, keeping the relationship warm.

### 1.5 Emotional Trust Moments

Trust in this model is not built in one place. It is built and risked at specific moments. The team must design for each one specifically.

**For the farmer.**

- *First consent.* When the field officer asks Doña Esperanza if she wants to be added. The trust signal is the field officer's behavior, not anything on the platform. The platform inherits whatever credibility the field officer carried.
- *First listing.* When she sees her name, her photo, her coffee, her price on a public page. The risk is misrepresentation. Trust is built by accurate Spanish, accurate photos, and the ability to correct anything wrong.
- *First sale notification.* When she receives a WhatsApp message saying someone has bought two bags. The risk is silence on FINCAVA's side after this moment. Trust is built by clear next-step instructions in plain Spanish.
- *First payment received.* When Nequi notifies her of an incoming transfer. The risk is delayed or partial payment. Trust is built by paying within the promised window with no deductions she did not see coming.
- *First negative event.* When a harvest fails or a buyer complains. The risk is that FINCAVA sides with the buyer. Trust is built by FINCAVA defending the farmer's reality first and explaining it to the buyer in the farmer's terms.

**For the buyer.**

- *First read of the concept page.* The risk is that the platform sounds like marketing. Trust is built by writing that admits constraints and refuses to oversell.
- *First product page.* The risk is that the farm story feels generic. Trust is built by specificity — a real farmer's name, a real farm, a real harvest date, an actual remaining stock count.
- *Payment screen.* The risk is that the buyer feels they are paying for an uncertain thing. Trust is built by the platform explaining, in one sentence, that payment is captured only when the product ships.
- *Wait period between purchase and shipping.* The risk is silence. Trust is built by at least one update — even an automated one — that names the farmer and gives a concrete next milestone.
- *Package arrival.* The risk is anonymity. Trust is built by a tangible artifact in the package — a card, a name, a date — that closes the loop with a human signature.
- *Restock notification.* The risk is that the email feels promotional. Trust is built by the email being written in the farmer's voice and naming what was harvested.

**For FINCAVA.**

- *First farmer claim.* When a UNCLAIMED supplier completes the claim flow and takes ownership of their record. The risk is that the farmer feels surveilled rather than supported. Trust is built by the claim flow being simple, Spanish, and inviting rather than bureaucratic.
- *First retail sale.* The platform's reputation as a real transactional venue begins with this transaction. The risk is any technical failure here is over-weighted; the trust budget is small. The first sale should be over-supported manually if needed.
- *First failure.* When something breaks — a harvest fails, a package is lost, a buyer claims fraud. The risk is that the platform's behavior in this moment becomes the platform's reputation. Trust is built by transparent, human, prompt resolution.

### 1.6 Trust-Failure Scenarios (Bounded)

The team designs for five trust-failure scenarios explicitly. Other failures will arise; these five are the ones the empathy phase has identified as decisive.

**(a) Harvest fails after waitlist signup.**

The farmer has a crop failure between the buyer joining the waitlist and the restock date. The platform must notify the buyer in the farmer's voice, with a specific reason (frost, rain, pest, fungus), and offer two graceful exits: similar farms (using the buyer's original filter criteria) or simply leave the waitlist with no further communication. The risk if mishandled is that the buyer concludes FINCAVA is a brittle platform with vague excuses. The handling pattern is human voice plus structural alternatives.

**(b) Shipping delay beyond promised window.**

The package is in transit for ten days when the platform promised five. The risk is that the buyer escalates to a chargeback or a public complaint. The handling pattern is proactive notification before the buyer notices, plain-language explanation of where the package is, and a stated decision point ("we will give it three more days; if it has not arrived, we will refund you in full").

**(c) Product quality dispute.**

The bag arrives but the buyer says the coffee is stale or the cacao smells off. The risk is that FINCAVA either dismisses the buyer (losing them and their social media reach) or blames the farmer (breaking the farmer's trust). The handling pattern is: take the buyer's claim seriously, refund or replace immediately at FINCAVA's cost, then privately and supportively investigate with the farmer. Quality complaints from buyers must never be the first time a farmer hears about a problem with their product.

**(d) Farmer becomes unresponsive.**

The farmer does not mark a ready order shipped within the agreed window. The risk is buyer-side silence followed by chargebacks. The handling pattern is automatic WhatsApp escalation to the farmer, then to the field officer assigned to that farmer, then a platform-level decision: either ship from an alternate farmer in the buyer's filter set, or refund. The buyer is told what is happening within twenty-four hours of the SLA breach.

**(e) Similar-farm recommendation feels like a downgrade.**

When the buyer was waiting for Doña Esperanza and is offered, instead, a farm she did not choose, the recommendation must feel like an introduction, not a substitute. The risk is that the alternative reads as second-place. The handling pattern is to lead with the alternative farmer's story, photo, and name — not the product card. The buyer's original choice is preserved (they remain on Doña Esperanza's restock list) unless they explicitly opt out.

### 1.7 Waitlist Psychology

The waitlist in Trust Commerce is not a marketing queue. It is a relationship and harvest-alignment tool. Several psychological observations shape its design.

**Why buyers wait.** They wait because the wait is meaningful. They wait for a specific farmer, a specific harvest, a specific product. The wait is part of what they are buying. If the wait becomes unspecified or impersonal, it stops being meaningful and becomes friction.

**What makes waiting feel meaningful versus frustrating.** Meaningful waits have a named destination (next harvest, October, Doña Esperanza). Frustrating waits have an unnamed destination (in stock soon, available later). Meaningful waits are accompanied by signals that the farmer exists and is working (a harvest update, a photo from the farm). Frustrating waits go silent.

**The optimal cadence.** For a six-week wait between waitlist signup and harvest, two updates are correct: one mid-wait (an honest photo or a one-line note from the farmer) and one when the product is ready (the conversion email). More than two feels like marketing. Fewer feels like neglect.

**The relationship between waitlist and buyer identity.** A buyer who has waited for a farmer feels a specific loyalty to that farmer. The waitlist creates buyer-farmer relationships, not buyer-platform relationships. FINCAVA's role is to be the venue, not to insert itself into the relationship. The conversion email should sound like Doña Esperanza, not like FINCAVA.

**Decline and exit.** A buyer who joins the waitlist must be able to leave with one click and no follow-up. This protects the trust integrity of the rest of the model. Buyers who feel trapped on a list cease to trust the platform's voluntariness in any other moment.

### 1.8 Operational Realities Per Persona — Summary Table

| Reality | Farmer | Buyer | FINCAVA |
|---|---|---|---|
| Primary language | Spanish | Spanish | Spanish (V1) |
| Primary device | Shared smartphone with intermittent connectivity | Smartphone and laptop | Replit-hosted web app |
| Primary communication | WhatsApp | Email and platform notifications | WhatsApp to farmers, email to buyers |
| Payment instrument | Bancolombia, Nequi | Nequi, PSE, Bancolombia card | Wompi gateway |
| Trust signal | Field officer, named contact, accurate Spanish | Real farmer name, real harvest date, real stock | Speed of failure resolution |
| Tolerable wait | Long; harvest cycles are real | Three to five business days domestic; longer if explained | None for failures |
| Literacy | Functional Spanish | High Spanish, some English | Bilingual content production needed for Phase 2 |
| Risk capacity | Low; one failed harvest matters | Medium; one failed delivery matters | High; one failed launch matters |

---

## 2. Define Phase

The define phase converts the empathy findings into operational problem statements. Each statement is framed as "how might we…" and accompanied by success criteria that can be tested against in the prototype phase.

### 2.1 Core Trust-Commerce Problems

**Problem 2.1.1 — The retail buyer has no place to live in the data model.**

The `buyer_profiles` table is designed for B2B importers. A retail buyer like Andrés Mejía has no profile structure to capture his preferences, his addresses, his Nequi handle, or his filter history. The platform currently assumes every buyer is an importer. Retail launch requires a parallel profile structure for retail buyers, additive to the existing B2B buyer_profile model.

*How might we capture and serve the retail buyer's identity without disrupting the B2B buyer architecture?*

Success criteria: A retail buyer can register, save filter preferences, save shipping addresses, and view their order history without ever encountering a B2B field (destination port, incoterm, intended volume).

**Problem 2.1.2 — The order vocabulary is B2B export, not retail parcel.**

The `orders` table defaults to `incoterm = FOB`, has `destination_port` as a primary attribute, has no `shipping_address`, and progresses through statuses including `IN_PRODUCTION` and `SAMPLE_REQUESTED` that do not apply to a retail purchase. The retail order is conceptually different: a single buyer, a small parcel, a domestic address, a parcel carrier, no incoterm.

*How might we extend the order model to serve retail without rewriting the B2B export order flow?*

Success criteria: A retail order can be created, paid, and fulfilled with parcel-appropriate statuses and fields, while B2B export orders continue to use FOB and port-based fulfillment unchanged.

**Problem 2.1.3 — Payment at shipping readiness is not the platform's current pattern.**

The existing payment_milestones table assumes B2B-style staged payments tied to order milestones (e.g., deposit at order, balance at shipment). Retail Trust Commerce requires payment authorization at order placement, capture at shipping confirmation, and refund-on-failure within a defined SLA. Wompi supports this flow natively (authorize-then-capture) but the integration must respect the existing milestone model rather than replacing it.

*How might we implement authorize-now-capture-later payment for retail without breaking the B2B milestone payment architecture?*

Success criteria: Retail orders authorize payment at checkout, capture at shipping confirmation, and refund automatically if the order is not shipped within the SLA. B2B milestone payments remain unaffected.

**Problem 2.1.4 — The harvest cycle is captured at the product level but not actionable.**

The `products` table holds `harvest_season` as free text ("April-June") and `harvest_date` as a single timestamp. There is no structured cycle, no "next expected harvest" field, no link between a product's stock depletion and the next restock. For Trust Commerce, the harvest cycle must be the structural backbone of inventory, not narrative metadata.

*How might we represent harvest cycles structurally so that out-of-stock states resolve into actionable next-harvest dates without manual intervention?*

Success criteria: When `available_kg` reaches zero, the product surfaces a structured next-harvest date and accepts waitlist signups. When the harvest date passes and stock is replenished by the farmer, the waitlist is triggered.

### 2.2 Operational Friction Points

**Problem 2.2.1 — The translation layer is not staffed or scheduled.**

Turning a farmer's reality into a buyer-facing product page requires a field officer, a content producer, a photographer, and a Spanish copywriter. Today this is one founder doing all of it. The system has no defined cadence for content production, no template for origin story authorship, and no review process for accuracy. For Doña Esperanza to appear on the marketplace, someone must visit her farm, photograph her, interview her, write her story, get her approval, and post the result. This human pipeline is the gating constraint on retail growth — not the software.

*How might we design a translation layer workflow that one solo founder can execute at the rate of one farmer per two weeks initially, scaling to one per week with contractor support?*

Success criteria: A defined content production workflow exists with named steps, named owners, target time per step, and a review process that the farmer participates in.

**Problem 2.2.2 — The sellable_status state machine is not visible to anyone who is not an admin.**

A farmer sitting at NOT_READY does not know what NOT_READY means or what they need to do. A field officer cannot easily explain it. A buyer cannot see why one farmer is publishable and another is not. The state machine is an internal control that has not been made legible to the participants it controls.

*How might we make the sellable_status journey legible to the farmer in plain Spanish without exposing internal compliance machinery?*

Success criteria: A farmer can see, in Spanish, what state they are in, what comes next, and what is needed to get there. A field officer has a simple checklist that maps to state transitions.

**Problem 2.2.3 — Shipping cost variance across Colombian regions is hidden.**

A flat-rate domestic shipping model (e.g., COP 12,000 nationwide) is operationally simple but creates hidden cross-subsidies. A buyer in Bogotá ordering from a farm in Boyacá pays the same as a buyer in Leticia ordering from a farm in Nariño, even though the carrier cost differs by a factor of three or more. Trust Commerce premised on transparency cannot afford a hidden cross-subsidy.

*How might we present shipping cost honestly without imposing the operational complexity of real-time carrier API integration in Phase 1?*

Success criteria: Buyers see an accurate shipping cost at checkout. The platform either uses a zone-based table (acceptable Phase 1 simplification with disclosure) or a real-time carrier API. Either way, the buyer is not subsidizing another buyer invisibly.

**Problem 2.2.4 — The retail packaging dimensions and weights are not in the data model.**

The current `products` table holds `min_order_kg` and `available_kg` for bulk B2B sales. There is no retail SKU concept — 250g bag, 500g bag, 1kg bag — and no package dimensions for shipping calculation. A retail product page must show "250g bag, COP 38,000, 25 available" not "minimum 100kg, USD 8.50/kg, 18000kg available."

*How might we represent retail SKUs alongside the B2B bulk product without doubling the product catalog?*

Success criteria: A single product can carry both B2B bulk pricing (per kg, with min_order_kg) and retail SKU pricing (per bag, per unit), and the marketplace surfaces the right view to the right buyer.

### 2.3 Transparency Gaps

**Problem 2.3.1 — Stock counts can lie.**

If the farmer sells two bags to a local roaster on the same Sunday a buyer purchases two bags through FINCAVA, the platform's `available_kg` is no longer accurate. There is no real-time reconciliation between the farmer's actual stock and the platform's view of it. Trust Commerce premised on radical transparency cannot tolerate stock drift.

*How might we keep platform-displayed stock accurate when the farmer is also selling through other channels?*

Success criteria: Either (a) the platform is the only channel the farmer uses for the products listed, or (b) the farmer has a one-tap WhatsApp tool to update stock daily, or (c) stock is held in pre-confirmed-by-farmer batches with a "this batch is FINCAVA stock" designation.

**Problem 2.3.2 — Harvest dates carry implicit precision that the farmer cannot deliver.**

A buyer who sees "next harvest: October 15" expects October 15. A farmer who said "October" meant late October if it rains, early November if it doesn't. The mismatch between buyer-expected precision and farmer-actual precision is a trust-failure trigger.

*How might we represent harvest expectations with farmer-honest precision while giving the buyer enough certainty to commit to a wait?*

Success criteria: Harvest dates are surfaced as ranges (e.g., "expected late October to early November") with an honest disclaimer that nature dictates timing. The waitlist conversion email is sent on actual harvest, not on calendar date.

**Problem 2.3.3 — The platform's relationship to the farmer is invisible to the buyer.**

A buyer does not know whether Doña Esperanza receives the full price minus shipping, or whether FINCAVA takes a margin. The platform's commercial model is opaque. For Trust Commerce, that opacity is a problem — buyers participating in trust commerce want to know what their COP 38,000 buys, including who gets what.

*How might we communicate FINCAVA's commercial relationship to the farmer transparently without overloading the product page?*

Success criteria: The about page or a linked transparency page explains, in plain Spanish, what percentage of the sale reaches the farmer and what FINCAVA retains, including shipping and payment processing.

### 2.4 Buyer Trust Challenges

**Problem 2.4.1 — The buyer is asked to trust a future product.**

Standard e-commerce delivers what the buyer paid for, immediately or soon. Trust Commerce sometimes delivers nothing for weeks. The buyer is making a different kind of commitment, and the platform's communication must distinguish between "this is in stock now" and "you are joining a waitlist for a harvest in October." If those two states feel identical, trust breaks the first time the second state surprises a buyer.

*How might we differentiate the in-stock purchase from the harvest-wait purchase so unmistakably that no buyer is ever surprised by the wait?*

Success criteria: At every step from product page to confirmation email, the buyer sees explicit "ships now" or "ships in October" labeling. No design treats them as equivalent.

**Problem 2.4.2 — The buyer cannot easily verify the farmer is real.**

Photos, names, and stories are easily faked at internet scale. The buyer has no third-party verification of Doña Esperanza's existence. FINCAVA does, through its field officer network, but that knowledge is not surfaced to the buyer.

*How might we surface FINCAVA's own verification of the farmer to the buyer without descending into bureaucratic certificate displays?*

Success criteria: A buyer can see a simple, human verification signal on every published farmer profile (e.g., "Visited by FINCAVA on March 12, 2026; field officer Diana Martinez"). The signal feels like a friend's introduction, not a regulatory stamp.

**Problem 2.4.3 — The buyer cannot exit gracefully.**

Default e-commerce traps users in marketing emails after a purchase. Trust Commerce premised on the buyer's voluntariness must allow a one-click exit at every stage — leaving a waitlist, unsubscribing from a harvest update, deleting their account. Any friction here corrodes the rest of the trust contract.

*How might we make exit so frictionless that the buyer never feels trapped, while still maintaining enough relationship to encourage return?*

Success criteria: Every email contains a one-click unsubscribe. The account page has a one-click "delete my account" that actually deletes within seven days. The platform does not retain marketing permissions after a buyer leaves.

### 2.5 Farmer Market-Access Barriers

**Problem 2.5.1 — Documentation gates are necessary but punitive.**

To reach PUBLISHED, a farmer must have RUT, food handler certificate, INVIMA registration, and other documents specific to the product category. These are necessary for legal sale and buyer protection. They are also exclusionary — many smallholder farmers do not have these documents and cannot easily obtain them.

*How might we use the managed service case workflow to actively help farmers complete documentation rather than passively require it?*

Success criteria: Every farmer at NOT_READY who consents to platform participation receives an assigned managed service case with named staff support, defined steps in Spanish, and clear milestones. The percentage of consented farmers reaching PUBLISHED within ninety days is measurable.

**Problem 2.5.2 — The claim flow assumes literacy and platform familiarity the farmer may not have.**

A farmer with `claim_status = UNCLAIMED` must complete a claim flow to take ownership of their record. The flow as it exists today assumes the farmer can navigate a web interface, set a password, and verify an email. For farmers like Doña Esperanza, this is a meaningful barrier.

*How might we design a claim flow that a farmer with intermittent connectivity, shared device, and functional but not fast literacy can complete?*

Success criteria: The claim flow can be initiated and completed via WhatsApp, with a final web step that can be done with field officer assistance. No farmer who is willing to participate is excluded by interface design.

**Problem 2.5.3 — The farmer has no view of demand signals before committing harvest.**

A farmer might over-plant a crop that has no demand or under-plant a crop with strong demand. The platform holds demand signals (waitlist sizes, filter searches, view counts on origin stories) but does not surface them to the farmer. For Trust Commerce to support the farmer's economic decision-making, demand signals should reach the farmer in a form they can use.

*How might we surface demand signals to the farmer in a form they can act on, without overwhelming them with platform analytics?*

Success criteria: A farmer receives a periodic (monthly) WhatsApp message summarizing demand for their product category and region in plain Spanish, with one practical recommendation if relevant.

### 2.6 The Translation Problem

**Problem 2.6.1 — Farmer reality is not buyer-facing copy.**

Doña Esperanza talks about her coffee in agricultural terms — variety, altitude, drying method, rust resistance, family history. Andrés Mejía wants to know flavor notes, brewing recommendations, roast date, and farmer story. The same coffee speaks two languages. The translation between them is a content production task, not a software task.

*How might we structure the translation workflow so that the farmer's voice is preserved while the buyer's information needs are met?*

Success criteria: The origin story authoring process explicitly captures both the farmer's voice (in their own quotes, in Spanish) and the buyer-facing translation (flavor notes, brewing tips, harvest precision) in a single content production session. The farmer reviews and approves both before publication.

**Problem 2.6.2 — Content production is the rate-limiting step for retail growth.**

Each farmer requires roughly one full day of content production — farm visit, photography, interview, copy authoring, farmer review, publication. This rate of one farmer per day, optimistically one per week realistically, caps retail catalog growth at roughly fifty farmers per year with a solo founder. The retail layer's economic viability depends on this rate.

*How might we accelerate content production without diluting the quality that makes Trust Commerce work?*

Success criteria: A standardized content template, a shot list, a question template, and an AI-assisted first-draft pipeline reduces per-farmer content time from one day to half a day within six months.

### 2.7 The Harvest-Alignment Problem

**Problem 2.7.1 — The platform must map buyer expectations to farmer production cycles.**

A buyer who joins a waitlist for Doña Esperanza's coffee in May expects the next harvest in October-December. The platform must hold that mapping structurally and trigger the right communications at the right time. Without harvest-cycle structure, the waitlist becomes a generic email list and loses its meaning.

*How might we represent harvest cycles in the data model and trigger waitlist conversions on actual harvest events rather than calendar dates?*

Success criteria: Each product carries a structured harvest cycle (months of harvest, expected window). Stock replenishment events are linked to harvest cycles. Waitlist conversions are triggered by stock replenishment, not by calendar.

### 2.8 The Domestic Shipping-Cost Transparency Problem

**Problem 2.8.1 — Honest pricing requires either zone-based or real-time shipping.**

Domestic Colombian shipping ranges from COP 8,000 to COP 20,000 per small package depending on origin and destination. A flat rate hides this variance. Real-time carrier API integration is operationally heavier than Phase 1 should attempt. The middle path is a zone-based table — origin department to destination department, fixed rate per zone, published openly on the platform.

*How might we present domestic shipping cost transparently in Phase 1 using a zone-based approximation, with a clear path to real-time API in Phase 2?*

Success criteria: A zone-based shipping table is published. Buyers see the actual shipping rate for their address at checkout. The rate is within ten percent of the actual carrier cost in the majority of cases. Variance is absorbed by FINCAVA, not by the farmer or the buyer.

---

## 3. Translation Layer Design

The translation layer is the human and content workflow that converts farmer production reality into buyer-facing trust artifacts. This section describes how the workflow runs in Phase 1.

### 3.1 Roles

**Field officer.** Visits farms, captures initial supplier data, takes baseline photos, secures consent. Works in person or by WhatsApp. Compensated per-farmer or salaried. In Phase 1, the founder may be the field officer; in Phase 2, a small Colombian field network.

**Content producer.** Authors the origin story, finalizes photos and video, writes the buyer-facing copy. Spanish-native. Contractor-based in Phase 1. Reviews farmer voice for accuracy and obtains farmer approval before publication.

**Reviewer.** Reviews the final origin story for fit with FINCAVA voice (specific, honest, non-romanticized). The founder in Phase 1. A small editorial board in later phases.

### 3.2 Cadence

A target of one farmer published every two weeks in Phase 1. This is fifty farmers in two years, which gives the retail catalog enough breadth to be a real marketplace without exceeding solo-founder capacity. The cadence can accelerate if a contractor field network is established or if AI-assisted drafting reduces per-farmer content time below half a day.

### 3.3 Steps per farmer

1. Field officer visit, consent, basic data collection (one to two hours).
2. Photography and video capture during the same visit (one hour).
3. Interview with the farmer for origin story content (one hour).
4. AI-assisted first draft of origin story in Spanish (thirty minutes, machine-generated).
5. Content producer revision and finalization (one to two hours).
6. Farmer review and approval via WhatsApp (a half-day round-trip).
7. Reviewer approval (thirty minutes).
8. Publication to platform (fifteen minutes, manual in Phase 1).

Total elapsed time: approximately one week per farmer including farmer review. Total active production time: approximately half a day per farmer with AI assistance.

### 3.4 Photo and video sourcing from remote locations

Smartphone photography is sufficient for Phase 1. The shot list standardizes capture: portrait of the farmer, wide shot of the farm, close-up of the crop, packaging shot, one "working" shot showing the farmer in production. Video is one short clip — sixty seconds maximum — of the farmer speaking in their own words about their coffee, cacao, or fruit. Transcription and subtitling is part of the content production workflow.

### 3.5 Harvest update communications

Once a farmer is PUBLISHED and has buyers (either purchasers or waitlist members), the harvest update cadence becomes part of the translation layer. Two updates per harvest cycle: one mid-cycle, one at-ready. Both are sourced from the farmer (typically a WhatsApp photo and a one-line note) and translated by the content producer into a brief marketplace and email post. The farmer's voice is preserved.

---

## 4. Transparency UX Principles

Six principles govern UX design in the retail layer. They are intentionally short. Each represents a constraint on every interaction the platform offers.

**4.1 Surface real numbers, not range estimates.** When the platform knows the stock, the stock is shown. When the harvest date is approximate, it is shown as a range with a disclaimer.

**4.2 Lead with the farmer, not the product.** Every product page foregrounds the farmer's name and farm before the product specifications.

**4.3 Make exit easier than entry.** Unsubscribe, cancel waitlist, delete account — all are one click. Friction is reserved for the actions that build relationships, not the actions that release them.

**4.4 Name the constraint, then offer an option.** When something cannot happen (out of stock, harvest failed, shipping delayed), the platform names the constraint clearly and offers a path forward.

**4.5 Speak in the language of the participant.** Farmers see Spanish. Buyers see Spanish in Phase 1. Phase 2 adds English for international buyers. Buyer-facing copy uses retail language (bag, brew, flavor); farmer-facing copy uses agricultural language (kilogram, varietal, altitude).

**4.6 Never substitute marketing for honesty.** If the platform is about to write copy that exaggerates, omits, or romanticizes, it stops and writes the honest version instead. This applies to the founder, the content producer, and the AI drafting layer.

---

## 5. Farm-to-Door Storytelling Framework (Foundations)

The full storytelling framework will be specified in Phase 2 (Ideate and Prototype). The foundations are established here.

The narrative arc for every product spans four moments: who grew this (farmer and farm), how (variety, altitude, process), when (harvest date and stock state), and what it means to the farmer (impact, families supported, why this matters). The buyer sees all four on the product page, in that order.

The story is not the same as the marketing copy. The story is the farmer's voice translated faithfully. The marketing copy is the buyer-facing translation (flavor notes, brewing recommendations). Both appear on the product page, in distinct sections, with clear authorship.

The story does not romanticize. A farmer who is poor is not described as "humble." A farm that is small is not described as "boutique." The language is specific, accurate, and respects the farmer's dignity.

---

## 6. Bilingual UX Positioning

Phase 1 is Spanish-first across all surfaces:

- Buyer marketplace, product pages, checkout, account: Spanish.
- Farmer onboarding, claim flow, stock update tools: Spanish.
- Origin stories authored in Spanish.
- Administrative dashboard: Spanish primarily, with English fallback for technical terms.
- Transactional emails: Spanish.

Phase 2 (forward-looking, not designed in this document) adds English to buyer-facing surfaces when international payment goes live. Origin stories are translated to English at that point. Farmer-facing surfaces remain Spanish-only.

Right-to-left support, third-language support, and automatic translation are explicitly out of scope.

---

## 7. Low-Bandwidth Operational Considerations

Farmers in remote departments have intermittent connectivity. WhatsApp works where the web does not. The retail layer must operate within this constraint on the farmer side.

**Farmer-facing tools must work over WhatsApp.** Stock updates, harvest status changes, order notifications, payment confirmations — all must be possible via WhatsApp message exchange. The web interface for farmers is a fallback, not a primary channel.

**Image upload must tolerate slow connections.** Photos captured by field officers are uploaded later, from town, not in real time from the farm.

**No farmer interaction requires a continuous internet connection longer than three minutes.** Any flow that takes longer must be designed for resumability.

**Field officer tools must work offline.** Initial data capture during a farm visit happens in a phone app or a printed form, with sync when the field officer returns to connectivity.

---

## 8. Mobile-First Design Considerations

Buyers like Andrés Mejía will encounter FINCAVA primarily on a phone — through Instagram, through a WhatsApp share, through a direct mobile browse. The retail experience must be excellent on mobile and acceptable on desktop, not the other way around.

**The product page must load in under three seconds on a mid-range Android device on 4G.**

**The checkout must complete in under sixty seconds for a returning buyer using Nequi.**

**Farm photos must be optimized for mobile bandwidth.** Hero images are served at appropriate resolution; full-size gallery is lazy-loaded.

**Touch targets must be at least 44px.** No accidental taps on filter chips that change selection.

**Forms must use mobile-appropriate keyboards.** Phone fields trigger numeric keyboards. Email fields trigger email keyboards. Address fields use country-appropriate formats.

---

## 9. Domestic-First Operational Sequencing

The retail launch is Colombian-only in Phase 1. International expansion is Phase 2. The sequencing has implications for the work covered in this document.

**Payment integration in Phase 1: Wompi only.** PSE, Nequi, Bancolombia button, Colombian-issued cards. No Stripe in Phase 1.

**Shipping in Phase 1: domestic Colombian only.** Zone-based pricing table covering all departments. No international carrier integration.

**Content authored in Spanish only.** Translation to English deferred to Phase 2.

**Buyer profile structure designed for Colombian addressing.** Department, municipio, address fields appropriate to Colombian postal conventions. International addressing structure added in Phase 2.

**Tax and invoicing in Phase 1: DIAN compliance for Colombian retail.** Electronic invoicing as required.

---

## 10. Future International Expansion (Forward-Looking)

This section is not a design. It is a flag-planting exercise to ensure Phase 1 decisions do not foreclose Phase 2 options.

**Stripe integration is the path for international payment.** Square is not, despite earlier consideration; Stripe is technically superior for online cross-border retail.

**International shipping requires consolidation or a forward warehouse.** Direct DHL Express shipping at USD 35-50 per 250g bag is not viable retail. A Miami-based fulfillment partner, or a Bogotá-based consolidation 3PL, is the path. Either approach changes FINCAVA from pure marketplace to a marketplace with light inventory operations.

**The destination hub strategy is preferred.** Miami first (US and Caribbean), Madrid second (EU), Dubai or Singapore third (Middle East and Asia) — opened sequentially based on demand evidence collected in Phase 1 international manual fulfillment.

**Content must be translated to English at Phase 2.** Origin stories, product pages, marketing copy.

**Customs and food import compliance applies at Phase 2.** FDA Prior Notice for US-bound food, EU food import compliance, HS code assignment, commercial invoice and packing list generation.

Phase 1 decisions that must not foreclose Phase 2: schema fields for international addressing, payment gateway abstraction layer, retail SKU dimensions and weights captured at product creation, harvest cycle structure shared between domestic and international flows.

---

## 11. Community-Supported Agriculture Parallels

FINCAVA Trust Commerce sits closer to a Community Supported Agriculture (CSA) model than to e-commerce. The parallels are instructive.

**CSA pre-buys are an explicit commitment to a future harvest.** Trust Commerce waitlists are the same — buyers express intent to purchase a future harvest. The difference is that CSA pre-buys take payment upfront and Trust Commerce does not; FINCAVA's model is more conservative on buyer commitment.

**CSAs are local and Trust Commerce is national.** This is the most significant difference. CSAs operate within a geography small enough that the buyer can visit the farm. Trust Commerce expands the geography while preserving the relational quality. The substitute for physical proximity is content quality — photos, video, transparent stock, harvest updates.

**CSAs accept seasonal variation and so does Trust Commerce.** Members of a CSA accept that some weeks they get more tomatoes and some weeks they get more squash. Trust Commerce buyers accept that some harvests are smaller than others and some products go out of stock between cycles.

**CSAs build farmer-buyer relationships over years.** Trust Commerce aspires to the same. The buyer who buys from Doña Esperanza this October is more likely to buy from her again next October. Retention metrics matter more than acquisition metrics.

---

## 12. Cooperative Commerce Principles

The five principles below are what distinguishes FINCAVA from a conventional marketplace.

**12.1 Value to both sides precedes profit.** A transaction that benefits FINCAVA but does not benefit either the farmer or the buyer is not a transaction worth completing.

**12.2 The farmer is named.** Anonymity in commerce extracts value from the producer. Trust Commerce refuses anonymity.

**12.3 The buyer is not pressured.** Marketing pressure (artificial scarcity, urgency, fear-of-missing-out) is forbidden. Real scarcity (this farmer produced one hundred bags) is disclosed honestly.

**12.4 Failure favors the disadvantaged party.** When a harvest fails, the buyer is refunded. When a delivery fails, the buyer is refunded. The farmer is not penalized for nature.

**12.5 Transparency about the platform's economics.** Buyers know what percentage reaches the farmer. Farmers know what FINCAVA charges. Neither side discovers the other's terms by accident.

---

## 13. Handoff to Phase 2 (Ideate, Prototype, Test)

This document closes with the open questions and defined problems that feed into the next phase. Phase 2 will produce ideated solutions, prototype flows, and a test plan grounded in these problems.

### Open questions for Phase 2

1. What is the retail buyer schema? (Problem 2.1.1) Specifically, how does it relate to `users.role = BUYER` and to the existing `buyer_profiles` table? Is it a new table (`retail_buyer_profiles`) or an extension?

2. What is the retail order representation? (Problem 2.1.2) Does the retail order live in the existing `orders` table with new fields and a new status flow, or in a parallel `retail_orders` table?

3. What is the retail SKU representation? (Problem 2.2.4) Does the existing `products` table gain retail fields (weight_grams, package_dimensions, retail_price_cop, retail_stock_units), or does a child `product_skus` table emerge?

4. What does the structured harvest cycle look like? (Problem 2.4 and 2.7.1) Is it a `harvest_cycles` table linked to products, or a JSON structure on the product row?

5. What is the WhatsApp-based farmer interaction protocol? (Problem 2.5.2 and Low-Bandwidth section) How are stock updates, harvest status changes, and order notifications structured as WhatsApp message templates?

6. How does the managed service case workflow connect to retail readiness? (Problem 2.5.1) Specifically, does a farmer need a different set of managed service cases to be retail-ready versus B2B-ready?

7. What is the prototype design for the out-of-stock dual-option flow? (Approved baseline) The flow is decided; the visual and interaction design is not.

8. What is the prototype design for the buyer's payment-at-shipping experience? (Problem 2.1.3) The authorize-now-capture-later flow is decided; the buyer's perception of it is not.

9. What test plan validates each defined problem? (Test phase) Specifically, what metrics and what user research methods.

### Defined problems carried forward

Each problem statement above (2.1.1 through 2.8.1) is carried forward to Phase 2 with its success criteria intact. Phase 2 will ideate solutions, prototype the most promising ones, and define tests for each.

### Critical reminders for Phase 2

- The retail layer is additive to the existing B2B platform, not a replacement.
- The sellable_status state machine is authoritative; retail buyers see only PUBLISHED suppliers.
- Approved baselines are not open for redesign.
- The platform has zero live transactions at the time of this document. Retail may be the first live transaction channel.
- Solo-founder execution capacity is the operational constraint. Every Phase 2 design must be feasible by one person with selective contractor support.

---

*End of Phase 1 document. Phase 2 (Ideate, Prototype, Test) will build directly on the problems and questions above.*
