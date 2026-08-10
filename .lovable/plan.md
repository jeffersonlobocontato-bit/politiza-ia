# Cruzamento Estratégico — Espaço Eleitoral Disponível

Nova aba que cruza o histórico eleitoral de 2022 com os pré-candidatos de 2026, para estimar quanto voto ainda está "livre" em cada cidade e quantas cidades bastam para cobrir a meta de cada cenário.

## Ajuste em relação ao pacote enviado

O pacote assume que os deputados de 2026 estão na tabela de candidatos e que as metas vêm das projeções de voto. Verifiquei o banco:

- A tabela de candidatos tem apenas 3 registros (Governador e Senadores).
- Os 153 pré-candidatos a Deputado Federal/Estadual (PL e Novo) estão nas Chapas, com metas Bom/Médio/Ruim preenchidas.
- A tabela de projeções de voto está vazia (0 registros).

Conforme sua escolha, o cruzamento será montado sobre as Chapas. Os cargos das Chapas ("Deputado Federal" / "Deputado Estadual") já batem com a grafia do histórico do TSE, então o casamento por nome funciona.

Podemos fica de fora por enquanto.

## O que será entregue

1. **Cálculo de espaço disponível por cidade e cargo** (base 2022, 1º turno): total de votos válidos do cargo na cidade menos os votos dos nomes que estão repetindo em 2026 — o resultado é o "espaço livre".
2. **Reconhecimento de reeleição**: o nome do pré-candidato é comparado com os nomes de urna de 2018/2022 ignorando acentos e maiúsculas. Quem já concorreu ao mesmo cargo é marcado como base própria naquelas cidades.
3. **Nova página "Cruzamento Estratégico"**, no padrão visual do app (não o CSS solto do arquivo enviado), com:
   - Seletor de pré-candidato (chapas PL/Novo, com partido e cargo)
   - Botões de cenário Ruim / Médio / Bom, lendo as metas da chapa
   - Big numbers: meta do cenário, cidades priorizadas para cobrir a meta, cidades com base histórica própria
   - Ranking de cidades por espaço disponível, destacando as que já são base própria (com os votos de 2022) e as que entram no corte da meta
   - Busca por cidade e ordenação por espaço disponível ou por votos próprios
4. **Rota e item de menu** com a mesma restrição de acesso do Histórico Eleitoral.

## Detalhes técnicos

- Migração: coluna normalizada de nome nas Chapas e índices; view `vw_candidatos_reeleicao` adaptada para `party_slate_candidates` (casando `cargo` com `ds_cargo` e considerando `nm_candidato_normalizado`); view `vw_espaco_eleitoral_disponivel` conforme o SQL enviado; função `fn_diagnostico_chapa(p_slate_id uuid, p_cenario text)` em `SECURITY DEFINER` com `search_path = public`, lendo a meta de `votes_bom/votes_medio/votes_ruim` e devolvendo ranking com acumulado e `pct_meta_coberta`. `GRANT EXECUTE` apenas para `authenticated`, com a mesma checagem de papel usada no módulo de histórico.
- Views expostas via função (não leitura direta), evitando novos pontos sem RLS.
- Frontend: `src/pages/CruzamentoEstrategico.tsx` + hook `src/hooks/useCruzamentoEleitoral.ts` (TanStack Query), tokens do design system, sem cores hardcoded; rota em `src/App.tsx` e entrada em `src/components/layout/AppSidebar.tsx`.
- Limitação mantida: o cálculo usa apenas 2022 como base.
