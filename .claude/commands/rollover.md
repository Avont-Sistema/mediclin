Execute um rollover completo da sessão atual. Argumento opcional: `--push` para commitar e fazer push automático.

## Instruções

Você está encerrando uma sessão de trabalho no projeto CuidandoVC. Execute os passos abaixo **em ordem**, com respostas curtas e sem análise desnecessária.

### PASSO 1 — Coletar estado atual

Execute estes comandos para entender o que mudou:

```bash
git diff --name-only HEAD
git status --short
git log --oneline -5
```

### PASSO 2 — Atualizar `.claude/SESSION_RESUME.md`

Reescreva o arquivo com o seguinte formato (máx 80 linhas):

```
# SESSION RESUME
> Atualizado: [data/hora atual]

## Status
- Produção: [URL se souber]
- Branch: [branch atual]
- Última ação: [1 linha descrevendo o que acabou de ser feito]

## Objetivo atual
[1-2 linhas: o que está sendo construído/resolvido AGORA]

## Próximo passo EXATO
[1 instrução clara e específica — o que fazer na próxima sessão]

## Arquivo em foco
[caminho do arquivo principal sendo trabalhado, se houver]

## Contexto mínimo
[3-5 bullets com tudo que é necessário saber para continuar sem reler nada]

## Comandos rápidos
```bash
git log --oneline -5
[outros comandos relevantes ao estado atual]
```
```

### PASSO 3 — Atualizar `.claude/CURRENT_STATE.md`

Atualize apenas o que mudou: rotas funcionando, env vars, status de build, erros conhecidos. Mantenha o formato de tabelas. Máx 60 linhas.

### PASSO 4 — Atualizar `.claude/TODO.md`

- Mova tarefas concluídas para a seção `✅ Concluído`
- Adicione tarefas novas descobertas durante a sessão
- Reordene por prioridade real

### PASSO 5 — Atualizar `.claude/DECISIONS.md`

Se foram tomadas decisões arquiteturais ou workarounds durante a sessão, adicione ao arquivo. Se não houve nenhuma, pule este passo.

### PASSO 6 — Atualizar `.claude/HANDOFF.md`

Preencha o template com o estado real desta sessão:

```
# HANDOFF
> Sessão encerrada: [data/hora]

## O que foi feito
- [bullet por mudança significativa]

## Pendente
- [o que ficou pela metade]

## Próximo passo EXATO
> [1 instrução clara]

## Arquivos modificados
[lista dos arquivos alterados nesta sessão]

## Contexto importante fora do código
[decisões, conversas, descobertas que não estão commitadas]
```

### PASSO 7 — Commit opcional

Se o argumento `$ARGUMENTS` contiver `--push` OU se houver alterações significativas nos arquivos de contexto:

```bash
git add .claude/SESSION_RESUME.md .claude/CURRENT_STATE.md .claude/TODO.md .claude/DECISIONS.md .claude/HANDOFF.md
git commit -m "chore: rollover sessão - [descrição 1 linha do que foi feito]"
```

Se `$ARGUMENTS` contiver `--push`:
```bash
git push
```

### PASSO 8 — Confirmar

Responda com uma mensagem curta (máx 5 linhas):
```
✅ Rollover completo
- SESSION_RESUME.md atualizado
- Próximo passo: [repita o próximo passo exato]
- [commit: hash se commitou | sem commit]
```

**Regras:**
- Nunca reler arquivos que não mudaram
- Respostas curtas — não explique o que está fazendo
- Se não houve mudanças reais, diga em 1 linha e pare
