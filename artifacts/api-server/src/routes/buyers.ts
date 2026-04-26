// buyers.ts
// POST /api/buyers/onboard  — create or update a buyer profile (upsert).
// GET  /api/buyers/profile  — fetch the authenticated buyer's profile.
//
// Duplicate-prevention: UNIQUE(user_id) enforced at DB + upsert ON CONFLICT.
// Email notification fires on first-time onboard only (fire-and-forget; failure
// is logged and never propagated to the caller).

import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, buyerProfilesTable, usersTable, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { sendEmail, buyerOnboardAdminAlertEmail } from "../lib/email";
import { logInteraction } from "../lib/interaction-logger";

const router: IRouter = Router();

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
  res.status(201).json({ profile });

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
          to: "info@fincava.com",
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
