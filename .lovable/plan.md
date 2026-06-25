## Problema

Já corrigimos o card de identidade em `/campo` (linha 2 = função do `campaign_members.role`, chip = área/tier). Mas a identificação do usuário no resto da plataforma (header global e rodapé do sidebar) **não usa** essa função. Hoje:

- **Header (AppLayout)** — dropdown do avatar mostra só nome + e-mail, sem indicar que o Zé Elias está na Coordenação Geral com função "Coordenação Operacional / Eventos".
- **Sidebar (AppSidebar)** — o rodapé mostra apenas o candidato ativo, nada sobre o usuário logado.

Resultado: em qualquer tela que não seja `/campo`, não fica claro que o Zé Elias integra a Coordenação Geral com uma função específica — e onde aparece algo (Hierarquia, lead da Coordenação Central) o subtítulo "Coordenador Geral" é hardcoded e dá a entender que ele é *o* coordenador titular.

Confirmado no banco:
- `profiles`: Zé Elias, role de sistema `coordenador_geral`.
- `campaign_members`: `role = "Coordenação Operacional / Eventos"`, `hierarchy_level = 2`, casado por email pelo RPC `get_my_campaign_member` (já testado, retorna o registro correto).

## Solução

Reaproveitar o `useMyCampaignMembership()` e o mapa `ROLE_AREA_LABELS` já criados na correção anterior, propagando o mesmo padrão de 2 linhas em mais 2 pontos:

### 1. `src/components/layout/AppLayout.tsx` — dropdown do avatar
Atualizar o `DropdownMenuLabel` (linhas 107-111) para 3 linhas:

```
Zé Elias                                    ← profile.full_name (semibold)
Coordenação Operacional / Eventos           ← membership.role  (xs, primary)
[chip] Coordenação Geral · Nível 2          ← ROLE_AREA_LABELS + level
zeelias@usa.net                             ← email (xs, muted)
```

- Sem `membership?.role` → linha 2 vira "Integrante".
- Sem hit em `campaign_members` → omite o "Nível N".

### 2. `src/components/layout/AppSidebar.tsx` — rodapé
Adicionar acima do bloco do candidato ativo (linha 152) um mini-card de identidade do usuário com a mesma estrutura: nome + função + chip de área. Visível só quando o sidebar não está colapsado e quando há `profile`.

### 3. `src/pages/Hierarquia.tsx` — subtítulo do lead da Coordenação Central
Hoje (linha 807) renderiza `subtitle: 'Coordenador Geral'` fixo no card lead da Coordenação Central. Trocar por:

- Se o `campaign_members.role` do próprio card existir → usar `role` dele.
- Senão → manter "Coordenador Geral".

Isso evita que qualquer membro lead da Coordenação Central apareça rotulado como "Coordenador Geral".

## Fora de escopo

- Mudanças de schema, RLS ou no RPC `get_my_campaign_member` (já funcionam).
- Outras telas além de AppLayout, AppSidebar e o card-lead da Hierarquia.
- Edição da função do `campaign_members` (já feita na tela de Hierarquia).
