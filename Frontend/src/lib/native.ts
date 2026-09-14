import { Capacitor, registerPlugin } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export interface WhatsAppAvailability {
  whatsapp: boolean;
  business: boolean;
}
export const StudioNative = registerPlugin<{
  saveFile(options: {
    data: string;
    name: string;
    mime: string;
  }): Promise<void>;
  availability(): Promise<WhatsAppAvailability>;
  addPack(options: {
    sourceId: string;
    name: string;
    stickers: string[];
    target: string;
  }): Promise<{ added: boolean }>;
}>("Studio");

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}
export function supportsWhatsApp() {
  return Capacitor.getPlatform() === "android";
}

export async function nativeRequest(
  request: Record<string, string>,
): Promise<void> {
  if (!isNativeApp()) throw new Error("Application mobile indisponible.");
  if (request.type === "open-auth") {
    const url = new URL(request.url);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new Error("Adresse de connexion invalide.");
    await Browser.open({ url: url.href });
  } else if (request.type === "save-file") {
    await StudioNative.saveFile({
      data: request.data,
      name: request.name,
      mime: request.mime,
    });
  } else throw new Error("Action mobile inconnue.");
}

export async function saveNativeFile(blob: Blob, name: string) {
  if (blob.size > 8 * 1024 * 1024) throw new Error("Le fichier dépasse 8 Mo.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () =>
      reject(new Error("Impossible de préparer le fichier."));
    reader.readAsDataURL(blob);
  });
  await nativeRequest({
    type: "save-file",
    data,
    name,
    mime: name.endsWith(".zip") ? "application/zip" : "image/webp",
  });
}
