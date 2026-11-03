/* ------------------------------------------------------------------ */
/* Mailbox sync over IMAP (Gmail / Google Workspace by default).       */
/*                                                                     */
/* Pulls the most recent messages from INBOX and the Sent folder,      */
/* files each one under the matching enquiry, and dedupes on           */
/* folder + UIDVALIDITY + UID so repeated runs are cheap.              */
/*                                                                     */
/* Env:                                                                */
/*   IMAP_USER=commissions@kaytheboss.studio                           */
/*   IMAP_PASSWORD=<Gmail app password>                                */
/*   IMAP_HOST=imap.gmail.com          (default)                       */
/*   IMAP_PORT=993                     (default)                       */
/*   IMAP_FOLDERS=INBOX,[Gmail]/Sent Mail                              */
/*   IMAP_SYNC_MINUTES=2               (background poll interval)      */
/*   IMAP_FETCH_LIMIT=40               (newest N per folder)           */
/*   IMAP_SINCE_DAYS=30                (ignore older mail on first run) */
/* ------------------------------------------------------------------ */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import {
  findEnquiryId,
  hasExternalKey,
  insertMessage,
  messageFromParsed,
} from "./message.js";

const DEFAULT_FOLDERS = "INBOX,[Gmail]/Sent Mail";

/* Folders whose messages count as outbound from the studio. */
const isSentFolder = (folder) =>
  /(^|[\\/\s._-])sent([\\/\s._-]|$)|sent mail|sent items/i.test(folder);

export function mailboxConfig() {
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;
  if (!user || !pass) return null;
  return {
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: Number(process.env.IMAP_PORT || 993),
    user,
    pass,
    folders: (process.env.IMAP_FOLDERS || DEFAULT_FOLDERS)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    fetchLimit: Math.max(1, Number(process.env.IMAP_FETCH_LIMIT || 40)),
    sinceDays: Math.max(1, Number(process.env.IMAP_SINCE_DAYS || 30)),
    syncMinutes: Math.max(1, Number(process.env.IMAP_SYNC_MINUTES || 2)),
  };
}

export const mailboxConfigured = () => Boolean(mailboxConfig());

/* Map one parsed mail onto an enquiry and store it. */
export function storeParsed(parsed, { folder, uid, uidvalidity, direction }) {
  const row = messageFromParsed(parsed, { folder, uid, uidvalidity, direction });
  if (!row.externalKey || hasExternalKey(row.externalKey)) return { added: false };

  row.enquiryId = findEnquiryId({
    direction: row.direction,
    fromEmail: row._addresses.from,
    toEmails: row._addresses.to,
    inReplyTo: row.inReplyTo,
    references: row.references,
  });
  delete row._addresses;

  const id = insertMessage(row);
  return { added: Boolean(id), linked: Boolean(row.enquiryId), id };
}

function clientFor(cfg) {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 993,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
    emitLogs: false,
  });
}

/* One sync pass. Never throws for a single bad folder/message. */
export async function syncMailbox({ log = console, limit, sinceDays } = {}) {
  const cfg = mailboxConfig();
  if (!cfg) return { skipped: true, reason: "not-configured" };

  const take = Math.max(1, limit ?? cfg.fetchLimit);
  const cutoff = Date.now() - (sinceDays ?? cfg.sinceDays) * 86_400_000;
  const summary = { folders: [], scanned: 0, added: 0, linked: 0, skipped: 0, errors: [] };

  const client = clientFor(cfg);
  await client.connect();
  try {
    for (const folder of cfg.folders) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
        const total = client.mailbox.exists || 0;
        summary.folders.push({ folder, total });
        if (!total) continue;

        const direction =
          client.mailbox.specialUse === "\\Sent" || isSentFolder(folder) ? "out" : "in";
        const from = Math.max(1, total - take + 1);
        const uidvalidity = Number(client.mailbox.uidValidity || 0);

        for await (const msg of client.fetch(`${from}:*`, {
          uid: true,
          envelope: true,
          source: true,
          internalDate: true,
        })) {
          summary.scanned++;
          try {
            const key = `${folder}:${uidvalidity}:${msg.uid}`;
            if (hasExternalKey(key)) {
              summary.skipped++;
              continue;
            }
            const when = msg.internalDate ? new Date(msg.internalDate).getTime() : 0;
            if (when && when < cutoff) {
              summary.skipped++;
              continue;
            }
            const parsed = await simpleParser(msg.source);
            const result = storeParsed(parsed, {
              folder,
              uid: msg.uid,
              uidvalidity,
              direction,
            });
            if (result.added) {
              summary.added++;
              if (result.linked) summary.linked++;
            } else {
              summary.skipped++;
            }
          } catch (err) {
            summary.errors.push(`${folder} uid ${msg.uid}: ${err.message}`);
          }
        }
      } catch (err) {
        summary.errors.push(`${folder}: ${err.message}`);
      } finally {
        if (lock) lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }

  if (log?.info) {
    log.info(
      { ...summary, folders: summary.folders.map((f) => f.folder) },
      "[mail] sync finished"
    );
  }
  return summary;
}

/* Background poller. Returns a stop function. */
export function startMailboxSync({ log = console } = {}) {
  const cfg = mailboxConfig();
  if (!cfg) {
    log.info?.("[mail] IMAP not configured - admin mail sync is off");
    return () => {};
  }

  let running = false;
  const run = async (why) => {
    if (running) return;
    running = true;
    try {
      const r = await syncMailbox({ log });
      if (r.added) log.info?.(`[mail] ${why}: ${r.added} new message(s), ${r.linked} linked`);
    } catch (err) {
      log.warn?.(`[mail] ${why} failed: ${err.message}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => run("poll"), cfg.syncMinutes * 60_000);
  timer.unref?.();
  const first = setTimeout(() => run("first run"), 5_000);
  first.unref?.();

  return () => {
    clearInterval(timer);
    clearTimeout(first);
  };
}
