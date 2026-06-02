// Sentry instrumentation — must be the first import in index.ts.
// In ESM, imports are hoisted and resolved before module body code runs.
// Placing Sentry init in a dedicated file imported first guarantees it
// executes before any other module (including app.ts) loads.
//
// DSN is read from SENTRY_DSN env var — graceful no-op if not set.
// Never hardcode the DSN in source — store it in Replit Secrets.

import * as Sentry from "@sentry/node";

if (process.env["SENTRY_DSN"]) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    release: process.env["APP_VERSION"],
    environment: process.env["NODE_ENV"] ?? "development",
    sendDefaultPii: false,  // Do not send PII — GDPR / Colombian data law compliance
    tracesSampleRate: 0,    // No performance tracing at Phase I — cost control
  });

  // Expose on globalThis so the existing pipeline shims activate automatically.
  // onboard-pipeline.ts, scoring-service.ts, and supplier-graduation-service.ts
  // already call (globalThis as any).Sentry?.captureException?.() — no changes needed there.
  (globalThis as any).Sentry = Sentry;
}
