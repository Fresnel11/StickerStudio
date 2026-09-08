import { fileURLToPath } from "node:url";
import { databaseConfig } from "./config/env.mjs";
import { openDatabase } from "./config/database.mjs";
import { createApp } from "./app.mjs";
const db = await openDatabase(databaseConfig());
const app = await createApp({
  db,
  secure: process.env.NODE_ENV === "production",
  webDist: fileURLToPath(new URL("../../Frontend/dist", import.meta.url)),
});
const port = Number(process.env.API_PORT || 3001);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`Sticker Studio API : http://127.0.0.1:${port}`),
);
function close() {
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
