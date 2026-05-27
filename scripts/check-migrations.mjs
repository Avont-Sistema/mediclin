import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

// Check what's in the migrations tracking table
const tracked = await sql`
  SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
`;
console.log("Tracked migrations in DB:");
for (const r of tracked) {
  console.log(`  hash: ${r.hash}, created_at: ${r.created_at}`);
}

// Compute hash for each migration file (Drizzle uses SHA256 of file content)
const migrations = [
  "0000_smooth_clint_barton",
  "0001_mp_marketplace",
  "0002_lembretes",
  "0003_customizacao_publica",
  "0003_pagina_publica_cards",
  "0004_clinic_members",
  "0005_add_uf",
  "0006_add_cor_destaque",
];

console.log("\nMigration file hashes:");
for (const name of migrations) {
  const filePath = join(root, "src/db/migrations", `${name}.sql`);
  try {
    const content = readFileSync(filePath, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    console.log(`  ${name}: ${hash}`);
  } catch {
    console.log(`  ${name}: FILE NOT FOUND`);
  }
}
