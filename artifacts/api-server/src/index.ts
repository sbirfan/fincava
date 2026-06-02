// instrument.ts must be the first import — initialises Sentry before all other modules.
import "./instrument.js";

import app from "./app";
import { logger } from "./lib/logger";
import { seedAdminAccounts } from "./lib/seed";
import { startEmailQueue } from "./lib/email-queue";
import {
  SUPPLIER_ONBOARD_EVENT,
  registerOnce,
  logListenerCounts,
  type OnboardPayload,
} from "./lib/pipeline-emitter";
import { runOnboardPipeline } from "./services/onboard-pipeline";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Pipeline event handlers (registered once at startup) ──────────────────────
registerOnce(SUPPLIER_ONBOARD_EVENT, (payload: OnboardPayload) => {
  void runOnboardPipeline(payload);
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startEmailQueue();
  logListenerCounts();
  seedAdminAccounts().catch((e) => logger.error({ err: e }, "Admin seed failed"));

  if (!process.env.FINCAVA_COMPANY_ID) {
    logger.warn({ event: "CONFIG_MISSING", key: "FINCAVA_COMPANY_ID" },
      "FINCAVA_COMPANY_ID not set — falling back to name lookup");
  } else {
    logger.info({ event: "CONFIG_LOADED", key: "FINCAVA_COMPANY_ID",
      value: process.env.FINCAVA_COMPANY_ID }, "FINCAVA_COMPANY_ID loaded");
  }

  logger.info({ event: "EVENT_VOLUME_COUNTERS_RESET", approximate: true },
    "Volume counters initialized (in-memory, reset on restart)");
});
