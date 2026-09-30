import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* ------------------------------------------------------------------ */
/* Local JSON fallback (current behaviour)                             */
/* ------------------------------------------------------------------ */

const readJson = async (p) =>
  JSON.parse(await readFile(path.join(ROOT, "content", p), "utf8"));

/* ------------------------------------------------------------------ */
/* Portable Text -> HTML (minimal block renderer)                      */
/* ------------------------------------------------------------------ */

const MARKS = { strong: "strong", em: "em", code: "code", underline: "u" };

function renderSpan(node) {
  let inner = (node._type === "span" ? node.text ?? "" : "")
    .replace(/\n/g, "<br>");
  for (const m of node.marks ?? []) {
    const tag = MARKS[m];
    if (tag) inner = `<${tag}>${inner}</${tag}>`;
  }
  return inner;
}

function richTextToHtml(body) {
  if (!Array.isArray(body)) return "";
  const out = [];
  const listStack = [];

  for (const block of body) {
    const isList = block.listItem != null;
    const listType = isList ? (block.listItem === "number" ? "ol" : "ul") : null;

    if (isList) {
      // open/close list wrappers as needed
      const top = listStack[listStack.length - 1];
      if (top !== listType) {
        if (top) out.push(`</${top}>`);
        listStack.push(listType);
        out.push(`<${listType}>`);
      }
      out.push(`<li>${(block.children ?? []).map(renderSpan).join("")}</li>`);
      continue;
    }

    // non-list block: close any open list
    if (listStack.length) {
      out.push(`</${listStack.pop()}>`);
    }

    if (block._type !== "block") continue;
    const inner = (block.children ?? []).map(renderSpan).join("");
    switch (block.style) {
      case "h2":
      case "h3":
      case "blockquote":
        out.push(`<${block.style}>${inner}</${block.style}>`);
        break;
      default:
        out.push(`<p>${inner}</p>`);
    }
  }

  while (listStack.length) out.push(`</${listStack.pop()}>`);
  return out.join("");
}

/* ------------------------------------------------------------------ */
/* Sanity GROQ via plain fetch (public datasets need no token)         */
/* ------------------------------------------------------------------ */

const API_VERSION = "v2024-10-01";

async function groq(query, { projectId, dataset, token } = {}) {
  const url =
    `https://${projectId}.apicdn.sanity.io/${API_VERSION}/data/query/${dataset}` +
    `?query=${encodeURIComponent(query)}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Sanity query failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).result;
}

// ref like image-ABC123-800x600-png -> cdn URL
function imageUrl(projectId, dataset, ref) {
  if (!ref) return undefined;
  const m = /^image-([A-Za-z0-9]+)-(\d+)x(\d+)-([a-z]+)$/.exec(ref);
  if (!m) return undefined;
  const [, id, width, height, ext] = m;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${width}x${height}.${ext}?fm=webp`;
}

async function loadFromSanity(env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = env.SANITY_DATASET || "production";
  const token = env.SANITY_API_TOKEN || undefined;
  const opts = { projectId, dataset, token };

  const [rawWork, rawJournal] = await Promise.all([
    groq(`*[_type == "workProject"]`, opts),
    groq(`*[_type == "journalPost"]`, opts),
  ]);

  const work = rawWork.map((d) => ({
    slug: d.slug?.current,
    index: d.index,
    title: d.title,
    year: d.year,
    discipline: d.discipline,
    series: d.series,
    size: d.size,
    image:
      imageUrl(projectId, dataset, d.image?.asset?._ref) ??
      d.image?.asset?.url ??
      d.image,
    alt: d.alt,
    summary: d.summary,
    client: d.client,
    role: d.role ?? [],
    stack: d.stack ?? [],
    tldr: d.tldr,
    challenge: d.challenge,
    approach: d.approach ?? [],
    outcome: d.outcome ?? [],
    pullQuote: d.pullQuote,
    quoteBy: d.quoteBy,
    next: d.next,
  }));

  const journal = rawJournal.map((d) => ({
    slug: d.slug?.current,
    title: d.title,
    date: d.date,
    category: d.category,
    readingTime: d.readingTime,
    excerpt: d.excerpt,
    body: richTextToHtml(d.body),
  }));

  return { site: await readJson("site.json"), work, journal };
}

/* ------------------------------------------------------------------ */
/* Loader entry point                                                  */
/* ------------------------------------------------------------------ */

export async function loadContent() {
  const env = process.env;
  if (env.SANITY_PROJECT_ID) {
    console.log(
      `[content] loading work + journal from Sanity (${env.SANITY_PROJECT_ID}/${env.SANITY_DATASET || "production"})`
    );
    return loadFromSanity(env);
  }
  console.log("[content] loading local JSON content");
  const [site, work, journal] = await Promise.all([
    readJson("site.json"),
    readJson("work.json"),
    readJson("journal.json"),
  ]);
  return { site, work, journal };
}