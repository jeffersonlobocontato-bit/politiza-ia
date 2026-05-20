## Objetivo
Adicionar um CTA na página **Hierarquia** (`/hierarquia`) que abre a visualização do **fluxograma da estrutura hierárquica** da campanha (6 níveis de comando), permitindo enxergar a árvore de comando de forma visual em vez de só lista/tabela.

## O que será feito

### 1. Botão CTA no header da página Hierarquia
- Adicionar botão `"Ver Fluxograma"` (ícone `Network` / `GitFork`) ao lado dos controles existentes do header de `src/pages/Hierarquia.tsx`.
- Estilo MobNex: variante `mint` (verde primário), consistente com os outros CTAs da plataforma.

### 2. Modal/Dialog com o fluxograma
Ao clicar no CTA, abre um `Dialog` em tela cheia (`max-w-6xl`, scroll interno) contendo:

- **Cabeçalho**: título "Fluxograma da Hierarquia · {Candidato Ativo}" + legenda dos 6 níveis com cores.
- **Árvore visual** renderizada a partir dos dados reais de `useCampaignMembers()`:
  - Nível 1 — Candidato (raiz)
  - Nível 2 — Coordenador Geral
  - Nível 3 — Coord. Estadual
  - Nível 4 — Coord. Regional
  - Nível 5 — Coord. Microrregional / Municipal
  - Nível 6 — Liderança Local / Operador Campo
- Cada nó: card compacto com nome, cargo, território, badge de status (ou "Vaga Aberta" quando vazio).
- Linhas conectoras entre supervisor → subordinado (`supervisor_id`).
- Cores por nível alinhadas ao design system (Navy / Teal / Mint, sem hardcoded).

### 3. Implementação técnica
- Componente novo: `src/components/hierarquia/HierarchyFlowchart.tsx`.
- Renderização: árvore CSS pura (grid + SVG connectors) — sem nova dependência. Layout horizontal com scroll lateral quando largo.
- Fonte de dados: hook existente `useCampaignMembers()` + filtro por `candidato ativo` (CandidateContext).
- Estado de vazio: quando um nível não tem ninguém, mostra card "Vaga Aberta" tracejado.
- Responsivo: em mobile (<768px) vira layout vertical empilhado.

### 4. Fora de escopo
- Não altera schema do banco nem hooks de dados.
- Não edita/cria membros pelo fluxograma (só visualização — edição continua na tabela).
- Sem export PNG/PDF nesta primeira versão (pode entrar depois se quiser).

## Entregável
CTA "Ver Fluxograma" funcional na página Hierarquia abrindo modal com a árvore de comando da campanha ativa, pronto para apresentação visual ao candidato.
