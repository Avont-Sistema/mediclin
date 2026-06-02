-- ─── Métodos de pagamento (modelo de 2 níveis) ──────────────────────────────
-- plans.metodos_pagamento     = teto definido pelo admin (quais o plano libera)
-- professionals.metodos_pagamento = ativados pelo médico (subconjunto do teto)
-- Valores possíveis: "credito" | "debito" | "pix" | "dinheiro"

-- Teto do plano (default: todos liberados)
ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "metodos_pagamento" JSONB NOT NULL
  DEFAULT '["credito","debito","pix","dinheiro"]'::jsonb;

--> statement-breakpoint

-- Ativados pelo médico (default: vazio — médico ainda não configurou)
ALTER TABLE "professionals"
  ADD COLUMN IF NOT EXISTS "metodos_pagamento" JSONB NOT NULL
  DEFAULT '[]'::jsonb;
