# Buyer Persona — Source of Truth

Derived from:

* Codebase (routes, schema, frontend)
* ops/post_mvp_plan.md
* execution_map.md

---

## 0. Classification

* CURRENT_STATE → validated from code
* TARGET_STATE → defined in ops roadmap
* GAP → difference between the two

---

## 1. Definition

A Buyer is an authenticated user seeking to discover, evaluate, and transact with suppliers through product listings and marketplace tools.

---

## 2. CURRENT_STATE — Capabilities

### Public Access (No Auth)

* Product marketplace (`/marketplace`)
* Supplier list (`/suppliers`) ⚠
* Supplier detail (`/supplier/:id`)
* RFQ listings (`/rfqs`)
* Supplier marketplace (`/supplier-marketplace`)

---

### Buyer Dashboard (Authenticated)

* Orders, inquiries, messaging
* RFQs, analytics, finance
* Profile management

---

## 3. CURRENT_STATE — Marketplace Reality

### Product Marketplace

* Shows ALL products
* NOT gated by supplier readiness
* Includes:

  * pricing
  * certifications
  * reviews
  * supplier identity

---

### ⚠ CORE GAP — Marketplace / Graduation Disconnect

CURRENT_STATE:

* product discovery ignores supplier sellableStatus

IMPACT:

* buyers cannot distinguish qualified suppliers
* graduation system has no effect on buyer experience

---

### Supplier Marketplace

CURRENT_STATE:

* separate route
* shows SELLABLE/PUBLISHED suppliers
* minimal data (name, location, badge)

GAP:

* no products
* no engagement path
* not integrated into buyer journey

---

## 4. CURRENT_STATE — Data Exposure Risk

### ⚠ HIGH RISK — Public Supplier Dataset

CURRENT_STATE:

* `/api/suppliers` publicly accessible
* includes internal fields (commercialScore, evaluation data)

IMPACT:

* exposes internal scoring logic
* exposes non-qualified suppliers

TARGET_STATE:

* restricted OR sanitized endpoint

---

## 5. CURRENT_STATE — Buyer Limitations

* Cannot filter by supplier readiness
* Cannot search supplier marketplace
* Cannot assess supplier quality beyond reviews
* Cannot initiate interaction from supplier marketplace
* No linkage between suppliers and products (readiness-wise)

---

## 6. Buyer — Operational Intent

Buyer wants to:

* find reliable suppliers
* evaluate quality and readiness
* compare options
* initiate transactions

---

CURRENT_STATE:

* discovery: ✔
* evaluation: ❌
* trust signals: PARTIAL
* decision support: ❌

---

## 7. TARGET_STATE (Ops-defined)

Buyer should be able to:

* filter by:

  * location
  * supplier type
  * readiness
* search suppliers
* view:

  * products
  * certifications
  * readiness signals
* compare suppliers
* initiate contact directly
* see graduation status integrated into marketplace

---

## 8. GAP (Target vs Current)

### Marketplace

* no readiness filtering
* no supplier-product integration
* no search / pagination

---

### Data

* readiness signal not exposed
* supplier evaluation not visible

---

### UX

* supplier marketplace is disconnected
* no engagement path

---

## 9. Role Summary

| Capability       | Intended | Actual                      |
| ---------------- | -------- | --------------------------- |
| Browse products  | Yes      | Yes                         |
| Browse suppliers | Yes      | Yes                         |
| View readiness   | Yes      | No                          |
| View scores      | No       | Yes (via public endpoint) ⚠ |
| Engage suppliers | Yes      | Partial                     |
| Admin actions    | No       | No                          |

---

## 10. Summary

The buyer today:

* Can discover products
* Cannot evaluate supplier readiness
* Cannot make informed decisions based on system signals

The system:

* Produces readiness signals
* Does NOT expose or use them in buyer experience

---

END
