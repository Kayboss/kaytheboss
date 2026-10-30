import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

function resolveDbPath() {
  const raw =
    process.env.DATABASE_URL ||
    path.join(ROOT, "data", "kaytheboss.db");
  const abs = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}

const dbPath = resolveDbPath();

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite, schema, dbPath, ROOT };
