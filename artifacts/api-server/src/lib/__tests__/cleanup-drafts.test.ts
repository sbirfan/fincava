import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@workspace/db", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("twilio", () => ({ default: vi.fn(() => ({})) }));
vi.mock("../logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  getExpiryDays,
  getReminderDaysBeforeExpiry,
  computeExpiryCutoff,
  computeReminderWindow,
  isEligibleForReminder,
} from "../cleanup-drafts";

const DAY = 24 * 60 * 60 * 1000;

describe("getExpiryDays()", () => {
  afterEach(() => {
    delete process.env["DRAFT_EXPIRY_DAYS"];
  });

  it("returns 30 when env var is not set", () => {
    delete process.env["DRAFT_EXPIRY_DAYS"];
    expect(getExpiryDays()).toBe(30);
  });

  it("returns the configured value when a valid positive number is set", () => {
    process.env["DRAFT_EXPIRY_DAYS"] = "14";
    expect(getExpiryDays()).toBe(14);
  });

  it("returns 30 (default) when env var is non-numeric", () => {
    process.env["DRAFT_EXPIRY_DAYS"] = "abc";
    expect(getExpiryDays()).toBe(30);
  });

  it("returns 30 (default) when env var is zero", () => {
    process.env["DRAFT_EXPIRY_DAYS"] = "0";
    expect(getExpiryDays()).toBe(30);
  });

  it("returns 30 (default) when env var is negative", () => {
    process.env["DRAFT_EXPIRY_DAYS"] = "-5";
    expect(getExpiryDays()).toBe(30);
  });

  it("accepts fractional day values", () => {
    process.env["DRAFT_EXPIRY_DAYS"] = "7.5";
    expect(getExpiryDays()).toBeCloseTo(7.5);
  });
});

describe("getReminderDaysBeforeExpiry()", () => {
  afterEach(() => {
    delete process.env["DRAFT_REMINDER_DAYS_BEFORE_EXPIRY"];
  });

  it("returns 3 when env var is not set", () => {
    delete process.env["DRAFT_REMINDER_DAYS_BEFORE_EXPIRY"];
    expect(getReminderDaysBeforeExpiry()).toBe(3);
  });

  it("returns the configured value", () => {
    process.env["DRAFT_REMINDER_DAYS_BEFORE_EXPIRY"] = "5";
    expect(getReminderDaysBeforeExpiry()).toBe(5);
  });

  it("returns 3 (default) when value is non-numeric", () => {
    process.env["DRAFT_REMINDER_DAYS_BEFORE_EXPIRY"] = "invalid";
    expect(getReminderDaysBeforeExpiry()).toBe(3);
  });

  it("returns 3 (default) when value is zero", () => {
    process.env["DRAFT_REMINDER_DAYS_BEFORE_EXPIRY"] = "0";
    expect(getReminderDaysBeforeExpiry()).toBe(3);
  });
});

describe("computeExpiryCutoff()", () => {
  it("returns a date exactly expiryDays before now", () => {
    const now = new Date("2025-01-31T12:00:00Z");
    const cutoff = computeExpiryCutoff(now, 30);
    expect(cutoff.getTime()).toBe(now.getTime() - 30 * DAY);
  });

  it("cutoff for 1 day is 24 hours ago", () => {
    const now = new Date("2025-01-02T00:00:00Z");
    const cutoff = computeExpiryCutoff(now, 1);
    expect(cutoff.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("cutoff for 7 days is a week ago", () => {
    const now = new Date("2025-01-08T00:00:00Z");
    const cutoff = computeExpiryCutoff(now, 7);
    expect(cutoff.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("does not mutate the now parameter", () => {
    const now = new Date("2025-01-31T12:00:00Z");
    const original = now.getTime();
    computeExpiryCutoff(now, 30);
    expect(now.getTime()).toBe(original);
  });
});

describe("computeReminderWindow()", () => {
  const now = new Date("2025-01-31T00:00:00Z");

  it("returns null when reminderDaysBefore equals expiryDays", () => {
    expect(computeReminderWindow(now, 30, 30)).toBeNull();
  });

  it("returns null when reminderDaysBefore exceeds expiryDays", () => {
    expect(computeReminderWindow(now, 10, 15)).toBeNull();
  });

  it("returns the correct expiryCutoff", () => {
    const result = computeReminderWindow(now, 30, 3);
    expect(result).not.toBeNull();
    expect(result!.expiryCutoff.getTime()).toBe(now.getTime() - 30 * DAY);
  });

  it("returns the correct reminderCutoff (expiryDays - reminderDaysBefore days ago)", () => {
    const result = computeReminderWindow(now, 30, 3);
    expect(result).not.toBeNull();
    expect(result!.reminderCutoff.getTime()).toBe(now.getTime() - 27 * DAY);
  });

  it("reminderCutoff is always more recent than expiryCutoff", () => {
    const result = computeReminderWindow(now, 30, 3)!;
    expect(result.reminderCutoff.getTime()).toBeGreaterThan(result.expiryCutoff.getTime());
  });

  it("handles a 1-day reminder window correctly", () => {
    const result = computeReminderWindow(now, 30, 1)!;
    expect(result.reminderCutoff.getTime()).toBe(now.getTime() - 29 * DAY);
  });
});

describe("isEligibleForReminder()", () => {
  const now = new Date("2025-01-31T00:00:00Z");
  const expiryDays = 30;
  const reminderDaysBefore = 3;
  const { reminderCutoff, expiryCutoff } = computeReminderWindow(now, expiryDays, reminderDaysBefore)!;

  it("returns true when draft is in the reminder window (28 days old)", () => {
    const updatedAt = new Date(now.getTime() - 28 * DAY);
    expect(isEligibleForReminder(updatedAt, reminderCutoff, expiryCutoff)).toBe(true);
  });

  it("returns true when draft is exactly at the reminder cutoff", () => {
    expect(isEligibleForReminder(reminderCutoff, reminderCutoff, expiryCutoff)).toBe(true);
  });

  it("returns false when draft is too recent (15 days old — before the reminder window)", () => {
    const updatedAt = new Date(now.getTime() - 15 * DAY);
    expect(isEligibleForReminder(updatedAt, reminderCutoff, expiryCutoff)).toBe(false);
  });

  it("returns false when draft is too old (already past expiry)", () => {
    const updatedAt = new Date(now.getTime() - 31 * DAY);
    expect(isEligibleForReminder(updatedAt, reminderCutoff, expiryCutoff)).toBe(false);
  });

  it("returns false when draft is exactly at expiryCutoff (would be deleted, not reminded)", () => {
    expect(isEligibleForReminder(expiryCutoff, reminderCutoff, expiryCutoff)).toBe(false);
  });

  it("returns true for draft at 27 days old (exactly at the window boundary)", () => {
    const updatedAt = new Date(now.getTime() - 27 * DAY);
    expect(isEligibleForReminder(updatedAt, reminderCutoff, expiryCutoff)).toBe(true);
  });

  it("returns false for draft at 26 days old (just outside the reminder window)", () => {
    const updatedAt = new Date(now.getTime() - 26 * DAY);
    expect(isEligibleForReminder(updatedAt, reminderCutoff, expiryCutoff)).toBe(false);
  });
});

describe("Draft expiry rule integration: reminder window vs expiry", () => {
  it("a draft that will be cleaned up is NOT also in the reminder window", () => {
    const now = new Date("2025-01-31T00:00:00Z");
    const result = computeReminderWindow(now, 30, 3)!;
    const expiredDraft = new Date(now.getTime() - 31 * DAY);
    expect(isEligibleForReminder(expiredDraft, result.reminderCutoff, result.expiryCutoff)).toBe(false);
  });

  it("a draft that receives a reminder is NOT expired yet", () => {
    const now = new Date("2025-01-31T00:00:00Z");
    const result = computeReminderWindow(now, 30, 3)!;
    const reminderDraft = new Date(now.getTime() - 28 * DAY);
    const expiryCutoff = computeExpiryCutoff(now, 30);
    expect(reminderDraft > expiryCutoff).toBe(true);
  });
});
