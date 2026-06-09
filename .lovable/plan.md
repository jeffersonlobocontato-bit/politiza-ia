## Objetivo

Criar um módulo **"Chapas"** para organizar as listas de pré-candidatos proporcionais (Deputado Federal e Deputado Estadual) por partido. Nasce com o PL (importando as 2 planilhas anexadas) e já preparado para o Novo. Visível para admins master e gestores do respectivo partido.

## Decisões confirmadas
1. **Fotos**: upload manual depois (campo opcional `photo_url`).
2. **Reimportação**: faz **upsert por (partido, cargo, ordem)** — preserva edições manuais de campos que a planilha não traz; só sobrescreve os campos vindos do arquivo quando explicitamente reimportado.
3. **Cargos**: somente **Deputado Federal** e **Deputado Estadual** neste módulo. Senador/Governador continuam em `candidates`.

## Modelo de dados

Nova tabela `party_slate_candidates` (separada de `candidates`, que segue sendo o seletor "Candidato Ativo" da plataforma).

```text
party_slate_candidates
  id, party ('PL'|'Novo'), cargo ('Deputado Federal'|'Deputado Estadual')
  order_index               -- ordem na chapa (1, 2, 3…)
  name                      -- limpo, sem o prefixo "1. "
  city, association         -- ASSOMEC, AMOP…
  filiacao_status           -- enum: ok | pl | pl_mulher | deputado_atual | pendente | outro
  filiacao_note             -- texto livre ("PL Mulher – CWB" etc.)
  phone, instagram_url, photo_url
  votes_bom, votes_medio, votes_ruim
  general_status, notes
  is_active, deleted_at
  created_at, updated_at, created_by
UNIQUE (party, cargo, order_index) WHERE deleted_at IS NULL
```

### RLS
- `admin_master` / `coordenador_geral` / `coordenador_estadual`: enxergam e editam todas as chapas.
- `gestor_estadual_pl`: enxerga e edita só `party = 'PL'`.
- `gestor_estadual_novo`: enxerga e edita só `party = 'Novo'`.
- Demais perfis: sem acesso.

Reaproveita os helpers `is_admin()` e `get_user_party()`.

## UX

Novo item de menu **"Chapas"** (ícone Users-square), visível apenas para admins master e gestores de partido.

- `/chapas` — Hub com cards por partido visível ao usuário. Cada card: contagem por cargo + soma de projeção (Bom).
- `/chapas/:party` — Tabs **Deputado Federal | Deputado Estadual**.
  - Tabela ordenada por `order_index`:
    - Foto + nome + posição
    - Cidade / Associação (chips)
    - Badge de filiação (verde OK, amarelo pendente, azul "Deputado atual", roxo "PL Mulher")
    - Projeção Bom / Médio / Ruim
    - Ações: WhatsApp, Instagram, editar
  - Filtros: associação, status de filiação, cidade, busca.
  - KPIs: total, % filiados OK, soma de projeção (3 cenários), distribuição por associação.
- Drawer de edição/criação com todos os campos do modelo (livre para o gestor ajustar manualmente).

### Importação
Botão "Importar planilha" (admin master e gestor do partido):
1. Upload .xlsx, preview com mapeamento das colunas.
2. Normaliza nome (remove "N. "), telefone, valida Instagram.
3. Upsert por `(party, cargo, order_index)` — não apaga campos manuais (photo_url, notes etc.).

**Seed inicial**: as duas planilhas do PL (47 federais + estaduais) são inseridas via script de migração na primeira execução.

## Roteiro de implementação
1. Migração: tabela + GRANTs + RLS.
2. Seed PL (Federal + Estadual) via `supabase--insert`.
3. Hook `useSlateCandidates(party)`.
4. Páginas `Chapas.tsx` (hub) e `ChapaPartido.tsx` (tabs + tabela + filtros + KPIs).
5. Drawer de edição/criação.
6. Diálogo de importação .xlsx (SheetJS já está nas deps).
7. Item no `AppSidebar` condicionado a `isAdmin || isPartyManager`.
