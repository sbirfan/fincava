import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "fincava_salt_2025").digest("hex");
}

export function generateToken(userId: number): string {
  const payload = JSON.stringify({ userId, iat: Date.now() });
  return Buffer.from(payload).toString("base64url");
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (!payload.userId) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  (req as any).userId = user.id;
  (req as any).userRole = user.role;
  next();
}

export async function requireRole(role: "BUYER" | "SUPPLIER" | "ADMIN") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userRole = (req as any).userRole;
    if (userRole !== role && userRole !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function getUserWithProfile(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  return { user, profile };
}
