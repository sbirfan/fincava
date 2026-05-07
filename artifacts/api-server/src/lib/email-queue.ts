import { sendEmail } from "./email";
import { logger } from "./logger";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

interface QueueItem {
  payload: EmailPayload;
  failedAttempts: number;
  nextAttemptAt: number;
}

const queue: QueueItem[] = [];
let isProcessing = false;

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS: number[] = [30_000, 120_000, 600_000];

export function enqueueEmail(payload: EmailPayload): void {
  queue.push({ payload, failedAttempts: 0, nextAttemptAt: Date.now() });
  logger.debug({ to: payload.to, subject: payload.subject }, "Email enqueued for delivery");
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const now = Date.now();
    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i]!;
      if (item.nextAttemptAt > now) continue;

      const result = await sendEmail(item.payload);

      if (result.ok) {
        queue.splice(i, 1);
        logger.info(
          { to: item.payload.to, subject: item.payload.subject, failedAttempts: item.failedAttempts },
          "Queued email delivered successfully",
        );
        continue;
      }

      item.failedAttempts++;

      if (item.failedAttempts > MAX_RETRIES) {
        logger.error(
          {
            payload: item.payload,
            reason: result.reason,
            detail: result.detail,
            failedAttempts: item.failedAttempts,
          },
          "Email permanently failed after max retries — requires manual intervention",
        );
        queue.splice(i, 1);
      } else {
        const delay = RETRY_DELAYS_MS[item.failedAttempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
        item.nextAttemptAt = Date.now() + delay;
        logger.warn(
          {
            to: item.payload.to,
            subject: item.payload.subject,
            reason: result.reason,
            failedAttempts: item.failedAttempts,
            nextAttemptAt: new Date(item.nextAttemptAt).toISOString(),
          },
          "Email delivery failed, retry scheduled",
        );
      }
    }
  } finally {
    isProcessing = false;
  }
}

let _intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startEmailQueue(): void {
  if (_intervalHandle !== null) return;
  _intervalHandle = setInterval(() => {
    void processQueue();
  }, 10_000);
  logger.info(
    { maxRetries: MAX_RETRIES, retryDelaysMs: RETRY_DELAYS_MS, pollIntervalMs: 10_000 },
    "Email retry queue started",
  );
}
