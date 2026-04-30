// buyers.ts
// POST /api/buyers/register — Phase 1 registration (PUBLIC — full transaction:
//                              create user, send verification email, create
//                              company, create buyer_profile with Phase 1 data).
// POST /api/buyers/onboard  — create or update a buyer profile (legacy upsert,
//                              requires existing authenticated user).
// GET  /api/buyers/profile  — fetch the authenticated buyer's profile.
//
// Duplicate-prevention: UNIQUE(user_id) enforced at DB + upsert ON CONFLICT.
// Email notification fires on first-time onboard only (fire-and-forget; failure
// is logged and never propagated to the caller).

import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import {
  db,
  buyerProfilesTable,
  usersTable,
  profilesTable,
  companiesTable,
  emailVerificationTokensTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { hashPassword, generateToken, requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  sendEmail,
  buyerOnboardAdminAlertEmail,
  verificationEmail,
} from "../lib/email";
import { logInteraction } from "../lib/interaction-logger";

const router: IRouter = Router();

// ── Replit-aware cookie + base URL helpers (mirrored from auth.ts) ────────────
const IS_REPLIT = !!process.env["REPLIT_DOMAINS"];
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (IS_REPLIT ? "none" : "lax") as "none" | "lax",
  secure: IS_REPLIT || process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function getAppBaseUrl(): string {
  return (
    process.env["FRONTEND_URL"] ??
    (process.env["REPLIT_DOMAINS"]
      ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}`
      : "http://localhost:25876")
  );
}

// ── Phase 1 registration schema (BG11) ────────────────────────────────────────
const Phase1RegistrationBody = z.object({
  // Account
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100).optional(),
  // Company
  companyName: z.string().min(2).max(200),
  companyType: z.enum([
    "IMPORTER",
    "DISTRIBUTOR",
    "ROASTER",
    "MANUFACTURER",
    "COOPERATIVE",
    "EXPORTER",
    "SMALLHOLDER",
  ]),
  country: z.string().min(2).max(100),
  // Phase 1 trade intent
  productCategories: z
    .array(
      z.enum([
        "COFFEE",
        "CACAO",
        "AVOCADO",
        "EXOTIC_FRUIT",
        "SUPERFOOD",
        "PROCESSED",
        "TEXTILE",
        "OTHER",
      ]),
    )
    .min(1)
    .max(8),
  volumeBand: z.enum(["<10MT", "10-50MT", "50-200MT", "200+MT"]),
  requiredCerts: z.array(z.string().min(1).max(80)).max(20).default([]),
  timeToFirstOrder: z.enum(["WITHIN_30D", "1_3M", "3_6M", "EXPLORATORY"]),
  // Optional
  marketingOptIn: z.boolean().default(false),
});

// ── POST /api/buyers/register (PUBLIC, transactional) ─────────────────────────
router.post("/buyers/register", async (req, res): Promise<void> => {
  const parsed = Phase1RegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  // Conflict: email already registered
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(data.password);

  // ── Transaction: user + profile + company + buyer_profile ───────────────────
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(usersTable)
      .values({ email, passwordHash, role: "BUYER" })
      .returning();

    const [userProfile] = await tx
      .insert(profilesTable)
      .values({
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        country: data.country,
        language: "en",
      })
      .returning();

    const [company] = await tx
      .insert(companiesTable)
      .values({
        userId: user.id,
        name: data.companyName,
        type: data.companyType as any,
        country: data.country,
        description: "",
        verified: false,
      })
      .returning();

    const [buyerProfile] = await tx
      .insert(buyerProfilesTable)
      .values({
        userId: user.id,
        companyName: data.companyName,
        country: data.country,
        // Phase 1 enrichment
        state: "REGISTERED",
        volumeBand: data.volumeBand,
        requiredCertsP1: data.requiredCerts,
        timeToFirstOrder: data.timeToFirstOrder,
        targetProducts: data.productCategories,
        marketingOptIn: data.marketingOptIn,
        updatedAt: new Date(),
      })
      .returning();

    return { user, userProfile, company, buyerProfile };
  });

  // ── Issue session cookie so user lands authenticated ────────────────────────
  const sessionToken = generateToken(result.user.id);
  res.cookie("fincava_auth", sessionToken, COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    data: {
      userId: result.user.id,
      companyId: result.company.id,
      buyerProfileId: result.buyerProfile.id,
      state: result.buyerProfile.state,
    },
  });

  // ── Fire-and-forget: verification email ─────────────────────────────────────
  Promise.resolve().then(async () => {
    try {
      const verifyToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db
        .insert(emailVerificationTokensTable)
        .values({ userId: result.user.id, token: verifyToken, expiresAt });

      const verifyUrl = `${getAppBaseUrl()}/verify-email?token=${verifyToken}`;
      const { html, text, subject } = verificationEmail({
        firstName: data.firstName,
        verifyUrl,
      });
      const sendResult = await sendEmail({ to: email, subject, html, text });
      if (!sendResult.ok) {
        req.log.error(
          { userId: result.user.id, reason: sendResult.reason },
          "buyer register verification email failed",
        );
      }
    } catch (err) {
      req.log.error({ err, userId: result.user.id }, "buyer verification email error");
    }
  });

  // ── Fire-and-forget: admin alert ────────────────────────────────────────────
  Promise.resolve().then(async () => {
    try {
      const buyerName = `${data.firstName}${data.lastName ? " " + data.lastName : ""}`.trim();
      const emailContent = buyerOnboardAdminAlertEmail({
        buyerName,
        email,
        companyName: data.companyName,
        country: data.country,
        targetProducts: data.productCategories,
        preferredIncoterm: null,
        intendedVolumeMt: null,
        importFrequency: data.timeToFirstOrder,
        userId: result.user.id,
        adminUrl: `${getAppBaseUrl()}/admin/buyers`,
      });
      await sendEmail({
        to: "sbirfan@gmail.com",
        subject: `New buyer registered (Phase 1): ${buyerName}`,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (err) {
      req.log.error({ err, userId: result.user.id }, "buyer register admin alert failed");
    }
  });

  // ── Interaction signal ──────────────────────────────────────────────────────
  logInteraction({
    eventType: "buyer_register_phase1",
    actorId: result.user.id,
    actorType: "buyer",
    referenceId: result.buyerProfile.id,
    referenceType: "buyer_profile",
    payload: {
      companyType: data.companyType,
      country: data.country,
      volumeBand: data.volumeBand,
      productCategories: data.productCategories,
      timeToFirstOrder: data.timeToFirstOrder,
    },
  });

  logger.info(
    { userId: result.user.id, buyerProfileId: result.buyerProfile.id },
    "buyer registered (Phase 1)",
  );
});

// ── Validation schema ─────────────────────────────────────────────────────────
const BuyerOnboardBody = z.object({
  companyName:       z.string().min(1).max(200).optional(),
  country:           z.string().min(1).max(100).optional(),
  destinationPort:   z.string().max(100).optional(),
  targetProducts:    z.array(z.string().min(1).max(100)).max(20).optional(),
  preferredIncoterm: z.enum(["FOB", "CIF", "DAP", "EXW", "CFR"]).optional(),
  intendedVolumeMt:  z.number().positive().max(100_000).optional(),
  importFrequency:   z.enum(["MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "SPOT"]).optional(),
});

// ── POST /api/buyers/onboard ──────────────────────────────────────────────────
router.post("/buyers/onboard", requireAuth, async (req, res): Promise<void> => {
  const userId: number = (req as any).userId;

  const parsed = BuyerOnboardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const {
    companyName,
    country,
    destinationPort,
    targetProducts,
    preferredIncoterm,
    intendedVolumeMt,
    importFrequency,
  } = parsed.data;

  // Verify the user exists and has BUYER role.
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role !== "BUYER") {
    res.status(403).json({ error: "Only BUYER accounts can submit a buyer profile" });
    return;
  }

  // Check whether a profile already exists so we know if this is a first-time
  // onboard (drives the admin email — we only send it on creation, not updates).
  const [existing] = await db
    .select({ id: buyerProfilesTable.id })
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.userId, userId));

  const isNewProfile = !existing;

  // Upsert — ON CONFLICT(user_id) DO UPDATE so a second call updates in place.
  // The UNIQUE index on user_id makes this safe; no duplicate rows are possible.
  const [profile] = await db
    .insert(buyerProfilesTable)
    .values({
      userId,
      companyName:       companyName       ?? null,
      country:           country           ?? null,
      destinationPort:   destinationPort   ?? null,
      targetProducts:    targetProducts    ?? [],
      preferredIncoterm: preferredIncoterm ?? null,
      intendedVolumeMt:  intendedVolumeMt  ?? null,
      importFrequency:   importFrequency   ?? null,
      updatedAt:         new Date(),
    })
    .onConflictDoUpdate({
      target: buyerProfilesTable.userId,
      set: {
        companyName:       companyName       ?? null,
        country:           country           ?? null,
        destinationPort:   destinationPort   ?? null,
        targetProducts:    targetProducts    ?? [],
        preferredIncoterm: preferredIncoterm ?? null,
        intendedVolumeMt:  intendedVolumeMt  ?? null,
        importFrequency:   importFrequency   ?? null,
        updatedAt:         sql`now()`,
      },
    })
    .returning();

  logger.info({ userId, profileId: profile.id, isNewProfile }, "buyer onboarded");

  // Respond immediately — async work runs after.
  res.status(isNewProfile ? 201 : 200).json({ profile });

  // ── Interaction signal (fire-and-forget, new profiles only) ───────────────
  if (isNewProfile) {
    logInteraction({
      eventType:     "buyer_onboarding",
      actorId:       userId,
      actorType:     "buyer",
      referenceId:   profile.id,
      referenceType: "buyer_profile",
      payload: {
        country:           profile.country,
        targetProducts:    profile.targetProducts,
        preferredIncoterm: profile.preferredIncoterm,
      },
    });
  }

  // ── Fire-and-forget admin alert (new profiles only) ────────────────────────
  // Any failure here is caught, logged, and never propagated to the caller.
  if (isNewProfile) {
    Promise.resolve().then(async () => {
      try {
        const appBaseUrl =
          process.env["FRONTEND_URL"] ??
          (process.env["REPLIT_DOMAINS"]
            ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}`
            : "http://localhost:25876");

        // Resolve buyer's display name from profiles table (may not exist yet).
        const [buyerProfile] = await db
          .select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
          .from(profilesTable)
          .where(eq(profilesTable.userId, userId));

        const buyerName = buyerProfile?.firstName
          ? `${buyerProfile.firstName}${buyerProfile.lastName ? ` ${buyerProfile.lastName}` : ""}`.trim()
          : user.email;

        const emailContent = buyerOnboardAdminAlertEmail({
          buyerName,
          email: user.email,
          companyName:       profile.companyName,
          country:           profile.country,
          targetProducts:    profile.targetProducts,
          preferredIncoterm: profile.preferredIncoterm,
          intendedVolumeMt:  profile.intendedVolumeMt,
          importFrequency:   profile.importFrequency,
          userId,
          adminUrl: `${appBaseUrl}/admin/buyers`,
        });

        await sendEmail({
          to: "sbirfan@gmail.com",
          subject: `New buyer onboarded: ${buyerName}`,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (err) {
        logger.error({ err, userId }, "buyer onboard admin alert email failed");
      }
    });
  }
});

// ── GET /api/buyers/profile ───────────────────────────────────────────────────
router.get("/buyers/profile", requireAuth, async (req, res): Promise<void> => {
  const userId: number = (req as any).userId;

  const [profile] = await db
    .select()
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.userId, userId));

  if (!profile) {
    res.status(404).json({ error: "No buyer profile found" });
    return;
  }

  res.json({ profile });
});

export default router;
