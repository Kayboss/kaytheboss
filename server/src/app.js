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
