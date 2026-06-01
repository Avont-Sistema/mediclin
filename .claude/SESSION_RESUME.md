# SESSION RESUME

> Leia este arquivo PRIMEIRO em toda nova sessão. Atualizado a cada sessão.

## Estado atual
- **Produção**: https://mediclin.vercel.app — 100% funcional (deploy commit 5881db6)
- **Branch ativa**: `main` (sincronizada com origin)
- **Última sessão**: 2026-05-31 — planos dinâmicos (Admin→DB→Dashboard→Checkout) + aba Integrações MP

## Próximos passos (por prioridade)
1. **Colar chaves do Mercado Pago** em Admin → Integrações (teste primeiro) e testar assinatura
2. Revisar `src/server/mp-webhook.ts` para ativar subscription com fluxo inline + plan_id
3. Finalizar pagamentos de paciente (split/marketplace) em `mercadopago.ts`
4. Implementar Resend (emails) + wizard de agendamento público
5. (Opcional) Migrar chaves restantes (Resend/Twilio/CRON) para o env do Vercel

## Comandos rápidos
```bash
git log --oneline -10          # últimos commits
npm run typecheck              # 0 erros esperado
npm run build                  # ~26s
```

## Antes de qualquer tarefa
1. `git log --oneline -5` — ver último estado
2. Ler CURRENT_STATE.md
3. Analisar apenas arquivos relevantes à tarefa
