-- ─── integration_config (chaves de plataforma — Mercado Pago) ────────────────
-- Singleton gerenciado pelo admin. Segredos da plataforma; acesso só via admin.

CREATE TABLE IF NOT EXISTS "integration_config" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "mp_access_token"   TEXT,
  "mp_public_key"     TEXT,
  "mp_app_id"         VARCHAR(100),
  "mp_app_secret"     TEXT,
  "mp_webhook_secret" TEXT,
  "mp_ambiente"       VARCHAR(20) NOT NULL DEFAULT 'test',
  "mp_ativo"          BOOLEAN NOT NULL DEFAULT false,
  "atualizado_em"     TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

-- Garante a linha singleton inicial (sem chaves ainda).
INSERT INTO "integration_config" ("mp_ambiente", "mp_ativo")
SELECT 'test', false
WHERE NOT EXISTS (SELECT 1 FROM "integration_config");

--> statement-breakpoint

-- ─── subscriptions.plan_id (pacote dinâmico assinado) ────────────────────────

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_id" UUID;
