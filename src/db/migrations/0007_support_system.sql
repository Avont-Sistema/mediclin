-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ticket_status" AS ENUM ('aberto','em_andamento','resolvido','fechado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "ticket_prioridade" AS ENUM ('baixa','normal','alta','urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint

-- ─── support_config (singleton) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_config" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"             VARCHAR(255),
  "whatsapp"          VARCHAR(30),
  "whatsapp_message"  TEXT DEFAULT 'Olá, preciso de ajuda com o MediClin',
  "atualizado_em"     TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

-- ─── support_tickets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "professional_id"  UUID NOT NULL REFERENCES "professionals"("id") ON DELETE CASCADE,
  "titulo"           VARCHAR(255) NOT NULL,
  "status"           ticket_status NOT NULL DEFAULT 'aberto',
  "prioridade"       ticket_prioridade NOT NULL DEFAULT 'normal',
  "categoria"        VARCHAR(50),
  "lido_admin"       BOOLEAN NOT NULL DEFAULT false,
  "criado_em"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "atualizado_em"    TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "tickets_professional_idx"
  ON "support_tickets" ("professional_id", "criado_em");

--> statement-breakpoint

-- ─── support_messages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id"   UUID NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "autor_role"  VARCHAR(20) NOT NULL,
  "conteudo"    TEXT NOT NULL,
  "criado_em"   TIMESTAMP NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "messages_ticket_idx"
  ON "support_messages" ("ticket_id", "criado_em");
