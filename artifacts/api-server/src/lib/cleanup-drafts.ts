/**
 * Draft cleanup and WhatsApp expiry-reminder scheduler.
 *
 * Environment variables:
 *  DRAFT_EXPIRY_DAYS                  – Days until a draft is considered stale (default: 30)
 *  DRAFT_REMINDER_DAYS_BEFORE_EXPIRY  – How many days before expiry to send the reminder (default: 3)
 *  DRAFT_REMINDER_URL                 – URL included in the reminder message (default: https://fincava.co/onboarding)
 *  TWILIO_ACCOUNT_SID                 – Twilio account SID (required to send reminders)
 *  TWILIO_AUTH_TOKEN                  – Twilio auth token (required to send reminders)
 *  TWILIO_WHATSAPP_FROM               – WhatsApp-enabled sender number in raw format, e.g. +14155238886
 *                                       (required to send reminders; the "whatsapp:" prefix is added automatically)
 *
 * If the Twilio variables are absent the job will log a warning and skip sending.
 */

import twilio from "twilio";
import { pool } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_EXPIRY_DAYS = 30;
const DEFAULT_REMINDER_DAYS_BEFORE_EXPIRY = 3;
const DEFAULT_REMINDER_URL = "https://fincava.co/onboarding";

export function getExpiryDays(): number {
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

export function getReminderDaysBeforeExpiry(): number {
  const raw = process.env["DRAFT_REMINDER_DAYS_BEFORE_EXPIRY"];
  if (!raw) return DEFAULT_REMINDER_DAYS_BEFORE_EXPIRY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      { DRAFT_REMINDER_DAYS_BEFORE_EXPIRY: raw },
      "Invalid DRAFT_REMINDER_DAYS_BEFORE_EXPIRY value — falling back to default",
    );
    return DEFAULT_REMINDER_DAYS_BEFORE_EXPIRY;
  }
  return parsed;
}

function getReminderUrl(): string {
  return process.env["DRAFT_REMINDER_URL"] ?? DEFAULT_REMINDER_URL;
}

export function computeExpiryCutoff(now: Date, expiryDays: number): Date {
  return new Date(now.getTime() - expiryDays * 24 * 60 * 60 * 1000);
}

export function computeReminderWindow(
  now: Date,
  expiryDays: number,
  reminderDaysBefore: number,
): { reminderCutoff: Date; expiryCutoff: Date } | null {
  if (reminderDaysBefore >= expiryDays) return null;
  const reminderThresholdDays = expiryDays - reminderDaysBefore;
  return {
    reminderCutoff: new Date(now.getTime() - reminderThresholdDays * 24 * 60 * 60 * 1000),
    expiryCutoff: computeExpiryCutoff(now, expiryDays),
  };
}

export function isEligibleForReminder(
  updatedAt: Date,
  reminderCutoff: Date,
  expiryCutoff: Date,
): boolean {
  return updatedAt <= reminderCutoff && updatedAt > expiryCutoff;
}

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  if (!accountSid || !authToken) {
    return null;
  }
  return twilio(accountSid, authToken);
}

function getTwilioWhatsAppFrom(): string | null {
  return process.env["TWILIO_WHATSAPP_FROM"] ?? null;
}

async function sendWhatsAppMessage(
  client: ReturnType<typeof twilio>,
  fromNumber: string,
  toNumber: string,
  body: string,
): Promise<string> {
  const message = await client.messages.create({
    from: `whatsapp:${fromNumber}`,
    to: `whatsapp:${toNumber}`,
    body,
  });
  return message.sid;
}

export async function cleanupStaleDrafts(): Promise<void> {
  const expiryDays = getExpiryDays();
  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      "DELETE FROM onboarding_drafts WHERE updated_at < $1",
      [cutoff],
    );
    const count = result.rowCount ?? 0;

    await client.query(
      "INSERT INTO draft_cleanup_log (swept_at, deleted_count) VALUES (NOW(), $1)",
      [count],
    );

    await client.query("COMMIT");

    if (count > 0) {
      logger.info(
        { count, expiryDays, cutoff },
        "Pruned stale onboarding drafts",
      );
    } else {
      logger.debug({ expiryDays, cutoff }, "No stale onboarding drafts to prune");
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error({ err }, "Failed to prune stale onboarding drafts");
  } finally {
    client.release();
  }
}

export async function sendExpiryReminders(): Promise<void> {
  try {
    const expiryDays = getExpiryDays();
    const reminderDaysBefore = getReminderDaysBeforeExpiry();

    if (reminderDaysBefore >= expiryDays) {
      logger.warn(
        { reminderDaysBefore, expiryDays },
        "DRAFT_REMINDER_DAYS_BEFORE_EXPIRY must be less than DRAFT_EXPIRY_DAYS — skipping reminder job",
      );
      return;
    }

    const reminderThresholdDays = expiryDays - reminderDaysBefore;
    const reminderCutoff = new Date(Date.now() - reminderThresholdDays * 24 * 60 * 60 * 1000);
    const expiryCutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);
    const reminderUrl = getReminderUrl();

    const twilioClient = getTwilioClient();
    const fromNumber = getTwilioWhatsAppFrom();

    if (!twilioClient || !fromNumber) {
      logger.warn(
        "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM not configured — " +
        "draft expiry reminder job will not send WhatsApp messages",
      );
      return;
    }

    let candidates: Array<{ id: string; whatsapp_number: string; updated_at: Date }> = [];
    const scan = await pool.connect();
    try {
      const result = await scan.query<{ id: string; whatsapp_number: string; updated_at: Date }>(
        `SELECT id, whatsapp_number, updated_at
           FROM onboarding_drafts
          WHERE updated_at <= $1
            AND updated_at > $2
            AND reminder_sent_at IS NULL
            AND whatsapp_number ~ '^\\+57[0-9]{10}$'`,
        [reminderCutoff, expiryCutoff],
      );
      candidates = result.rows;
    } finally {
      scan.release();
    }

    if (candidates.length === 0) {
      logger.debug(
        { reminderThresholdDays, expiryDays },
        "No expiry reminders to send today",
      );
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const draft of candidates) {
      let rowClient;
      try {
        rowClient = await pool.connect();
      } catch (err) {
        failedCount += 1;
        logger.error(
          { err, whatsappNumber: draft.whatsapp_number },
          "Could not acquire DB connection for reminder row — skipping",
        );
        continue;
      }

      try {
        await rowClient.query("BEGIN");

        const locked = await rowClient.query<{ id: string }>(
          `SELECT id FROM onboarding_drafts
            WHERE id = $1
              AND reminder_sent_at IS NULL
              AND updated_at <= $2
              AND updated_at > $3
            FOR UPDATE NOWAIT`,
          [draft.id, reminderCutoff, expiryCutoff],
        );

        if (locked.rows.length === 0) {
          await rowClient.query("ROLLBACK");
          skippedCount += 1;
          continue;
        }

        const msOld = Date.now() - draft.updated_at.getTime();
        const daysLeft = Math.ceil(
          (expiryDays * 24 * 60 * 60 * 1000 - msOld) / (24 * 60 * 60 * 1000),
        );

        const body =
          `Hola! Su borrador de registro en Fincava vence en ${daysLeft} día${daysLeft === 1 ? "" : "s"}. ` +
          `Complete su registro aquí para no perder su progreso: ${reminderUrl}`;

        const sid = await sendWhatsAppMessage(twilioClient, fromNumber, draft.whatsapp_number, body);

        await rowClient.query(
          "UPDATE onboarding_drafts SET reminder_sent_at = NOW() WHERE id = $1",
          [draft.id],
        );

        await rowClient.query("COMMIT");

        sentCount += 1;
        logger.info(
          { whatsappNumber: draft.whatsapp_number, daysLeft, messageSid: sid },
          "Draft expiry reminder sent via WhatsApp",
        );
      } catch (err) {
        await rowClient.query("ROLLBACK").catch(() => {});
        const pgCode = (err as Record<string, unknown>)?.["code"];
        if (pgCode === "55P03") {
          skippedCount += 1;
          logger.debug(
            { whatsappNumber: draft.whatsapp_number },
            "Draft reminder row locked by concurrent worker — skipping",
          );
        } else {
          failedCount += 1;
          logger.error(
            { err, whatsappNumber: draft.whatsapp_number },
            "Failed to send draft expiry reminder — will retry on next run",
          );
        }
      } finally {
        rowClient.release();
      }
    }

    logger.info(
      { sentCount, failedCount, skippedCount, total: candidates.length },
      "Draft expiry reminder run complete",
    );
  } catch (err) {
    logger.error({ err }, "Unexpected error in draft expiry reminder job");
  }
}

const EVENT_LOG_RETENTION_DAYS = 90;
const CLEANUP_LOG_RETENTION_DAYS = 365;

async function purgeOldEventLogs(): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM registration_events WHERE created_at < NOW() - INTERVAL '${EVENT_LOG_RETENTION_DAYS} days'`,
    );
    const count = result.rowCount ?? 0;
    if (count > 0) {
      logger.info({ count, retentionDays: EVENT_LOG_RETENTION_DAYS }, "Purged old registration events");
    }
  } catch (err) {
    logger.error({ err }, "Failed to purge old registration events");
  }
}

async function purgeOldCleanupLogs(): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM draft_cleanup_log WHERE swept_at < NOW() - INTERVAL '${CLEANUP_LOG_RETENTION_DAYS} days'`,
    );
    const count = result.rowCount ?? 0;
    if (count > 0) {
      logger.info({ count, retentionDays: CLEANUP_LOG_RETENTION_DAYS }, "Purged old draft cleanup logs");
    }
  } catch (err) {
    logger.error({ err }, "Failed to purge old draft cleanup logs");
  }
}

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function scheduleDraftCleanup(): void {
  void cleanupStaleDrafts().catch((err) => {
    logger.error({ err }, "Unhandled error in initial cleanupStaleDrafts");
  });
  void sendExpiryReminders().catch((err) => {
    logger.error({ err }, "Unhandled error in initial sendExpiryReminders");
  });
  void purgeOldEventLogs().catch((err) => {
    logger.error({ err }, "Unhandled error in initial purgeOldEventLogs");
  });
  void purgeOldCleanupLogs().catch((err) => {
    logger.error({ err }, "Unhandled error in initial purgeOldCleanupLogs");
  });

  const handle = setInterval(() => {
    void cleanupStaleDrafts().catch((err) => {
      logger.error({ err }, "Unhandled error in scheduled cleanupStaleDrafts");
    });
    void sendExpiryReminders().catch((err) => {
      logger.error({ err }, "Unhandled error in scheduled sendExpiryReminders");
    });
    void purgeOldEventLogs().catch((err) => {
      logger.error({ err }, "Unhandled error in scheduled purgeOldEventLogs");
    });
    void purgeOldCleanupLogs().catch((err) => {
      logger.error({ err }, "Unhandled error in scheduled purgeOldCleanupLogs");
    });
  }, CLEANUP_INTERVAL_MS);
  handle.unref();

  logger.info(
    {
      intervalHours: 24,
      expiryDays: getExpiryDays(),
      reminderDaysBefore: getReminderDaysBeforeExpiry(),
    },
    "Draft cleanup and reminder job scheduled",
  );
}
