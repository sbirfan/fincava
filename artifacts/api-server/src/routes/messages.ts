import { Router, type IRouter } from "express";
import { eq, or, and, desc, inArray, count } from "drizzle-orm";
import { db, messagesTable, usersTable, profilesTable } from "@workspace/db";
import { GetMessagesParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getAnthropicClient, TRANSLATION_MODEL } from "../lib/anthropic";
import { sendEmail, conversationEscalationEmail } from "../lib/email";
import { z } from "zod";
import { logger } from "../lib/logger";
import { sendError } from "../lib/response";

const router: IRouter = Router();

// ── GET /api/messages/conversations ─────────────────────────────────────────
router.get("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;

  const messages = await db.select().from(messagesTable)
    .where(or(
      eq(messagesTable.senderId, userId),
      eq(messagesTable.receiverId, userId),
    ))
    .orderBy(desc(messagesTable.createdAt));

  const conversationMap = new Map<number, any>();
  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, msg);
    }
  }

  const otherUserIds = Array.from(conversationMap.keys());
  if (otherUserIds.length === 0) {
    res.json([]);
    return;
  }

  // Three parallel batch queries — one round-trip regardless of conversation count
  const [profiles, users, unreadRows] = await Promise.all([
    db.select().from(profilesTable).where(inArray(profilesTable.userId, otherUserIds)),
    db.select().from(usersTable).where(inArray(usersTable.id, otherUserIds)),
    db.select({ senderId: messagesTable.senderId, unreadCount: count() })
      .from(messagesTable)
      .where(and(
        eq(messagesTable.receiverId, userId),
        inArray(messagesTable.senderId, otherUserIds),
        eq(messagesTable.read, false),
      ))
      .groupBy(messagesTable.senderId),
  ]);

  // Build O(1) lookup maps
  const profileMap = new Map(profiles.map(p => [p.userId, p]));
  const userMap    = new Map(users.map(u => [u.id, u]));
  const unreadMap  = new Map(unreadRows.map(r => [r.senderId, Number(r.unreadCount)]));

  // Assemble response in memory — no DB calls inside loop
  const conversations = Array.from(conversationMap.entries()).map(([otherId, lastMsg]) => {
    const profile = profileMap.get(otherId);
    const user    = userMap.get(otherId);
    return {
      userId:        otherId,
      userName:      profile ? `${profile.firstName} ${profile.lastName}` : "Unknown",
      userRole:      user?.role ?? "BUYER",
      userAvatarUrl: profile?.avatarUrl ?? null,
      lastMessage:   lastMsg.content,
      lastMessageAt: lastMsg.createdAt.toISOString(),
      unreadCount:   unreadMap.get(otherId) ?? 0,
    };
  });

  res.json(conversations);
});

// ── GET /api/messages/:userId ────────────────────────────────────────────────
router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.userId;
  const params = GetMessagesParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(or(
      and(eq(messagesTable.senderId, currentUserId), eq(messagesTable.receiverId, params.data.userId)),
      and(eq(messagesTable.senderId, params.data.userId), eq(messagesTable.receiverId, currentUserId)),
    ))
    .orderBy(messagesTable.createdAt);

  const results = await Promise.all(messages.map(async (msg) => {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, msg.senderId));
    return {
      id: msg.id,
      senderId: msg.senderId,
      senderName: profile ? `${profile.firstName} ${profile.lastName}` : "Unknown",
      receiverId: msg.receiverId,
      content: msg.content,
      translatedContent: msg.translatedContent ?? null,
      detectedLang: msg.detectedLang ?? null,
      read: msg.read,
      createdAt: msg.createdAt.toISOString(),
    };
  }));

  await db.update(messagesTable)
    .set({ read: true })
    .where(and(
      eq(messagesTable.senderId, params.data.userId),
      eq(messagesTable.receiverId, currentUserId),
    ));

  res.json(results);
});

// ── POST /api/messages/:userId ───────────────────────────────────────────────
router.post("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.userId;
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  const [message] = await db.insert(messagesTable).values({
    senderId: currentUserId,
    receiverId: params.data.userId,
    content: parsed.data.content,
    read: false,
  }).returning();

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, currentUserId));

  res.status(201).json({
    id: message.id,
    senderId: message.senderId,
    senderName: profile ? `${profile.firstName} ${profile.lastName}` : "Unknown",
    receiverId: message.receiverId,
    content: message.content,
    translatedContent: null,
    detectedLang: null,
    read: message.read,
    createdAt: message.createdAt.toISOString(),
  });
});

// ── POST /api/messages/:userId/translate ─────────────────────────────────────
// Lazily translates all untranslated messages in the thread via Claude (one call).
// Results are cached in the DB and returned to the client.
const TranslateBody = z.object({ targetLang: z.enum(["en", "es"]) });

router.post("/messages/:userId/translate", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.userId;
  const otherUserId = parseInt(req.params["userId"] as string, 10);
  if (isNaN(otherUserId)) { sendError(res, 400, "Invalid userId"); return; }

  const parsed = TranslateBody.safeParse(req.body);
  if (!parsed.success) { sendError(res, 400, "targetLang must be 'en' or 'es'"); return; }
  const { targetLang } = parsed.data;

  // Fetch full thread
  const allMessages = await db.select().from(messagesTable)
    .where(or(
      and(eq(messagesTable.senderId, currentUserId), eq(messagesTable.receiverId, otherUserId)),
      and(eq(messagesTable.senderId, otherUserId), eq(messagesTable.receiverId, currentUserId)),
    ))
    .orderBy(messagesTable.createdAt);

  // Find messages that need translation (no cached translation yet)
  const toTranslate = allMessages.filter(m => !m.translatedContent);

  if (toTranslate.length === 0) {
    // All already translated — return current state
    res.json({ translated: 0, total: allMessages.length });
    return;
  }

  // Build a single Claude prompt for the entire batch
  const targetLabel = targetLang === "en" ? "English" : "Spanish";
  const messageList = toTranslate.map((m, i) =>
    `[${i + 1}] id:${m.id} | "${m.content}"`
  ).join("\n");

  const prompt = `You are a professional translator for an agricultural B2B platform that connects Colombian/Latin American farmers with international buyers.

Translate each message below to ${targetLabel}. If a message is already in ${targetLabel}, return it unchanged. Preserve tone, agricultural terminology, and business context.

Messages to translate:
${messageList}

Return ONLY a JSON array (no markdown, no commentary) with exactly ${toTranslate.length} objects:
[{"id":<number>,"detectedLang":"es"|"en","translation":"<translated text>"},...]`;

  let translations: { id: number; detectedLang: string; translation: string }[] = [];
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: TRANSLATION_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as any).text ?? "";
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    translations = JSON.parse(jsonStr);
  } catch (err) {
    logger.error({ err }, "Translation batch failed");
    sendError(res, 502, "Translation service unavailable. Please try again.");
    return;
  }

  // Persist translations to DB
  const updatePromises = translations.map(t =>
    db.update(messagesTable)
      .set({ translatedContent: t.translation, detectedLang: t.detectedLang })
      .where(eq(messagesTable.id, t.id))
  );
  await Promise.all(updatePromises);

  logger.info({ userId: currentUserId, otherUserId, translated: translations.length }, "MESSAGES_TRANSLATED");
  res.json({ translated: translations.length, total: allMessages.length });
});

// ── POST /api/messages/:userId/escalate ──────────────────────────────────────
// Sends an admin alert email asking Fincava to facilitate a conversation.
const EscalateBody = z.object({ note: z.string().min(1).max(1000) });

router.post("/messages/:userId/escalate", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.userId;
  const otherUserId = parseInt(req.params["userId"] as string, 10);
  if (isNaN(otherUserId)) { sendError(res, 400, "Invalid userId"); return; }

  const parsed = EscalateBody.safeParse(req.body);
  if (!parsed.success) { sendError(res, 400, "note is required (max 1000 chars)"); return; }

  // Fetch profiles for both parties
  const [myProfile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, currentUserId));
  const [myUser] = await db.select().from(usersTable).where(eq(usersTable.id, currentUserId));
  const [otherProfile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, otherUserId));

  const myName = myProfile ? `${myProfile.firstName} ${myProfile.lastName}` : "Unknown";
  const myRole = myUser?.role ?? "BUYER";
  const otherName = otherProfile ? `${otherProfile.firstName} ${otherProfile.lastName}` : "Unknown";

  // Fetch recent thread for context (last 8 messages)
  const recentMessages = await db.select().from(messagesTable)
    .where(or(
      and(eq(messagesTable.senderId, currentUserId), eq(messagesTable.receiverId, otherUserId)),
      and(eq(messagesTable.senderId, otherUserId), eq(messagesTable.receiverId, currentUserId)),
    ))
    .orderBy(desc(messagesTable.createdAt))
    .limit(8);

  const msgForEmail = recentMessages.reverse().map(async m => {
    const [p] = await db.select().from(profilesTable).where(eq(profilesTable.userId, m.senderId));
    return {
      senderName: p ? `${p.firstName} ${p.lastName}` : "Unknown",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    };
  });
  const messageList = await Promise.all(msgForEmail);

  const appUrl = process.env["APP_URL"] ?? "https://fincava.com";
  const { html, text, subject } = conversationEscalationEmail({
    requesterName: myName,
    requesterRole: myRole,
    otherPartyName: otherName,
    note: parsed.data.note,
    messages: messageList,
    adminUrl: `${appUrl}/admin`,
  });

  const adminEmail = process.env["ADMIN_EMAIL"] ?? "info@fincava.com";
  const emailResult = await sendEmail({ to: adminEmail, subject, html, text });

  if (!emailResult.ok && emailResult.reason !== "no_api_key") {
    sendError(res, 502, "Failed to send escalation. Please try again.");
    return;
  }

  logger.info({ currentUserId, otherUserId, myName, emailResult }, "CONVERSATION_ESCALATED");
  res.json({ ok: true, message: "Your request has been sent to the Fincava team. We'll reach out within 24 hours." });
});

export default router;
