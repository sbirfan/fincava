import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Sentry — initialise before rendering ──────────────────────────────────────
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: import.meta.env.VITE_APP_VERSION,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0, // No performance tracing at Phase I
    integrations: [],
  });
}

window.addEventListener("unhandledrejection", (event) => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason);
  } else if (import.meta.env.DEV) {
    console.error("Unhandled promise rejection:", event.reason);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
