## Objetivo

Permitir que cada relatório de RAIO-X seja **salvo manualmente no card do ativo político** (após revisão, com opção de pedir nova análise) e adicionar um CTA **"Ver Perfil"** que expande todos os dados relacionados ao ativo, incluindo o histórico de RAIO-X salvos.

## O que será construído

### 1. Persistência dos relatórios RAIO-X
Nova tabela `raio_x_reports` no banco, ligada ao ativo por uma chave estável (origem + id de origem + nome + município), para funcionar tanto para ativos nativos quanto para os que vêm de outras tabelas (candidatos, coordenadores, prefeitos etc.).

Campos principais:
- Identificação do ativo (origem, id de origem, nome, município, cargo, partido)
- Conteúdo do relatório (HTML renderizado + Markdown/texto para busca)
- Contexto usado na geração e modelo/data
- Autor, timestamps, soft-delete

### 2. Fluxo "Gerar → Revisar → Salvar" no painel RAIO-X (`public/raio-x.html`)
- Após o relatório ser gerado, aparecem no topo da coluna direita três ações:
  - **Salvar no perfil do ativo** (envia via `postMessage` para a janela que abriu o painel)
  - **Refazer análise** (permite ajustar o contexto e regerar antes de salvar)
  - **Descartar** (fecha sem salvar)
- Nada é salvo automaticamente. O painel só envia o conteúdo para a plataforma quando o usuário clica em "Salvar no perfil".

### 3. Recebimento e persistência na plataforma
Na página **Ativos Políticos**:
- Um listener global de `postMessage` recebe o relatório e abre um modal de **revisão final** com preview do relatório e um textarea de "notas do analista".
- Ao confirmar, grava em `raio_x_reports` vinculado ao ativo que originou a investigação.
- Toast de sucesso + o card ganha um selo indicando quantos RAIO-X existem.

### 4. CTA "Ver Perfil" nos cards
Botão principal em cada card (ao lado ou substituindo a área de ações). Abre um **painel lateral (Sheet)** com todos os dados do ativo em seções:

- **Identificação** — nome, cargo, tipo, origem, município, macrorregião, associação
- **Alinhamento & influência** — status, nível, apoio, perfis de liderança vinculados
- **Contato** — telefone, e-mail, responsável pelo relacionamento, indicado por
- **Observações estratégicas**
- **Investigações RAIO-X** — lista dos relatórios salvos, com data/autor. Cada item abre o relatório renderizado em um viewer inline (ou reabre o painel RAIO-X com o conteúdo). Botões: **Nova investigação** (abre RAIO-X) e por relatório: **Ver**, **Excluir**.

## Detalhes técnicos

**Migração (Lovable Cloud):**
```sql
CREATE TABLE public.raio_x_reports (
  id uuid PK default gen_random_uuid(),
  asset_origin text NOT NULL,        -- 'nativo' | 'candidato' | 'coordenador' | 'evento'
  asset_source_id uuid,              -- id na tabela de origem (nullable)
  asset_key text NOT NULL,           -- fallback: lower(nome||'|'||municipio)
  subject_name text NOT NULL,
  subject_municipality text,
  subject_party text,
  subject_position text,
  context_input text,
  report_html text NOT NULL,
  report_markdown text,
  model text,
  reviewer_notes text,
  created_by uuid REFERENCES auth.users,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```
Índices em `(asset_origin, asset_source_id)` e `asset_key`. GRANTs para `authenticated`/`service_role`. RLS: SELECT/INSERT/UPDATE(soft-delete) permitido para usuários com papel `admin_master`, `coordenador_geral` ou `coordenador_estadual` (mesmos que já podem fazer RAIO-X).

**Ponte janela↔janela:**
- `RaioXModal.openRaioX` passa um `session_id` na URL do popup.
- Popup envia `window.opener.postMessage({ type: 'raiox:save', session_id, html, markdown, context, subject })` no clique de "Salvar no perfil".
- `AtivosPoliticos` mantém `sessionMap: session_id → UnifiedAsset` para saber a que card vincular.

**Novos arquivos:**
- `src/hooks/useRaioXReports.ts` — list/create/delete
- `src/components/ativos/AssetProfileSheet.tsx` — o "Ver Perfil"
- `src/components/ativos/RaioXReviewDialog.tsx` — modal de revisão pré-save
- `src/components/ativos/RaioXReportViewer.tsx` — viewer do HTML salvo (iframe sandboxed)

**Arquivos alterados:**
- `public/raio-x.html` — barra de ações "Salvar / Refazer / Descartar" + `postMessage`
- `src/components/ativos/RaioXModal.tsx` / `openRaioX` — gera `session_id`
- `src/pages/AtivosPoliticos.tsx` — listener de `postMessage`, CTA "Ver Perfil", integração do Sheet

## Fora do escopo desta entrega
- Exportar PDF do relatório salvo (fica para depois se necessário)
- Compartilhar/linkar relatório entre usuários
