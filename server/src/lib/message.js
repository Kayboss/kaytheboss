/* ------------------------------------------------------------------ */
/* Synced mail: storage, threading and enquiry matching.               */
/*                                                                     */
/* A message is linked to an enquiry when either:                      */
/*   1. its In-Reply-To / References headers point at a message we     */
/*      already stored for that enquiry (true thread), or              */
/*   2. an address on it matches the enquiry's email address.          */
/* ------------------------------------------------------------------ */

import { sqlite } from "../db/client.js";

const MAX_BODY = 200_000;

const map = (r) =>
  r && {
    id: r.id,
    enquiryId: r.enquiry_id ?? null,
    direction: r.direction,
    source: r.source,
    externalKey: r.external_key,
    messageId: r.message_id,
    inReplyTo: r.in_reply_to,
    references: r.references,
    fromName: r.from_name,
    fromEmail: r.from_email,
    toEmails: r.to_emails,
    ccEmails: r.cc_emails,
    subject: r.subject,
    snippet: r.snippet,
    bodyText: r.body_text,
    sentAt: r.sent_at,
    createdAt: r.created_at,
    /* joined in recentMessages() */
    enquiryName: r.enquiry_name ?? null,
    enquiryEmail: r.enquiry_email ?? null,
  };

/* ---------------- helpers ---------------- */

const addresses = (value) => {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.value)
      ? value.value
      : value
        ? [value]
        : [];
  return list
    .map((a) => (typeof a === "string" ? a : a?.address))
    .filter(Boolean)
    .map((a) => a.toLowerCase());
};

const idTokens = (...values) => {
  const text = values.flat().join(" ").trim();
  if (!text) return [];
  const bracketed = text.match(/<[^<>\s]+>/g);
  if (bracketed) {
    return bracketed.map((t) => t.replace(/^<|>$/g, "").toLowerCase());
  }
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => t.replace(/^<|>$/g, "").toLowerCase());
};

/* Message-IDs compare without their angle brackets. */
const cleanId = (value) => {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const tokens = idTokens(v);
  return tokens.length ? tokens[0] : v.replace(/^<|>$/g, "");
};

const oneLine = (s, max = 220) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

function htmlToText(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------------- matching ---------------- */

function enquiryFromThread(inReplyTo, references) {
  const tokens = idTokens(inReplyTo, references);
  if (!tokens.length) return null;
  const placeholders = tokens.map(() => "?").join(",");
  const row = sqlite
    .prepare(
      `SELECT enquiry_id FROM messages
        WHERE enquiry_id IS NOT NULL
          AND lower(message_id) IN (${placeholders})
        ORDER BY sent_at DESC LIMIT 1`
    )
    .get(...tokens);
  return row?.enquiry_id ?? null;
}

function enquiryFromAddress(list) {
  const found = [];
  for (const addr of list) {
    const row = sqlite
      .prepare("SELECT id FROM enquiries WHERE lower(email) = ? ORDER BY created_at DESC LIMIT 1")
      .get(addr);
    if (row?.id) found.push(row.id);
  }
  return found[0] ?? null;
}

export function findEnquiryId({ direction, fromEmail, toEmails = [], inReplyTo, references }) {
  const thread = enquiryFromThread(inReplyTo, references);
  if (thread) return thread;
  /* Inbound: the sender is the lead. Outbound: any recipient is. */
  return direction === "out" ? enquiryFromAddress(toEmails) : enquiryFromAddress([fromEmail]);
}

/* ---------------- writes ---------------- */

export function insertMessage(m) {
  const info = sqlite
    .prepare(
      `INSERT OR IGNORE INTO messages
         (enquiry_id, direction, source, external_key, message_id, in_reply_to,
          "references", from_name, from_email, to_emails, cc_emails, subject,
          snippet, body_text, sent_at, created_at)
       VALUES
         (@enquiryId, @direction, @source, @externalKey, @messageId, @inReplyTo,
          @references, @fromName, @fromEmail, @toEmails, @ccEmails, @subject,
          @snippet, @bodyText, @sentAt, @createdAt)`
    )
    .run({
      enquiryId: m.enquiryId ?? null,
      direction: m.direction ?? "in",
      source: m.source ?? "",
      externalKey: m.externalKey,
      messageId: m.messageId ?? "",
      inReplyTo: m.inReplyTo ?? "",
      references: m.references ?? "",
      fromName: m.fromName ?? "",
      fromEmail: m.fromEmail ?? "",
      toEmails: m.toEmails ?? "",
      ccEmails: m.ccEmails ?? "",
      subject: m.subject ?? "",
      snippet: m.snippet ?? "",
      bodyText: (m.bodyText ?? "").slice(0, MAX_BODY),
      sentAt: m.sentAt ?? Date.now(),
      createdAt: Date.now(),
    });
  return info.changes ? Number(info.lastInsertRowid) : null;
}

/* Turn a parsed mail (mailparser output) into our row shape. */
export function messageFromParsed(parsed, { folder, uid, uidvalidity, direction }) {
  const from = addresses(parsed.from)[0] ?? "";
  const fromObj = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
  const fromName = fromObj?.value?.[0]?.name ?? "";
  const to = addresses(parsed.to);
  const cc = addresses(parsed.cc);
  const body = parsed.text || htmlToText(parsed.html);
  return {
    direction,
    source: folder,
    externalKey: `${folder}:${uidvalidity ?? 0}:${uid}`,
    messageId: cleanId(parsed.messageId),
    inReplyTo: cleanId(parsed.inReplyTo),
    references: idTokens(parsed.references).join(" "),
    fromName,
    fromEmail: from,
    toEmails: to.join(", "),
    ccEmails: cc.join(", "),
    subject: oneLine(parsed.subject, 300),
    snippet: oneLine(body, 220),
    bodyText: body,
    sentAt: parsed.date instanceof Date ? parsed.date.getTime() : Date.now(),
    _addresses: { from, to },
  };
}

/* ---------------- reads ---------------- */

export function messagesForEnquiry(enquiryId) {
  return sqlite
    .prepare("SELECT * FROM messages WHERE enquiry_id = ? ORDER BY sent_at ASC, id ASC")
    .all(enquiryId)
    .map(map);
}

export function getMessage(id) {
  return map(sqlite.prepare("SELECT * FROM messages WHERE id = ?").get(id));
}

export function recentMessages(limit = 100) {
  return sqlite
    .prepare(
      `SELECT m.*, e.name AS enquiry_name, e.email AS enquiry_email
         FROM messages m
         LEFT JOIN enquiries e ON e.id = m.enquiry_id
        ORDER BY m.sent_at DESC, m.id DESC
        LIMIT ?`
    )
    .all(limit)
    .map(map);
}

export function messageCounts() {
  const rows = sqlite
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN enquiry_id IS NULL THEN 1 ELSE 0 END) AS unlinked,
              SUM(CASE WHEN direction = 'in' THEN 1 ELSE 0 END) AS inbound,
              SUM(CASE WHEN direction = 'out' THEN 1 ELSE 0 END) AS outbound,
              MAX(sent_at) AS latest
         FROM messages`
    )
    .get();
  return {
    total: rows?.total ?? 0,
    unlinked: rows?.unlinked ?? 0,
    inbound: rows?.inbound ?? 0,
    outbound: rows?.outbound ?? 0,
    latest: rows?.latest ?? null,
  };
}

export function messageCountsByEnquiry() {
  const rows = sqlite
    .prepare(
      `SELECT enquiry_id, COUNT(*) AS c FROM messages
        WHERE enquiry_id IS NOT NULL GROUP BY enquiry_id`
    )
    .all();
  return Object.fromEntries(rows.map((r) => [r.enquiry_id, r.c]));
}

export function lastMessageForEnquiry(enquiryId) {
  return map(
    sqlite
      .prepare("SELECT * FROM messages WHERE enquiry_id = ? ORDER BY sent_at DESC, id DESC LIMIT 1")
      .get(enquiryId)
  );
}

export function hasExternalKey(key) {
  return Boolean(sqlite.prepare("SELECT 1 FROM messages WHERE external_key = ?").get(key));
}
