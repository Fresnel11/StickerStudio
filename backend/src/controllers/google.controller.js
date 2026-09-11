import { randomBytes, createHash } from "node:crypto";
import { digest } from "../utils/crypto.js";
import { googleConfig } from "../config/google.js";
import { googleProvider } from "../services/google.service.js";
export function createGoogleController({
  oauthModel,
  mobileModel,
  session,
  secure,
  config = googleConfig(),
  provider = googleProvider(config),
}) {
  const cookieName = "studio_google";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/api/auth/google",
  };
  const redirect = (res, code) =>
    res.redirect(303, `${config.origin}/connexion?google=${code}`);
  const providers = (req, res) =>
    res.json({ google: !!provider, googleLinked: !!req.user?.google_subject });
  const mobileStart = async (req, res) => {
    if (!provider) return res.status(503).json({ error: "Connexion Google indisponible." });
    const link = req.body?.link === true;
    if (link && !req.user) return res.status(401).json({ error: "Connectez-vous avant d’associer Google." });
    const id = randomBytes(32).toString("hex");
    const secret = randomBytes(32).toString("hex");
    await mobileModel.create(id, digest(secret), link ? req.user.id : null);
    res.json({ id, secret });
  };
  const mobileFinish = async (req, res) => {
    const { id, secret } = req.body || {};
    if (typeof id !== "string" || typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9]{64}$/.test(secret))
      return res.status(400).json({ error: "Demande de connexion invalide." });
    const request = await mobileModel.finish(id, digest(secret), req.user?.id || null);
    if (!request) return res.status(410).json({ error: "Cette connexion a expiré. Réessayez." });
    if (!request.result) return res.json({ pending: true });
    if (request.result !== "success") return res.json({ errorCode: request.result });
    await session.create(req, res, request.user_id);
    res.json({ pending: false });
  };
  const mobileResult = async (res, id, userId, result) => {
    await mobileModel.complete(id, userId, result);
    res.type("html").send(`<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sticker Studio</title><body><main><h1>${result === "success" ? "Connexion réussie" : "Connexion interrompue"}</h1><p>Revenez dans Sticker Studio pour continuer.</p><a href="stickerstudio://auth/complete">Revenir dans l’application</a></main></body></html>`);
  };
  const start = async (req, res) => {
    if (!provider) return redirect(res, "unavailable");
    let mobile;
    if (req.query.mobile !== undefined) {
      if (typeof req.query.mobile !== "string" || !/^[a-f0-9]{64}$/.test(req.query.mobile)) return res.status(400).send("Demande invalide.");
      mobile = await mobileModel.start(req.query.mobile);
      if (!mobile) return res.status(410).send("Cette demande a expiré ou a déjà été ouverte. Revenez dans l’application.");
    }
    const link = req.query.link === "1";
    if (link && !req.user) return redirect(res, "signin_first");
    const state = randomBytes(32).toString("hex");
    const browser = randomBytes(32).toString("hex");
    const verifier = randomBytes(48).toString("base64url");
    const nonce = randomBytes(32).toString("hex");
    await oauthModel.saveRequest({
      stateHash: digest(state),
      browserHash: digest(browser),
      nonce,
      verifier,
      linkUserId: mobile ? mobile.link_user_id : link ? req.user.id : null,
      mobileId: mobile?.id,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    res.cookie(cookieName, browser, {
      ...cookieOptions,
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(
      provider.authorizationUrl({
        state,
        nonce,
        challenge: createHash("sha256").update(verifier).digest("base64url"),
      }),
    );
  };
  const callback = async (req, res) => {
    res.set("Referrer-Policy", "no-referrer");
    res.clearCookie(cookieName, cookieOptions);
    if (!provider) return redirect(res, "unavailable");
    const browser = req.headers.cookie
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (
      typeof req.query.state !== "string" ||
      !/^[a-f0-9]{64}$/.test(req.query.state) ||
      !browser ||
      !/^[a-f0-9]{64}$/.test(browser)
    )
      return redirect(res, "expired");
    const pending = await oauthModel.consumeRequest(
      digest(req.query.state),
      digest(browser),
    );
    if (!pending) return redirect(res, "expired");
    const fail = (code) => pending.mobile_id ? mobileResult(res, pending.mobile_id, null, code) : redirect(res, code);
    if (req.query.error) return fail("cancelled");
    if (
      typeof req.query.code !== "string" ||
      !req.query.code ||
      req.query.code.length > 4096
    )
      return fail("failed");
    if (!pending.mobile_id && pending.link_user_id && req.user?.id !== pending.link_user_id)
      return redirect(res, "signin_first");
    try {
      const identity = await provider.identity(
        req.query.code,
        pending.verifier,
        pending.nonce,
      );
      const user = await oauthModel.resolveIdentity(
        identity,
        pending.link_user_id,
      );
      if (pending.mobile_id) return mobileResult(res, pending.mobile_id, user.id, "success");
      await session.create(req, res, user.id);
      res.redirect(303, `${config.origin}/mes-stickers`);
    } catch (error) {
      const allowed = ["existing_account", "already_linked", "link_mismatch"];
      return fail(
        allowed.includes(error.message)
          ? error.message
          : error.code === "23505"
            ? "existing_account"
            : "failed",
      );
    }
  };
  return { providers, start, callback, mobileStart, mobileFinish };
}
