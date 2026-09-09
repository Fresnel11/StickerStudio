import "../src/config/env.js";
import { Client } from "pg";
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  await client.connect();
  console.log(
    "Connexion PostgreSQL confirmée :",
    (
      await client.query(
        "SELECT current_database() AS database, inet_server_port() AS port",
      )
    ).rows[0],
  );
  console.log(
    "Tables publiques :",
    (
      await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename",
        ["public"],
      )
    ).rows.map((row) => row.tablename),
  );
} catch (error) {
  console.error(
    "Connexion PostgreSQL impossible :",
    error.code || "erreur réseau",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
