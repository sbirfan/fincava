import { vi, describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Hoist: set JWT_SECRET before any module is imported ─────────────────────
// lib/auth.ts validates JWT_SECRET at module load time; the env var must exist
// before the import resolves or the module throws.
vi.hoisted(() => {
  process.env["JWT_SECRET"] = "test-jwt-secret-r11-auth";
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@workspace/db", () => ({
  db: {},
  usersTable: {},
  profilesTable: {},
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "mock_token"),
    verify: vi.fn(() => ({ userId: 1 })),
  },
}));

// bcryptjs mock: hash encodes the plaintext so compare() can verify without
// real bcrypt rounds (keeps the test suite fast).
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string, _rounds: number) => `bcrypt_mock:${pw}`),
    compare: vi.fn(
      async (pw: string, hash: string) => hash === `bcrypt_mock:${pw}`,
    ),
  },
}));

import { verifyPassword } from "../lib/auth";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const TEST_SALT = "r11_unit_test_salt";
const TEST_PASSWORD = "correct_horse_battery";

// Pre-compute the legacy SHA-256 hash using the same algorithm as legacyHash().
const LEGACY_HASH = crypto
  .createHash("sha256")
  .update(TEST_PASSWORD + TEST_SALT)
  .digest("hex");

// bcrypt fixture that matches the mock's encoding convention.
const BCRYPT_HASH = `bcrypt_mock:${TEST_PASSWORD}`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("verifyPassword — bcrypt path", () => {
  beforeEach(() => {
    delete process.env["LEGACY_HASH_SALT"];
  });

  it("returns valid:true for a correct bcrypt hash", async () => {
    const result = await verifyPassword(TEST_PASSWORD, BCRYPT_HASH);
    expect(result.valid).toBe(true);
    expect(result.errorCode).toBeUndefined();
    expect(result.newHash).toBeUndefined();
  });

  it("returns valid:false for an incorrect bcrypt password", async () => {
    const result = await verifyPassword("wrong_password", BCRYPT_HASH);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBeUndefined();
  });
});

describe("verifyPassword — legacy SHA-256 path (LEGACY_HASH_SALT present)", () => {
  beforeEach(() => {
    process.env["LEGACY_HASH_SALT"] = TEST_SALT;
  });

  it("returns valid:true and a newHash (for transparent bcrypt upgrade) when password matches", async () => {
    const result = await verifyPassword(TEST_PASSWORD, LEGACY_HASH);
    expect(result.valid).toBe(true);
    expect(result.newHash).toBeDefined();
    expect(result.errorCode).toBeUndefined();
  });

  it("returns valid:false (no throw, no errorCode) when password does not match", async () => {
    const result = await verifyPassword("wrong_password", LEGACY_HASH);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBeUndefined();
  });
});

describe("verifyPassword — legacy SHA-256 path (LEGACY_HASH_SALT absent)", () => {
  beforeEach(() => {
    delete process.env["LEGACY_HASH_SALT"];
  });

  it("returns valid:false with errorCode LEGACY_SALT_MISSING — does not throw", async () => {
    // This is the regression guard for R11: a missing env var must never
    // produce an unhandled 500. The caller receives a typed result and
    // returns a safe 401 to the client.
    const result = await verifyPassword(TEST_PASSWORD, LEGACY_HASH);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("LEGACY_SALT_MISSING");
    expect(result.newHash).toBeUndefined();
  });
});
