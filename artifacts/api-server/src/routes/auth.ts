import { Router, type IRouter } from "express";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import rateLimit from "express-rate-limit";
import { db, usersTable, profilesTable, companiesTable, passwordResetTokensTable, emailVerificationTokensTable, buyerProfilesTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, generateToken, requireAuth, getUserWithProfile } from "../lib/auth";
import { logger } from "../lib/logger";
import { sendEmail, passwordResetEmail, welcomeEmail, verificationEmail } from "../lib/email";
import { runMatching as runBuyerMatching } from "../services/buyer-matching-service";

/** sha256 hex digest of a raw token — used for secure storage and lookup. */
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Masks email local-part for privacy-safe logging: foo@bar.com → f***@bar.com */
function maskEmail(raw: string): string {
  const at = raw.indexOf("@");
  if (at <= 0) return "***";
  return `${raw[0]}***${raw.slice(at)}`;
}

/** One-way hash of client IP for log correlation without storing the address. */
function hashIp(ip: string | undefined): string {
  if (!ip) return "unknown";
  return `hash:${createHash("sha256").update(ip).digest("hex").slice(0, 8)}`;
}

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skipSuccessfulRequests: false,
});

const router: IRouter = Router();

// Replit preview pane is a cross-site iframe — requires SameSite=None; Secure.
// Local dev on HTTP uses lax to avoid requiring HTTPS.
const IS_REPLIT = !!process.env["REPLIT_DOMAINS"];
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (IS_REPLIT ? "none" : "lax") as "none" | "lax",
  secure: IS_REPLIT || process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function buildUserResponse(user: any, profile: any, company: any) {
  const createdAt = user.createdAt instanceof Date
    ? user.createdAt.toISOString()
    : String(user.createdAt ?? "");
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    country: profile?.country ?? null,
    language: profile?.language ?? "en",
    avatarUrl: profile?.avatarUrl ?? null,
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    companyVerified: company?.verified ?? null,
    createdAt,
    emailVerifiedAt: user.emailVerifiedAt instanceof Date
      ? user.emailVerifiedAt.toISOString()
      : (user.emailVerifiedAt ?? null),
  };
}

function getAppBaseUrl(): string {
  return process.env["FRONTEND_URL"]
    ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
}

async function sendVerificationEmail(userId: number, email: string, firstName: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await db.insert(emailVerificationTokensTable).values({ userId, token, tokenHash: hashToken(token), expiresAt });
  const verifyUrl = `${getAppBaseUrl()}/verify-email?token=${token}`;
  const { html, text, subject } = verificationEmail({ firstName: firstName || "there", verifyUrl });
  const result = await sendEmail({ to: email, subject, html, text });
  if (result.ok) {
    logger.info({ userId, email: maskEmail(email) }, "Verification email sent");
  } else {
    logger.error({ userId, email: maskEmail(email), reason: result.reason, detail: (result as any).detail }, "Verification email delivery failed");
  }
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, firstName, lastName, role, companyName, country, region } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  // ── Atomic: user + profile + company — rolls back all on failure ─────────────
  const companyType = role === "BUYER" ? "IMPORTER" : "EXPORTER";
  const { user, profile, company } = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(usersTable)
      .values({ email, passwordHash, role })
      .returning();

    const [profile] = await tx
      .insert(profilesTable)
      .values({
        userId: user.id,
        firstName,
        lastName,
        country: country ?? null,
        language: "en",
      })
      .returning();

    const [company] = await tx
      .insert(companiesTable)
      .values({
        userId: user.id,
        name: companyName,
        type: companyType as any,
        country: country,
        region: region ?? null,
        description: "",
        verified: false,
      })
      .returning();

    return { user, profile, company };
  });

  const token = generateToken(user.id);
  res.cookie("fincava_auth", token, COOKIE_OPTIONS);
  res.status(201).json({
    token,
    user: buildUserResponse(user, profile, company),
  });

  // Fire-and-forget: send welcome email + verification email to new registrant
  Promise.resolve().then(async () => {
    const emailContent = welcomeEmail({
      firstName: firstName || "there",
      role: user.role,
      loginUrl: `${getAppBaseUrl()}/login`,
    });
    const welcomeResult = await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
    if (!welcomeResult.ok) {
      logger.warn({ userId: user.id, reason: welcomeResult.reason, detail: (welcomeResult as any).detail }, "Welcome email delivery failed");
    }
    try {
      await sendVerificationEmail(user.id, user.email, firstName);
    } catch (err) {
      logger.warn({ err, userId: user.id }, "Verification email failed");
    }
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  const result = user ? await verifyPassword(password, user.passwordHash) : { valid: false as const };
  if (!user || !result.valid) {
    if (user && "errorCode" in result && result.errorCode === "LEGACY_SALT_MISSING") {
      logger.error({ userId: user.id, email: maskEmail(email) }, "Login blocked: LEGACY_HASH_SALT env var not set — legacy password verification unavailable");
    } else {
      logger.warn({ email: maskEmail(email), ip: hashIp(req.ip) }, "Login failed: invalid credentials");
    }
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Transparently upgrade legacy SHA-256 hashes to bcrypt on first login
  if (result.newHash) {
    await db.update(usersTable).set({ passwordHash: result.newHash }).where(eq(usersTable.id, user.id));
    logger.info({ userId: user.id, email: maskEmail(email) }, "Password hash upgraded: SHA-256 → bcrypt");
  }
  logger.info({ userId: user.id, email: maskEmail(email), role: user.role, ip: hashIp(req.ip) }, "Login success");

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, user.id));

  const token = generateToken(user.id);
  res.cookie("fincava_auth", token, COOKIE_OPTIONS);
  res.json({
    token,
    user: buildUserResponse(user, profile, company),
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.clearCookie("fincava_auth", { path: "/" });
  res.json({ message: "Logged out successfully" });
});

router.put("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const userId = req.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const result = await verifyPassword(currentPassword, user.passwordHash);
  if (!result.valid) {
    if (result.errorCode === "LEGACY_SALT_MISSING") {
      logger.error({ userId, email: maskEmail(user.email) }, "Change-password blocked: LEGACY_HASH_SALT env var not set — legacy password verification unavailable");
    }
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await db.update(usersTable).set({ passwordHash: await hashPassword(newPassword) }).where(eq(usersTable.id, userId));
  logger.info({ userId, email: maskEmail(user.email) }, "Password changed successfully");
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const { user, profile } = await getUserWithProfile(userId);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  res.json(buildUserResponse(user, profile, company));
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post("/auth/forgot-password", passwordResetLimiter, async (req, res): Promise<void> => {
  const email = (typeof req.body?.email === "string" ? req.body.email : "").toLowerCase().trim();
  // Always return 200 to prevent email enumeration
  res.json({ message: "If that email is registered, a reset link has been sent." });

  if (!email) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) return;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokensTable).values({ userId: user.id, token, tokenHash: hashToken(token), expiresAt });

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;

  const { html, text } = passwordResetEmail({ resetUrl, firstName: profile?.firstName ?? "there" });
  const result = await sendEmail({ to: user.email, subject: "Reset your Fincava password", html, text });
  if (result.ok) {
    logger.info({ userId: user.id, email: maskEmail(email) }, "Password reset email sent");
  } else {
    logger.error({ userId: user.id, email: maskEmail(email), reason: result.reason, detail: (result as any).detail }, "Password reset email delivery failed");
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post("/auth/reset-password", passwordResetLimiter, async (req, res): Promise<void> => {
  const { token, password } = req.body ?? {};

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Reset token is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Cheap pre-flight check: reject obviously invalid/expired tokens before hashing
  const tokenHash = hashToken(token);
  const now = new Date();
  const [preCheck] = await db
    .select({ id: passwordResetTokensTable.id })
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        eq(passwordResetTokensTable.used, false),
        gt(passwordResetTokensTable.expiresAt, now),
      ),
    );

  if (!preCheck) {
    res.status(400).json({ error: "This reset link is invalid or has expired." });
    return;
  }

  // Hash password only after confirming the token looks valid (CPU-intensive)
  const passwordHash = await hashPassword(password);

  // Wrap everything in a transaction: atomic token consumption + password update
  // If the password update fails, the token remains unused so the user can retry
  const record = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(passwordResetTokensTable)
      .set({ used: true })
      .where(
        and(
          eq(passwordResetTokensTable.tokenHash, tokenHash),
          eq(passwordResetTokensTable.used, false),
          gt(passwordResetTokensTable.expiresAt, now),
        ),
      )
      .returning();

    if (!claimed) return null;

    // Invalidate all other unused tokens for this user (defence in depth)
    await tx
      .update(passwordResetTokensTable)
      .set({ used: true })
      .where(
        and(
          eq(passwordResetTokensTable.userId, claimed.userId),
          eq(passwordResetTokensTable.used, false),
        ),
      );

    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, claimed.userId));

    return claimed;
  });

  if (!record) {
    res.status(400).json({ error: "This reset link is invalid or has expired." });
    return;
  }

  logger.info({ userId: record.userId }, "Password reset successfully");
  res.json({ success: true });
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
// Token is sent in the request body to avoid exposure in server logs, browser
// history, and Referer headers (was previously a GET with ?token= query param).
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";

  if (!token) {
    res.status(400).json({ error: "Verification token is required" });
    return;
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const record = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(emailVerificationTokensTable)
      .set({ used: true })
      .where(
        and(
          eq(emailVerificationTokensTable.tokenHash, tokenHash),
          eq(emailVerificationTokensTable.used, false),
          gt(emailVerificationTokensTable.expiresAt, now),
        ),
      )
      .returning();

    if (!claimed) return null;

    const verifiedRows = await tx
      .update(usersTable)
      .set({ emailVerifiedAt: now })
      .where(
        and(
          eq(usersTable.id, claimed.userId),
          isNull(usersTable.emailVerifiedAt),
        ),
      )
      .returning({ id: usersTable.id });

    // emailJustVerified is the durable idempotency gate for post-response
    // side effects. True only on the first successful claim; repeated token
    // claims (e.g. multiple valid tokens from resend) find emailVerifiedAt
    // already set, so verifiedRows is empty and side effects are skipped.
    const emailJustVerified = verifiedRows.length > 0;

    // For BUYERs, transition Phase 1 buyer_profiles.state REGISTERED → ACTIVE.
    // Idempotent: only updates rows currently in REGISTERED state.
    const [user] = await tx
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, claimed.userId));

    let buyerActivated = false;
    if (user?.role === "BUYER") {
      const transitioned = await tx
        .update(buyerProfilesTable)
        .set({ state: "ACTIVE", updatedAt: now })
        .where(
          and(
            eq(buyerProfilesTable.userId, claimed.userId),
            eq(buyerProfilesTable.state, "REGISTERED"),
          ),
        )
        .returning({ id: buyerProfilesTable.id });
      buyerActivated = transitioned.length > 0;
    }

    return { claimed, role: user?.role ?? null, buyerActivated, emailJustVerified };
  });

  if (!record) {
    res.status(400).json({ error: "This verification link is invalid or has expired." });
    return;
  }

  logger.info({ userId: record.claimed.userId, role: record.role, emailJustVerified: record.emailJustVerified }, "Email verified successfully");
  res.json({ message: "Email verified successfully. You can now close this page." });

  // Fire-and-forget: send welcome email to verified buyers.
  // emailJustVerified gates both blocks — side effects run exactly once even
  // when the user holds multiple valid tokens from prior resend requests.
  if (record.role === "BUYER" && record.emailJustVerified) {
    Promise.resolve().then(async () => {
      try {
        const [profile] = await db
          .select({ firstName: profilesTable.firstName })
          .from(profilesTable)
          .where(eq(profilesTable.userId, record.claimed.userId));
        const [u] = await db
          .select({ email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, record.claimed.userId));
        if (!u) return;
        const { html, text, subject } = welcomeEmail({
          firstName: profile?.firstName ?? "there",
          role: "BUYER",
          loginUrl: `${getAppBaseUrl()}/dashboard`,
        });
        const result = await sendEmail({ to: u.email, subject, html, text });
        if (!result.ok) {
          logger.warn(
            { userId: record.claimed.userId, reason: result.reason },
            "Buyer welcome email (post-verify) delivery failed",
          );
        }
      } catch (err) {
        logger.error({ err, userId: record.claimed.userId }, "Buyer welcome email (post-verify) error");
      }
    });

    // Phase 3: if the buyer pre-completed sections A+B before verifying email,
    // matching never fired through PATCH. Run it now (fire-and-forget).
    Promise.resolve().then(async () => {
      try {
        const [bp] = await db
          .select({
            id: buyerProfilesTable.id,
            sectionsDone: buyerProfilesTable.p2SectionsDone,
            matchingRunCount: buyerProfilesTable.matchingRunCount,
          })
          .from(buyerProfilesTable)
          .where(eq(buyerProfilesTable.userId, record.claimed.userId));
        if (!bp) return;
        const sections = (bp.sectionsDone ?? []) as string[];
        const hasAB = sections.includes("A") && sections.includes("B");
        if (hasAB && (bp.matchingRunCount ?? 0) === 0) {
          await runBuyerMatching(bp.id);
        }
      } catch (err) {
        logger.warn(
          { err, userId: record.claimed.userId },
          "post-verify buyer matching trigger failed (non-fatal)",
        );
      }
    });
  }
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
router.post("/auth/resend-verification", passwordResetLimiter, requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.emailVerifiedAt) {
    res.status(409).json({ error: "Email is already verified" });
    return;
  }

  // Respond immediately, send email in background
  res.json({ message: "If your email is not yet verified, a new verification link has been sent." });

  Promise.resolve().then(async () => {
    try {
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
      await sendVerificationEmail(userId, user.email, profile?.firstName ?? "");
    } catch (err) {
      logger.warn({ err, userId }, "Resend verification email failed");
    }
  });
});

export default router;
