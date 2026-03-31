

## Lacunas Identificadas no Módulo de Tracking

O usuário identificou 3 funcionalidades ausentes:

1. **Link da rodada para entrevistadores** — Após criar uma rodada, não há como compartilhar/copiar o link do formulário
2. **Configuração territorial da rodada** — Não há como definir bairro, cidade, região da rodada
3. **Perguntas customizáveis por rodada** — As perguntas são fixas no código (`TRACKING_QUESTION_KEYS`), sem possibilidade de criar/editar por rodada

---

### 1. Link compartilhável da rodada

Ao criar ou visualizar uma rodada no Dashboard, adicionar:
- Botão "Copiar Link" ao lado de cada rodada
- O link será `/tracking?round=<round_id>` — quando o entrevistador acessar com esse parâmetro, a rodada é pré-selecionada automaticamente
- Toast de confirmação "Link copiado!"

**Arquivos**: `TrackingDashboard.tsx`, `TrackingForm.tsx` (ler query param)

---

### 2. Configuração territorial da rodada

Expandir o formulário de criação de rodada no Dashboard para incluir:
- Campo **Escopo territorial** (já existe `territory_scope` na tabela, mas o form não usa)
- Seleção de **macrorregião**, **microrregião** e **município** (opcionais, para filtrar onde a rodada se aplica)

Adicionar 3 colunas na tabela `tracking_rounds` via migration:
- `macroregion_id text`
- `microregion text`  
- `municipality text`

No formulário do entrevistador, exibir o escopo territorial da rodada como referência.

**Arquivos**: Migration SQL, `TrackingDashboard.tsx` (form de criação), `TrackingForm.tsx` (exibir escopo)

---

### 3. Perguntas customizáveis por rodada

Criar tabela **`tracking_round_questions`**:
- `id uuid PK`
- `round_id uuid NOT NULL`
- `question_key text NOT NULL` (identificador interno)
- `label text NOT NULL` (texto exibido ao entrevistador)
- `question_type text DEFAULT 'candidate_name'` (tipos: `candidate_name`, `text`, `scale`, `select`)
- `options jsonb` (opções para tipo `select`)
- `sort_order integer DEFAULT 0`
- `is_required boolean DEFAULT true`
- `created_at timestamptz`

No Dashboard, ao criar/editar rodada:
- Seção "Perguntas da Rodada" com lista editável
- Presets sugeridos (Intenção de voto, Rejeição, etc.) com botão "Adicionar todas"
- Possibilidade de criar perguntas livres

No formulário do entrevistador:
- Buscar perguntas da rodada selecionada em vez de usar constantes fixas
- Renderizar campos conforme `question_type`

**Arquivos**: Migration SQL, novo hook `useTrackingQuestions.ts`, `TrackingDashboard.tsx`, `TrackingForm.tsx`

---

### Resumo de alterações

| Componente | Mudança |
|---|---|
| Migration SQL | Adicionar colunas territoriais em `tracking_rounds` + criar `tracking_round_questions` com RLS |
| `TrackingDashboard.tsx` | Expandir dialog de criação com território + perguntas + botão copiar link |
| `TrackingForm.tsx` | Ler `?round=` da URL + carregar perguntas dinâmicas da rodada |
| `src/hooks/useTracking.ts` | Adicionar hook para perguntas da rodada |

