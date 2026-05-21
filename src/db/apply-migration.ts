/**
 * Script único para aplicar a migration 0001 (Stripe → Mercado Pago)
 * Uso: node --import tsx/esm src/db/apply-migration.ts
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const migrationPath = new URL("./migrations/0001_mp_marketplace.sql", import.meta.url);
const migrationSql = readFileSync(migrationPath, "utf-8");

// Drizzle usa "--> statement-breakpoint" para separar statements
const statements = migrationSql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Aplicando ${statements.length} statements...`);

for (const statement of statements) {
  console.log(`  → ${statement.slice(0, 60).replace(/\n/g, " ")}...`);
  await sql.query(statement);
}

console.log("✅ Migration 0001 aplicada com sucesso.");
