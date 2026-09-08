import { httpError } from "../utils/http-error.mjs";
export function loginInput(body) {
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw httpError(400, "Indiquez une adresse e-mail valide.");
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128
  )
    throw httpError(
      400,
      "Le mot de passe doit contenir entre 10 et 128 caractères.",
    );
  return { email, password };
}
export function registerInput(body) {
  const credentials = loginInput(body);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60)
    throw httpError(400, "Le prénom doit contenir entre 2 et 60 caractères.");
  return { ...credentials, name };
}
