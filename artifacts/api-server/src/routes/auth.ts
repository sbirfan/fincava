import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, generateToken, requireAuth, getUserWithProfile } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
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
  };
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
  const [user] = await db.insert(usersTable).values({ email, passwordHash, role }).returning();

  const [profile] = await db.insert(profilesTable).values({
    userId: user.id,
    firstName,
    lastName,
    country: country ?? null,
    language: "en",
  }).returning();

  const companyType = role === "BUYER" ? "IMPORTER" : "EXPORTER";
  const [company] = await db.insert(companiesTable).values({
    userId: user.id,
    name: companyName,
    type: companyType as any,
    country: country,
    region: region ?? null,
    description: "",
    verified: false,
  }).returning();

  const token = generateToken(user.id);
  res.cookie("fincava_auth", token, COOKIE_OPTIONS);
  res.status(201).json({
    token,
    user: buildUserResponse(user, profile, company),
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
    logger.warn({ email, ip: req.ip }, "Login failed: invalid credentials");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Transparently upgrade legacy SHA-256 hashes to bcrypt on first login
  if (result.newHash) {
    await db.update(usersTable).set({ passwordHash: result.newHash }).where(eq(usersTable.id, user.id));
    logger.info({ userId: user.id, email }, "Password hash upgraded: SHA-256 → bcrypt");
  }
  logger.info({ userId: user.id, email, role: user.role, ip: req.ip }, "Login success");

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

  const userId = (req as any).userId as number;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const result = await verifyPassword(currentPassword, user.passwordHash);
  if (!result.valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await db.update(usersTable).set({ passwordHash: await hashPassword(newPassword) }).where(eq(usersTable.id, userId));
  logger.info({ userId, email: user.email }, "Password changed successfully");
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { user, profile } = await getUserWithProfile(userId);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  res.json(buildUserResponse(user, profile, company));
});

export default router;
