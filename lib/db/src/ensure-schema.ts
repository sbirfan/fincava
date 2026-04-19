import pg from "pg";
import { spawnSync } from "child_process";

const { Client } = pg;

const REQUIRED_TABLES = [
  "suppliers",
  "farms",
  "economics",
  "interactions",
  "onboarding_drafts",
];

async function getMissingTables(connectionString: string): Promise<string[]> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const result = await client.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])`,
      [REQUIRED_TABLES],
    );

    const existing = new Set(result.rows.map((r) => r.table_name));
    return REQUIRED_TABLES.filter((t) => !existing.has(t));
  } finally {
    await client.end();
  }
}

async function ensureAuxiliaryTables(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS officer_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registration_events (
        id           BIGSERIAL PRIMARY KEY,
        whatsapp_number TEXT NOT NULL,
        event_type   TEXT NOT NULL,
        metadata     JSONB,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS registration_events_whatsapp_idx
        ON registration_events (whatsapp_number)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS registration_events_type_idx
        ON registration_events (event_type)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS registration_events_created_at_idx
        ON registration_events (created_at)
    `);
  } finally {
    await client.end();
  }
}

export async function ensureSchema(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set before calling ensureSchema.",
    );
  }

  const missing = await getMissingTables(connectionString);

  if (missing.length === 0) {
    console.log("[db] All required tables are present.");
  } else {
    console.log(
      `[db] Missing tables detected: ${missing.join(", ")}. Running schema setup…`,
    );

    const result = spawnSync(
      "pnpm",
      ["--filter", "@workspace/db", "init-and-push"],
      {
        stdio: "inherit",
        env: { ...process.env },
        shell: false,
      },
    );

    if (result.status !== 0 || result.error) {
      const detail = result.error
        ? result.error.message
        : `exit code ${result.status ?? "unknown"}`;
      throw new Error(
        `Schema setup process failed (${detail}). Missing tables were: ${missing.join(", ")}`,
      );
    }

    const stillMissing = await getMissingTables(connectionString);

    if (stillMissing.length > 0) {
      throw new Error(
        `Schema setup ran but tables are still missing: ${stillMissing.join(", ")}. ` +
        `Check DATABASE_URL and Drizzle schema configuration.`,
      );
    }

    console.log("[db] Schema setup complete — all required tables are present.");
  }

  await ensureAuxiliaryTables(connectionString);
  console.log("[db] Auxiliary tables ready (officer_config, registration_events).");
}
