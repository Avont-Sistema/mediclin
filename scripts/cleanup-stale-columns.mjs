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

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${table} AND column_name=${column}
  `;
  return rows.length > 0;
}

async function dropIfExists(table, column) {
  if (await columnExists(table, column)) {
    await sql.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
    console.log(`  🗑  ${table}.${column} removed`);
  } else {
    console.log(`  ✓  ${table}.${column} already gone`);
  }
}

// ── Remove stale Stripe columns from appointments ──
console.log("\n── appointments ──");
await dropIfExists("appointments", "stripe_payment_intent_id");

// ── Remove stale Stripe columns from subscriptions ──
console.log("\n── subscriptions ──");
await dropIfExists("subscriptions", "stripe_price_id");

// ── Fix mp_payment_id NOT NULL in payments (no rows, safe) ──
console.log("\n── payments ──");
const [{ count }] = await sql`SELECT COUNT(*) FROM payments`;
console.log(`  payments rows: ${count}`);
if (Number(count) === 0) {
  await sql`ALTER TABLE payments ALTER COLUMN mp_payment_id SET NOT NULL`;
  console.log("  ✅ mp_payment_id set NOT NULL");
} else {
  console.log("  ⚠️  Skipping NOT NULL constraint (rows exist)");
}

console.log("\n🎉 Cleanup complete!\n");
