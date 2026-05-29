-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "admin_role" AS ENUM ('super_admin','financeiro','suporte','comercial','operacional');
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "lead_status" AS ENUM ('novo','contatado','qualificado','convertido','perdido');
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint

-- ─── plans ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "plans" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"                  VARCHAR(50) NOT NULL UNIQUE,
  "nome"                  VARCHAR(100) NOT NULL,
  "descricao"             TEXT,
  "preco_mensal"          DECIMAL(10,2) NOT NULL DEFAULT '0',
  "preco_anual"           DECIMAL(10,2) NOT NULL DEFAULT '0',
  "trial_dias"            INTEGER NOT NULL DEFAULT 7,
  "max_usuarios"          INTEGER NOT NULL DEFAULT 1,
  "max_agendamentos_mes"  INTEGER NOT NULL DEFAULT -1,
  "armazenamento_gb"      INTEGER NOT NULL DEFAULT 1,
  "comissao_pct"          DECIMAL(5,2) NOT NULL DEFAULT '5',
  "whatsapp_incluso"      BOOLEAN NOT NULL DEFAULT false,
  "recursos"              JSONB NOT NULL DEFAULT '[]'::jsonb,
  "ativo"                 BOOLEAN NOT NULL DEFAULT true,
  "ordem"                 INTEGER NOT NULL DEFAULT 0,
  "criado_em"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "atualizado_em"         TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

-- Seed dos 4 planos comerciais
INSERT INTO "plans" ("slug","nome","preco_mensal","preco_anual","trial_dias","max_usuarios","max_agendamentos_mes","armazenamento_gb","comissao_pct","whatsapp_incluso","recursos","ordem") VALUES
  ('starter','Starter','0','0',7,1,50,1,'8',false,'["Agenda online","Página pública","Pagamentos Mercado Pago"]'::jsonb,1),
  ('pro','Pro','49.90','499','14',1,-1,5,'5',true,'["Tudo do Starter","Agendamentos ilimitados","Lembretes WhatsApp","Telemedicina"]'::jsonb,2),
  ('premium','Premium','99.90','999','14',3,-1,20,'3',true,'["Tudo do Pro","Até 3 usuários","Relatórios avançados","Suporte prioritário"]'::jsonb,3),
  ('white_label','White Label','299.90','2999','14',-1,-1,100,'2',true,'["Tudo do Premium","Marca própria","Usuários ilimitados","Domínio personalizado","Gerente de conta"]'::jsonb,4)
ON CONFLICT ("slug") DO NOTHING;

--> statement-breakpoint

-- ─── delinquency_config (singleton, desligado por padrão) ────────────────────

CREATE TABLE IF NOT EXISTS "delinquency_config" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ativo"           BOOLEAN NOT NULL DEFAULT false,
  "dias_alerta"     INTEGER NOT NULL DEFAULT 5,
  "dias_limitar"    INTEGER NOT NULL DEFAULT 10,
  "dias_bloquear"   INTEGER NOT NULL DEFAULT 20,
  "atualizado_em"   TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

INSERT INTO "delinquency_config" ("ativo")
SELECT false WHERE NOT EXISTS (SELECT 1 FROM "delinquency_config");

--> statement-breakpoint

-- ─── admin_users ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id"    VARCHAR(255) NOT NULL UNIQUE,
  "nome"        VARCHAR(255),
  "email"       VARCHAR(255),
  "role"        admin_role NOT NULL DEFAULT 'suporte',
  "ativo"       BOOLEAN NOT NULL DEFAULT true,
  "criado_em"   TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

-- ─── leads ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "leads" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"          VARCHAR(255) NOT NULL,
  "email"         VARCHAR(255),
  "telefone"      VARCHAR(30),
  "origem"        VARCHAR(50),
  "status"        lead_status NOT NULL DEFAULT 'novo',
  "notas"         TEXT,
  "criado_em"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "atualizado_em" TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" ("status","criado_em");

--> statement-breakpoint

-- ─── feature_flags ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "chave"         VARCHAR(80) NOT NULL UNIQUE,
  "descricao"     TEXT,
  "ativo"         BOOLEAN NOT NULL DEFAULT false,
  "atualizado_em" TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

INSERT INTO "feature_flags" ("chave","descricao","ativo") VALUES
  ('telemedicina','Habilita teleconsulta para os médicos',true),
  ('crm_leads','Módulo de CRM/Leads no admin',true),
  ('automacao_inadimplencia','Bloqueio progressivo por inadimplência',false)
ON CONFLICT ("chave") DO NOTHING;

--> statement-breakpoint

-- ─── audit_log ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_clerk_id"  VARCHAR(255),
  "actor_nome"      VARCHAR(255),
  "acao"            VARCHAR(100) NOT NULL,
  "entidade"        VARCHAR(80),
  "detalhe"         TEXT,
  "criado_em"       TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "audit_criado_idx" ON "audit_log" ("criado_em");

--> statement-breakpoint

-- ─── admin_notifications ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "titulo"      VARCHAR(255) NOT NULL,
  "mensagem"    TEXT,
  "tipo"        VARCHAR(20) NOT NULL DEFAULT 'info',
  "lida"        BOOLEAN NOT NULL DEFAULT false,
  "criado_em"   TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notif_criado_idx" ON "admin_notifications" ("criado_em");
