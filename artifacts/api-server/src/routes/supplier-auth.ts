// FIN-002 — Supplier self-service auth (WhatsApp OTP + magic link email)
// Allows WhatsApp-onboarded farmers to claim a web account without a password.
// Two channels: WhatsApp OTP (6-digit, 10 min TTL) and email magic link (UUID, 24 hr TTL).
// Both can be self-initiated (public) or officer-triggered (admin).
// Session uses the same fincava_auth JWT cookie as all other auth paths.

import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { eq, and, gt, isNull, count } from "drizzle-orm";
import {
  db,
  usersTable,
  profilesTable,
  suppliersTable,
  supplierAuthTokensTable,
  complianceDocsTable,
  interactionsTable,
} from "@workspace/db";
import { generateToken, requireAuth } from "../lib/auth";
import { requireAdmin } from "../middleware/admin";
import { sendEmail } from "../lib/email";
import { sendWhatsAppMessage } from "../lib/whatsapp";
import { logger } from "../lib/logger";
import { sendError } from "../lib/response";

const router: IRouter = Router();

const IS_REPLIT = !!process.env["REPLIT_DOMAINS"];
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (IS_REPLIT ? "none" : "lax") as "none" | "lax",
  secure: IS_REPLIT || process.env["NODE_ENV"] === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const OTP_TTL_MS       = 10 * 60 * 1000;   // 10 minutes
const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT = 5; // max tokens per contact per hour

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) return `+${digits}`;
  if (!digits.startsWith("57") && digits.length === 10) return `+57${digits}`;
  return digits.startsWith("+") ? raw.trim() : `+${digits}`;
}

// ── Shared: find unclaimed-or-claimable supplier by contact ──────────────────

async function findSupplierByContact(
  contactType: "whatsapp" | "email",
  contactValue: string,
): Promise<{ id: number; nombreCompleto: string; userId: number | null; email: string | null } | null> {
  const condition =
    contactType === "whatsapp"
      ? eq(suppliersTable.whatsappNumber, contactValue)
      : eq(suppliersTable.email, contactValue);

  const [supplier] = await db
    .select({
      id:             suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      userId:         suppliersTable.userId,
      email:          suppliersTable.email,
    })
    .from(suppliersTable)
    .where(condition)
    .limit(1);

  return supplier ?? null;
}

// ── Shared: rate-limit check ──────────────────────────────────────────────────

async function checkRateLimit(supplierId: number): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(supplierAuthTokensTable)
    .where(
      and(
        eq(supplierAuthTokensTable.supplierId, supplierId),
        gt(supplierAuthTokensTable.createdAt, hourAgo),
      ),
    );
  return (row?.n ?? 0) >= RATE_LIMIT;
}

// ── Shared: issue session after successful token verify ───────────────────────
// Creates a users row if the supplier has none, links supplier.userId,
// sets claimStatus = CLAIMED, then issues the JWT cookie.

async function issueSupplierSession(
  res: Response,
  supplier: { id: number; nombreCompleto: string; userId: number | null; email: string | null },
): Promise<number> {
  let userId = supplier.userId;

  if (!userId) {
    // Create a minimal SUPPLIER user account.
    // email is NOT NULL on users — use a synthetic placeholder for WhatsApp-only
    // farmers who have no email on their supplier record. The placeholder format
    // makes it easy to identify passwordless accounts that need an email later.
    const accountEmail = supplier.email ?? `whatsapp-${supplier.id}@supplier.fincava.internal`;
    const [newUser] = await db
      .insert(usersTable)
      .values({
        email:           accountEmail,
        role:            "SUPPLIER",
        passwordHash:    "", // passwordless — login only via OTP/magic-link
        tokenVersion:    1,
        emailVerifiedAt: supplier.email ? new Date() : undefined,
      })
      .returning({ id: usersTable.id, tokenVersion: usersTable.tokenVersion });

    if (!newUser) throw new Error("Failed to create user account");
    userId = newUser.id;

    // Create profile row with the farmer's name.
    const nameParts = supplier.nombreCompleto.trim().split(/\s+/);
    await db.insert(profilesTable).values({
      userId:    userId,
      firstName: nameParts[0] ?? supplier.nombreCompleto,
      lastName:  nameParts.slice(1).join(" ") || null,
    }).onConflictDoNothing();
  }

  // Link supplier → user and mark as CLAIMED.
  await db
    .update(suppliersTable)
    .set({ userId, claimStatus: "CLAIMED", updatedAt: new Date() })
    .where(eq(suppliersTable.id, supplier.id));

  // Seed compliance_docs row if missing (idempotent).
  await db
    .insert(complianceDocsTable)
    .values({ supplierId: supplier.id, rutDian: false, icaRegistro: false })
    .onConflictDoNothing({ target: complianceDocsTable.supplierId });

  // Fetch tokenVersion for JWT (may have pre-existed).
  const [userRow] = await db
    .select({ tokenVersion: usersTable.tokenVersion })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const jwtToken = generateToken(userId, userRow?.tokenVersion ?? 1);
  res.cookie("fincava_auth", jwtToken, COOKIE_OPTIONS);

  logger.info({ supplierId: supplier.id, userId }, "FIN-002: supplier session issued");
  return userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES — self-service (farmer-initiated)
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/supplier-auth/request-otp ──────────────────────────────────────
// Farmer enters their WhatsApp phone number. If a supplier record exists with
// that number, we send a 6-digit OTP via WhatsApp.
// Always returns 200 to prevent supplier record enumeration.

router.post("/supplier-auth/request-otp", async (req: Request, res: Response): Promise<void> => {
  const rawPhone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  if (!rawPhone) {
    sendError(res, 400, "phone is required");
    return;
  }

  const phone = normalizePhone(rawPhone);

  const supplier = await findSupplierByContact("whatsapp", phone).catch(() => null);

  // Always 200 — do not reveal whether a supplier record exists.
  if (!supplier) {
    res.json({ ok: true });
    return;
  }

  const rateLimited = await checkRateLimit(supplier.id);
  if (rateLimited) {
    // Still 200 — don't fingerprint valid phone numbers via rate-limit errors.
    res.json({ ok: true });
    return;
  }

  const rawOtp   = String(crypto.randomInt(100000, 1000000));
  const tokenHash = sha256(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.insert(supplierAuthTokensTable).values({
    supplierId:   supplier.id,
    tokenHash,
    contactType:  "whatsapp",
    contactValue: phone,
    expiresAt,
  });

  // Fire-and-forget WhatsApp send.
  sendWhatsAppMessage(
    phone,
    `Tu código de acceso Fincava es: *${rawOtp}*\n\nVálido por 10 minutos. No lo compartas con nadie.\n\nYour Fincava access code is: *${rawOtp}*\nValid for 10 minutes.`,
  ).catch((err) => logger.warn({ err, supplierId: supplier.id }, "supplier-auth: WhatsApp OTP send failed"));

  logger.info({ supplierId: supplier.id, phone }, "supplier-auth: OTP issued via WhatsApp");
  res.json({ ok: true });
});

// ── POST /api/supplier-auth/verify-otp ───────────────────────────────────────
// Farmer submits their 6-digit OTP. Verifies, issues session.

router.post("/supplier-auth/verify-otp", async (req: Request, res: Response): Promise<void> => {
  const rawPhone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const rawOtp   = typeof req.body.otp   === "string" ? req.body.otp.trim()   : "";

  if (!rawPhone || !rawOtp) {
    sendError(res, 400, "phone and otp are required");
    return;
  }

  const phone     = normalizePhone(rawPhone);
  const tokenHash = sha256(rawOtp);
  const now       = new Date();

  const [tokenRow] = await db
    .select({
      id:         supplierAuthTokensTable.id,
      supplierId: supplierAuthTokensTable.supplierId,
      tokenHash:  supplierAuthTokensTable.tokenHash,
    })
    .from(supplierAuthTokensTable)
    .where(
      and(
        eq(supplierAuthTokensTable.contactType,  "whatsapp"),
        eq(supplierAuthTokensTable.contactValue, phone),
        isNull(supplierAuthTokensTable.usedAt),
        gt(supplierAuthTokensTable.expiresAt, now),
      ),
    )
    .orderBy(supplierAuthTokensTable.createdAt)
    .limit(1);

  if (!tokenRow) {
    sendError(res, 401, "Invalid or expired OTP");
    return;
  }

  // Timing-safe comparison.
  const hashA = Buffer.from(tokenHash);
  const hashB = Buffer.from(tokenRow.tokenHash);
  if (hashA.length !== hashB.length || !crypto.timingSafeEqual(hashA, hashB)) {
    sendError(res, 401, "Invalid or expired OTP");
    return;
  }

  // Mark used.
  await db
    .update(supplierAuthTokensTable)
    .set({ usedAt: now })
    .where(eq(supplierAuthTokensTable.id, tokenRow.id));

  const supplier = await findSupplierByContact("whatsapp", phone);
  if (!supplier) {
    sendError(res, 404, "Supplier record not found");
    return;
  }

  await db.insert(interactionsTable).values({
    supplierId:      supplier.id,
    interactionType: "SUPPLIER_LOGIN",
    actor:           "SELF",
    notes:           "Logged in via WhatsApp OTP",
    metadata:        { channel: "whatsapp" },
  });

  await issueSupplierSession(res, supplier);
  res.json({ ok: true, supplierId: supplier.id });
});

// ── POST /api/supplier-auth/request-magic-link ───────────────────────────────
// Farmer enters their email. If a supplier record exists, we send a magic link.
// Always returns 200 to prevent supplier record enumeration.

router.post("/supplier-auth/request-magic-link", async (req: Request, res: Response): Promise<void> => {
  const rawEmail = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!rawEmail) {
    sendError(res, 400, "email is required");
    return;
  }

  const supplier = await findSupplierByContact("email", rawEmail).catch(() => null);

  // Always 200.
  if (!supplier) {
    res.json({ ok: true });
    return;
  }

  const rateLimited = await checkRateLimit(supplier.id);
  if (rateLimited) {
    res.json({ ok: true });
    return;
  }

  const rawToken  = crypto.randomUUID();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(supplierAuthTokensTable).values({
    supplierId:   supplier.id,
    tokenHash,
    contactType:  "email",
    contactValue: rawEmail,
    expiresAt,
  });

  const appBaseUrl = process.env["FRONTEND_URL"]
    ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
  const magicLinkUrl = `${appBaseUrl}/supplier-auth/confirm?token=${rawToken}`;

  const nameFirst = supplier.nombreCompleto.split(" ")[0] ?? supplier.nombreCompleto;

  const html = `
    <p>Hola ${nameFirst} / Hi ${nameFirst},</p>
    <p>Haz clic en el siguiente enlace para acceder a tu cuenta Fincava:<br>
    Click the link below to access your Fincava account:</p>
    <p><a href="${magicLinkUrl}" style="font-weight:bold">Acceder a mi cuenta / Access my account</a></p>
    <p>Este enlace expira en 24 horas. / This link expires in 24 hours.</p>
    <p>Si no solicitaste esto, ignora este mensaje.<br>
    If you did not request this, ignore this message.</p>
  `;
  const text = `Access your Fincava supplier account:\n${magicLinkUrl}\n\nExpires in 24 hours.`;

  sendEmail({
    to: rawEmail,
    subject: "Tu enlace de acceso Fincava / Your Fincava access link",
    html,
    text,
  }).catch((err) => logger.warn({ err, supplierId: supplier.id }, "supplier-auth: magic link email send failed"));

  logger.info({ supplierId: supplier.id, email: rawEmail }, "supplier-auth: magic link issued via email");
  res.json({ ok: true });
});

// ── GET /api/supplier-auth/verify-magic-link?token= ──────────────────────────
// Farmer clicks the magic link. Verifies token, issues session, returns JSON.
// Frontend page handles the redirect to /supplier-dashboard.

router.get("/supplier-auth/verify-magic-link", async (req: Request, res: Response): Promise<void> => {
  const rawToken = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!rawToken) {
    sendError(res, 400, "token is required");
    return;
  }

  const tokenHash = sha256(rawToken);
  const now       = new Date();

  const [tokenRow] = await db
    .select({
      id:           supplierAuthTokensTable.id,
      supplierId:   supplierAuthTokensTable.supplierId,
      tokenHash:    supplierAuthTokensTable.tokenHash,
      contactValue: supplierAuthTokensTable.contactValue,
    })
    .from(supplierAuthTokensTable)
    .where(
      and(
        eq(supplierAuthTokensTable.contactType, "email"),
        isNull(supplierAuthTokensTable.usedAt),
        gt(supplierAuthTokensTable.expiresAt, now),
      ),
    )
    .orderBy(supplierAuthTokensTable.createdAt)
    .limit(1);

  if (!tokenRow) {
    sendError(res, 401, "Invalid or expired link");
    return;
  }

  // Timing-safe comparison.
  const hashA = Buffer.from(tokenHash);
  const hashB = Buffer.from(tokenRow.tokenHash);
  if (hashA.length !== hashB.length || !crypto.timingSafeEqual(hashA, hashB)) {
    sendError(res, 401, "Invalid or expired link");
    return;
  }

  // Mark used.
  await db
    .update(supplierAuthTokensTable)
    .set({ usedAt: now })
    .where(eq(supplierAuthTokensTable.id, tokenRow.id));

  const supplier = await findSupplierByContact("email", tokenRow.contactValue);
  if (!supplier) {
    sendError(res, 404, "Supplier record not found");
    return;
  }

  await db.insert(interactionsTable).values({
    supplierId:      supplier.id,
    interactionType: "SUPPLIER_LOGIN",
    actor:           "SELF",
    notes:           "Logged in via email magic link",
    metadata:        { channel: "email" },
  });

  await issueSupplierSession(res, supplier);
  res.json({ ok: true, supplierId: supplier.id });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES — officer-triggered
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/admin/suppliers/:id/send-otp ───────────────────────────────────
// Officer sends WhatsApp OTP on behalf of a farmer.

router.post(
  "/admin/suppliers/:id/send-otp",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { sendError(res, 400, "Invalid supplier id"); return; }

    const [supplier] = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto, whatsappNumber: suppliersTable.whatsappNumber })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!supplier) { sendError(res, 404, "Supplier not found"); return; }
    if (!supplier.whatsappNumber) { sendError(res, 422, "Supplier has no WhatsApp number on record"); return; }

    const rateLimited = await checkRateLimit(supplierId);
    if (rateLimited) { sendError(res, 429, "Too many tokens sent to this supplier in the last hour"); return; }

    const rawOtp    = String(crypto.randomInt(100000, 1000000));
    const tokenHash = sha256(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await db.insert(supplierAuthTokensTable).values({
      supplierId,
      tokenHash,
      contactType:        "whatsapp",
      contactValue:       supplier.whatsappNumber,
      expiresAt,
      createdByAdminId:   req.userId,
    });

    await sendWhatsAppMessage(
      supplier.whatsappNumber,
      `Tu código de acceso Fincava es: *${rawOtp}*\n\nVálido por 10 minutos.\n\nYour Fincava access code is: *${rawOtp}*\nValid for 10 minutes.`,
    );

    logger.info({ supplierId, adminId: req.userId }, "supplier-auth: admin-triggered OTP sent");
    res.json({ ok: true, sentTo: supplier.whatsappNumber });
  },
);

// ── POST /api/admin/suppliers/:id/send-magic-link ────────────────────────────
// Officer sends a magic link email on behalf of a farmer.

router.post(
  "/admin/suppliers/:id/send-magic-link",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { sendError(res, 400, "Invalid supplier id"); return; }

    const [supplier] = await db
      .select({ id: suppliersTable.id, nombreCompleto: suppliersTable.nombreCompleto, email: suppliersTable.email })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .limit(1);

    if (!supplier) { sendError(res, 404, "Supplier not found"); return; }
    if (!supplier.email) { sendError(res, 422, "Supplier has no email on record"); return; }

    const rateLimited = await checkRateLimit(supplierId);
    if (rateLimited) { sendError(res, 429, "Too many tokens sent to this supplier in the last hour"); return; }

    const rawToken  = crypto.randomUUID();
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await db.insert(supplierAuthTokensTable).values({
      supplierId,
      tokenHash,
      contactType:      "email",
      contactValue:     supplier.email,
      expiresAt,
      createdByAdminId: req.userId,
    });

    const appBaseUrl = process.env["FRONTEND_URL"]
      ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:25876");
    const magicLinkUrl = `${appBaseUrl}/supplier-auth/confirm?token=${rawToken}`;

    const nameFirst = supplier.nombreCompleto.split(" ")[0] ?? supplier.nombreCompleto;
    const html = `
      <p>Hola ${nameFirst} / Hi ${nameFirst},</p>
      <p>Tu asesor de Fincava ha generado un enlace de acceso para tu cuenta:<br>
      Your Fincava advisor has generated an access link for your account:</p>
      <p><a href="${magicLinkUrl}" style="font-weight:bold">Acceder a mi cuenta / Access my account</a></p>
      <p>Este enlace expira en 24 horas. / This link expires in 24 hours.</p>
    `;
    const text = `Access your Fincava supplier account:\n${magicLinkUrl}\n\nExpires in 24 hours.`;

    await sendEmail({
      to: supplier.email,
      subject: "Tu enlace de acceso Fincava / Your Fincava access link",
      html,
      text,
    });

    logger.info({ supplierId, adminId: req.userId }, "supplier-auth: admin-triggered magic link sent");
    res.json({ ok: true, sentTo: supplier.email });
  },
);

export default router;
