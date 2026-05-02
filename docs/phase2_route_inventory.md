# Phase 2 — Route Inventory
**Task:** P2-R0-ROUTE-INVENTORY  
**Status:** COMPLETE  
**Generated:** 2026-05-02  
**HEAD at generation:** `2bb2424`  
**Classification basis:** `docs/SOURCE_OF_TRUTH_ROADMAP.md` Layer definitions (I / II / III)

---

## 1. Scope & Conventions

All backend routes are mounted under `/api` by the reverse proxy. Routes in this document are listed **without the `/api` prefix** as they appear in source. Auth column values:

| Symbol | Meaning |
|---|---|
| PUBLIC | No authentication required |
| AUTH | `requireAuth` middleware |
| AUTH+VER | `requireAuth` + `requireVerifiedEmail` |
| ADMIN | `requireAuth` + `requireAdmin` (adminOnly chain) |
| RATE | Express rate-limiter applied |

Frontend routes use Wouter. `PrivateRoute` enforces JWT auth + role check client-side.

---

## 2. Backend Route Inventory

### 2.1 Infrastructure

**File:** `artifacts/api-server/src/routes/health.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/healthz` | PUBLIC | Liveness check — returns `{"status":"ok"}` |

**File:** `artifacts/api-server/src/routes/storage.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/storage/uploads/request-url` | PUBLIC | Request presigned URL for file upload |
| GET | `/storage/public-objects/*filePath` | PUBLIC | Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS |
| GET | `/storage/objects/*path` | PUBLIC¹ | Serve private object entities (ACL hooks stubbed) |

¹ Auth guard is present in code but commented out; effectively public in current deployment.

---

### 2.2 Layer I — CORE

#### Auth  
**File:** `artifacts/api-server/src/routes/auth.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | PUBLIC | Register new user (BUYER or SUPPLIER) |
| POST | `/auth/login` | PUBLIC | Login — returns JWT |
| POST | `/auth/logout` | PUBLIC | Logout (clears cookie/token) |
| PUT | `/auth/change-password` | AUTH | Change own password |
| GET | `/auth/me` | AUTH | Return current user profile |
| POST | `/auth/forgot-password` | PUBLIC+RATE | Initiate password reset email |
| POST | `/auth/reset-password` | PUBLIC+RATE | Complete password reset via token |
| GET | `/auth/verify-email` | PUBLIC | Verify email via token from link |
| POST | `/auth/resend-verification` | AUTH+RATE | Re-send email verification link |

#### Products  
**File:** `artifacts/api-server/src/routes/products.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | PUBLIC | List active products (filterable by category/supplier) |
| GET | `/products/featured` | PUBLIC | Featured products for homepage |
| GET | `/products/:id` | PUBLIC | Product detail with supplier info |
| GET | `/products/:id/similar` | PUBLIC | Related products by category |
| GET | `/supplier/products` | AUTH | Supplier — list own products |
| POST | `/supplier/products` | AUTH | Supplier — create product |
| PATCH | `/supplier/products/:id` | AUTH | Supplier — update product |
| DELETE | `/supplier/products/:id` | AUTH | Supplier — delete product |
| GET | `/admin/ingestion/suppliers/:id/product-placeholders` | ADMIN | Admin — get product placeholders for ingestion supplier |

#### Suppliers (Discovery & Profile)  
**File:** `artifacts/api-server/src/routes/suppliers.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/suppliers/onboard` | PUBLIC | Self-onboarding for supplier applicants |
| GET | `/suppliers/marketplace` | PUBLIC | Marketplace listing (verified, filterable) |
| GET | `/suppliers/:id/profile` | PUBLIC | Public supplier profile page |
| GET | `/suppliers/my-profile` | AUTH | Authenticated supplier — own profile |
| PATCH | `/suppliers/:id/claim` | AUTH | Claim an ingested supplier record |
| GET | `/suppliers/admin-list` | ADMIN | Admin paginated list with filters (pathway, municipio, status, date range) |
| GET | `/suppliers` | ADMIN | Admin — all suppliers raw list |
| GET | `/suppliers/:id` | ADMIN | Admin — single supplier detail |
| GET | `/suppliers/:id/evaluations` | ADMIN | Admin — supplier evaluation history |
| GET | `/suppliers/:id/transitions` | ADMIN | Admin — supplier state-machine transition log |
| GET | `/suppliers/:id/document` | ADMIN | Admin — download generated supplier document |
| POST | `/suppliers/:id/generate-document` | ADMIN | Admin — generate supplier onboarding document |
| POST | `/suppliers/:id/send-whatsapp` | ADMIN | Admin — send WhatsApp message to supplier |
| POST | `/admin/suppliers/:id/transition` | ADMIN | Admin — advance supplier through pipeline state machine |
| POST | `/admin/suppliers/:id/publish` | ADMIN | Admin — publish supplier to marketplace |
| POST | `/admin/suppliers/:id/unpublish` | ADMIN | Admin — unpublish supplier from marketplace |
| POST | `/admin/suppliers/:id/score` | ADMIN | Admin — run supplier score computation |
| PATCH | `/admin/suppliers/:id/compliance` | ADMIN | Admin — update supplier compliance fields |

#### Buyers  
**File:** `artifacts/api-server/src/routes/buyers.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/buyers/register` | PUBLIC | Register buyer (extended onboarding form) |
| POST | `/buyers/onboard` | AUTH | Complete buyer onboarding profile |
| GET | `/buyers/profile` | AUTH | Get buyer profile |
| PATCH | `/buyers/:id/profile` | AUTH | Update buyer profile fields |
| GET | `/buyers/:id/matches` | AUTH | Get buyer's supplier match recommendations |
| PATCH | `/buyers/:id/marketing-preferences` | AUTH | Update marketing/communication preferences |

#### User Profile  
**File:** `artifacts/api-server/src/routes/users.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/users/profile` | AUTH | Update user profile (name, phone, country, language, avatar) |

---

### 2.3 Layer II — INTELLIGENCE

#### Analytics & Market Intelligence  
**File:** `artifacts/api-server/src/routes/analytics.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/trending` | PUBLIC | Top products by inquiry count |
| POST | `/analytics/product/:id/view` | PUBLIC | Increment product view counter |
| GET | `/analytics/trade-history/:companyId` | PUBLIC | Company trade history by year |
| GET | `/compliance` | PUBLIC | Compliance requirements by country/product type |
| GET | `/trust/:companyId` | PUBLIC | Trust score + tier for a company |
| GET | `/markets/intelligence` | PUBLIC | Trending products, open RFQ demand, market highlights, avg prices |

#### Platform Stats  
**File:** `artifacts/api-server/src/routes/stats.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats/platform` | PUBLIC | Aggregate platform KPIs (suppliers, products, trade volume) |
| GET | `/buyer/stats` | AUTH | Buyer dashboard stats + recent inquiries/orders |
| GET | `/supplier/stats` | AUTH | Supplier dashboard stats + recent inquiries |

#### Supplier Scoring & Trust (Admin)  
(See also admin.ts section — buyer intelligence routes)

| Method | Path | Auth | File | Description |
|---|---|---|---|---|
| POST | `/admin/suppliers/:companyId/recompute-trust` | ADMIN | admin.ts | Recompute trust score for a company |
| POST | `/admin/suppliers/:id/score` | ADMIN | suppliers.ts | Run scoring computation on supplier |

#### Admin Buyer Intelligence  
**File:** `artifacts/api-server/src/routes/admin.ts` (sub-section)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/buyers` | ADMIN | List all buyers with enriched data |
| GET | `/admin/buyers/:id` | ADMIN | Single buyer full intelligence view |
| GET | `/admin/buyers/:id/matches` | ADMIN | Supplier matches for a buyer |
| GET | `/admin/buyers/:id/gaps` | ADMIN | Unmet needs / gap analysis for a buyer |
| POST | `/admin/buyers/:id/suppress-match` | ADMIN | Suppress a specific buyer-supplier match |
| POST | `/admin/gaps/:id/escalate` | ADMIN | Escalate a buyer gap for follow-up |
| GET | `/admin/buyers/:id/activity` | ADMIN | Buyer activity timeline |
| POST | `/admin/buyers/:id/reset-score` | ADMIN | Reset buyer matching score |
| POST | `/admin/buyers/:id/run-match` | ADMIN | Trigger buyer-supplier match algorithm |
| GET | `/admin/buyer-matches` | ADMIN | Global buyer match board |
| GET | `/admin/buyer-gaps` | ADMIN | Global buyer gap board |

#### AI Assistant  
**File:** `artifacts/api-server/src/routes/ai-assistant.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ai-assistant/chat` | AUTH+RATE | Fina AI assistant — role-aware, bilingual, Claude-backed |

---

### 2.4 Layer III — TRANSACTIONS

#### Inquiries  
**File:** `artifacts/api-server/src/routes/inquiries.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/inquiries` | AUTH | Create product inquiry (notifies supplier) |
| GET | `/buyer/inquiries` | AUTH | Buyer — list own inquiries |
| GET | `/supplier/inquiries` | AUTH | Supplier — list inquiries on own products |
| PATCH | `/supplier/inquiries/:id` | AUTH | Supplier — update inquiry status |

#### Orders  
**File:** `artifacts/api-server/src/routes/orders.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/buyer/orders` | AUTH | Buyer — list own orders |
| POST | `/buyer/orders` | AUTH+VER | Buyer — create order (computes platform fee) |
| GET | `/buyer/orders/:id` | AUTH | Buyer — order detail with items |
| GET | `/supplier/orders` | AUTH | Supplier — orders containing own products |
| PATCH | `/supplier/orders/:id/status` | AUTH | Supplier — advance order status (notifies buyer) |

#### RFQs (Request for Quotation)  
**File:** `artifacts/api-server/src/routes/rfqs.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/rfqs` | PUBLIC | List RFQs (filterable by status/category) |
| GET | `/rfqs/:id` | PUBLIC | RFQ detail with supplier responses |
| POST | `/rfqs` | AUTH | Buyer — create RFQ |
| POST | `/rfqs/:id/respond` | AUTH | Supplier — submit RFQ response (notifies buyer) |
| POST | `/rfqs/:id/award/:responseId` | AUTH | Buyer — award RFQ to a supplier (notifies supplier) |
| GET | `/supplier/rfqs` | AUTH | Supplier — open RFQs + own response status |
| GET | `/buyer/rfqs` | AUTH | Buyer — own RFQs with response counts |

#### Shipments & Payment Milestones  
**File:** `artifacts/api-server/src/routes/shipments.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orders/:id/shipment` | AUTH | Get shipment record for an order |
| POST | `/orders/:id/shipment` | AUTH | Create or update shipment record |
| PATCH | `/orders/:id/shipment/status` | AUTH | Update shipment status |
| GET | `/orders/:id/milestones` | AUTH | List payment milestones for an order |
| POST | `/orders/:id/milestones` | AUTH | Create payment milestone |
| POST | `/orders/:orderId/milestones/:milestoneId/release` | AUTH | Release (mark paid) a payment milestone |

#### Trade Finance / Loans  
**File:** `artifacts/api-server/src/routes/financing.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/finance/credit` | AUTH | Buyer credit score, limit, available credit, total owed |
| GET | `/finance/loans` | AUTH | Buyer — list own loans with repayment detail |
| POST | `/finance/loan` | AUTH+VER | Buyer — apply for a loan against credit limit |
| POST | `/finance/repay` | AUTH | Buyer — record a repayment (notifies on full repayment) |

---

### 2.5 Support & Content

#### Messages  
**File:** `artifacts/api-server/src/routes/messages.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/messages/conversations` | AUTH | List conversations (grouped by counterparty) |
| GET | `/messages/:userId` | AUTH | Thread with a specific user (marks as read) |
| POST | `/messages/:userId` | AUTH | Send message to a user |

#### Reviews  
**File:** `artifacts/api-server/src/routes/reviews.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products/:id/reviews` | PUBLIC | List reviews for a product |
| POST | `/products/:id/reviews` | AUTH | Submit product review |

#### Origin Stories & Impact  
**File:** `artifacts/api-server/src/routes/stories.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/origin-stories` | PUBLIC | Supplier origin stories published to the stories page |
| GET | `/stories/:productId` | PUBLIC | Origin story detail for a product |
| GET | `/impact` | PUBLIC | Platform impact metrics (farmers, families, trade volume) |

---

### 2.6 Admin & Operations

**File:** `artifacts/api-server/src/routes/admin.ts`

#### Platform Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | ADMIN | Platform-wide KPIs for admin dashboard |

#### User Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | ADMIN | List all users with profiles |
| POST | `/admin/users` | ADMIN | Create user |
| PATCH | `/admin/users/:id` | ADMIN | Update user (role, status, etc.) |
| DELETE | `/admin/users/:id` | ADMIN | Delete user |
| POST | `/admin/users/:id/reset-password` | ADMIN | Force reset user password |

#### Order & Loan Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/orders` | ADMIN | List all orders |
| PATCH | `/admin/orders/:id/status` | ADMIN | Override order status |
| PATCH | `/admin/orders/:id/fee-status` | ADMIN | Update platform fee collection status |
| GET | `/admin/loans` | ADMIN | List all loans |
| PATCH | `/admin/loans/:id/status` | ADMIN | Override loan status |

#### Supplier Management (Admin)

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/admin/suppliers/:id/status` | ADMIN | Update supplier verification status |
| PATCH | `/admin/suppliers/:id` | ADMIN | Update supplier record fields |
| POST | `/admin/suppliers/:id/create-product` | ADMIN | Admin-create product for a supplier |
| POST | `/admin/suppliers/:id/publish-origin-story` | ADMIN | Publish supplier to origin stories page |
| POST | `/admin/suppliers/:id/unpublish-origin-story` | ADMIN | Unpublish supplier from origin stories page |

#### Team / Staff Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/team` | ADMIN | List team members and roles |
| GET | `/admin/team/users` | ADMIN | List users eligible for team assignment |
| POST | `/admin/team/:userId/roles` | ADMIN | Assign role to team member |
| DELETE | `/admin/team/:userId/roles/:role` | ADMIN | Remove role from team member |

#### Marketing Campaigns

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/buyers/marketing-send` | ADMIN | Send targeted marketing campaign to buyer segment |
| GET | `/admin/buyers/marketing-campaigns/:id` | ADMIN | Get campaign detail/status |

#### Supplier Ingestion Pipeline

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/ingestion/batches` | ADMIN | Create a new ingestion batch |
| GET | `/admin/ingestion/batches` | ADMIN | List ingestion batches |
| GET | `/admin/ingestion/duplicate-check` | ADMIN | Check supplier name for duplicates |
| POST | `/admin/ingestion/enrich` | ADMIN | Enrich a supplier record (AI-assisted) |
| POST | `/admin/ingestion/suppliers` | ADMIN | Create ingestion supplier record |
| PATCH | `/admin/ingestion/suppliers/:id/ingestion-status` | ADMIN | Update supplier ingestion status |
| POST | `/admin/ingestion/batches/:id/submit` | ADMIN | Submit batch for review |
| POST | `/admin/ingestion/discover` | ADMIN | Run supplier discovery pass |
| POST | `/admin/ingestion/batch-confirm` | ADMIN | Confirm and graduate batch to live suppliers |

#### Backup

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/backup/run` | SPECIAL² | Trigger manual backup |

² Uses a separate secret-key check, not the standard adminOnly JWT chain.

**File:** `artifacts/api-server/src/routes/officers.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/officers/register`³ | PUBLIC | Field officer application submission |

³ This router hardcodes the `/api` prefix internally; it resolves to `/api/api/officers/register` if the server strips `/api` upstream, or correctly to `/api/officers/register` depending on mount configuration. **Verify in P2-R1.**

---

## 3. Frontend Route Inventory

**File:** `artifacts/fincava/src/App.tsx`  
**Router:** Wouter  
**Auth enforcement:** `PrivateRoute` component (JWT + role check)

### 3.1 Public Routes

| Path | Component | Notes |
|---|---|---|
| `/` | `Home` | Landing page |
| `/marketplace` | `Marketplace` | Buyer-facing product search |
| `/supplier-marketplace` | `SupplierMarketplace` | Supplier-facing marketplace view |
| `/product/:id` | `ProductDetail` | Product detail page |
| `/suppliers` | `Suppliers` | Supplier directory |
| `/supplier/:id` | `SupplierDetail` | Supplier profile |
| `/markets` | `Markets` | Market intelligence page |
| `/rfqs` | `RFQs` | Public RFQ board |
| `/rfq/:id` | `RFQDetail` | RFQ detail + responses |
| `/impact` | `Impact` | Impact metrics |
| `/origin-stories` | `OriginStories` | Farmer stories |
| `/about` | `About` | About page |
| `/platform` | `Platform` | Platform overview |
| `/investors` | `Investors` | Investor relations |
| `/contact` | `Contact` | Contact form |
| `/login` | `Login` | Login form |
| `/register` | `Register` | General registration |
| `/buyer-register` | `BuyerRegisterPage` | Buyer-specific registration |
| `/forgot-password` | `ForgotPassword` | Password reset initiation |
| `/reset-password` | `ResetPassword` | Password reset completion |
| `/verify-email` | `VerifyEmail` | Email verification landing |
| `/onboarding` | `OnboardingPage` | Post-registration onboarding |
| `/officer/register` | `OfficerRegisterPage` | Field officer application |

### 3.2 Buyer Dashboard Routes (role: BUYER)

| Path | Component |
|---|---|
| `/dashboard` | `BuyerDashboard` |
| `/dashboard/rfqs` | `BuyerRFQs` |
| `/dashboard/rfqs/new` | `BuyerRFQs` |
| `/dashboard/inquiries` | `BuyerInquiries` |
| `/dashboard/orders` | `BuyerOrders` |
| `/dashboard/orders/:id` | `BuyerOrderDetail` |
| `/dashboard/messages` | `BuyerMessages` |
| `/dashboard/market-intel` | `BuyerMarketIntel` |
| `/dashboard/analytics` | `BuyerAnalytics` |
| `/dashboard/matches` | `BuyerMatches` |
| `/dashboard/profile` | `BuyerProfile` |
| `/dashboard/ai-assistant` | `AiAssistant` |

### 3.3 Supplier Dashboard Routes (role: SUPPLIER)

| Path | Component |
|---|---|
| `/supplier-dashboard` | `SupplierDashboard` |
| `/supplier-dashboard/products` | `SupplierProducts` |
| `/supplier-dashboard/products/new` | `SupplierProductNew` |
| `/supplier-dashboard/products/:id/edit` | `SupplierProductEdit` |
| `/supplier-dashboard/inquiries` | `SupplierInquiries` |
| `/supplier-dashboard/orders` | `SupplierOrders` |
| `/supplier-dashboard/rfqs` | `SupplierRFQs` |
| `/supplier-dashboard/performance` | `SupplierPerformance` |
| `/supplier-dashboard/finance` | `SupplierFinance` |
| `/supplier-dashboard/profile` | `SupplierProfile` |
| `/supplier-dashboard/ai-assistant` | `AiAssistant` |

### 3.4 Admin Routes (role: ADMIN)

| Path | Component |
|---|---|
| `/admin` | `AdminDashboard` |
| `/admin/users` | `AdminUsers` |
| `/admin/buyers` | `AdminBuyers` |
| `/admin/buyer-matches` | `AdminBuyerMatches` |
| `/admin/buyer-gaps` | `AdminBuyerGaps` |
| `/admin/orders` | `AdminOrders` |
| `/admin/suppliers` | `AdminSuppliers` |
| `/admin/team` | `AdminTeam` |
| `/admin/ingestion` | `AdminIngestion` |
| `/admin/ingestion/new` | `AdminIngestionNew` |
| `/admin/ingestion/discover` | `AdminIngestionDiscover` |

### 3.5 Field Officer Routes (role: ADMIN⁴)

| Path | Component |
|---|---|
| `/officer/dashboard` | `OfficerDashboard` |

⁴ Currently guarded by `roles={["ADMIN"]}`. If a distinct `FIELD_OFFICER` role is planned, this needs a guard update.

---

## 4. Coverage Summary by Layer

| Layer | Backend Route Groups | Frontend Coverage |
|---|---|---|
| **Infra** | health, storage | — |
| **I — CORE** | auth, products, suppliers (discovery), buyers, users | Public pages, buyer/supplier dashboards |
| **II — INTELLIGENCE** | analytics, stats, trust, buyer-matching, ai-assistant | `/markets`, `/dashboard/market-intel`, `/dashboard/analytics`, `/dashboard/matches`, ai-assistant pages |
| **III — TRANSACTIONS** | inquiries, orders, rfqs, shipments, financing | Dashboard inquiry/order/RFQ/finance pages, order detail |
| **Support** | messages, reviews, stories | `/origin-stories`, `/dashboard/messages` |
| **Admin & Ops** | admin (full), ingestion pipeline | `/admin/*` |

---

## 5. Known Issues & Phase 2 Risks

| ID | Severity | Description |
|---|---|---|
| INV-01 | LOW | `officers.ts` router hardcodes `/api` prefix internally — may double-prefix. Verify mount path in P2-R1. |
| INV-02 | LOW | `GET /storage/objects/*` has auth guard commented out — effectively public. Assess in P2-R1 security pass. |
| INV-03 | LOW | `/officer/dashboard` guarded by `ADMIN` role, not `FIELD_OFFICER`. Intentional or oversight? Clarify before implementing officer-specific features. |
| INV-04 | INFO | `POST /admin/backup/run` uses a non-standard auth mechanism (secret key header, not JWT adminOnly). Document separately before any hardening. |
| INV-05 | INFO | `GET /buyer/stats` — `savedProducts` is hardcoded to `0`; not implemented yet. |
| INV-06 | INFO | `GET /supplier/stats` — `totalOrders` and `totalRevenueUSD` are hardcoded to `0`; actual order aggregation not yet implemented. |
