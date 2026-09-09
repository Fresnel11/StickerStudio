import { fileURLToPath } from "node:url";
import { databaseConfig } from "./config/env.js";
import { openDatabase } from "./config/database.js";
import { createApp } from "./app.js";
console.log("[PostgreSQL] Connexion en cours...");
const db = await openDatabase(databaseConfig());
console.log("[PostgreSQL] Connexion établie. Migrations à jour.");
const app = await createApp({
  db,
  secure: process.env.NODE_ENV === "production",
  webDist: fileURLToPath(new URL("../../Frontend/dist", import.meta.url)),
});
const port = Number(process.env.API_PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host);
server.on("listening", () => {
  console.log(`[API] Serveur Express démarré : http://${host}:${port}`);
});
server.on("error", async (error) => {
  console.error(error.code === "EADDRINUSE"
    ? "[API] Port déjà utilisé. Arrêtez l'autre serveur ou modifiez API_PORT."
    : `[API] Échec de l'écoute HTTP (${error.code || "erreur inconnue"}).`);
  await db.end();
  process.exitCode = 1;
});
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  console.log("[API] Arrêt du serveur...");
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
