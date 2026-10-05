import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { default as commissionHandler } from "./api/commission.js";

const DIST = path.resolve("dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0].split("#")[0]);

  /* API route (local dev, so the enquiry form can be tested without Vercel). */
  if (url === "/api/commission") {
    let body = "";
    for await (const chunk of req) body += chunk;
    req.body = body;
    return commissionHandler(req, res);
  }

  let file = path.join(DIST, url);

  if (!file.startsWith(DIST)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const s = await stat(file);
    if (s.isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(DIST, "404.html");
  }

  try {
    const body = await readFile(file);
    const ext = path.extname(file);
    res.writeHead(ext === ".html" && file.endsWith("404.html") ? 404 : 200, {
      "content-type": TYPES[ext] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/html" });
    res.end(readFile(path.join(DIST, "404.html")).catch(() => "404"));
  }
}).listen(4321, () => console.log("preview on http://localhost:4321"));
