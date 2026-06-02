# Fincava Retail Store — End-to-End Test Plan

**Version:** 1.0 — June 2026  
**Source:** FINCAVA_TDD_PhaseI_DomesticRetail_v2.md  
**Scope:** Full retail flow from catalog browse through post-delivery. Covers buyer paths, farmer paths, admin paths, payment paths, and all failure scenarios defined in the TDD.  
**Environment:** Run all steps in Wompi sandbox + Resend test mode before any production deployment.

---

## Prerequisites

Before running any test:

- [ ] All retail migrations (0016–0026) applied and verified
- [ ] At least one supplier with `sellable_status = PUBLISHED` and `retail_enabled = true` product
- [ ] Product has `retailStockUnits > 0` and `retailPriceCop` set
- [ ] `retail_shipping_zones` seeded with at least one zone rate
- [ ] Wompi sandbox credentials set: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`
- [ ] Resend in test mode (or test email inbox accessible)
- [ ] Twilio test credentials set (SMS OTP path)
- [ ] Admin account exists and can log in
- [ ] Field officer account exists with at least one farm visit recorded for the test supplier

---

## Module 1 — Retail Catalog

### T1.1 — Browse catalog (unauthenticated)

1. Open `GET /api/retail/products` with no filters
2. **Expected:** 200, array of products. Each item has `stockState`, `retailPriceCop`, `retailStockUnits`, `retailUnitLabel`, supplier name, municipio, department
3. Verify no B2B-only supplier (sellable_status ≠ PUBLISHED) appears in results
4. Verify no product with `retail_enabled = false` appears

### T1.2 — Filter by category

1. `GET /api/retail/products?category=COFFEE`
2. **Expected:** all results have `category = COFFEE`

### T1.3 — Filter by region

1. `GET /api/retail/products?region=Huila`
2. **Expected:** all results are suppliers in Huila department

### T1.4 — Filter in-stock only

1. `GET /api/retail/products?inStock=true`
2. **Expected:** all results have `retailStockUnits > 0` and `stockState = IN_STOCK`

### T1.5 — Product detail (unauthenticated)

1. `GET /api/retail/products/:id` for a PUBLISHED, retail-enabled product
2. **Expected:** 200 with full detail including:
   - `originStory` (if published)
   - `verificationSignal` — `{ visitedAt, officerName }` from most recent FARM_VISIT interaction by a FIELD_OFFICER
   - `complianceBadges` — array of visible buyer_visibility_signals
   - `stockState`, `waitlistCount`

### T1.6 — Product detail for out-of-stock product

1. Set `retailStockUnits = 0` on a product
2. `GET /api/retail/products/:id`
3. **Expected:** `stockState = HARVEST_WAIT`, `nextWindowStart` and `nextWindowEnd` populated if set

### T1.7 — Shipping estimate

1. `GET /api/retail/products/:id/shipping-estimate?department=Cundinamarca&weightClass=SMALL`
2. **Expected:** 200 with `{ rateCents, currency: "COP", estimated: false }` if zone exists, `estimated: true` if falling back to national rate

### T1.8 — Similar products

1. `GET /api/retail/products/:id/similar?category=COFFEE&region=Huila`
2. **Expected:** array of up to 5 products, none is the same product as `:id`
3. Each result includes `matchReason` (e.g., "También orgánica, de Huila")

---

## Module 2 — Retail Buyer Authentication

### T2.1 — Magic link request (email)

1. `POST /api/retail/auth/request` body: `{ email: "test@example.com" }`
2. **Expected:** 200, `{ data: { channel: "EMAIL", sent: true } }`
3. Verify email received with magic link URL containing `?token=<raw_token>`
4. Verify `retail_auth_tokens` row created in DB: `token_type = MAGIC_LINK`, `used_at IS NULL`, `expires_at` ~15 minutes from now

### T2.2 — Magic link verify (new buyer)

1. Take raw token from T2.1 email
2. `GET /api/retail/auth/verify-magic?token=<raw_token>`
3. **Expected:** 200, `{ data: { userId, isNewAccount: true } }`
4. Verify `users` row created with `role = BUYER`
5. Verify `retail_buyer_profiles` row created linked to new userId
6. Verify session cookie set

### T2.3 — Magic link verify (returning buyer)

1. Request a new magic link for the same email used in T2.2
2. Verify the link
3. **Expected:** 200, `{ data: { userId, isNewAccount: false } }` — same userId as T2.2

### T2.4 — Magic link expired

1. Manually set `expires_at = now() - interval '1 minute'` on a token in DB
2. Attempt to verify it
3. **Expected:** 400 — token invalid or expired

### T2.5 — Magic link used twice

1. Verify a valid token (T2.1)
2. Attempt to verify the same token again
3. **Expected:** 400 — token already used (`used_at IS NOT NULL`)

### T2.6 — Rate limit on magic link requests

1. Send 6 magic link requests for the same email within one hour
2. **Expected:** first 5 succeed (200), 6th returns 429

### T2.7 — SMS OTP request

1. `POST /api/retail/auth/request` body: `{ phone: "+573001234567" }`
2. **Expected:** 200, `{ data: { channel: "SMS", sent: true } }`
3. Verify Twilio test log shows outbound SMS with 6-digit OTP

### T2.8 — SMS OTP verify

1. Enter the OTP from T2.7
2. `POST /api/retail/auth/verify-otp` body: `{ phone: "+573001234567", otp: "<6-digit>" }`
3. **Expected:** 200, session set

### T2.9 — Wrong OTP

1. `POST /api/retail/auth/verify-otp` body: `{ phone: "+573001234567", otp: "000000" }`
2. **Expected:** 400

### T2.10 — Logout

1. `DELETE /api/retail/auth/session` with valid session cookie
2. **Expected:** 200, session cookie cleared
3. Subsequent authenticated request returns 401

---

## Module 3 — Checkout (Happy Path — Card)

### T3.1 — Create order as authenticated buyer

1. Log in as retail buyer (T2.2)
2. Note current `retailStockUnits` for the product (call it N)
3. `POST /api/retail/orders` body:
   ```json
   {
     "productId": <id>,
     "quantity": 2,
     "shippingName": "Ana García",
     "shippingAddressLine1": "Calle 80 # 12-34",
     "shippingCity": "Bogotá",
     "shippingDepartment": "Cundinamarca",
     "email": "test@example.com",
     "paymentInstrument": "CARD",
     "notificationChannel": "EMAIL"
   }
   ```
4. **Expected:** 201, `{ data: { orderId, totalCents, currency: "COP", status: "INQUIRY" } }`
5. Verify `orders` row created: `status = INQUIRY`
6. Verify `retail_order_details` row created with shipping snapshot
7. Verify `retail_payment_transactions` row created: `status = PENDING`, `amountCents = (retailPriceCop × 2) + shippingRateCents`
8. Verify `products.retailStockUnits` decremented by 2 (now N-2)
9. Verify admin alert email received (T-A1)
10. Verify buyer order confirmation email received (T-B1)

### T3.2 — Create order as guest

1. `POST /api/retail/orders` (no session cookie), same body as T3.1 plus `email` field
2. **Expected:** 201 — same shape as T3.1
3. Verify a `users` row with `role = BUYER` was created for the guest email if it didn't exist

### T3.3 — Order status check by buyer

1. `GET /api/retail/orders/:orderId` with session cookie from T3.1
2. **Expected:** 200 with order status `INQUIRY`, payment status `PENDING`

### T3.4 — Order status check by guest (order access token)

1. From the order confirmation email, extract the `orderAccessToken`
2. `GET /api/retail/orders/:orderId?token=<orderAccessToken>`
3. **Expected:** 200 — same response shape

### T3.5 — Oversell prevention

1. Get current `retailStockUnits` (e.g., 3)
2. Attempt to order `quantity: 10`
3. **Expected:** 400 — insufficient stock
4. Verify `retailStockUnits` unchanged

### T3.6 — Concurrent oversell prevention

1. In two simultaneous requests, both try to buy the last unit
2. **Expected:** exactly one 201, one 400 — SELECT FOR UPDATE prevents double fulfillment

---

## Module 4 — Payment Flow (V1 Manual)

### T4.1 — Admin marks payment authorized

1. Log in as admin, navigate to Admin > Retail > Orders
2. Find the INQUIRY order from T3.1
3. Click "Mark Payment Authorized"
4. `PATCH /api/admin/retail/orders/:id/mark-authorized`
5. **Expected:** `orders.status = AUTHORIZED`, `retail_payment_transactions.status = AUTHORIZED`

### T4.2 — Admin notifies farmer

1. On the same order, click "Notify Farmer"
2. **Expected:** WhatsApp sent to supplier's `whatsappNumber` with T-F1 template
3. Verify Twilio log shows outbound WhatsApp message

### T4.3 — Mark farmer ready (LISTO)

1. Click "Mark Farmer Ready (LISTO)"
2. **Expected:** `orders.status = READY_TO_SHIP`
3. Verify WhatsApp T-F2 confirmation sent to farmer

### T4.4 — Capture payment

1. Click "Capture Payment"
2. **Expected:** `retail_payment_transactions.status = CAPTURED`, `orders.status = CAPTURED`

### T4.5 — Enter tracking

1. Click "Enter Tracking", enter carrier = "Servientrega", tracking number = "TEST-123"
2. **Expected:** `orders.status = IN_TRANSIT`, tracking fields saved
3. Verify buyer receives T-B6 shipping notification email with tracking number

### T4.6 — Mark delivered

1. Click "Mark Delivered"
2. **Expected:** `retail_order_details.deliveredAt` set, `orders.status = DELIVERED_RETAIL`
3. Verify buyer receives T-B8 post-delivery review request email

### T4.7 — Record farmer payment

1. Click "Record Farmer Payment", enter Nequi reference "NQ-2026-001" and amount
2. **Expected:** `retail_order_details.farmerPaymentRef = NQ-2026-001`, `farmerPaymentAmountCents` set, `farmerPaidAt` set
3. Verify farmer receives T-F3 WhatsApp payment confirmation

---

## Module 5 — Wompi Webhook Flow

### T5.1 — Card payment approved webhook

1. Send a POST to `/api/retail/webhooks/wompi` simulating a Wompi `transaction.updated` event with `status = APPROVED` and a valid `HMAC-SHA256` signature
2. Include `data.transaction.id` matching a `retail_payment_transactions.external_id`
3. **Expected:** `retail_payment_transactions.status = AUTHORIZED`, `orders.status = AUTHORIZED`

### T5.2 — Nequi / PSE immediate settlement webhook

1. Same as T5.1 but `paymentMethod = NEQUI` (immediate settlement)
2. **Expected:** `retail_payment_transactions.status = CAPTURED` (skips AUTHORIZED), `orders.status = CAPTURED`
3. Order state machine goes `INQUIRY → CAPTURED` directly

### T5.3 — Payment declined webhook

1. Send `transaction.updated` with `status = DECLINED`
2. **Expected:** `retail_payment_transactions.status = FAILED`, stock restored: `products.retailStockUnits` incremented back

### T5.4 — Invalid webhook signature

1. Send webhook with wrong `X-Event-Checksum`
2. **Expected:** 400 — signature rejected, no DB writes

### T5.5 — Idempotent webhook (duplicate delivery)

1. Send the same approved webhook twice
2. **Expected:** second call returns 200 immediately with no DB changes (already in terminal state)

### T5.6 — SLA sweep — void overdue pending payment

1. Create an order where `retail_payment_transactions.sla_void_deadline` is in the past and `status = PENDING`
2. Trigger or wait for cron job (`lib/cron.ts`)
3. **Expected:** `retail_payment_transactions.status = VOIDED`, stock restored

---

## Module 6 — Waitlist

### T6.1 — Join waitlist (unauthenticated)

1. `POST /api/retail/waitlist` body: `{ productId, email: "waiter@example.com" }`
2. **Expected:** 200, waitlist row created with `exited_at IS NULL`
3. Verify T-B2 waitlist confirmation email sent

### T6.2 — Join waitlist (authenticated)

1. Log in as retail buyer
2. `POST /api/retail/waitlist` body: `{ productId }`
3. **Expected:** 200, `retail_buyer_profile_id` set on waitlist row (linked account)

### T6.3 — Admin sends harvest update

1. Admin clicks "Post Harvest Update" for the product
2. `POST /api/admin/retail/harvest-update` with photo URL and update text
3. **Expected:** T-B3 update email sent to all active waitlist members (`exited_at IS NULL`)

### T6.4 — Admin triggers waitlist conversion (product back in stock)

1. Replenish stock: set `retailStockUnits > 0`, `lastReplenishedAt = now()`
2. `POST /api/admin/retail/stock/:id/replenish` (or trigger `waitlistService.triggerConversion`)
3. **Expected:** T-B4 "harvest ready" conversion email sent to all active waitlist members
4. **Expected:** email body in correct language per `retail_buyer_profiles.language_pref`

### T6.5 — One-click unsubscribe from waitlist

1. From a T-B2 or T-B3 email, click the unsubscribe link
2. `DELETE /api/retail/waitlist/unsubscribe?token=<unsubscribeToken>`
3. **Expected:** `retail_waitlists.exited_at = now()`
4. Verify no more waitlist emails sent to this address for this product

---

## Module 7 — Failure Scenarios

### T7.1 — Harvest failure flow

1. Admin opens Admin > Retail > Harvest > Failure
2. Select product with active AUTHORIZED orders and active waitlist members
3. `POST /api/admin/retail/harvest-failure` with failure reason
4. **Expected:**
   - All AUTHORIZED `retail_payment_transactions` for orders after `products.lastReplenishedAt` → VOIDED (Wompi void call in sandbox)
   - All CAPTURED transactions in scope → REFUNDED
   - Stock restored (`retailStockUnits` incremented)
   - `products.retailEnabled = false`
   - T-B5 dual-option exit email sent to all active waitlist members AND affected order buyers
5. Verify orders from prior harvest cycles are **not** touched

### T7.2 — Shipping delay notification

1. Create an IN_TRANSIT order with `labelGeneratedAt = now() - interval '8 days'`
2. In Admin > Retail > Delayed Orders, find it (auto-filter: IN_TRANSIT, >7 days since label)
3. Click "Notify Buyer of Delay"
4. **Expected:** T-B7 delay email sent to buyer with stated decision date

### T7.3 — Quality dispute refund

1. Open a DELIVERED_RETAIL order
2. Admin clicks "Issue Refund"
3. **Expected:** full refund issued via Wompi, `retail_payment_transactions.status = REFUNDED`

### T7.4 — Farmer unresponsive — escalate to field officer

1. Create an AUTHORIZED order with `updatedAt > 48 hours ago` and no LISTO recorded
2. In Admin > Retail > Unresponsive Farmers, find it
3. Click "Escalate to Field Officer"
4. **Expected:** WhatsApp sent to the field officer who last visited this supplier
5. Verify the field officer's phone number is derived from `interactions` where `interaction_type = FARM_VISIT` and actor has `role = FIELD_OFFICER`

### T7.5 — Farmer unresponsive — refund buyer

1. Same order as T7.4
2. Click "Refund Buyer"
3. **Expected:** full refund, `retail_payment_transactions.status = REFUNDED`, stock restored

---

## Module 8 — Farm Biography Records (Origin Story)

### T8.1 — Author origin story

1. Admin opens Farm Biography Records, selects a supplier
2. In the edit modal, fill in bilingual buyer copy (ES + EN) and farmer voice quotes
3. Save
4. **Expected:** `origin_stories` row updated with `buyer_copy_es`, `buyer_copy_en`, `farmer_voice_es`, `farmer_voice_en`

### T8.2 — Send story for farmer review

1. Click "Enviar para revisión del agricultor"
2. `POST /api/admin/retail/origin-stories/:id/farmer-review`
3. **Expected:** T-F7 WhatsApp sent to supplier's `whatsappNumber` with preview link

### T8.3 — Record farmer approval

1. Click "Agricultor aprobó ✓"
2. `PATCH /api/admin/retail/origin-stories/:id/approve`
3. **Expected:** `origin_stories.farmerApprovedAt` set
4. "Publish" button becomes active (was blocked until `farmerApprovedAt IS NOT NULL`)

### T8.4 — Publish story

1. Click "Publish"
2. **Expected:** `origin_stories.published = true`
3. Verify story appears on `GET /api/retail/products/:id` response under `originStory`

### T8.5 — Published story visible on product detail

1. `GET /api/retail/products/:id` for a supplier with a published story
2. **Expected:** `originStory` object present with `farmer_voice_es`, `buyer_copy_en`, `farmerApprovedAt`

---

## Module 9 — Spin-Off Readiness Verification

*These checks verify the architectural separation constraints defined in TDD §1.4 and §1.5.*

### T9.1 — Retail tables use `retail_*` prefix

1. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'retail_%'`
2. **Expected:** all 7 retail-specific tables present: `retail_buyer_profiles`, `retail_order_details`, `retail_harvest_updates`, `retail_shipping_zones`, `retail_payment_transactions`, `retail_waitlists`, `retail_auth_tokens`
3. Verify no other tables named `retail_*` (no unexpected coupling)

### T9.2 — No reverse FKs from B2B tables to retail tables

1. Run:
   ```sql
   SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND ccu.table_name LIKE 'retail_%'
     AND tc.table_name NOT LIKE 'retail_%'
   ```
2. **Expected:** zero rows — no B2B table holds a FK into a retail table

### T9.3 — Shared tables have `channel` discriminator

1. `SELECT DISTINCT channel FROM orders`
2. **Expected:** values include `'b2b'` and `'retail'`
3. `SELECT * FROM orders WHERE channel = 'b2b'` — verify no `retail_order_details` child rows
4. `SELECT * FROM orders WHERE channel = 'retail'` — verify every row has a matching `retail_order_details` row

### T9.4 — Retail columns on `products` are nullable and ignored by B2B

1. `SELECT * FROM products WHERE retail_enabled = true` — should return only retail-configured products
2. `SELECT * FROM products WHERE retail_enabled IS NULL OR retail_enabled = false` — should return the full B2B catalog
3. Run an existing B2B query (e.g., `GET /api/products`) — verify retail columns do not appear in the B2B response shape

### T9.5 — Retail routes isolated under `/api/retail/*`

1. `GET /api/routes` (or inspect route index) — verify all retail buyer endpoints are under `/api/retail/*`
2. Verify no retail logic in `routes/orders.ts`, `routes/products.ts`, or other B2B routes

### T9.6 — Retail services isolated under `services/retail/`

1. Verify `services/retail/payment-service.ts`, `services/retail/shipping-service.ts`, `services/retail/retail-order-service.ts`, `services/retail/waitlist-service.ts` exist
2. Run: `grep -r "services/retail" artifacts/api-server/src/routes/ | grep -v "routes/retail"` — **Expected:** no results (B2B routes do not import retail services)

### T9.7 — Simulated spin-off extraction surface

*This is a design review check, not a runtime test.*

1. List all files under `services/retail/`, `routes/retail/`, `lib/db/src/schema/retail.ts`
2. Verify that deleting these files plus `retail_*` columns on `orders`, `products`, `origin_stories` would leave the B2B platform fully functional
3. Confirm: the only shared infrastructure is `lib/email.ts`, `lib/anthropic.ts`, `lib/whatsapp.ts`, and the `orders`/`products`/`origin_stories` tables — all of which are read-only or additive from the retail side

---

## Module 10 — Notification Coverage Check

Verify every TDD-specified template fires in the right condition:

| Template | Trigger | Verified in |
|----------|---------|-------------|
| T-B1: Order Confirmation | POST /api/retail/orders 201 | T3.1 step 10 |
| T-B2: Waitlist Confirmation | POST /api/retail/waitlist | T6.1 step 3 |
| T-B3: Waitlist Mid-Cycle Update | admin harvest update | T6.3 step 3 |
| T-B4: Waitlist At-Ready Conversion | stock replenishment trigger | T6.4 step 3 |
| T-B5: Harvest Failure Dual-Option Exit | POST harvest-failure | T7.1 step 4 |
| T-B6: Shipping Notification | admin enter tracking | T4.5 step 3 |
| T-B7: Shipping Delay | admin notify delay | T7.2 step 4 |
| T-B8: Post-Delivery Review Request | admin mark delivered | T4.6 step 3 |
| T-B9: Magic Link | POST /api/retail/auth/request (email) | T2.1 step 3 |
| T-B10: SMS OTP | POST /api/retail/auth/request (phone) | T2.7 step 3 |
| T-F1: New Order Notification (farmer) | admin notify farmer | T4.2 step 2 |
| T-F2: Ready Confirmation (farmer) | admin mark farmer ready | T4.3 step 2 |
| T-F3: Payment Received (farmer) | admin record farmer payment | T4.7 step 3 |
| T-F7: Story Review Request (farmer) | admin send for review | T8.2 step 3 |
| T-A1: Admin New Order Alert | POST /api/retail/orders 201 | T3.1 step 9 |

---

## Module 11 — Pre-Launch Verification (Day 0 Checklist)

Run these immediately before opening to real buyers:

- [ ] **T11.1** — `GET /api/healthz` returns `{ status: "ok", db: "ok" }` on production
- [ ] **T11.2** — Server startup logs show `FLAG_VALIDATION_OK` for `FINCAVA_PHASE=5` (or whichever phase retail launches under)
- [ ] **T11.3** — End-to-end manual order in Wompi **production** (not sandbox) using a real COP 1 test transaction. Verify capture, refund, and webhook delivery all work with live credentials
- [ ] **T11.4** — B2B smoke test: `POST /api/orders/buyer/intent` creates an `orders` row with `status = INQUIRY`, `incoterm = FOB`, `channel = b2b`. Confirms shared orders table is intact
- [ ] **T11.5** — Magic link email delivery tested on production Resend (not test mode). Verify email lands in inbox within 60 seconds
- [ ] **T11.6** — Wompi webhook delivery verified: send a test event from Wompi sandbox dashboard, confirm it reaches `/api/retail/webhooks/wompi` and DB is updated
- [ ] **T11.7** — node-cron registered: check server logs for cron registration message on startup
- [ ] **T11.8** — Confirm max order cap enforced (TDD risk: max 25 orders in V1). Verify `retailMaxPerOrder` or equivalent hard cap is in place
- [ ] **T11.9** — Run T9.1–T9.5 spin-off checks against production DB

---

## Test Execution Order

For a full regression run, execute modules in this order:

```
Module 1  — Catalog (no auth, no side effects)
Module 2  — Auth (creates test buyers)
Module 3  — Checkout (creates test orders)
Module 4  — Admin order workflow (processes orders from Module 3)
Module 5  — Webhook (can run independently with mock payloads)
Module 6  — Waitlist (independent of order flow)
Module 7  — Failure scenarios (requires orders in correct states)
Module 8  — Origin story (independent of order flow)
Module 9  — Spin-off checks (DB and code inspection, run last)
Module 10 — Notification audit (review against Module 1–8 run)
Module 11 — Pre-launch checklist (production only, run once before go-live)
```

---

*Source of truth: `docs/technical-design/FINCAVA_TDD_PhaseI_DomesticRetail_v2.md`*  
*Update this document whenever a TDD section is changed or a new edge case is discovered during implementation.*
