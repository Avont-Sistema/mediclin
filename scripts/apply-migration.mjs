// Aplica uma migration .sql arbitrária e registra no drizzle.__drizzle_migrations.
// Uso: node scripts/apply-migration.mjs 0009_admin_saas
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const name = process.argv[2];
if (!name) {
  console.error("Uso: node scripts/apply-migration.mjs <nome-sem-extensao>");
  process.exit(1);
}

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const url = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const file = join(root, "src/db/migrations", `${name}.sql`);
const content = readFileSync(file, "utf8");
const fileHash = createHash("sha256").update(content).digest("hex");

const tracked = await sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${fileHash}`;
if (tracked.length > 0) {
  console.log(`✅ ${name} já aplicada. Pulando.`);
  process.exit(0);
}

console.log(`Aplicando ${name}.sql...\n`);
const statements = content
  .split(/--> statement-breakpoint/g)
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log(`  ✅ ${stmt.slice(0, 64).replace(/\n/g, " ")}...`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`  ⚠️  já existe, pulando`);
    } else {
      console.error(`  ❌ ${msg}`);
      throw err;
    }
  }
}

await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${fileHash}, ${Date.now()})`;
console.log(`\n🎉 ${name} aplicada e registrada!\n`);
