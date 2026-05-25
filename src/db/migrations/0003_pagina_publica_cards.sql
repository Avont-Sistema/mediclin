-- Enum para tipos de cards customizáveis na página pública
DO $$ BEGIN
  CREATE TYPE "card_type" AS ENUM (
    'certificacao',
    'qualificacao',
    'servico_extra',
    'whatsapp',
    'instagram',
    'localizacao',
    'telefone',
    'email'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Novos campos no profissional para a página pública redesenhada
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "headline" varchar(160);
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "headline_destaque" varchar(60);
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "cor_primaria" varchar(20) DEFAULT 'teal';

-- Tabela de cards customizáveis
CREATE TABLE IF NOT EXISTS "professional_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "professional_id" uuid NOT NULL REFERENCES "professionals"("id") ON DELETE CASCADE,
  "tipo" "card_type" NOT NULL,
  "titulo" varchar(80) NOT NULL,
  "subtitulo" varchar(120),
  "valor" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "criado_em" timestamp DEFAULT now() NOT NULL,
  "atualizado_em" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cards_professional_idx"
  ON "professional_cards" ("professional_id", "ordem");
