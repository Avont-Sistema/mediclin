## Descrição

<!-- O que esta PR faz? Por que essa mudança é necessária? -->

## Tipo de mudança

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `chore` — dependências, configuração, CI
- [ ] `docs` — documentação

## Fase / Issue relacionada

Fase: <!-- ex: Fase 1 — Banco de dados -->
Issue: <!-- #número ou N/A -->

## Checklist

### Código

- [ ] Lint passou (`npm run lint`)
- [ ] Typecheck passou (`npm run typecheck`)
- [ ] Build passou (`npm run build`)
- [ ] Nenhum `console.log` novo em código de produção
- [ ] Nenhum segredo ou `.env` commitado

### Multi-tenancy

- [ ] Toda nova query filtra por `professional_id` (ou N/A)
- [ ] Nenhuma rota de API aceita `professionalId` de parâmetro de URL para autorização

### Banco de dados (se houver mudança de schema)

- [ ] Migration gerada com `npx drizzle-kit generate`
- [ ] Migration testada localmente
- [ ] Seed atualizado se necessário

### Componentes

- [ ] Novos componentes estão em `src/components/`
- [ ] Lógica de negócio está em `src/lib/` ou `src/server/`

### Pagamentos (se houver mudança em fluxo Stripe)

- [ ] Webhook testado localmente com `stripe listen`
- [ ] `application_fee_amount` aplicado corretamente

## Como testar

<!-- Passo a passo para revisar e testar esta PR -->

1.
2.
3.

## Screenshots (se aplicável)

<!-- Cole prints antes/depois para mudanças visuais -->
