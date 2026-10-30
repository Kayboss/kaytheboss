/* ------------------------------------------------------------------ */
/* Export the SQLite content back to content/*.json.                   */
/*                                                                     */
/* The admin writes to data/kaytheboss.db, but deployments build the   */
/* site from content/*.json (no API reachable from Vercel). Run this   */
/* before you deploy so the live site matches what you edited:         */
/*                                                                     */
/*   npm run content:export                                           */
/*                                                                     */
/* Safe to re-run: it rewrites the three files in full.                */
/* ------------------------------------------------------------------ */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { allWork, allJournal, getSite } from "../lib/content.js";
import { ROOT } from "../db/client.js";

/* Strip the DB bookkeeping the site does not use. */
const forFile = ({ sortOrder, updatedAt, ...rest }) => rest;

async function writeJson(name, data) {
  const file = path.join(ROOT, "content", name);
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  content/${name}`);
}

const work = allWork().map(forFile);
const journal = allJournal().map(forFile);
const site = getSite() ?? {};

if (!work.length && !journal.length) {
  console.error("[export] no work or journal rows - refusing to overwrite content/*.json");
  process.exit(1);
}

console.log("[export] writing content from data/kaytheboss.db");
await writeJson("site.json", site);
await writeJson("work.json", work);
await writeJson("journal.json", journal);
console.log(`[export] done: ${work.length} case studies, ${journal.length} journal posts`);
