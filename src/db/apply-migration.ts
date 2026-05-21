/**
 * Aplica todas as migrations de forma idempotente (IF NOT EXISTS em tudo).
 * Uso: node --import tsx/esm src/db/apply-migration.ts
 */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const MIGRATIONS = [
  "./migrations/0000_smooth_clint_barton.sql",
  "./migrations/0001_mp_marketplace.sql",
  "./migrations/0002_lembretes.sql",
];

for (const rel of MIGRATIONS) {
  const migrationPath = new URL(rel, import.meta.url);
  const migrationSql = readFileSync(migrationPath, "utf-8");

  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`\n📄 ${rel} (${statements.length} statement(s))`);

  for (const statement of statements) {
    try {
      console.log(`  → ${statement.slice(0, 80).replace(/\n/g, " ")}...`);
      await sql.query(statement);
      console.log(`     ✅ ok`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignorar erros de "já existe" — migration idempotente
      if (
        msg.includes("already exists") ||
        msg.includes("does not exist") ||
        msg.includes("duplicate")
      ) {
        console.log(`     ⏭️  ignorado (já aplicado): ${msg.slice(0, 60)}`);
      } else {
        throw err;
      }
    }
  }
}

console.log("\n✅ Todas as migrations aplicadas com sucesso.");
