# SESSION RESUME

> Leia este arquivo PRIMEIRO em toda nova sessão. Atualizado a cada sessão.

## Estado atual
- **Produção**: https://mediclin.vercel.app — funcional (deploy via git nativo)
- **Branch ativa**: `main` (sincronizada com origin)
- **Última sessão**: 2026-06-01 — MP em produção validado + webhook corrigido + deploys deduplicados

## ⚠️ Deploy (LER): só `git push`, nada de CLI
- Deploy é **automático pela integração nativa Vercel↔GitHub** a cada push na `main`.
- **NÃO rodar `vercel deploy --prod` manual** — gera deploy duplicado. Só `git push`.
- O workflow `deploy.yml` (Deploy Hook) foi REMOVIDO por ser redundante. Sobrou só o `ci.yml` (lint/typecheck/build, NÃO faz deploy).

## Mercado Pago — estado
- Chaves de **produção** (`APP_USR-`) configuradas em Admin → Integrações (DB, não env).
- Webhook configurado no painel MP: `https://mediclin.vercel.app/api/webhooks/mp` (entregando 200).
- Integração **provada funcionando** (preapproval criado, plano dinâmico, webhook entregando).
- Teste de auto-compra de R$1 recusado por **antifraude do MP** (`cc_rejected_high_risk`) —
  NÃO é bug: valor R$1 + pagar a si mesmo + conta nova. Validação real virá do 1º médico real.
- Planos ativos: **Grátis (R$0)** e **Profissional (R$79,90)**. Plano "teste/TESTE 1" desativado.

## Próximos passos (por prioridade)
1. Aguardar 1º médico real assinar para validar pagamento ponta-a-ponta (ativa via webhook)
2. (Opcional) Colar a Assinatura Secreta do webhook no admin (segurança extra)
3. Finalizar pagamentos de paciente (split/marketplace) em `mercadopago.ts`
4. Implementar Resend (emails) + wizard de agendamento público

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
