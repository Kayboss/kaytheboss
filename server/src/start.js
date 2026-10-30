import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT || 8787);
/* Render (and most hosts) route traffic to 0.0.0.0, not loopback. Keep
   loopback locally so the admin is not exposed on the LAN by accident. */
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
