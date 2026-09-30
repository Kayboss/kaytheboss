import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p);
  }
})(DIST);

let bad = 0;
const links = new Map();
const imgs = new Set();
const leftover = [];
const escaped = [];

for (const f of files) {
  const html = readFileSync(f, "utf8");
  const rel = path.relative(DIST, f);

  // unrendered template tags
  for (const m of html.matchAll(/\{\{[^}]*\}\}/g)) leftover.push(`${rel}: ${m[0]}`);

  // HTML that got escaped instead of emitted raw ({{ x }} used for a markup
  // block). These render as literal source text on the page.
  for (const m of html.matchAll(/&lt;\/?(a|div|section|nav|ul|ol|li|table|tr|td|th|article|figure|form|label|span|p|h[1-6])\b/gi)) {
    escaped.push(`${rel}: &lt;${m[1]}`);
  }

  // internal links
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = m[1].split("#")[0].split("?")[0];
    if (!url) continue;
    if (/\.(css|js|png|jpe?g|svg|webp|woff2?)$/i.test(url)) {
      imgs.add(url);
      continue;
    }
    if (!links.has(url)) links.set(url, []);
    links.get(url).push(rel);
  }
}

console.log(`pages: ${files.length}`);

console.log(`\n--- asset refs (${imgs.size}) ---`);
for (const a of [...imgs].sort()) {
  const ok = existsSync(path.join(DIST, a.replace(/^\//, "")));
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "MISS"} ${a}`);
}

console.log(`\n--- internal links (${links.size}) ---`);
for (const [url, from] of [...links].sort()) {
  const target = url.endsWith("/") ? `${url}index.html` : url;
  const ok = existsSync(path.join(DIST, target.replace(/^\//, "")));
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "MISS"} ${url}  <- ${[...new Set(from)].join(", ")}`);
}

console.log(`\n--- unrendered tags (${leftover.length}) ---`);
leftover.forEach((l) => console.log("  " + l));
if (leftover.length) bad++;

const escCount = new Map();
for (const e of escaped) {
  const k = e.split(": ")[1];
  escCount.set(k, (escCount.get(k) || 0) + 1);
}
console.log(`\n--- escaped markup (${escaped.length}) ---`);
if (!escaped.length) console.log("  none");
for (const [tag, n] of [...escCount].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${tag}  x${n}   (use {{{ x }}} not {{ x }})`);
}
if (escaped.length) bad++;

console.log(bad ? `\n${bad} PROBLEM(S)` : "\nALL CLEAN");
