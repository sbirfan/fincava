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
  buyerMatchesTable,
  suppliersTable,
  productsTable,
  usersTable,
  profilesTable,
  companiesTable,
  emailVerificationTokensTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { hashPassword, generateToken, requireAuth } from "../lib/auth";
import { requireAdmin } from "../middleware/admin";
import { ENABLE_INTELLIGENCE_PUBLIC } from "../lib/flags";
import { logger } from "../lib/logger";
import {
  sendEmail,
  getAdminEmails,
  buyerOnboardAdminAlertEmail,
  verificationEmail,
} from "../lib/email";
import { logInteraction } from "../lib/interaction-logger";
import {
  runMatching as runBuyerMatching,
  countCoarseMatches,
  computeFieldsThatImproveMatch,
} from "../services/buyer-matching-service";
import { analyseGaps as analyseBuyerGaps } from "../services/buyer-gap-service";

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
      const adminEmails = await getAdminEmails();
      await sendEmail({
        to: adminEmails,
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
  const userId: number = req.userId;

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

        const adminEmailsOnboard = await getAdminEmails();
        await sendEmail({
          to: adminEmailsOnboard,
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
  const userId: number = req.userId;

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

// ── Phase 2 Profiling: per-field PATCH with auto-save ────────────────────────
// PATCH /api/buyers/:id/profile
// Body: { section: 'A'|'B'|'C'|'D'|'E'|'F', field: string, value: unknown }
// Field names are allow-listed per section; values are validated per-field.
// Recomputes p2_completion_pct + p2_sections_done inline.
// Returns: { section, completion_pct, sections_done, matching_triggered }.
//
// matching_triggered is true when this save first pushes sections_done to
// include both 'A' and 'B', OR when matchingRunCount > 0 and a *new* section
// was added since the previous matching run. The actual matching service call
// is wired in Phase 3 — for now we only set the response flag and log it.
const SECTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const FIELD_SCHEMAS: Record<SectionKey, Record<string, z.ZodTypeAny>> = {
  A: {
    traceabilityLevel: z.enum(["NONE", "LOT", "FARM", "COOP"]).nullable(),
    existingColombiaRel: z.boolean().nullable(),
  },
  B: {
    preferredIncoterm: z.enum(["FOB", "CIF", "DAP", "EXW", "CFR"]).nullable(),
    intendedVolumeMt: z.number().positive().max(100_000).nullable(),
    importFrequency: z
      .enum(["MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "SPOT"])
      .nullable(),
    tradeFinanceOpen: z.boolean(),
  },
  C: {
    auditStandard: z.string().min(1).max(50).nullable(),
  },
  D: {
    destinationPort: z.string().min(1).max(100).nullable(),
    logisticsPartner: z.string().min(1).max(200).nullable(),
  },
  E: {
    prevSourcingChannel: z.string().min(1).max(100).nullable(),
    discoveryBudgetBand: z.enum(["<1k", "1-5k", "5-25k", "25k+"]).nullable(),
    supplierDevOpen: z.boolean(),
    supplierTypePref: z.array(z.string().min(1).max(40)).max(20),
    socialImpactReqs: z.array(z.string().min(1).max(80)).max(20),
    earlyStageSupplierOpen: z.boolean(),
  },
  F: {
    platformIntent: z.array(z.string().min(1).max(60)).max(20),
    sampleReady: z.boolean(),
    languagePreference: z.array(z.string().min(1).max(20)).max(10),
  },
};

// Required-field map per section. A section is "done" iff every field in its
// list is non-null (scalars) or non-empty (arrays). We deliberately omit
// boolean columns that default to false, since they are non-null from the
// moment the row exists and would mark the section complete before the user
// has actually engaged with it.
const SECTION_REQUIRED: Record<SectionKey, string[]> = {
  A: ["traceabilityLevel", "existingColombiaRel"],
  B: ["preferredIncoterm", "intendedVolumeMt", "importFrequency"],
  C: ["auditStandard"],
  D: ["destinationPort", "logisticsPartner"],
  E: ["prevSourcingChannel", "discoveryBudgetBand"],
  F: ["platformIntent", "languagePreference"],
};

const ARRAY_FIELDS = new Set([
  "supplierTypePref",
  "socialImpactReqs",
  "platformIntent",
  "languagePreference",
]);

function isFieldComplete(profile: Record<string, unknown>, field: string): boolean {
  const v = profile[field];
  if (ARRAY_FIELDS.has(field)) return Array.isArray(v) && v.length > 0;
  return v !== null && v !== undefined;
}

function computeProgress(profile: Record<string, unknown>): {
  done: SectionKey[];
  pct: number;
} {
  const done: SectionKey[] = [];
  for (const sec of SECTION_KEYS) {
    if (SECTION_REQUIRED[sec].every((f) => isFieldComplete(profile, f))) {
      done.push(sec);
    }
  }
  const pct = Math.round((done.length / SECTION_KEYS.length) * 100);
  return { done, pct };
}

const PatchProfileBody = z.object({
  section: z.enum(SECTION_KEYS),
  field: z.string().min(1).max(80),
  value: z.unknown(),
});

router.patch(
  "/buyers/:id/profile",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId: number = req.userId;

    const idParam = req.params.id;
    const id =
      typeof idParam === "string" ? Number.parseInt(idParam, 10) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid buyer profile id" });
      return;
    }

    const parsed = PatchProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { section, field, value } = parsed.data;

    const sectionFields = FIELD_SCHEMAS[section];
    const fieldSchema = sectionFields[field];
    if (!fieldSchema) {
      res
        .status(400)
        .json({ error: `Field "${field}" is not editable in section ${section}` });
      return;
    }

    const valueParsed = fieldSchema.safeParse(value);
    if (!valueParsed.success) {
      res.status(400).json({ error: valueParsed.error.flatten() });
      return;
    }
    const safeValue = valueParsed.data;

    // Ownership check: caller must be the buyer of that profile.
    const [existing] = await db
      .select()
      .from(buyerProfilesTable)
      .where(eq(buyerProfilesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Buyer profile not found" });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: "Not your profile" });
      return;
    }

    const prevSectionsDone = (existing.p2SectionsDone ?? []) as SectionKey[];
    const prevMatchingRunCount = existing.matchingRunCount ?? 0;

    // Recompute against the projected post-update profile.
    const projected: Record<string, unknown> = {
      ...(existing as unknown as Record<string, unknown>),
      [field]: safeValue,
    };
    const { done: newSectionsDone, pct: newPct } = computeProgress(projected);

    const wasAB =
      prevSectionsDone.includes("A") && prevSectionsDone.includes("B");
    const nowAB =
      newSectionsDone.includes("A") && newSectionsDone.includes("B");
    const addedSection = newSectionsDone.some(
      (s) => !prevSectionsDone.includes(s),
    );
    const matchingTriggered =
      (!wasAB && nowAB) || (prevMatchingRunCount > 0 && addedSection);

    const [updated] = await db
      .update(buyerProfilesTable)
      .set({
        [field]: safeValue,
        p2CompletionPct: newPct,
        p2SectionsDone: newSectionsDone,
        updatedAt: new Date(),
      } as Partial<typeof buyerProfilesTable.$inferInsert>)
      .where(eq(buyerProfilesTable.id, id))
      .returning();

    // Phase 3 — fire matching when sections A+B first complete, when a new
    // section is added after the first run, or when all six are complete.
    const allComplete = newSectionsDone.length === SECTION_KEYS.length;
    const shouldRunMatching =
      matchingTriggered || (allComplete && prevSectionsDone.length < SECTION_KEYS.length);

    if (shouldRunMatching) {
      req.log.info(
        {
          userId,
          buyerProfileId: id,
          section,
          sectionsDone: newSectionsDone,
          completionPct: newPct,
          prevMatchingRunCount,
        },
        "buyer profile matching trigger fired",
      );
      // Fire-and-forget: never block the PATCH response.
      void runBuyerMatching(id).catch((err) => {
        req.log.error(
          { err, buyerProfileId: id },
          "buyer matching service failed (non-fatal)",
        );
      });
    }

    // Phase 4 — Section E ("Gap Sourcing") triggers Sonnet-powered gap
    // analysis against the eligible supplier catalog. Fire-and-forget;
    // discovery escalation for HIGH gaps happens inside the service.
    if (section === "E" && safeValue !== null && safeValue !== undefined) {
      req.log.info(
        { userId, buyerProfileId: id, field },
        "buyer gap analysis trigger fired",
      );
      void analyseBuyerGaps(id).catch((err) => {
        req.log.error(
          { err, buyerProfileId: id },
          "buyer gap analysis failed (non-fatal)",
        );
      });
    }

    res.json({
      section,
      completion_pct: updated.p2CompletionPct,
      sections_done: updated.p2SectionsDone,
      matching_triggered: shouldRunMatching,
    });
  },
);

// ── GET /api/buyers/:id/matches ───────────────────────────────────────────────
// Returns the current matches for a buyer, sorted desc by match_score.
// `?preview=true` returns a Phase 1-only coarse candidate count without
// touching the matches table or invoking Sonnet.
router.use("/buyers/:id/matches", (req, res, next): void => {
  if (ENABLE_INTELLIGENCE_PUBLIC) { next(); return; }
  requireAuth(req, res, () => requireAdmin(req, res, next));
});
router.get(
  "/buyers/:id/matches",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId: number = req.userId;

    const idParam = req.params.id;
    const id = typeof idParam === "string" ? Number.parseInt(idParam, 10) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid buyer profile id" });
      return;
    }

    const [profile] = await db
      .select()
      .from(buyerProfilesTable)
      .where(eq(buyerProfilesTable.id, id));

    if (!profile) {
      res.status(404).json({ error: "Buyer profile not found" });
      return;
    }
    if (profile.userId !== userId) {
      res.status(403).json({ error: "Not your profile" });
      return;
    }

    const isPreview = String(req.query["preview"] ?? "") === "true";
    if (isPreview) {
      const count = await countCoarseMatches(id);
      res.json({
        preview: true,
        candidate_count: count,
        sections_done: profile.p2SectionsDone ?? [],
      });
      return;
    }

    // Full current-match set joined with supplier display fields.
    const rows = await db
      .select({
        id: buyerMatchesTable.id,
        supplierId: buyerMatchesTable.supplierId,
        matchScore: buyerMatchesTable.matchScore,
        scoreBreakdown: buyerMatchesTable.scoreBreakdown,
        disqualifiers: buyerMatchesTable.disqualifiers,
        matchNotes: buyerMatchesTable.matchNotes,
        sectionsAtRun: buyerMatchesTable.sectionsAtRun,
        createdAt: buyerMatchesTable.createdAt,
        supplierName: suppliersTable.nombreCompleto,
        supplierMunicipio: suppliersTable.municipio,
        supplierDepartment: suppliersTable.department,
        supplierType: suppliersTable.supplierType,
        sellableStatus: suppliersTable.sellableStatus,
        graduationPathway: suppliersTable.graduationPathway,
        commercialScore: suppliersTable.commercialScore,
      })
      .from(buyerMatchesTable)
      .innerJoin(suppliersTable, eq(buyerMatchesTable.supplierId, suppliersTable.id))
      .where(
        and(
          eq(buyerMatchesTable.buyerProfileId, id),
          eq(buyerMatchesTable.isCurrent, true),
        ),
      )
      .orderBy(desc(buyerMatchesTable.matchScore));

    // Fetch per-supplier product details so the UI can render category, certs,
    // altitude, and SCA cupping signals required by the match card spec.
    const supplierIds = rows
      .map((r) => r.supplierId)
      .filter((sid): sid is number => sid != null);

    type SupplierSignals = {
      categories: string[];
      subCategories: string[];
      certifications: string[];
      altitudes: string[];
      cuppingMin: number | null;
      cuppingMax: number | null;
      productCount: number;
      topProducts: Array<{
        id: number;
        name: string;
        category: string;
        subCategory: string | null;
        origin: string;
        altitude: string | null;
        cupping: number | null;
        process: string | null;
        variety: string | null;
        certifications: string[];
      }>;
    };

    const signalsBySupplier = new Map<number, SupplierSignals>();

    if (supplierIds.length > 0) {
      const productRows = await db
        .select({
          id: productsTable.id,
          supplierId: productsTable.supplierId,
          name: productsTable.name,
          category: productsTable.category,
          subCategory: productsTable.subCategory,
          origin: productsTable.origin,
          altitude: productsTable.altitude,
          cupping: productsTable.cupping,
          process: productsTable.process,
          variety: productsTable.variety,
          certifications: productsTable.certifications,
        })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.active, true),
            inArray(productsTable.supplierId, supplierIds),
          ),
        );

      for (const p of productRows) {
        if (p.supplierId == null) continue;
        const sig =
          signalsBySupplier.get(p.supplierId) ??
          ({
            categories: [],
            subCategories: [],
            certifications: [],
            altitudes: [],
            cuppingMin: null,
            cuppingMax: null,
            productCount: 0,
            topProducts: [],
          } satisfies SupplierSignals);

        sig.productCount += 1;
        if (p.category && !sig.categories.includes(p.category)) {
          sig.categories.push(p.category);
        }
        if (p.subCategory && !sig.subCategories.includes(p.subCategory)) {
          sig.subCategories.push(p.subCategory);
        }
        for (const c of p.certifications ?? []) {
          if (!sig.certifications.includes(c)) sig.certifications.push(c);
        }
        if (p.altitude && !sig.altitudes.includes(p.altitude)) {
          sig.altitudes.push(p.altitude);
        }
        if (p.cupping != null) {
          sig.cuppingMin = sig.cuppingMin == null ? p.cupping : Math.min(sig.cuppingMin, p.cupping);
          sig.cuppingMax = sig.cuppingMax == null ? p.cupping : Math.max(sig.cuppingMax, p.cupping);
        }
        if (sig.topProducts.length < 3) {
          sig.topProducts.push({
            id: p.id,
            name: p.name,
            category: p.category,
            subCategory: p.subCategory,
            origin: p.origin,
            altitude: p.altitude,
            cupping: p.cupping,
            process: p.process,
            variety: p.variety,
            certifications: p.certifications ?? [],
          });
        }
        signalsBySupplier.set(p.supplierId, sig);
      }
    }

    const matches = rows.map((r) => {
      const sig = r.supplierId != null ? signalsBySupplier.get(r.supplierId) : undefined;
      return {
        ...r,
        productCategories: sig?.categories ?? [],
        productSubCategories: sig?.subCategories ?? [],
        certifications: sig?.certifications ?? [],
        altitudes: sig?.altitudes ?? [],
        cuppingMin: sig?.cuppingMin ?? null,
        cuppingMax: sig?.cuppingMax ?? null,
        productCount: sig?.productCount ?? 0,
        topProducts: sig?.topProducts ?? [],
      };
    });

    res.json({
      preview: false,
      matches,
      fields_that_improve_match: computeFieldsThatImproveMatch(profile),
      matching_run_count: profile.matchingRunCount,
      last_matched_at: profile.lastMatchedAt,
      state: profile.state,
    });
  },
);

// ── GET /api/buyer/onboarding ─────────────────────────────────────────────────
// Returns all 25 extended onboarding fields for the authenticated buyer.
// Returns 404 if the buyer_profile row does not yet exist.
// URL: singular /buyer (no :id) — identity derived from auth cookie.
router.get("/buyer/onboarding", requireAuth, async (req, res): Promise<void> => {
  const userId: number = req.userId;

  const [profile] = await db
    .select({
      id: buyerProfilesTable.id,
      // Phase 1 baseline (for context)
      companyName: buyerProfilesTable.companyName,
      country: buyerProfilesTable.country,
      targetProducts: buyerProfilesTable.targetProducts,
      volumeBand: buyerProfilesTable.volumeBand,
      requiredCertsP1: buyerProfilesTable.requiredCertsP1,
      timeToFirstOrder: buyerProfilesTable.timeToFirstOrder,
      // Progress + approval status
      p2CompletionPct:  buyerProfilesTable.p2CompletionPct,
      p2SectionsDone:   buyerProfilesTable.p2SectionsDone,
      p2ApprovalStatus: buyerProfilesTable.p2ApprovalStatus,
      p2RevisionNote:   buyerProfilesTable.p2RevisionNote,
      // Section 1
      buyerSegment: buyerProfilesTable.buyerSegment,
      locationCount: buyerProfilesTable.locationCount,
      annualBudgetUsd: buyerProfilesTable.annualBudgetUsd,
      // Section 2
      coffeeQualityTier: buyerProfilesTable.coffeeQualityTier,
      coffeeFlavorProfile: buyerProfilesTable.coffeeFlavorProfile,
      cacaoFlavorProfile: buyerProfilesTable.cacaoFlavorProfile,
      fruitForm: buyerProfilesTable.fruitForm,
      availabilityRequirement: buyerProfilesTable.availabilityRequirement,
      orderFrequency: buyerProfilesTable.orderFrequency,
      // Section 3
      coffeeOrderSizeKg: buyerProfilesTable.coffeeOrderSizeKg,
      cacaoOrderSizeKg: buyerProfilesTable.cacaoOrderSizeKg,
      fruitOrderSizeKg: buyerProfilesTable.fruitOrderSizeKg,
      priceSensitivity: buyerProfilesTable.priceSensitivity,
      priceTransparency: buyerProfilesTable.priceTransparency,
      // Section 4
      certsNiceToHave: buyerProfilesTable.certsNiceToHave,
      traceabilityLevel: buyerProfilesTable.traceabilityLevel,
      qualityDocRequired: buyerProfilesTable.qualityDocRequired,
      coffeeDefectRate: buyerProfilesTable.coffeeDefectRate,
      cacaoMoldPct: buyerProfilesTable.cacaoMoldPct,
      sourceConsistency: buyerProfilesTable.sourceConsistency,
      qualityVerification: buyerProfilesTable.qualityVerification,
      // Section 6
      sustainabilityImportance: buyerProfilesTable.sustainabilityImportance,
      sustainabilityDimensions: buyerProfilesTable.sustainabilityDimensions,
    })
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.userId, userId));

  if (!profile) {
    res.status(404).json({ error: "No buyer profile found. Complete registration first." });
    return;
  }

  res.json({ profile });
});

// ── PATCH /api/buyer/onboarding ───────────────────────────────────────────────
// Partial update of any subset of the 25 extended onboarding fields.
// Auth: requireAuth — identity from cookie; no :id in URL.
// On save: recomputes p2CompletionPct and merges S1–S4 keys into p2SectionsDone
//   without disturbing existing A–F keys written by PATCH /api/buyers/:id/profile.
// Returns: { profile: updated extended fields, p2CompletionPct, p2SectionsDone }

// Non-conditional required fields per section that determine "section done".
// Conditional fields (coffeeQualityTier, coffeeFlavorProfile, etc.) are not
// required for completion — they only sharpen the matching signal when present.
const ONBOARD_SECTION_REQUIRED: Record<"S1" | "S2" | "S3" | "S4", string[]> = {
  S1: ["buyerSegment", "locationCount", "annualBudgetUsd"],
  S2: ["availabilityRequirement", "orderFrequency"],
  S3: ["priceSensitivity"],
  S4: ["traceabilityLevel", "sourceConsistency"],
};

const ONBOARD_ARRAY_FIELDS = new Set([
  "coffeeFlavorProfile",
  "fruitForm",
  "priceTransparency",
  "certsNiceToHave",
  "qualityDocRequired",
  "qualityVerification",
  "sustainabilityDimensions",
]);

function isOnboardFieldComplete(
  profile: Record<string, unknown>,
  field: string,
): boolean {
  const v = profile[field];
  if (ONBOARD_ARRAY_FIELDS.has(field)) return Array.isArray(v) && v.length > 0;
  return v !== null && v !== undefined && v !== "";
}

function computeOnboardProgress(
  profile: Record<string, unknown>,
  existingSectionsDone: string[],
): { sectionsDone: string[]; pct: number } {
  const sectionKeys = ["S1", "S2", "S3", "S4"] as const;
  const newlyDone = sectionKeys.filter((sec) =>
    ONBOARD_SECTION_REQUIRED[sec].every((f) => isOnboardFieldComplete(profile, f)),
  );

  // Merge: keep existing A–F keys, replace S* keys with freshly computed set.
  const existingNonS = existingSectionsDone.filter((k) => !k.startsWith("S"));
  const sectionsDone = [...existingNonS, ...newlyDone];
  const pct = Math.round((newlyDone.length / sectionKeys.length) * 100);

  return { sectionsDone, pct };
}

const ExtendedOnboardingBody = z.object({
  // Section 1
  buyerSegment: z
    .enum([
      "specialty_roaster",
      "commodity_trader",
      "craft_chocolatier",
      "food_distributor",
      "grocery_retailer",
      "specialty_retailer",
      "food_manufacturer",
      "restaurant_hospitality",
      "other",
    ])
    .nullable()
    .optional(),
  locationCount: z
    .enum(["one", "two_to_five", "six_to_twenty", "twenty_plus"])
    .nullable()
    .optional(),
  annualBudgetUsd: z
    .enum(["under_50k", "50k_to_250k", "250k_to_1m", "1m_to_5m", "over_5m"])
    .nullable()
    .optional(),
  // Section 2
  coffeeQualityTier: z
    .enum(["specialty_sca80", "high_commercial_75_79", "standard_commercial_70_74", "bulk_commodity"])
    .nullable()
    .optional(),
  coffeeFlavorProfile: z
    .array(
      z.enum([
        "fruity_bright",
        "chocolatey_nutty",
        "floral_aromatic",
        "heavy_body",
        "single_origin_critical",
        "blends_acceptable",
      ]),
    )
    .max(6)
    .nullable()
    .optional(),
  cacaoFlavorProfile: z
    .enum(["fruity_floral_citrus", "chocolate_nutty_caramel", "balanced_blending", "no_preference"])
    .nullable()
    .optional(),
  fruitForm: z
    .array(z.enum(["fresh_airshipped", "frozen_pulp", "dehydrated_dried", "concentrate_juice"]))
    .max(4)
    .nullable()
    .optional(),
  availabilityRequirement: z
    .enum(["year_round_critical", "seasonal_acceptable", "flexible"])
    .nullable()
    .optional(),
  orderFrequency: z
    .enum(["weekly_biweekly", "monthly", "quarterly", "annual_contracts", "ad_hoc"])
    .nullable()
    .optional(),
  // Section 3
  coffeeOrderSizeKg: z
    .enum(["under_500", "500_to_2000", "2000_to_10000", "10000_to_50000", "over_50000"])
    .nullable()
    .optional(),
  cacaoOrderSizeKg: z
    .enum(["under_500", "500_to_5000", "5000_to_20000", "over_20000"])
    .nullable()
    .optional(),
  fruitOrderSizeKg: z
    .enum(["under_500", "500_to_2000", "2000_to_10000", "over_10000"])
    .nullable()
    .optional(),
  priceSensitivity: z
    .enum(["quality_first", "balanced", "cost_driven"])
    .nullable()
    .optional(),
  priceTransparency: z
    .array(
      z.enum(["single_price", "full_breakdown", "carbon_cost", "price_history"]),
    )
    .max(4)
    .nullable()
    .optional(),
  // Section 4
  certsNiceToHave: z.array(z.string().min(1).max(80)).max(20).nullable().optional(),
  traceabilityLevel: z
    .enum(["farm_to_cup", "lot_level", "preferred_not_mandatory", "no_requirement"])
    .nullable()
    .optional(),
  qualityDocRequired: z
    .array(
      z.enum([
        "sca_cupping",
        "sensory_analysis",
        "lab_analysis",
        "fermentation_records",
        "phytosanitary",
        "carbon_footprint",
        "social_audit",
      ]),
    )
    .max(7)
    .nullable()
    .optional(),
  coffeeDefectRate: z
    .enum(["under_1pct", "one_to_5pct", "five_to_10pct", "ten_plus_acceptable"])
    .nullable()
    .optional(),
  cacaoMoldPct: z
    .enum(["under_1pct", "one_to_2pct", "two_to_5pct", "no_requirement"])
    .nullable()
    .optional(),
  sourceConsistency: z
    .enum(["single_source_preferred", "approved_pool", "variety_acceptable", "no_preference"])
    .nullable()
    .optional(),
  qualityVerification: z
    .array(
      z.enum([
        "inhouse_lab",
        "supplier_certs",
        "sensory_cupping",
        "quality_consultant",
        "multiple",
      ]),
    )
    .max(5)
    .nullable()
    .optional(),
  // Section 6
  sustainabilityImportance: z
    .enum(["critical_to_brand", "important_to_market", "secondary", "not_important"])
    .nullable()
    .optional(),
  sustainabilityDimensions: z
    .array(
      z.enum([
        "carbon_neutral",
        "fair_wages",
        "organic",
        "biodiversity",
        "water_conservation",
        "women_minority",
        "community_investment",
        "all_equally",
      ]),
    )
    .max(8)
    .nullable()
    .optional(),
});

router.patch("/buyer/onboarding", requireAuth, async (req, res): Promise<void> => {
  const userId: number = req.userId;

  const parsed = ExtendedOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Must have an existing buyer_profile row.
  const [existing] = await db
    .select()
    .from(buyerProfilesTable)
    .where(eq(buyerProfilesTable.userId, userId));

  if (!existing) {
    res.status(404).json({
      error: "No buyer profile found. Complete /buyer-register first.",
    });
    return;
  }

  // Build update set — only include keys present in the parsed body (partial update).
  // Explicitly cast to Drizzle's insert type to satisfy the update() overload.
  const updates = parsed.data as Partial<typeof buyerProfilesTable.$inferInsert>;

  // Project the update onto the existing profile to recompute progress.
  const projected: Record<string, unknown> = {
    ...(existing as unknown as Record<string, unknown>),
    ...(updates as Record<string, unknown>),
  };

  const existingSectionsDone = (existing.p2SectionsDone ?? []) as string[];
  const { sectionsDone, pct } = computeOnboardProgress(projected, existingSectionsDone);

  // M7 auto-transition: when buyer first hits 100%, confirm PENDING_REVIEW status
  // so the admin sees it as ready for review. Does not overwrite APPROVED,
  // REVISION_REQUESTED, or NEEDS_ATTENTION — those are admin-set states.
  const prevPct = existing.p2CompletionPct ?? 0;
  const autoApprovalSet: Partial<typeof buyerProfilesTable.$inferInsert> = {};
  if (prevPct < 100 && pct >= 100) {
    const currentStatus = existing.p2ApprovalStatus;
    if (!currentStatus || currentStatus === "PENDING_REVIEW") {
      autoApprovalSet.p2ApprovalStatus = "PENDING_REVIEW";
    }
  }

  const [updated] = await db
    .update(buyerProfilesTable)
    .set({
      ...updates,
      ...autoApprovalSet,
      p2CompletionPct: pct,
      p2SectionsDone: sectionsDone,
      updatedAt: new Date(),
    })
    .where(eq(buyerProfilesTable.userId, userId))
    .returning({
      id: buyerProfilesTable.id,
      p2CompletionPct: buyerProfilesTable.p2CompletionPct,
      p2SectionsDone: buyerProfilesTable.p2SectionsDone,
      // Section 1
      buyerSegment: buyerProfilesTable.buyerSegment,
      locationCount: buyerProfilesTable.locationCount,
      annualBudgetUsd: buyerProfilesTable.annualBudgetUsd,
      // Section 2
      coffeeQualityTier: buyerProfilesTable.coffeeQualityTier,
      coffeeFlavorProfile: buyerProfilesTable.coffeeFlavorProfile,
      cacaoFlavorProfile: buyerProfilesTable.cacaoFlavorProfile,
      fruitForm: buyerProfilesTable.fruitForm,
      availabilityRequirement: buyerProfilesTable.availabilityRequirement,
      orderFrequency: buyerProfilesTable.orderFrequency,
      // Section 3
      coffeeOrderSizeKg: buyerProfilesTable.coffeeOrderSizeKg,
      cacaoOrderSizeKg: buyerProfilesTable.cacaoOrderSizeKg,
      fruitOrderSizeKg: buyerProfilesTable.fruitOrderSizeKg,
      priceSensitivity: buyerProfilesTable.priceSensitivity,
      priceTransparency: buyerProfilesTable.priceTransparency,
      // Section 4
      certsNiceToHave: buyerProfilesTable.certsNiceToHave,
      traceabilityLevel: buyerProfilesTable.traceabilityLevel,
      qualityDocRequired: buyerProfilesTable.qualityDocRequired,
      coffeeDefectRate: buyerProfilesTable.coffeeDefectRate,
      cacaoMoldPct: buyerProfilesTable.cacaoMoldPct,
      sourceConsistency: buyerProfilesTable.sourceConsistency,
      qualityVerification: buyerProfilesTable.qualityVerification,
      // Section 6
      sustainabilityImportance: buyerProfilesTable.sustainabilityImportance,
      sustainabilityDimensions: buyerProfilesTable.sustainabilityDimensions,
    });

  req.log.info(
    { userId, buyerProfileId: existing.id, sectionsDone, pct },
    "buyer extended onboarding PATCH saved",
  );

  res.json({
    profile: updated,
    p2CompletionPct: updated.p2CompletionPct,
    p2SectionsDone: updated.p2SectionsDone,
  });
});

// ── PATCH /api/buyers/:id/marketing-preferences ──────────────────────────────
// Buyer-side endpoint to manage marketing opt-in + topic interests. Caller
// must own the profile.
//
// Canonical body uses snake_case per the public API contract:
//   { marketing_opt_in: boolean, marketing_topics?: string[] }
// We also accept legacy camelCase (`marketingOptIn`/`marketingTopics`) for
// backward compatibility with earlier clients. The response always uses the
// canonical snake_case keys.
const MarketingPreferencesBody = z
  .object({
    marketing_opt_in: z.boolean().optional(),
    marketing_topics: z.array(z.string().min(1).max(80)).max(20).optional(),
    marketingOptIn: z.boolean().optional(),
    marketingTopics: z.array(z.string().min(1).max(80)).max(20).optional(),
  })
  .transform((v, ctx) => {
    const optIn = v.marketing_opt_in ?? v.marketingOptIn;
    if (typeof optIn !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["marketing_opt_in"],
        message: "marketing_opt_in (boolean) is required",
      });
      return z.NEVER;
    }
    return {
      marketingOptIn: optIn,
      marketingTopics: v.marketing_topics ?? v.marketingTopics,
    };
  });

router.patch(
  "/buyers/:id/marketing-preferences",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId: number = req.userId;
    const idParam = req.params.id;
    const id = typeof idParam === "string" ? Number.parseInt(idParam, 10) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: "Invalid buyer profile id" });
      return;
    }

    const parsed = MarketingPreferencesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors });
      return;
    }

    const [existing] = await db
      .select({ id: buyerProfilesTable.id, userId: buyerProfilesTable.userId })
      .from(buyerProfilesTable)
      .where(eq(buyerProfilesTable.id, id));

    if (!existing) {
      res.status(404).json({ success: false, error: "Buyer profile not found" });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ success: false, error: "Not your profile" });
      return;
    }

    const newTopics = parsed.data.marketingOptIn
      ? (parsed.data.marketingTopics ?? [])
      : [];

    const [updated] = await db
      .update(buyerProfilesTable)
      .set({
        marketingOptIn: parsed.data.marketingOptIn,
        marketingTopics: newTopics,
        updatedAt: new Date(),
      })
      .where(eq(buyerProfilesTable.id, id))
      .returning({
        id: buyerProfilesTable.id,
        marketingOptIn: buyerProfilesTable.marketingOptIn,
        marketingTopics: buyerProfilesTable.marketingTopics,
      });

    res.json({
      success: true,
      data: {
        id: updated.id,
        marketing_opt_in: updated.marketingOptIn,
        marketing_topics: updated.marketingTopics,
      },
    });
  },
);

export default router;
