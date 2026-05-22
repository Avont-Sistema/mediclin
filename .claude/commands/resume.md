Retome a sessão anterior com contexto mínimo. Argumento opcional: nome de uma tarefa específica para focar.

## Instruções

Você está iniciando (ou retomando) uma sessão no projeto MediClin. Execute os passos abaixo **na ordem exata**, sem analisar arquivos desnecessários. O objetivo é estar pronto para trabalhar em menos de 10 segundos de leitura.

### PASSO 1 — Ler contexto (obrigatório, nesta ordem)

Leia **apenas** estes arquivos, nesta sequência:

1. `.claude/SESSION_RESUME.md` — estado da última sessão
2. `.claude/CURRENT_STATE.md` — estado de produção e env vars
3. `.claude/PROJECT_CONTEXT.md` — stack e decisões fixas (só se necessário)

**Não leia CLAUDE.md, package.json, vite.config.ts ou qualquer outro arquivo ainda.**

### PASSO 2 — Verificar git

```bash
git log --oneline -5
git status --short
```

Compare com o que está em `SESSION_RESUME.md`. Se os commits batem, o contexto está válido.

### PASSO 3 — Ler apenas o necessário

Se há um "Arquivo em foco" em `SESSION_RESUME.md`, leia apenas esse arquivo.

Se `$ARGUMENTS` especifica uma tarefa (ex: "implementar MP", "fix webhook"), leia apenas os arquivos relevantes a essa tarefa — use Serena (`mcp__serena__find_symbol`) para localizar símbolos sem ler arquivos inteiros.

**Nunca leia toda a pasta `src/` ou rode `npm run build` só para orientar.**

### PASSO 4 — Confirmar orientação

Responda com este formato exato (máx 8 linhas):

```
▶ Retomando MediClin
- Último trabalho: [1 linha do SESSION_RESUME]
- Branch: [branch]
- Build: [ok/erro/desconhecido]
- Próximo passo: [próximo passo exato do SESSION_RESUME]
[Se $ARGUMENTS especificou tarefa: "→ Foco em: [tarefa]"]
```

Depois pergunte: **"Continuo com o próximo passo ou tem algo diferente?"**

### PASSO 5 — Trabalhar

A partir daqui, siga as regras do projeto:

- Ler apenas arquivos relevantes à tarefa atual
- Usar `mcp__serena__find_symbol` antes de abrir arquivos grandes
- Usar `mcp__serena__get_symbols_overview` para entender estrutura de um arquivo
- Nunca rodar `npm run build` sem necessidade — use `npm run typecheck` primeiro
- Commits em português, seguindo convenção do projeto
- Atualizar `.claude/TODO.md` ao concluir subtarefas
- Ao encerrar, rodar `/rollover`

**Regras absolutas:**
- Nunca reler o projeto inteiro
- Nunca fazer perguntas sobre stack (está em PROJECT_CONTEXT.md)
- Nunca questionar decisões marcadas como "fixas" em DECISIONS.md
- Respostas curtas e focadas na tarefa
