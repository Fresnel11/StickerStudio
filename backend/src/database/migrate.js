import { databaseConfig } from "../config/env.js";
import { openDatabase } from "../config/database.js";
const db = await openDatabase(databaseConfig());
await db.end();
console.log("Migrations PostgreSQL appliquées.");
