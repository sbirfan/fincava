import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust Replit's reverse proxy so req.ip and rate-limiting use the real client IP
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
// In production CORS_ORIGIN must be set explicitly — never reflect arbitrary origins.
// In development (no env var), origins are allowed for convenience but credentials
// are still gated by the JWT in the cookie.
const corsOriginEnv = process.env.CORS_ORIGIN;
if (!corsOriginEnv && process.env.NODE_ENV === "production") {
  throw new Error(
    "CORS_ORIGIN env variable is required in production. Server will not start without it.",
  );
}
const allowedOrigins: string[] = corsOriginEnv
  ? corsOriginEnv.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = server-to-server or curl; allow through.
      if (!origin) { callback(null, true); return; }
      // Dev mode with no CORS_ORIGIN configured: allow all origins.
      if (allowedOrigins.length === 0) { callback(null, true); return; }
      if (allowedOrigins.includes(origin)) { callback(null, true); return; }
      logger.warn({ origin }, "CORS request rejected");
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

// ── CSRF protection ───────────────────────────────────────────────────────────
// For state-changing requests: if an Origin header is present (i.e. a browser
// cross-site request) it must be in the allowedOrigins list. Server-to-server
// callers (no Origin header) are not affected. Same-site requests are not affected.
// SameSite=None is kept for Replit proxy compatibility (see auth.ts cookie setup).
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!UNSAFE_METHODS.has(req.method)) { next(); return; }
  const origin = req.headers.origin;
  if (!origin) { next(); return; }
  if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "CSRF check failed: origin not allowed" });
    return;
  }
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate limiters ───────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

const onboardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registrations from this IP, please try again later." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/suppliers/onboard", onboardLimiter);

app.use("/api", router);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.expose ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});

export default app;
