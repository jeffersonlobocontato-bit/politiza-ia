## Problema

Na aba **Cruzar** de `/pesquisas`, a lista "Candidatos para cruzar" só inclui candidatos cadastrados no mestre (Configurações → Candidatos). Nomes que aparecem nas pesquisas mas não estão cadastrados ficam invisíveis e não podem entrar no cruzamento.

## Solução

Unir, na aba Cruzar:
1. Candidatos mestre do cargo (comportamento atual, com cor padronizada).
2. **Todos os nomes mencionados** nos resultados das pesquisas filtradas (waves selecionadas + cargo + métrica), deduplicados por `normalizeName`, excluindo `EXCLUDED_CANDIDATES` (Branco/Nulo/NS/NR) e o candidato principal.

Cada item da lista mostra: checkbox · bolinha de cor · nome · contador `X/N` (em quantas waves aparece) · badge sutil "não cadastrado" quando vier só das pesquisas.

Adicionar barra de ações acima da lista:
- **Selecionar todos** (respeita o máximo de 6 — se ultrapassar, mostra toast e seleciona os 6 com maior presença).
- **Limpar seleção**.
- Campo de busca rápida (filtra por nome, case-insensitive).

## Mudanças técnicas

Arquivo: `src/pages/Pesquisas.tsx` (apenas `TabCruzar`).

1. **Novo memo `allCandidatesForCargo`**: percorre `filteredQuestions`, agrega `{ key: normalizeName(name), displayName, presence, isMaster, masterId? }`. Faz merge com `masterForCargo` (mestre vence em displayName/cor).
2. **`comparisonIds: string[]`** passa a aceitar tanto IDs do mestre quanto chaves normalizadas para não-cadastrados (prefixo `nm:` para evitar colisão). `toggleComparison`, `presenceByCandidate`, `colorFor` e o cálculo do `chartData`/tabela de variação consultam por essa chave unificada.
3. **`matchesCandidate`**: para não-cadastrados, comparar via `normalizeName` direto contra `r.candidate`.
4. **Barra de ações**: `Selecionar todos` / `Limpar` / input de busca; máx. 6 com fallback ordenado por presença desc.
5. Legenda atualizada explicando que a lista inclui nomes oriundos das pesquisas (badge "não cadastrado").

Sem alterações de schema, hooks ou outros componentes.

## Fora de escopo

- Cadastrar automaticamente esses nomes no mestre (continua manual em Configurações).
- Mudar a aba "Comparar" (temporal) — só Cruzar.
