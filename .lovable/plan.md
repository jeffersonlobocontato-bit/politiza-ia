
## Reestruturação da Hierarquia — Pré-Campanha PR 2026

Substituir o cargo único **Coordenador Geral** pela **Coordenação Central** (trio: Julio Reis, Jefferson Lobo, Adilson Silva) e alinhar as demais coordenações ao novo organograma do PDF.

---

### 1. Mudanças no nível 2 (Coordenações)

**Topo (novo):**
- **Coordenação Central** — Julio Reis, Jefferson Lobo, Adilson Silva
  - Função: supervisão geral, integração entre coordenações, validação de prioridades.

**Coordenações abaixo da Central (mantêm `hierarchy_level = 2`):**

| Coordenação | Responsáveis | Origem |
|---|---|---|
| Coordenação Política Estadual | Ricardo Guerra (PL), Lucas Santos (NOVO) | Renomeia "Coordenação PL" e "Coordenação NOVO" — **mantém campo de partido para preservar RLS** |
| Coord. Jurídica Eleitoral | Leandro Rosa | Mantém |
| Coord. Operacional / Eventos | José Elias, João Malucelli, Adriana Kaminski | Consolida Agenda + Logística + Segurança |
| Coord. Administrativa / Financeira | Lucas Góes | Renomeia "Financeiro" |
| Coord. Marketing / Comunicação | Marcelo Cattani | Renomeia |
| Coord. Plano de Governo | Edson Vasconcelos, Alcione, Rafael Amaral | Mantém + 2 novos |

**Removidos do organograma visual:**
- "Coordenador Geral" (cargo único — substituído pelo trio Central)
- "Coordenador de Inteligência Política" (função absorvida pela Central; módulo de Inteligência do app continua existindo)
- "Coordenador de Agenda", "Coordenador de Logística", "Coordenador de Segurança" como cargos separados (viram a Coord. Operacional/Eventos)

---

### 2. Estrutura de níveis (sem mudança no schema)

Mantém os 6 níveis atuais:
```
1  Candidato ao Governo
2  Coordenação Central + Coordenações estaduais
3  Coordenadores Regionais
4  Coordenadores Microrregionais
5  Coordenadores Municipais
6  Lideranças Locais
```

A Central e as demais coordenações ficam **todas no nível 2**. Diferenciação puramente visual no flowchart (Central destacada no topo, demais agrupadas abaixo).

---

### 3. Arquivos impactados

**Frontend (apenas UI):**
- `src/pages/Hierarquia.tsx`
  - Atualizar `LEVEL_LABELS[2]` → "Coordenação Central"
  - Reescrever `SECTORAL_GROUPS`: novo grupo "Coordenação Central" no topo + grupos reorganizados
  - Remover `SUB_ROLES` para Inteligência Política
- `src/components/hierarquia/HierarchyFlowchart.tsx`
  - Ajustar layout L2: trio Central centralizado no topo, demais coordenações em linha abaixo
  - Remover slots de Jurídico/Comunicação laterais (passam a ser coordenações comuns abaixo)

**Banco (apenas dados — sem migração de schema):**
- `UPDATE` em `campaign_members` para:
  - Renomear roles existentes (Financeiro → Administrativa/Financeira, Comunicação → Marketing/Comunicação)
  - Renomear "Coordenação PL"/"NOVO" → "Coordenação Política Estadual" (preservando vínculo de partido em outro campo se necessário)
  - Consolidar Agenda + Logística + Segurança em "Coordenação Operacional / Eventos"
  - Remover/inativar cargo "Coordenador Geral" e "Coordenador de Inteligência Política"
- `INSERT` dos novos membros: Jefferson Lobo, Adilson Silva, José Elias, Adriana Kaminski, Alcione, Rafael Amaral

---

### 4. Avaliação de impacto/risco

| Área | Impacto | Risco |
|---|---|---|
| Schema do banco | Nenhuma alteração estrutural | 🟢 Nenhum |
| RLS multi-partido (`get_user_party`) | Ricardo e Lucas mantêm partido individual mesmo com role unificada | 🟢 Baixo |
| `is_admin()` e `admin_master` (Julio, Jefferson, Edson) | Funções de admin permanecem; trio Central já tem admin_master | 🟢 Nenhum |
| `alertTeam.ts` (cadeia de responsabilidade) | Usa hierarchy_level 3/4 — segue funcionando | 🟢 Nenhum |
| Módulo de Inteligência Política do app | Continua funcional, sem dono nominal | 🟢 Nenhum |
| Vínculos `supervisor_id` existentes | Coordenações L2 deixam de ter "Coord. Geral" como supervisor; subordinação passa a ser direta à Central | 🟡 Médio — revisar registros |
| Membros L3+ (Juarez Berté etc.) | Não afetados | 🟢 Nenhum |

---

### 5. Ordem de execução

1. Atualizar `LEVEL_LABELS`, `SECTORAL_GROUPS` e `SUB_ROLES` em `Hierarquia.tsx`
2. Ajustar layout do `HierarchyFlowchart.tsx`
3. Rodar `UPDATE`/`INSERT` em `campaign_members` para refletir o novo organograma
4. Validar visualmente o fluxograma e a aba de membros

Nenhuma migração de schema, nenhuma mudança em RLS, nenhum impacto em módulos externos (Ações, Tracking, Alertas, CRM).
