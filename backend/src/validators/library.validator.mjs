import { httpError } from "../utils/http-error.mjs";
export function packInput(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 40)
    throw httpError(400, "Donnez au pack un nom de 1 à 40 caractères.");
  return { name };
}
