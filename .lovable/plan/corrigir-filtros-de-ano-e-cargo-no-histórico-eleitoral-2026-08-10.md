# Corrigir filtros de Ano e Cargo no Histórico Eleitoral

## O que está acontecendo

Testei a página logada no navegador: os selects de **Ano** e **Cargo** estão renderizando com **zero opções** (por isso aparecem vazios/"travados"), enquanto o select de Candidato funciona normalmente e o mapa carrega.

Os dados existem no banco (2018 e 2022; Presidente, Governador, Senador, Deputado Federal e Deputado Estadual) e as chamadas de candidatos/municípios retornam 200. O que falha é a consulta que alimenta as listas de Ano/Cargo: na captura de rede dessa consulta não apareceu resposta, e pela API pública ela retorna lista vazia. A causa exata (consulta não disparada x bloqueada por permissão) ainda não está confirmada — confirmar isso é o primeiro passo.

## Plano

1. **Confirmar a causa**: instrumentar a chamada das combinações (Ano/Cargo/Turno) no navegador com sessão autenticada e registrar status/erro exato da requisição.
2. **Tornar a lista de filtros confiável**: substituir a dependência da view de combinações por uma função de banco dedicada (`hist_combos`), com permissão explícita para usuários autenticados e a mesma regra de acesso já usada no módulo (Admin Master e Coordenação Estadual). Isso elimina a dependência de leitura direta da view.
3. **Blindar a interface**: se a lista de combinações ainda não tiver chegado ou vier vazia, os selects passam a exibir um conjunto padrão (2022/2018 e os cinco cargos) em vez de ficarem sem nenhuma opção — assim nunca mais aparecem "travados".
4. **Validar no navegador**: trocar Ano e Cargo e conferir que o ranking, o mapa e o turno se atualizam corretamente (incluindo 2º turno de Presidente).

## Detalhes técnicos

- Nova função `public.hist_combos()` (SQL, `SECURITY DEFINER`, `search_path = public`) retornando `ano, turno, cargo, label` agregados de `resultados_eleicoes_historicos`, com `GRANT EXECUTE ... TO authenticated` e checagem interna de papel (`admin_master` / `coordenador_estadual`).
- `src/hooks/useHistoricoEleitoral.ts`: `useCombinacoesDisponiveis` passa a usar `db.rpc('hist_combos')`, propagando erro para o React Query.
- `src/pages/HistoricoEleitoral.tsx`: `anos` e `cargos` recebem fallback estático quando a lista vier vazia; manter `ano`/`cargo` selecionados válidos dentro das opções disponíveis.
