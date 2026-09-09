import { OAuth2Client } from "google-auth-library";
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
