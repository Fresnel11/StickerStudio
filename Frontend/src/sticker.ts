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
    const scale =
      (Math.min(380 / image.width, 360 / image.height) * s.zoom) / 100;
    if (s.round) {
      l.beginPath();
      l.arc(0, 0, 174, 0, Math.PI * 2);
      l.clip();
    }
    l.drawImage(
      image,
      (-image.width * scale) / 2,
      (-image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
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
    c.translate(256, 418);
    c.rotate((-5 * Math.PI) / 180);
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
// Remove only edge-connected pixels close to the top-left background color.
export async function removePlainBackground(
  image: HTMLImageElement,
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1024 / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * ratio);
  canvas.height = Math.round(image.height * ratio);
  const c = canvas.getContext("2d")!;
  c.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { width: w, height: h } = canvas;
  const data = c.getImageData(0, 0, w, h);
  const p = data.data;
  const bg = [p[0], p[1], p[2]];
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];
  const add = (i: number) => {
    if (visited[i]) return;
    visited[i] = 1;
    const j = i * 4;
    if (
      Math.hypot(p[j] - bg[0], p[j + 1] - bg[1], p[j + 2] - bg[2]) < 65 ||
      p[j + 3] === 0
    )
      queue.push(i);
  };
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    p[i * 4 + 3] = 0;
    if (i % w > 0) add(i - 1);
    if (i % w < w - 1) add(i + 1);
    if (i >= w) add(i - w);
    if (i < w * (h - 1)) add(i + w);
  }
  c.putImageData(data, 0, 0);
  return loadImage(canvas.toDataURL());
}
