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
  ".avif",
]);

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

/* Trust the bytes, not the filename. Returns the matching extension or
   null. SVG is deliberately unsupported: uploaded SVGs can carry script. */
function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return ".png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }

  const head = buffer.subarray(0, 6).toString("ascii");
  if (head === "GIF87a" || head === "GIF89a") return ".gif";

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }

  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return ".avif";
  }

  return null;
}

const extOf = (name) => path.extname(String(name || "")).toLowerCase();
const fullPath = (name) => path.join(MEDIA_DIR, name);

export const MEDIA_URL = (name) => `/media/${name}`;

export const mimeFor = (name) => MIME[extOf(name)] || "application/octet-stream";

export function ensureMediaDir() {
  mkdirSync(MEDIA_DIR, { recursive: true });
}

function splitName(original, ext) {
  const base = path.basename(String(original || ""));
  let stem = base.slice(0, base.length - path.extname(base).length);
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
  const detected = sniffImage(buffer);
  if (!detected) {
    throw new Error("Unsupported image. Upload a PNG, JPG, WEBP, GIF or AVIF file.");
  }
  const { stem } = splitName(originalName, detected);
  const name = uniqueName(stem, detected);
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
