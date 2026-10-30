/* ------------------------------------------------------------------ */
/* Content loader: CONTENT_API_URL (self-hosted admin) when set,       */
/* otherwise the committed JSON in this folder.                        */
/* ------------------------------------------------------------------ */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Local JSON */
const readJson = async (p) =>
  JSON.parse(await readFile(path.join(ROOT, "content", p), "utf8"));

/* Self-hosted backend via CONTENT_API_URL */
async function loadFromApi(env, attempts = 3) {
  const base = env.CONTENT_API_URL.replace(/\/$/, "");
  const url = base + "/api/content";
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: env.CONTENT_API_TOKEN ? { authorization: `Bearer ${env.CONTENT_API_TOKEN}` } : {},
      });
      if (!res.ok) throw new Error(`CONTENT_API_URL fetch failed (${res.status}): ${await res.text()}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      /* The dev server restarts on save; give it a moment instead of dropping to JSON. */
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastError;
}

/* Entry */
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function loadContent() {
  const env = process.env;
  if (env.CONTENT_API_URL) {
    console.log(`[content] loading work + journal from CONTENT_API_URL (${env.CONTENT_API_URL})`);
    try {
      return await loadFromApi(env);
    } catch (err) {
      console.warn(
        `[content] CONTENT_API_URL unavailable (${err.message}); falling back to local JSON`
      );
    }
  }
  console.log("[content] loading local JSON content");
  const [site, work, journal] = await Promise.all([
    readJson("site.json"),
    readJson("work.json"),
    readJson("journal.json"),
  ]);
  return { site, work, journal };
}
