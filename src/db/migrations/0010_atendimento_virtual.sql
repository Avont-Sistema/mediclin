-- Telemedicina → Atendimento Virtual
-- Renomeia a coluna (preserva dados) e adiciona o campo de "funcionamento".

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'telemedicina_ativo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'professionals' AND column_name = 'atendimento_virtual_ativo'
  ) THEN
    ALTER TABLE "professionals" RENAME COLUMN "telemedicina_ativo" TO "atendimento_virtual_ativo";
  END IF;
END $$;

--> statement-breakpoint

ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "atendimento_virtual_info" TEXT;
