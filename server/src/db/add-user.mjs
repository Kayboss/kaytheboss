import { createUser, countUsers } from "../lib/auth.js";
import { sqlite } from "./client.js";

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || "admin@kaytheboss.studio";
  const pass = process.argv[3] || process.env.ADMIN_PASSWORD || "change-me";
  if (countUsers() > 0) {
    console.log("user table not empty; refusing to add. Remove users first if intended.");
    sqlite.close();
    return;
  }
  createUser(email, pass);
  console.log(`created admin user: ${email}`);
  sqlite.close();
}

main();
