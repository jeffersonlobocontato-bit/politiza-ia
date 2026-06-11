
# Unificação: Campanha Proporcional + Chapas

## Diagnóstico

Hoje existem dois painéis tratando do **mesmo universo** (Dep. Federal e Estadual), com fontes distintas e nenhum cruzamento:

| Painel | Fonte | Granularidade | Cenários | Indicadores fortes |
|---|---|---|---|---|
| `Chapas` | `party_slate_candidates` | Partido × Cargo × Pré-cand | Bom / Médio / Ruim | Composição da chapa, filiação, ranking de votos declarado |
| `Proporcional` | `vote_projections` + `leaders` | Candidato ativo × Liderança × Município | Otimista / Intermediário / Pessimista | Capilaridade territorial, confiabilidade, ranking de lideranças |

Eles são complementares, não redundantes — o de Chapas é a **visão macro** (a chapa inteira), o de Proporcional é o **microfundamento** (quem é a liderança que entrega os votos de cada pré-cand). A unificação certa não é fundir KPIs em uma sopa única; é **encadear as duas camadas** num só módulo navegável e padronizar a linguagem de cenário.

## Visão proposta

Substituir os dois itens de menu por **um único módulo "Proporcional"** com 3 abas que respeitam o escopo do usuário (admin master vê tudo, gestor PL/Novo vê só sua chapa, usuário com `user_candidates` vê só seu pré-cand):

```text
Proporcional
├── 1. Visão de Chapa         ← consolidado por partido × cargo
├── 2. Pré-candidato          ← drill-down individual (substitui o "dashboard" do Proporcional atual)
└── 3. Lideranças & Projeções ← base operacional (já existe)
```

Nomenclatura de cenários **unificada em Bom / Médio / Ruim** (vencendo a divergência atual). `optimistic/intermediate/pessimistic` em `vote_projections` continua no banco, mas a UI passa a chamar tudo de Bom/Médio/Ruim.

---

## Aba 1 — Visão de Chapa (consolidado)

KPIs principais (linha superior, por chapa selecionada / consolidado):

- **Pré-candidatos** (Fed / Est)
- **Filiação OK / Pendente** + % de prontidão da chapa
- **Projeção Total** no cenário escolhido (Bom/Médio/Ruim) + delta vs cenário anterior
- **Quociente Eleitoral estimado** (votos totais da chapa ÷ QE de PR; gauge mostrando quantas cadeiras a chapa elege)
- **Cobertura territorial** — nº de municípios com ao menos uma liderança vinculada a algum pré-cand da chapa / 399
- **Lideranças engajadas na chapa** (distintas, somando todas as projeções dos pré-cands)
- **Ações realizadas** vinculadas à chapa (de `actions` filtradas por candidatos da chapa)

Gráficos:

- **Ranking de pré-candidatos por projeção** (barra horizontal, cenário ativo) — comparativo entre os pré-cands da mesma chapa.
- **Heatmap de cobertura PR** — mapa do estado com municípios coloridos pelo nº de pré-cands com presença ali (cruzando lideranças × `municipalities`).
- **Filiação vs Projeção** (scatter) — eixo X = status de filiação, eixo Y = votos projetados; revela pré-cand forte porém ainda pendente.
- **Comparativo "Declarado vs Estimado por base"** — barra dupla por pré-cand: votos do `party_slate_candidates` (cenário) vs soma das `vote_projections` das lideranças daquele candidato. Mostra gap entre a expectativa do gestor e o que a base realmente sustenta.

## Aba 2 — Pré-candidato (drill-down)

Substitui o dashboard atual do Proporcional. Acionada clicando num pré-cand na aba 1.

Top do card:

- Foto, nome, partido, cargo, status de filiação, cidade-base, contatos.
- 3 cenários (Bom/Médio/Ruim) declarados na chapa.
- 3 cenários (Bom/Médio/Ruim) **calculados** = soma de `vote_projections` agrupada por cenário.
- **Índice de confiabilidade** agregado (média ponderada do `reliability_index` das projeções).

Cruzamentos:

- **Mapa de capilaridade do pré-cand** — municípios com lideranças vinculadas, cor por nº de votos projetados.
- **Top 10 lideranças** do pré-cand (já existe no Proporcional atual).
- **Top 10 cidades** com mais projeção (já existe).
- **Perfis de liderança** que sustentam o pré-cand (donut por `leadership_profiles` via `leader_leadership_profiles`).
- **Pesquisas e tracking** — se o nome do pré-cand aparece em `tracking_round_questions`/`survey_results`, mostrar % intenção e variação por rodada.
- **Ações** realizadas no território do pré-cand (de `actions` filtradas por geografia das lideranças).

## Aba 3 — Lideranças & Projeções

Manter exatamente as abas atuais "Lideranças" e "Projeções" do Proporcional (CRUD operacional). Sem mudança de comportamento, só herdando o seletor de cenário Bom/Médio/Ruim na UI.

---

## Cruzamentos novos viáveis com o que já existe

| Cruzamento | Tabelas | Insight |
|---|---|---|
| Chapa × Lideranças | `party_slate_candidates` ↔ `candidates` ↔ `vote_projections` ↔ `leaders` | Gap "declarado vs sustentado" por pré-cand |
| Chapa × Território | `vote_projections` × `municipalities` × `municipality_associations` | Mapa de cobertura por Associação (19 regiões) |
| Chapa × Pesquisa | `party_slate_candidates.name` ≈ `survey_results.candidate` / `tracking_interview_answers` | % de intenção declarada vs projeção interna |
| Chapa × Ações | `actions` filtradas por `candidate_id` dos pré-cands | Intensidade de campanha por pré-cand |
| Chapa × Perfis | `leader_leadership_profiles` × `leadership_profiles` | Quais perfis (religioso, empresarial, etc.) sustentam cada pré-cand |
| Chapa × Tracking de risco | `tracking_ai_alerts` / `strategic_alerts` filtrados pelo território do pré-cand | Alertas por pré-cand |
| Quociente Eleitoral | soma projeções da chapa ÷ QE | Estimativa de cadeiras eleitas por cenário |

---

## Pré-requisito de dados

Para o cruzamento "Chapa × Lideranças" ficar **automático** (sem casamento por nome), precisamos de uma coluna `candidate_id uuid REFERENCES candidates(id)` em `party_slate_candidates`. Hoje os dois mundos não têm chave. Sugestões:

- Adicionar `candidate_id` como nullable + UI no `ChapaPartido` para vincular cada linha a um candidato existente.
- Enquanto vínculo não for preenchido, fazer o casamento por nome (normalizado lowercase/sem acento) como fallback.

## Implementação (técnica)

- Novo arquivo `src/pages/ProporcionalUnificado.tsx` (ou renomear `Proporcional.tsx`) com `<Tabs>` de 3 abas; aposentar o item de menu "Chapas" (rota `/chapas` redireciona para a aba 1 do novo módulo, preservando `/chapas/:party` para gestão CRUD do `ChapaPartido.tsx` que já existe).
- Componente reutilizado `ChapasDashboard` vira `<TabConsolidado />`.
- Novo hook `useChapaCrossAnalytics(party?, cargo?, scenario)` que junta `party_slate_candidates` + agregação de `vote_projections` por candidato.
- Mapas via Leaflet já presentes no projeto (`MapaEstrategico`), reaproveitar componente de choropleth.
- Migração leve: adicionar `candidate_id` nullable em `party_slate_candidates` + GRANTs/policy review.
- Respeitar RLS já existente (admin master vê tudo, gestor de partido vê só sua chapa).

## Fora do escopo

- Reescrever CRUD de lideranças/projeções.
- Mudar a tela `/chapas/:party` (continua sendo a tela de gestão pesada da chapa).
- Trocar nomenclatura de cenário no banco (só na UI).

## Pergunta antes de implementar

1. Confirma que quer **fundir os dois itens de menu em um só** ("Proporcional"), removendo a entrada separada "Chapas"?
2. Pode rodar a migração para adicionar `candidate_id` em `party_slate_candidates`? (Sem isso o cruzamento fica por nome — funciona, mas é frágil.)
3. Adotar **Bom/Médio/Ruim** como rótulo único em toda a UI do módulo?
