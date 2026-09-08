import { databaseConfig } from "../config/env.mjs";
import { openDatabase } from "../config/database.mjs";
const db = await openDatabase(databaseConfig());
await db.end();
console.log("Migrations PostgreSQL appliquées.");
