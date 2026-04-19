/**
 * PIN lockout management with DB persistence.
 *
 * Lockout state is kept in-memory for fast access and persisted to the
 * officer_config table so it survives server restarts.
 *
 * DB keys use the prefix "_lockout:" so they are never confused with real
 * officer configuration entries and can be scanned/pruned in one query.
 *
 * Environment variables:
 *  SECURITY_ALERT_WEBHOOK_URL – if set, a POST is sent here whenever a lockout
 *                               is triggered (e.g. a Slack incoming-webhook URL).
 */

import { pool } from "@workspace/db";
import { logger } from "./logger";

const DB_KEY_PREFIX = "_lockout:";

export type LockoutState = { count: number; blockedUntil: number | null };
export type LockoutKind = "auth" | "change";

function dbKey(kind: LockoutKind, ip: string): string {
  return `${DB_KEY_PREFIX}${kind}:${ip}`;
}

const stores: Record<LockoutKind, Map<string, LockoutState>> = {
  auth: new Map(),
  change: new Map(),
};

export function getLockoutState(kind: LockoutKind, ip: string): LockoutState {
  const store = stores[kind];
  if (!store.has(ip)) store.set(ip, { count: 0, blockedUntil: null });
  return store.get(ip)!;
}

export function setLockoutState(kind: LockoutKind, ip: string, state: LockoutState): void {
  stores[kind].set(ip, state);
  void persistLockoutState(kind, ip, state).catch((err) => {
    logger.warn({ err, kind, ip }, "Failed to persist lockout state to DB");
  });
}

async function persistLockoutState(
  kind: LockoutKind,
  ip: string,
  state: LockoutState,
): Promise<void> {
  const key = dbKey(kind, ip);
  const value = JSON.stringify(state);
  await pool.query(
    `INSERT INTO officer_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value],
  );
}

export async function initPinLockouts(): Promise<void> {
  try {
    const result = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM officer_config WHERE key LIKE $1`,
      [`${DB_KEY_PREFIX}%`],
    );
    const now = Date.now();
    let loaded = 0;
    let skipped = 0;
    for (const row of result.rows) {
      let state: LockoutState;
      try {
        state = JSON.parse(row.value) as LockoutState;
      } catch {
        continue;
      }
      if (state.blockedUntil !== null && now >= state.blockedUntil) {
        skipped += 1;
        continue;
      }
      const withoutPrefix = row.key.slice(DB_KEY_PREFIX.length);
      const colonIdx = withoutPrefix.indexOf(":");
      if (colonIdx === -1) continue;
      const kind = withoutPrefix.slice(0, colonIdx) as LockoutKind;
      const ip = withoutPrefix.slice(colonIdx + 1);
      if (kind !== "auth" && kind !== "change") continue;
      stores[kind].set(ip, state);
      loaded += 1;
    }
    if (loaded > 0 || skipped > 0) {
      logger.info({ loaded, skipped }, "Restored PIN lockout state from DB");
    }
    await pruneExpiredLockouts();
  } catch (err) {
    logger.warn({ err }, "Could not restore PIN lockout state from DB — starting clean");
  }
}

export async function pruneExpiredLockouts(): Promise<void> {
  try {
    const result = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM officer_config WHERE key LIKE $1`,
      [`${DB_KEY_PREFIX}%`],
    );
    const now = Date.now();
    const expiredKeys: string[] = [];
    for (const row of result.rows) {
      let state: LockoutState;
      try {
        state = JSON.parse(row.value) as LockoutState;
      } catch {
        expiredKeys.push(row.key);
        continue;
      }
      if (state.blockedUntil === null || now >= state.blockedUntil) {
        if (state.count === 0) {
          expiredKeys.push(row.key);
        }
      }
    }
    if (expiredKeys.length > 0) {
      await pool.query(
        `DELETE FROM officer_config WHERE key = ANY($1::text[])`,
        [expiredKeys],
      );
    }
  } catch (err) {
    logger.warn({ err }, "Failed to prune expired lockout entries from DB");
  }
}

export async function sendLockoutAlert(kind: LockoutKind, ip: string): Promise<void> {
  const label = kind === "auth" ? "PIN login" : "PIN change";
  logger.warn(
    { kind, ip, event: "pin_lockout_triggered" },
    `Security alert: ${label} locked out after repeated failures — IP: ${ip}`,
  );

  const webhookUrl = process.env["SECURITY_ALERT_WEBHOOK_URL"];
  if (!webhookUrl) return;

  const payload = {
    event: "pin_lockout_triggered",
    kind,
    ip,
    label,
    timestamp: new Date().toISOString(),
    message: `Fincava officer ${label} locked out after 5 failed attempts from IP ${ip}`,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, webhookUrl }, "Security alert webhook returned non-2xx");
    }
  } catch (err) {
    logger.warn({ err, webhookUrl }, "Failed to deliver security alert to webhook");
  }
}
