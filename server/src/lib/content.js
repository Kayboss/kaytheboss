import { asc } from "drizzle-orm";
import { db, sqlite, schema } from "../db/client.js";

/* ---------------------------------------------------------------- */
/* Mapping: DB rows -> the exact JSON shape the frontend expects     */
/* ---------------------------------------------------------------- */

function mapWork(r) {
  return {
    slug: r.slug,
    index: r.index,
    title: r.title,
    year: r.year,
    discipline: r.discipline,
    series: r.series,
    size: r.size,
    image: r.image,
    alt: r.alt,
    summary: r.summary,
    client: r.client,
    role: r.role ?? [],
    stack: r.stack ?? [],
    tldr: r.tldr,
    challenge: r.challenge,
    approach: r.approach ?? [],
    outcome: r.outcome ?? [],
    pullQuote: r.pullQuote,
    quoteBy: r.quoteBy,
    next: r.next ?? null,
    sortOrder: r.sortOrder ?? 0,
    updatedAt: r.updatedAt ?? null,
  };
}

function mapJournal(r) {
  return {
    slug: r.slug,
    title: r.title,
    date: r.date,
    category: r.category,
    readingTime: r.readingTime,
    excerpt: r.excerpt,
    body: r.body,
    sortOrder: r.sortOrder ?? 0,
    updatedAt: r.updatedAt ?? null,
  };
}

/* ---------------------------------------------------------------- */
/* Reads                                                             */
/* ---------------------------------------------------------------- */

export function allWork() {
  const rows = db
    .select()
    .from(schema.work)
    .orderBy(asc(schema.work.sortOrder), asc(schema.work.id))
    .all();
  return rows.map(mapWork);
}

export function getWorkBySlug(slug) {
  const rows = allWork();
  return rows.find((w) => w.slug === slug) ?? null;
}

export function allJournal() {
  const rows = db
    .select()
    .from(schema.journal)
    .orderBy(asc(schema.journal.sortOrder), asc(schema.journal.id))
    .all();
  return rows.map(mapJournal);
}

export function getJournalBySlug(slug) {
  return allJournal().find((p) => p.slug === slug) ?? null;
}

export function getSite() {
  const rows = db.select().from(schema.settings).all();
  const row = rows.find((r) => r.key === "site");
  return row?.value ?? null;
}

export function setSite(value) {
  sqlite.prepare(
    `INSERT INTO settings (key, value) VALUES ('site', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(JSON.stringify(value));
}

/* ---------------------------------------------------------------- */
/* Aggregates                                                        */
/* ---------------------------------------------------------------- */

export function getStats() {
  const w = sqlite
    .prepare("SELECT COUNT(*) AS c, MAX(updated_at) AS t FROM work")
    .get();
  const j = sqlite
    .prepare("SELECT COUNT(*) AS c, MAX(updated_at) AS t FROM journal")
    .get();
  const lastUpdated = Math.max(w?.t || 0, j?.t || 0) || null;
  return { workCount: w?.c ?? 0, journalCount: j?.c ?? 0, lastUpdated };
}

export function workYears() {
  const rows = sqlite
    .prepare("SELECT DISTINCT year FROM work WHERE year != '' ORDER BY year DESC")
    .all();
  return rows.map((r) => r.year);
}

export function journalCategories() {
  const rows = sqlite
    .prepare("SELECT DISTINCT category FROM journal WHERE category != '' ORDER BY category")
    .all();
  return rows.map((r) => r.category);
}

/* ---------------------------------------------------------------- */
/* Reordering                                                        */
/* ---------------------------------------------------------------- */

export function reorderWork(order) {
  const stmt = sqlite.prepare("UPDATE work SET sort_order = ? WHERE slug = ?");
  const run = sqlite.transaction((list) => {
    list.forEach((slug, i) => stmt.run(i, slug));
  });
  run(order);
}

export function reorderJournal(order) {
  const stmt = sqlite.prepare("UPDATE journal SET sort_order = ? WHERE slug = ?");
  const run = sqlite.transaction((list) => {
    list.forEach((slug, i) => stmt.run(i, slug));
  });
  run(order);
}

/* ---------------------------------------------------------------- */
/* Writes (used by the seed script and admin)                        */
/* ---------------------------------------------------------------- */

export function upsertWork(item, sortOrder = 0) {
  const w = mapWork({ ...item, index: item.index, next: item.next ?? null });
  sqlite.prepare(
    `INSERT INTO work (
      slug, "index", title, year, discipline, series, size, image, alt, summary,
      client, role, stack, tldr, challenge, approach, outcome, pull_quote, quote_by,
      next, sort_order, updated_at
    ) VALUES (
      @slug, @index, @title, @year, @discipline, @series, @size, @image, @alt, @summary,
      @client, @role, @stack, @tldr, @challenge, @approach, @outcome, @pullQuote, @quoteBy,
      @next, @sortOrder, @updatedAt
    )
    ON CONFLICT(slug) DO UPDATE SET
      "index"=excluded."index", title=excluded.title, year=excluded.year,
      discipline=excluded.discipline, series=excluded.series, size=excluded.size,
      image=excluded.image, alt=excluded.alt, summary=excluded.summary,
      client=excluded.client, role=excluded.role, stack=excluded.stack,
      tldr=excluded.tldr, challenge=excluded.challenge, approach=excluded.approach,
      outcome=excluded.outcome, pull_quote=excluded.pull_quote, quote_by=excluded.quote_by,
      next=excluded.next, sort_order=excluded.sort_order, updated_at=excluded.updated_at`
  ).run({
    slug: w.slug,
    index: w.index,
    title: w.title,
    year: w.year,
    discipline: w.discipline,
    series: w.series,
    size: w.size,
    image: w.image,
    alt: w.alt,
    summary: w.summary,
    client: w.client,
    role: JSON.stringify(w.role),
    stack: JSON.stringify(w.stack),
    tldr: w.tldr,
    challenge: w.challenge,
    approach: JSON.stringify(w.approach),
    outcome: JSON.stringify(w.outcome),
    pullQuote: w.pullQuote,
    quoteBy: w.quoteBy,
    next: w.next,
    sortOrder,
    updatedAt: Date.now(),
  });
}

export function upsertJournal(item, sortOrder = 0) {
  const p = mapJournal(item);
  sqlite.prepare(
    `INSERT INTO journal (slug, title, date, category, reading_time, excerpt, body, sort_order, updated_at)
     VALUES (@slug, @title, @date, @category, @readingTime, @excerpt, @body, @sortOrder, @updatedAt)
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title, date=excluded.date, category=excluded.category,
       reading_time=excluded.reading_time, excerpt=excluded.excerpt, body=excluded.body,
       sort_order=excluded.sort_order, updated_at=excluded.updated_at`
  ).run({
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    readingTime: p.readingTime,
    excerpt: p.excerpt,
    body: p.body,
    sortOrder,
    updatedAt: Date.now(),
  });
}

/* ---------------------------------------------------------------- */
/* Enquiries (commission leads emailed to the studio)                */
/* ---------------------------------------------------------------- */

const ENQUIRY_STATUS = ["new", "replied", "won", "lost", "spam"];

function mapEnquiry(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    company: r.company,
    discipline: r.discipline,
    budget: r.budget,
    timeline: r.timeline,
    nda: !!r.nda,
    brief: r.brief,
    draftReply: r.draft_reply,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function allEnquiries(status = null) {
  const rows = status
    ? sqlite.prepare("SELECT * FROM enquiries WHERE status = ? ORDER BY created_at DESC").all(status)
    : sqlite.prepare("SELECT * FROM enquiries ORDER BY created_at DESC").all();
  return rows.map(mapEnquiry);
}

export function getEnquiry(id) {
  return mapEnquiry(sqlite.prepare("SELECT * FROM enquiries WHERE id = ?").get(id) ?? null);
}

export function enquiryCounts() {
  const rows = sqlite.prepare("SELECT status, COUNT(*) AS c FROM enquiries GROUP BY status").all();
  const out = { all: 0, new: 0, replied: 0, won: 0, lost: 0, spam: 0 };
  for (const r of rows) {
    out[r.status] = r.c;
    out.all += r.c;
  }
  return out;
}

/* Counts for the sidebar badges, always accurate regardless of page. */
export function navCounts() {
  const s = getStats();
  return { work: s.workCount, journal: s.journalCount, emails: enquiryCounts().new };
}

export function updateEnquiryStatus(id, status) {
  if (!ENQUIRY_STATUS.includes(status)) return false;
  const info = sqlite
    .prepare("UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, Date.now(), id);
  return info.changes > 0;
}

export function saveEnquiryDraftReply(id, draftReply) {
  const info = sqlite
    .prepare("UPDATE enquiries SET draft_reply = ?, updated_at = ? WHERE id = ?")
    .run(draftReply, Date.now(), id);
  return info.changes > 0;
}

export function deleteEnquiry(id) {
  const info = sqlite.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
  return info.changes > 0;
}

export function insertEnquiry(e) {
  const info = sqlite
    .prepare(
      `INSERT INTO enquiries (name, email, company, discipline, budget, timeline, nda, brief, draft_reply, status, created_at, updated_at)
       VALUES (@name, @email, @company, @discipline, @budget, @timeline, @nda, @brief, @draftReply, @status, @createdAt, @updatedAt)`
    )
    .run({
      name: e.name ?? "",
      email: e.email ?? "",
      company: e.company ?? "",
      discipline: e.discipline ?? "",
      budget: e.budget ?? "",
      timeline: e.timeline ?? "",
      nda: e.nda ? 1 : 0,
      brief: e.brief ?? "",
      draftReply: e.draftReply ?? "",
      status: e.status ?? "new",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  return Number(info.lastInsertRowid);
}
