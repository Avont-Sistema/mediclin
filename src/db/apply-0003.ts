/**
 * Aplica manualmente a migration 0003 (página pública + cards).
 * Use apenas uma vez. Idempotente (todos os comandos usam IF NOT EXISTS).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("📜 Aplicando schema da Fase 1…\n");

  console.log("1/6 Criando enum card_type…");
  // sql() retorna função para tagged template — usar como `sql\`...\``
  await sql`
    DO $$ BEGIN
      CREATE TYPE "card_type" AS ENUM (
        'certificacao', 'qualificacao', 'servico_extra',
        'whatsapp', 'instagram', 'localizacao', 'telefone', 'email'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;

  console.log("2/6 Adicionando coluna headline…");
  await sql`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS headline varchar(160)`;

  console.log("3/6 Adicionando coluna headline_destaque…");
  await sql`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS headline_destaque varchar(60)`;

  console.log("4/6 Adicionando coluna cor_primaria…");
  await sql`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cor_primaria varchar(20) DEFAULT 'teal'`;

  console.log("5/6 Criando tabela professional_cards…");
  await sql`
    CREATE TABLE IF NOT EXISTS professional_cards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      tipo card_type NOT NULL,
      titulo varchar(80) NOT NULL,
      subtitulo varchar(120),
      valor text,
      ordem integer DEFAULT 0 NOT NULL,
      ativo boolean DEFAULT true NOT NULL,
      criado_em timestamp DEFAULT now() NOT NULL,
      atualizado_em timestamp DEFAULT now() NOT NULL
    )
  `;

  console.log("6/6 Criando índice cards_professional_idx…");
  await sql`
    CREATE INDEX IF NOT EXISTS cards_professional_idx
      ON professional_cards (professional_id, ordem)
  `;

  console.log("\n✅ Migration 0003 aplicada com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
