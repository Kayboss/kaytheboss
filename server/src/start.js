import { buildApp } from "./app.js";
import { startMailboxSync } from "./lib/mailbox.js";

const PORT = Number(process.env.PORT || 8787);
/* Render (and most hosts) route traffic to 0.0.0.0, not loopback. Keep
   loopback locally so the admin is not exposed on the LAN by accident. */
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");

async function start() {
  const app = await buildApp();

  /* IMAP polling: only runs while this process runs, and backfills the
     newest messages on every start. No-op when IMAP_* is not set. */
  const stopMail = startMailboxSync({
    log: {
      info: (a, b) => (b ? app.log.info(a, b) : app.log.info(a)),
      warn: (a, b) => (b ? app.log.warn(a, b) : app.log.warn(a)),
    },
  });

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    stopMail();
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    stopMail();
    app.log.error(err);
    process.exit(1);
  }
}

start();
