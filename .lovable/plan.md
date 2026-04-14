

## Padronização do Design System Navy-Teal em Toda a Plataforma

### Problema
O módulo de Tracking usa um design system consistente (Navy-Teal) com KPI cards com gradientes, containers de gráficos escuros (`bg-[hsl(220,20%,13%)]`), tooltips estilizados e a paleta `CHART_COLORS` (menta, azul, púrpura, dourado, vermelho). Porém, outros módulos usam estilos genéricos (`bg-card/80`, `var(--gradient-card)`) com aparência visual diferente.

### Módulos que precisam de atualização

| Módulo | Situação Atual | O que mudar |
|--------|---------------|-------------|
| **Proporcional** | Usa `Card` genérico com `bg-card/80`, tooltips com CSS variables | Migrar para `ChartCard`, KPI cards com gradiente, tooltips Navy-Teal, paleta `CHART_COLORS` |
| **Sala de Guerra** | Usa `KPICard` com `var(--gradient-card)`, gráficos com CSS variables | Migrar KPI cards para gradientes do Tracking, tooltips escuros, cores consistentes |
| **Pesquisas** | Já usa `bg-[hsl(220,20%,13%)]` nos WaveCards — parcialmente alinhado | Padronizar tooltips e garantir paleta CHART_COLORS nos LineCharts |

**Acoes, Hierarquia, AtivosPoliticos** — Já usam `InfographicCharts` com Navy-Mint. Sem alterações necessárias.

### Implementação

**1. Extrair componentes reutilizáveis do Tracking**
- Mover `KpiCard` e `ChartCard` do `TrackingCharts.tsx` para um arquivo compartilhado `src/components/ui/DashboardCards.tsx`
- Exportar `GRADIENT_CARDS`, `tooltipStyle` e `CHART_COLORS` como constantes compartilhadas

**2. Atualizar `src/pages/Proporcional.tsx`**
- Substituir os 7 `Card` KPIs por `KpiCard` com gradientes
- Substituir os 4 `Card` de gráficos por `ChartCard` (fundo `hsl(220,20%,13%)`)
- Trocar `contentStyle` dos tooltips para `tooltipStyle` (fundo navy escuro)
- Usar `CHART_COLORS` nos cenários ao invés de cores CSS variables

**3. Atualizar `src/pages/SalaDeGuerra.tsx`**
- Migrar `KPICard` para usar gradientes do Tracking (6 cards no topo)
- Aplicar `ChartCard` wrapper nos painéis de gráficos (Evolução das Pesquisas, Evolução do Tracking, Ranking, Ações Realizadas)
- Padronizar tooltips para `tooltipStyle`

**4. Atualizar `src/pages/Pesquisas.tsx`**
- Padronizar tooltip do LineChart comparativo para `tooltipStyle`
- Garantir que cores de linhas usem `CHART_COLORS`

### Resultado
Todos os módulos com gráficos e KPIs terão a mesma identidade visual Navy-Teal do Tracking: fundos escuros, gradientes nos KPI cards, tooltips consistentes e paleta de cores unificada.

