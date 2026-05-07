import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("unhandledrejection", (event) => {
  // TODO: pipe to error tracking service (Sentry etc.) in production
  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled promise rejection:", event.reason);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
