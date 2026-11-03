/* ------------------------------------------------------------------ */
/* Login throttle: limits repeated failures per IP and per email.      */
/* In-memory only, which suits the single-process local admin: a       */
/* restart clears the counters.                                        */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 5;
const MAX_BUCKETS = 1000;

const buckets = new Map();

function keysFor({ ip, email }) {
  const keys = [`ip:${String(ip || "unknown")}`];
  const normalized = String(email || "").trim().toLowerCase();
  if (normalized) keys.push(`email:${normalized}`);
  return keys;
}

function bucketFor(key, now) {
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.firstAt > WINDOW_MS) {
    bucket = { count: 0, firstAt: now, blockedUntil: 0 };
    buckets.set(key, bucket);
  }
  return bucket;
}

function prune(now) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.blockedUntil <= now && now - bucket.firstAt > WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

/* Call before checking credentials. */
export function loginBlocked({ ip, email }, now = Date.now()) {
  prune(now);
  for (const key of keysFor({ ip, email })) {
    const bucket = buckets.get(key);
    if (bucket && bucket.blockedUntil > now) {
      return {
        blocked: true,
        retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000),
      };
    }
  }
  return { blocked: false, retryAfter: 0 };
}

/* Call after a rejected login. */
export function recordLoginFailure({ ip, email }, now = Date.now()) {
  for (const key of keysFor({ ip, email })) {
    const bucket = bucketFor(key, now);
    bucket.count += 1;
    if (bucket.count >= MAX_FAILURES) bucket.blockedUntil = now + WINDOW_MS;
  }
}

/* Call after a successful login. */
export function clearLoginFailures({ ip, email }) {
  for (const key of keysFor({ ip, email })) buckets.delete(key);
}
