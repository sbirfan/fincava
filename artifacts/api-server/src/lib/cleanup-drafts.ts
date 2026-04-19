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

export async function sendExpiryReminders(): Promise<void> {
  const expiryDays = getExpiryDays();
  const reminderWindowDays = 7;

  const warningCutoffStart = new Date(Date.now() - (expiryDays - reminderWindowDays) * 24 * 60 * 60 * 1000);
  const warningCutoffEnd = new Date(Date.now() - (expiryDays - reminderWindowDays - 1) * 24 * 60 * 60 * 1000);

  try {
    const result = await pool.query<{ whatsapp_number: string; updated_at: Date }>(
      `SELECT whatsapp_number, updated_at
         FROM onboarding_drafts
        WHERE updated_at >= $1
          AND updated_at < $2`,
      [warningCutoffStart, warningCutoffEnd],
    );

    if (result.rows.length === 0) {
      logger.debug("No expiry reminders to send today");
      return;
    }

    const supportNumber = process.env["WHATSAPP_SUPPORT_NUMBER"] ?? process.env["VITE_SUPPORT_WHATSAPP_NUMBER"];

    for (const draft of result.rows) {
      const daysLeft = Math.ceil(
        (expiryDays * 24 * 60 * 60 * 1000 - (Date.now() - draft.updated_at.getTime())) / (24 * 60 * 60 * 1000)
      );
      const message = encodeURIComponent(
        `Hola! Tu registro en Fincava está incompleto y vencerá en ${daysLeft} días. ` +
        `Por favor completa tu perfil para no perder tu progreso.`
      );
      const waLink = `https://wa.me/${draft.whatsapp_number.replace(/^\+/, "")}?text=${message}`;

      logger.info(
        {
          whatsappNumber: draft.whatsapp_number,
          daysLeft,
          waLink,
          supportNumber: supportNumber ?? "not configured",
        },
        "Draft expiry reminder — would send WhatsApp notification",
      );
    }

    logger.info({ count: result.rows.length }, "Expiry reminder check complete");
  } catch (err) {
    logger.error({ err }, "Failed to check expiry reminders");
  }
}

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function scheduleDraftCleanup(): void {
  cleanupStaleDrafts();
  sendExpiryReminders();

  const handle = setInterval(async () => {
    await cleanupStaleDrafts();
    await sendExpiryReminders();
  }, CLEANUP_INTERVAL_MS);
  handle.unref();

  logger.info(
    { intervalHours: 24, expiryDays: getExpiryDays() },
    "Draft cleanup scheduled",
  );
}
