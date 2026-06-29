# Análise IA + Upload de Pesquisas no Painel de Inteligência

## Objetivo
1. Adicionar nova aba **"Análise IA"** ao menu do painel `/pesquisas` (junto com Painel Geral, Cruzamento, Ameaças, Oportunidades, Raio-X, Ações).
2. Permitir **upload de novas pesquisas** (PDF) que serão extraídas via IA e incorporadas ao contexto de análise.

---

## 1. Nova aba "Análise IA"

### UI
- Adicionar `TabsTrigger` "Análise IA" com ícone `Sparkles` ou `Bot` em `src/pages/Inteligencia.tsx`.
- Conteúdo: componente `<AnaliseIAChat />` em `src/components/inteligencia/AnaliseIAChat.tsx`.

### Funcionalidade
- Chat com threads persistentes (uma análise = uma thread).
- Lista lateral de threads anteriores + botão "Nova análise".
- Composer com sugestões rápidas: "Compare Moro vs Requião nas últimas 3 pesquisas", "Identifique tendências do Sandro Alex", "Gere relatório executivo".
- Mensagens com streaming, renderização markdown, ações copiar/regenerar (AI Elements).

### Acesso
- Restrito a coordenadores: `admin_master`, `coordenador_geral`, `coordenador_estadual` (via função `is_admin` existente + role check).

---

## 2. Upload de novas pesquisas

### UI
- Botão "Upload de Pesquisa" no topo do painel de Inteligência (ou dentro da aba "Análise IA").
- Modal com:
  - Upload de PDF
  - Campos opcionais: Instituto, Data, Cenário (auto-preenchidos pela IA após extração)
  - Botão "Extrair e adicionar"

### Backend
- Reutilizar a Edge Function existente **`parse-survey-pdf`** (já presente em `supabase/functions/parse-survey-pdf/`).
- Persistir a pesquisa extraída em `electoral_surveys` + `survey_results` (tabelas já existentes).
- A nova pesquisa fica imediatamente disponível para análise IA e nas abas Cruzamento/Painel.

---

## 3. Banco de Dados

### Novas tabelas

```sql
chat_threads
  id uuid PK
  user_id uuid (auth.uid)
  title text
  context_snapshot jsonb  -- snapshot do estado das pesquisas no momento da criação
  created_at, updated_at timestamptz

chat_messages
  id uuid PK
  thread_id uuid FK -> chat_threads (cascade delete)
  role text ('user' | 'assistant')
  parts jsonb  -- AI SDK UIMessage parts
  created_at timestamptz
```

### Segurança
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated`
- `GRANT ALL ON ... TO service_role`
- RLS: usuário só vê suas próprias threads/mensagens (`user_id = auth.uid()`).
- Restrição adicional via policy: somente coordenadores podem inserir (`public.is_admin(auth.uid())`).

---

## 4. Edge Function `chat-inteligencia`

- **Modelo**: `google/gemini-3.5-flash` (rápido e bom para análises estruturadas).
- **System prompt** dinâmico contendo:
  - Dados consolidados das pesquisas (lidos de `electoral_surveys` + `survey_results` + dados hardcoded atuais como fallback).
  - Segmentos, rejeição, limiares, ações estratégicas do painel.
  - Instruções para citar fontes (instituto + data) e usar markdown.
- **Streaming** via `streamText` + `toUIMessageStreamResponse`.
- **Persistência**: salva mensagem do usuário antes do stream e a resposta no `onFinish`.
- **Validação JWT** + check de role.

---

## 5. Arquitetura de Dados de Contexto

Atualmente os dados de pesquisas em `Inteligencia.tsx` estão hardcoded. Para a IA ter contexto atualizado:

1. Extrair os datasets (`PESQUISAS`, `SEGMENTOS`, `REJEICAO`, `LIMIARES`, `ACOES`) para `src/data/inteligenciaData.ts`.
2. Criar helper `src/lib/buildInteligenciaContext.ts` que:
   - Carrega dados estáticos do módulo acima.
   - Faz merge com pesquisas dinâmicas da tabela `electoral_surveys`.
   - Retorna texto markdown estruturado para injetar no system prompt.
3. A Edge Function chama este builder no servidor (versão Deno do módulo, ou reconstrói a partir de queries SQL diretas).

---

## 6. Fluxo de Uso

1. Coordenador acessa `/pesquisas` → aba **"Análise IA"**.
2. Clica em "Nova análise", digita: *"Compare a evolução do Moro entre PP mai/26 e PP jun/26 e identifique riscos."*
3. IA responde com análise baseada nos dados reais, citando institutos e percentuais.
4. Coordenador faz upload de uma nova pesquisa via botão "Upload".
5. PDF é processado, dados extraídos vão para `electoral_surveys`.
6. Próximas perguntas na thread já consideram a nova pesquisa.

---

## 7. Entregáveis

| Fase | Entrega |
|------|---------|
| 1 | Extrair dados hardcoded → `src/data/inteligenciaData.ts` + builder de contexto |
| 2 | Migração: tabelas `chat_threads`, `chat_messages` + RLS/GRANTs |
| 3 | Edge Function `chat-inteligencia` (streaming, contexto, persistência, role check) |
| 4 | Instalar AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`) |
| 5 | Componente `<AnaliseIAChat />` com thread list + chat window |
| 6 | Nova aba "Análise IA" em `Inteligencia.tsx` |
| 7 | Modal de upload de pesquisa reutilizando `parse-survey-pdf` |
| 8 | Teste E2E: criar thread, upload de PDF, pergunta que cite a pesquisa nova |

---

## Notas Técnicas
- React Router clássico (não TanStack).
- Persistência **database-backed** (Supabase / Lovable Cloud).
- Threads com URL própria: `/pesquisas?thread=<id>` (query param, pois fica dentro do painel de Inteligência).
- `LOVABLE_API_KEY` já configurado.
- Edge Function `parse-survey-pdf` já existe — apenas conectar à UI da nova aba.