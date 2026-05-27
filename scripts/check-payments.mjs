import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const tables = ["payments", "appointments", "subscriptions"];

for (const t of tables) {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${t}
    ORDER BY ordinal_position
  `;
  console.log(`\n── ${t} ──`);
  for (const c of cols) {
    console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${c.column_default ? `DEFAULT ${c.column_default}` : ''}`);
  }
}

// Check row counts
for (const t of tables) {
  const [{ count }] = await sql`SELECT COUNT(*) FROM ${sql(t)}`;
  console.log(`\n${t} row count: ${count}`);
}
