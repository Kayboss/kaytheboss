import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const css = readFileSync(path.join(DIST, "assets/css/app.css"), "utf8");

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p);
  }
})(DIST);

// Escape exactly as Tailwind does: \ before every char that is not [A-Za-z0-9_-]
const esc = (c) => c.replace(/[^A-Za-z0-9_-]/g, (m) => "\\" + m);

const missing = new Map();
const used = new Set();

for (const f of files) {
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) {
      if (!c) continue;
      used.add(c);
      // whole class name, variants included (md:px-4 -> .md\:px-4)
      if (!css.includes("." + esc(c))) {
        if (!missing.has(c)) missing.set(c, new Set());
        missing.get(c).add(path.relative(DIST, f));
      }
    }
  }
}

console.log(`distinct classes used: ${used.size}`);
console.log(`classes with NO css rule: ${missing.size}\n`);
for (const [c, where] of [...missing].sort()) {
  console.log(`  ${c}\n      used in: ${[...where].slice(0, 4).join(", ")}${where.size > 4 ? ` +${where.size - 4} more` : ""}`);
}
