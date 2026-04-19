import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";

const { Client, Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const connectionString = process.env.DATABASE_URL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "../migrations");

async function ensureExtensions(): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log("[migrate] uuid-ossp extension ready.");
  } finally {
    await client.end();
  }
}

async function stampBaselineIfNeeded(): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const schemaExists = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'
      ) AS exists
    `);
    if (schemaExists.rows[0].exists) {
      const tableExists = await client.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
        ) AS exists
      `);
      if (tableExists.rows[0].exists) {
        const { rows } = await client.query<{ count: string }>(
          "SELECT COUNT(*) AS count FROM drizzle.__drizzle_migrations",
        );
        if (parseInt(rows[0].count, 10) > 0) {
          return;
        }
      }
    }

    const legacyCheck = await client.query<{ count: string }>(`
      SELECT COUNT(*) AS count
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY(ARRAY[
               'suppliers', 'farms', 'economics',
               'interactions', 'onboarding_drafts'
             ])
    `);
    const foundCount = parseInt(legacyCheck.rows[0].count, 10);
    if (foundCount < 5) {
      return;
    }

    console.log(
      "[migrate] Legacy push-managed database detected. Stamping 0000 baseline…",
    );

    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id         SERIAL PRIMARY KEY,
        hash       TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    const baselineTag = "0000_previous_fixer";
    const baselineWhen = 1776570560518;
    const sql = fs.readFileSync(
      path.join(migrationsFolder, `${baselineTag}.sql`),
      "utf8",
    );
    const hash = crypto.createHash("sha256").update(sql).digest("hex");
    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash, baselineWhen],
    );

    console.log("[migrate] Baseline 0000 stamped.");
  } finally {
    await client.end();
  }
}

async function ensureAuxiliaryTables(): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS officer_config (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registration_events (
        id               BIGSERIAL PRIMARY KEY,
        whatsapp_number  TEXT NOT NULL,
        event_type       TEXT NOT NULL,
        metadata         JSONB,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS draft_cleanup_log (
        id           BIGSERIAL PRIMARY KEY,
        swept_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS draft_cleanup_log_swept_at_idx
        ON draft_cleanup_log (swept_at)
    `);

    console.log("[migrate] Auxiliary tables ready (officer_config, registration_events, draft_cleanup_log).");
  } finally {
    await client.end();
  }
}

console.log("[migrate] Running migrations from:", migrationsFolder);

const pool = new Pool({ connectionString });
const db = drizzle(pool);

ensureExtensions()
  .then(() => stampBaselineIfNeeded())
  .then(() => migrate(db, { migrationsFolder }))
  .then(() => ensureAuxiliaryTables())
  .then(() => {
    console.log("[migrate] All done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[migrate] Failed:", err);
    process.exit(1);
  });
