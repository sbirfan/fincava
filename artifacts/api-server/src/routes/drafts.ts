import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, onboardingDraftsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const WHATSAPP_RE = /^\+57[0-9]{10}$/;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 15;

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    next();
    return;
  }
  if (record.count >= RATE_LIMIT) {
    res.status(429).json({ error: "Too many requests, please try again later" });
    return;
  }
  record.count += 1;
  next();
}

const WhatsappQuerySchema = z.object({
  whatsapp: z.string().regex(WHATSAPP_RE),
});

const SaveDraftSchema = z.object({
  whatsapp_number: z.string().regex(WHATSAPP_RE),
  data: z.record(z.unknown()),
  restore_token: z.string().uuid().optional(),
});

const RestoreSchema = z.object({
  whatsapp_number: z.string().regex(WHATSAPP_RE),
  restore_token: z.string().uuid(),
});

const DeleteQuerySchema = z.object({
  whatsapp: z.string().regex(WHATSAPP_RE),
  restore_token: z.string().uuid(),
});

function getDraftExpiryDays(): number {
  const raw = process.env["DRAFT_EXPIRY_DAYS"];
  if (!raw) return 30;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

router.get("/drafts/onboarding", rateLimit, async (req, res): Promise<void> => {
  const parsed = WhatsappQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid WhatsApp number format" });
    return;
  }

  const expiryDays = getDraftExpiryDays();
  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  const [draft] = await db
    .select({
      data: onboardingDraftsTable.data,
      updatedAt: onboardingDraftsTable.updatedAt,
      createdAt: onboardingDraftsTable.createdAt,
    })
    .from(onboardingDraftsTable)
    .where(
      and(
        eq(onboardingDraftsTable.whatsappNumber, parsed.data.whatsapp),
        sql`${onboardingDraftsTable.updatedAt} >= ${cutoff}`,
      )
    )
    .limit(1);

  if (!draft) {
    res.status(404).json({ found: false });
    return;
  }

  const data = draft.data as Record<string, unknown>;
  const savedStep = typeof data["_step"] === "number" ? data["_step"] : 0;

  res.json({ found: true, savedStep, updatedAt: draft.updatedAt, createdAt: draft.createdAt });
});

router.post("/drafts/onboarding/restore", rateLimit, async (req, res): Promise<void> => {
  const parsed = RestoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "whatsapp_number and restore_token are required" });
    return;
  }

  const { whatsapp_number, restore_token } = parsed.data;
  const expiryDays = getDraftExpiryDays();
  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  const [draft] = await db
    .select()
    .from(onboardingDraftsTable)
    .where(
      and(
        eq(onboardingDraftsTable.whatsappNumber, whatsapp_number),
        eq(onboardingDraftsTable.restoreToken, restore_token),
        sql`${onboardingDraftsTable.updatedAt} >= ${cutoff}`,
      ),
    )
    .limit(1);

  if (!draft) {
    res.status(403).json({ error: "Invalid token or draft not found" });
    return;
  }

  res.json({ found: true, data: draft.data, updatedAt: draft.updatedAt, createdAt: draft.createdAt });
});

router.put("/drafts/onboarding", rateLimit, async (req, res): Promise<void> => {
  const parsed = SaveDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { whatsapp_number, data, restore_token } = parsed.data;

  const [existing] = await db
    .select({ restoreToken: onboardingDraftsTable.restoreToken })
    .from(onboardingDraftsTable)
    .where(eq(onboardingDraftsTable.whatsappNumber, whatsapp_number))
    .limit(1);

  if (!existing) {
    const newToken = randomUUID();
    await db.insert(onboardingDraftsTable).values({
      whatsappNumber: whatsapp_number,
      data,
      restoreToken: newToken,
    });
    res.json({ success: true, restore_token: newToken });
    return;
  }

  if (!restore_token || restore_token !== existing.restoreToken) {
    res.status(403).json({ error: "Invalid or missing restore token" });
    return;
  }

  await db
    .update(onboardingDraftsTable)
    .set({ data, updatedAt: new Date() })
    .where(eq(onboardingDraftsTable.whatsappNumber, whatsapp_number));

  res.json({ success: true, restore_token });
});

router.delete("/drafts/onboarding", rateLimit, async (req, res): Promise<void> => {
  const parsed = DeleteQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid whatsapp number and restore_token are required" });
    return;
  }

  const { whatsapp, restore_token } = parsed.data;

  const result = await db
    .delete(onboardingDraftsTable)
    .where(
      and(
        eq(onboardingDraftsTable.whatsappNumber, whatsapp),
        eq(onboardingDraftsTable.restoreToken, restore_token),
      ),
    )
    .returning({ id: onboardingDraftsTable.id });

  if (result.length === 0) {
    res.status(403).json({ error: "Invalid token or draft not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
