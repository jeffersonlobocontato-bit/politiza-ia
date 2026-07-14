
# Cadastro de Membros da Equipe + Produtividade para Coordenadores de Campo

## Objetivo

Habilitar os perfis **Coordenador Macrorregional**, **Coordenador Regional** e **Coordenador Municipal** a:

1. Cadastrar e visualizar apenas os membros da própria subárvore hierárquica.
2. Acessar um dashboard de produtividade da equipe (ranking do time).
3. Fazer drill-down individual em qualquer membro subordinado para analisar sua produtividade.

Admins continuam com acesso global, sem alteração.

---

## 1. Renomeação e novo CTA no app Campo

- Renomear em toda a UI: **"Cadastrar Usuário" → "Cadastrar Membro da Equipe"**.
- Adicionar um **4º/5º CTA no `CampoDashboard`**, ao lado dos existentes (Registrar Ação, Nova Liderança, Fiscalize), chamado **"Cadastrar Membro da Equipe"**.
- CTA visível apenas para os 3 novos perfis (Macro/Regional/Municipal). Admins mantêm o acesso já existente em `/configuracoes`.
- Adicionar também um CTA **"Produtividade da Equipe"** no mesmo grupo, apontando para `/campo/produtividade`.

## 2. Tela de cadastro no Campo

- Nova rota protegida `/campo/membros`.
- Reaproveita o `UsersManager` (usado hoje em `/configuracoes`), mas em modo "escopo de equipe":
  - Lista de membros filtrada pela **subárvore** do coordenador logado (via `get_delegable_members`).
  - Formulário de criação restringe as opções de papel/hierarquia aos níveis **abaixo** do próprio.
  - Bloqueia edição/remoção de membros fora da subárvore.

## 3. Nova tela de produtividade no Campo

- Nova rota protegida `/campo/produtividade` (dentro do `CampoLayout`, mobile-first).
- Reusa o RPC `get_productivity_ranking` com autorização estendida:
  - Ranking do time (macros/micros/lideranças que estão dentro da subárvore do coordenador).
  - KPIs consolidados do time (ações, score total, score médio, pessoas impactadas).
- **Drill-down individual**: clicar em qualquer linha do ranking abre um painel/sheet com:
  - Score total, score médio, nº de ações, pessoas impactadas.
  - Lista das ações do membro (com data, município, score, pessoas).
  - Evolução temporal (mini gráfico por semana).

## 4. Backend (migrations)

### 4.1 Ajuste no RPC `get_productivity_ranking`

- Adicionar parâmetro opcional `p_member_id uuid default null`.
  - Se **nulo**: comportamento atual (ranking agregado).
  - Se **preenchido**: retorna JSON de detalhamento individual (totais + lista de ações + série temporal).
- Substituir o guard atual (`is_admin` only) por: **admin OU o `p_member_id` / subárvore consultada pertence à subárvore do usuário logado**. Reusar a lógica recursiva de `get_delegable_members`.
- Quando chamado por um coordenador sem `p_member_id`, o RPC filtra automaticamente `leader_id`, `micro_id` e `macro_id` para os que estão na subárvore dele.

### 4.2 Policies

- Nenhuma nova tabela. Apenas revisão das RLS de `campaign_members` para garantir que o coordenador consiga `INSERT` de membros cuja `supervisor_id` esteja na sua subárvore, e `SELECT`/`UPDATE`/`DELETE` restritos à mesma subárvore. Ajustar policies existentes se necessário (mantendo admin como bypass).

## 5. Roteamento e layout

- Em `RoleAwareLayout`, adicionar `/campo/membros` e `/campo/produtividade` como rotas válidas para os 3 perfis de coordenador dentro do `CampoLayout`.
- Admins seguem acessando `/configuracoes` (cadastro global) e `/produtividade` (visão estadual). Nada removido.

---

## Arquivos a criar / editar

**Criar:**
- `src/pages/CampoMembros.tsx` — tela de cadastro/listagem de membros com escopo de subárvore.
- `src/pages/CampoProdutividade.tsx` — dashboard de produtividade da equipe + drill-down.
- `src/components/campo/MemberProductivitySheet.tsx` — painel lateral de produtividade individual.
- Migration SQL para atualizar `get_productivity_ranking` e ajustar RLS de `campaign_members`.

**Editar:**
- `src/App.tsx` — registrar as novas rotas.
- `src/components/layout/RoleAwareLayout.tsx` — liberar rotas para os 3 perfis.
- `src/pages/CampoDashboard.tsx` — adicionar os 2 novos CTAs no grid.
- `src/components/settings/UsersManager.tsx` — suportar modo "scoped" (subárvore) reusável.
- `src/hooks/useProductivity.ts` — aceitar `memberId` opcional e retornar payload de detalhe quando presente.
- Textos: substituir "Cadastrar Usuário" por "Cadastrar Membro da Equipe" onde aparecer.

---

## Fora do escopo

- Não altera módulos administrativos (Inteligência, Jurídico, Emendas, Ativos etc.).
- Não altera a `/produtividade` estadual usada pelo admin master.
- Não cria novo layout — reusa `CampoLayout` existente.
