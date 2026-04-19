import app from "./app";
import { logger } from "./lib/logger";
import { ensureSchema } from "@workspace/db/ensure-schema";

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

async function start() {
  logger.info("Verifying database schema…");

  try {
    await ensureSchema();
  } catch (err) {
    logger.error(
      { err },
      "Database schema verification failed — server cannot start safely",
    );
    process.exit(1);
  }

  logger.info("Database schema verified.");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start();
