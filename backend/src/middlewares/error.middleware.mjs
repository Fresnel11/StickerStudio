export const notFound = (req, res) =>
  res.status(404).json({ error: "Cette ressource n’existe pas." });
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
  if (status >= 500)
    console.error("API error:", error.code || "INTERNAL_ERROR");
  res
    .status(status)
    .json({
      error:
        status === 413
          ? "Fichier trop volumineux."
          : status >= 500
            ? "Le serveur ne peut pas traiter la demande. Réessayez."
            : error.type === "entity.parse.failed"
              ? "Le corps de la requête doit être un JSON valide."
              : error.message,
    });
}
