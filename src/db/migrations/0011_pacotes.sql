-- ─── Pacotes: Grátis (14 dias) + Profissional (R$79,90) ──────────────────────
-- Desativa os pacotes de exemplo antigos e define os 2 pacotes reais.
-- Novas categorias/pacotes entram depois (basta inserir novas linhas ativas).

UPDATE "plans" SET "ativo" = false
WHERE "slug" IN ('starter', 'pro', 'premium', 'white_label');

--> statement-breakpoint

INSERT INTO "plans"
  ("slug","nome","descricao","preco_mensal","preco_anual","trial_dias",
   "max_usuarios","max_agendamentos_mes","armazenamento_gb","comissao_pct",
   "whatsapp_incluso","recursos","ativo","ordem")
VALUES
  ('gratis','Grátis','14 dias de teste com os recursos essenciais','0','0',14,
   1,-1,1,'5',false,
   '["Agenda online","Página pública","Pagamentos online","Atendimento virtual"]'::jsonb,
   true,1),
  ('profissional','Profissional','Para o consultório que quer crescer sem limites','79.90','958.80',14,
   1,-1,10,'5',true,
   '["Tudo do Grátis","Agendamentos ilimitados","Lembretes por WhatsApp","Relatórios e métricas","Suporte prioritário"]'::jsonb,
   true,2)
ON CONFLICT ("slug") DO UPDATE SET
  "nome" = EXCLUDED."nome",
  "descricao" = EXCLUDED."descricao",
  "preco_mensal" = EXCLUDED."preco_mensal",
  "preco_anual" = EXCLUDED."preco_anual",
  "trial_dias" = EXCLUDED."trial_dias",
  "recursos" = EXCLUDED."recursos",
  "ativo" = true,
  "ordem" = EXCLUDED."ordem",
  "atualizado_em" = NOW();

--> statement-breakpoint

-- ─── plan_features (matriz de funcionalidades) ───────────────────────────────

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plano"      VARCHAR(50) NOT NULL,
  "chave"      VARCHAR(80) NOT NULL,
  "label"      VARCHAR(120) NOT NULL,
  "descricao"  TEXT,
  "incluso"    BOOLEAN NOT NULL DEFAULT false,
  "limite"     INTEGER,
  "ordem"      INTEGER NOT NULL DEFAULT 0
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "plan_features_unique" ON "plan_features" ("plano","chave");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "plan_features_plano_idx" ON "plan_features" ("plano","ordem");

--> statement-breakpoint

-- Catálogo inicial de funcionalidades (defaults sensatos — admin ajusta depois).
INSERT INTO "plan_features" ("plano","chave","label","incluso","ordem") VALUES
  ('gratis','agenda_online','Agenda online',true,1),
  ('gratis','pagina_publica','Página pública personalizada',true,2),
  ('gratis','pagamentos','Pagamentos online (Mercado Pago)',true,3),
  ('gratis','atendimento_virtual','Atendimento virtual',true,4),
  ('gratis','lembretes_whatsapp','Lembretes por WhatsApp',false,5),
  ('gratis','relatorios','Relatórios e métricas',false,6),
  ('gratis','multi_profissionais','Múltiplos profissionais',false,7),
  ('gratis','suporte_prioritario','Suporte prioritário',false,8),
  ('profissional','agenda_online','Agenda online',true,1),
  ('profissional','pagina_publica','Página pública personalizada',true,2),
  ('profissional','pagamentos','Pagamentos online (Mercado Pago)',true,3),
  ('profissional','atendimento_virtual','Atendimento virtual',true,4),
  ('profissional','lembretes_whatsapp','Lembretes por WhatsApp',true,5),
  ('profissional','relatorios','Relatórios e métricas',true,6),
  ('profissional','multi_profissionais','Múltiplos profissionais',false,7),
  ('profissional','suporte_prioritario','Suporte prioritário',true,8)
ON CONFLICT ("plano","chave") DO NOTHING;
