# Epic 2 — Product Enrichment & Marketplace Expansion

## 1. Objective

Extend the supplier graduation system into a buyer-usable marketplace by introducing product-level data and enabling basic discovery.

---

## 2. System Overview

Epic 2 builds on Epic 1 by adding structured product data linked to suppliers.

The system evolves from:

* “Which suppliers are ready?”

To:

* “What can each supplier offer?”

Epic 2 introduces:

* Product data model
* Product CRUD APIs
* Initial marketplace enrichment (supplier + products)

Core principle:

* Do NOT modify the graduation pipeline
* Only enrich the data available to buyers

---

## 3. User Experience Flow

Step-by-step:

1. Supplier completes onboarding (Epic 1)

2. Supplier (or admin) adds products:

   * name
   * category
   * description

3. System stores products linked to supplier

4. Marketplace query:

   * fetches SELLABLE / PUBLISHED suppliers
   * attaches associated products

5. Buyer views marketplace:

   * sees supplier + product offerings

6. Optional filtering (Phase 1 minimal):

   * category

---

Flow Summary:

Supplier Ready
→ Add Products
→ Products Stored
→ Marketplace Query
→ Buyer Views Suppliers + Products

---

## 4. Architecture

### 1. Frontend Layer

* Displays supplier + product listings
* Minimal filtering (category)
* No complex UI logic

---

### 2. API Layer

New endpoints:

* POST /api/products
* GET /api/products?supplierId=...
* PATCH /api/products/:id
* DELETE /api/products/:id

Extended endpoint:

* GET /api/suppliers/marketplace

Responsibilities:

* Input validation
* Supplier existence checks
* Delegation to DB layer

---

### 3. Service Layer (Minimal)

No new complex service layer introduced yet.

Logic remains:

* Thin route handlers
* Direct DB interaction (consistent with Epic 1)

Future service layer can be introduced if complexity grows.

---

### 4. Database Layer

#### New Table: products

Fields:

* id (PK)
* supplier_id (FK → suppliers.id)
* name (required)
* category (required)
* description (optional)
* created_at (timestamp)

Constraints:

* supplier_id must exist
* ON DELETE CASCADE (cleanup when supplier removed)

---

### 5. Marketplace Query Layer (Extended)

Current behavior:

* returns supplier list

New behavior:

* attaches products per supplier

Still constrained:

* no joins beyond basic relationship
* no heavy filtering
* no ranking logic

---

### 6. Observability

* Use existing logger
* No new logging systems introduced
* Errors handled consistently with Epic 1

---

## 5. Key Decisions

### 1. Product Layer is Additive

* No changes to scoring or evaluation
* Avoid destabilizing Epic 1 pipeline

---

### 2. Keep Product Model Minimal

* No pricing
* No inventory
* No availability
* Focus only on structure

---

### 3. No Overengineering

* No search engine
* No indexing beyond basic DB indexes
* No premature optimization

---

### 4. Marketplace Remains Simple

* Supplier-first view with attached products
* Avoid building full e-commerce system

---

## 6. Data Model

### New

products:

* id
* supplier_id
* name
* category
* description
* created_at

---

### Existing (unchanged)

* suppliers
* compliance_docs
* supplier_evaluations
* supplier_state_transitions
* ai_outputs

---

## 7. API Surface

### Product APIs

POST /api/products
→ create product

GET /api/products?supplierId=...
→ list products for supplier

PATCH /api/products/:id
→ update product

DELETE /api/products/:id
→ remove product

---

### Marketplace API (extended)

GET /api/suppliers/marketplace

Enhancements:

* include products in response
* optional category filter (Phase 1)

---

## 8. Reliability & Safeguards

* FK constraint ensures product → supplier integrity
* Validate supplier exists before insert
* No silent failures
* Consistent logging

No async complexity introduced in this epic.

---

## 9. Known Limitations

* No search capability
* No ranking logic
* No buyer accounts
* No pricing or availability
* No certification filtering yet

---

## 10. Phase II / Future Enhancements

### Marketplace Expansion

* pagination
* filtering (location, certification)
* search

---

### Product Expansion

* pricing
* availability
* units / quantities

---

### Buyer Layer

* buyer accounts
* inquiry workflows
* supplier contact

---

### Certification Mapping

* structured certification filters
* compliance → marketplace mapping

---

## 11. Status

* Epic: In Progress
* Dependency: Epic 1 completed ✔
* Execution strategy: Thin slices (incremental)

### Completed Tickets

| Ticket | Date | Description |
|---|---|---|
| T1 | 2026-04-24 | `SupplierOnboardingInput` interface wired into `POST /suppliers/onboard`. Normalization layer (`typedInput`) introduced. Additive only — zero runtime changes |
| T2 | 2026-04-24 | `buildScoringInput` abstraction layer — extracts 4 DB reads from `scoreSupplier` into typed `ScoringInput` contract. Fresh-read per retry preserved |

### Pending Tickets

| Ticket | Description | Dependency |
|---|---|---|
| T3 | Onboarding validation layer — enforce typed inputs, resolve economics string→integer mismatch (M1) | T1 complete |
| T4 | Compliance alignment — promote onboarding compliance signals → compliance_docs (resolve H5 partial gap) | T3 complete |
| T5 | Sanitized buyer supplier detail route — replace admin-only GET /suppliers/:id with buyer-safe endpoint | T4 complete |
| T6 | Marketplace enrichment — integrate graduation signals (sellableStatus) into product marketplace | T5 complete |

---

END
