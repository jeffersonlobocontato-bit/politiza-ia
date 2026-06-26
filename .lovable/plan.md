## Objetivo

1. Coordenador Estadual passa a poder criar/gerenciar usuários, mas restrito aos níveis: Regional (N3), Microrregional (N4), Municipal (N5), Operador de Campo e Liderança Local.
2. Esses 5 perfis (N3, N4, N5, Operador, Liderança) só têm acesso à área **Campo › Lideranças** (não veem Sala de Guerra, Mapa, Ativos, etc.).
3. Dentro de Lideranças, cada um vê/edita **apenas as lideranças que ele próprio cadastrou** (`created_by = auth.uid()`). Admins continuam vendo tudo.

## Mudanças

### 1. Backend — Edge function `manage-user`
- Substituir a checagem `is_admin` por uma autorização escalonada:
  - `admin_master`, `coordenador_geral` → pode criar qualquer role.
  - `coordenador_estadual` → pode criar/editar/excluir/redefinir senha **apenas** para usuários cujo role esteja em `['coordenador_regional','coordenador_microrregional','coordenador_municipal','operador_campo','lideranca_local']`. Bloquear qualquer outra role no payload (`create` e `update_role`) e bloquear `delete`/`reset_password` quando o alvo for usuário fora desse conjunto.
- Demais roles continuam recebendo 403.

### 2. Frontend — `UsersManager` e `Configuracoes`
- Expor a aba "Usuários" também para `coordenador_estadual` (hoje só `isAdmin` cobre, e ele já é admin — confirmar que o gating em Configuracoes mantém o acesso).
- No formulário de criação/edição, quando o usuário logado for `coordenador_estadual` (e não admin master/geral), filtrar a lista `ROLES` para mostrar somente os 5 perfis permitidos e ocultar usuários de níveis superiores na listagem (filtrar `users` por role permitido).
- Ocultar botões editar/excluir/reset para linhas fora do escopo do coordenador estadual.

### 3. Roteamento — `RoleAwareLayout`
- Expandir `isCampoOperator` (ou criar `isCampoOnly`) para incluir os 5 roles: `coordenador_regional`, `coordenador_microrregional`, `coordenador_municipal`, `operador_campo`, `lideranca_local`.
- Esses usuários são redirecionados para `/campo` ao acessar qualquer outra rota (mesmo comportamento já existente para operador_campo).
- Em `CampoLayout`/menu de campo, garantir que o único item disponível para N3/N4/N5 seja **Lideranças** (esconder Ação, Fiscalize, Dashboard se existirem para esses perfis). Verificar `CampoLayout.tsx` e ajustar o menu condicionalmente.

### 4. RLS — tabela `leaders` (migração)
- Reescrever políticas para que usuários N3/N4/N5/Operador/Liderança vejam e modifiquem somente os registros onde `created_by = auth.uid()`. Admins (`is_admin`) continuam com acesso total. Manter compatibilidade com a regra de partido já existente (`can_view_party_record`).
- Aplicar o mesmo padrão a `leader_political_history`, `leader_party_history`, `leader_leadership_profiles` (escopo via `leader_id` pertencente ao usuário).

### Notas técnicas
- A função `is_admin` já cobre `coordenador_estadual`, então a checagem na edge function precisa ser específica: comparar o role do caller via `user_roles` em vez de só `is_admin`.
- Criar helper SQL `public.can_manage_user_role(_caller uuid, _target_role app_role)` para centralizar a regra usada pela edge function (via RPC) e por futuras policies.
- Restrição de "só ver os meus" em Lideranças assume que `leaders.created_by` é populado no insert (já é hoje pelo CampoLiderancaForm). Validar antes da migração.
