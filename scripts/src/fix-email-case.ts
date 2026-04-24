import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function fixEmailCase() {
  const result = await db.execute(
    sql`UPDATE users SET email = LOWER(email) WHERE email != LOWER(email) RETURNING id, email`
  );
  const rows = result.rows as { id: number; email: string }[];
  if (rows.length === 0) {
    console.log("No mixed-case emails found — nothing to fix.");
  } else {
    console.log(`Fixed ${rows.length} email(s):`);
    rows.forEach(r => console.log(`  id=${r.id} → ${r.email}`));
  }
}

fixEmailCase()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
