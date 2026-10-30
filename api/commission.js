/* ------------------------------------------------------------------ */
/* POST /api/commission                                                */
/* Receives a project enquiry, drafts a reply, stores it in Sanity and */
/* emails the owner. The client never receives the draft directly -    */
/* the owner reviews and sends. Node req/res, works on Vercel and in    */
/* the local preview server.                                           */
/* ------------------------------------------------------------------ */

import { draftReply } from "./_lib/draft.js";
import { saveEnquiry } from "./_lib/sanity.js";
import { emailEnquiry } from "./_lib/email.js";
import { STUDIO } from "./_lib/studio.js";

/* Simple in-memory throttle to blunt casual spam. Resets on cold start,
   which is fine for a studio site. */
const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000; // per hour
const MAX_PER_HOUR = 6;

function throttled(ip) {
  const now = Date.now();
  const n = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  n.push(now);
  hits.set(ip, n);
  return n.length > MAX_PER_HOUR;
}

function json(res, code, body) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

/* Save the enquiry to the self-hosted admin inbox. Off unless CONTENT_API_URL
   (or ADMIN_INBOX_URL) is set, so nothing breaks on a plain Vercel deploy. */
async function mirrorToInbox(enquiry) {
  const base = process.env.CONTENT_API_URL || process.env.ADMIN_INBOX_URL;
  if (!base) return;
  try {
    const res = await fetch(base.replace(/\/$/, "") + "/api/enquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(enquiry),
    });
    if (!res.ok) console.error("[enquiry] inbox mirror failed:", res.status);
  } catch (err) {
    console.error("[enquiry] inbox mirror error:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      configured: {
        sanity: Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN),
        llm: Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
        email: Boolean(process.env.RESEND_API_KEY),
      },
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method-not-allowed" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (throttled(ip)) {
    return json(res, 429, { ok: false, error: "too-many" });
  }

  /* Collect the JSON body (Vercel parses it already; raw otherwise). */
  let e = req.body;
  if (typeof e === "string") {
    try {
      e = JSON.parse(e || "{}");
    } catch {
      e = {};
    }
  }
  e = e || {};

  /* Honeypot: bots fill hidden inputs. Act like it worked, quietly. */
  if (e.company_website || e._gotcha) {
    return json(res, 200, { ok: true });
  }

  const name = (e.name || "").trim().slice(0, 120);
  const email = (e.email || "").trim().slice(0, 160);
  const brief = (e.brief || "").trim().slice(0, 4000);

  if (!name || !email || !brief) {
    return json(res, 400, { ok: false, error: "missing-fields" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { ok: false, error: "bad-email" });
  }

  const enquiry = {
    name,
    email,
    company: (e.company || "").trim().slice(0, 160),
    discipline: (e.discipline || "").trim().slice(0, 40),
    budget: (e.budget || "").trim().slice(0, 40),
    timeline: (e.timeline || "").trim().slice(0, 120),
    nda: Boolean(e.nda),
    brief,
  };

  /* 1. Draft a reply (never throws outward). */
  let draft = "";
  try {
    draft = await draftReply(enquiry);
  } catch (err) {
    console.error("[enquiry] draft failed:", err.message);
    draft = `Hi ${name.split(" ")[0]}, thanks for reaching out. I've got your brief and will reply properly within ${STUDIO.replyWithin}. - Zac, KaytheBoss`;
  }
  enquiry.draftReply = draft;

  /* 2. Store it in Sanity (non-fatal). */
  await saveEnquiry(enquiry);

  /* 2b. Mirror it into the local admin inbox (non-fatal, never blocks). */
  await mirrorToInbox(enquiry);

  /* 3. Email the owner (non-fatal - if email fails but Sanity saved, still ok). */
  await emailEnquiry(enquiry);

  /* 4. Tell the visitor their note landed. Generic on purpose. */
  return json(res, 200, {
    ok: true,
    message: `Thanks - Zac will reply within ${STUDIO.replyWithin}.`,
  });
}