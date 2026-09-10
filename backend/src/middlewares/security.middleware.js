import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const configured = process.env.APP_ORIGIN;
  if (configured && origin === configured) return true;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  if (process.env.ALLOWED_ORIGINS) {
    const list = process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    if (list.includes(origin)) return true;
  }
  if (
    origin === "http://127.0.0.1:5173" ||
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:3000" ||
    origin === "http://localhost:3000"
  ) {
    return true;
  }
  try {
    const url = new URL(origin);
    if (
      url.hostname === "sticker-studio-ruby.vercel.app" ||
      url.hostname.endsWith(".vercel.app")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function corsMiddleware(req, res, next) {
  const origin = req.get("Origin");
  if (origin && isAllowedOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    );
    res.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Sticker-Studio, Authorization, Cookie",
    );
    res.set("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
}

export const securityHeaders = (secure) =>
  helmet({
    contentSecurityPolicy: {
      directives: {
        "connect-src": ["'self'", "https://staticimgly.com"],
        "script-src": ["'self'", "blob:", "'wasm-unsafe-eval'"],
        "worker-src": ["'self'", "blob:"],
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
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.get("X-Sticker-Studio") !== "1") {
      return res.status(403).json({ error: "Requête non autorisée." });
    }
    const secFetchSite = req.get("Sec-Fetch-Site");
    const origin = req.get("Origin");
    if (secFetchSite === "cross-site") {
      if (!origin || !isAllowedOrigin(origin)) {
        return res.status(403).json({ error: "Origine non autorisée." });
      }
    }
  }
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
