import pg from "pg";

const { Client } = pg;

async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set before running db init");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('[db:init] uuid-ossp extension ready');
  } finally {
    await client.end();
  }
}

initDb().catch((err) => {
  console.error('[db:init] Failed:', err.message);
  process.exit(1);
});
