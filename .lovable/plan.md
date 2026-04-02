

# Agenda Nativa da Campanha — com Filtros Hierárquicos

## Conceito

Criar um módulo **Agenda** que funcione como um calendário visual conectado diretamente às ações de campanha já existentes, com controle de visibilidade baseado no nível hierárquico do usuário logado.

## Módulos que se conectam naturalmente à Agenda

| Módulo | Conexão | Como aparece na Agenda |
|--------|---------|----------------------|
| **Ações** (principal) | Cada ação já tem `planned_date`, `planned_time`, `municipality`, `macroregion_id`, `responsible` | Evento automático no calendário |
| **Tracking** | Rodadas com `start_date`, `end_date` | Bloco de período (barra no calendário) |
| **Sala de Crise** | Alertas com prazo de resolução | Marcador de urgência no dia |
| **Ativos Políticos** | Reuniões agendadas com lideranças | Via ações do tipo `reuniao_politica` / `encontro_liderancas` |

As **Ações** já possuem toda a estrutura necessária (data, hora, município, macrorregião, responsável, status). Não é preciso criar uma tabela nova — a agenda será uma **visualização de calendário** dos dados que já existem.

## Controle de Acesso por Hierarquia

A tabela `user_roles` já possui `macroregion_id`, `microregion` e `municipality`. O filtro funciona assim:

```text
Coordenação Geral / Admin
  → Vê TUDO + seletor de camadas (tipo, região, responsável, status)

Coordenador Regional
  → Filtra automaticamente por sua macroregion_id
  → Pode expandir para ver microregiões dentro dela

Coordenador Microrregional
  → Filtra por sua microregion (+ macroregion_id)

Coordenador Municipal
  → Filtra por sua municipality
```

Admins terão um painel de filtros (chips/toggles) para selecionar quais camadas exibir: por tipo de ação, por região, por status, por responsável.

## Implementação Técnica

### 1. Nova página `src/pages/Agenda.tsx`
- Calendário mensal/semanal usando grid CSS nativo (sem dependência externa)
- Visualização mensal com dots coloridos por tipo de ação
- Visualização semanal com blocos horários
- Painel lateral com detalhes ao clicar em um dia/evento

### 2. Hook `src/hooks/useAgenda.ts`
- Reutiliza a query de `actions` filtrando por mês visível
- Aplica filtro territorial automaticamente baseado nos roles do usuário:
  - Lê `user_roles` do AuthContext (já disponível)
  - Se `coordenador_regional` → filtra `macroregion_id`
  - Se `coordenador_microrregional` → filtra `microregion`
  - Se `coordenador_municipal` → filtra `municipality`
  - Se admin → sem filtro (mostra tudo)

### 3. Componente de filtros (só para admins)
- Chips de camada: Tipo de ação, Região, Status, Prioridade
- Toggle de rodadas de tracking (mostrar/ocultar períodos)

### 4. Integração no menu lateral
- Novo item "Agenda" com ícone `Calendar`, posicionado após "Ações"
- Rota `/agenda`

### 5. Nenhuma migração de banco necessária
- Todas as tabelas e campos já existem (`actions`, `user_roles`, `tracking_rounds`)
- O filtro hierárquico usa os dados de `user_roles` que o AuthContext já carrega

### Arquivos criados/editados
- **Criar**: `src/pages/Agenda.tsx` — página principal com calendário
- **Criar**: `src/hooks/useAgenda.ts` — hook com filtros hierárquicos
- **Editar**: `src/App.tsx` — adicionar rota `/agenda`
- **Editar**: `src/components/layout/AppSidebar.tsx` — adicionar item no menu

