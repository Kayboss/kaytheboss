import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, sqlite } from "./client.js";
import { countUsers, createUser } from "../lib/auth.js";
import { upsertWork, upsertJournal, setSite } from "../lib/content.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const CONTENT = path.join(REPO, "content");

function loadJSON(p) {
  const raw = readFileSync(path.join(CONTENT, p), "utf8");
  return JSON.parse(raw);
}

const site = loadJSON("site.json");
const work = loadJSON("work.json");
const journal = loadJSON("journal.json");

console.log("seeding database...");

setSite(site);
for (let i = 0; i < work.length; i++) {
  upsertWork(work[i], i);
}
for (let i = 0; i < journal.length; i++) {
  upsertJournal(journal[i], i);
}

if (countUsers() === 0) {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.error(
      "No admin user yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, then run db:seed again."
    );
    sqlite.close();
    process.exit(1);
  }
  createUser(email, pass);
  console.log(`created admin user: ${email} / (password set)`);
} else {
  console.log("admin user already exists, skipping");
}

sqlite.close();
console.log("seeded");
