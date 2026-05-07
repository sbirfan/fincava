import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getAnthropicClient } from "../lib/anthropic";

const router: IRouter = Router();

const ASSISTANT_MODEL =
  process.env["ANTHROPIC_ASSISTANT_MODEL"] ?? "claude-haiku-4-5";

const MAX_MESSAGES = 20;
const MAX_MSG_CHARS = 2000;
const MAX_TOTAL_CHARS = 16000;

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MSG_CHARS),
});

const ChatBody = z.object({
  messages: z.array(ChatMessage).min(1).max(MAX_MESSAGES),
  language: z.enum(["en", "es"]).optional(),
});

// Per-user (falls back to IP) rate limiter for the AI endpoint —
// AI calls are expensive, so keep a tight burst + hourly budget.
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,                  // ~1 message/min average per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.userId;
    if (userId) return `u:${userId}`;
    return `ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
  message: {
    error: "You've reached the AI assistant usage limit for now. Please try again later.",
  },
});

function buildSystemPrompt(role: string, displayName: string, language: "en" | "es") {
  const isSupplier = role === "SUPPLIER";
  const isBuyer = role === "BUYER";
  const isAdmin = role === "ADMIN";
  const isOfficer = role === "FIELD_OFFICER";

  const audience = isSupplier
    ? "a Colombian agricultural supplier (farmer, cooperative, or exporter)"
    : isBuyer
    ? "an international buyer sourcing Colombian agricultural products"
    : isAdmin
    ? "a Fincava platform administrator"
    : isOfficer
    ? "a Fincava field officer who supports suppliers in the field"
    : "a Fincava platform user";

  const supplierTopics = `
- Listing products (coffee, cocoa, fruits, etc.) with quality grades, certifications, and pricing per kg
- Responding to RFQs (Requests for Quotation) from international buyers
- Understanding export readiness, certifications (Rainforest Alliance, organic, fair trade, GLOBALG.A.P., HACCP)
- Trade finance options: invoice factoring, pre-shipment financing, working capital loans
- Order fulfillment, shipping documents, and incoterms (FOB, CIF, EXW)
- Building company profile, getting verified, improving supplier score
- Bank/payment setup and tracking payments`;

  const buyerTopics = `
- Searching the marketplace for Colombian agricultural products
- Posting RFQs and evaluating supplier quotes
- Understanding supplier verification status, ratings, and origin stories
- Order placement, escrow/payment, and shipment tracking
- Reading market intelligence and price analytics
- Buyer credit / financing programs available on Fincava
- Trade documentation and what to expect from a Colombian supplier`;

  const adminTopics = `
- Reviewing supplier applications, verification, and supplier scoring
- Managing users, orders, fees, and disputes
- Operating the supplier ingestion pipeline (discovery, enrichment, structuring)
- Field officer team management`;

  const focusedTopics = isSupplier
    ? supplierTopics
    : isBuyer
    ? buyerTopics
    : isAdmin || isOfficer
    ? adminTopics
    : `${supplierTopics}\n${buyerTopics}`;

  const langInstruction =
    language === "es"
      ? "Responde SIEMPRE en español, con un tono cálido y profesional. Usa terminología agrícola y de comercio exterior común en Colombia."
      : "Always respond in clear, friendly English. Use plain language; avoid jargon unless the user asks for technical detail.";

  return `You are "Fina", the AI assistant for Fincava — a Colombian agricultural B2B marketplace that connects Colombian farmers, cooperatives, and exporters with international buyers, and offers trade finance services.

You are talking to ${displayName ? `${displayName}, ` : ""}${audience}.

${langInstruction}

YOUR JOB
- Help the user navigate the Fincava platform and answer questions about Colombian agricultural trade.
- Be concise. Default to 2–4 short paragraphs or a short bulleted list. Only go longer if the user explicitly asks for detail.
- When the user asks how to do something on the platform, give clear step-by-step instructions and mention the relevant section of their dashboard (e.g. "go to your Supplier Dashboard → Products → Add Product").
- When the user asks about prices, certifications, regulations, or finance, give general guidance but be honest that you don't have live market data and suggest where on the platform to look (Market Intelligence, Trade Finance, etc.).

TOPICS YOU KNOW WELL
${focusedTopics}

GROUND RULES
- You are a helpful assistant, not a legal, financial, or tax advisor. For binding decisions, recommend the user consult a qualified professional or Fincava support.
- You do not have access to the user's private data (their orders, balances, messages, RFQs). If the user asks about their own specific records, tell them which page to check inside their dashboard.
- Never make up product listings, supplier names, prices, certifications, or contract terms.
- If the user asks something completely unrelated to agriculture, trade, or Fincava (e.g. "write me a poem"), politely redirect back to how you can help with their Fincava workflow.
- Keep responses safe, respectful, and culturally aware (the user community is primarily Colombian and international trade partners).`;
}

router.post("/ai-assistant/chat", requireAuth, chatLimiter, async (req, res): Promise<void> => {
  const userId = req.userId;

  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Server-side normalization: enforce strict alternation that ENDS with the
  // current user turn, dropping any client-injected leading/orphan assistant
  // turns. This makes it harder for a client to forge fake "assistant"
  // history that manipulates the model.
  const incoming = parsed.data.messages;
  const lastUserIdx = (() => {
    for (let i = incoming.length - 1; i >= 0; i--) {
      if (incoming[i]!.role === "user") return i;
    }
    return -1;
  })();
  if (lastUserIdx === -1) {
    res.status(400).json({ error: "Conversation must end with a user message." });
    return;
  }
  const trimmed = incoming.slice(0, lastUserIdx + 1);
  const normalized: { role: "user" | "assistant"; content: string }[] = [];
  let expected: "user" | "assistant" = "user";
  for (let i = 0; i < trimmed.length; i++) {
    const m = trimmed[i]!;
    if (normalized.length === 0 && m.role !== "user") continue; // must start with user
    if (m.role !== expected) continue; // skip duplicate-role turns
    normalized.push({ role: m.role, content: m.content });
    expected = expected === "user" ? "assistant" : "user";
  }
  if (normalized.length === 0 || normalized[normalized.length - 1]!.role !== "user") {
    res.status(400).json({ error: "Invalid conversation history." });
    return;
  }
  const totalChars = normalized.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    res.status(400).json({ error: "Conversation is too long. Start a new chat." });
    return;
  }

  if (!process.env["ANTHROPIC_API_KEY"]) {
    res.status(503).json({
      error: "AI assistant is not configured on this server.",
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  const displayName = profile?.firstName
    ? `${profile.firstName}${profile.lastName ? " " + profile.lastName : ""}`
    : "";

  const language = parsed.data.language ?? "en";
  const systemPrompt = buildSystemPrompt(user.role ?? "BUYER", displayName, language);

  try {
    const client = getAnthropicClient();
    const start = Date.now();
    const message = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: normalized,
    });
    const duration = Date.now() - start;

    const reply = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    req.log.info(
      { userId, role: user.role, duration, model: ASSISTANT_MODEL },
      "ai-assistant chat",
    );

    res.json({
      reply: reply || "I'm sorry, I couldn't generate a response. Please try again.",
    });
  } catch (err: any) {
    req.log.error({ err, userId }, "ai-assistant chat failed");
    res.status(502).json({
      error: "The AI assistant is temporarily unavailable. Please try again in a moment.",
    });
  }
});

export default router;
