
## Importar "Lista de contatos.xlsx" para Ativos Políticos — somente Paraná

### Decisões confirmadas
1. **Vice-Prefeito** → criar novo enum `vice_prefeito`.
2. **Deputados** → criar enums `deputado_estadual` e `deputado_federal`.
3. **Dedupe** (mesmo `name` + `municipality`, case/acento-insensível): **atualizar** `phone` e concatenar texto novo em `observations` (não duplicar).
4. **Owner** padrão: `relationship_owner = "Equipe Senador"` · `referred_by = "Lista de contatos – Gabinete"`.

### Filtro Paraná
- Carrega as 399 cidades do PR de `municipalities`.
- Normaliza `Cidade` (trim, sem acento, lower).
- Mantém se: cidade ∈ PR **ou** aba = Deputados Estaduais/Federais (mandato PR).
- Descarta: cidade vazia em abas municipais, cidade fora do PR (ex.: SP/DF), cidade não reconhecida.
- Gera `descartados.csv` com o motivo.

### Etapas técnicas

**1. Migração SQL** (única migration)
- `ALTER TYPE asset_type ADD VALUE 'vice_prefeito'`
- `ALTER TYPE asset_type ADD VALUE 'deputado_estadual'`
- `ALTER TYPE asset_type ADD VALUE 'deputado_federal'`

**2. Tipos / labels**
- `src/types/database.ts`: adicionar os 3 valores em `DbAssetType`.
- Onde houver mapa de rótulos de tipo (página `AtivosPoliticos.tsx`, filtros, badges, `ImportAssetsDialog.tsx` `VALID_TYPES`), incluir os novos com labels: "Vice-Prefeito(a)", "Deputado Estadual", "Deputado Federal".

**3. Script de import dedicado** `scripts/import-lista-contatos.ts`
- Lê `Lista de contatos.xlsx` (5 abas) com `xlsx`.
- Aplica filtro PR + parser (regras abaixo).
- Para cada linha: faz `SELECT` em `political_assets` por `unaccent(lower(name))` + município; se existir → `UPDATE` (telefone novo + `observations` apensado); senão → `INSERT`.
- Imprime resumo (inseridos / atualizados / descartados) e grava `descartados.csv`.

**4. Mapeamento Planilha → `political_assets`**

| Coluna planilha | Campo | Transformação |
|---|---|---|
| Nome | `name` | Trim + Title Case quando vier tudo em MAIÚSCULAS |
| Cargo/Entidade | `position` | Texto livre; também usado para inferir `type` |
| Cidade | `municipality` | Trim + Title Case; obrigatório p/ abas municipais |
| Telefone | `phone` | Primeiro número antes de "/"; extras → `observations` |
| Assunto | `observations` | Concatenado com telefones extras e origem |
| — | `type` | Por aba + cargo (regras abaixo) |
| — | `macroregion_id` | Via `macroFromCity` |
| — | `alignment_status` | `indefinido` |
| — | `influence_level` | 7 prefeito/deputado · 6 vice/vereador · 5 demais |
| — | `relationship_owner` | "Equipe Senador" |
| — | `referred_by` | "Lista de contatos – Gabinete" |
| — | `created_by` | usuário que dispara o import |

**Regras de `type`**
- Aba **Prefeitos** → `prefeito` (`position = "Prefeito(a)"`)
- Aba **Vice Prefeitos** → `vice_prefeito` (`position = "Vice-Prefeito(a)"`)
- Aba **Deputados Estaduais** → `deputado_estadual` (`position = "Deputado Estadual"`)
- Aba **Deputados Federais** → `deputado_federal` (`position = "Deputado Federal"`)
- Aba **Contatos Gerais** (por cargo): vereador → `vereador`; prefeito → `prefeito`; presidente/sigla → `presidente_entidade`; advogado/empresário → `lideranca_empresarial`; pastor/padre/bispo/igreja → `lideranca_religiosa`; coordenador → `coordenador_partidario`; fallback → `lideranca_comunitaria`.

**Limpeza de telefones**
`"41 99145 6691/ 41 98496 6922"` →
- `phone`: `(41) 99145-6691`
- `observations`: `Telefones adicionais: (41) 98496-6922`

**Regra de dedupe (atualização)**
- Match: `unaccent(lower(trim(name)))` + `unaccent(lower(trim(municipality)))` iguais e `deleted_at IS NULL`.
- Update: `phone = COALESCE(phone, novo)`; se já tinha telefone diferente → manda o novo para `observations` como "Telefone alternativo: ...".
- `observations` recebe append: `\n— [origem]: <assunto/telefones extras>` (sem sobrescrever).
- `position`, `type`, `referred_by`, `relationship_owner` só são preenchidos se estiverem nulos.

### Exemplo de validação (10 linhas, apenas PR)

| Origem | name | type | position | municipality | macro | phone | observations |
|---|---|---|---|---|---|---|---|
| Prefeitos / Abatia | Sonia Aparecida de Souza Chaves | prefeito | Prefeita | Abatia | norte_pioneiro | (43) 99656-8666 | Importado: Prefeitos |
| Prefeitos / Almirante Tamandaré | Camilo Daniel Lovato | prefeito | Prefeito | Almirante Tamandaré | rmc | (41) 99642-1300 | Importado: Prefeitos |
| Vice Prefeitos / Abatia | Luciano Guimarães | vice_prefeito | Vice-Prefeito | Abatia | norte_pioneiro | (43) 99607-4401 | Importado: Vice Prefeitos |
| Vice Prefeitos / Adrianópolis | Pardal (Israel Rodrigues) | vice_prefeito | Vice-Prefeito | Adrianópolis | rmc | (41) 97446-6167 | Cel. do filho Murilo. Pardal não usa celular. Importado: Vice Prefeitos |
| Deputados Estaduais | Ademar Traiano | deputado_estadual | Deputado Estadual | — | — | (41) 3350-4040 | Telefones adicionais: (41) 9212-8777. Importado: Deputados Estaduais |
| Deputados Federais | Aliel Machado | deputado_federal | Deputado Federal | — | — | (42) 99927-1718 | Importado: Deputados Federais |
| Contatos Gerais | Acyr de Gerone | lideranca_empresarial | Advogado | Curitiba | curitiba | (41) 99145-6691 | Telefones adicionais: (41) 98496-6922. Importado: Contatos Gerais |
| Contatos Gerais | Ademar | vereador | Vereador | Boa Ventura de São Roque | centro | (42) 8423-9496 | Assunto: agenda com Senador. Importado: Contatos Gerais |
| Contatos Gerais | Adolfo Sasaki | presidente_entidade | Presidente CRMV/PR | Curitiba | curitiba | (41) 98847-8952 | Telefones adicionais: (41) 99960-4177. Importado: Contatos Gerais |
| Contatos Gerais | ADEVIPAR | presidente_entidade | Entidade | Curitiba | curitiba | (41) 9695-8692 | Assunto: emenda / Direcionado para Michelle. Importado: Contatos Gerais |

### Descartados (`descartados.csv`)
| Linha | Motivo |
|---|---|
| Contatos Gerais / "…SP" | Cidade fora do PR |
| Contatos Gerais / cidade em branco | Cidade ausente em aba que exige |
| Cidade não na lista das 399 do PR | Cidade não reconhecida |

### Entrega
1. Aplico migração dos enums.
2. Atualizo `DbAssetType` + labels nas telas.
3. Rodo o script de import contra a planilha real.
4. Devolvo: total inserido, total atualizado (dedupe), `descartados.csv` e amostra de 20 linhas reais para validação final.
