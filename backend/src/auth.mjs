import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  const candidate = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(candidate, Buffer.from(key, "hex"));
}
export function sessions(store, secure) {
  const cookie = { httpOnly: true, secure, sameSite: "lax", path: "/" };
  const tokenOf = (req) =>
    req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("studio_session="))
      ?.slice("studio_session=".length);
  return {
    async middleware(req, res, next) {
      const token = tokenOf(req);
      if (token && /^[a-f0-9]{64}$/.test(token)) {
        req.user = await store.findSession(digest(token));
      }
      next();
    },
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
