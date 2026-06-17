# Unificar Ativos Políticos: incluir Candidatos e Coordenadores (virtual / read-only)

## Objetivo
Fazer com que **Candidatos ativos** e **Coordenadores Macrorregionais, Microrregionais e de Cidade** apareçam no dashboard de **Ativos Políticos** sem duplicar dados — mantendo a edição em seus módulos de origem (Candidatos / Campanha).

## Abordagem: Agregação virtual
Criar um novo hook `useUnifiedPoliticalAssets` que combina 3 fontes em um único tipo normalizado `UnifiedAsset`:

1. `political_assets` (já existente) — origem `nativo`, editável
2. `candidates` — origem `candidato`, read-only
3. `campaign_members` filtrados pelos roles de coordenação — origem `coordenador_macro` / `coordenador_micro` / `coordenador_cidade`, read-only

A página `AtivosPoliticos.tsx` passa a consumir esse hook unificado para listagem, filtros, cards e gráficos. As ações de **criar / editar / excluir** continuam disponíveis somente para itens `origin === 'nativo'`; para os virtuais, mostramos um badge "via Candidatos" / "via Campanha" e o botão de editar abre o módulo de origem (link).

## Mudanças

### 1. Novo tipo `UnifiedAsset` (em `src/types/database.ts` ou arquivo novo)
Campos normalizados: `id`, `origin`, `source_id`, `name`, `type`, `position`, `municipality`, `macroregion_id`, `influence_level`, `alignment_status`, `support_status`, `phone`, `email`, `observations`, `lat`, `lng`, `readonly`, `source_route`.

Mapeamentos:
- **Candidato** → `type: 'candidato'`, `position` = cargo pleiteado, `alignment_status: 'aliado'` (default), `influence_level: 5`, `source_route: '/candidatos'`.
- **Coordenador Macro/Micro/Cidade** → `type: 'coord_macro' | 'coord_micro' | 'coord_cidade'`, `position` = role original, `alignment_status: 'aliado'`, `influence_level` derivado do `hierarchy_level` (1→5, 2→4, 3→3…), `source_route: '/campanha'`.

### 2. Novo hook `src/hooks/useUnifiedPoliticalAssets.ts`
- Faz 3 queries em paralelo (`political_assets`, `candidates` ativos, `campaign_members` com role de coordenação e `status='ativo'`).
- Respeita filtro de candidato ativo (usar `useActiveCandidate` se aplicável).
- Normaliza para `UnifiedAsset[]` e retorna combinado.

### 3. Atualizar `src/pages/AtivosPoliticos.tsx`
- Trocar `usePoliticalAssets()` por `useUnifiedPoliticalAssets()`.
- Nos cards: adicionar badge da origem (`Nativo` / `Candidato` / `Coordenador`).
- Para itens com `readonly`, ocultar botões de excluir/editar inline; substituir por um botão "Abrir em [módulo]" que navega para `source_route`.
- Filtros e KPIs (total, alinhamento, tipo) operam sobre a lista unificada.
- O modal de criação/edição permanece apenas para `political_assets` nativos.

### 4. Constantes
Adicionar em `ASSET_TYPES` os novos rótulos: `candidato`, `coord_macro`, `coord_micro`, `coord_cidade` (apenas display; não persistem como `type` no banco).

## Fora do escopo
- Nenhuma migração de banco.
- Sem alterações em Candidatos, Campanha ou no Mapa Estratégico.
- Sem mexer em `useCreateAsset`/`useUpdateAsset`/`useDeleteAsset`.

## Critério de aceite
Ao abrir **Ativos Políticos** com um candidato ativo selecionado, os cards listam: ativos nativos + o próprio candidato + todos coordenadores macro/micro/cidade vinculados à campanha; KPIs e filtros refletem o conjunto; itens virtuais aparecem com badge de origem e não permitem edição inline.
