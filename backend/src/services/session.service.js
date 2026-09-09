import { randomBytes } from "node:crypto";
import { digest } from "../utils/crypto.js";
export function createSessionService(store, secure) {
  const cookie = { httpOnly: true, secure, sameSite: "lax", path: "/" };
  const tokenOf = (req) =>
    req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("studio_session="))
      ?.slice("studio_session=".length);
  return {
    async create(req, res, userId) {
      const old = tokenOf(req);
      if (old) await store.deleteSession(digest(old));
      await store.purgeSessions();
      const token = randomBytes(32).toString("hex");
      const duration = 30 * 24 * 60 * 60 * 1000;
      await store.createSession(digest(token), userId, Date.now() + duration);
      res.cookie("studio_session", token, { ...cookie, maxAge: duration });
    },
    async destroy(req, res) {
      const token = tokenOf(req);
      if (token) await store.deleteSession(digest(token));
      res.clearCookie("studio_session", cookie);
    },
  };
}
