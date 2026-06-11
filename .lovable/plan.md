## Objetivo
Remover o filtro **Status de Filiação** da tela `Chapa Partido` (PL e Novo) e substituir por um filtro de **Ranking por cenário de votos** (Bom / Médio / Ruim).

## Mudanças em `src/pages/ChapaPartido.tsx`

### Remover
- Estado `filterFiliacao` e seu `<Select>` (Filiação).
- Bloco `FIL_LABEL`/`FIL_STYLE` deixam de ser usados no filtro (mas continuam usados na coluna da tabela — preservar).

### Adicionar dois selects que controlam o ranking

1. **Cenário de votos** (`votesScenario`): `bom` (padrão) | `medio` | `ruim`.
2. **Faixa do ranking** (`votesRank`): `all` (padrão) | `top10` | `top30` | `top50` | `out` (fora do top 50) | `sem` (sem projeção no cenário).

### Lógica
- Para cada `cargo` (aba atual), calcular o ranking dos candidatos pelo cenário escolhido em ordem decrescente de votos. Candidatos com `votes_<scenario> == null` ficam fora do ranking (recebem rank `null`).
- O filtro aplica:
  - `top10/30/50`: `rank <= N`.
  - `out`: `rank > 50`.
  - `sem`: votos do cenário são `null`.
  - `all`: sem corte.
- Quando o filtro de ranking estiver ativo (≠ `all`), ordenar a tabela exibida pelo ranking do cenário (decrescente), substituindo a ordem padrão por `order_index`. Caso `all`, manter a ordem atual.
- Adicionar uma nova coluna `#Rank` (somente quando `votesRank ≠ all` ou opcional sempre) mostrando a posição no cenário, para deixar o ranking visível.

### UI
- Substituir o `<Select>` "Filiação" pelos dois novos, lado a lado, mantendo o mesmo padrão visual da linha de filtros.
- Labels:
  - Cenário: "Cenário: Bom / Médio / Ruim".
  - Ranking: "Ranking: Todos / Top 10 / Top 30 / Top 50 / Fora do Top 50 / Sem projeção".

### Sem mudanças
- Drawer de edição mantém o campo `Status filiação` (dado segue existindo no banco).
- Coluna `Filiação` na tabela continua mostrando o badge.
- KPIs permanecem iguais.
- `MapaChapa` não é alterado.

## Arquivos afetados
- `src/pages/ChapaPartido.tsx` (único arquivo editado).
