import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const migrationsFolder = path.join(__dirname, "../migrations");

console.log("[migrate] Running migrations from:", migrationsFolder);

migrate(db, { migrationsFolder })
  .then(() => {
    console.log("[migrate] Migrations complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[migrate] Migration failed:", err);
    process.exit(1);
  });
