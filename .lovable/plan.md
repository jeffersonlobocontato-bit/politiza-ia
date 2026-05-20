## Revisão funcional da plataforma — Diagnóstico

Vou navegar pela plataforma logada (sessão já ativa como Jefferson) e testar cada módulo no preview, validando carregamento, dados, interações principais e erros de console/rede. **Nenhum código será alterado nesta etapa** — entrego um relatório priorizado e você decide o que corrigir.

### Módulos a testar (na ordem)

1. **Sala de Guerra** (`/`) — KPIs, gráfico de pesquisas do candidato ativo, alertas, navegação por clique nos KPIs
2. **Mapa Estratégico** (`/mapa`) — camadas (Operacional / Político / Heatmap), polígonos GeoJSON, tooltips
3. **Territórios** (`/territorios`) — 19 Associações, Curitiba vs RMC, drill-down
4. **Municípios** (`/municipios`) — agrupamento por Associação, Raio-X de cidade
5. **Ações / Campo** (`/acoes`, `/campo`) — wizard mobile, geolocalização obrigatória, registro de impacto
6. **Ativos Políticos** (`/ativos`) — CRM de lideranças, perfis dinâmicos, alinhamento
7. **Pesquisas** (`/pesquisas`) — upload PDF, parse via Gemini, ferramenta "Cruzar"
8. **Hierarquia** (`/hierarquia`) — 6 níveis, "Vaga Aberta"
9. **Tracking Dashboard** (`/tracking`) — rodadas, índices de risco, cruzamentos demográficos e geográficos, agente IA
10. **Tracking Coleta** (`/tracking/coleta/:shareCode`) — formulário mobile, GPS, skip logic (com um shareCode real do banco)
11. **Agenda** (`/agenda`) — calendário unificado de ações/tracking/alertas
12. **Sala de Crise** (`/sala-de-crise`) — alertas estratégicos + operacionais, notas obrigatórias
13. **Proporcional** (`/proporcional`) — projeções de voto, índice de confiabilidade (se candidato proporcional)
14. **Configurações** (`/configuracoes`) — gestão de candidatos, presets, troca de candidato ativo
15. **Login** (logout/login flow) — verificação rápida do fluxo de autenticação

### O que valido em cada módulo

- **Carregamento**: página renderiza sem tela em branco / spinner infinito
- **Dados reais**: queries Supabase retornam (não fica vazio quando deveria ter dados)
- **Interações principais**: 1–2 cliques chave por módulo (abrir modal, trocar filtro, drill-down)
- **Console / rede**: erros JS, 4xx/5xx, queries que falham silenciosamente
- **Consistência com candidato ativo**: trocar candidato e verificar se o módulo reage
- **Responsividade**: viewport atual (888px) — quebras óbvias

### Não está no escopo desta rodada

- Auditoria visual completa do design system MobNex (35 ocorrências de cores hardcoded já mapeadas)
- 51 warnings de segurança do linter Supabase (RLS permissiva, SECURITY DEFINER expostos, bucket público listável, proteção de senha vazada desligada)
- Refatoração de hooks/queries duplicadas
- Testes destrutivos (delete, edição de dados de produção) — apenas leitura e criação reversível

Esses ficam para rodadas futuras conforme sua prioridade.

### Entregável

Relatório estruturado por módulo no chat, classificando cada achado como:

- 🔴 **Crítico** — quebra funcional, dados não carregam, erro bloqueante
- 🟡 **Médio** — funcionalidade parcial, UX confusa, erro não bloqueante
- 🟢 **Baixo** — melhoria sugerida, polish

Ao final, lista priorizada do que recomendo corrigir primeiro e estimativa de esforço por item.

### Tempo estimado

~15–20 minutos navegando a plataforma + redação do relatório. Você pode interromper a qualquer momento se quiser focar em um módulo específico.
