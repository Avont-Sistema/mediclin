/**
 * Aplica as migrations manuais (0001, 0002...) que não passam pelo drizzle-kit
 * (ambiente não-TTY impede o generate/push interativo).
 *
 * Uso: node --import tsx/esm src/db/apply-migration.ts
 * Todas as migrations têm IF NOT EXISTS / IF EXISTS para ser idempotentes.
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const MIGRATIONS = ["./migrations/0001_mp_marketplace.sql", "./migrations/0002_lembretes.sql"];

for (const rel of MIGRATIONS) {
  const migrationPath = new URL(rel, import.meta.url);
  const migrationSql = readFileSync(migrationPath, "utf-8");

  // Drizzle usa "--> statement-breakpoint" para separar statements;
  // migrações simples sem esse separador são aplicadas como um só statement.
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`\n📄 ${rel} (${statements.length} statement(s))`);

  for (const statement of statements) {
    console.log(`  → ${statement.slice(0, 80).replace(/\n/g, " ")}...`);
    await sql.query(statement);
  }
}

console.log("\n✅ Todas as migrations aplicadas.");
