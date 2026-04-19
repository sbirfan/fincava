import pg from "pg";

const { Client } = pg;

const EXPECTED_TABLES = [
  "users",
  "companies",
  "products",
  "orders",
  "inquiries",
  "reviews",
  "messages",
  "rfqs",
  "shipments",
  "analytics",
  "financing",
  "suppliers",
  "farms",
  "economics",
  "compliance_docs",
  "ai_outputs",
  "interactions",
  "onboarding_drafts",
  "officer_config",
  "registration_events",
  "draft_cleanup_log",
];

const EXPECTED_COLUMNS: Record<string, string[]> = {
  suppliers: ["id", "whatsapp_number", "nombre_completo", "municipio", "created_at"],
  onboarding_drafts: ["id", "whatsapp_number", "data", "restore_token", "reminder_sent_at", "updated_at"],
  officer_config: ["key", "value", "updated_at"],
  registration_events: ["id", "whatsapp_number", "event_type", "metadata", "created_at"],
  draft_cleanup_log: ["id", "swept_at", "deleted_count"],
};

async function checkDrift(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    console.error("[drift] DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  let hasError = false;

  try {
    const tablesResult = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const existingTables = new Set(tablesResult.rows.map((r) => r.table_name));

    for (const table of EXPECTED_TABLES) {
      if (!existingTables.has(table)) {
        console.error(`[drift] MISSING TABLE: ${table}`);
        hasError = true;
      }
    }

    for (const [table, cols] of Object.entries(EXPECTED_COLUMNS)) {
      if (!existingTables.has(table)) continue;
      const colResult = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      const existingCols = new Set(colResult.rows.map((r) => r.column_name));
      for (const col of cols) {
        if (!existingCols.has(col)) {
          console.error(`[drift] MISSING COLUMN: ${table}.${col}`);
          hasError = true;
        }
      }
    }

    if (!hasError) {
      console.log("[drift] OK — all expected tables and columns are present.");
    }
  } finally {
    await client.end();
  }

  if (hasError) {
    process.exit(1);
  }
}

checkDrift().catch((err) => {
  console.error("[drift] Unexpected error:", err);
  process.exit(1);
});
