import { createClient } from "@sanity/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMG = path.join(ROOT, "src", "assets", "img");
const ENV = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");

/* minimal .env loader (no dependency needed) */
const env = {};
if (await readFile(ENV, "utf8").catch(() => "")) {
  for (const line of (await readFile(ENV, "utf8")).split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
}

const projectId = env.SANITY_STUDIO_PROJECT_ID;
const dataset = env.SANITY_STUDIO_DATASET || "production";
const token = env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error(
    "Missing env. Add SANITY_API_TOKEN=... to admin/.env (create one at manage.sanity.io > API)."
  );
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, apiVersion: "2024-10-01" });

const readJson = async (p) =>
  JSON.parse(await readFile(path.join(ROOT, "content", p), "utf8"));

/* ------------------------------------------------------------------ */
/* Image upload (cached by filename -> asset _id)                      */
/* ------------------------------------------------------------------ */

const assetCache = new Map();

async function uploadImage(filename) {
  if (!filename) return undefined;
  if (assetCache.has(filename)) return assetCache.get(filename);
  try {
    const img = await readFile(path.join(IMG, filename));
    const asset = await client.assets.upload("image", img, {
      filename,
      contentType: "image/png",
    });
    console.log(`  image ${filename} -> ${asset._id}`);
    assetCache.set(filename, asset._id);
    return asset._id;
  } catch (err) {
    console.warn(`  image ${filename} NOT FOUND (skipped): ${err.message}`);
    assetCache.set(filename, undefined);
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Journal HTML body -> Portable Text blocks                           */
/* ------------------------------------------------------------------ */

const INLINE_RE =
  /<(\/?)strong>|<(\/?)(b|em|i|code)>|<\/?(p|ul|ol|li|h2|h3|blockquote|hr)>/gi;

const styleFor = (tag) =>
  tag === "h2" ? "h2" : tag === "h3" ? "h3" : tag === "blockquote" ? "blockquote" : "normal";

// Stable unique keys for array items (Studio requires _key on object items).
let _k = 0;
const keyFor = () => `k${(_k++).toString(36)}${Date.now().toString(36).slice(-4)}`;

function htmlToBlocks(html) {
  const blocks = [];
  let spans = [];           // pending spans for current block
  let style = "normal";     // style for current/next block
  let listType = null;      // "bullet" | "number"
  let marks = [];           // active inline marks

  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'");

  const appendText = (text) => {
    if (!text) return;
    const last = spans[spans.length - 1];
    const markKey = marks.join("|");
    if (last && last.markKey === markKey) {
      last.text += decode(text);
    } else {
      spans.push({ markKey, marks: marks.slice(), text: decode(text) });
    }
  };

  const flushBlock = () => {
    const children = spans
      .filter((s) => s.text.trim())
      .map((s) => ({ _key: keyFor(), _type: "span", marks: s.marks, text: s.text }));
    spans = [];
    if (children.length) {
      blocks.push({
        _key: keyFor(),
        _type: "block",
        style: listType ? "normal" : style,
        listItem: listType ?? undefined,
        markDefs: [],
        children,
      });
    }
  };

  const tags = [...html.matchAll(INLINE_RE)];
  let pos = 0;

  for (const t of tags) {
    appendText(html.slice(pos, t.index));
    pos = t.index + t[0].length;
    const full = t[0];
    const closing = full.startsWith("</");
    const tag = full.replace(/[<\/>]/g, "").trim();

    switch (tag) {
      case "strong": case "em": case "i": case "code": {
        const mark = tag === "i" ? "em" : tag;
        if (closing) marks = marks.filter((m) => m !== mark);
        else marks.push(mark);
        break;
      }
      case "hr":
        flushBlock();
        spans = [];
        break;
      case "h2": case "h3": case "blockquote": case "p":
        if (closing) { flushBlock(); if (style !== "normal") style = "normal"; }
        else style = styleFor(tag);
        break;
      case "ul": case "ol":
        if (closing) { flushBlock(); listType = null; }
        else listType = tag === "ol" ? "number" : "bullet";
        break;
      case "li":
        if (!closing) flushBlock();
        break;
      default:
        break;
    }
  }
  appendText(html.slice(pos));
  flushBlock();

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Map JSON -> Sanity documents                                        */
/* ------------------------------------------------------------------ */

async function mapWork(entry) {
  const imageId = await uploadImage(entry.image);
  const doc = {
    _id: `work-${entry.slug}`,
    _type: "workProject",
    slug: { _type: "slug", current: entry.slug },
    index: entry.index,
    title: entry.title,
    year: entry.year,
    discipline: entry.discipline,
    series: entry.series || "",
    size: entry.size,
    alt: entry.alt,
    summary: entry.summary,
    client: entry.client,
    role: entry.role,
    stack: entry.stack,
    tldr: entry.tldr,
    challenge: entry.challenge,
    approach: entry.approach,
    outcome: (entry.outcome || []).map((o) => ({ _key: keyFor(), ...o })),
    pullQuote: entry.pullQuote,
    quoteBy: entry.quoteBy,
    next: entry.next,
  };
  if (imageId) {
    doc.image = { _type: "image", asset: { _type: "reference", _ref: imageId } };
  }
  return doc;
}

async function mapJournal(entry) {
  return {
    _id: `journal-${entry.slug}`,
    _type: "journalPost",
    slug: { _type: "slug", current: entry.slug },
    title: entry.title,
    date: entry.date,
    category: entry.category,
    readingTime: entry.readingTime,
    excerpt: entry.excerpt,
    body: htmlToBlocks(entry.body),
  };
}

/* ------------------------------------------------------------------ */
/* Run                                                                */
/* ------------------------------------------------------------------ */

const work = await readJson("work.json");
const journal = await readJson("journal.json");

console.log(`→ upload ${work.length} work + ${journal.length} journal …`);
const allDocs = [];
for (const w of work) allDocs.push(await mapWork(w));
for (const j of journal) allDocs.push(await mapJournal(j));

console.log("→ createOrReplace documents …");
for (const doc of allDocs) {
  await client.createOrReplace(doc);
  console.log(`  ✓ ${doc._id}`);
}

console.log(`\nDone. ${allDocs.length} documents imported to ${projectId}/${dataset}.`);