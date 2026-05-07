import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const BCRYPT_ROUNDS = parseInt(process.env["BCRYPT_ROUNDS"] ?? "12", 10);
if (!Number.isFinite(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 20) {
  throw new Error(`Invalid BCRYPT_ROUNDS value: "${process.env["BCRYPT_ROUNDS"]}". Must be 10-20.`);
}
const JWT_EXPIRY = (process.env["JWT_EXPIRY"] ?? "7d") as SignOptions["expiresIn"];

// Validated at module load so a missing secret crashes at startup, not mid-request
const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required but not set.");
}

function getJwtSecret(): string {
  return JWT_SECRET!;
}

// ── Password hashing ─────────────────────────────────────────────────────────

/** Legacy SHA-256 hash used before bcrypt migration — for comparison only. */
function legacyHash(password: string): string {
  const salt = process.env["LEGACY_HASH_SALT"];
  if (!salt) {
    throw new Error(
      "LEGACY_HASH_SALT environment variable is required for legacy password verification but is not set.",
    );
  }
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

/** Returns true if the hash looks like a legacy SHA-256 hex string (64 chars). */
function isLegacyHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against its stored hash.
 * Supports both bcrypt hashes and legacy SHA-256 hashes (transparent migration).
 * Returns the new bcrypt hash when the legacy hash matches, so the caller can
 * upgrade the stored hash in the database.
 *
 * errorCode "LEGACY_SALT_MISSING" is returned (not thrown) when a legacy hash
 * is detected but LEGACY_HASH_SALT is absent — callers must log this as an ops
 * error and return a safe 401/rejection to the client without exposing details.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ valid: boolean; newHash?: string; errorCode?: "LEGACY_SALT_MISSING" }> {
  if (isLegacyHash(storedHash)) {
    let hash: string;
    try {
      hash = legacyHash(password);
    } catch {
      return { valid: false, errorCode: "LEGACY_SALT_MISSING" };
    }
    const valid = hash === storedHash;
    return valid
      ? { valid: true, newHash: await hashPassword(password) }
      : { valid: false };
  }
  return { valid: await bcrypt.compare(password, storedHash) };
}

// ── Token generation / verification ──────────────────────────────────────────

export function generateToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ userId, tokenVersion }, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: number; tokenVersion: number } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { userId: number; tokenVersion?: number };
    if (!payload.userId) return null;
    return { userId: payload.userId, tokenVersion: payload.tokenVersion ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Increment token_version for a user, invalidating all previously issued JWTs.
 * Call this on every password change or reset.
 */
export async function bumpTokenVersion(userId: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ tokenVersion: sql`${usersTable.tokenVersion} + 1` })
    .where(eq(usersTable.id, userId));
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
  // Reject tokens issued before a password change by comparing token versions.
  // Tokens that pre-date the tokenVersion column have tokenVersion=0 in payload
  // and will fail this check, forcing re-login — intentional for security.
  if (payload.tokenVersion !== user.tokenVersion) {
    res.status(401).json({ error: "Session invalidated. Please log in again." });
    return;
  }
  (req as any).userId = user.id;
  (req as any).userRole = user.role;
  next();
}

export async function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select({ emailVerifiedAt: usersTable.emailVerifiedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user?.emailVerifiedAt) {
    res.status(403).json({ error: "Email address not verified. Please verify your email before performing this action." });
    return;
  }
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
  const [row] = await db
    .select({ user: usersTable, profile: profilesTable })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId));
  return { user: row?.user ?? null, profile: row?.profile ?? null };
}
