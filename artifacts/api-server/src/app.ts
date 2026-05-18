import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes";
import storageRouter from "./routes/storage";
import { registerAuthRoutes } from "./auth-routes";
import { registerZakRoutes } from "./routes/zak-routes";
import { registerGamesRoutes, seedGamesIfEmpty } from "./routes/games-routes";
import { registerPaymentsRoutes } from "./routes/payments-routes";
import { registerNewsletterRoutes } from "./routes/newsletter-routes";
import { registerSettingsRoutes } from "./routes/settings-routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(cors());
app.use(express.json({
  limit: "15mb",
  verify: (req: any, _res, buf) => { req.rawBody = buf.toString("utf8"); },
}));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api", storageRouter);

registerAuthRoutes(app);
registerZakRoutes(app);
registerGamesRoutes(app);
registerPaymentsRoutes(app);
registerNewsletterRoutes(app);
registerSettingsRoutes(app);

seedGamesIfEmpty().catch(() => {});

// ── Serve frontend in production (single-service Railway deploy) ──────────
if (process.env.NODE_ENV === "production" || process.env.SERVE_STATIC === "1") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../zakpubg/dist/public"),
    path.resolve(here, "../../../artifacts/zakpubg/dist/public"),
    path.resolve(process.cwd(), "artifacts/zakpubg/dist/public"),
  ];
  const staticDir = candidates.find((p) => fs.existsSync(path.join(p, "index.html")));
  if (staticDir) {
    logger.info({ staticDir }, "Serving frontend static files");
    app.use(express.static(staticDir, { maxAge: "1h", index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    logger.warn({ tried: candidates }, "Frontend dist not found — static serving disabled");
  }
}

export default app;
