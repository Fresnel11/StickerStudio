export type User = { id: string; name: string; email: string };
export type Saved = { id: string; data: string };

const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
export const API_BASE_URL = rawBase.endsWith("/api")
  ? rawBase
  : rawBase
    ? `${rawBase}/api`
    : "/api";

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getApiUrl(path), {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Sticker-Studio": "1",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Connexion au serveur impossible. Vérifiez votre connexion et réessayez.",
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("studio-session-expired"));
    throw new Error(data?.error || "Le serveur est indisponible. Réessayez.");
  }
  if (!data) throw new Error("Réponse du serveur invalide. Réessayez.");
  return data as T;
}
export function readGuestStickers(): Saved[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("sticker-studio-pack") || "[]",
    );
    return Array.isArray(value)
      ? value
          .filter(
            (item): item is Saved =>
              typeof item?.id === "string" &&
              typeof item?.data === "string" &&
              item.data.startsWith("data:image/webp;base64,"),
          )
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
