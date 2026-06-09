## Problema
O `AppLayout` (header global) exibe apenas um avatar decorativo com as iniciais "JM" fixas. Não há nenhum botão/menu para encerrar a sessão. A função `signOut` já existe no `AuthContext`, mas não está conectada a nenhum elemento da UI principal — só aparece dentro de `TrackingColeta.tsx`.

## Solução
Transformar o avatar do header (`src/components/layout/AppLayout.tsx`) em um menu de usuário (DropdownMenu do shadcn) com:

1. **Iniciais reais do usuário** — derivadas de `profile.full_name` (ou e-mail como fallback) em vez do "JM" hardcoded.
2. **Cabeçalho do menu** mostrando nome completo e e-mail do usuário logado.
3. **Item "Sair"** com ícone `LogOut` que:
   - chama `signOut()` do `useAuth()`
   - navega para `/login` com `replace: true` após a confirmação

### Arquivos alterados
- `src/components/layout/AppLayout.tsx` — substituir o `<div>` do avatar por um `<DropdownMenu>` com `DropdownMenuTrigger` (avatar), `DropdownMenuLabel` (nome/email), `DropdownMenuSeparator` e `DropdownMenuItem` "Sair". Importar `useAuth`, `useNavigate`, `LogOut` e os componentes de dropdown já existentes em `src/components/ui/dropdown-menu.tsx`.

Nenhuma alteração de banco, rotas ou lógica de autenticação é necessária — apenas expor o `signOut` já existente na UI.