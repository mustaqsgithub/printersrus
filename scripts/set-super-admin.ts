// Set (or transfer) the super admin / owner.
//
// Usage:
//   npm run set-super-admin -- owner@example.com
// or, if SUPER_ADMIN_EMAIL is set in your environment, just:
//   npm run set-super-admin
//
// The account must already exist (ask the person to sign up first). This
// promotes that account to `super_admin` and moves any *other* existing super
// admin down to a regular `admin`, so there is exactly one owner.
import { getDb } from "../lib/db";
import { initDatabase } from "../lib/database";

async function main() {
  const email = (process.argv[2] || process.env.SUPER_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();

  if (!email) {
    console.error("Usage: npm run set-super-admin -- <email>");
    console.error("   (or set SUPER_ADMIN_EMAIL in your environment)");
    process.exit(1);
  }

  await initDatabase();
  const db = getDb();

  const user = db
    .prepare("SELECT id, role FROM users WHERE LOWER(email) = ?")
    .get(email) as { id: string; role: string } | undefined;

  if (!user) {
    console.error(`✗ No account found for ${email}.`);
    console.error("  Ask them to sign up at /signup first, then re-run this command.");
    process.exit(1);
  }

  // Single-owner model: demote any other current super admins to admin.
  const demoted = db
    .prepare(
      "UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE role = 'super_admin' AND LOWER(email) <> ?"
    )
    .run(email);

  db.prepare(
    `UPDATE users
     SET role = 'super_admin',
         email_verified_at = COALESCE(email_verified_at, datetime('now')),
         updated_at = datetime('now')
     WHERE LOWER(email) = ?`
  ).run(email);

  console.log(`✓ ${email} is now the super admin (owner).`);
  if (demoted.changes > 0) {
    console.log(`  (${demoted.changes} previous super admin(s) moved to regular admin.)`);
  }
  console.log("  They can sign in at /login and will be taken to /admin.");
}

main().catch((error) => {
  console.error("Failed to set super admin:", error);
  process.exit(1);
});
