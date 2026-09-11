import "../src/config/env.js";
import { Client } from "pg";
import { readFile, writeFile } from "node:fs/promises";
const url = new URL(process.env.DATABASE_URL);
const name = url.pathname.slice(1) + "_test";
if (!/^[a-z][a-z0-9_]{0,62}$/.test(name))
  throw new Error("Nom de base de test invalide.");
const client = new Client({
  connectionString: url.toString(),
  connectionTimeoutMillis: 5000,
});
try {
  await client.connect();
  if (
    !(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
      .rowCount
  )
    await client.query(`CREATE DATABASE "${name}"`);
  url.pathname = "/" + name;
  const path = new URL("../.env.development", import.meta.url);
  let env = await readFile(path, "utf8");
  const line = "TEST_DATABASE_URL=" + url.toString();
  env = /^TEST_DATABASE_URL=/m.test(env)
    ? env.replace(/^TEST_DATABASE_URL=.*$/m, () => line)
    : env + "\n" + line + "\n";
  await writeFile(path, env);
  console.log("Base de test prête :", name, "sur le même serveur PostgreSQL.");
} catch (error) {
  console.error("Préparation impossible :", error.code || "erreur");
  process.exitCode = 1;
} finally {
  await client.end();
}
