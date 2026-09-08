import { OAuth2Client } from "google-auth-library";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { digest } from "./auth.mjs";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
  const parsed = new URL(origin);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.origin !== origin ||
    parsed.username ||
    parsed.password
  )
    throw new Error(
      "APP_ORIGIN doit être une origine HTTP(S), sans chemin ni slash final.",
    );
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
    throw new Error("APP_ORIGIN doit utiliser HTTPS en production.");
  return {
    clientId,
    clientSecret,
    origin,
    redirectUri: `${origin}/api/auth/google/callback`,
  };
}

export function googleProvider(config, clientOverride) {
  if (!config.clientId || !config.clientSecret) return null;
  const client =
    clientOverride ||
    new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  return {
    authorizationUrl({ state, nonce, challenge }) {
      return client.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      });
    },
    async identity(code, verifier, nonce) {
      const { tokens } = await client.getToken({
        code,
        codeVerifier: verifier,
        redirect_uri: config.redirectUri,
      });
      if (!tokens.id_token) throw new Error("Jeton Google absent");
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.clientId,
      });
      const profile = ticket.getPayload();
      if (
        !profile ||
        profile.nonce !== nonce ||
        profile.email_verified !== true ||
        typeof profile.sub !== "string" ||
        !profile.sub ||
        profile.sub.length > 255 ||
        typeof profile.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
        profile.email.length > 254
      )
        throw new Error("Identité Google invalide");
      return {
        subject: profile.sub,
        email: profile.email.trim().toLowerCase(),
        name: (profile.given_name || profile.name || "Créateur").slice(0, 60),
      };
    },
  };
}

export function mountGoogle(
  app,
  {
    db,
    session,
    secure,
    limiter,
    config = googleConfig(),
    provider = googleProvider(config),
  },
) {
  const cookieName = "studio_google";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth/google",
  };
  const redirect = (res, code) =>
    res.redirect(303, `${config.origin}/connexion?google=${code}`);
  app.get("/api/auth/providers", (req, res) =>
    res.json({ google: !!provider, googleLinked: !!req.user?.google_subject }),
  );
  app.get("/api/auth/google", limiter, async (req, res) => {
    if (!provider) return redirect(res, "unavailable");
    const link = req.query.link === "1";
    if (link && !req.user) return redirect(res, "signin_first");
    const state = randomBytes(32).toString("hex");
    const browser = randomBytes(32).toString("hex");
    const verifier = randomBytes(48).toString("base64url");
    const nonce = randomBytes(32).toString("hex");
    await db.query("DELETE FROM oauth_requests WHERE expires_at <= $1", [
      Date.now(),
    ]);
    await db.query(
      "INSERT INTO oauth_requests(state_hash,browser_hash,nonce,verifier,link_user_id,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
      [
        digest(state),
        digest(browser),
        nonce,
        verifier,
        link ? req.user.id : null,
        Date.now() + 10 * 60 * 1000,
      ],
    );
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
  });
  app.get("/api/auth/google/callback", limiter, async (req, res) => {
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
    const pending = (
      await db.query(
        "DELETE FROM oauth_requests WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>$3 RETURNING *",
        [digest(req.query.state), digest(browser), Date.now()],
      )
    ).rows[0];
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
      const client = await db.connect();
      let user;
      try {
        await client.query("BEGIN");
        // Lock identity creation to handle repeated callbacks and concurrent sign-ins.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `google:${identity.subject}`,
        ]);
        user = (
          await client.query("SELECT * FROM users WHERE google_subject=$1", [
            identity.subject,
          ])
        ).rows[0];
        if (pending.link_user_id) {
          if (user && user.id !== pending.link_user_id)
            throw new Error("already_linked");
          const owner = (
            await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [
              pending.link_user_id,
            ])
          ).rows[0];
          if (
            !owner ||
            owner.email !== identity.email ||
            (owner.google_subject && owner.google_subject !== identity.subject)
          )
            throw new Error("link_mismatch");
          await client.query("UPDATE users SET google_subject=$1 WHERE id=$2", [
            identity.subject,
            owner.id,
          ]);
          user = owner;
        } else if (!user) {
          if (
            (
              await client.query("SELECT id FROM users WHERE email=$1", [
                identity.email,
              ])
            ).rowCount
          )
            throw new Error("existing_account");
          user = {
            id: randomUUID(),
            name: identity.name,
            email: identity.email,
          };
          await client.query(
            "INSERT INTO users(id,name,email,google_subject,created_at) VALUES($1,$2,$3,$4,$5)",
            [user.id, user.name, user.email, identity.subject, Date.now()],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
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
  });
}
