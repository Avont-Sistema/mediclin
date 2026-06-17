import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const statements = [
  // Enum
  `DO $$ BEGIN
    CREATE TYPE tipo_desconto AS ENUM ('percentual', 'valor_fixo', 'periodo_free');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

  // affiliate_codes
  `CREATE TABLE IF NOT EXISTS affiliate_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      VARCHAR(50)  NOT NULL UNIQUE,
    nome        VARCHAR(255) NOT NULL,
    descricao   TEXT,
    tipo_desconto tipo_desconto,
    valor_desconto NUMERIC(10,2),
    dias_free   INTEGER NOT NULL DEFAULT 0,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    data_inicio TIMESTAMP,
    data_fim    TIMESTAMP,
    limite_usos INTEGER,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS affiliate_codes_codigo_idx ON affiliate_codes (codigo)`,

  // affiliate_clicks
  `CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_id   UUID NOT NULL REFERENCES affiliate_codes(id) ON DELETE CASCADE,
    ip          VARCHAR(45),
    user_agent  TEXT,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS affiliate_clicks_codigo_idx ON affiliate_clicks (codigo_id, criado_em)`,

  // affiliate_conversions
  `CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_id           UUID NOT NULL REFERENCES affiliate_codes(id) ON DELETE CASCADE,
    professional_id     UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    plano               plano,
    desconto_aplicado   NUMERIC(10,2),
    dias_free_aplicados INTEGER DEFAULT 0,
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS affiliate_conversions_codigo_idx ON affiliate_conversions (codigo_id, criado_em)`,

  // coluna affiliate_code_id em professionals
  `ALTER TABLE professionals
    ADD COLUMN IF NOT EXISTS affiliate_code_id UUID REFERENCES affiliate_codes(id) ON DELETE SET NULL`,
];

console.log("Running affiliate migration…");
for (const stmt of statements) {
  await sql.query(stmt);
  console.log("  ✓", stmt.trim().split("\n")[0].slice(0, 60));
}
console.log("Migration complete.");
