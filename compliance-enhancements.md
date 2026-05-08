# Compliance Concierge — Enhancement List

Current state: CC-1 through CC-5 core is complete and live.
This file captures all known enhancement opportunities, grouped by surface area.
Nothing here is in scope until explicitly approved.

---

## 1. Admin Experience

### Queue & Review
- **Bulk review actions** — select multiple requirements and approve/reject in one action, reducing click cost for high-volume days.
- **Queue filters & sort** — filter by requirement code (DIAN_RUT, ICA, FNC), severity (CRITICAL / MEDIUM), age (oldest first), and review status. Currently the queue is ranked by a fixed score.
- **Expiry tracking view** — dedicated tab showing requirements whose `expiresAt` is within 30 / 60 / 90 days, before they lapse.
- **Re-evaluate single requirement** — trigger AI re-score only for one requirement rather than the full supplier evaluation.
- **Inline document comparison** — when admin opens a review, show the previous approved document alongside the new upload for quick diff.
- **Flag for legal review** — a third decision state that routes the case to a compliance officer instead of directly accepting/rejecting.

### Reporting & Export
- **Compliance report CSV export** — download the aggregate stats from `GET /api/admin/compliance/report` as a spreadsheet for investor or regulatory reporting.
- **Audit trail export per supplier** — admin downloads the full `admin_compliance_reviews` history for a given supplier as PDF or CSV.
- **Cohort dashboard** — chart showing how the supplier population moves through `not_started → submitted → verified` over time (weekly cohorts).

### Managed Cases
- **Case assignment** — assign a managed service case to a specific staff member; case list shows owner.
- **SLA tracking** — compute time from case open to close; highlight cases breaching a configurable SLA (e.g., 5 business days).
- **Case close workflow** — closing a case requires a resolution note and triggers a status email to the supplier.
- **WhatsApp trigger confirmation** — currently the managed case open just logs; wire a real outbound WhatsApp message via the Fincava WhatsApp Business number when a case is created.

---

## 2. Officer Experience

### Mobile & Connectivity
- **Offline mode / PWA** — cache guidance steps and the intake form locally so field officers with poor rural connectivity can complete the flow and sync when back online.
- **Camera capture for document upload** — replace the file picker with a native camera shutter on iOS/Android so officers can photograph physical documents in the field without a separate step.
- **Batch onboarding mode** — officer handles multiple suppliers back-to-back in one session without returning to the officer home screen between each.

### Assignment & Routing
- **Officer → supplier assignment** — track which officer is responsible for which supplier; compliance queue shows the assigned officer's name; officers see only their assigned suppliers by default.
- **Reassignment log** — record when a supplier's assigned officer changes, so audit history is preserved.

---

## 3. Supplier Experience

### Notifications
- **Status change emails** — automated Resend email when a requirement moves from `submitted` → `verified` or → `needs_fix`, including the visible note from the admin review.
- **Expiry alerts** — 30-day and 7-day warning emails before a verified certificate expires, prompting the supplier to re-upload.
- **In-dashboard notification dot** — red badge on the compliance widget when any requirement needs attention (needs_fix or expiring).

### Guidance & Self-Service
- **Bilingual guidance** — all `compliance_enablement_flows` step content available in both EN and ES; supplier sees their preferred language.
- **Step completion persistence** — if a supplier starts the guided flow and closes the browser, their progress is saved and resumed on next visit.
- **Compliance certificate download** — once all CRITICAL requirements are verified, supplier can download a Fincava-issued compliance summary PDF for use in buyer negotiations.
- **Document version history** — supplier can see every document they have uploaded for a requirement, not just the current one.

### Export Mode
- **Multi-category export mode** — current implementation defaults `productCategory = "coffee"`; extend so suppliers with multiple product lines can declare a mode per category.
- **Evidence upload for intermediary mode** — when mode is `intermediary`, prompt supplier to upload the intermediary agreement document; link to `compliance_documents_v2`.

---

## 4. Buyer Experience

- **Compliance filter in marketplace sidebar** — add "Verified Exporter (DIAN)", "ICA Certified", "FNC Member" checkboxes alongside the existing impact filters.
- **Badge tooltips** — on hover/tap of a compliance badge on a product card, explain in plain language what the badge means and who issued it.
- **Compliance score on product cards** — surface a compact compliance tier (Basic / Silver / Gold / Platinum) derived from verified requirement count, alongside the existing trust score.
- **Compliance tab on supplier profile page** — dedicated section showing which requirements are verified, with issue date and expiry; gives buyers confidence before opening an RFQ.

---

## 5. Backend & Platform

### Performance & Reliability
- **Compliance signal cache** — `GET /api/suppliers/:id/compliance-signals` is called on every product page load; add a short TTL cache (e.g., 5 minutes) backed by an in-memory store or Redis to reduce DB pressure.
- **Automated expiry cron** — a scheduled job (daily) that scans `supplier_requirement_status` for rows where `expiresAt < NOW()` and sets their state back to `not_started`, then enqueues a notification email.
- **Idempotency key on document confirm** — prevent duplicate `compliance_documents_v2` rows if a client retries the upload confirm request.

### Extensibility
- **Requirement registry admin UI** — currently the `REQUIREMENT_REGISTRY` is hard-coded in `graduation-service.ts`; move it to the database so new requirement codes can be added without a deploy.
- **Enablement flow content editor** — admin can create/edit `compliance_enablement_flows` steps from the admin panel instead of requiring a seed script.
- **Webhook on PUBLISHED state** — outbound POST to a configurable URL when a supplier reaches the PUBLISHED graduation state; enables integration with partner CRMs.
- **Feature flag: ENABLE_COMPLIANCE** — wrap all compliance routes and UI behind a flag consistent with the existing `ENABLE_TRANSACTIONS` / `ENABLE_FINANCE` pattern, so the layer can be toggled per environment.

### Security & Audit
- **Rate limit on document upload URL endpoint** — the storage presigned URL route is currently only auth-gated; add a per-user rate limit (e.g., 20 requests/hour) to prevent abuse.
- **Admin action reason required** — enforce that `POST /api/admin/compliance/review/:id` always includes `internalNote` when the decision is `needs_fix` or `rejected`, making the audit trail self-documenting.

---

## 6. AI / Scoring

- **Document pre-screening via Vision AI** — when a supplier uploads a document, run an async Claude vision check to flag obvious issues (wrong document type, low image quality, non-Spanish text where Spanish is expected) before it reaches the admin queue.
- **Suggested review decision** — alongside the document in the admin review modal, show an AI-generated recommendation (Verified / Needs Fix / Escalate) with a one-line rationale; admin confirms or overrides.
- **Risk pattern flagging** — if a supplier's combination of requirements has a known risk pattern (e.g., ICA submitted but DIAN not started), surface a contextual warning in the compliance queue.
- **AI-generated compliance summary** — extend the existing `POST /api/admin/suppliers/:id/compliance-document` to produce a formatted, investor-grade summary of the supplier's verified compliance status.

---

## 7. Reporting & Analytics

- **Compliance funnel chart** — in the admin analytics dashboard, a bar or funnel chart showing how many suppliers are at each requirement state across the full platform.
- **Time-to-verification metric** — track and display the median number of days from `submitted` to `verified` per requirement code; identifies bottlenecks.
- **Officer productivity report** — how many submissions each officer facilitated per week/month.
- **Supplier drop-off report** — suppliers who started but have not progressed their compliance in N days; used for re-engagement outreach.

---

## Priority Suggestion (first pass)

| Priority | Item | Effort |
|---|---|---|
| High | Status change emails to supplier | Low |
| High | Compliance filter in marketplace | Low |
| High | Expiry tracking admin view | Low |
| High | Queue filters & sort | Medium |
| High | Automated expiry cron | Medium |
| Medium | Document pre-screening via Vision AI | Medium |
| Medium | Officer → supplier assignment | Medium |
| Medium | Compliance certificate download | Medium |
| Medium | Multi-category export mode | Low |
| Medium | Bulk review actions | Medium |
| Medium | Requirement registry admin UI | High |
| Low | Offline mode / PWA for officers | High |
| Low | Webhook on PUBLISHED state | Low |
| Low | Officer productivity report | Medium |
