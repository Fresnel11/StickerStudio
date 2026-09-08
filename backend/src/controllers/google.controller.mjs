import { randomBytes, createHash } from "node:crypto";
import { digest } from "../utils/crypto.mjs";
import { googleConfig } from "../config/google.mjs";
import { googleProvider } from "../services/google.service.mjs";
export function createGoogleController({
  oauthModel,
  session,
  secure,
  config = googleConfig(),
  provider = googleProvider(config),
}) {
  const cookieName = "studio_google";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth/google",
  };
  const redirect = (res, code) =>
    res.redirect(303, `${config.origin}/connexion?google=${code}`);
  const providers = (req, res) =>
    res.json({ google: !!provider, googleLinked: !!req.user?.google_subject });
  const start = async (req, res) => {
    if (!provider) return redirect(res, "unavailable");
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
      linkUserId: link ? req.user.id : null,
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
    if (req.query.error) return redirect(res, "cancelled");
    if (
      typeof req.query.code !== "string" ||
      !req.query.code ||
      req.query.code.length > 4096
    )
      return redirect(res, "failed");
    if (pending.link_user_id && req.user?.id !== pending.link_user_id)
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
      await session.create(req, res, user.id);
      res.redirect(303, `${config.origin}/mes-stickers`);
    } catch (error) {
      const allowed = ["existing_account", "already_linked", "link_mismatch"];
      redirect(
        res,
        allowed.includes(error.message)
          ? error.message
          : error.code === "23505"
            ? "existing_account"
            : "failed",
      );
    }
  };
  return { providers, start, callback };
}
