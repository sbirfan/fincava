import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { objectStorageClient } from "../lib/objectStorage";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);

const BACKUP_PREFIX = "fincava_";
const RETENTION_COUNT = 7;
const WARN_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function runBackup(): Promise<{ filename: string; fileSizeBytes: number }> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID missing");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${BACKUP_PREFIX}${timestamp}.dump`;
  const filePath = `/tmp/${filename}`;

  // Step 1 — pg_dump to /tmp (execFile avoids shell interpolation of DATABASE_URL)
  await execFileAsync("pg_dump", ["-Fc", dbUrl, "-f", filePath]);

  // Step 2 — Read into buffer; warn if unusually large
  const fileBuffer = fs.readFileSync(filePath);
  if (fileBuffer.length > WARN_SIZE_BYTES) {
    logger.warn(
      { fileSizeBytes: fileBuffer.length, filename },
      "Large backup file (>50MB) — consider switching to streaming upload"
    );
  }

  // Step 3 — Upload to Replit Object Storage (GCS via sidecar)
  const bucket = objectStorageClient.bucket(bucketId);
  await bucket.file(filename).save(fileBuffer);

  // Step 4 — Remove temp file
  fs.unlinkSync(filePath);

  logger.info({ filename, fileSizeBytes: fileBuffer.length }, "Backup uploaded to object storage");

  // Step 5 — Retention: keep last 7 backups, delete older
  await enforceRetention(bucket);

  return { filename, fileSizeBytes: fileBuffer.length };
}

async function enforceRetention(
  bucket: ReturnType<typeof objectStorageClient.bucket>
): Promise<void> {
  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX });

  const sorted = files
    .map((f) => f.name)
    .filter((name) => name.endsWith(".dump"))
    .sort((a, b) => b.localeCompare(a)); // newest first — ISO timestamps sort correctly

  const toDelete = sorted.slice(RETENTION_COUNT);

  for (const name of toDelete) {
    await bucket.file(name).delete();
    logger.info({ filename: name }, "Deleted old backup (retention policy)");
  }
}
