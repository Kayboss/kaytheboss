/* Hash passwords with Node's built-in scrypt (no extra deps). */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384; // CPU/memory cost
const KEYLEN = 64;

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN, { N }).toString("hex");
  return `scrypt:${N}:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, nStr, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length, {
    N: Number(nStr) || N,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* Session tokens are opaque random strings; store only a hash. */
export function newSessionToken() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

/* Session tokens are 256 bits of random entropy, so a plain SHA-256 digest
   is enough; scrypt here would only add latency to every request. */
export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
