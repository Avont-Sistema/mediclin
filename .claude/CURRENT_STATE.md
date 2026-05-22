# CURRENT STATE

> Atualizar ao final de cada sessão com mudanças relevantes.

## Produção (mediclin.vercel.app)
| Rota | Status |
|------|--------|
| `/` landing | ✅ 200 |
| `/sign-in` `/sign-up` | ✅ 200 (Clerk) |
| `/dashboard` | ✅ 307 redirect |
| `/onboarding` `/agenda` `/patients` `/settings` | ✅ 200 |
| `POST /api/webhooks/clerk` | ✅ 400 sem assinatura |
| `GET /api/cron/reminders` | ✅ 200 |

## Infra
- Vercel project: `prj_Wo2Oroi6QJzJo0lvUmgL2NVTCLto`
- Neon Postgres: ativo
- Clerk: `aware-lynx-99` (test mode) — keys corretas
- Auto-deploy: GitHub Actions → Deploy Hook HP9dxUj4Ij

## Env vars pendentes (adicionar no Vercel)
- ❌ MERCADOPAGO_ACCESS_TOKEN / APP_ID / APP_SECRET
- ❌ MP_PLAN_ID_PRO / MP_PLAN_ID_CLINIC
- ❌ RESEND_API_KEY
- ❌ TWILIO_* (opcional)
- ❌ CRON_SECRET

## Build
- TypeScript: 0 erros
- ESLint: 0 erros (6 warnings shadcn — não críticos)
- Build local: ~26s
