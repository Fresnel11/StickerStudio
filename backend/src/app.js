import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  securityHeaders,
  corsMiddleware,
  protectApi,
  apiLimiter,
} from "./middlewares/security.middleware.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import { apiRoutes } from "./routes/index.js";

export async function createApp({
  db,
  secure = false,
  webDist,
  authLimit = 20,
  google,
}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(corsMiddleware);
  app.use(securityHeaders(secure));
  app.use("/api", protectApi, apiLimiter());
  app.use(express.json({ limit: "5mb" }));
  app.use("/api", await apiRoutes({ db, secure, authLimit, google }));
  app.use("/api", notFound);
  if (webDist && existsSync(join(webDist, "index.html"))) {
    app.use(express.static(webDist));
    app.get("/{*path}", (req, res) =>
      res.sendFile(join(webDist, "index.html")),
    );
  }
  app.use(errorHandler);
  return app;
}
