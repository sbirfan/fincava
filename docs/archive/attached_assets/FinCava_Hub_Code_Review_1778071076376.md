# FinCava-Hub — Comprehensive Code Review
**Date:** 2026-05-06  
**Reviewer:** Claude (Anthropic)  
**Source:** Live codebase at https://github.com/sbirfan/FinCava-Hub  
**Scope:** Security, Architecture, Performance, Data Integrity, Error Handling

---

## Summary

23 findings across 4 severity levels. **4 Critical** issues require immediate remediation before any production deployment. **7 High** issues are significant enough to block a beta launch. **7 Medium** issues are addressable in a follow-on sprint. **5 Low** issues are code quality improvements.

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟠 High | 7 |
| 🟡 Medium | 7 |
| 🔵 Low | 5 |

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

## Appendix: Quick-Win Priority Order

For a team triaging remediation, the recommended fix order based on severity × effort:

1. **C-2** CORS wildcard — 1 line change, catastrophic if exploited in production
2. **C-4** Unauthenticated supplier update — add `requireAuth` + owner check
3. **C-3** Drop plaintext token column — schema migration + 2-line auth.ts change
4. **C-1** Loan creation transaction — refactor ~35 lines
5. **H-6** AI scoring rate limiter — add 5 lines to app.ts
6. **H-5** Sanitize WhatsApp message — add sanitizer function
7. **H-4** Add LIMIT to admin supplier list — 3-line fix
8. **H-3** Fix pagination count to respect filters — extract shared where clause
9. **H-1** Timing-safe backup secret — swap `===` for `timingSafeEqual`
10. **H-2** requireAuth caching — JWT-claims shortcut or 60s cache

---

*Report generated from live codebase scan of https://github.com/sbirfan/FinCava-Hub*
