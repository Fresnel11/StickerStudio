import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
export const securityHeaders = (secure) =>
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "upgrade-insecure-requests": secure ? [] : null,
      },
    },
    strictTransportSecurity: secure,
  });
export function protectApi(req, res, next) {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    (req.get("X-Sticker-Studio") !== "1" ||
      req.get("Sec-Fetch-Site") === "cross-site")
  )
    return res.status(403).json({ error: "Requête non autorisée." });
  next();
}
export const apiLimiter = () =>
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de requêtes. Réessayez dans une minute." },
  });
export const authLimiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  });
