import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, generateToken, requireAuth, getUserWithProfile } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function buildUserResponse(user: any, profile: any, company: any) {
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
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, firstName, lastName, role, companyName, country, region } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = hashPassword(password);
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

  res.cookie("fincava_auth", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

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

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  const result = user ? verifyPassword(password, user.passwordHash) : { valid: false };
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

  res.cookie("fincava_auth", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({
    token,
    user: buildUserResponse(user, profile, company),
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.clearCookie("fincava_auth", { path: "/" });
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { user, profile } = await getUserWithProfile(userId);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));
  res.json(buildUserResponse(user, profile, company));
});

export default router;
