import Fastify from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import contentRoutes from "./routes/content.js";
import adminRoutes from "./routes/admin.js";
import { pruneExpiredSessions } from "./lib/auth.js";

export async function buildApp() {
  pruneExpiredSessions();
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  /* Response hardening for every route. Routes may set a stricter value
     (the media route does for CSP); existing headers are left alone. */
  const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy":
      "default-src 'self'; base-uri 'self'; object-src 'none'; " +
      "frame-ancestors 'none'; form-action 'self'; " +
      "img-src 'self' data:; connect-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
  };

  app.addHook("onSend", async (_request, reply, payload) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!reply.hasHeader(name)) reply.header(name, value);
    }
    return payload;
  });

  await app.register(cookie, { parseOptions: {} });
  await app.register(formbody);

  // Raw binary body parser for media uploads (see routes/admin.js).
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body)
  );

  await app.register(contentRoutes);
  await app.register(adminRoutes);

  app.get("/", async (_request, reply) => reply.redirect("/admin"));

  app.get("/api", async () => ({
    name: "kaytheboss-api",
    version: "1.0.0",
    description: "KAYTHEBOSS self-hosted backend: content API + admin",
    endpoints: {
      health: "/api/health",
      content: "/api/content",
      admin: "/admin",
    },
  }));

  return app;
}
