declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export function isNativeApp() {
  return typeof window.ReactNativeWebView?.postMessage === "function";
}

export function nativeRequest(request: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const bridge = window.ReactNativeWebView;
    if (!bridge) {
      reject(new Error("Application mobile indisponible."));
      return;
    }
    const id = crypto.randomUUID();
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("studio-native-result", receive);
    };
    const receive = (event: Event) => {
      const result = (event as CustomEvent).detail;
      if (result?.id !== id) return;
      cleanup();
      if (result.success) resolve();
      else reject(new Error(result.message || "Action annulée."));
    };
    const timer = setTimeout(
      () => {
        cleanup();
        reject(new Error("Cette action a expiré. Réessayez."));
      },
      5 * 60 * 1000,
    );
    window.addEventListener("studio-native-result", receive);
    try {
      bridge.postMessage(JSON.stringify({ ...request, id }));
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
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
