/**
 * export-docs.ts
 * Converts ops/*.md → docs/*.docx
 * Source of truth is always the Markdown files in ops/.
 * .docx files in docs/ are GENERATED ONLY — do not edit them directly.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
// @ts-ignore — html-to-docx ships no type declarations
import HTMLtoDOCX from "html-to-docx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

const DOCS: { md: string; docx: string; title: string }[] = [
  {
    md:    resolve(root, "ops", "execution_map.md"),
    docx:  resolve(root, "docs", "Execution_Map_V1.docx"),
    title: "Execution Map V1",
  },
  {
    md:    resolve(root, "ops", "post_mvp_plan.md"),
    docx:  resolve(root, "docs", "Post_MVP_System_Plan.docx"),
    title: "Post-MVP System Plan",
  },
];

const DOCX_OPTIONS = {
  table: { row: { cantSplit: true } },
  footer: true,
  pageNumber: true,
};

async function exportDoc(entry: (typeof DOCS)[number]): Promise<void> {
  const md = readFileSync(entry.md, "utf8");
  const html = await marked(md);

  // Wrap in a minimal HTML document so html-to-docx picks up headings correctly
  const fullHtml = `<!DOCTYPE html><html><body>${html}</body></html>`;

  const buffer: Buffer = await HTMLtoDOCX(fullHtml, null, DOCX_OPTIONS);
  writeFileSync(entry.docx, buffer);
  console.log(`✅ ${entry.title} → ${entry.docx}`);
}

async function main(): Promise<void> {
  mkdirSync(resolve(root, "docs"), { recursive: true });

  for (const entry of DOCS) {
    await exportDoc(entry);
  }

  console.log("\nAll documents exported.");
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
