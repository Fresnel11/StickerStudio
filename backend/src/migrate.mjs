import { databaseConfig } from "./config.mjs";
import { openDatabase } from "./database.mjs";
const db = await openDatabase(databaseConfig());
await db.end();
console.log("Migrations PostgreSQL appliquées.");
