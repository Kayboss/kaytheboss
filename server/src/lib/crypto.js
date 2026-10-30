/* Hash passwords with Node's built-in scrypt (no extra deps). */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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

export function hashToken(token) {
  return scryptSync(token, "kaytheboss-session", 32).toString("hex");
}
