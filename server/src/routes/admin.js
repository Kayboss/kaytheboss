import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import {
  allWork,
  allJournal,
  getWorkBySlug,
  getJournalBySlug,
  getSite,
  setSite,
  upsertWork,
  upsertJournal,
  getStats,
  workYears,
  journalCategories,
  reorderWork,
  reorderJournal,
  allEnquiries,
  getEnquiry,
  enquiryCounts,
  updateEnquiryStatus,
  saveEnquiryDraftReply,
  deleteEnquiry,
} from "../lib/content.js";
import { mailConfigured, sendEnquiryReply } from "../lib/mailer.js";
import { sqlite, ROOT } from "../db/client.js";
import {
  dashboard,
  login,
  workForm,
  journalForm,
  settingsForm,
  workList,
  journalList,
  emailsList,
  emailDetail,
  mediaLibrary,
} from "../views/admin-forms.js";
import {
  listMedia,
  saveUpload,
  deleteMedia,
  resolveMedia,
  mimeFor,
  MAX_UPLOAD_BYTES,
} from "../lib/media.js";
import {
  authenticate,
  createSession,
  getUserForToken,
  destroySession,
} from "../lib/auth.js";

const ASSET_DIR = path.join(ROOT, "server", "src", "assets");
const IMG_DIR = path.join(ROOT, "src", "assets", "img");

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

function parseList(v) {
  if (Array.isArray(v)) return v;
  return String(v ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOutcome(v) {
  return parseList(v).map((line) => {
    const [value, label] = line.split("|").map((s) => s.trim());
    return { value: value || "", label: label || "" };
  });
}

function coerceInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

function workFromBody(slug, b) {
  return {
    slug,
    index: String(b.index || "").trim(),
    title: String(b.title || "").trim(),
    year: String(b.year || "").trim(),
    discipline: String(b.discipline || "").trim(),
    series: String(b.series || "").trim(),
    size: String(b.size || "wide").trim(),
    image: String(b.image || "").trim(),
    alt: String(b.alt || "").trim(),
    summary: String(b.summary || "").trim(),
    client: String(b.client || "").trim(),
    tldr: String(b.tldr || "").trim(),
    challenge: String(b.challenge || "").trim(),
    pullQuote: String(b.pullQuote || "").trim(),
    quoteBy: String(b.quoteBy || "").trim(),
    next: String(b.next || "").trim() || null,
    role: parseList(b.role),
    stack: parseList(b.stack),
    approach: parseList(b.approach),
    outcome: parseOutcome(b.outcome),
    sortOrder: coerceInt(b.sortOrder, 0),
  };
}

function journalFromBody(slug, b) {
  return {
    slug,
    title: String(b.title || "").trim(),
    date: String(b.date || "").trim(),
    category: String(b.category || "").trim(),
    readingTime: String(b.readingTime || "").trim(),
    excerpt: String(b.excerpt || "").trim(),
    body: String(b.body || "").trim(),
    sortOrder: coerceInt(b.sortOrder, 0),
  };
}

function flashOf(request) {
  const q = request.query || {};
  if (q.saved) return { type: "ok", message: "Changes saved." };
  if (q.sent) return { type: "ok", message: "Reply sent." };
  if (q.deleted) return { type: "ok", message: "Item deleted." };
  if (q.status) return { type: "ok", message: "Status updated." };
  if (q.err) return { type: "err", message: String(q.err) };
  return null;
}

export default async function adminRoutes(app) {
  const requireAuth = async (request, reply) => {
    const user = getUserForToken(request.cookies?.admin_session);
    if (!user) return reply.redirect("/admin/login");
    request.user = user;
  };

  /* ---------------- Static assets (public) ---------------- */

  app.get("/admin/assets/:file", async (request, reply) => {
    const file = path.basename(request.params.file);
    const full = path.join(ASSET_DIR, file);
    if (!full.startsWith(ASSET_DIR) || !existsSync(full)) {
      return reply.code(404).send("Not found");
    }
    const ext = path.extname(full).toLowerCase();
    reply.type(
      ext === ".css"
        ? "text/css; charset=utf-8"
        : ext === ".js"
        ? "application/javascript; charset=utf-8"
        : "application/octet-stream"
    );
    return reply.send(createReadStream(full));
  });

  app.get("/admin/img/:file", async (request, reply) => {
    const file = path.basename(request.params.file);
    const full = path.join(IMG_DIR, file);
    if (!full.startsWith(IMG_DIR) || !existsSync(full)) {
      return reply.code(404).send("Not found");
    }
    reply.type(MIME[path.extname(full).toLowerCase()] || "application/octet-stream");
    return reply.send(createReadStream(full));
  });

  /* ---------------- Media library (uploads) ---------------- */

  // Public: uploaded media is served to the live site too.
  app.get("/media/:file", async (request, reply) => {
    const full = resolveMedia(request.params.file);
    if (!full) return reply.code(404).send("Not found");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    // Uploaded SVGs are untrusted: block scripts if opened directly.
    reply.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    reply.type(mimeFor(full));
    return reply.send(createReadStream(full));
  });

  app.get("/admin/media", { preHandler: requireAuth }, async (request, reply) => {
    return reply.type("text/html").send(
      mediaLibrary({ media: listMedia(), user: request.user, flash: flashOf(request) })
    );
  });

  app.get("/admin/media/list", { preHandler: requireAuth }, async () => ({
    ok: true,
    media: listMedia(),
  }));

  app.post(
    "/admin/media/upload",
    { preHandler: requireAuth, bodyLimit: MAX_UPLOAD_BYTES + 4096 },
    async (request, reply) => {
      if (!Buffer.isBuffer(request.body)) {
        return reply.code(400).send({ ok: false, error: "Expected a binary image body." });
      }
      const name = request.query?.name ? String(request.query.name) : "";
      try {
        const saved = saveUpload(request.body, name);
        return { ok: true, ...saved };
      } catch (e) {
        return reply.code(400).send({ ok: false, error: e.message });
      }
    }
  );

  app.post("/admin/media/delete", { preHandler: requireAuth }, async (request, reply) => {
    const name = String(request.body?.name || "");
    const ok = deleteMedia(name);
    if (!ok) return reply.code(404).send({ ok: false, error: "Media not found" });
    return { ok: true };
  });

  /* ---------------- Auth ---------------- */

  app.get("/admin/login", async (request, reply) => {
    if (getUserForToken(request.cookies?.admin_session)) return reply.redirect("/admin");
    return reply.type("text/html").send(login(null));
  });

  app.post("/admin/login", async (request, reply) => {
    const { email, password } = request.body || {};
    const user = authenticate(email, password);
    if (!user) {
      return reply.code(401).type("text/html").send(login("Invalid email or password"));
    }
    const { token, expiresAt } = createSession(user.id);
    reply.setCookie("admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt),
    });
    return reply.redirect("/admin");
  });

  app.post("/admin/logout", async (request, reply) => {
    destroySession(request.cookies?.admin_session);
    reply.clearCookie("admin_session", { path: "/" });
    return reply.redirect("/admin/login");
  });

  /* ---------------- Dashboard ---------------- */

  app.get("/admin", { preHandler: requireAuth }, async (request, reply) => {
    const stats = getStats();
    const counts = enquiryCounts();
    const work = allWork().slice(0, 4);
    const journal = allJournal().slice(-5).reverse();
    return reply.type("text/html").send(
      dashboard({
        stats: { ...stats, user: request.user, enquiries: counts },
        work,
        journal,
      })
    );
  });

  /* ---------------- Work ---------------- */

  app.get("/admin/work", { preHandler: requireAuth }, async (request, reply) => {
    return reply.type("text/html").send(
      workList({
        work: allWork(),
        years: workYears(),
        user: request.user,
        flash: flashOf(request),
      })
    );
  });

  app.get("/admin/work/new", { preHandler: requireAuth }, async (request, reply) => {
    return reply.type("text/html").send(
      workForm({ w: {}, isNew: true, err: null, user: request.user })
    );
  });

  app.get("/admin/work/:slug/edit", { preHandler: requireAuth }, async (request, reply) => {
    const w = getWorkBySlug(request.params.slug);
    if (!w) {
      return reply.code(404).type("text/html").send(
        workForm({ w: { slug: request.params.slug }, isNew: false, err: "Work not found", user: request.user })
      );
    }
    return reply.type("text/html").send(
      workForm({ w, isNew: false, err: null, user: request.user })
    );
  });

  app.post("/admin/work/reorder", { preHandler: requireAuth }, async (request, reply) => {
    const order = request.body?.order;
    if (!Array.isArray(order)) return reply.code(400).send({ ok: false });
    reorderWork(order.map(String));
    return { ok: true };
  });

  app.post("/admin/work", { preHandler: requireAuth }, async (request, reply) => {
    const b = request.body || {};
    const slug = String(b.slug || "").trim();
    if (!slug) {
      return reply.code(400).type("text/html").send(
        workForm({ w: workFromBody("", b), isNew: true, err: "Slug is required", user: request.user })
      );
    }
    upsertWork(workFromBody(slug, b), coerceInt(b.sortOrder, 0));
    return reply.redirect("/admin/work?saved=1");
  });

  app.post("/admin/work/:slug", { preHandler: requireAuth }, async (request, reply) => {
    const w = workFromBody(request.params.slug, request.body || {});
    upsertWork(w, w.sortOrder);
    return reply.redirect("/admin/work?saved=1");
  });

  app.post("/admin/work/:slug/delete", { preHandler: requireAuth }, async (request, reply) => {
    sqlite.prepare("DELETE FROM work WHERE slug = ?").run(request.params.slug);
    return reply.redirect("/admin/work?deleted=1");
  });

  /* ---------------- Journal ---------------- */

  app.get("/admin/journal", { preHandler: requireAuth }, async (request, reply) => {
    return reply.type("text/html").send(
      journalList({
        journal: allJournal(),
        categories: journalCategories(),
        user: request.user,
        flash: flashOf(request),
      })
    );
  });

  app.get("/admin/journal/new", { preHandler: requireAuth }, async (request, reply) => {
    return reply.type("text/html").send(
      journalForm({ p: {}, isNew: true, err: null, user: request.user })
    );
  });

  app.get("/admin/journal/:slug/edit", { preHandler: requireAuth }, async (request, reply) => {
    const p = getJournalBySlug(request.params.slug);
    if (!p) {
      return reply.code(404).type("text/html").send(
        journalForm({ p: { slug: request.params.slug }, isNew: false, err: "Post not found", user: request.user })
      );
    }
    return reply.type("text/html").send(
      journalForm({ p, isNew: false, err: null, user: request.user })
    );
  });

  app.post("/admin/journal/reorder", { preHandler: requireAuth }, async (request, reply) => {
    const order = request.body?.order;
    if (!Array.isArray(order)) return reply.code(400).send({ ok: false });
    reorderJournal(order.map(String));
    return { ok: true };
  });

  app.post("/admin/journal", { preHandler: requireAuth }, async (request, reply) => {
    const b = request.body || {};
    const slug = String(b.slug || "").trim();
    if (!slug) {
      return reply.code(400).type("text/html").send(
        journalForm({ p: journalFromBody("", b), isNew: true, err: "Slug is required", user: request.user })
      );
    }
    upsertJournal(journalFromBody(slug, b), coerceInt(b.sortOrder, 0));
    return reply.redirect("/admin/journal?saved=1");
  });

  app.post("/admin/journal/:slug", { preHandler: requireAuth }, async (request, reply) => {
    const p = journalFromBody(request.params.slug, request.body || {});
    upsertJournal(p, p.sortOrder);
    return reply.redirect("/admin/journal?saved=1");
  });

  app.post("/admin/journal/:slug/delete", { preHandler: requireAuth }, async (request, reply) => {
    sqlite.prepare("DELETE FROM journal WHERE slug = ?").run(request.params.slug);
    return reply.redirect("/admin/journal?deleted=1");
  });

  /* ---------------- Settings ---------------- */

  app.get("/admin/settings", { preHandler: requireAuth }, async (request, reply) => {
    return reply.type("text/html").send(
      settingsForm({ site: getSite() ?? {}, err: null, user: request.user, flash: flashOf(request) })
    );
  });

  app.post("/admin/settings", { preHandler: requireAuth }, async (request, reply) => {
    const b = request.body || {};
    try {
      const parsed = JSON.parse(String(b.site || "{}"));
      setSite(parsed);
      return reply.redirect("/admin/settings?saved=1");
    } catch (e) {
      return reply.code(400).type("text/html").send(
        settingsForm({ site: b.site, err: "Invalid JSON: " + e.message, user: request.user })
      );
    }
  });

  /* ---------------- Emails / enquiries ---------------- */

  app.get("/admin/emails", { preHandler: requireAuth }, async (request, reply) => {
    const status = request.query?.status ? String(request.query.status) : null;
    return reply.type("text/html").send(
      emailsList({
        emails: allEnquiries(status),
        counts: enquiryCounts(),
        user: request.user,
        flash: flashOf(request),
      })
    );
  });

  app.get("/admin/emails/:id", { preHandler: requireAuth }, async (request, reply) => {
    const e = getEnquiry(coerceInt(request.params.id, -1));
    if (!e) {
      return reply.code(404).type("text/html").send(
        emailsList({ emails: allEnquiries(), counts: enquiryCounts(), user: request.user, flash: { type: "err", message: "Enquiry not found." } })
      );
    }
    return reply.type("text/html").send(
      emailDetail({ e, user: request.user, flash: flashOf(request), mailConfigured: mailConfigured() })
    );
  });

  app.post("/admin/emails/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const ok = updateEnquiryStatus(coerceInt(request.params.id, -1), String(request.body?.status || ""));
    if (!ok) return reply.redirect(`/admin/emails/${request.params.id}?err=${encodeURIComponent("Could not update status.")}`);
    return reply.redirect(`/admin/emails/${request.params.id}?status=1`);
  });

  app.post("/admin/emails/:id/draft", { preHandler: requireAuth }, async (request, reply) => {
    saveEnquiryDraftReply(
      coerceInt(request.params.id, -1),
      String(request.body?.draftReply || "")
    );
    return reply.redirect(`/admin/emails/${request.params.id}?saved=1`);
  });

  /* Send the edited reply to the visitor through Resend. Saves the draft
     first so a failed send never loses what you typed. */
  app.post("/admin/emails/:id/reply", { preHandler: requireAuth }, async (request, reply) => {
    const id = coerceInt(request.params.id, -1);
    const e = getEnquiry(id);
    if (!e) {
      return reply.redirect(`/admin/emails?err=${encodeURIComponent("Enquiry not found.")}`);
    }

    const text = String(request.body?.draftReply || "").trim();
    if (!text) {
      return reply.redirect(
        `/admin/emails/${id}?err=${encodeURIComponent("Write a reply before sending.")}`
      );
    }
    saveEnquiryDraftReply(id, text);

    const subject =
      String(request.body?.subject || "").trim() || "Re: your enquiry - KaytheBoss";

    const result = await sendEnquiryReply({ to: e.email, subject, text });
    if (!result.sent) {
      const message =
        result.reason === "no-resend-key"
          ? "Sending is not set up yet - add RESEND_API_KEY to .env and restart, or use Reply by email."
          : `Could not send (${result.reason}). The draft is saved - use Reply by email instead.`;
      return reply.redirect(`/admin/emails/${id}?err=${encodeURIComponent(message)}`);
    }

    updateEnquiryStatus(id, "replied");
    return reply.redirect(`/admin/emails/${id}?sent=1`);
  });

  app.post("/admin/emails/:id/delete", { preHandler: requireAuth }, async (request, reply) => {
    deleteEnquiry(coerceInt(request.params.id, -1));
    return reply.redirect("/admin/emails?deleted=1");
  });
}
