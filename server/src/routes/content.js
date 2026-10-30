import {
  allWork,
  allJournal,
  getSite,
  getWorkBySlug,
  getJournalBySlug,
  insertEnquiry,
} from "../lib/content.js";

const HONEYPOT = /\S/;

export default async function contentRoutes(app) {
  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/content", async () => {
    const site = getSite();
    const work = allWork();
    const journal = allJournal();
    return { site: site || {}, work, journal };
  });

  /* Public: capture a commission enquiry so it appears in the admin inbox. */
  app.post("/api/enquiry", async (request, reply) => {
    const b = request.body || {};
    if (HONEYPOT.test(String(b.company_website || "")) || b._gotcha) {
      return { ok: true };
    }
    const name = String(b.name || "").trim().slice(0, 120);
    const email = String(b.email || "").trim().slice(0, 160);
    const brief = String(b.brief || "").trim().slice(0, 4000);
    if (!name || !email || !brief || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ ok: false, error: "invalid" });
    }
    const id = insertEnquiry({
      name,
      email,
      company: String(b.company || "").trim().slice(0, 160),
      discipline: String(b.discipline || "").trim().slice(0, 40),
      budget: String(b.budget || "").trim().slice(0, 40),
      timeline: String(b.timeline || "").trim().slice(0, 120),
      nda: Boolean(b.nda),
      brief,
      draftReply: String(b.draftReply || "").slice(0, 8000),
      status: "new",
    });
    return { ok: true, id };
  });

  app.get("/api/site", async () => {
    const site = getSite();
    return site || {};
  });

  app.get("/api/work", async () => allWork());
  app.get("/api/work/:slug", async (request, reply) => {
    const w = getWorkBySlug(request.params.slug);
    if (!w) return reply.code(404).send({ error: "not found" });
    return w;
  });

  app.get("/api/journal", async () => allJournal());
  app.get("/api/journal/:slug", async (request, reply) => {
    const p = getJournalBySlug(request.params.slug);
    if (!p) return reply.code(404).send({ error: "not found" });
    return p;
  });
}
