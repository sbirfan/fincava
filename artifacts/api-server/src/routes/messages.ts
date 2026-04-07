import { Router, type IRouter } from "express";
import { eq, or, and, desc } from "drizzle-orm";
import { db, messagesTable, usersTable, profilesTable } from "@workspace/db";
import { GetMessagesParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;

  const messages = await db.select().from(messagesTable)
    .where(or(
      eq(messagesTable.senderId, userId),
      eq(messagesTable.receiverId, userId),
    ))
    .orderBy(desc(messagesTable.createdAt));

  // Build conversation map
  const conversationMap = new Map<number, any>();
  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, msg);
    }
  }

  const conversations = await Promise.all(
    Array.from(conversationMap.entries()).map(async ([otherId, lastMsg]) => {
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, otherId));
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));

      const unreadMessages = await db.select().from(messagesTable)
        .where(and(
          eq(messagesTable.senderId, otherId),
          eq(messagesTable.receiverId, userId),
          eq(messagesTable.read, false),
        ));

      return {
        userId: otherId,
        userName: profile ? `${profile.firstName} ${profile.lastName}` : "Unknown",
        userRole: user?.role ?? "BUYER",
        userAvatarUrl: profile?.avatarUrl ?? null,
        lastMessage: lastMsg.content,
        lastMessageAt: lastMsg.createdAt.toISOString(),
        unreadCount: unreadMessages.length,
      };
    })
  );

  res.json(conversations);
});

router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = (req as any).userId;
  const params = GetMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
      read: msg.read,
      createdAt: msg.createdAt.toISOString(),
    };
  }));

  // Mark messages as read
  await db.update(messagesTable)
    .set({ read: true })
    .where(and(
      eq(messagesTable.senderId, params.data.userId),
      eq(messagesTable.receiverId, currentUserId),
    ));

  res.json(results);
});

router.post("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = (req as any).userId;
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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
    read: message.read,
    createdAt: message.createdAt.toISOString(),
  });
});

export default router;
