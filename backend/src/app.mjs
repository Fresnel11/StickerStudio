import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { digest, hashPassword, verifyPassword, sessions } from "./auth.mjs";
import { createStore } from "./store.mjs";
import { mountGoogle } from "./google.mjs";

const error = (status, message) =>
  Object.assign(new Error(message), { status });
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
export async function createApp({
  db,
  secure = false,
  webDist,
  authLimit = 20,
  google,
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
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
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (req.get("X-Sticker-Studio") !== "1" ||
        req.get("Sec-Fetch-Site") === "cross-site")
    )
      return res.status(403).json({ error: "Requête non autorisée." });
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Trop de requêtes. Réessayez dans une minute." },
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  const store = createStore(db);
  const session = sessions(store, secure);
  app.use("/api", session.middleware);
  const dummyHash = await hashPassword(randomUUID());
  const authLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: authLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
  });
  const requireUser = (req, res, next) =>
    req.user
      ? next()
      : res
          .status(401)
          .json({ error: "Connectez-vous pour accéder à vos stickers." });
  mountGoogle(app, { db, session, secure, limiter: authLimiter, ...google });
  const credentials = (body) => {
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body?.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw error(400, "Indiquez une adresse e-mail valide.");
    if (
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    )
      throw error(
        400,
        "Le mot de passe doit contenir entre 10 et 128 caractères.",
      );
    return { email, password };
  };
  app.get("/api/health", async (req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  });
  app.get("/api/auth/me", (req, res) =>
    res.json({ user: req.user ? publicUser(req.user) : null }),
  );
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { email, password } = credentials(req.body);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2 || name.length > 60)
      throw error(400, "Le prénom doit contenir entre 2 et 60 caractères.");
    const hash = await hashPassword(password);
    const user = { id: randomUUID(), email, name };
    try {
      await store.createUser(user, hash);
    } catch (e) {
      if (e.code === "23505")
        throw error(
          409,
          "Impossible de créer ce compte. Essayez de vous connecter avec cette adresse.",
        );
      throw e;
    }
    await session.create(req, res, user.id);
    res.status(201).json({ user });
  });
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = credentials(req.body);
    const user = await store.findUser(email);
    const valid = await verifyPassword(
      password,
      user?.password_hash || dummyHash,
    );
    if (!user || !valid)
      throw error(401, "Adresse e-mail ou mot de passe incorrect.");
    await session.create(req, res, user.id);
    res.json({ user: publicUser(user) });
  });
  app.post("/api/auth/logout", async (req, res) => {
    await session.destroy(req, res);
    res.status(204).end();
  });
  app.get("/api/library", requireUser, async (req, res) => {
    const [name, stickers] = await Promise.all([
      store.packName(req.user.id),
      store.listStickers(req.user.id),
    ]);
    res.json({ name, stickers });
  });
  app.patch("/api/library", requireUser, async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 40)
      throw error(400, "Donnez au pack un nom de 1 à 40 caractères.");
    await store.renamePack(req.user.id, name);
    res.json({ name });
  });
  async function validateSticker(data) {
    if (
      typeof data !== "string" ||
      data.length > 136560 ||
      !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
    )
      throw error(400, "Envoyez un sticker WebP de moins de 100 Ko.");
    const buffer = Buffer.from(data.split(",")[1], "base64");
    if (buffer.length > 102400) throw error(400, "Le sticker dépasse 100 Ko.");
    try {
      const metadata = await sharp(buffer, {
        limitInputPixels: 512 * 512,
      }).metadata();
      if (
        metadata.format !== "webp" ||
        metadata.width !== 512 ||
        metadata.height !== 512 ||
        (metadata.pages || 1) > 1
      )
        throw new Error();
      await sharp(buffer).raw().toBuffer();
    } catch {
      throw error(
        400,
        "Le sticker doit être une image WebP statique valide de 512 × 512 pixels.",
      );
    }
    return { data, digest: digest(buffer) };
  }
  app.post("/api/stickers", requireUser, async (req, res) => {
    const item = await validateSticker(req.body?.data);
    const [sticker] = await store.insertStickers(req.user.id, [item]);
    res.status(201).json({ sticker });
  });
  app.post("/api/stickers/import", requireUser, async (req, res) => {
    if (
      !Array.isArray(req.body?.stickers) ||
      !req.body.stickers.length ||
      req.body.stickers.length > 30
    )
      throw error(400, "Sélectionnez entre 1 et 30 stickers.");
    const items = [];
    for (const item of req.body.stickers)
      items.push(await validateSticker(item?.data));
    await store.insertStickers(req.user.id, items);
    res.status(201).json({ stickers: await store.listStickers(req.user.id) });
  });
  app.delete("/api/stickers/:id", requireUser, async (req, res) => {
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        req.params.id,
      )
    )
      throw error(404, "Sticker introuvable.");
    const deleted = await store.deleteSticker(req.user.id, req.params.id);
    if (!deleted) throw error(404, "Sticker introuvable.");
    res.status(204).end();
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Cette ressource n’existe pas." }),
  );
  if (webDist && existsSync(join(webDist, "index.html"))) {
    app.use(express.static(webDist));
    app.get("/{*path}", (req, res) =>
      res.sendFile(join(webDist, "index.html")),
    );
  }
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error("API error:", err.message);
    res.status(status).json({
      error:
        status === 413
          ? "Fichier trop volumineux."
          : status >= 500
            ? "Le serveur ne peut pas traiter la demande. Réessayez."
            : err.message,
    });
  });
  return app;
}
