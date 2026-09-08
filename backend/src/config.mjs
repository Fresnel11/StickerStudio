import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
try {
  loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
export function databaseConfig() {
  const connectionString =
    process.env.USE_TEST_DATABASE === "1"
      ? process.env.TEST_DATABASE_URL
      : process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "Configurez DATABASE_URL (ou TEST_DATABASE_URL pour les tests) dans backend/.env.",
    );
  if (
    process.env.USE_TEST_DATABASE === "1" &&
    !new URL(connectionString).pathname.endsWith("_test")
  )
    throw new Error("La base de test doit se terminer par _test.");
  return { connectionString, schema: process.env.DATABASE_SCHEMA || "public" };
}
