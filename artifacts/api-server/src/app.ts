import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const pg = err as { code?: string; message?: string };

  if (pg.code === "42P01") {
    const match = pg.message?.match(/relation "([^"]+)" does not exist/);
    const tableName = match ? match[1] : "unknown";
    logger.error(
      { table: tableName, code: pg.code },
      `Database table "${tableName}" is missing — run the latest migrations to fix this`,
    );
    res.status(503).json({
      error: "Service temporarily unavailable",
      detail: "A required database table is missing. Please contact support.",
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
