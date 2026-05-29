-- ─── plan_prices ──────────────────────────────────────────────────────────────
-- Preço mensal de cada plano (editável pelo admin) — base de cálculo do MRR

CREATE TABLE IF NOT EXISTS "plan_prices" (
  "plano"          plano PRIMARY KEY,
  "valor_mensal"   decimal(10,2) NOT NULL DEFAULT '0',
  "atualizado_em"  timestamp NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

-- Seed inicial — admin ajusta os valores reais pela UI
INSERT INTO "plan_prices" ("plano", "valor_mensal") VALUES
  ('free', 0),
  ('pro', 0),
  ('clinic', 0)
ON CONFLICT ("plano") DO NOTHING;
