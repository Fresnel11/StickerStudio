import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
export type Settings = {
  text: string;
  emoji: string;
  color: string;
  outline: number;
  zoom: number;
  x: number;
  y: number;
  rotation: number;
  textSize: number;
  textZoom: number;
  textRotation: number;
  textX: number;
  textY: number;
  round: boolean;
};
export const defaults: Settings = {
  text: "TROP COOL !",
  emoji: "😎",
  color: "#7554eb",
  outline: 8,
  zoom: 100,
  x: 0,
  y: 0,
  rotation: -8,
  textSize: 54,
  textZoom: 100,
  textRotation: -5,
  textX: 0,
  textY: 0,
  round: false,
};
export function renderSticker(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  s: Settings,
) {
  const c = canvas.getContext("2d")!;
  canvas.width = canvas.height = 512;
  c.clearRect(0, 0, 512, 512);
  const layer = document.createElement("canvas");
  layer.width = layer.height = 512;
  const l = layer.getContext("2d")!;
  l.save();
  l.translate(256 + s.x, 235 + s.y);
  l.rotate((s.rotation * Math.PI) / 180);
  if (image) {
    const baseScale = s.round
      ? Math.max(348 / image.width, 348 / image.height)
      : Math.min(380 / image.width, 360 / image.height);
    const scale = (baseScale * s.zoom) / 100;
    l.drawImage(
      image,
      (-image.width * scale) / 2,
      (-image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
    if (s.round) {
      l.globalCompositeOperation = "destination-in";
      l.beginPath();
      l.arc(0, 0, (174 * s.zoom) / 100, 0, Math.PI * 2);
      l.fillStyle = "#ffffff";
      l.fill();
      l.globalCompositeOperation = "source-over";
    }
  } else {
    l.textAlign = "center";
    l.textBaseline = "middle";
    l.font = `${(260 * s.zoom) / 100}px "Segoe UI Emoji", sans-serif`;
    l.fillText(s.emoji || "😎", 0, 0);
  }
  l.restore();
  if (s.outline) {
    const border = document.createElement("canvas");
    border.width = border.height = 512;
    const b = border.getContext("2d")!;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24)
      b.drawImage(layer, Math.cos(a) * s.outline, Math.sin(a) * s.outline);
    b.globalCompositeOperation = "source-in";
    b.fillStyle = "#ffffff";
    b.fillRect(0, 0, 512, 512);
    c.drawImage(border, 0, 0);
  }
  c.drawImage(layer, 0, 0);
  if (s.text) {
    c.save();
    c.translate(256 + s.textX, 418 + s.textY);
    c.rotate((s.textRotation * Math.PI) / 180);
    c.scale(s.textZoom / 100, s.textZoom / 100);
    c.font = `900 ${s.textSize}px Arial, sans-serif`;
    c.textAlign = "center";
    c.lineJoin = "round";
    c.strokeStyle = "#fff";
    c.lineWidth = 14;
    c.strokeText(s.text, 0, 0, 445);
    c.fillStyle = s.color;
    c.fillText(s.text, 0, 0, 445);
    c.restore();
  }
}
export async function encodeWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const quality of [0.95, 0.85, 0.7, 0.5, 0.3, 0.1]) {
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/webp", quality),
    );
    if (!blob || blob.type !== "image/webp")
      throw new Error(
        "Ce navigateur ne permet pas l’export WebP. Essayez Chrome ou Edge.",
      );
    if (blob.size <= 100 * 1024) return blob;
  }
  throw new Error(
    "Image trop détaillée pour la limite de 100 Ko. Réduisez le zoom ou simplifiez le sticker.",
  );
}

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;
async function getFfmpeg() {
  if (ffmpeg) return ffmpeg;
  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      const instance = new FFmpeg();
      const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      await instance.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpeg = instance;
      return instance;
    })();
  }
  return ffmpegLoading;
}
export async function encodeAnimatedWebp(
  file: File,
  start = 0,
  duration = 10,
  onProgress?: (progress: number) => void,
  text = "",
  color = "#7554eb",
): Promise<Blob> {
  if (!file.type.startsWith("video/"))
    throw new Error("Sélectionnez une vidéo MP4, WebM ou MOV.");
  if (file.size > 16 * 1024 * 1024)
    throw new Error("La vidéo doit faire moins de 16 Mo.");
  const instance = await getFfmpeg();
  instance.on("progress", ({ progress }) => onProgress?.(Math.min(1, progress)));
  await instance.writeFile("input-video", await fetchFile(file));
  const escapedText = text
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'")
    .replaceAll("%", "\\%");
  const videoFilter = [
    "fps=15",
    "scale=512:512:force_original_aspect_ratio=decrease",
    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0",
    ...(escapedText
      ? [`drawtext=text='${escapedText}':fontcolor=0x${color.replace("#", "")}:fontsize=54:x=(w-text_w)/2:y=h-82:borderw=7:bordercolor=white`]
      : []),
  ].join(",");
  await instance.exec([
    "-ss", String(start), "-i", "input-video", "-t", String(duration), "-an",
    "-vf", videoFilter,
    "-c:v", "libwebp", "-lossless", "0", "-q:v", "65", "-loop", "0", "animated.webp",
  ]);
  const output = await instance.readFile("animated.webp");
  await instance.deleteFile("input-video");
  await instance.deleteFile("animated.webp");
  const blob = new Blob([output], { type: "image/webp" });
  if (blob.size > 500 * 1024)
    throw new Error("La vidéo encodée dépasse 500 Ko. Utilisez une vidéo plus courte ou moins détaillée.");
  return blob;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire cette image."));
    img.src = src;
  });
}
// Segment the subject locally; never substitute a color-based eraser on failure.
export async function removeImageBackground(
  image: HTMLImageElement,
  onProgress?: (message: string) => void,
): Promise<HTMLImageElement> {
  try {
    onProgress?.("Préparation du détourage…");
    const source = document.createElement("canvas");
    source.width = image.naturalWidth;
    source.height = image.naturalHeight;
    source.getContext("2d")!.drawImage(image, 0, 0);
    const input = await new Promise<Blob>((resolve, reject) => {
      source.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Image illisible"))),
        "image/png",
      );
    });
    const { removeBackground } = await import("@imgly/background-removal");
    const result = await removeBackground(input, {
      model: "isnet_fp16",
      output: { format: "image/png" },
      progress: (key, current, total) => {
        onProgress?.(
          key.startsWith("fetch:")
            ? `Chargement du modèle IA : ${Math.round((current / Math.max(total, 1)) * 100)} %`
            : "Détourage du sujet en cours…",
        );
      },
    });
    const url = URL.createObjectURL(result);
    try {
      return await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Échec du détourage IA :", error);
    throw new Error(
      "Le détourage IA a échoué. Vérifiez votre connexion et réessayez. Votre image a été conservée.",
    );
  }
}
