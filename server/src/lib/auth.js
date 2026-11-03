import { eq, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, schema } from "../db/client.js";
import {
  hashPassword,
  verifyPassword,
  newSessionToken,
  hashToken,
} from "./crypto.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/* A real scrypt hash of a random throwaway password. Checking it when the
   email is unknown makes a failed login take the same time as a real one,
   so response timing does not reveal which addresses have accounts. */
const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(32).toString("hex"));

/* ---------------------------------------------------------------- */
/* Users                                                             */
/* ---------------------------------------------------------------- */

export function createUser(email, password) {
  const exists = findUserByEmail(email);
  if (exists) throw new Error(`user ${email} already exists`);
  const [row] = db
    .insert(schema.users)
    .values({ email: email.toLowerCase(), passwordHash: hashPassword(password) })
    .returning()
    .all();
  return row;
}

export function findUserByEmail(email) {
  return (
    db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, String(email).toLowerCase()))
      .all()[0] ?? null
  );
}

export function authenticate(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    verifyPassword(String(password ?? ""), DUMMY_PASSWORD_HASH);
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function countUsers() {
  return db.select().from(schema.users).all().length;
}

/* ---------------------------------------------------------------- */
/* Sessions                                                          */
/* ---------------------------------------------------------------- */

export function createSession(userId) {
  const { token, hash } = newSessionToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.insert(schema.sessions)
    .values({ id: hash, userId, expiresAt })
    .run();
  return { token, expiresAt };
}

export function getUserForToken(token) {
  if (!token) return null;
  const hash = hashToken(token);
  const row =
    db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, hash))
      .all()[0] ?? null;
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, hash)).run();
    return null;
  }
  const user =
    db.select().from(schema.users).where(eq(schema.users.id, row.userId)).all()[0] ??
    null;
  return user;
}

export function destroySession(token) {
  if (!token) return;
  db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token))).run();
}

/* Called on boot so a long-lived process doesn't grow a sessions table. */
export function pruneExpiredSessions() {
  db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, Date.now())).run();
}
