
## Estado atual da plataforma

O mapa **já funciona** com geolocalização simulada. O que existe hoje:

**Módulo Campo (`/campo`):**
- Wizard de 4 passos com formulário de dados da ação
- Passo 2 tem mapa Leaflet com clique manual para marcar localização + botão "GPS" que simula coordenadas aleatórias no Paraná
- Dados ficam apenas em estado local (React state) — ao enviar, a ação desaparece e não aparece no mapa estratégico

**Módulo Mapa Estratégico (`/mapa`):**
- Mostra ações do `mockData.ts` (dados estáticos), não as ações inputadas pelo usuário

**O gap atual:** as ações criadas no módulo Campo ou em Ações não aparecem no mapa em tempo real — não há estado global compartilhado entre os módulos.

---

## O que o plano vai resolver

Criar um **estado global de ações** usando React Context, para que:

1. Ações cadastradas em **Campo** e em **Ações** sejam adicionadas ao estado compartilhado
2. O **Mapa Estratégico** e a **Sala de Guerra** reflitam as novas ações em tempo real
3. O fluxo completo de teste seja: cadastrar ação → ver no mapa imediatamente

---

## Implementação técnica

### 1. Criar `src/contexts/CampaignContext.tsx`
- `useState` com array de ações iniciando com os dados do `mockData`
- Funções: `addAction(action)`, `updateActionStatus(id, status)`, `executeAction(id, fieldData)`
- Exportar hook `useCampaign()`

### 2. Conectar `App.tsx`
- Envolver toda a aplicação com `<CampaignProvider>`

### 3. Atualizar `Campo.tsx`
- No passo de envio final, chamar `addAction()` com os dados do formulário + coordenadas do mapa
- Usar `navigator.geolocation.getCurrentPosition()` real no botão GPS (com fallback simulado)

### 4. Atualizar `Acoes.tsx`
- Formulário "Nova Ação" passa a chamar `addAction()` do contexto
- Campo de marcar localização no mapa dentro do formulário

### 5. Atualizar `MapaEstrategico.tsx` e `SalaDeGuerra.tsx`
- Trocar `import { actions } from '@/data/mockData'` por `const { actions } = useCampaign()`
- Novas ações aparecem imediatamente nos mapas

### 6. Indicador visual de "nova ação"
- Pin pulsante/animado no mapa para ações criadas nos últimos 5 minutos
- Badge contador no sidebar de Mapa Estratégico quando há novas ações

---

## Fluxo de teste após implementação

```text
[Campo] Preencher dados → Marcar no mapa → Adicionar foto → Enviar
         ↓
[Contexto] addAction() — novo pin aparece
         ↓
[Mapa Estratégico] Pin verde/azul visível imediatamente
[Sala de Guerra] KPI "Ações" atualiza, pin aparece no mapa
```

---

## Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/contexts/CampaignContext.tsx` | Criar — estado global |
| `src/App.tsx` | Editar — envolver com Provider |
| `src/pages/Campo.tsx` | Editar — integrar com contexto + GPS real |
| `src/pages/Acoes.tsx` | Editar — formulário conectado ao contexto |
| `src/pages/MapaEstrategico.tsx` | Editar — consumir contexto |
| `src/pages/SalaDeGuerra.tsx` | Editar — consumir contexto |
