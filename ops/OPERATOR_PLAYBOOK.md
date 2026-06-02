# Fincava Operator Playbook

**FIN-011 — Draft 3**
Owner: Founder
Last updated: 2026-06-01
Status: Draft (Phase A → Phase B)

This is the single operator reference for running the Fincava platform without engineering support. It covers both the business operations (buyer acquisition, introductions, supplier management) and the platform procedures (scoring, compliance, publishing). All endpoint paths, field names, and state values are sourced directly from production code.

---

## Table of Contents

0. [Access & Credentials](#0-access--credentials)
1. [Platform Overview](#1-platform-overview)
2. [Founder Daily Rhythm](#2-founder-daily-rhythm)
3. [Buyer Acquisition & Lead Handling](#3-buyer-acquisition--lead-handling)
4. [Introduction & Concierge Workflow](#4-introduction--concierge-workflow)
5. [Supplier Communication SOP](#5-supplier-communication-sop)
6. [Deal Tracking & Pipeline Management](#6-deal-tracking--pipeline-management)
7. [KPI Tracking & Weekly Review](#7-kpi-tracking--weekly-review)
8. [Supplier Ingestion](#8-supplier-ingestion)
9. [Scoring and Graduation](#9-scoring-and-graduation)
10. [Compliance Flow](#10-compliance-flow)
11. [Publishing to Marketplace](#11-publishing-to-marketplace)
12. [RFQ and Inquiry Triage](#12-rfq-and-inquiry-triage)
13. [Email-Match Bridge (FIN-001 Manual SOP)](#13-email-match-bridge-fin-001-manual-sop)
14. [Stuck Supplier Recovery](#14-stuck-supplier-recovery)
15. [Suspension and Restoration](#15-suspension-and-restoration)
16. [Supplier Exception Handling](#16-supplier-exception-handling)
17. [Emergency Operating Procedures](#17-emergency-operating-procedures)
18. [Deploy Ritual](#18-deploy-ritual)
19. [Feature Flags Summary](#19-feature-flags-summary)
20. [Endpoint Quick Reference](#20-endpoint-quick-reference)
- [Appendix A — Technical Reference](#appendix-a--technical-reference)

---

## 0. Access & Credentials

**Read this section first. You cannot operate the platform without these.**

---

### Platform URLs

| Resource | URL |
|----------|-----|
| Public website | https://fincava.com |
| Admin login | https://fincava.com/login |
| API health check | https://fincava.com/api/health |
| Supplier marketplace | https://fincava.com/suppliers |
| Contact form | https://fincava.com/contact |

---

### Admin Login

1. Go to **https://fincava.com/login**
2. Enter email: `irfan@fincava.com`
3. Enter password — obtain from Irfan before any handoff (see Engineering Contact below)
4. Confirm you have admin access: you should see **Admin Dashboard** in the navigation after login
5. If you do not see Admin Dashboard, your account does not have ADMIN role — contact Irfan immediately

> **Before any 30-day operator handoff:** Irfan must either share login credentials securely or create a separate ADMIN account for the covering operator. Do not share credentials by email or WhatsApp — use a password manager.

---

### Engineering Contact

For platform issues, failed migrations, or anything requiring code changes:

**Irfan Bari**
Email: sbirfan@gmail.com
WhatsApp: +15123600118

Expected response: best effort. For production outages, WhatsApp is faster.

---

### Deal Tracker

The deal tracker is a spreadsheet maintained on the founder's local machine:

**Location:** `/Users/irfan/Documents/Fincava/deal-tracker.xlsx`

> **⚠️ Handoff requirement:** Before any period of operator coverage, this file must be exported and shared, or migrated to a Google Sheet accessible by the covering operator. A local file on the founder's machine is not accessible to a remote operator.
>
> **To migrate:** Go to https://sheets.new, paste the column headers from §6.2, copy all rows from the Excel file, and share the Google Sheet link with the covering operator.

---

### Secrets & Sensitive Values

| Secret | Where it lives | How to access |
|--------|---------------|---------------|
| `BACKUP_SECRET_V2` | Replit Secrets | Log into Replit → open the Fincava project → Secrets tab → copy `BACKUP_SECRET_V2` value |
| `ADMIN_EMAIL` | Replit Secrets | Same as above |
| `ANTHROPIC_API_KEY` | Replit Secrets | Same — rotate via console.anthropic.com |
| `RESEND_API_KEY` | Replit Secrets | Same — manage via resend.com |
| Admin login password | Share with operator before handoff | Do not store in this document |

**Replit access:** Log in at https://replit.com — credentials held by Irfan. Replit access is required for outage recovery (§17.3), backup management (§17.4), and env var updates.

---

## 1. Platform Overview

Fincava is a managed B2B sourcing platform connecting Colombian agricultural suppliers with global buyers. The founder operates it as a concierge — facilitating qualified introductions, not processing transactions directly.

**The operator's role:**
- Discover and onboard Colombian suppliers (coffee, cacao)
- Score, graduate, and publish verified suppliers to the marketplace
- Acquire buyers and qualify their sourcing needs
- Match buyers to suppliers and manage the introduction
- Support the relationship until deal closes or goes cold

**Supplier state machine:**

```
NOT_READY → ELIGIBLE → SELLABLE → PUBLISHED
                ↘         ↗
              (score gates)

Any state → INACTIVE (suspension, reversible)
```

| State | Meaning | How to exit |
|-------|---------|-------------|
| `NOT_READY` | Score < 30 or compliance gate failed | Fix compliance, re-score |
| `ELIGIBLE` | Score 30–59, compliance passed | Improve data, re-score |
| `SELLABLE` | Score ≥ 60, compliance passed | Manually publish |
| `PUBLISHED` | Live on marketplace | Unpublish or suspend |
| `INACTIVE` | Suspended | Restore via transition |

**Admin panel navigation:**

| Admin section | What it shows |
|--------------|---------------|
| Admin Dashboard | Overview — supplier counts by state, recent activity |
| Admin > Suppliers | All suppliers — filter by status, search by name |
| Admin > Ingestion | Batch management — create, add, confirm batches |
| Admin > Compliance Queue | Documents awaiting review |
| Admin > RFQs | All buyer sourcing requests |
| Admin > Inquiries | All buyer inquiries |
| Admin > Users | All registered users — buyers, suppliers, admins |
| Admin > Messages | Platform messaging between users |
| Admin > Origin Stories | Supplier story content management |
| Admin > Backup | Manual backup trigger |

---

## 2. Founder Daily Rhythm

### Morning (15–20 minutes)

```
□ Check platform health: https://fincava.com/api/health → expect { status: "ok", db: "ok" }
□ Check email inbox (irfan@fincava.com) for:
    - New contact form leads (respond within 24h — see §3)
    - New buyer registrations (review profile, qualify)
    - Supplier replies to compliance requests
    - Sentry alerts (if monitoring is configured — see §17)
□ Log in to admin panel: https://fincava.com/login
□ Admin > Inquiries — triage any PENDING within 24h
□ Admin > RFQs — triage any new within 24h
```

### Supplier Pipeline (10–15 minutes, every other day)

```
□ Admin > Suppliers — filter by NOT_READY:
    Any with fixable compliance issues? → Patch compliance, re-score (see §10, §9)
□ Admin > Suppliers — filter by ELIGIBLE:
    Any with improved data? → Review nextActions, re-score if warranted
□ Admin > Suppliers — filter by SELLABLE:
    Any ready to publish? → Manual review, publish if approved (see §11)
□ Any stuck suppliers (state unchanged for >24h after scoring)? → see §14
```

### Introduction Follow-Up (10 minutes daily)

```
□ Open deal tracker (§6) — check Next Action Date column
□ Open introductions with no response after 48h → follow up with supplier (WhatsApp)
□ Inquiries older than 72h with no update → escalate or close
□ Update deal tracker for any status changes
```

### End of Day (5 minutes)

```
□ Log any manual state overrides in FINCAVA_CHANGE_LOG.md
□ Note platform errors needing engineering attention
□ Update deal tracker if any conversations progressed
```

### Weekly Review (30–45 minutes — every Monday morning)

```
□ Review KPI dashboard (see §7)
□ Deal tracker audit: move stalled deals to Dormant after 14 days of no activity
□ Supplier pipeline: any suppliers stuck >1 week? Escalate or manually override
□ Plan buyer outreach: which buyers need follow-up this week?
□ Content ops: publish one origin story if ready (Admin > Origin Stories)
□ Backup check: Admin > Backup — confirm last run timestamp is recent
```

---

## 3. Buyer Acquisition & Lead Handling

### 3.1 Lead Sources

| Source | How It Arrives | SLA |
|--------|---------------|-----|
| Contact form | Email to `irfan@fincava.com` inbox | 24h response |
| CafeFest / event | Business card / notes → manual entry | 48h |
| WhatsApp direct | WhatsApp to +15123600118 | 24h |
| Referral | Email or WhatsApp from existing contact | 24h |
| Website (registered buyer) | Admin > Users — new BUYER role appears | 24h |

### 3.2 Contact Form Lead SOP

Contact form submissions arrive in the `irfan@fincava.com` inbox formatted as:

```
Subject: [FINCAVA] Contact from {Name} ({Company})
Fields: name, email, phone, company, type (BUYER/SUPPLIER/OTHER), message
```

**Response procedure:**

1. **Read and classify** — is this a buyer lead, a supplier wanting to join, a partner, or noise?
2. **Respond within 24 hours** using the appropriate template (see §5)
3. **Log in deal tracker** if buyer or qualified supplier — create a row with status `Lead` (see §6)
4. **If buyer:** qualify using the criteria in §3.4, then guide to registration (§3.5)
5. **If supplier:** initiate ingestion flow (see §8)
6. **If other:** respond politely, no further action unless strategic

### 3.3 Event / Offline Lead Handling (CafeFest and similar)

1. Enter the lead into the deal tracker immediately (same day if possible, within 48h max)
2. Send an introduction email within 48h — reference where you met
3. Qualify using §3.4 criteria
4. If qualified: guide to platform registration (§3.5)
5. If not ready: keep in tracker at `Lead` stage, set a 2-week follow-up reminder

### 3.4 WhatsApp Lead Handling

1. Respond within 24h on WhatsApp (+15123600118)
2. Qualify verbally (volume, product, geography)
3. If promising: send platform link and guide to registration
4. Log in deal tracker
5. Follow up if no registration within 5 days

### 3.5 Referral Lead Handling

1. Thank the referrer within 24h
2. Reach out to the referred contact directly (email or WhatsApp)
3. Mention the referrer by name in your introduction
4. Otherwise follow the same qualification and registration flow

### 3.6 Buyer Qualification Criteria

A buyer is worth pursuing if they meet at least two of the following:

| Criterion | Qualifying signal |
|-----------|------------------|
| **Volume** | Sourcing ≥ 1 MT/year coffee or cacao |
| **Seriousness** | Has sourced Colombian product before, or has an active sourcing need |
| **Geography** | US, EU, UK, Canada, Japan, Australia — established import markets |
| **Timeline** | Active need within 3–6 months |
| **Willingness to engage** | Responds to follow-up within 72h |

**Not worth pursuing (for now):**
- Brokers with no end buyer identified
- Spot buyers looking for single sub-100kg purchases
- Buyers demanding FOB pricing before any supplier introduction

### 3.7 Buyer Registration Guidance

Once qualified, guide the buyer to register:

1. Send them to **https://fincava.com/register** — select role: BUYER
2. Tell them what to expect: "You'll create a profile, then you can browse suppliers and submit sourcing requests. I review all requests personally and will reach out within 24 hours."
3. Once they register: **Admin > Users** — confirm their role is `BUYER`
4. Update deal tracker to `Buyer Registered`

**Note:** Two buyer registration paths currently exist (`/buyer-register` and `/buyer/onboarding`). Direct buyers to `/register` for the standard path.

---

## 4. Introduction & Concierge Workflow

This is the core Fincava revenue motion. The operator facilitates every introduction manually.

### 4.1 Pipeline Stages

```
Lead → Qualified → Buyer Registered → RFQ Received → Supplier Identified
     → Supplier Confirmed → Introduction Made → Follow-Up
     → Negotiation → Closed Won / Closed Lost / Dormant
```

See §6 for the full deal tracker fields.

### 4.2 Stage-by-Stage Operator Actions

**Lead**
- Source captured (contact form, event, WhatsApp, referral)
- Logged in deal tracker
- Initial response sent within 24h

**Qualified**
- Buyer meets at least 2 qualification criteria (§3.6)
- Volume, product, geography, timeline confirmed
- Move to `Buyer Registered` once they complete registration

**Buyer Registered**
- Profile confirmed: **Admin > Users** — role shows `BUYER`
- Reach out to confirm their sourcing need in detail: product spec, volume, timeline, quality requirements, certifications needed (organic, Fair Trade, etc.)

**RFQ Received**
- Buyer submits a formal RFQ: visible in **Admin > RFQs**
- Review for completeness: product, volume, delivery date, destination, spec
- If incomplete: message the buyer via **Admin > Messages** (see §12 for how to send a platform message)
- Once complete: move to `Supplier Identified`

**Supplier Identified**
- Go to **Admin > Suppliers** — filter by `sellableStatus = PUBLISHED`, search by product category
- Select 1–3 best matches based on: product fit, volume capacity, certifications, score, geography
- If no PUBLISHED candidates: check SELLABLE — if ready, publish first (§11)
- **If no PUBLISHED or SELLABLE suppliers exist for the buyer's need:** see §4.4 (No Supply scenario)

**Supplier Outreach** (see §5 for templates)
- Contact each candidate supplier via WhatsApp or email
- Message: "Tenemos un comprador interesado en [product]. ¿Tienes disponibilidad de [volume] para [timeline]?"
- Give supplier 48h to respond before contacting the next candidate
- If supplier confirms: move to `Supplier Confirmed`
- If supplier declines or does not respond: try next candidate

**Supplier Confirmed**
- Supplier has confirmed availability and interest
- Confirm key details: available volume, price expectation, certifications, photos available
- Move to `Introduction Made`

**Introduction Made**
- Send the introduction email to both buyer and supplier (Template B — §5.2)
- CC both parties on one email thread
- Your role from this point: facilitate, answer questions, translate if needed
- Set a 48h follow-up reminder in the deal tracker (Next Action Date column)

**Follow-Up**
- If no contact between buyer and supplier after 48h: send Template C (§5.2)
- After 1 week of silence: send a direct follow-up asking for status
- After 2 weeks of silence with no response: move to `Dormant`

**Negotiation**
- Buyer and supplier are in active discussion
- Check in weekly until deal closes or stalls

**Closed Won**
- Deal confirmed (PO issued, contract signed, or verbal commitment with timeline)
- Log the outcome in the deal tracker
- Send a thank-you to both parties
- Follow up in 30 days for repeat order or referral

**Closed Lost**
- Log reason: price mismatch, quality mismatch, timing, buyer went elsewhere, supplier unavailable
- Keep buyer in tracker — re-engage in 60–90 days if a better supplier becomes available

**Dormant**
- No response from buyer or supplier after 2 weeks of follow-up
- Keep in tracker, review monthly
- Re-engage if a new supplier becomes available that fits their need

### 4.3 Operator Responsibilities in the Introduction

| Responsibility | Operator does | Buyer/Supplier does |
|---------------|--------------|---------------------|
| Qualification | ✓ | — |
| Supplier matching | ✓ | — |
| Supplier outreach | ✓ | — |
| Introduction email | ✓ | — |
| Translation (EN↔ES) | ✓ (if needed) | — |
| Price negotiation | — | ✓ |
| Sample logistics | — | ✓ |
| Contract | — | ✓ |
| Follow-up nudges | ✓ | — |
| Deal status tracking | ✓ | — |

### 4.4 Escalation Scenarios

| Scenario | Action |
|----------|--------|
| **No matching PUBLISHED or SELLABLE suppliers exist** | Notify buyer: "We are onboarding suppliers that match your need. Expected timeline: [X weeks]. I'll contact you as soon as a verified match is available." Log in deal tracker at `RFQ Received` with Next Action = re-check supplier pipeline in 1 week. Initiate an ingestion batch targeting the missing product/region (§8). |
| Buyer wants a product no current supplier offers | Same as above — log, notify, initiate targeted ingestion |
| Supplier disputes the buyer's spec or price | Facilitate a clarification exchange; translate if needed |
| Buyer needs organic or Fair Trade certification | Filter Admin > Suppliers by certification; if none available, be transparent with buyer and set a timeline |
| Buyer wants exclusivity | Decline at Phase I — Fincava is a marketplace; revisit in Phase II |
| Supplier stops responding mid-negotiation | Contact via WhatsApp directly; if no response in 5 days, offer buyer an alternative supplier |
| Deal stalls on logistics | Provide general guidance only; do not take responsibility for freight at Phase I |

---

## 5. Supplier Communication SOP

### 5.1 WhatsApp Templates

All WhatsApp messages to Colombian suppliers should be in Spanish. Keep them short — farmers often read on mobile.

**Template 1 — Compliance Document Request**
```
Hola [Nombre], soy Irfan de Fincava. Para completar tu perfil en la plataforma y
conectarte con compradores, necesitamos tu RUT del DIAN.
¿Puedes enviarnos una copia por WhatsApp o al correo info@fincava.com?
Cualquier duda estoy disponible. ¡Gracias!
```

**Template 2 — Missing Information Request**
```
Hola [Nombre], necesitamos completar algunos datos de tu perfil en Fincava:
- [campo faltante 1]
- [campo faltante 2]
¿Puedes enviarnos esa información? Con esto podemos activar tu perfil y
mostrarte a compradores internacionales. ¡Gracias!
```

**Template 3 — Graduation / Publication Notification**
```
Hola [Nombre], ¡buenas noticias! Tu perfil en Fincava ya está activo y visible
para compradores internacionales. Estamos trabajando para conectarte con
compradores de café/cacao. Te avisamos cuando tengamos un interesado. 🌱
```

**Template 4 — Buyer Inquiry Notification**
```
Hola [Nombre], tenemos un comprador interesado en [producto] —
aproximadamente [volumen] para [fecha/trimestre].
¿Tienes disponibilidad y puedes confirmarnos precio aproximado?
Necesito respuesta antes de [fecha límite]. ¡Gracias!
```

**Template 5 — Stalled Supplier Follow-Up**
```
Hola [Nombre], hace un tiempo intentamos contactarte sobre tu perfil en Fincava.
¿Sigues interesado en conectarte con compradores internacionales para tu [producto]?
Podemos ayudarte a completar el proceso. Avísame cuando puedas. ¡Saludos!
```

**Template 6 — Supplier Re-Engagement (cold)**
```
Hola [Nombre], soy Irfan de Fincava. Te contacté anteriormente sobre nuestra
plataforma de exportación para productores colombianos. Tenemos nuevos compradores
buscando [producto] de [región]. ¿Tienes interés en explorar oportunidades?
¡Con gusto te cuento más!
```

### 5.2 Email Templates

**Template A — Buyer Lead Response (English)**

Subject: Re: Your inquiry to Fincava

```
Hi [Name],

Thank you for reaching out to Fincava.

We connect verified Colombian agricultural suppliers — primarily coffee and cacao
producers — with global buyers. Based on your message, it sounds like we may be
able to help.

To understand your needs better, could you share:
- What product and volume are you looking for?
- What's your sourcing timeline?
- Any specific certifications required (organic, Fair Trade, etc.)?

If it's a fit, I'll personally match you with verified suppliers and facilitate
the introduction.

Looking forward to hearing from you.

Best,
Irfan
Fincava — Verified Colombian Agricultural Sourcing
```

**Template B — Buyer-Supplier Introduction Email**

Subject: Introduction: [Buyer Company] ↔ [Supplier Name] | [Product]

```
Hi [Buyer Name] and [Supplier Name/Farm Name],

I'm pleased to introduce you both.

[Buyer Name] at [Company] is sourcing [product], approximately [volume],
for [timeline/destination].

[Supplier Name] is a verified Fincava supplier based in [municipio, department],
producing [product] with [relevant certifications/attributes].

I've verified [Supplier Name]'s profile on Fincava and believe this could be
a strong fit.

I'll leave you to connect directly from here. Please don't hesitate to copy me
if you need any support — I'm happy to assist with questions, documentation,
or translation.

Best,
Irfan
Fincava
```

**Template C — Follow-Up After Introduction (Day 3)**

Subject: Quick check-in | [Buyer] ↔ [Supplier]

```
Hi [Buyer Name] and [Supplier Name],

Just checking in to see if you've had a chance to connect since my introduction
on [date]. Is there anything I can help clarify or facilitate?

Best,
Irfan
```

**Template D — Compliance Document Request (Email)**

Subject: Fincava — Completing Your Supplier Profile

```
Hola [Nombre],

Para activar tu perfil en Fincava y conectarte con compradores internacionales,
necesitamos los siguientes documentos:

□ RUT del DIAN (requerido)
□ [Otro documento si aplica]

Puedes enviarnos los documentos por email a info@fincava.com o por WhatsApp.

Si tienes preguntas sobre cómo conseguir estos documentos, con gusto te ayudamos.

Saludos,
Irfan
Fincava
```

---

## 6. Deal Tracking & Pipeline Management

### 6.1 Deal Tracker Location

**File:** `/Users/irfan/Documents/Fincava/deal-tracker.xlsx`

> **⚠️ For operator handoff:** This file is on the founder's local machine. Before any period of operator coverage, export the file and share it, or migrate to a Google Sheet (https://sheets.new). Share the link with the covering operator. A local file is not accessible remotely.

### 6.2 Spreadsheet Column Headers

Paste these as Row 1 when creating the tracker:

```
Deal ID | Stage | Buyer Name | Buyer Company | Buyer Email | Buyer WhatsApp |
Product | Volume (MT/yr) | Timeline | Certs Needed | Supplier Name | Supplier ID |
Source | Lead Date | Last Activity | Next Action | Next Action Date |
Outcome | Loss Reason | Notes
```

| Column | Values / Format |
|--------|----------------|
| **Deal ID** | FC-001, FC-002, ... (sequential, never reuse) |
| **Stage** | Lead / Qualified / Buyer Registered / RFQ Received / Supplier Identified / Supplier Confirmed / Introduction Made / Follow-Up / Negotiation / Closed Won / Closed Lost / Dormant |
| **Product** | Coffee / Cacao / Other |
| **Volume (MT/yr)** | Number — estimated annual volume |
| **Timeline** | Q1 2027 / etc. |
| **Certs Needed** | Organic / Fair Trade / None |
| **Source** | Contact form / Event / WhatsApp / Referral |
| **Lead Date** | YYYY-MM-DD |
| **Last Activity** | YYYY-MM-DD |
| **Next Action** | Text — what you need to do next |
| **Next Action Date** | YYYY-MM-DD — deadline for next action |
| **Outcome** | Won / Lost / Dormant (only when closed) |
| **Loss Reason** | Price / Quality / Timing / Other |

### 6.3 Weekly Review Cadence

Every Monday during your weekly review:

1. Open the deal tracker
2. For each open deal:
   - Last Activity > 7 days ago → take the Next Action today
   - Last Activity > 14 days ago with no response → move to `Dormant`
   - Stage changed → update the row
3. Count deals by stage — record in weekly KPI log (§7)

### 6.4 Archive Rules

| Condition | Action |
|-----------|--------|
| `Closed Won` | Keep permanently — reference for repeat orders |
| `Closed Lost` | Keep 90 days, then move to Archive tab |
| `Dormant` with no activity for 60 days | Move to Archive tab |
| Duplicate deal (same buyer, same product) | Merge into oldest row, delete duplicate |

### 6.5 Monthly Reporting

At month end, record in the KPI log:
- Total active deals
- Deals by stage
- New leads this month
- Introductions made this month
- Deals won / lost (and primary loss reason)

---

## 7. KPI Tracking & Weekly Review

Review every Monday morning. Update the monthly log at month end.

### KPI 1 — New Suppliers This Week

**Why it matters:** Supply pipeline growth. Without supply, buyer matching stalls.
**Where to find it:** Admin > Suppliers — sort by `createdAt` descending, count rows from past 7 days.
**Weekly target (Phase I):** 2–5 new suppliers ingested per week.
**Action if below:** Increase field officer outreach or start a new ingestion batch (§8).

---

### KPI 2 — Suppliers Graduated (PUBLISHED this week)

**Why it matters:** Only PUBLISHED suppliers generate introductions. Graduation rate is the bottleneck.
**Where to find it:** Admin > Suppliers — filter `sellableStatus = PUBLISHED`, sort by `publishedAt` descending.
**Weekly target (Phase I):** 1+ supplier published per week once pipeline is seeded.
**Action if below:** Review SELLABLE suppliers — any ready to publish? (§11)

---

### KPI 3 — New Buyers This Week

**Why it matters:** Demand side of the marketplace.
**Where to find it:** Admin > Users — filter `role = BUYER`, sort by `createdAt` descending.
**Weekly target (Phase I):** 1–3 new qualified buyers per week.
**Action if below:** Follow up with leads stuck at `Qualified` who haven't registered.

---

### KPI 4 — Active RFQs

**Why it matters:** An RFQ is a buyer with a specific, stated need — highest-quality signal in the funnel.
**Where to find it:** Admin > RFQs — count open items.
**Weekly target (Phase I):** 1+ open RFQ at any time.
**Action if below:** Contact registered buyers who haven't submitted RFQs yet.

---

### KPI 5 — Introductions Made This Week

**Why it matters:** The core revenue action. No introductions = no deal flow.
**Where to find it:** Deal tracker — count rows moved to `Introduction Made` this week.
**Weekly target (Phase I):** 1+ introduction per week once both sides have active participants.
**Action if below:** Review matched but unintroduced deals — what is blocking supplier confirmation?

---

### KPI 6 — Deals In Progress (Negotiation stage)

**Why it matters:** Leading indicator of revenue.
**Where to find it:** Deal tracker — count rows in `Negotiation` stage.
**Weekly target (Phase I):** 1+ deal in active negotiation.
**Action if below:** Are introductions stalling at Follow-Up? Check buyer/supplier communication.

---

### Weekly KPI Log

Add one row per week to a tab in the deal tracker:

```
Week of | New suppliers | Published | New buyers | Active RFQs | Intros made | In negotiation | Won | Lost | Notes
```

---

## 8. Supplier Ingestion

### 8.1 Create a batch

Go to **Admin > Ingestion > New Batch**, or via API:

```
POST https://fincava.com/api/admin/ingestion/batches
Body (optional): { "notes": "string" }
Response: { id, notes, createdAt }
```

Save the returned `id` — you will use it as `batchId` when adding suppliers.

### 8.2 Add suppliers to a batch

Go to **Admin > Ingestion > Add Supplier**, or via API:

```
POST https://fincava.com/api/admin/ingestion/suppliers
Body:
{
  "nombreCompleto": "string (required)",
  "municipio": "string (required)",
  "department": "string",
  "vereda": "string",
  "whatsappNumber": "string",
  "email": "string",
  "supplierType": "FARMER | COOPERATIVE | EXPORTER | PROCESSOR | DISTRIBUTOR | OTHER",
  "customSupplierType": "string (if type = OTHER)",
  "description": "string",
  "sourceUrl": "string",
  "country": "string (default: Colombia)",
  "categoryHint": "string (e.g. coffee, cacao)",
  "batchId": number
}
```

**Error: 409 Conflict** — duplicate supplier detected. To override:
```json
{
  "overrideDuplicateId": 123,
  "overrideJustification": "Re-ingesting with corrected email"
}
```

### 8.3 Enrich (optional AI step)

```
POST https://fincava.com/api/admin/ingestion/enrich
Body: { "supplierId": number }
```

Enrichment fills missing fields using web search + Claude. Not required before scoring, but improves score quality.

### 8.4 Confirm batch — triggers scoring pipeline

Go to **Admin > Ingestion > [Batch] > Confirm**, or via API:

```
POST https://fincava.com/api/admin/ingestion/batch-confirm
Body: { "leadIds": [1, 2, 3] }
```

- `leadIds` are supplier IDs (not batch ID)
- Pipeline runs asynchronously — returns immediately
- Check results by fetching each supplier a few seconds later via **Admin > Suppliers**

### 8.5 Score a single supplier manually ("Score Now")

Go to **Admin > Suppliers > [Supplier] > Score Now**, or via API:

```
POST https://fincava.com/api/admin/suppliers/:id/score
```

Pipeline runs asynchronously. Refresh the supplier record after 10–15 seconds to see updated status.

---

## 9. Scoring and Graduation

### How scoring works

1. Claude Sonnet 4.6 evaluates supplier data → writes score to `ai_outputs` table (`callType = "ONBOARD_SCORE"`)
2. `evaluateSupplier()` reads that score and applies thresholds:
   - Score < 30 → `NOT_READY`
   - Score 30–59 → `ELIGIBLE`
   - Score ≥ 60 → `SELLABLE`
3. Compliance gate runs first — if `DIAN_RUT` is not `verified` or `conditionally_approved`, supplier stays `NOT_READY` regardless of score

**Note on score thresholds:** These are set by engineering. If a supplier seems commercially strong but scores poorly, contact Irfan — do not attempt to adjust thresholds.

### Checking a supplier's evaluation

Go to **Admin > Suppliers > [Supplier]**, or via API:

```
GET https://fincava.com/api/admin/suppliers/:id
```

Key fields to check:
- `sellableStatus` — current graduation state
- `commercialScore` — 0–100
- `eligibilityStatus` — `PASS` or `FAIL`
- `lastEvaluatedAt` — when the last evaluation ran
- `nextActions` — array of missing fields or soft warnings from the evaluator

### Manual state override

Use only when the automated evaluation is wrong or you need to unblock a supplier.

```
POST https://fincava.com/api/admin/suppliers/:id/transition
Body:
{
  "toState": "NOT_READY | ELIGIBLE | SELLABLE | PUBLISHED | INACTIVE",
  "actor": "ADMIN",
  "justification": "string (required, non-empty)"
}
```

Every transition is recorded in `supplier_state_transitions` with your justification. There is no undo — use the transition endpoint again to reverse.

---

## 10. Compliance Flow

### What the compliance gate checks

Only one requirement is enforced in Phase 1: **DIAN RUT** must be in state `verified` or `conditionally_approved` in the `supplier_requirement_status` table. Without it, the supplier cannot move past `NOT_READY` regardless of commercial score.

### Patching compliance docs

Go to **Admin > Suppliers > [Supplier] > Compliance**, or via API:

```
PATCH https://fincava.com/api/admin/suppliers/:id/compliance
Body (all fields optional):
{
  "rutDian": true,
  "icaRegistro": true,
  "fitosanitarioCert": true,
  "dianExportador": true,
  "consentGiven": true
}
Response: { complianceDocs, consentGiven, fieldsUpdated, evaluation? }
```

If `evaluation` is present in the response, the patch triggered a re-evaluation — you can see the new `sellableStatus` immediately.

### Compliance requirement states (CC-1)

```
not_started
not_sure
self_serve_in_progress
assisted_in_progress
managed_service_candidate
submitted
needs_fix
conditionally_approved     ← passes compliance gate
verified                   ← passes compliance gate
rejected
```

To unblock a supplier stuck at `NOT_READY` due to compliance, the `DIAN_RUT` requirement must reach `conditionally_approved` or `verified`.

---

## 11. Publishing to Marketplace

A supplier must be in `SELLABLE` state before publishing. The publish step is always manual.

### Publish

Go to **Admin > Suppliers > [Supplier] > Publish**, or via API:

```
POST https://fincava.com/api/admin/suppliers/:id/publish
Body:
{
  "actor": "ADMIN",
  "justification": "string (required)"
}
```

- Supplier must be in `SELLABLE`
- If already `PUBLISHED` → returns `409`
- On success: supplier email sent confirming they are live

### Unpublish

Go to **Admin > Suppliers > [Supplier] > Unpublish**, or via API:

```
POST https://fincava.com/api/admin/suppliers/:id/unpublish
Body:
{
  "actor": "ADMIN",
  "justification": "string (required)"
}
```

- Supplier must be in `PUBLISHED` state
- Moves back to `SELLABLE` — not visible on marketplace but still scored

---

## 12. RFQ and Inquiry Triage

### Viewing and responding to RFQs

1. Go to **Admin > RFQs**
2. Open any RFQ — review buyer name, product, volume, deadline
3. Identify matching suppliers (Admin > Suppliers — filter PUBLISHED)
4. Contact supplier via WhatsApp — use Template 4 (§5.1)
5. Update deal tracker to `Supplier Identified`

API equivalent:
```
GET https://fincava.com/api/rfqs
GET https://fincava.com/api/rfqs/:id
```

### Viewing and responding to Inquiries

1. Go to **Admin > Inquiries**
2. New inquiries arrive with `status = PENDING`
3. Review buyer name and message
4. Route to the right supplier — contact via WhatsApp or platform message
5. Update deal tracker

API equivalent:
```
GET https://fincava.com/api/inquiries
```

### Sending a platform message to a buyer or supplier

1. Go to **Admin > Messages**
2. Click **New Conversation** (or open an existing thread)
3. Search for the user by name or email
4. Type your message and send
5. The user receives a notification and can reply via the platform

Use platform messages for formal communication (inquiry updates, document requests). Use WhatsApp for urgent or informal outreach to suppliers.

### Triage SLA

| Item | Response target |
|------|----------------|
| New inquiry (PENDING) | 24h |
| New RFQ | 24h |
| Open RFQ with no supplier response | Follow up at 48h |
| Inquiry older than 72h with no update | Escalate or close |

---

## 13. Email-Match Bridge (FIN-001 Manual SOP)

**The problem:** Ingested suppliers in the `suppliers` table have no database link to `companies` table entries (B2B seller accounts). Until FIN-001 is built, this link is manual.

**When this matters:** When a PUBLISHED supplier needs to list products under their company account.

### Manual bridge procedure

1. **Find the supplier's email** in the `suppliers` table (Admin > Suppliers > [Supplier] — check email field)
2. **Find the matching user** in the `users` table where `users.email = suppliers.email` (Admin > Users — search by email)
3. **Find the company** in `companies` where `companies.userId = users.id`
4. **Update the supplier record** to set the correct `userId` — requires direct DB access or engineering support
5. **Verify** by calling `GET https://fincava.com/api/admin/suppliers/:id`

### Product creation (admin-mediated)

```
POST https://fincava.com/api/admin/suppliers/:id/create-product
Body: { "name": "string", "pricePerKgUSD": number }
```

Uses `FINCAVA_COMPANY_ID` env var to associate the product. Verify `FINCAVA_COMPANY_ID` is correct before running.

### Bridge tracking spreadsheet

Maintain a separate tab in the deal tracker called **Bridge Map**:

| Column | What to track |
|--------|--------------|
| `suppliers.id` | Numeric ID from admin panel |
| `suppliers.email` | Farmer/supplier email |
| `companies.id` | Matched company ID |
| `users.email` | Confirmed match |
| `status` | Matched / Unmatched / Conflict |
| `notes` | Any manual resolution notes |

---

## 14. Stuck Supplier Recovery

A supplier is "stuck" when their `sellableStatus` has not updated after scoring was triggered, or when the pipeline emitted an error.

### Diagnosis

**Step 1 — Is there an AI score?**
Go to Admin > Suppliers > [Supplier] — check `lastEvaluatedAt`. If it is null or very old, scoring failed.

**Step 2 — What does the evaluation say?**
```
GET https://fincava.com/api/admin/suppliers/:id
```
Check:
- `sellableStatus` — null or NOT_READY unexpectedly?
- `eligibilityStatus` — FAIL? → compliance gate blocked it
- `lastEvaluatedAt` — is it recent?
- `nextActions` — what is the evaluator asking for?

**Step 3 — Is the supplier INACTIVE?**
Suspended suppliers cannot be re-evaluated. Restore first (§15), then re-score.

### Recovery

**Option A — Re-trigger scoring (most common):**
Admin > Suppliers > [Supplier] > Score Now, or:
```
POST https://fincava.com/api/admin/suppliers/:id/score
```
Wait 10–15 seconds, refresh the supplier page. If `lastEvaluatedAt` updated, pipeline ran.

**Option B — Fix compliance, then re-score:**
If `eligibilityStatus = FAIL`, patch compliance docs (§10) then re-score. The PATCH endpoint triggers re-evaluation automatically if an AI score exists.

**Option C — Manual state override (last resort):**
```
POST https://fincava.com/api/admin/suppliers/:id/transition
Body: { "toState": "SELLABLE", "actor": "ADMIN", "justification": "Manual override — scoring pipeline failed; supplier verified offline" }
```
Document in FINCAVA_CHANGE_LOG.md. Use only when you have verified the supplier manually.

**Option D — Check logs:**
In Replit console, search for:
```
onboard-pipeline: failed
supplierId: <id>
```
If you cannot read Replit logs, contact Irfan (sbirfan@gmail.com / +15123600118).

---

## 15. Suspension and Restoration

### Suspend a supplier

Admin > Suppliers > [Supplier] > Suspend, or:

```
POST https://fincava.com/api/admin/suppliers/:id/suspend
Body:
{
  "actor": "ADMIN",
  "justification": "string (required)"
}
```

- Works from any state
- Returns `409` if already `INACTIVE`
- Sends a suspension email to the supplier

### Restore a suspended supplier

```
POST https://fincava.com/api/admin/suppliers/:id/transition
Body:
{
  "toState": "ELIGIBLE",
  "actor": "ADMIN",
  "justification": "string (required)"
}
```

After restoring, re-score if the supplier data has changed:
```
POST https://fincava.com/api/admin/suppliers/:id/score
```

---

## 16. Supplier Exception Handling

### 16.1 Supplier Cannot Upload Documents

**Workaround:**
1. Ask supplier to photograph the document and send via WhatsApp
2. Download the photo and upload on their behalf via the admin compliance panel
3. Update the compliance requirement status to `submitted`
4. Note in FINCAVA_CHANGE_LOG.md: "Admin-assisted document upload for supplier [ID]"

---

### 16.2 Supplier Has No Email Address

**Workaround:**
1. Use `info@fincava.com` as a placeholder and note it in the supplier record
2. All communication routes via WhatsApp only
3. Flag for FIN-001 (identity bridge) resolution

**Documentation:** Note "no email — WhatsApp only" in supplier description field.

---

### 16.3 Supplier Only Communicates via WhatsApp

Standard scenario for rural Colombian farmers. Use WhatsApp templates (§5.1) for all outreach. Document key agreements by saving WhatsApp screenshots and noting decisions in FINCAVA_CHANGE_LOG.md.

---

### 16.4 Supplier Cannot Complete Onboarding

**Assessment:** Check which fields are missing (`nextActions` on supplier record). Contact supplier via WhatsApp to identify the barrier.

**Workaround by barrier type:**

| Barrier | Action |
|---------|--------|
| Literacy / language | Complete the onboarding on their behalf using data collected by phone or WhatsApp |
| Missing documents | Initiate compliance request (Template 1 or D, §5) |
| Connectivity | Offer to complete over a phone call |

---

### 16.5 Supplier Disputes AI Score

**Assessment:** Review `nextActions` — what did the evaluator flag? Is the underlying data wrong?

**Resolution:**
1. If data is wrong: correct it in the supplier record, then re-score
2. If data is correct but supplier disagrees: explain the criteria in plain language
3. If score seems genuinely wrong: contact Irfan with the `supplierId` and AI output — do not manually override until data correction path is exhausted

---

### 16.6 Supplier Fails Readiness Scoring but Is Strategically Valuable

**Options (in order):**
1. Fix the data: enrich the record, add missing certifications, correct volume — then re-score
2. Assisted compliance: initiate managed compliance case to help supplier get RUT/DIAN certified
3. Manual override with justification: if supplier is clearly ready and data cannot be completed quickly, use manual transition with a detailed justification — log in FINCAVA_CHANGE_LOG.md
4. Flag in supplier description: "Strategic supplier — prioritise compliance support"

---

### 16.7 Supplier Requires Founder-Assisted Onboarding

1. Schedule a WhatsApp call or coordinate via field officer
2. Complete the onboarding form using their verbal responses
3. Send Template 3 (§5.1) once done
4. Flag for field officer follow-up if document collection still needed

---

### 16.8 Supplier Compliance Documents Are Incomplete

**Phase I gate:** Only DIAN RUT is required to pass the compliance gate. All other documents are additive to the score but not blockers.

| Situation | Action |
|-----------|--------|
| RUT is missing | Initiate compliance request (Template 1 or D) |
| RUT present, other docs missing | Supplier can still graduate — patch `rutDian: true` and re-score |
| Documents partially legible | Flag as `needs_fix` in compliance queue, request a new copy |

---

## 17. Emergency Operating Procedures

### 17.1 Anthropic API Outage

**Symptoms:** Scoring pipeline fails, enrichment fails. Suppliers are not updating after "Score Now."

**Runbook:**
1. Check https://status.anthropic.com — confirm outage
2. Do not re-trigger scoring — it will fail again
3. Note affected suppliers in FINCAVA_CHANGE_LOG.md
4. Continue non-AI operations: compliance patching, manual transitions, buyer triage, messaging
5. When Anthropic recovers: re-trigger scoring for all affected suppliers (§14, Option A)

**Manual fallback during outage:**
For urgent cases (buyer waiting): use manual transition to `SELLABLE` with justification "Emergency manual override — Anthropic outage, supplier verified offline." Log in FINCAVA_CHANGE_LOG.md.

**Anthropic API key rotation:**
1. Generate a new key at https://console.anthropic.com
2. Log into Replit → Fincava project → Secrets tab → update `ANTHROPIC_API_KEY`
3. Restart the API server workflow in Replit
4. Verify: `GET https://fincava.com/api/health` → `{ status: "ok", db: "ok" }`
5. Test: trigger a score on a known supplier
6. Revoke the old key in the Anthropic console

---

### 17.2 Resend / Email Outage

**Symptoms:** Supplier notifications and buyer emails are not delivering.

**Runbook:**
1. Check https://status.resend.com — confirm outage
2. Do not retry sends in a loop — emails will queue and fire when service recovers
3. For urgent supplier notifications: use WhatsApp templates (§5.1)
4. For urgent buyer communications: contact directly from irfan@fincava.com
5. When Resend recovers: platform email resumes automatically — no action needed

---

### 17.3 Full Platform Outage

**Symptoms:** `GET https://fincava.com/api/health` returns an error or the site is unreachable.

**Step 1 — Diagnose:**
- Response `{ status: "degraded", db: "error" }` → database problem (go to Step 2)
- No response at all → API server is down (go to Step 3)
- Health OK but site unreachable → frontend problem (go to Step 4)

**Step 2 — Database down:**
- Check the database provider status (Neon / Supabase / Replit DB)
- If provider outage: wait for recovery
- If credentials may have changed: contact Irfan

**Step 3 — API server down (Replit restart):**
1. Go to https://replit.com — log in with Replit credentials (held by Irfan — obtain before handoff)
2. Open the Fincava project
3. In the left panel, find **Workflows** or **Processes**
4. Locate the API server workflow (typically named "api-server" or "backend")
5. Click **Restart** or **Run**
6. Wait 30 seconds, then check `GET https://fincava.com/api/health`

**Step 4 — Frontend down:**
1. In Replit, locate the frontend workflow (typically "frontend" or "web")
2. Click **Restart**
3. Wait 30 seconds, then check https://fincava.com

**Step 5 — Everything down:**
1. Restart all Replit workflows
2. Check https://status.replit.com — if Replit itself is down, wait for recovery

**Communication:** If outage exceeds 2 hours, notify active buyers and suppliers via WhatsApp/email.

---

### 17.4 Database Backup Failure

**Symptoms:** Backup did not run on schedule, or you need to trigger a manual backup.

**Manual backup trigger:**
1. Log into Replit → Fincava project → Secrets tab → copy `BACKUP_SECRET_V2`
2. Send this request (using a tool like Postman or curl in Appendix A):
   ```
   POST https://fincava.com/api/admin/backup/run
   Header: Authorization: Bearer [BACKUP_SECRET_V2 value]
   ```
3. If it errors: contact Irfan — do not proceed with schema-changing deployments until backup is confirmed

**Verification (weekly):**
- Admin > Backup — confirm last run timestamp is from today or yesterday

---

### 17.5 Failed Deployment

**Symptoms:** Platform behaves incorrectly or a feature breaks after a recent push.

**Runbook:**
1. Confirm `GET https://fincava.com/api/health` — is the server up?
2. Identify which feature broke (check the most recent commit)
3. Rollback — requires Git write access (see §18):
   ```bash
   git revert HEAD
   git push
   ```
   Replit redeploys automatically.
4. If you do not have Git write access: contact Irfan immediately via WhatsApp (+15123600118)
5. Note the failed deployment in FINCAVA_CHANGE_LOG.md

---

### 17.6 Failed Migration

**Symptoms:** After a deploy with schema changes, the API throws DB errors on affected endpoints.

**Runbook:**
1. Do not restart the server repeatedly
2. Contact Irfan immediately — WhatsApp +15123600118
3. If the platform is unusable: attempt a code rollback (§17.5)
4. Do not attempt to fix a DB migration manually

This is why pre-deploy backups are mandatory (§18).

---

## 18. Deploy Ritual

### Two-Repo Sync

**Every code change must land in both repos.** Apply to `fincava-hub` first, verify, then apply to `fincava` (production).

| Repo | Remote | Purpose |
|------|--------|---------|
| `/Users/irfan/GitHub/fincava-hub` | `git@github.com:sbirfan/FinCava-Hub.git` | Pre-production |
| `/Users/irfan/GitHub/fincava` | `git@github.com:sbirfan/fincava.git` | Production (Replit) |

**Git write access required:** Deploying and rolling back requires write access to `git@github.com:sbirfan/fincava.git`. If you are a covering operator without Git access, contact Irfan for all deployments and rollbacks — do not attempt without access.

### Pre-Deploy Checklist

```
□ Take a DB backup before any deploy with schema changes:
    POST https://fincava.com/api/admin/backup/run
    Confirm backup timestamp before proceeding
□ All required env vars are set (see Appendix A)
□ Feature flags are in the correct state (see §19)
□ Both fincava-hub and fincava repos have the change committed and typechecked
```

### Deploy Sequence (Replit)

1. Push branch to GitHub (`fincava` repo): `git push origin main`
2. Replit auto-pulls on push
3. Replit restarts: API server, frontend, sandbox
4. Run the post-deploy smoke test (below)

### Post-Deploy Smoke Test

Run in order — stop at the first failure and rollback:

```
□ GET  https://fincava.com/api/health     → { status: "ok", db: "ok" }
□ GET  https://fincava.com/api/products   → 200 with products array
□ GET  https://fincava.com/api/suppliers  → 200 with suppliers array
□ GET  https://fincava.com/api/rfqs       → 200 (may be empty)
□ Open https://fincava.com/login          → login page loads correctly
```

### Rollback

```bash
git revert HEAD        # creates a new commit that undoes the last one
git push               # Replit redeploys automatically
```

Do not `git reset --hard` on main. Revert preserves audit history.
For DB migration rollback: contact Irfan. Do not attempt manually.

---

## 19. Feature Flags Summary

All flags default to **off** if not explicitly set to `"true"` or `"1"`.

| Feature | Business meaning | Current state |
|---------|-----------------|---------------|
| `ENABLE_TRANSACTIONS` | Buyers can place orders directly | Off — concierge only |
| `ENABLE_MATCHING` | AI buyer-supplier matching visible to buyers | Off — admin only |
| `ENABLE_INTELLIGENCE_PUBLIC` | Public trust scores and analytics | Off — legal review needed |
| `ENABLE_FINANCE` | Credit and loan features | Off — future phase |
| `ENABLE_LOGISTICS` | Shipment tracking features | Off — future phase |

**Rule:** Never turn a flag on in production without engineering sign-off. Frontend and backend flags must always match. See Appendix A for the full technical reference.

---

## 20. Endpoint Quick Reference

All URLs use the production domain `https://fincava.com`.

### Supplier Pipeline

| Action | Method | Path |
|--------|--------|------|
| Create ingestion batch | POST | `/api/admin/ingestion/batches` |
| Add supplier to batch | POST | `/api/admin/ingestion/suppliers` |
| Enrich supplier | POST | `/api/admin/ingestion/enrich` |
| Confirm batch (trigger scoring) | POST | `/api/admin/ingestion/batch-confirm` |
| Score single supplier | POST | `/api/admin/suppliers/:id/score` |
| Get supplier detail | GET | `/api/admin/suppliers/:id` |
| Manual state transition | POST | `/api/admin/suppliers/:id/transition` |
| Publish supplier | POST | `/api/admin/suppliers/:id/publish` |
| Unpublish supplier | POST | `/api/admin/suppliers/:id/unpublish` |
| Suspend supplier | POST | `/api/admin/suppliers/:id/suspend` |
| Patch compliance docs | PATCH | `/api/admin/suppliers/:id/compliance` |

### Buyer & RFQ Operations

| Action | Method | Path |
|--------|--------|------|
| List RFQs | GET | `/api/rfqs` |
| Get RFQ detail | GET | `/api/rfqs/:id` |
| List inquiries | GET | `/api/inquiries` |
| List users | GET | `/api/admin/users` |

### Admin Operations

| Action | Method | Path |
|--------|--------|------|
| Health check | GET | `/api/health` |
| Deep health check | GET | `/api/healthz` |
| Trigger backup | POST | `/api/admin/backup/run` |

All `/api/admin/*` endpoints require an active ADMIN session cookie.

---

## Appendix A — Technical Reference

*This section is for engineering use or advanced operator scenarios. Normal daily operations do not require anything below.*

### A.1 Deploy Commands

```bash
# Install dependencies
pnpm install

# Typecheck before deploy
pnpm run typecheck

# Build
pnpm run build

# Start API server
pnpm --filter @workspace/api-server run start
```

### A.2 Server Ports (local development only)

| Service | Port |
|---------|------|
| API server | 8080 |
| Frontend (dev) | 5173 |
| Frontend (Replit) | 25876 |
| Mockup sandbox | 8081 |

### A.3 Full Env Var Reference

| Var | Required | Purpose |
|-----|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | AI scoring, enrichment, document generation |
| `FINCAVA_COMPANY_ID` | Yes | Company ID used for product creation |
| `UPLOAD_TOKEN_SECRET` | Yes | Signs file upload tokens |
| `APP_URL` | Yes | Used in supplier graduation and notification emails |
| `ADMIN_EMAIL` | Yes | Operator inbox for admin alerts and contact form leads |
| `REPLIT_DOMAINS` | Replit only | Enables Replit-specific cookie and proxy settings |
| `CORS_ORIGIN` | Production | Comma-separated allowed origins |
| `RESEND_API_KEY` | Email features | Transactional email delivery |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | WhatsApp | Supplier WhatsApp notifications |
| `TWILIO_WHATSAPP_FROM` | WhatsApp | Sender number |
| `BACKUP_SECRET_V2` | Backup | Authorises `POST /api/admin/backup/run` |

### A.4 Feature Flag Full Reference

| Backend var | Frontend var | Controls |
|-------------|-------------|----------|
| `ENABLE_TRANSACTIONS` | `VITE_ENABLE_TRANSACTIONS` | Orders, order dashboards |
| `ENABLE_FINANCE` | `VITE_ENABLE_FINANCE` | Credit, loans |
| `ENABLE_LOGISTICS` | `VITE_ENABLE_LOGISTICS` | Shipments, milestones |
| `ENABLE_MATCHING` | — (admin only) | AI buyer-supplier matching |
| `ENABLE_INTELLIGENCE_PUBLIC` | — | Public analytics, trust scores |

**Rule:** Backend and frontend flags must always match.

### A.5 AI Model Configuration

Do not override in production without engineering approval.

| Env var | Default | Used for |
|---------|---------|----------|
| `ANTHROPIC_SCORING_MODEL` | `claude-haiku-4-5` | Supplier commercial scoring |
| `ANTHROPIC_DOCUMENT_MODEL` | `claude-sonnet-4-6` | Compliance document generation |
| `ANTHROPIC_ENRICHMENT_MODEL` | `claude-sonnet-4-6` | Supplier data enrichment |
| `ANTHROPIC_DISCOVERY_MODEL` | `claude-haiku-4-5` | Supplier discovery |
| `ANTHROPIC_TRANSLATION_MODEL` | `claude-haiku-4-5` | Translation |

### A.6 Score Thresholds

Defined in `lib/config/thresholds.ts`. Current version: `v0_pre_buyer_calls`. Contact engineering before any change.

### A.7 Git Reference

```bash
# Revert last commit (safe — preserves history)
git revert HEAD && git push

# Check what changed in last commit
git show HEAD --stat

# View recent commits
git log --oneline -10

# Check repo status
git status
```

### A.8 Making API Calls (curl examples)

For procedures that require direct API calls (not available via admin UI):

```bash
# Health check
curl https://fincava.com/api/health

# Trigger manual backup (replace TOKEN with BACKUP_SECRET_V2 value)
curl -X POST https://fincava.com/api/admin/backup/run \
  -H "Authorization: Bearer TOKEN"

# Score a supplier (replace ID and SESSION with real values)
curl -X POST https://fincava.com/api/admin/suppliers/ID/score \
  -H "Cookie: session=SESSION"
```

For session cookie: open Chrome DevTools on https://fincava.com while logged in → Application tab → Cookies → copy the session cookie value.

### A.9 Database

- Engine: PostgreSQL 16
- ORM: Drizzle ORM
- Migrations: `lib/db/src/migrate.ts`
- Schema: `lib/db/src/schema/`

Never run `drizzle push` on production. Use `drizzle migrate` only. Contact engineering before any schema change.
