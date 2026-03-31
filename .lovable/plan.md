

## Módulo de Tracking Completo com Inteligência Artificial

Este é um projeto grande que será implementado em fases sequenciais. O módulo de Tracking é um sistema de pesquisa de campo próprio (diferente das pesquisas eleitorais já existentes), com coleta de dados por entrevistadores, dashboard analítico e uma camada de IA que cruza os resultados com ações de campo.

---

### Fase 1 — Banco de Dados (Migration)

Criar as seguintes tabelas:

**`tracking_rounds`** — Rodadas de pesquisa de campo
- id, candidate_id, title, description, territory_scope, start_date, end_date, status (aberta/fechada/em_analise), target_interviews, created_by, created_at, updated_at, deleted_at

**`tracking_interviews`** — Entrevistas realizadas em campo
- id, round_id, interviewer_id, municipality, microregion, macroregion_id, lat, lng, respondent_age_range, respondent_gender, respondent_income, respondent_education, created_at

**`tracking_interview_answers`** — Respostas de cada entrevista
- id, interview_id, question_key (ex: intencao_voto, rejeicao, conhecimento), answer_value, candidate_name, created_at

**`tracking_ai_insights`** — Insights gerados pela IA
- id, round_id, candidate_id, insight_type (performance/eficiencia/capilaridade/oportunidade), territory_scope, municipality, microregion, macroregion_id, title, description, recommendation, severity (1-10), priority_score, capillarity_score, efficiency_score, source_data (jsonb), status (novo/visualizado/em_analise/resolvido), resolution_note, created_at, updated_at

**`tracking_ai_alerts`** — Alertas territoriais de ativação
- id, round_id, candidate_id, alert_type (baixa_capilaridade/queda_tracking/oportunidade_expansao/baixa_eficiencia/indecisos_altos), municipality, microregion, macroregion_id, title, description, recommendation, severity, priority_score, status (novo/visualizado/em_analise/resolvido), resolution_note, field_actions_count, tracking_variation, capillarity_index, generated_from (jsonb), created_at, updated_at

Habilitar RLS em todas as tabelas. Entrevistadores (operador_campo) só podem inserir entrevistas; apenas admin/coordenação vê insights e alertas. Habilitar realtime para `tracking_ai_alerts`.

---

### Fase 2 — Formulário de Entrevista (Campo)

Criar a página `/tracking` com formulário mobile-first para entrevistadores:

- Selecionar rodada ativa
- Informar município (com geolocalização automática)
- Preencher perfil do respondente (gênero, idade, renda, escolaridade)
- Responder perguntas-chave: intenção de voto espontânea, intenção de voto estimulada, rejeição, candidato mais conhecido, avaliação do governo
- Salvar entrevista no banco
- Mostrar contador de entrevistas realizadas na rodada

Operadores de campo acessam **apenas** este formulário.

---

### Fase 3 — Dashboard Analítico de Tracking

Criar a página `/tracking/dashboard` (restrita a admin/coordenação):

**Big Numbers:**
- Total de entrevistas realizadas
- Cobertura territorial (cidades com entrevistas / total)
- Intenção de voto atual (consolidado)
- Variação entre rodadas
- Cidades com crescimento / queda
- Regiões que exigem ativação
- Territórios com baixa capilaridade

**Gráficos:**
- Evolução da intenção de voto por rodada (LineChart)
- Ranking de candidatos por rodada (BarChart)
- Distribuição por cross-tabs (gênero, idade, renda)

**Card de Alertas Estratégicos (clicável):**
- Quantidade de alertas ativos
- Regiões com necessidade de ativação
- Cidades com baixa capilaridade
- Clique abre a página de apontamentos

**Mapa Analítico:**
- Cidades coloridas por performance (vermelho=risco, amarelo=atenção, verde=bom, azul=oportunidade)
- Clique no território abre popup com dados do tracking + ações de campo + insight gerado

---

### Fase 4 — Edge Function de IA (`tracking-analysis`)

Criar `supabase/functions/tracking-analysis/index.ts`:

**Dados que cruza:**
1. Tracking: intenção de voto, rejeição, indecisos, variação entre rodadas — por município/micro/macro
2. Ações de campo: contagem, status, pessoas impactadas, frequência — por território e período

**Índices calculados:**
- **Índice de Capilaridade Territorial** (0-100): ações realizadas × frequência × cobertura territorial × lideranças ativas × presença recente
- **Índice de Eficiência Operacional** (0-100): esforço realizado vs variação do tracking × pessoas impactadas × consistência
- **Índice de Prioridade de Ativação** (0-100): queda/estagnação tracking × indecisos × baixa presença × baixa capilaridade

**Regras analíticas:**
- Tracking caiu + poucas ações → alerta de baixa presença
- Tracking estável + muitas ações → insight de baixa eficiência
- Tracking subiu + ações reforçadas → insight de boa conversão
- Indecisos altos + baixa ativação → alerta de oportunidade
- Cidade sem ação recente → alerta de capilaridade baixa

**IA (Lovable AI):** Gera recomendações textuais usando `google/gemini-2.5-flash-lite` com contexto dos dados cruzados.

**Persistência:** Insere resultados em `tracking_ai_insights` e `tracking_ai_alerts`.

**Execução:** Automática ao fechar rodada + botão manual no dashboard + possível pg_cron.

---

### Fase 5 — Página de Apontamentos Estratégicos

Criar `/tracking/apontamentos` (abre ao clicar no card de alertas):

- Lista todos insights e alertas gerados
- Filtros: cidade, microrregião, macrorregião, severidade, tipo de alerta, candidato, período
- Ordenar por prioridade
- Cada apontamento mostra: território, resumo, dados fonte, recomendação, ações de campo vinculadas, score, status de tratamento
- Badges de severidade com cores do design system
- Gestão de status com nota obrigatória de resolução

---

### Fase 6 — Integração com Navegação

- Adicionar "Tracking" na sidebar (`scope: 'shared'`, ícone `Activity`)
- Sub-rotas: `/tracking` (formulário), `/tracking/dashboard`, `/tracking/apontamentos`
- Operador de campo vê apenas `/tracking`; admin/coordenação vê dashboard e apontamentos
- Adicionar role `entrevistador_tracking` ao enum `app_role` (se necessário) ou reutilizar `operador_campo`

---

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar 4 tabelas + RLS + realtime |
| `src/types/database.ts` | Adicionar tipos das novas tabelas |
| `src/hooks/useTracking.ts` | CRUD de rodadas, entrevistas, respostas |
| `src/hooks/useTrackingInsights.ts` | Fetch insights e alertas da IA |
| `src/pages/TrackingForm.tsx` | Formulário do entrevistador |
| `src/pages/TrackingDashboard.tsx` | Dashboard analítico completo |
| `src/pages/TrackingInsights.tsx` | Página de apontamentos |
| `supabase/functions/tracking-analysis/index.ts` | Edge Function de IA |
| `src/App.tsx` | Novas rotas |
| `src/components/layout/AppSidebar.tsx` | Novo item de menu |

---

### Restrições de segurança

- `operador_campo` pode INSERT em `tracking_interviews` e `tracking_interview_answers`; SELECT apenas seus registros
- Apenas admin/coordenação pode SELECT em `tracking_ai_insights` e `tracking_ai_alerts`
- Notas de resolução obrigatórias para mudança de status dos alertas
- Dados 100% reais, nada mockado

Este plano será implementado sequencialmente, começando pelo banco de dados e subindo até a camada de IA.

