## Problema

No card do usuário em `/campo`, abaixo do nome aparece **"COORDENADOR GERAL"**, que vem de `ROLE_LABELS[roles[0]]` — ou seja, é o **nível de acesso do sistema** (`coordenador_geral`). Isso passa a impressão de que o Zé Elias é *o* Coordenador Geral da campanha, quando na verdade ele **integra a Coordenação Geral** com uma função específica atribuída no cadastro dele (`campaign_members.role`, ex.: "Estratégia Digital", "Mobilização", etc.).

## Diagnóstico

- Tabela `campaign_members` já tem a coluna `role` (função específica) + `hierarchy_level` (tier).
- O componente `Campo.tsx` (linhas 89, 150-152) só lê `roles[0]` do `AuthContext` e exibe o rótulo do tier, sem buscar o `campaign_members` do usuário.
- Mesmo padrão pode aparecer em outras telas (sidebar, header), mas a queixa é o card do `/campo`.

## Formato sugerido (recomendado)

Reorganizar o bloco de identidade em **3 linhas**, deixando claro o que é função e o que é área:

```text
┌─────────────────────────────────────────────┐
│ [avatar]  Zé Elias                          │
│           Estratégia Digital                │  ← função (campaign_members.role)
│           [chip] Coordenação Geral · Nível 1│  ← área/tier do sistema
└─────────────────────────────────────────────┘
```

Regras:
- **Linha 1** — `profile.full_name` (negrito, branco).
- **Linha 2** — função específica do `campaign_members.role` do usuário logado (verde mint, peso médio). Se o usuário não tiver registro em `campaign_members`, oculta a linha.
- **Linha 3** — chip discreto com a **área/tier** vinda de `ROLE_LABELS` mas reescrita como área ("Coordenação Geral", "Coordenação Estadual", "Coordenação Macrorregional" etc.), nunca mais como cargo individual. Inclui "Nível N" quando disponível.
- Sem `campaign_members.role` cadastrado → linha 2 vira `"Integrante"` e o chip continua como "Coordenação Geral".

## Implementação técnica

1. **Hook novo** `useMyCampaignMembership()` em `src/hooks/useMyCampaignMembership.ts`:
   - Query TanStack em `campaign_members` filtrando `user_id = auth.uid()`.
   - Retorna `{ role, hierarchy_level, municipality, macroregion_id }`.
2. **`src/types/database.ts`** — adicionar mapa `ROLE_AREA_LABELS` que traduz cada `app_role` para a forma "área" (ex.: `coordenador_geral` → `"Coordenação Geral"`).
3. **`src/pages/Campo.tsx`** (bloco linhas 148-153):
   - Substituir o `roleLabel` único por:
     - `functionLabel` = `membership?.role ?? 'Integrante'`
     - `areaLabel` = `ROLE_AREA_LABELS[roles[0]]`
   - Renderizar conforme o layout acima (chip pequeno com borda mint suave para a área).
4. Sem alteração de schema, sem alteração de RLS, sem mudar nenhum outro card além do `/campo`.

## Fora de escopo

- Sidebar/header globais (mesmo problema pode existir, mas a queixa é o card do Campo).
- Edição do `campaign_members.role` — gerenciado na tela de Hierarquia, sem mudança aqui.