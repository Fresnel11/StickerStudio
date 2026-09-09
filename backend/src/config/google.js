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
