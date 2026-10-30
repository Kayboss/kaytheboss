/* ------------------------------------------------------------------ */
/* First-run setup for a fresh database (e.g. a new Render deploy).     */
/*                                                                     */
/* Safe to run on every boot: it only acts when the database is empty,  */
/* and records what it did so deleting all your content later does not  */
/* bring the seed back.                                                 */
/*                                                                     */
/*   ADMIN_EMAIL / ADMIN_PASSWORD  create the first admin user          */
/*   content/*.json                seed work + journal + site           */
/*                                                                     */
/* Usage: npm run db:bootstrap                                          */
/* ------------------------------------------------------------------ */

import { readFileSync } from "node:fs";
import path from "node:path";
import { db, sqlite, ROOT } from "./client.js";
import * as schema from "./schema.js";
import { countUsers, createUser } from "../lib/auth.js";
import { getStats, setSite, upsertWork, upsertJournal } from "../lib/content.js";

const MARKER = "bootstrap";

function marker() {
  return db
    .select()
    .from(schema.settings)
    .all()
    .find((r) => r.key === MARKER)?.value ?? null;
}

function writeMarker(value) {
  sqlite
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(MARKER, JSON.stringify(value));
}

const loadJson = (file) =>
  JSON.parse(readFileSync(path.join(ROOT, "content", file), "utf8"));

let changed = false;

/* Content: only on a virgin database, once. */
if (!marker()) {
  const stats = getStats();
  if (stats.workCount === 0 && stats.journalCount === 0) {
    const site = loadJson("site.json");
    const work = loadJson("work.json");
    const journal = loadJson("journal.json");
    setSite(site);
    work.forEach((w, i) => upsertWork(w, i));
    journal.forEach((j, i) => upsertJournal(j, i));
    console.log(`[bootstrap] seeded ${work.length} case studies, ${journal.length} journal posts`);
    changed = true;
  }
  writeMarker({ contentSeededAt: changed ? Date.now() : null });
}

/* Admin user: create only if there is none and credentials were supplied. */
if (countUsers() === 0) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    createUser(email, password);
    console.log(`[bootstrap] created admin user ${email.toLowerCase()}`);
    changed = true;
  } else {
    console.warn(
      "[bootstrap] no admin user yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, " +
        "redeploy, or run: npm run user:add <email> <password>"
    );
  }
}

console.log(changed ? "[bootstrap] done" : "[bootstrap] nothing to do");
sqlite.close();
