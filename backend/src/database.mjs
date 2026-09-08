import { Pool } from "pg";
import { readFile, readdir } from "node:fs/promises";
export async function openDatabase({ connectionString, schema = "public" }) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema))
    throw new Error("Nom de schéma PostgreSQL invalide.");
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    options: `-c search_path=${schema}`,
  });
  pool.on("error", (error) =>
    console.error(
      "Connexion PostgreSQL interrompue :",
      error.code || "erreur réseau",
    ),
  );
  const client = await pool.connect().catch(async (error) => {
    await pool.end();
    throw error;
  });
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('sticker_studio_migrations'))",
    );
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const migrations = (
      await readdir(new URL("../migrations/", import.meta.url))
    )
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort();
    for (const file of migrations) {
      const version = Number(file.split("_")[0]);
      if (
        !(
          await client.query(
            "SELECT version FROM schema_migrations WHERE version=$1",
            [version],
          )
        ).rowCount
      ) {
        await client.query(
          await readFile(
            new URL(`../migrations/${file}`, import.meta.url),
            "utf8",
          ),
        );
        await client.query(
          "INSERT INTO schema_migrations(version) VALUES($1)",
          [version],
        );
      }
    }
    await client.query("COMMIT");
    client.release();
    return pool;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
    throw error;
  }
}
