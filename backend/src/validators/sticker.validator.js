import sharp from "sharp";
import { digest } from "../utils/crypto.js";
import { httpError as error } from "../utils/http-error.js";
export async function validateSticker(data) {
  if (
    typeof data !== "string" ||
    data.length > 136560 ||
    !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
  )
    throw error(400, "Envoyez un sticker WebP de moins de 100 Ko.");
  const buffer = Buffer.from(data.split(",")[1], "base64");
  if (buffer.length > 102400) throw error(400, "Le sticker dépasse 100 Ko.");
  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: 512 * 512,
    }).metadata();
    if (
      metadata.format !== "webp" ||
      metadata.width !== 512 ||
      metadata.height !== 512 ||
      (metadata.pages || 1) > 1
    )
      throw new Error();
    await sharp(buffer).raw().toBuffer();
  } catch {
    throw error(
      400,
      "Le sticker doit être une image WebP statique valide de 512 × 512 pixels.",
    );
  }
  return { data, digest: digest(buffer) };
}
