# Buyer Persona — Current State + Target
*Derived from: codebase (routes, schema, App.tsx) + ops/post_mvp_plan.md (intent)*
*Validation key: CONFIRMED = in code | PARTIAL = exists but differs | MISSING = not in code | INTENT = from roadmap only*

---

## 1. Identity & Auth

Buyers register and authenticate via the standard auth flow.

| Field | Table/Column | Status |
|---|---|---|
| Email | `users.email` | CONFIRMED |
| Password (hashed) | `users.password_hash` | CONFIRMED |
| Role | `users.role = BUYER` | CONFIRMED |
| First/last name | `profiles.first_name`, `profiles.last_name` | CONFIRMED |
| Phone | `profiles.phone` | CONFIRMED |
| Country | `profiles.country` | CONFIRMED |
| Language preference | `profiles.language` | CONFIRMED |
| Avatar URL | `profiles.avatar_url` | CONFIRMED |

---

## 2. What Buyers Can Access Today (CONFIRMED)

### Public (no login required)
- **Product marketplace** (`/marketplace`) — all active products, no graduation gate applied
- **Supplier list** (`/suppliers`) — all suppliers regardless of graduation status, includes commercial score ⚠
- **Supplier detail** (`/supplier/:id`) — individual supplier profile
- **RFQ browse** (`/rfqs`) — request-for-quote listings
- **Supplier marketplace** (`/supplier-marketplace`) — SELLABLE/PUBLISHED suppliers only, validation surface, not product marketplace

### Buyer Dashboard (BUYER role, authenticated)
| Route | Page | Status |
|---|---|---|
| `/dashboard` | Overview | CONFIRMED |
| `/dashboard/inquiries` | Buyer inquiries | CONFIRMED |
| `/dashboard/orders` | Order list | CONFIRMED |
| `/dashboard/orders/:id` | Order detail | CONFIRMED |
| `/dashboard/messages` | Messaging | CONFIRMED |
| `/dashboard/market-intel` | Market intelligence | CONFIRMED |
| `/dashboard/analytics` | Analytics | CONFIRMED |
| `/dashboard/finance` | Trade finance | CONFIRMED |
| `/dashboard/rfqs` | RFQ management | CONFIRMED |
| `/dashboard/profile` | Profile settings | CONFIRMED |

---

## 3. What Buyers See on the Marketplace — Field Audit

### Current product marketplace (`/products`)
No linkage to graduation status. Products are not gated by `sellableStatus`.

| Field | Source | Buyer-visible | Status |
|---|---|---|---|
| Product name, category | `products` | Yes | CONFIRMED |
| Price | `products` | Yes | CONFIRMED |
| Certifications | `products` linked | Yes | CONFIRMED |
| Origin story | `origin_stories` | Yes | CONFIRMED |
| Reviews | `reviews` | Yes | CONFIRMED |
| Supplier identity | via join | Yes | CONFIRMED |
| Supplier graduation status | — | No | MISSING — no filter or display |

### Current supplier marketplace (`/supplier-marketplace` — validation surface only)
| Field | Status |
|---|---|
| Supplier name | CONFIRMED |
| Location (municipio + department) | CONFIRMED |
| Sellable status badge (SELLABLE/PUBLISHED) | CONFIRMED |
| Product info | MISSING |
| Certifications | MISSING |
| Pricing | MISSING |
| Commercial score | MISSING |
| Contact / engagement | MISSING |
| Pagination | MISSING |
| Filters | MISSING |
| Search | MISSING |

---

## 4. What Is Missing (Current Buyer Experience Gaps)

| Gap | Impact | Source |
|---|---|---|
| No graduation gate on product marketplace | Buyers can discover products from NOT_READY suppliers | CONFIRMED gap |
| Supplier marketplace is a validation surface, not buyer-ready | No product data, no engagement path | CONFIRMED gap |
| No buyer-visible graduation signal on product cards | Buyers cannot assess supplier readiness | CONFIRMED gap |
| No search or filter on supplier marketplace | No way to narrow by crop, location, or readiness | CONFIRMED gap |
| No pagination on supplier marketplace | Hardcoded `LIMIT 20` | CONFIRMED gap |
| No contact or inquiry path from supplier marketplace | Dead end after viewing SELLABLE suppliers | CONFIRMED gap |

---

## 5. Target State (INTENT — from ops/post_mvp_plan.md + ops/execution_map.md)

These items are roadmap intent, not current code.

### Marketplace expansion (Slice 3 Phase 2 — Not Started)
| Feature | Intent |
|---|---|
| Pagination (limit + cursor/offset) | INTENT |
| Location filter | INTENT |
| Supplier type filter | INTENT |
| Readiness filter | INTENT |
| Text search | INTENT |
| Sorting (recency, readiness) | INTENT |
| Product-level data on supplier cards | INTENT |
| Certification badges | INTENT |
| Readiness signals mapped to buyer needs | INTENT |
| Public vs authenticated access model | INTENT |
| Role-based visibility | INTENT |

### Buyer experience decisions still open
- Should graduation status appear on the product marketplace?
- Should buyers be able to filter by pathway?
- Is the supplier marketplace (`/supplier-marketplace`) merged into product marketplace or kept separate?

---

## 6. Role Summary

| Capability | BUYER |
|---|---|
| Browse products | Yes (all, no graduation gate) |
| Browse suppliers | Yes (all, no graduation gate) |
| View SELLABLE/PUBLISHED suppliers | Yes (via `/supplier-marketplace`) |
| Submit inquiries | Yes |
| Submit RFQs | Yes |
| Create/manage orders | Yes |
| Access trade finance | Yes |
| Messaging | Yes |
| View compliance / AI scores | No (but public endpoint exposes scores — see supplier persona gap) |
| Admin actions | No |
