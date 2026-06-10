## Entendimento
Manter os dois cards de partido (PL e Novo) lado a lado, **sem fundi-los**. Apenas dentro de cada card, separar a projeção por cargo — uma para Federal, outra para Estadual — em vez do único bloco "Projeção (Bom)" que hoje soma os dois.

## Mudança (apenas `src/pages/Chapas.tsx` → aba `Resumo por Partido`)

Cada card de partido (PL, Novo) continua igual em estrutura externa (mesmo gradiente, mesmo `<Link to={/chapas/${p}}>`, mesmo cabeçalho com nome + tagline + ícone). **Só muda a grade de stats inferior**:

Hoje: 3 colunas → `Federal | Estadual | Projeção (Bom)`
Novo: **2 colunas**, cada uma combinando contagem + projeção do cargo:

```
┌─── card PL ──────────────────────────────┐   ┌─── card Novo ─────────────────────────┐
│ PL — Partido Liberal                     │   │ Novo                                  │
│ Chapa proporcional do PL no Paraná       │   │ Chapa proporcional do Partido Novo    │
│                                          │   │                                       │
│ ┌─ DEP. FEDERAL ─┐ ┌─ DEP. ESTADUAL ─┐  │   │ ┌─ DEP. FEDERAL ─┐ ┌─ ESTADUAL ─┐    │
│ │ 31             │ │ 55              │  │   │ │ 12             │ │ 0           │    │
│ │ Proj: 1.150.000│ │ Proj: 767.000   │  │   │ │ Proj: 380.000  │ │ Proj: 380K  │    │
│ └────────────────┘ └─────────────────┘  │   │ └────────────────┘ └─────────────┘    │
│ Abrir chapa →                            │   │ Abrir chapa →                         │
└──────────────────────────────────────────┘   └───────────────────────────────────────┘
```

### Componente
Um único helper novo `CargoStat({ label, count, projection })` substitui o `Stat` atual onde necessário:
- Rótulo em uppercase pequeno (`DEP. FEDERAL` / `DEP. ESTADUAL`).
- Número grande de pré-cands.
- Linha menor: `Proj: 1.150.000` (cenário Bom; consistente com o que existe hoje na aba Resumo).

### Cálculo (sem hooks novos)
Dentro do `allowedParties.map`:
```ts
const fed = rows.filter(r => r.cargo === 'Deputado Federal');
const est = rows.filter(r => r.cargo === 'Deputado Estadual');
const fedProj = fed.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
const estProj = est.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
```

## Não muda
- Aba Dashboard (seletor Bom/Médio/Ruim continua lá).
- Cards seguem separados por partido, com mesmas cores/gradientes.
- Big numbers do topo.
- Schema, hooks, RLS.
