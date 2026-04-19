import { spawnSync } from "child_process";

export async function ensureSchema(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set before calling ensureSchema.",
    );
  }

  console.log("[db] Applying pending migrations…");

  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/db", "migrate"],
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
    throw new Error(`Database migration failed (${detail}).`);
  }

  console.log("[db] Migrations complete — schema is up to date.");
}
