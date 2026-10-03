import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "./content/loader.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

/* ------------------------------------------------------------------ */
/* Template engine: {{> partial}} | {{ var }} (escaped) | {{{ var }}} raw */
/* ------------------------------------------------------------------ */

const cache = new Map();

async function load(rel) {
  if (!cache.has(rel)) {
    cache.set(rel, await readFile(path.join(SRC, rel), "utf8"));
  }
  return cache.get(rel);
}

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Resolves dotted paths with optional array indexes, e.g. site.locations[0]
function resolve(data, key) {
  return key.split(".").reduce((acc, part) => {
    if (acc == null) return undefined;
    const m = part.match(/^([^[\]]+)((?:\[\d+\])*)$/);
    if (!m) return undefined;
    let val = acc[m[1]];
    for (const idx of m[2].match(/\d+/g) || []) {
      val = val?.[Number(idx)];
    }
    return val;
  }, data);
}

// Matches a data path with optional array indexes, e.g. site.locations[0]
const PATH = String.raw`[\w]+(?:\.[\w]+|\[\d+\])*`;

async function render(rel, data) {
  let out = await load(rel);

  // includes first: {{> partial }}
  const includeRe = /\{\{>\s*([\w./-]+)\s*\}\}/g;
  const includes = [...out.matchAll(includeRe)];
  for (const m of includes) {
    const target = m[1].endsWith(".html") ? m[1] : `${m[1]}.html`;
    out = out.replace(m[0], await render(target, data));
  }

  // conditionals: {{#if key}}...{{/if}}
  out = out.replace(
    new RegExp(String.raw`\{\{#if\s+(${PATH})\}\}([\s\S]*?)\{\{\/if\}\}`, "g"),
    (_, key, body) => {
      const val = resolve(data, key);
      return Array.isArray(val) ? (val.length ? body : "") : val ? body : "";
    }
  );

  // negation: {{^if key}}...{{/if}}
  out = out.replace(
    new RegExp(String.raw`\{\{\^if\s+(${PATH})\}\}([\s\S]*?)\{\{\/if\}\}`, "g"),
    (_, key, body) => {
      const val = resolve(data, key);
      return Array.isArray(val) ? (val.length ? "" : body) : val ? "" : body;
    }
  );

  // raw triple-brace, then escaped double-brace
  out = out.replace(
    new RegExp(String.raw`\{\{\{\s*(${PATH})\s*\}\}\}`, "g"),
    (_, key) => resolve(data, key) ?? ""
  );

  out = out.replace(
    new RegExp(String.raw`\{\{\s*(${PATH})\s*\}\}`, "g"),
    (_, key) => escapeHtml(resolve(data, key))
  );

  return out;
}

/* ------------------------------------------------------------------ */
/* Template sanity check                                               */
/* ------------------------------------------------------------------ */

/**
 * A stray 4th brace ({{{ x }}}}) silently renders as a literal "{" and "}"
 * around the block, because the raw regex matches from the 2nd brace.
 * Fail the build instead of shipping it.
 */
async function assertValidTemplates() {
  const problems = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".html")) {
        const src = await load(path.relative(SRC, p).split(path.sep).join("/"));
        src.split("\n").forEach((line, i) => {
          // ignore {{#if}} / {{/if}} / {{^if}}, which legitimately use 2
          const stripped = line.replace(/\{\{[#/^][\s\S]*?\}\}/g, "");
          const m = stripped.match(/\{{4,}|\}{4,}/g);
          if (m) {
            problems.push(
              `${path.relative(ROOT, p)}:${i + 1}  ${m[0]}  ${line.trim()}`
            );
          }
        });
      }
    }
  };
  await walk(SRC);
  if (problems.length) {
    console.error("\nInvalid template syntax (4+ braces):\n");
    problems.forEach((p) => console.error("  " + p));
    console.error("\nUse {{{ key }}} for raw HTML, {{ key }} for escaped text.\n");
    process.exit(1);
  }
}
await assertValidTemplates();

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const { site, work, journal } = await loadContent();

const byDate = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
journal.sort(byDate);
work.sort((a, b) => (a.year < b.year ? 1 : a.year > b.year ? -1 : 0));

const fmtDate = (iso) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const workHref = (w) => `/work/${w.slug}.html`;
const postHref = (p) => `/journal/${p.slug}.html`;

// Local JSON stores a filename ("work-x.png"); Sanity returns a full CDN URL.
const imgSrc = (w) =>
  /^https?:\/\//.test(w.image || "") ? w.image : `/assets/img/${w.image}`;

/* ------------------------------------------------------------------ */
/* Shared fragments                                                    */
/* ------------------------------------------------------------------ */

const navHtml = (active) =>
  site.nav
    .map((n) => {
      const on = n.label.toLowerCase() === active;
      return `<a href="${n.href}"${
        on ? ' aria-current="page" class="font-label-md text-label-md uppercase tracking-widest text-[#F5C842] py-space-xs relative after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-[#F5C842]"' : ' class="font-label-md text-label-md uppercase tracking-widest text-[#d1c5ae] hover:text-[#F5C842] transition-colors py-space-xs relative after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#F5C842] hover:after:w-full after:transition-all after:duration-300"'
      }>${n.label}</a>`;
    })
    .join("");

const base = (active) => ({
  site,
  active,
  nav: navHtml(active),
  year: new Date().getFullYear(),
  depth: "../",
});

/* ------------------------------------------------------------------ */
/* Page builders                                                       */
/* ------------------------------------------------------------------ */

function disciplineCard(d, i) {
  return `<div class="tilt-card interactive-card reveal-item bg-[#121316] border border-[#332e1f] p-space-lg flex flex-col justify-between relative group hover:bg-[#18191e]" data-tilt style="transition-delay:${100 + i * 50}ms">
  <div class="space-y-space-md">
    <div class="flex justify-between items-center">
      <span class="font-label-sm text-label-sm bg-[#22232a] group-hover:bg-[#F5C842]/20 text-[#F5C842] px-space-xs py-1 uppercase transition-colors">DISCIPLINE ${d.index}</span>
      <span aria-hidden="true" class="material-symbols-outlined text-white text-2xl group-hover:text-[#F5C842] group-hover:scale-110 transition-all">${d.icon}</span>
    </div>
    <h3 class="font-headline-md text-headline-md text-white uppercase font-bold tracking-tight group-hover:text-[#ffe08f] transition-colors">${escapeHtml(d.title)}</h3>
    <p class="font-body-md text-body-md text-[#d2c6a2] text-base">${escapeHtml(d.body)}</p>
    <ul class="space-y-space-xs font-label-sm text-label-sm text-[#A1A1AA] pt-space-xs">
      ${d.points
        .map(
          (p) =>
            `<li class="flex items-start gap-space-xs"><span aria-hidden="true" class="w-1 h-1 bg-[#F5C842] telemetry-pulse mt-1.5 shrink-0"></span>${escapeHtml(p)}</li>`
        )
        .join("")}
    </ul>
  </div>
  <div class="pt-space-lg flex items-center justify-between">
    <span class="font-label-sm text-label-sm text-[#F5C842] uppercase">${escapeHtml(d.code)}</span>
    <span class="font-label-sm text-label-sm text-white group-hover:text-[#F5C842] inline-flex items-center">EXPLORE <span aria-hidden="true" class="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span></span>
  </div>
</div>`;
}

const SPAN = { wide: "lg:col-span-8", tall: "lg:col-span-4", narrow: "lg:col-span-4" };

function workCard(w, i) {
  const href = workHref(w);
  return `<article class="interactive-card reveal-item ${SPAN[w.size] || "lg:col-span-4"} bg-[#121316] overflow-hidden flex flex-col justify-between group border border-[#332e1f]" style="transition-delay:${100 + i * 50}ms">
  <a href="${href}" class="block relative w-full h-80 sm:h-96 overflow-hidden focus:outline-none" tabindex="-1" aria-hidden="true">
    <img alt="" class="case-study-img w-full h-full object-cover" src="${imgSrc(w)}" loading="lazy" decoding="async">
    <span class="absolute inset-0 bg-gradient-to-t from-[#121316] via-transparent to-transparent"></span>
  </a>
  <div class="absolute top-space-md left-space-md flex gap-space-xs pointer-events-none">
    <span class="bg-[#050506]/90 text-[#F5C842] border border-[#332e1f] font-label-sm text-label-sm px-space-xs py-1 uppercase">${escapeHtml(w.discipline)}</span>
    ${w.series ? `<span class="bg-[#050506]/90 text-[#A1A1AA] border border-[#332e1f] font-label-sm text-label-sm px-space-xs py-1 uppercase">${escapeHtml(w.series)}</span>` : ""}
  </div>
  <div class="absolute top-space-md right-space-md font-label-sm text-label-sm text-[#e5e1e4] bg-[#050506]/90 border border-[#332e1f] px-space-xs py-1 pointer-events-none">${escapeHtml(w.year)}</div>
  <div class="p-space-lg flex flex-col sm:flex-row sm:items-end justify-between gap-space-md relative">
    <div class="space-y-space-xs max-w-xl">
      <span class="font-label-sm text-label-sm text-[#F5C842] uppercase tracking-wider flex items-center gap-1.5"><span aria-hidden="true" class="w-1.5 h-1.5 bg-[#F5C842] rounded-full"></span>PROJECT: ${escapeHtml(w.index)}</span>
      <h3 class="font-headline-md text-headline-md uppercase text-white font-bold group-hover:text-[#ffe08f] transition-colors"><a href="${href}" class="focus:outline-none after:absolute after:inset-0 after:content-['']">${escapeHtml(w.title)}</a></h3>
      <p class="font-body-sm text-[#d2c6a2] text-body-md">${escapeHtml(w.summary)}</p>
    </div>
    <span class="gold-cta btn-magnetic bg-[#F5C842] text-black px-space-md py-space-sm font-label-sm text-label-sm uppercase font-bold shrink-0 self-start sm:self-end shadow-[0_0_15px_rgba(245,200,66,0.2)] pointer-events-none">INSPECT CASE <span aria-hidden="true">→</span></span>
  </div>
</article>`;
}

function marquee() {
  const run = site.ethos
    .map((e) => `<span>${escapeHtml(e)}</span><span aria-hidden="true" class="w-3 h-3 bg-black rotate-45 inline-block"></span>`)
    .join("");
  return `<div class="animate-marquee-infinite"><div class="flex items-center gap-space-lg text-black font-headline-md text-headline-md font-extrabold uppercase tracking-widest shrink-0 pr-space-lg">${run}</div><div aria-hidden="true" class="flex items-center gap-space-lg text-black font-headline-md text-headline-md font-extrabold uppercase tracking-widest shrink-0 pr-space-lg">${run}</div></div>`;
}

function telemetryStrip() {
  return `<div class="w-full bg-[#050506] px-gutter md:px-margin-lg py-space-xs flex items-center justify-between border-b border-[#332e1f]">
  <div class="flex items-center gap-space-md font-label-sm text-label-sm text-[#A1A1AA]">
    <div class="flex items-center gap-space-xs"><span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-[#F5C842] telemetry-pulse"></span><span class="text-[#F5C842] uppercase font-bold tracking-widest">GRAPHIC DESIGN STUDIO</span></div>
    <span aria-hidden="true" class="hidden md:inline">//</span>
    <span class="hidden md:inline uppercase tracking-widest text-[#d2c6a2]">Berlin &amp; New York</span>
  </div>
</div>`;
}

function workIndexCards() {
  return work
    .map(
      (w, i) => `<article class="interactive-card reveal-item bg-[#121316] border border-[#332e1f] overflow-hidden flex flex-col group" style="transition-delay:${i * 60}ms">
  <a href="${workHref(w)}" class="block relative w-full h-64 overflow-hidden focus:outline-none" tabindex="-1" aria-hidden="true">
    <img alt="" class="case-study-img w-full h-full object-cover" src="${imgSrc(w)}" loading="lazy" decoding="async">
    <span class="absolute inset-0 bg-gradient-to-t from-[#121316] via-transparent to-transparent"></span>
  </a>
  <div class="p-space-lg flex flex-col gap-space-sm flex-1 relative">
    <div class="flex items-center justify-between font-label-sm text-label-sm">
      <span class="text-[#F5C842] uppercase tracking-wider">${escapeHtml(w.index)}</span>
      <span class="text-[#A1A1AA]">${escapeHtml(w.year)}</span>
    </div>
    <h2 class="font-headline-sm text-headline-sm uppercase text-white font-bold group-hover:text-[#ffe08f] transition-colors"><a href="${workHref(w)}" class="focus:outline-none after:absolute after:inset-0 after:content-['']">${escapeHtml(w.title)}</a></h2>
    <p class="font-body-sm text-[#d2c6a2]">${escapeHtml(w.summary)}</p>
    <div class="mt-auto pt-space-sm flex flex-wrap gap-space-xs font-label-sm text-label-sm text-[#A1A1AA]">
      <span class="border border-[#332e1f] px-space-xs py-1 uppercase text-[#F5C842]">${escapeHtml(w.discipline)}</span>
      <span class="border border-[#332e1f] px-space-xs py-1 uppercase">${escapeHtml(w.year)}</span>
    </div>
  </div>
</article>`
    )
    .join("");
}

function journalList(posts) {
  return posts
    .map(
      (p, i) => `<article class="interactive-card reveal-item bg-[#121316] border border-[#332e1f] p-space-lg flex flex-col group" style="transition-delay:${i * 60}ms">
  <div class="flex items-center justify-between font-label-sm text-label-sm uppercase tracking-widest mb-space-sm">
    <span class="text-[#F5C842]">${escapeHtml(p.category)}</span>
    <span class="text-[#A1A1AA]">${fmtDate(p.date)}</span>
  </div>
  <h2 class="font-headline-sm text-headline-sm uppercase text-white font-bold group-hover:text-[#ffe08f] transition-colors"><a href="${postHref(p)}" class="focus:outline-none">${escapeHtml(p.title)}</a></h2>
  <p class="font-body-md text-body-md text-[#d2c6a2] mt-space-sm">${escapeHtml(p.excerpt)}</p>
  <div class="mt-auto pt-space-lg flex items-center justify-between font-label-sm text-label-sm uppercase">
    <span class="text-[#A1A1AA]">${escapeHtml(p.readingTime)} read</span>
    <span class="text-white group-hover:text-[#F5C842] inline-flex items-center transition-colors">READ <span aria-hidden="true" class="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span></span>
  </div>
</article>`
    )
    .join("");
}

function teamGrid() {
  const team = [
    ["team-director.png", "Design leads", "Decides what the work should look like and why."],
    ["team-creative-technologist.png", "Web and digital", "Builds the websites and app screens we design."],
    ["team-packaging-engineer.png", "Print and materials", "Makes sure the design survives being printed and made."],
    ["team-typographer.png", "Typography", "Chooses and draws the typefaces that carry the brand."],
  ];
  return team
    .map(
      ([img, role, blurb], i) => `<div class="interactive-card reveal-item bg-[#121316] border border-[#332e1f] overflow-hidden group" style="transition-delay:${i * 60}ms">
  <div class="relative w-full h-72 overflow-hidden"><img alt="" class="case-study-img w-full h-full object-cover" src="/assets/img/${img}" loading="lazy" decoding="async"><span class="absolute inset-0 bg-gradient-to-t from-[#121316] via-transparent to-transparent"></span></div>
  <div class="p-space-md">
    <span class="font-label-sm text-label-sm text-[#F5C842] uppercase tracking-widest">${escapeHtml(role)}</span>
    <p class="font-body-sm text-[#d2c6a2] mt-space-xs">${escapeHtml(blurb)}</p>
  </div>
</div>`
    )
    .join("");
}

/* ------------------------------------------------------------------ */
/* Emit pages                                                          */
/* ------------------------------------------------------------------ */

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, "assets"), { recursive: true });
await mkdir(path.join(DIST, "work"), { recursive: true });
await mkdir(path.join(DIST, "journal"), { recursive: true });

const emit = async (outPath, rel, data) => {
  const html = await render(rel, data);
  await writeFile(path.join(DIST, outPath), html, "utf8");
  return outPath;
};

const homeData = {
  ...base("home"),
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  url: site.url + "/",
  disciplines: site.disciplines.map(disciplineCard).join(""),
  marquee: marquee(),
  telemetry: telemetryStrip(),
  cases: work.slice(0, 5).map(workCard).join(""),
  totalWork: work.length,
};

await emit("index.html", "pages/home.html", homeData);
await emit("work/index.html", "pages/work-index.html", {
  ...base("works"),
  title: `Selected Works — ${site.name}`,
  description: `Selected commissions from ${site.name}: packaging, brand identity, web platforms and print.`,
  url: site.url + "/work/",
  telemetry: telemetryStrip(),
  cards: workIndexCards(),
  count: work.length,
  nextOrdinal: String(work.length + 1).padStart(2, "0"),
});

for (const w of work) {
  const next = w.next ? work.find((x) => x.slug === w.next) : null;
  const prev = (() => {
    const i = work.findIndex((x) => x.slug === w.slug);
    return work[(i - 1 + work.length) % work.length];
  })();

  await emit(`work/${w.slug}.html`, "pages/work-detail.html", {
    ...base("works"),
    title: `${w.title} — ${site.name}`,
    description: w.summary,
    url: site.url + workHref(w),
    w,
    image: imgSrc(w),
    ogImage: (() => {
      const src = imgSrc(w);
      return /^https?:\/\//.test(src) ? src : site.url + src;
    })(),
    approach: w.approach.map((a) => `<li>${escapeHtml(a)}</li>`).join(""),
    outcomes: w.outcome
      .map(
        (o) => `<div class="border border-[#332e1f] bg-[#121316] p-space-md">
    <div class="font-headline-md text-headline-md font-extrabold text-white tracking-tight">${escapeHtml(o.value)}</div>
    <div class="font-label-sm text-label-sm uppercase tracking-wider text-[#F5C842] mt-1">${escapeHtml(o.label)}</div>
  </div>`
      )
      .join(""),
    roles: w.role.map((r) => `<span class="border border-[#332e1f] px-space-xs py-1 uppercase">${escapeHtml(r)}</span>`).join(""),
    stack: w.stack.map((s) => `<span class="border border-[#332e1f] px-space-xs py-1 uppercase text-[#F5C842]">${escapeHtml(s)}</span>`).join(""),
    nextHref: next ? workHref(next) : null,
    nextTitle: next ? next.title : null,
    nextIndex: next ? next.index : null,
    prevHref: workHref(prev),
    prevTitle: prev.title,
  });
}

await emit("journal/index.html", "pages/journal-index.html", {
  ...base("journal"),
  title: `Journal — ${site.name}`,
  description: `Notes on craft, process and materials from the ${site.name} studio.`,
  url: site.url + "/journal/",
  telemetry: telemetryStrip(),
  posts: journalList(journal),
  count: journal.length,
});

for (const p of journal) {
  const i = journal.findIndex((x) => x.slug === p.slug);
  const older = journal[(i + 1) % journal.length];
  await emit(`journal/${p.slug}.html`, "pages/journal-post.html", {
    ...base("journal"),
    title: `${p.title} — ${site.name}`,
    description: p.excerpt,
    url: site.url + postHref(p),
    p,
    body: p.body,
    dateLabel: fmtDate(p.date),
    olderHref: postHref(older),
    olderTitle: older.title,
  });
}

await emit("about.html", "pages/about.html", {
  ...base("studio"),
  title: `Studio — ${site.name}`,
  description: `${site.name} is a graphic design studio working across packaging, identity, web and print.`,
  url: site.url + "/about.html",
  telemetry: telemetryStrip(),
  team: teamGrid(),
  disciplines: site.disciplines.map(disciplineCard).join(""),
});

await emit("commission.html", "pages/commission.html", {
  ...base("commission"),
  title: `Initiate Commission — ${site.name}`,
  description: `Start a commission with ${site.name}.`,
  url: site.url + "/commission.html",
  telemetry: telemetryStrip(),
  email: site.email,
});

/* static assets */
await cp(path.join(SRC, "assets", "img"), path.join(DIST, "assets", "img"), { recursive: true });
await cp(path.join(SRC, "assets", "js"), path.join(DIST, "assets", "js"), { recursive: true });

/* 404 */
await writeFile(
  path.join(DIST, "404.html"),
  await render("pages/404.html", {
    ...base(""),
    title: `Not Found — ${site.name}`,
    description: "Page not found.",
    url: site.url,
  }),
  "utf8"
);

console.log(`built ${work.length} case studies, ${journal.length} journal posts`);
