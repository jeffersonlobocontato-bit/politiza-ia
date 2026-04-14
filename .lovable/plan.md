

## Corrigir KPI de Municípios para sempre mostrar 399 (sem duplicidades)

### Problema
O KPI "Municípios Vinculados" na página de Territórios soma os membros de todas as associações, resultando em 426 (pois 27 municípios pertencem a duas associações). O correto é sempre exibir **399** (municípios únicos do Paraná).

### Implementação

**Arquivo: `src/pages/Territorios.tsx`**

Substituir o cálculo na linha 73:
```typescript
// De:
const totalMunicipios = associations.reduce((sum, a) => sum + a.members_count, 0);

// Para:
const totalMunicipios = 399; // Total de municípios únicos do Paraná
```

Também renomear o label de "Municípios Vinculados" para "Municípios do PR" (linha 108) para refletir que é o total do estado, sem considerar duplicidades.

### Resultado
O KPI sempre mostrará 399, independentemente de quantos vínculos existam nas associações.

