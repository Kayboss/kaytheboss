import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.resolve(HERE, "..", "..", "drizzle");

migrate(db, { migrationsFolder: MIGRATIONS });
sqlite.close();
console.log("migrations applied");
