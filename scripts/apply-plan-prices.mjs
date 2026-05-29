import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const migrationFile = join(root, "src/db/migrations/0008_plan_prices.sql");
const content = readFileSync(migrationFile, "utf8");
const fileHash = createHash("sha256").update(content).digest("hex");

const tracked = await sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${fileHash}`;
if (tracked.length > 0) {
  console.log("✅ Migration 0008_plan_prices já aplicada. Pulando.");
  process.exit(0);
}

console.log("Aplicando 0008_plan_prices.sql...\n");

const statements = content
  .split(/--> statement-breakpoint/g)
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log(`  ✅ ${stmt.slice(0, 60).replace(/\n/g, " ")}...`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`  ⚠️  Já existe, pulando`);
    } else {
      console.error(`  ❌ Erro: ${msg}`);
      throw err;
    }
  }
}

await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${fileHash}, ${Date.now()})`;

// Verifica
const rows = await sql`SELECT plano, valor_mensal FROM plan_prices ORDER BY plano`;
console.log("\nplan_prices:", rows.map((r) => `${r.plano}=${r.valor_mensal}`).join(", "));
console.log("\n🎉 0008_plan_prices aplicada!\n");
