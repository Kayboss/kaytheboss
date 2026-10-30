/* ------------------------------------------------------------------ */
/* Media library: uploads live in <root>/public/media and are served   */
/* from /media/<file>. The static build copies them into dist/media.   */
/* ------------------------------------------------------------------ */
import {
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { ROOT } from "../db/client.js";

export const MEDIA_DIR = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.join(ROOT, "public", "media");
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export const ALLOWED_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
]);

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

const extOf = (name) => path.extname(String(name || "")).toLowerCase();
const fullPath = (name) => path.join(MEDIA_DIR, name);

export const MEDIA_URL = (name) => `/media/${name}`;

export const mimeFor = (name) => MIME[extOf(name)] || "application/octet-stream";

export function ensureMediaDir() {
  mkdirSync(MEDIA_DIR, { recursive: true });
}

function splitName(original) {
  const base = path.basename(String(original || ""));
  const ext = extOf(base);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Unsupported file type. Use PNG, JPG, WEBP, GIF, SVG or AVIF.");
  }
  let stem = base.slice(0, base.length - ext.length);
  stem = stem
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
  if (!stem) stem = "image-" + Date.now().toString(36);
  return { stem, ext };
}

function uniqueName(stem, ext) {
  ensureMediaDir();
  let name = stem + ext;
  let i = 1;
  while (existsSync(fullPath(name))) {
    name = `${stem}-${i}${ext}`;
    i += 1;
  }
  return name;
}

export function listMedia() {
  ensureMediaDir();
  return readdirSync(MEDIA_DIR)
    .filter((f) => !f.startsWith(".") && ALLOWED_EXT.has(extOf(f)))
    .map((f) => {
      const st = statSync(fullPath(f));
      return { name: f, url: MEDIA_URL(f), size: st.size, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

export function saveUpload(buffer, originalName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Empty file");
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("File is larger than 12 MB");
  }
  const { stem, ext } = splitName(originalName);
  const name = uniqueName(stem, ext);
  writeFileSync(fullPath(name), buffer);
  return { name, url: MEDIA_URL(name), size: buffer.length };
}

export function resolveMedia(name) {
  const file = path.basename(String(name || ""));
  if (!file || file.startsWith(".")) return null;
  if (!ALLOWED_EXT.has(extOf(file))) return null;
  const full = fullPath(file);
  if (!full.startsWith(MEDIA_DIR) || !existsSync(full)) return null;
  return full;
}

export function deleteMedia(name) {
  const full = resolveMedia(name);
  if (!full) return false;
  unlinkSync(full);
  return true;
}
