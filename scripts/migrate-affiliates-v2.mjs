import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE affiliate_codes
     ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL`,
];

console.log("Running affiliate v2 migration…");
for (const stmt of statements) {
  await sql.query(stmt);
  console.log("  ✓", stmt.trim().split("\n")[0].slice(0, 60));
}
console.log("Migration complete.");
