Diagnóstico: as mudanças anteriores foram aplicadas só nos tokens globais e em uma rota showcase. A tela atual até mudou parcialmente (sidebar/navy e alguns verdes), mas vários elementos seguem com estilos antigos hardcoded: cards KPI em azul/roxo/amarelo/vermelho, fonte Leaflet ainda Inter, botões/labels com blue-500/600, e componentes usando gradientes antigos de DashboardCards.

Plano de ajuste sem quebrar funcionalidades existentes:

1. Corrigir base global
- Remover o override que força Leaflet para Inter e trocar para DM Sans.
- Ajustar `primary.hover`, `primary.active`, `secondary.hover`, `secondary.active` no Tailwind para tokens MobNex, não azul/ciano antigos.
- Manter todas as variáveis semânticas existentes para não quebrar componentes.

2. Trocar cartões e métricas compartilhados para MobNex
- Revisar `src/components/ui/DashboardCards.tsx`, que alimenta várias telas analíticas.
- Substituir `GRADIENT_CARDS` multicoloridos por variações MobNex: navy/card com borda fina, destaque verde/azul apenas em ícones, barras e acentos.
- Manter nomes/exportações atuais para preservar as telas que já importam esse arquivo.

3. Aplicar MobNex na Sala de Guerra visível na home
- Trocar `WarKPICard` para usar card MobNex: fundo card/navy, borda 0.5–1px, radius 8px, acento verde/azul, sem blocos sólidos azul/amarelo/roxo.
- Ajustar botões de filtro do mapa e botão de atualização para padrão MobNex.
- Ajustar painel de alertas para cards escuros com borda lateral por severidade, porém usando tokens semânticos.
- Preservar consultas, navegação, mapa, tracking, alertas e KPIs exatamente como estão.

4. Aplicar identidade no menu lateral
- Trocar active/hover de `bg-white/20` e `bg-secondary` para verde MobNex/`sidebar-primary`.
- Ajustar badge de campanha para verde/azul MobNex em vez de blue-500/amber-500 hardcoded.
- Manter offcanvas e comportamento atual.

5. Revisar páginas com hardcoded mais visíveis
- Corrigir pelo menos `Pesquisas`, `Agenda`, `TrackingDashboard` e cards comuns onde aparecem `bg-blue-*`, `bg-purple-*`, `bg-[hsl(...)]`, `text-white` desnecessário ou gradientes antigos.
- Onde a cor indicar status real (erro, alerta, sucesso), manter a semântica visual, mas via tokens (`status-*`, `brand-*`) em vez de paleta Tailwind fixa.

6. Validar no preview
- Verificar a home/Sala de Guerra no viewport atual.
- Conferir se DM Sans está aplicada e se o visual ficou claramente MobNex: navy dominante, verde primário, cards sóbrios e sem blocos multicoloridos antigos.
- Checar console para erros após as mudanças.