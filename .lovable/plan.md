## Problema

O card **"Ativos por Macrorregião"** mostra menos registros do que o total cadastrado porque **931 dos 1.167 ativos nativos** estão com `macroregion_id` em branco no banco (ex.: a importação da Equipe Senador preencheu cidade mas não a macrorregião). Como o agrupamento do card usa apenas `macroregion_id`, esses ~931 registros somem da distribuição — embora apareçam no total e nos KPIs.

Curiosamente, isso já foi resolvido para outras origens (Proporcional, Lideranças, Inscrições, Prefeitos): o hook `useUnifiedPoliticalAssets` aplica `macroFromCity(city)` quando a macrorregião não está no banco. **A única origem sem esse fallback é a `nativos`** (tabela `political_assets`).

## Correção

Em `src/hooks/useUnifiedPoliticalAssets.ts`, no mapeamento dos `nativos`, derivar a macrorregião pela cidade quando `macroregion_id` for nulo:

```ts
macroregion_id: a.macroregion_id ?? macroFromCity(a.municipality),
```

Isso recupera ~848 ativos (931 sem macro − 83 sem cidade) e os distribui corretamente entre as 10 macrorregiões do PR no card e no filtro de macrorregião da página. Os 83 restantes (sem cidade) continuam não mapeáveis e seguem como "Sem macrorregião".

## Escopo

- 1 arquivo, 1 linha. Sem migração de banco — é apenas derivação em tempo de leitura, igual já é feito para as outras origens.
- Não altera dados existentes; se um operador depois preencher `macroregion_id` manualmente, esse valor prevalece (o `??` só age quando está nulo).
