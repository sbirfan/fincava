// Retail buyer authentication — magic link + email OTP (+ SMS OTP when TWILIO_SMS_FROM is set).
// Session uses the same fincava_auth JWT cookie as B2B auth.

import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { eq, and, gt, isNull, count } from "drizzle-orm";
import {
  db, usersTable, profilesTable,
  retailAuthTokensTable, retailBuyerProfilesTable,
} from "@workspace/db";
import { generateToken } from "../../lib/auth";
import { sendEmail, retailMagicLinkEmail, retailOtpEmail } from "../../lib/email";
import { sendSms } from "../../lib/sms";
import { logger } from "../../lib/logger";
import { sendError } from "../../lib/response";

const router: IRouter = Router();

const IS_REPLIT = !!process.env["REPLIT_DOMAINS"];
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (IS_REPLIT ? "none" : "lax") as "none" | "lax",
  secure: IS_REPLIT || process.env["NODE_ENV"] === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const RATE_LIMIT = 5; // max tokens per email/phone per hour
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("57") && stripped.length >= 11) return `+${stripped}`;
  return `+57${stripped}`;
}

// ── POST /api/retail/auth/request ─────────────────────────────────────────────
// Accepts: { email?, phone?, channel? }
// channel: "MAGIC_LINK" (default) | "EMAIL_OTP" | "SMS_OTP" (requires TWILIO_SMS_FROM)
router.post("/retail/auth/request", async (req, res): Promise<void> => {
  const { email, phone, channel = "MAGIC_LINK", lang = "es" } = req.body as {
    email?: string; phone?: string; channel?: string; lang?: "es" | "en";
  };

  if (!email && !phone) { sendError(res, 400, "email or phone required"); return; }
  if (channel === "SMS_OTP" && !phone) { sendError(res, 400, "phone required for SMS_OTP"); return; }
  if (channel === "SMS_OTP" && !process.env["TWILIO_SMS_FROM"]) {
    sendError(res, 503, "SMS not available — use EMAIL_OTP or MAGIC_LINK"); return;
  }

  const identifier = phone ? normalizePhone(phone) : email!;
  const isPhone = !!phone && channel === "SMS_OTP";

  // Rate limit: max 5 tokens per identifier per hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(retailAuthTokensTable)
    .where(
      isPhone
        ? and(eq(retailAuthTokensTable.phone, identifier), gt(retailAuthTokensTable.createdAt, hourAgo))
        : and(eq(retailAuthTokensTable.email, email!), gt(retailAuthTokensTable.createdAt, hourAgo))
    );
  if (Number(cnt) >= RATE_LIMIT) { res.status(429).json({ error: "Too many requests. Try again in an hour." }); return; }

  // Generate token
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  let rawToken: string;
  let tokenType: string;
  let sentChannel: string;

  if (channel === "EMAIL_OTP" || channel === "SMS_OTP") {
    rawToken = String(crypto.randomInt(100000, 1000000));
    tokenType = channel === "SMS_OTP" ? "SMS_OTP" : "EMAIL_OTP";
  } else {
    rawToken = crypto.randomBytes(32).toString("hex");
    tokenType = "MAGIC_LINK";
  }

  const tokenHash = sha256(rawToken);

  // Ensure user exists (create if first-time)
  let userId: number | null = null;
  if (email) {
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      userId = existing.id;
    } else {
      const [newUser] = await db.insert(usersTable).values({
        email,
        passwordHash: "RETAIL_MAGIC",
        role: "BUYER",
        tokenVersion: 0,
      }).returning({ id: usersTable.id });
      userId = newUser.id;
    }
  }

  await db.insert(retailAuthTokensTable).values({
    userId,
    email: email ?? null,
    phone: isPhone ? identifier : null,
    tokenHash,
    tokenType,
    expiresAt,
  });

  // Send
  const appBaseUrl = process.env["FRONTEND_URL"]
    ?? (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}` : "http://localhost:5173");

  if (tokenType === "MAGIC_LINK") {
    const magicLinkUrl = `${appBaseUrl}/tienda/auth/verify?token=${rawToken}`;
    const content = retailMagicLinkEmail({ magicLinkUrl, lang });
    await sendEmail({ to: email!, subject: content.subject, html: content.html, text: content.text });
    sentChannel = "EMAIL";
  } else if (tokenType === "EMAIL_OTP") {
    const content = retailOtpEmail({ otp: rawToken, lang });
    await sendEmail({ to: email!, subject: content.subject, html: content.html, text: content.text });
    sentChannel = "EMAIL";
  } else {
    // SMS_OTP
    const msg = lang === "en"
      ? `Your FINCAVA code: ${rawToken}. Valid 15 min. Do not share.`
      : `Tu código de FINCAVA: ${rawToken}. Válido 15 minutos. No lo compartas.`;
    await sendSms(identifier, msg);
    sentChannel = "SMS";
  }

  logger.info({ tokenType, sentChannel }, "retail/auth/request: token issued");
  res.json({ data: { channel: sentChannel, sent: true } });
});

// ── GET /api/retail/auth/verify-magic ─────────────────────────────────────────
router.get("/retail/auth/verify-magic", async (req, res): Promise<void> => {
  const rawToken = req.query["token"] as string | undefined;
  if (!rawToken) { sendError(res, 400, "token required"); return; }

  const tokenHash = sha256(rawToken);
  const now = new Date();

  const [tokenRow] = await db
    .select()
    .from(retailAuthTokensTable)
    .where(
      and(
        eq(retailAuthTokensTable.tokenHash, tokenHash),
        eq(retailAuthTokensTable.tokenType, "MAGIC_LINK"),
        isNull(retailAuthTokensTable.usedAt),
        gt(retailAuthTokensTable.expiresAt, now),
      )
    );

  if (!tokenRow) { sendError(res, 400, "Token invalid or expired"); return; }

  // Mark used
  await db.update(retailAuthTokensTable).set({ usedAt: now }).where(eq(retailAuthTokensTable.id, tokenRow.id));

  const { userId, isNewAccount } = await ensureRetailProfile(tokenRow.userId!, tokenRow.email);

  // Issue session
  const [user] = await db.select({ tokenVersion: usersTable.tokenVersion }).from(usersTable).where(eq(usersTable.id, userId));
  const jwtToken = generateToken(userId, user.tokenVersion);
  res.cookie("fincava_auth", jwtToken, COOKIE_OPTIONS);

  res.json({ data: { userId, isNewAccount } });
});

// ── POST /api/retail/auth/verify-otp ──────────────────────────────────────────
// Works for EMAIL_OTP and SMS_OTP (token_type is matched from DB)
router.post("/retail/auth/verify-otp", async (req, res): Promise<void> => {
  const { email, phone, otp } = req.body as { email?: string; phone?: string; otp?: string };
  if (!otp) { sendError(res, 400, "otp required"); return; }
  if (!email && !phone) { sendError(res, 400, "email or phone required"); return; }

  const tokenHash = sha256(otp);
  const now = new Date();

  const [tokenRow] = await db
    .select()
    .from(retailAuthTokensTable)
    .where(
      and(
        eq(retailAuthTokensTable.tokenHash, tokenHash),
        isNull(retailAuthTokensTable.usedAt),
        gt(retailAuthTokensTable.expiresAt, now),
      )
    );

  if (!tokenRow) { sendError(res, 400, "Code invalid or expired"); return; }
  if (tokenRow.tokenType !== "EMAIL_OTP" && tokenRow.tokenType !== "SMS_OTP") {
    sendError(res, 400, "Code invalid or expired"); return;
  }
  // Verify the identifier matches
  if (email && tokenRow.email !== email) { sendError(res, 400, "Code invalid or expired"); return; }
  if (phone && tokenRow.phone !== normalizePhone(phone)) { sendError(res, 400, "Code invalid or expired"); return; }

  await db.update(retailAuthTokensTable).set({ usedAt: now }).where(eq(retailAuthTokensTable.id, tokenRow.id));

  const { userId, isNewAccount } = await ensureRetailProfile(tokenRow.userId!, tokenRow.email);

  const [user] = await db.select({ tokenVersion: usersTable.tokenVersion }).from(usersTable).where(eq(usersTable.id, userId));
  const jwtToken = generateToken(userId, user.tokenVersion);
  res.cookie("fincava_auth", jwtToken, COOKIE_OPTIONS);

  res.json({ data: { userId, isNewAccount } });
});

// ── DELETE /api/retail/auth/session ───────────────────────────────────────────
router.delete("/retail/auth/session", (_req, res): void => {
  res.clearCookie("fincava_auth", { path: "/" });
  res.json({ data: { success: true } });
});

// ── Helper ─────────────────────────────────────────────────────────────────────
async function ensureRetailProfile(
  userId: number,
  email: string | null,
): Promise<{ userId: number; isNewAccount: boolean }> {
  const [existing] = await db
    .select({ id: retailBuyerProfilesTable.id })
    .from(retailBuyerProfilesTable)
    .where(eq(retailBuyerProfilesTable.userId, userId));

  if (existing) return { userId, isNewAccount: false };

  // First login — create profile, seed name from users table if available
  const [profile] = await db
    .select({ firstName: profilesTable.firstName, lastName: profilesTable.lastName })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  await db.insert(retailBuyerProfilesTable).values({
    userId,
    firstName: profile?.firstName ?? (email ? email.split("@")[0]! : "Comprador"),
    lastName: profile?.lastName ?? null,
  });

  return { userId, isNewAccount: true };
}

export default router;
