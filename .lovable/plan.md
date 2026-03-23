
## Problema identificado

O mapa já está funcional e conectado ao estado global. O que falta é **volume de dados simulados**: o `mockData.ts` tem apenas 15 ações (`a001`–`a015`), todas concentradas em ~10 cidades. O mapa fica vazio na maioria das regiões.

## Solução

Expandir `src/data/mockData.ts` para ter ~65 ações simuladas, distribuídas por todos os municípios e macrorregiões do Paraná, com diversidade de:
- Tipos (carreata, panfletagem, reunião, visita, evento, digital, etc.)
- Status (realizada, prevista, confirmada, em_andamento, atrasada — proporção realista)
- Prioridades (critica, alta, media, baixa)
- Estimativas de impacto variadas (pequenas ações locais até grandes eventos regionais)

### Distribuição planejada por macrorregião
```
RMC (Curitiba):        ~14 ações — mais densa, maior cidade
Norte Central:         ~11 ações — Londrina, Maringá, Apucarana
Noroeste:              ~7 ações  — Umuarama (região de risco, poucas ações)
Oeste:                 ~10 ações — Cascavel, Foz, Toledo, Medianeira
Sudoeste:              ~8 ações  — Pato Branco, Francisco Beltrão
Centro-Sul:            ~6 ações  — Guarapuava, Irati
Campos Gerais:         ~6 ações  — Ponta Grossa
Norte Pioneiro:        ~5 ações  — Cornélio Procópio, Jacarezinho
```

### Arquivo a editar
- `src/data/mockData.ts` — expandir o array `actions` de 15 para ~65 entradas, com coordenadas geográficas variando levemente dentro de cada município para que os pins não se sobreponham

Nenhuma outra alteração necessária — a arquitetura já está pronta.
