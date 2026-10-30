import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema, sqlite } from "./client.js";
import { findUserByEmail } from "../lib/auth.js";
import { hashPassword } from "../lib/crypto.js";

/*
 * Reset (or create) an admin password.
 *   npm run user:passwd -- you@kaytheboss.studio new-password
 * Omit the password to generate one, and it will be printed once.
 */

const email = (
  process.argv[2] ||
  process.env.ADMIN_EMAIL ||
  "admin@kaytheboss.studio"
).toLowerCase();
const password =
  process.argv[3] || process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");

if (password.length < 8) {
  console.error("password must be at least 8 characters");
  sqlite.close();
  process.exit(1);
}

const passwordHash = hashPassword(password);
const existing = findUserByEmail(email);

if (existing) {
  db.update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, existing.id))
    .run();
  console.log(`updated password for ${email}`);
} else {
  db.insert(schema.users).values({ email, passwordHash }).run();
  console.log(`created admin user ${email}`);
}

/* Existing sessions keep working after a reset unless we drop them. */
const cleared = sqlite.prepare("delete from sessions").run();
if (cleared.changes) console.log(`signed out ${cleared.changes} existing session(s)`);

if (!process.argv[3] && !process.env.ADMIN_PASSWORD) {
  console.log(`generated password: ${password}`);
}

sqlite.close();
