import sharp from "sharp";
import { digest } from "../utils/crypto.js";
import { httpError as error } from "../utils/http-error.js";
export async function validateSticker(data) {
  if (
    typeof data !== "string" ||
    data.length > 700000 ||
    !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
  )
    throw error(400, "Envoyez un sticker WebP de moins de 500 Ko.");
  const buffer = Buffer.from(data.split(",")[1], "base64");
  if (buffer.length > 500 * 1024) throw error(400, "Le sticker dépasse 500 Ko.");
  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: 512 * 512,
    }).metadata();
    if (
      metadata.format !== "webp" ||
      metadata.width !== 512 ||
      metadata.height !== 512 ||
      (metadata.pages || 1) > 150
    )
      throw new Error();
    await sharp(buffer).raw().toBuffer();
  } catch {
    throw error(
      400,
      "Le sticker doit être un WebP valide de 512 × 512 pixels et de 150 images maximum.",
    );
  }
  return { data, digest: digest(buffer) };
}
