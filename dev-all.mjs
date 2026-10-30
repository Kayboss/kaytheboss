/* ------------------------------------------------------------------ */
/* One command for local development:                                  */
/*   - builds the static site from the content API (see .env)          */
/*   - runs the Fastify admin/API on :8787                             */
/*   - serves dist/ on :4321                                           */
/*   - rebuilds when src/, content/ or the SQLite DB changes           */
/*                                                                     */
/* Admin edits land in data/kaytheboss.db, so watching the DB is what  */
/* makes them show up on :4321 without a manual build.                 */
/* ------------------------------------------------------------------ */
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const children = [];
let stopping = false;

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("exit", (code) => {
    if (!stopping) console.log(`[dev] ${label} exited (code ${code})`);
  });
  child.on("error", (err) => console.error(`[dev] ${label} failed: ${err.message}`));
  children.push({ child, label });
  return child;
}

function once(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });
}

async function build() {
  await once(process.execPath, ["--env-file-if-exists=.env", "build.mjs"]);
  await once(process.execPath, [
    "node_modules/tailwindcss/lib/cli.js",
    "-i", "src/assets/css/site.css",
    "-o", "dist/assets/css/app.css",
    "--minify",
  ]);
}

async function waitForApi(attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("http://127.0.0.1:8787/api/health");
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

/* Debounced, single-flight rebuilds. */
let timer = null;
let building = false;
let queued = null;

function schedule(reason) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    if (building) {
      queued = reason;
      return;
    }
    building = true;
    try {
      console.log(`\n[dev] change detected (${reason}) — rebuilding`);
      await build();
      console.log("[dev] rebuild done");
    } catch (err) {
      console.error(`[dev] rebuild failed: ${err.message}`);
    } finally {
      building = false;
      if (queued) {
        const next = queued;
        queued = null;
        schedule(next);
      }
    }
  }, 300);
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log("\n[dev] shutting down");
  for (const { child } of children) child.kill();
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);

/* ---------------------------------------------------------------- */
/* Boot                                                             */
/* ---------------------------------------------------------------- */

console.log("[dev] starting api  -> http://127.0.0.1:8787/admin");
start(process.execPath, ["--env-file-if-exists=.env", "--watch", "server/src/start.js"], "api");

console.log("[dev] initial build");
if (await waitForApi()) {
  console.log("[dev] api ready");
} else {
  console.log("[dev] api not answering yet — building from local JSON, will rebuild when it is");
}
try {
  await build();
} catch (err) {
  console.error(`[dev] initial build failed: ${err.message} (continuing)`);
}

console.log("[dev] starting site -> http://localhost:4321");
start(process.execPath, ["--env-file-if-exists=.env", "preview.mjs"], "site");

for (const dir of ["src", "content"]) {
  watch(path.join(ROOT, dir), { recursive: true }, (_event, file) =>
    schedule(`${dir}/${file ?? "?"}`)
  );
}

/* SQLite writes (including WAL churn) mean the admin just saved something. */
watch(path.join(ROOT, "data"), { recursive: false }, (_event, file) => {
  if (file && file.startsWith("kaytheboss.db")) schedule(`db/${file}`);
});
