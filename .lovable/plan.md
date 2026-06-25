## Problema

O Supabase/PostgREST corta toda consulta em 1000 linhas por padrão. Hoje a base já tem mais de 1000 ativos políticos, então as etiquetas, contadores e dashboards mostram no máximo 1000 — não refletem o total real cadastrado.

Locais afetados:
- `src/hooks/useUnifiedPoliticalAssets.ts` — consulta `political_assets`, `party_slate_candidates` e `leaders` sem paginação. É a fonte dos KPIs de Ativos Políticos, Mapa Estratégico (camadas), Municípios e cards consolidados.
- `src/hooks/useGeoLeads.ts` — usa `.limit(2000)` (frágil) para todas as fontes do mapa.
- `src/hooks/usePoliticalAssets.ts`, `src/hooks/useLeaders.ts`, `src/hooks/useCampaignMembers.ts`, `src/hooks/useEventos.ts` (base de leads), `src/hooks/useEmendas.ts` — qualquer um que liste registros para contar/exibir cai no mesmo teto.

## Correção

1. **Helper único de paginação** em `src/lib/db.ts`:
   ```ts
   export async function fetchAllRows<T>(builderFactory: () => any, pageSize = 1000): Promise<T[]>
   ```
   Loop com `.range(from, to)` até a página retornar menos que `pageSize`. Aceita uma factory para preservar filtros (`is('deleted_at', null)`, `eq`, `order`).

2. **Atualizar os hooks de listagem para usar `fetchAllRows`**, sem mudar shape de retorno:
   - `useUnifiedPoliticalAssets.ts` — `political_assets`, `party_slate_candidates`, `leaders`.
   - `useGeoLeads.ts` — substituir `fetchAll` (com `.limit(2000)`) por `fetchAllRows`.
   - `usePoliticalAssets.ts`, `useLeaders.ts`, `useCampaignMembers.ts`, `useEventos.ts` (leads), `useEmendas.ts`, `useActions.ts` (lista usada nos painéis).

3. **Conferir KPIs que somam linhas**: garantir que após a paginação os totais exibidos em Ativos Políticos, Municípios, Mapa Estratégico, Hierarquia, Emendas e Eventos batem com o `count(*)` do banco.

4. **Verificação**
   - `/ativos-politicos`: total ≥ 1167 e filtros por macrorregião/cidade somam o esperado.
   - `/mapa`: pontos extras importados aparecem.
   - `/municipios` e `/hierarquia`: cards refletem todos os registros.

Sem mudanças de UI, schema, RLS ou regras de negócio — apenas paginação no fetch para destravar o teto de 1000.