# FinCava-Hub — Comprehensive Code Review
**Date:** 2026-05-06  
**Reviewer:** Claude (Anthropic) + Replit second-pass verification  
**Source:** Live codebase at https://github.com/sbirfan/FinCava-Hub  
**Scope:** Security, Architecture, Performance, Data Integrity, Error Handling  
**Revision:** v2 — 9 new gaps added from Replit live verification pass

---

## Summary

32 findings across 4 severity levels. All 23 original findings confirmed live by Replit. 9 additional gaps identified in storage, seeding, product routing, matching, and orders. **6 Critical** issues require immediate remediation before any production deployment. **10 High** issues are significant enough to block a beta launch. **10 Medium** issues are addressable in a follow-on sprint. **6 Low** issues are code quality improvements.

| Severity | Count |
|----------|-------|
| 🔴 Critical | 6 |
| 🟠 High | 10 |
| 🟡 Medium | 10 |
| 🔵 Low | 6 |

---

## 🔴 CRITICAL

---

### C-1 — Race Condition on Loan Creation (No Transaction)
**File:** `artifacts/api-server/src/routes/financing.ts` ~L95–L130

**Problem:**  
Loan creation performs three sequential DB operations — (1) fetch credit score, (2) check active loan count, (3) insert new loan — without wrapping them in a transaction. Between steps 2 and 3, a concurrent request can pass the same availability check and both inserts succeed, allowing a borrower to exceed their loan limit.

**Why it matters:** This is a financial integrity bug. A borrower could double-borrow. In a regulated lending environment, this creates real liability.

**Fix:**
```typescript
// Wrap the entire credit check + limit check + insert in a transaction
const result = await db.transaction(async (tx) => {
  const creditScore = await getCreditScore(tx, supplierId);
  if (!creditScore || creditScore.score < MIN_SCORE) throw new Error('INELIGIBLE');
  
  const [{ activeCount }] = await tx
    .select({ activeCount: count() })
    .from(loansTable)
    .where(and(
      eq(loansTable.supplierId, supplierId),
      eq(loansTable.status, 'ACTIVE')
    ));
    
  if (activeCount >= MAX_ACTIVE_LOANS) throw new Error('LIMIT_REACHED');
  
  const [loan] = await tx.insert(loansTable).values({ ... }).returning();
  return loan;
});
```

---

### C-2 — CORS Wildcard with Credentials Allowed
**File:** `artifacts/api-server/src/app.ts` L38

**Problem:**  
```typescript
origin: process.env.CORS_ORIGIN ?? true
```
When `CORS_ORIGIN` is not set in the environment, `cors()` receives `origin: true`, which reflects any incoming `Origin` header and grants `Access-Control-Allow-Credentials: true`. This allows any website to make authenticated cross-origin requests using the victim's session cookie.

**Why it matters:** This is a textbook CORS misconfiguration enabling CSRF-like attacks against authenticated users. Any page the user visits can silently read their loan data, trigger actions, or extract supplier profiles.

**Fix:**
```typescript
// app.ts — never allow origin: true in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

if (allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN env variable is required. Server will not start without it.');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));
```

---

### C-3 — Plaintext Password Reset Token Stored Alongside Hash
**Files:**  
- `lib/db/src/schema/password-reset-tokens.ts`  
- `lib/db/src/schema/email-verification-tokens.ts`  
- `artifacts/api-server/src/routes/auth.ts` ~L308–L314

**Problem:**  
The schema stores **both** a `token` (plaintext) column and a `tokenHash` column. The reset-password route falls back to comparing the raw token if hash lookup fails:
```typescript
// auth.ts ~L310 — plaintext token comparison fallback
.where(
  or(
    eq(passwordResetTokensTable.tokenHash, hashToken(token)),
    eq(passwordResetTokensTable.token, token)  // ← defeats the entire point of hashing
  )
)
```
If the DB is exfiltrated, every outstanding reset/verification token is immediately usable. The hash exists but is bypassed by the fallback.

**Why it matters:** Password reset tokens are credentials. The industry standard (OWASP) is to store only the hash, never the plaintext. The plaintext column provides zero benefit and creates a serious breach vector.

**Fix:**
1. Drop the `token` plaintext column from both schema tables via migration.
2. Remove the `or(... eq(table.token, token))` fallback in auth.ts.
3. If the hash lookup fails, the token is simply invalid — return 400.
```typescript
// Correct: hash-only lookup
const [resetRecord] = await db
  .select()
  .from(passwordResetTokensTable)
  .where(eq(passwordResetTokensTable.tokenHash, hashToken(token)))
  .limit(1);

if (!resetRecord) return res.status(400).json({ error: 'Invalid or expired token' });
```

---

### C-4 — Unauthenticated Supplier Update via `/suppliers/onboard`
**File:** `artifacts/api-server/src/routes/suppliers.ts` ~L95–L110

**Problem:**  
The `POST /api/suppliers/onboard` route accepts a `supplierId` in the request body. When `supplierId` is present, it performs an **UPDATE** on that supplier — with no authentication or authorization check. Any unauthenticated caller can overwrite any supplier's data by guessing or brute-forcing a numeric ID.

```typescript
// suppliers.ts ~L101 — no auth, updates by supplierId from body
const supplierId = rawBody.supplierId ? Number(rawBody.supplierId) : null;
// ... then later: db.update(suppliersTable).where(eq(suppliersTable.id, supplierId))
```

**Why it matters:** This is an IDOR (Insecure Direct Object Reference) combined with missing authentication. The entire supplier database is writable by anonymous requests.

**Fix:**
```typescript
// Add requireAuth to the route
router.post('/api/suppliers/onboard', requireAuth, async (req, res) => {
  const requestingUserId = (req as any).userId;
  
  if (supplierId) {
    // Verify the authenticated user owns this supplier record
    const [existing] = await db
      .select({ userId: suppliersTable.userId })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);
    
    if (!existing || existing.userId !== requestingUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  // ... rest of handler
});
```

---

### C-5 — Object Storage Effectively Public (Upload + Serve Both Unauthenticated)
**File:** `artifacts/api-server/src/routes/storage.ts`

**Problem:**  
Two separate vulnerabilities make the object storage system entirely open:

1. `POST /storage/uploads/request-url` — issues presigned S3/R2 upload URLs with **no `requireAuth`**, no content-type enforcement, and no ACL creation. Any anonymous caller can generate an upload URL and write arbitrary files to the storage bucket.

2. `GET /storage/objects/*path` — the ACL and authentication checks are **commented-out example code**. Private objects are publicly readable by anyone who knows or can guess the storage path.

**Why it matters:** This is a direct data breach path. Private supplier documents (compliance docs, ID scans, financial records) are readable without authentication. The upload endpoint enables arbitrary file injection with no ownership link.

**Fix:**
```typescript
// Route: require auth on upload URL issuance
router.post('/storage/uploads/request-url', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { contentType, entityType } = req.body;
  
  // Enforce allowed content types
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'Content type not allowed' });
  }
  
  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
  
  // Create ACL entry linking this path to the requesting user
  await db.insert(objectAclTable).values({ objectPath, ownerId: userId, entityType });
  
  return res.json({ uploadURL });
});

// Route: enforce ACL check on object serve
router.get('/storage/objects/*path', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const userRole = (req as any).userRole;
  const objectPath = req.params.path;
  
  // Admins can access any object; others must own it
  if (userRole !== 'ADMIN') {
    const [acl] = await db
      .select()
      .from(objectAclTable)
      .where(and(
        eq(objectAclTable.objectPath, objectPath),
        eq(objectAclTable.ownerId, userId)
      ))
      .limit(1);
    
    if (!acl) return res.status(403).json({ error: 'Access denied' });
  }
  
  // Stream the object
  const stream = await objectStorageService.getObject(objectPath);
  stream.pipe(res);
});
```

---

### C-6 — Hardcoded Default Admin Password in Production Seed
**File:** `artifacts/api-server/src/seed.ts`, `artifacts/api-server/src/index.ts`

**Problem:**  
`seed.ts` falls back to a hardcoded password when `ADMIN_DEFAULT_PASSWORD` is absent:
```typescript
const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? 'Admin@Fincava2026!';
```
The email addresses (`irfan@fincava.com`, `info@fincava.com`) are also hardcoded and visible in source. `index.ts` calls `seedAdminAccounts()` automatically on every server start. If a deployed environment starts without `ADMIN_DEFAULT_PASSWORD` set, any attacker who reads the source (public GitHub repo) can log in as admin immediately.

**Why it matters:** The GitHub repo is public. The default credentials are visible to anyone. This is a trivially exploitable admin takeover on any deployment that omits the env var.

**Fix:**
```typescript
// seed.ts — fail loudly rather than use a default
const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
if (!defaultPassword) {
  throw new Error(
    'ADMIN_DEFAULT_PASSWORD is required. Refusing to seed admin accounts without it.'
  );
}

// Additionally: don't call seedAdminAccounts() on every boot
// Only run on explicit command or first-run detection
// index.ts — guard with a "seeded" flag check
const [{ count: adminCount }] = await db
  .select({ count: count() })
  .from(usersTable)
  .where(eq(usersTable.role, 'ADMIN'));

if (adminCount === 0) {
  await seedAdminAccounts(); // only seed if no admins exist
}
```

---

## 🟠 HIGH

---

### H-1 — Timing Attack on Admin Backup Secret
**File:** `artifacts/api-server/src/routes/admin.ts` ~L2598

**Problem:**  
The backup admin authentication route compares the secret using direct string equality:
```typescript
if (tokenHeader === backupSecret) { ... }
```
String equality in JavaScript short-circuits at the first differing character, leaking timing information. An attacker can statistically infer the secret character-by-character through many requests.

**Fix:**
```typescript
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

if (safeCompare(tokenHeader, backupSecret)) { ... }
```

---

### H-2 — Full DB SELECT on Every Authenticated Request
**File:** `artifacts/api-server/src/lib/auth.ts` ~L106

**Problem:**  
`requireAuth` performs a `db.select()` from `usersTable` on **every** authenticated request to validate the user still exists and fetch their role. With no caching layer, this adds a DB round-trip to every API call. At moderate load (100 concurrent users × 10 req/s), this generates 1,000 unnecessary DB queries per second.

**Why it matters:** The JWT already contains `userId` and `userRole`. The DB call is only necessary to detect revoked tokens or role changes — relatively rare events that don't justify per-request DB overhead.

**Fix (pragmatic):**
```typescript
// Option A: Trust the JWT for role — only re-query for sensitive admin routes
// In requireAuth: skip DB fetch; set userId+role from JWT claims
const payload = verifyJwt(token);
(req as any).userId = payload.userId;
(req as any).userRole = payload.role;

// Option B: Short-lived in-memory cache with 60s TTL
const userCache = new Map<number, { role: string; expiresAt: number }>();

async function getOrFetchUser(userId: number) {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  userCache.set(userId, { role: user.role, expiresAt: Date.now() + 60_000 });
  return user;
}
```

---

### H-3 — Pagination Count Ignores Applied Filters
**File:** `artifacts/api-server/src/routes/suppliers.ts` ~L561

**Problem:**  
The total count query for the supplier list is:
```typescript
db.select({ total: count() }).from(suppliersTable)
```
It counts **all** rows, regardless of what filters (status, country, search term, etc.) are applied to the actual data query. The paginated response returns a `total` that is always the full table size, causing incorrect page calculations on the frontend.

**Fix:**
```typescript
// Re-use the same where clause for both data and count queries
const conditions = buildSupplierFilterConditions(filters); // extract shared conditions

const [{ total }] = await db
  .select({ total: count() })
  .from(suppliersTable)
  .where(and(...conditions));  // same conditions as data query
```

---

### H-4 — `GET /api/suppliers` Returns All Rows Without LIMIT
**File:** `artifacts/api-server/src/routes/suppliers.ts` ~L738

**Problem:**  
The admin supplier list endpoint executes a query with no `LIMIT` clause, fetching every supplier row in the database. As data grows this will cause memory exhaustion, gateway timeouts, and effectively a self-inflicted DoS.

**Fix:**
```typescript
// Enforce a hard maximum even if no pagination is requested
const page = Math.max(1, Number(req.query.page) || 1);
const pageSize = Math.min(100, Number(req.query.pageSize) || 25); // hard cap at 100

const suppliers = await db
  .select()
  .from(suppliersTable)
  .where(and(...conditions))
  .orderBy(desc(suppliersTable.createdAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

---

### H-5 — AI-Generated Text Injected Into WhatsApp Messages Without Sanitization
**File:** `artifacts/api-server/src/services/scoring-service.ts` ~L89–L94

**Problem:**  
Supplier `nombreCompleto` (user-controlled input) and `parsed.pathway` (AI-generated output) are interpolated directly into a WhatsApp message template without sanitization:
```typescript
const message = `Hola ${supplier.nombreCompleto}, ${parsed.pathway}`;
```
An adversarially crafted supplier name or a jailbroken AI response could inject fake instructions, links, or impersonation content into the WhatsApp message sent to a real user.

**Fix:**
```typescript
// Sanitize user-supplied and AI-generated values before message construction
const safeName = sanitizeForMessage(supplier.nombreCompleto); // strip control chars, URLs
const safePathway = sanitizeForMessage(parsed.pathway);       // same
const MAX_LEN = 500;
const message = `Hola ${safeName.slice(0, 50)}, ${safePathway.slice(0, MAX_LEN)}`;

function sanitizeForMessage(input: string): string {
  return input
    .replace(/[ -]/g, '') // strip control characters
    .replace(/https?:\/\/\S+/gi, '[link]')  // strip URLs from AI output
    .trim();
}
```

---

### H-6 — No Rate Limiting on AI Scoring Endpoint
**File:** `artifacts/api-server/src/routes/suppliers.ts` ~L1670  
**File:** `artifacts/api-server/src/app.ts` (rate limiter definitions)

**Problem:**  
The `POST /api/suppliers/:id/score` endpoint (or equivalent trigger) invokes Claude Haiku via the Anthropic API with no rate limiting. A rogue authenticated user can fire hundreds of scoring requests, incurring unbounded API costs and potentially exhausting the Anthropic rate limit for all users.

**Why it matters:** At ~$0.25 per 1M input tokens, a 3KB supplier profile scored 1,000 times = ~$0.75 in tokens alone, plus 1,000 DB reads. This is a cost and availability risk.

**Fix:**
```typescript
// In app.ts — add a dedicated AI limiter
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI scoring calls per user per hour
  keyGenerator: (req) => String((req as any).userId ?? req.ip),
  message: { error: 'AI scoring rate limit exceeded. Try again in an hour.' },
});

// Apply to the scoring route
router.post('/api/suppliers/:id/score', requireAuth, aiLimiter, scoreHandler);
```

---

### H-7 — `console.error` Used in Production Code Paths
**File:** `artifacts/api-server/src/routes/suppliers.ts` L453, L731

**Problem:**  
```typescript
console.error("Onboard error:", err);         // L453
console.error("Manual WA send failed...");    // L731
```
`console.error` writes unstructured, uncorrelated output to stdout. In production, errors logged this way are invisible to Sentry, cannot be traced to a request ID, and may include stack traces or internal state that leaks to log aggregators.

**Fix:**
```typescript
// Replace console.error with the structured logger (or Sentry.captureException)
import { logger } from '../lib/logger'; // or however logging is structured

logger.error({ err, supplierId }, 'Onboard pipeline error');
logger.error({ supplierId, waError: err.message }, 'Manual WhatsApp send failed');
```

---

### H-8 — Buyers Can Create and Manage Supplier Products (No Role Enforcement)
**File:** `artifacts/api-server/src/routes/supplier-products.ts` (or equivalent products route)

**Problem:**  
`POST /supplier/products` applies only `requireAuth`. It then fetches the caller's company by `userId` — but `companiesTable` rows are created for both buyer and supplier registrations. Any authenticated user with a company row passes the guard. No check exists for `userRole === 'SUPPLIER'` or a linked `suppliersTable` row. A buyer account can create, edit, and delete "supplier" products.

Additionally, the product insert sets `companyId` but **never sets `supplierId`**. The public marketplace query uses `INNER JOIN suppliersTable ON products.supplierId = suppliersTable.id`, so even legitimately supplier-created products are invisible to buyers.

**Why it matters:** Two failures in one route: (1) broken access control allows buyers to inject products, (2) a data-flow gap means supplier products never appear in the marketplace regardless of who creates them.

**Fix:**
```typescript
// 1. Add role check at route level
router.post('/api/supplier/products', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const userRole = (req as any).userRole;
  
  if (userRole !== 'SUPPLIER') {
    return res.status(403).json({ error: 'Only supplier accounts can manage products' });
  }
  
  // 2. Fetch the supplier record, not just company
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.userId, userId))
    .limit(1);
  
  if (!supplier) return res.status(403).json({ error: 'Supplier profile required' });
  
  // 3. Set BOTH companyId and supplierId on insert
  await db.insert(productsTable).values({
    ...productData,
    companyId: supplier.companyId,
    supplierId: supplier.id,  // ← this was missing
  });
});
```

---

### H-9 — Concurrent Buyer Matching Jobs Can Produce Duplicate "Current" Rows
**File:** `artifacts/api-server/src/services/buyer-matching-service.ts`

**Problem:**  
Matching is triggered fire-and-forget from the buyer profile PATCH route. The matching service calls the LLM (expensive, slow) and only **then** opens the transaction that marks old matches stale and inserts new ones. Two concurrent PATCH saves trigger two simultaneous matching jobs. Both complete their LLM calls independently, both mark previous rows `isCurrent = false`, and both insert new rows with `isCurrent = true`. Result: duplicate current match sets visible to the buyer.

**Why it matters:** Buyer-facing match results become inconsistent and unpredictable. In a marketplace context, a buyer seeing phantom or doubled supplier matches destroys trust.

**Fix:**
```typescript
// Option A: Advisory lock per buyerProfileId (prevents concurrent jobs)
await db.transaction(async (tx) => {
  // Acquire a row-level advisory lock on this profile
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${buyerProfileId})`
  );
  
  // Check if a more recent match job ran after this one was queued
  const [existing] = await tx
    .select({ updatedAt: buyerMatchesTable.updatedAt })
    .from(buyerMatchesTable)
    .where(eq(buyerMatchesTable.buyerProfileId, buyerProfileId))
    .orderBy(desc(buyerMatchesTable.updatedAt))
    .limit(1);
  
  if (existing && existing.updatedAt > jobStartedAt) {
    return; // Another job ran more recently — skip
  }
  
  // Mark stale + insert new inside the same transaction
  await tx.update(buyerMatchesTable)
    .set({ isCurrent: false })
    .where(eq(buyerMatchesTable.buyerProfileId, buyerProfileId));
  
  await tx.insert(buyerMatchesTable).values(newMatches);
});
```

---

### H-10 — Buyer Profile PATCH Race Condition on Completion Percentage
**File:** `artifacts/api-server/src/routes/buyer-profiles.ts`

**Problem:**  
The autosave PATCH handler loads the existing profile, appends the new section to `p2SectionsDone`, recomputes `p2CompletionPct`, then writes. There is no optimistic locking or version check. The frontend debounces at ~600ms, meaning two field saves can be in-flight simultaneously. Request B can load a snapshot missing Request A's section update, compute a lower completion percentage, and overwrite Request A's progress. Sections can appear "done" then revert to "incomplete."

**Why it matters:** Completion percentage gates the matching trigger. A race that deflates `p2CompletionPct` can suppress matching for a buyer who has fully completed their profile.

**Fix:**
```typescript
// Use a database-side array append + arithmetic to avoid read-modify-write race
await db
  .update(buyerProfilesTable)
  .set({
    // Append section without reading current array first
    p2SectionsDone: sql`array_append(
      array_remove(${buyerProfilesTable.p2SectionsDone}, ${sectionName}),
      ${sectionName}
    )`,
    // Recompute percentage in the DB from the authoritative array
    p2CompletionPct: sql`
      ROUND(
        array_length(
          array_append(
            array_remove(${buyerProfilesTable.p2SectionsDone}, ${sectionName}),
            ${sectionName}
          ), 1
        )::numeric / ${TOTAL_SECTIONS} * 100
      )
    `,
    updatedAt: new Date(),
  })
  .where(eq(buyerProfilesTable.id, profileId));
```

---

## 🟡 MEDIUM

---

### M-1 — N+1 Query in `GET /api/finance/loans`
**File:** `artifacts/api-server/src/routes/financing.ts` ~L56

**Problem:**  
```typescript
const loansWithRepayments = await Promise.all(
  loans.map(async (loan) => {
    const repayments = await db.select().from(repaymentsTable)
      .where(eq(repaymentsTable.loanId, loan.id));
    return { ...loan, repayments };
  })
);
```
This fires one repayments query **per loan**. For a user with 20 loans: 1 loans query + 20 repayments queries = 21 round-trips. The queries run in parallel via `Promise.all` but each still incurs a full DB round-trip and connection pool slot.

**Fix:**
```typescript
// Batch fetch all repayments in a single query, then join in memory
const loanIds = loans.map(l => l.id);
const allRepayments = await db
  .select()
  .from(repaymentsTable)
  .where(inArray(repaymentsTable.loanId, loanIds));

const repaymentsByLoan = Map.groupBy(allRepayments, r => r.loanId);
const loansWithRepayments = loans.map(loan => ({
  ...loan,
  repayments: repaymentsByLoan.get(loan.id) ?? [],
}));
```

---

### M-2 — Marketplace Hardcoded to 20 Results, No Pagination
**File:** `artifacts/api-server/src/routes/suppliers.ts` ~L788

**Problem:**  
```typescript
.limit(20)
```
The marketplace supplier list is hardcoded to return exactly 20 results with no pagination controls. As the supplier catalogue grows, users cannot browse beyond the first page and no pagination metadata is returned to the client.

**Fix:** Accept `page` and `pageSize` query parameters with sensible defaults and caps (same pattern as H-4 above). Return `{ data, total, page, pageSize }` in the response.

---

### M-3 — Platform Fee Percentage Hardcoded as a Magic Number
**File:** `artifacts/api-server/src/routes/suppliers.ts` ~L928

**Problem:**  
```typescript
platformFeePercent: 4
```
A financial value that determines revenue is hardcoded as a literal. A fee change requires a code deploy, not a configuration change. It also makes the value invisible to finance/ops teams who cannot inspect or override it without a developer.

**Fix:**
```typescript
// Pull from env or a config table
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 4);
if (isNaN(PLATFORM_FEE_PERCENT) || PLATFORM_FEE_PERCENT < 0 || PLATFORM_FEE_PERCENT > 100) {
  throw new Error('Invalid PLATFORM_FEE_PERCENT configuration');
}
```

---

### M-4 — AI Response Not Validated Against a Schema (No Zod)
**Files:**  
- `artifacts/api-server/src/services/scoring-service.ts` ~L52  
- `artifacts/api-server/src/services/buyer-matching-service.ts` ~L45

**Problem:**  
Both services call `JSON.parse(jsonStr)` on raw AI output with minimal checks:
```typescript
// scoring-service.ts
const parsed = JSON.parse(jsonStr);
if (!Array.isArray(parsed.factors)) throw new Error('bad response');
// buyer-matching-service.ts
const parsed = JSON.parse(jsonStr);
if (!Array.isArray(parsed)) throw new Error('Expected array');
```
If the model hallucinates a different JSON structure, a numeric field where a string is expected, or a missing required key, the code proceeds with `undefined` values, causing silent data corruption or type errors downstream.

**Fix:**
```typescript
import { z } from 'zod';

const ScoringResponseSchema = z.object({
  score: z.number().min(0).max(100),
  factors: z.array(z.object({ factor: z.string(), weight: z.number() })),
  pathway: z.string(),
  tier: z.enum(['PRIME', 'STANDARD', 'SUBPRIME', 'INELIGIBLE']),
});

const parsed = ScoringResponseSchema.parse(JSON.parse(jsonStr));
// Zod throws ZodError if the shape doesn't match — catch and log gracefully
```

---

### M-5 — Public Profile Endpoint Exposes Internal Status Fields
**File:** `artifacts/api-server/src/routes/suppliers.ts` (public `/api/suppliers/:id/profile` handler)

**Problem:**  
The public supplier profile endpoint returns internal operational fields such as `sellableStatus`, `ingestionStatus`, `claimStatus`, and `confidenceScore` that are intended for admin/internal use. Exposing these leaks platform internals and may confuse or mislead buyers about supplier standing.

**Fix:**
```typescript
// Explicitly select only the public-facing columns
const [profile] = await db
  .select({
    id: suppliersTable.id,
    companyName: suppliersTable.companyName,
    productCategories: suppliersTable.productCategories,
    country: suppliersTable.country,
    // ... other public fields only
    // DO NOT include: sellableStatus, ingestionStatus, claimStatus, confidenceScore
  })
  .from(suppliersTable)
  .where(eq(suppliersTable.id, supplierId));
```

---

### M-6 — AI Scoring Debug Log Includes Full Supplier PII
**File:** `artifacts/api-server/src/services/scoring-service.ts` ~L30–L33

**Problem:**  
The scoring service logs its full AI input payload in debug mode, which includes all supplier personal data (`nombreCompleto`, contact details, business data). In any environment where debug logging is enabled — including staging with real data — this creates a PII leak into log files and aggregators.

**Fix:**
```typescript
// Log a redacted summary, not the full payload
logger.debug({
  supplierId: supplier.id,
  fieldCount: Object.keys(supplierData).length,
  // DO NOT log: supplierData itself
}, 'Calling AI scoring service');
```

---

### M-7 — Forgot-Password DB Work Fires After Response Sent
**File:** `artifacts/api-server/src/routes/auth.ts` ~L259–L262

**Problem:**  
The forgot-password handler sends a 200 response immediately (correct, to prevent email enumeration), but then performs DB inserts and email dispatch **without `await`** after the response is sent. If the DB call or email send throws, the error is unhandled and the reset token may never be saved.

```typescript
res.json({ message: 'If this email exists, a reset link was sent.' });
// This work happens AFTER res.json — errors are silently swallowed:
saveResetToken(email, token).then(...).catch(console.error);
```

**Fix:**
```typescript
// Run DB work first, then respond — OR use a proper background job queue
// Since we don't want to reveal user existence, structure it as:
res.json({ message: 'If this email exists, a reset link was sent.' });

// Register an unhandledRejection-safe fire-and-forget
void saveResetTokenAndSendEmail(email, token).catch(err => {
  logger.error({ err, email: hashEmail(email) }, 'Failed to send password reset');
  Sentry.captureException(err); // don't swallow silently
});
```

---

### M-8 — Order Creation Not Wrapped in a Transaction
**File:** `artifacts/api-server/src/routes/orders.ts`

**Problem:**  
The order route validates products, inserts the order row, then inserts order items in a `Promise.all` — all in separate, non-transactional DB calls. If any item insert fails after the order row is committed, the database contains an order with no items or partial items. Product-not-found errors thrown inside the async map are also not surfaced as clean 400/404 responses at the route level.

**Fix:**
```typescript
const order = await db.transaction(async (tx) => {
  // Validate all products exist before any insert
  const productIds = items.map(i => i.productId);
  const products = await tx
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  
  if (products.length !== productIds.length) {
    throw Object.assign(new Error('One or more products not found'), { status: 404 });
  }
  
  const [newOrder] = await tx.insert(ordersTable).values({ ... }).returning();
  
  await tx.insert(orderItemsTable).values(
    items.map(item => ({ orderId: newOrder.id, ...item }))
  );
  
  return newOrder;
});
```

---

### M-9 — N+1 Query in Order Listing
**File:** `artifacts/api-server/src/routes/orders.ts` (`buildOrderResponse` helper)

**Problem:**  
`buildOrderResponse()` queries `orderItemsTable` once per order inside a `Promise.all(orders.map(...))`. Both buyer and supplier order list endpoints call this, meaning 20 orders → 21 DB round-trips. Identical pattern to M-1 (financing N+1) but in a higher-volume code path (orders are queried more frequently than loans).

**Fix:**
```typescript
// Same batch-and-join-in-memory pattern as M-1
const orderIds = orders.map(o => o.id);
const allItems = await db
  .select()
  .from(orderItemsTable)
  .where(inArray(orderItemsTable.orderId, orderIds));

const itemsByOrder = Map.groupBy(allItems, item => item.orderId);
return orders.map(order => ({ ...order, items: itemsByOrder.get(order.id) ?? [] }));
```

---

### M-10 — CSRF Risk on Cookie-Authenticated State-Changing Endpoints
**File:** `artifacts/api-server/src/app.ts`, all state-changing routes

**Problem:**  
The API uses HTTP-only cookie auth with no CSRF token and no `SameSite=Strict` enforcement. When `CORS_ORIGIN` is unset (C-2), any origin is reflected, but even with CORS fixed, cross-site `form` submissions and `fetch` with `credentials: 'include'` bypass CORS preflight for simple requests. State-changing endpoints (product creation, order creation, password change, object upload URL issuance) can be triggered cross-site.

**Why it matters:** Once C-2 is fixed, CSRF is the next cross-site attack vector. Fixing CORS does not eliminate CSRF for same-site-eligible cookie flows.

**Fix:**
```typescript
// Option A (preferred): Set SameSite=Strict on auth cookie
res.cookie('fincava_auth', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',  // blocks cross-site requests from carrying the cookie
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Option B: Add CSRF token middleware (csurf or custom double-submit cookie)
// Required if SameSite=Strict breaks legitimate cross-origin flows
```

---

## 🔵 LOW

---

### L-1 — No Maximum Password Length
**File:** `artifacts/api-server/src/routes/auth.ts` (registration validation)

**Problem:**  
Password validation enforces a minimum of 8 characters but no maximum. An attacker can submit a 1MB "password," forcing bcrypt to hash it — bcrypt on a 1MB string is computationally expensive and can be used as a CPU DoS vector.

**Fix:**
```typescript
// Add a maximum length check BEFORE hashing
if (password.length > 128) {
  return res.status(400).json({ error: 'Password must be 128 characters or fewer' });
}
```

---

### L-2 — Duplicate DB Fetch in `requireVerifiedEmail`
**File:** `artifacts/api-server/src/lib/auth.ts`

**Problem:**  
`requireVerifiedEmail` performs a separate DB SELECT even though `requireAuth` (which always runs first) has already fetched the same user record. The fetched user data is not attached to `req`, so downstream middleware repeats the query.

**Fix:**
```typescript
// In requireAuth: attach the full user object to req
(req as any).user = user; // includes emailVerified, role, etc.

// In requireVerifiedEmail: use req.user instead of querying again
export const requireVerifiedEmail = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user?.emailVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  next();
};
```

---

### L-3 — Inconsistent `supplierId` Validation Across Routes
**File:** `artifacts/api-server/src/routes/suppliers.ts` (multiple locations)

**Problem:**  
Some handlers validate `supplierId` with `isNaN()`, others use `Number()` with no NaN check, and some do neither. This inconsistency means certain routes silently pass `NaN` as a supplier ID into queries, which either returns no results (confusing) or throws a DB error (unhandled).

**Fix:** Extract a shared guard:
```typescript
function parseSupplierIdParam(param: string | undefined): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Use uniformly:
const supplierId = parseSupplierIdParam(req.params.id);
if (!supplierId) return res.status(400).json({ error: 'Invalid supplier ID' });
```

---

### L-4 — Sentry Integrated via `globalThis` Duck-Typing
**File:** `artifacts/api-server/src/services/onboard-pipeline.ts`

**Problem:**  
```typescript
(globalThis as any).Sentry?.captureException?.(err)
```
This pattern relies on Sentry being injected into `globalThis` at startup. If the Sentry SDK is not properly initialized or the global is undefined, errors are silently swallowed without any log or fallback. This is not a proper SDK integration.

**Fix:**
```typescript
// Import and initialize Sentry explicitly in a dedicated sentry.ts
import * as Sentry from '@sentry/node';
export { Sentry };

// Use it directly:
import { Sentry } from '../lib/sentry';
Sentry.captureException(err);
```

---

### L-5 — No Rate Limiting on `POST /api/auth/change-password`
**File:** `artifacts/api-server/src/routes/auth.ts` ~L218

**Problem:**  
The change-password endpoint requires authentication (good) but has no rate limiting. An attacker who compromises a session token can attempt to change the password at high speed, or the endpoint can be used to generate bcrypt computation load.

**Fix:**
```typescript
// Re-use the existing authLimiter or create a dedicated one
router.post('/api/auth/change-password', requireAuth, authLimiter, changePasswordHandler);
```

---

### L-6 — Impact Average Divide-by-Zero When All `farmSizeHa` Are Null
**File:** `artifacts/api-server/src/routes/stories.ts` ~L111

**Problem:**  
```typescript
stories.reduce((sum, s) => sum + (s.farmSizeHa ?? 0), 0)
  / stories.filter(s => s.farmSizeHa).length
```
When `stories.length > 0` but every story has `farmSizeHa = null`, the denominator is `0`, producing `Infinity`. `JSON.stringify(Infinity)` produces `null`, silently corrupting the API response with no error thrown.

**Fix:**
```typescript
const storiesWithSize = stories.filter(s => s.farmSizeHa != null);
const avgFarmSize = storiesWithSize.length > 0
  ? storiesWithSize.reduce((sum, s) => sum + s.farmSizeHa!, 0) / storiesWithSize.length
  : null; // explicit null, not Infinity
```

---

## Appendix: Combined Remediation Order (v2)

All 23 original findings confirmed live by Replit. 9 new gaps added. Ordered by severity × effort — fix top-to-bottom before any beta users touch production.

### Batch 1 — Critical Security (do before any external user touches production)

| # | ID | Issue | Est. Effort |
|---|----|--------------------------------------------|------------|
| 1 | C-5 | Enable auth + ACL on storage upload URL + object serve | 45 min |
| 2 | C-6 | Remove hardcoded default admin password from seed.ts | 10 min |
| 3 | C-2 | Fix CORS wildcard — fail fast if `CORS_ORIGIN` not set | 5 min |
| 4 | C-4 | Guard supplier onboard update path (admin/officer only) | 20 min |
| 5 | C-3 | Drop plaintext token column + remove `OR` fallback in auth.ts | 30 min |
| 6 | C-1 | Wrap loan creation in a DB transaction | 45 min |
| 7 | H-7 | Replace `console.error` with `logger.error` (2 locations) | 5 min |

### Batch 2 — High Issues (address in current sprint)

| # | ID | Issue | Est. Effort |
|---|----|--------------------------------------------|------------|
| 8 | H-8 | Add supplier role check to product routes + set `supplierId` on insert | 30 min |
| 9 | H-9 | Wrap buyer matching in transaction + prevent concurrent runs | 45 min |
| 10 | M-8 | Wrap order creation in a DB transaction | 30 min |
| 11 | H-6 | Add AI scoring rate limiter | 10 min |
| 12 | H-1 | `timingSafeEqual` for backup secret comparison | 5 min |
| 13 | H-3 | Fix pagination count to respect applied filters | 30 min |
| 14 | H-4 | Enforce `LIMIT` on admin supplier list | 10 min |
| 15 | H-5 | Sanitize supplier name + AI pathway before WhatsApp send | 20 min |
| 16 | H-2 | Cache user in requireAuth to avoid per-request DB fetch | 45 min |
| 17 | H-10 | Fix buyer profile PATCH race via DB-side `array_append` | 30 min |

### Batch 3 — Medium and Low (follow-on sprint)

| # | ID | Issue | Est. Effort |
|---|----|--------------------------------------------|------------|
| 18 | M-10 | Set `SameSite=Strict` on auth cookie to prevent CSRF | 5 min |
| 19 | L-1 | Add max password length (128 chars) before bcrypt | 5 min |
| 20 | L-5 | Rate-limit `change-password` endpoint | 5 min |
| 21 | M-3 | Move `platformFeePercent` to env var | 10 min |
| 22 | L-6 | Guard impact average divide-by-zero | 5 min |
| 23 | M-7 | Handle forgot-password post-response errors properly | 15 min |
| 24 | M-9 | Fix N+1 in order listing (batch query + in-memory join) | 20 min |
| 25 | M-1 | Fix N+1 in loan repayments | 20 min |
| 26 | M-4 | Add Zod schemas for AI scoring + matching responses | 45 min |
| 27 | L-4 | Replace `globalThis` Sentry with proper SDK import | 20 min |
| 28 | M-5 | Restrict public supplier profile to public-safe fields only | 20 min |
| 29 | M-6 | Redact PII from scoring service debug logs | 10 min |
| 30 | L-2 | Avoid duplicate DB fetch in `requireVerifiedEmail` | 30 min |
| 31 | L-3 | Standardize `supplierId` NaN parsing across all routes | 30 min |
| 32 | M-2 | Add pagination to marketplace (remove hardcoded 20) | 30 min |

---

*v1 — 23 findings from live codebase scan of https://github.com/sbirfan/FinCava-Hub*  
*v2 — 9 additional gaps added from Replit live verification pass (2026-05-06)*
