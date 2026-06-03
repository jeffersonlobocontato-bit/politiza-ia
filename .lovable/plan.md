# Melhoria no Módulo Campo: Duas Ferramentas + Cadastro de Lideranças + Mobile

## Objetivo
Transformar o Registro de Campo em um hub com duas ferramentas:
1. **Registro de Ação** (manter o wizard atual)
2. **Cadastro de Lideranças de Campo** (novo): cadastro por cidade/bairro/comunidade com segmento, histórico político e dados eleitorais para qualificar o lead.

Além disso: dashboard do operador com métricas de seus cadastros, e versão mobile (PWA) para cadastro no celular.

---

## Decisões de Arquitetura (assumidas — ajuste se discordar)

| Decisão | Escolha | Por quê |
|---------|---------|---------|
| Base de lideranças | **Reaproveitar `leaders`** | Já tem nome, contato, geolocalização, alinhamento, partido, coordenador, e tabelas filhas de histórico político (`leader_political_history`) e partidário (`leader_party_history`). Unifica CRM Político e Campo. |
| Segmentos | **Reaproveitar `leadership_profiles`** | Já existe com `name`, `category`, `color` e vinculação M2M via `leader_leadership_profiles`. Admin gerencia em Configurações. |
| Mobile | **PWA instalável** primeiro | Entrega rápida, sem conta de desenvolvedor, funciona em iOS/Android. App nativo (Capacitor) pode vir depois se necessário. |

---

## 1. Estrutura de Rotas e UI

```
/campo                    → Hub com 2 cards: "Registrar Ação" e "Cadastrar Liderança"
/campo/acao               → Wizard atual de Registro de Ação (refatorado para rota separada)
/campo/liderancas         → Lista de lideranças cadastradas + filtros + CTA "Nova Liderança"
/campo/liderancas/novo    → Wizard de cadastro de liderança (mobile-first)
/campo/liderancas/:id     → Detalhe/edição da liderança
/campo/dashboard          → Dashboard exclusivo do operador (métricas do que ele cadastrou)
```

---

## 2. Modelo de Dados

### Reaproveita (sem alterar schema)
- `leaders` — dados básicos, geolocalização, alinhamento, coordenador
- `leader_political_history` — histórico de candidaturas, mandatos, votos, cargos disputados
- `leader_party_history` — filiações partidárias
- `leader_leadership_profiles` — vinculação M2M com segmentos (`leadership_profiles`)

### Novo campo (migration leve)
- `leaders.source` (text, default 'campo' | 'crm') — opcional, para filtragem futura

### Visibilidade Hierárquica (nova function + policy)
Security definer `can_view_leader_by_scope(user_id, leader_row)` que verifica:
- `operador_campo`: vê só `created_by = seu_id`
- `coordenador_municipal`: vê só do seu `municipality`
- `coordenador_microrregional`: vê só da sua `microregion`
- `coordenador_regional`: vê só da sua `macroregion_id`
- `coordenador_estadual` / `coordenador_geral` / `admin_master`: vê tudo + o que seus subordinados cadastraram

A tabela `user_roles` já tem `macroregion_id`, `microregion`, `municipality` — usamos ela para determinar o escopo territorial do usuário logado.

---

## 3. Cadastro de Liderança — Wizard (passos)

**Passo 1 — Dados Básicos**
- Nome completo
- Telefone, e-mail
- Foto (upload simulado ou câmera)

**Passo 2 — Localização (obrigatório GPS)**
- Cidade (autocomplete das 399 cidades do Paraná)
- Bairro / Comunidade (texto livre)
- Coordenadas GPS (obrigatório, igual ao Registro de Ação)

**Passo 3 — Segmentos**
- Seleção múltipla de `leadership_profiles` (usando `LeaderProfileSelect` existente)
- Se a lista não cobrir, admin cadastra novo em Configurações

**Passo 4 — Dados Políticos e Eleitorais**
- Já foi candidato? (sim/não) → se sim: quantas vezes, quantos votos, cargos disputados
- Já teve mandato? → cargo, anos, quantos mandatos
- Já presidiu entidade? → qual entidade
- Filiado a partido? → qual, desde quando
- Quem apoiou na última eleição?
- Alinhamento atual (alinhado / provável / neutro / oposição)
- Capacidade de mobilização e influência (escala 1–10)
- Observações estratégicas

Todos os dados de histórico político/partidário vão para as tabelas filhas já existentes (`leader_political_history`, `leader_party_history`).

**Passo 5 — Revisão e Confirmação**
- Resumo visual dos dados
- Botão "Confirmar e Cadastrar"

---

## 4. Dashboard do Operador (/campo/dashboard)

Visível para `operador_campo` e acima. Cada um vê de acordo com seu escopo:

**KPIs principais:**
- Total de lideranças cadastradas (no meu escopo)
- Cadastradas nesta semana / mês
- Por segmento (donut chart — reaproveita `InfographicDonut`)
- Por cidade / bairro (bar chart — reaproveita `InfographicHBar`)
- Por alinhamento (alinhado, neutro, oposição)
- Índice de qualidade do cadastro (% de campos preenchidos)

**Lista rápida:**
- Últimas 10 lideranças cadastradas no escopo
- Busca por nome ou cidade
- CTA para editar qualquer registro

---

## 5. Versão Mobile (PWA)

- Manifest web app (`public/manifest.webmanifest`)
- Ícones e tema color
- Interface otimizada para touch (botões grandes, fonte legível)
- Geolocalização via browser GPS
- Suporte offline básico: se não houver conexão, salvar no `localStorage` e sincronizar quando voltar
- Instalável em iOS (Adicionar à Tela Inicial) e Android

---

## 6. Fluxo de Implementação (ordem sugerida)

1. **Backend**: Criar `can_view_leader_by_scope` + nova RLS policy na tabela `leaders`
2. **Rotas**: Reestruturar `/campo` como hub, criar `/campo/acao`, `/campo/liderancas`, `/campo/liderancas/novo`, `/campo/dashboard`
3. **Hook**: `useLeaders` com filtro de escopo (detecta role do usuário e aplica filtros territoriais)
4. **UI — Lista**: `/campo/liderancas` com filtros por cidade, segmento, alinhamento
5. **UI — Wizard**: Form em 5 passos reutilizando `GeoLocationInput`, `LeadershipProfileSelect`, e componentes do design system
6. **UI — Dashboard**: Cards de KPI + charts + lista rápida
7. **Mobile**: PWA manifest + responsividade + offline localStorage

---

## 7. O que não está no escopo (a menos que você peça)

- App nativo (Capacitor) — PWA primeiro, nativo como evolução
- Nova tabela separada de lideranças — unificamos no `leaders`
- Segmentos hardcoded — usamos `leadership_profiles` gerenciável
- Lógica de "subordinados" na coordenação central — escopo básico por role + território