# Fincava MVP & End-to-End Validation Plan

Derived from:

* Existing system (Epic 1 completed)
* supplier_persona.md
* onboarding_flow.md
* buyer_persona.md
* system_gap_analysis.md

---

## 0. Objective

Validate that the current system can support a **real end-to-end transaction** between buyer and supplier.

MVP is NOT feature completeness.

MVP = **first successful, repeatable transaction with value exchange**

---

## 1. Current System Reality (Starting Point)

### What Already Exists

✔ Supplier onboarding pipeline
✔ AI scoring + evaluation system
✔ Supplier lifecycle (NOT_READY → SELLABLE → PUBLISHED)
✔ Admin controls (transition + compliance patch)
✔ Supplier marketplace (thin validation surface)
✔ Product marketplace (ungated)

---

### What Does NOT Exist (Yet)

❌ Buyer decision support (readiness visibility)
❌ Supplier-buyer connection flow
❌ Marketplace integration with graduation
❌ Supplier self-service visibility
❌ Transaction execution layer

---

## 2. MVP Definition (Reframed)

### MVP = End-to-End Flow

```text
Supplier onboarded
→ evaluated (SELLABLE)
→ visible in marketplace
→ buyer discovers supplier
→ buyer engages supplier
→ transaction initiated
→ value exchanged (payment or commitment)
```

---

### Success Criteria

* Buyer expresses trust (engagement)
* Buyer initiates transaction
* Supplier participates
* Monetary signal observed (payment / commitment)

---

## 3. Thin Slice Validation Strategy

We DO NOT build broadly.

We validate a **single vertical slice**:

---

### Slice 1 — Supply Creation

* Onboard supplier
* Fix compliance (admin patch if needed)
* Ensure SELLABLE status

---

### Slice 2 — Visibility

* Supplier appears in:

  * `/supplier-marketplace` (already working)

---

### Slice 3 — Buyer Exposure

* Buyer manually shown suppliers (even outside UI if needed)

---

### Slice 4 — Engagement

* Manual introduction (email / WhatsApp / call)
* Capture interaction

---

### Slice 5 — Transaction

* Coordinate transaction manually
* Capture outcome

---

## 4. Critical Gaps (Integrated from System Analysis)

### G1 — Compliance Input Disconnect

* Onboarding inputs do not affect eligibility
* Must be manually patched

→ ACCEPT for MVP (do not fix yet)

---

### G2 — Marketplace / Graduation Disconnect

* Product marketplace ignores supplier readiness

→ DECISION REQUIRED:

* Use supplier marketplace only for validation

---

### G3 — Supplier Invisibility

* Supplier cannot see their own status

→ ACCEPT for MVP (admin-driven)

---

### G4 — Public Supplier Dataset Exposure

* `/api/suppliers` exposes internal data

→ MITIGATE before external testing

---

### G5 — Async Job Durability

* No queue for scoring

→ ACCEPT risk for MVP (low volume)

---

## 5. Buyer Experience Strategy (MVP)

We do NOT build full UX yet.

---

### CURRENT_STATE

* Buyer can see products
* Cannot evaluate supplier readiness
* Cannot filter effectively

---

### MVP APPROACH

* Use:

  * `/supplier-marketplace` (curated list)
* Supplement with:

  * manual curation
  * direct communication

---

### KEY PRINCIPLE

```text
Buyer experience = curated + assisted, not self-serve
```

---

## 6. Supplier Experience Strategy (MVP)

### CURRENT_STATE

* Supplier submits onboarding
* No visibility
* No control

---

### MVP APPROACH

* Admin-driven progression
* Manual communication with supplier

---

### KEY PRINCIPLE

```text
Supplier experience = assisted onboarding, not productized
```

---

## 7. Internal Ops Layer (Critical)

This is your REAL MVP engine.

---

### Responsibilities

* Validate supplier data
* Update compliance (admin route)
* Trigger evaluation if needed
* Curate supplier list
* Match buyers manually
* Facilitate transactions

---

### Reality

```text
System = backend
Ops = product
```

---

## 8. What NOT to Build (Critical Discipline)

DO NOT BUILD:

❌ Full supplier dashboard
❌ Full buyer filtering/search
❌ Automated matching
❌ Job queue
❌ Compliance unification
❌ Product gating

---

## 9. Claude Usage (Updated Role)

Claude is NOT designing from scratch.

Claude is used to:

* Analyze system gaps
* Propose minimal fixes
* Validate flows
* Prevent overbuilding
* Assist decision-making

---

## 10. Monetization Validation

### PRIMARY TEST

Can we get a buyer to:

* Pay for access
  OR
* Commit to a transaction

---

### METHOD

* Concierge approach
* Direct outreach
* Manual coordination

---

## 11. Execution Plan

---

### Phase 1 — Immediate (Next 1–2 Weeks)

* Fix ICA sync (if needed for reliability)
* Restrict `/api/suppliers` (security)
* Onboard 3–5 suppliers
* Make at least 2 SELLABLE

---

### Phase 2 — Buyer Validation

* Identify 3–5 buyers
* Present curated suppliers
* Track:

  * interest
  * engagement
  * conversion

---

### Phase 3 — First Transaction

* Facilitate manually
* Capture:

  * friction points
  * decision factors
  * willingness to pay

---

### Phase 4 — Iterate

* Refine:

  * supplier selection
  * buyer messaging
  * trust signals

---

## 12. Risks (Real, Not Theoretical)

### HIGH

* No buyer demand
* Weak supplier quality
* Trust not established

---

### MEDIUM

* Manual ops overload
* Data inconsistencies

---

### LOW

* Technical scalability (not relevant yet)

---

## 13. Success Definition

You succeed when:

* A buyer completes a transaction
* The process can be repeated
* Value is clear to both sides

---

## 14. Summary

You already built:

```text
Supply system (onboarding + evaluation)
```

Now you must validate:

```text
Demand + transaction layer
```

The biggest risk is NOT technical.

It is:

```text
Building more without proving value
```

---

END
