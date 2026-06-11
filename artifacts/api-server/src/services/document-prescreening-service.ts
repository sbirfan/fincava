// document-prescreening-service.ts — Layer A
// Fires after POST /storage/uploads/confirm via setImmediate (non-blocking).
// Fetches the uploaded document from GCS using the server service account
// (file.download()), base64-encodes the bytes, and calls Claude vision to
// produce a structured pre-screening result. Writes to:
//   - ai_outputs (callType = "DOC_PRESCREENING")
//   - compliance_documents_v2 (prescreeningResult, prescreenedAt)
//
// All failures are non-fatal: errors are logged and prescreeningResult is left null.
// Combined GCS + Claude timeout: 60 seconds.

import { db, aiOutputsTable, complianceDocumentsV2Table } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage";
import { getAnthropicClient, PRESCREENING_MODEL } from "../lib/anthropic";
import { PRESCREENING_PROMPT } from "../config/ai-prompts/prescreening-prompt";
import { logger } from "../lib/logger";

// ── Output schema (validated before DB write) ────────────────────────────────
interface PrescreeningResult {
  document_type_detected: string | null;
  expected_document_type: string | null;
  type_match: boolean | null;
  language_detected: "es" | "en" | "other" | null;
  image_quality: "good" | "poor" | "unreadable" | null;
  agency_detected: "DIAN" | "ICA" | "FNC" | "unknown" | null;
  agency_match: boolean | null;
  flags: string[];
  recommendation: "pass" | "needs_review" | "reject" | null;
  rationale: string | null;
  confidence: number | null;
}

const ALLOWED_FLAGS = new Set([
  "WRONG_DOCUMENT_TYPE",
  "LOW_IMAGE_QUALITY",
  "UNREADABLE",
  "LANGUAGE_MISMATCH",
  "WRONG_AGENCY",
  "POSSIBLE_EXPIRY",
  "HANDWRITTEN_CONTENT",
]);

const ALLOWED_RECOMMENDATIONS = new Set(["pass", "needs_review", "reject"]);
const ALLOWED_AGENCIES = new Set(["DIAN", "ICA", "FNC", "unknown"]);
const ALLOWED_QUALITIES = new Set(["good", "poor", "unreadable"]);
const ALLOWED_LANGUAGES = new Set(["es", "en", "other"]);

function validatePrescreeningResult(raw: unknown): PrescreeningResult {
  if (typeof raw !== "object" || raw === null) throw new Error("Claude returned non-object");
  const r = raw as Record<string, unknown>;

  return {
    document_type_detected: typeof r.document_type_detected === "string" ? r.document_type_detected : null,
    expected_document_type: typeof r.expected_document_type === "string" ? r.expected_document_type : null,
    type_match: typeof r.type_match === "boolean" ? r.type_match : null,
    language_detected: ALLOWED_LANGUAGES.has(r.language_detected as string)
      ? (r.language_detected as "es" | "en" | "other")
      : null,
    image_quality: ALLOWED_QUALITIES.has(r.image_quality as string)
      ? (r.image_quality as "good" | "poor" | "unreadable")
      : null,
    agency_detected: ALLOWED_AGENCIES.has(r.agency_detected as string)
      ? (r.agency_detected as "DIAN" | "ICA" | "FNC" | "unknown")
      : null,
    agency_match: typeof r.agency_match === "boolean" ? r.agency_match : null,
    flags: Array.isArray(r.flags)
      ? (r.flags as unknown[]).filter((f): f is string => typeof f === "string" && ALLOWED_FLAGS.has(f))
      : [],
    recommendation: ALLOWED_RECOMMENDATIONS.has(r.recommendation as string)
      ? (r.recommendation as "pass" | "needs_review" | "reject")
      : null,
    rationale: typeof r.rationale === "string" ? r.rationale.slice(0, 200) : null,
    confidence: typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : null,
  };
}

// ── GCS path → bucket/object parsing ─────────────────────────────────────────
function parseGcsPath(fileUrl: string): { bucketName: string; objectName: string } | null {
  try {
    // Accepts gs://bucket/path or https://storage.googleapis.com/bucket/path
    if (fileUrl.startsWith("gs://")) {
      const withoutScheme = fileUrl.slice(5);
      const slash = withoutScheme.indexOf("/");
      if (slash === -1) return null;
      return { bucketName: withoutScheme.slice(0, slash), objectName: withoutScheme.slice(slash + 1) };
    }
    if (fileUrl.startsWith("https://storage.googleapis.com/")) {
      const parts = fileUrl.slice("https://storage.googleapis.com/".length).split("/");
      if (parts.length < 2) return null;
      return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
    }
    // Replit /objects/ internal path — resolve via PRIVATE_OBJECT_DIR
    if (fileUrl.startsWith("/objects/")) {
      const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
      if (!privateDir) return null;
      const entityId = fileUrl.slice("/objects/".length);
      const fullPath = `${privateDir.replace(/\/$/, "")}/${entityId}`;
      const parts = fullPath.replace(/^\//, "").split("/");
      if (parts.length < 2) return null;
      return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function prescreenDocument(documentId: number): Promise<void> {
  const timeout = AbortSignal.timeout(60_000);

  try {
    // 1. Load the compliance document row
    const [doc] = await db
      .select()
      .from(complianceDocumentsV2Table)
      .where(eq(complianceDocumentsV2Table.id, documentId));

    if (!doc) {
      logger.warn({ documentId }, "prescreenDocument: document row not found — skipping");
      return;
    }

    // 2. Fetch latest REQUIREMENT_REGISTRY metadata for context (best-effort)
    //    We use the requirementCode + documentType from the row directly.
    const contextBlock = {
      supplierId: doc.supplierId,
      requirementCode: doc.requirementCode,
      documentType: doc.documentType,
      evidenceType: doc.evidenceType ?? null,
      uploadedBy: doc.uploadedBy,
    };

    // 3. Download image bytes from GCS via server service account
    const parsed = parseGcsPath(doc.fileUrl);
    if (!parsed) {
      logger.warn({ documentId, fileUrl: doc.fileUrl }, "prescreenDocument: cannot parse GCS path — skipping");
      return;
    }

    const bucket = objectStorageClient.bucket(parsed.bucketName);
    const file = bucket.file(parsed.objectName);

    const [imageBytes] = await Promise.race([
      file.download(),
      new Promise<never>((_, reject) =>
        timeout.addEventListener("abort", () => reject(new Error("prescreenDocument: GCS download timed out")), { once: true }),
      ),
    ]);

    const base64Image = imageBytes.toString("base64");

    // Determine media type from fileUrl extension (default to image/jpeg for PDFs treated as image)
    const lowerUrl = doc.fileUrl.toLowerCase();
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf" = "image/jpeg";
    if (lowerUrl.includes(".png")) mediaType = "image/png";
    else if (lowerUrl.includes(".webp")) mediaType = "image/webp";
    else if (lowerUrl.includes(".gif")) mediaType = "image/gif";
    else if (lowerUrl.includes(".pdf")) mediaType = "application/pdf";

    // 4. Call Claude vision
    const client = getAnthropicClient();
    const userContent = JSON.stringify(contextBlock);

    const claudeMediaType = mediaType === "application/pdf" ? "image/jpeg" : mediaType;

    const message = await Promise.race([
      client.messages.create({
        model: PRESCREENING_MODEL,
        max_tokens: 512,
        system: [{ type: "text", text: PRESCREENING_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: claudeMediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `Context: ${userContent}`,
              },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        timeout.addEventListener("abort", () => reject(new Error("prescreenDocument: Claude call timed out")), { once: true }),
      ),
    ]);

    const rawText = (message.content[0] as { type: string; text: string }).text ?? "";
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed2 = JSON.parse(jsonStr) as unknown;
    const result = validatePrescreeningResult(parsed2);

    // 5. Write ai_outputs row
    await db.insert(aiOutputsTable).values({
      supplierId: doc.supplierId,
      aiModel: PRESCREENING_MODEL,
      callType: "DOC_PRESCREENING",
      documentContent: JSON.stringify(result),
      gapAnalysis: JSON.stringify({ documentId }),
    });

    // 6. Write prescreeningResult back to the document row
    const now = new Date();
    await db
      .update(complianceDocumentsV2Table)
      .set({ prescreeningResult: result, prescreenedAt: now })
      .where(eq(complianceDocumentsV2Table.id, documentId));

    logger.info(
      {
        documentId,
        supplierId: doc.supplierId,
        recommendation: result.recommendation,
        flags: result.flags,
        confidence: result.confidence,
      },
      "prescreenDocument: completed (Layer A)",
    );
  } catch (err) {
    logger.warn({ documentId, err }, "prescreenDocument: non-fatal failure — prescreening skipped");
  }
}
