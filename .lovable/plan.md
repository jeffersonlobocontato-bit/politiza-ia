
## Objetivo

Estabelecer vínculos hierárquicos explícitos entre membros da campanha (Macro → Micro → Municipal → Liderança Local) para que o formulário, os cards e o organograma reflitam uma árvore territorial encadeada e detalhada.

## O que muda

### 1. Formulário de cadastro (`/hierarquia`) — campos condicionais por nível

O formulário passa a exibir campos de vínculo conforme o **nível hierárquico** selecionado, usando o campo `supervisor_id` já existente em `campaign_members`:

| Nível selecionado | Campos extras de vínculo |
|---|---|
| 3 — Coordenação Macrorregional | Macrorregião (já existe) |
| 4 — Coordenação Microrregional | Macrorregião + **Coordenador Macrorregional** (dropdown com membros nível 3 da mesma macro) → grava em `supervisor_id` |
| 5 — Coordenação Municipal | Macrorregião + Microrregião + **Coordenador Microrregional** (dropdown nível 4) → `supervisor_id` |
| 6 — Liderança Local | Município + **Coordenador Municipal** (dropdown nível 5 do mesmo município/micro) → `supervisor_id` |

Os dropdowns filtram dinamicamente os candidatos a "superior" pelo território informado no formulário, mostrando nome + cargo + cidade para desambiguar. Inclui opção "— Sem vínculo definido —" para não travar cadastro.

### 2. Cards da hierarquia

Cada card de membro passa a exibir, quando houver `supervisor_id`:
- Linha "Vinculado a: {nome do superior} · {cargo}"
- Para níveis 3–6, também exibe contagem de subordinados diretos ("3 microrregionais", "5 municipais", "12 lideranças")

### 3. Organograma (`HierarchyFlowchart`)

Adiciona uma nova seção **abaixo dos departamentos setoriais** chamada "Árvore Territorial", renderizando recursivamente a cadeia:

```text
Coordenador Geral (Julio Reis)
   └── Macrorregional (nível 3)
        └── Microrregional (nível 4)
             └── Municipal (nível 5)
                  └── Lideranças Locais (nível 6)
```

A árvore é construída a partir de `supervisor_id`. Membros sem vínculo aparecem agrupados numa caixa "Não vinculados" ao final, para visibilidade do problema. O PDF já existente capturará a árvore inteira (a lógica de export atual cobre todo o `data-pdf-root`).

## Detalhes técnicos

- **Sem migração**: a coluna `supervisor_id uuid` já existe em `campaign_members`. Apenas passaremos a populá-la e consultá-la.
- **`src/pages/Hierarquia.tsx`**:
  - Adicionar `supervisor_id` ao `MemberForm` e ao payload de `handleSubmit`.
  - Renderização condicional do dropdown de superior baseada em `form.hierarchy_level`, com filtro por território já preenchido.
  - Atualizar cards (`MemberCard` inline) para exibir nome do supervisor (lookup local em `members`).
- **`src/components/hierarquia/HierarchyFlowchart.tsx`**:
  - Nova função `buildTree(members)` que indexa por `supervisor_id` e renderiza recursivamente.
  - Novo componente `TreeNode` com indentação por nível e cor por `LEVEL_COLORS`.
  - Adicionar seção após a grid de departamentos, com colapso por macrorregião para não estourar largura.
- **`src/types/database.ts`**: garantir que `DbCampaignMember.supervisor_id` está tipado (já vem do schema gerado).

## Fora de escopo

- Reorganizar departamentos setoriais (Jurídico/Comunicação/etc.) — permanecem como hoje.
- Edição em massa de vínculos para membros já cadastrados (será feita manualmente via "Editar membro").
- Validação obrigatória de supervisor (mantemos opcional para não bloquear cadastros parciais).
