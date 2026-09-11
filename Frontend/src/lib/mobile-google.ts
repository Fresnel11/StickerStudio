import { api, getApiUrl } from "./api";
import { nativeRequest } from "./native";

export async function mobileGoogleLogin(link: boolean, signal: AbortSignal) {
  const request = await api<{ id: string; secret: string }>(
    "/auth/google/mobile",
    {
      method: "POST",
      body: JSON.stringify({ link }),
      signal,
    },
  );
  const url = new URL(
    getApiUrl(`/auth/google?mobile=${request.id}`),
    window.location.origin,
  ).href;
  await nativeRequest({ type: "open-auth", url });
  const deadline = Date.now() + 10 * 60 * 1000;
  while (!signal.aborted && Date.now() < deadline) {
    const result = await api<{ pending?: boolean; errorCode?: string }>(
      "/auth/google/mobile/finish",
      {
        method: "POST",
        body: JSON.stringify(request),
        signal,
      },
    );
    if (result.errorCode) return result.errorCode;
    if (!result.pending) {
      window.location.assign("/mes-stickers");
      return;
    }
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, 3000);
      signal.addEventListener("abort", done, { once: true });
    });
  }
  if (!signal.aborted) throw new Error("Cette connexion a expiré. Réessayez.");
}
