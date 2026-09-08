import { digest } from "../utils/crypto.mjs";
import { readCookie } from "../utils/cookies.mjs";
export const loadSession = (sessionModel) => async (req, res, next) => {
  const token = readCookie(req, "studio_session");
  if (token && /^[a-f0-9]{64}$/.test(token))
    req.user = await sessionModel.findSession(digest(token));
  next();
};
export function requireUser(req, res, next) {
  if (!req.user)
    return res
      .status(401)
      .json({ error: "Connectez-vous pour accéder à vos stickers." });
  next();
}
