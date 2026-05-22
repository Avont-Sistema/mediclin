-- 0003_customizacao_publica.sql
-- Adiciona campos de personalização da página pública + suporte a telemedicina

--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "modalidade_atendimento" AS ENUM ('presencial', 'online', 'ambos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
ALTER TABLE "professionals"
  ADD COLUMN IF NOT EXISTS "cor_marca" varchar(7) NOT NULL DEFAULT '#0d9488',
  ADD COLUMN IF NOT EXISTS "cor_texto" varchar(7) NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS "hero_titulo" varchar(255),
  ADD COLUMN IF NOT EXISTS "hero_subtitulo" text,
  ADD COLUMN IF NOT EXISTS "hero_image_url" text,
  ADD COLUMN IF NOT EXISTS "telemedicina_ativo" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "meet_link" text,
  ADD COLUMN IF NOT EXISTS "modalidade" "modalidade_atendimento" NOT NULL DEFAULT 'presencial';

--> statement-breakpoint
ALTER TABLE "services"
  ADD COLUMN IF NOT EXISTS "modalidade" "modalidade_atendimento" NOT NULL DEFAULT 'presencial';

--> statement-breakpoint
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "modalidade" "modalidade_atendimento" NOT NULL DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS "meet_link" text;
