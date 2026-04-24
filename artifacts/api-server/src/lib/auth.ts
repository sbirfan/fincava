import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set.");
  }
  return secret;
}

// ── Password hashing ─────────────────────────────────────────────────────────

/** Legacy SHA-256 hash used before bcrypt migration — for comparison only. */
function legacyHash(password: string): string {
  const salt = process.env["LEGACY_HASH_SALT"] ?? "fincava_salt_2025";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

/** Returns true if the hash looks like a legacy SHA-256 hex string (64 chars). */
function isLegacyHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against its stored hash.
 * Supports both bcrypt hashes and legacy SHA-256 hashes (transparent migration).
 * Returns the new bcrypt hash when the legacy hash matches, so the caller can
 * upgrade the stored hash in the database.
 */
export function verifyPassword(
  password: string,
  storedHash: string,
): { valid: boolean; newHash?: string } {
  if (isLegacyHash(storedHash)) {
    const valid = legacyHash(password) === storedHash;
    return valid
      ? { valid: true, newHash: hashPassword(password) }
      : { valid: false };
  }
  return { valid: bcrypt.compareSync(password, storedHash) };
}

// ── Token generation / verification ──────────────────────────────────────────

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { userId: number };
    if (!payload.userId) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Prefer httpOnly cookie (XSS-safe); fall back to Bearer for programmatic clients
  const cookieToken = (req as any).cookies?.fincava_auth as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const rawToken = cookieToken ?? bearerToken;

  if (!rawToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = verifyToken(rawToken);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
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
