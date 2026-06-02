## Multi-candidato simultâneo + vínculo de usuário a candidato

### Objetivo
Permitir múltiplos candidatos ativos ao mesmo tempo. Admin master (Jefferson, Edson, Julio) vê tudo consolidado com filtro opcional por candidato. Usuários comuns (Lucas, Deltan, Marcelo, etc.) ficam restritos aos candidatos vinculados a eles.

### 1. Banco de dados

**Remover restrição de candidato único**
- Dropar trigger `ensure_single_active_candidate` e a função correspondente. Permite múltiplos `candidates.is_active = true`.

**Nova tabela `user_candidates` (N:N)**
- Campos: `user_id`, `candidate_id`, `created_at`, `created_by`
- Único: (`user_id`, `candidate_id`)
- RLS: admin gerencia (ALL); autenticados leem
- GRANT padrão (authenticated + service_role)

**Função helper `can_view_candidate_record(_user_id, _candidate_id)`**
- Retorna true se: admin OR sem vínculo de candidato algum (usuário "livre") OR `_candidate_id` está na lista vinculada
- Tratar `_candidate_id IS NULL` como visível (registros legados sem candidato)

**Função `get_user_candidate_ids(_user_id)`** — retorna array de UUIDs vinculados (usada no frontend via RPC)

**Atualizar RLS SELECT (regra União) nas tabelas com `candidate_id`:**
- `tracking_rounds`, `tracking_interviews` (via join), `tracking_ai_*`, `vote_projections`, `leaders` (campo `candidate_id` já existe)
- Para `actions`, `political_assets`, `campaign_members`, `electoral_surveys` que NÃO têm `candidate_id`: adicionar coluna `candidate_id uuid` nullable. Default da inserção será o(s) candidato(s) ativo(s) do contexto.
- Política SELECT passa a ser: `can_view_creator_record(...) OR can_view_party_record(...) OR can_view_candidate_record(auth.uid(), candidate_id)` (União conforme escolhido).

### 2. Frontend

**Hook `useUserCandidates`** — lê IDs vinculados do usuário logado e expõe `isAdmin`, `scopedCandidateIds`, `hasFullAccess`.

**Contexto "Candidato Ativo" (refatorar)**
- Hoje seleciona um único candidato global. Passa a suportar:
  - Admin: estado inicial = "Todos" (consolidado). Seletor permite focar 1 candidato.
  - Não-admin com 1 vínculo: trava no candidato vinculado.
  - Não-admin com N vínculos: seletor restrito à lista dele.
- Persistência via localStorage (chave `activeCandidateFilter`).

**Header / Topbar**
- Substituir o atual "Candidato Ativo" único por dropdown "Visualizando: Todos os candidatos ▾ | <Candidato X>".

**Configurações → Usuários (UsersManager)**
- Adicionar seção "Candidatos vinculados" no formulário de criar/editar usuário: multi-select de candidatos. Salva em `user_candidates` via edge function `manage-user` (novas actions: `set_candidates`).

**Filtragem nas queries**
- Onde existir filtro `candidate_id = activeCandidate.id`, atualizar para:
  - se "Todos" + admin → sem filtro
  - se candidato selecionado → `eq('candidate_id', id)`
  - usuário escopado → `in('candidate_id', scopedCandidateIds)`

**Cadastros novos**
- Em forms de leader/action/asset/survey/round, preencher `candidate_id` automaticamente com o candidato em foco; se "Todos", obrigar seleção.

### 3. Edge function `manage-user`
- Nova action `set_candidates`: recebe `{ user_id, candidate_ids[] }`, faz delete+insert em `user_candidates`.
- Listagem de usuários passa a retornar `candidate_ids`.

### 4. Memória do projeto
- Atualizar `mem://index.md` Core: "Múltiplos candidatos ativos simultaneamente; admin vê consolidado, usuários veem apenas candidatos vinculados (tabela user_candidates)."
- Atualizar/renomear memory `candidate-centric-strategy` para refletir nova lógica multi-candidato.

### Detalhes técnicos (resumo)
- Migration 1: drop trigger + função `ensure_single_active_candidate`
- Migration 2: create `user_candidates` + GRANTs + RLS
- Migration 3: helpers `can_view_candidate_record` + `get_user_candidate_ids`
- Migration 4: add `candidate_id` em `actions`, `political_assets`, `campaign_members`, `electoral_surveys`
- Migration 5: refatorar políticas SELECT para União (criador OR partido OR candidato vinculado OR admin)
- Edge function update + UsersManager UI + ActiveCandidateContext refactor + Topbar seletor

### Fluxo do usuário final
- Jefferson loga → vê dashboard consolidado de todos os candidatos ativos; pode filtrar para "Candidato Senado Novo" e ver só ele.
- Lucas Souza loga → automaticamente travado no candidato Senado Novo; não enxerga registros do Filipe.
- Deltan/Marcelo logam → travados no candidato Senado Filipe.
- Cadastrar vínculos: Configurações → Usuários → editar usuário → escolher candidatos.