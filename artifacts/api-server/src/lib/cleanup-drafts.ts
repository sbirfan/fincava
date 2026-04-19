import { pool } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_EXPIRY_DAYS = 30;

function getExpiryDays(): number {
  const raw = process.env["DRAFT_EXPIRY_DAYS"];
  if (!raw) return DEFAULT_EXPIRY_DAYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      { DRAFT_EXPIRY_DAYS: raw },
      "Invalid DRAFT_EXPIRY_DAYS value — falling back to default",
    );
    return DEFAULT_EXPIRY_DAYS;
  }
  return parsed;
}

export async function cleanupStaleDrafts(): Promise<void> {
  const expiryDays = getExpiryDays();
  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  try {
    const result = await pool.query(
      "DELETE FROM onboarding_drafts WHERE updated_at < $1",
      [cutoff],
    );
    const count = result.rowCount ?? 0;

    if (count > 0) {
      logger.info(
        { count, expiryDays, cutoff },
        "Pruned stale onboarding drafts",
      );
    } else {
      logger.debug({ expiryDays, cutoff }, "No stale onboarding drafts to prune");
    }
  } catch (err) {
    logger.error({ err }, "Failed to prune stale onboarding drafts");
  }
}

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function scheduleDraftCleanup(): void {
  cleanupStaleDrafts();
  const handle = setInterval(cleanupStaleDrafts, CLEANUP_INTERVAL_MS);
  handle.unref();
  logger.info(
    { intervalHours: 24, expiryDays: getExpiryDays() },
    "Draft cleanup scheduled",
  );
}
