
# CampanhaOS — Plataforma de Comando e Controle Eleitoral do Paraná

## Visão Geral
Plataforma de gestão estratégica de campanha eleitoral majoritária para governo estadual do Paraná, com dados simulados realistas para demonstração. Interface profissional de "sala de guerra" com mapas interativos, dashboards executivos e inteligência territorial.

---

## Identidade Visual
- **Tema**: Dark mode profissional (fundo cinza-escuro/slate, acentos em azul-elétrico e âmbar)
- **Tipografia**: Fonte moderna, clara, adequada para leitura de dados
- **Paleta**: Azul primário (#1E40AF), âmbar para alertas, verde para metas atingidas, vermelho para risco
- **Nome da plataforma**: **CampanhaOS** — logo com ícone de mapa + radar

---

## Estrutura de Páginas e Módulos

### 1. Autenticação
- Tela de login com logo CampanhaOS
- Seleção de perfil simulado (Coordenador Geral, Regional, Municipal, Campo)
- Redirecionamento automático para dashboard do perfil

### 2. Sala de Guerra (Dashboard Executivo)
**Página principal para Coordenação Central**
- Header com nome da campanha, logo do candidato simulado, data e hora em tempo real
- Barra de KPIs topo: Total de ações previstas | Realizadas | Atrasadas | Pessoas impactadas estimadas | Municípios cobertos / 399
- **Mapa interativo central do Paraná** (Leaflet + GeoJSON dos 399 municípios):
  - Camada de mapa de calor por engajamento territorial
  - Pins coloridos por status (azul = prevista, verde = realizada, vermelho = atrasada, âmbar = em andamento)
  - Clique no município abre painel lateral com indicadores locais
  - Toggle entre: Mapa Operacional | Mapa Político | Mapa de Calor | Mapa de Pesquisas
- Painel direito: Alertas estratégicos automáticos (cards vermelhos/amarelos com recomendações)
- Ranking de macrorregiões por performance
- Gráfico de evolução das pesquisas (linha temporal)
- Cards de ações críticas e pendentes

### 3. Mapa Estratégico (Módulo dedicado)
- Mapa em tela cheia do Paraná
- Painel de filtros lateral: por período, tipo de ação, status, responsável, nível hierárquico
- Camadas visuais ativáveis: ações, lideranças, pesquisas, calor
- Botão de geolocalização (simula captura de GPS)
- Clique em pin abre modal com detalhes da ação + fotos de evidência

### 4. Gestão Territorial
- **Árvore territorial navegável**: Estado → 8 Macrorregiões → Microrregiões → 399 Municípios
- Cards de macrorregião com score de engajamento (0–100), KPIs e responsável
- Página de município individual: indicadores, ações, lideranças, pesquisas locais, mapa local
- Índice de Engajamento Territorial com escala visual (0–30 risco / 31–60 atenção / 61–80 competitivo / 81–100 consolidado)

### 5. Planejamento e Ações
- Lista de ações com filtros avançados e busca
- Formulário de nova ação (todos os campos especificados: tipo, categoria, território, responsável, data, meta, prioridade)
- Visualização em tabela e em mapa
- Status com indicador visual: prevista | confirmada | em andamento | realizada | atrasada | cancelada

### 6. Execução de Campo (Input Mobile-Friendly)
- Interface simplificada para lideranças locais
- Formulário de registro de execução: data/hora real, local, pessoas impactadas, observações
- Botão "Marcar localização no mapa" (geolocalização simulada)
- Upload de fotos de evidência com legenda
- Tela de confirmação com resumo

### 7. Ativos Políticos
- Cadastro e visualização de ativos por município/região
- Tipos: prefeitos, vereadores, lideranças comunitárias, religiosas, empresariais, etc.
- Campos: município, influência, alinhamento, status de apoio, observações
- Mapa de densidade de ativos por região
- Filtros por tipo, município, macrorregião

### 8. Pesquisas Eleitorais
- Lista de pesquisas com filtros
- Formulário de cadastro (instituto, datas, abrangência, intenção de voto, rejeição, indecisos)
- Visualização gráfica: evolução temporal por região
- Cruzamento visual: pesquisa × execução de campo no mapa
- Dados simulados realistas para demonstração

### 9. Inteligência e Alertas
- Central de alertas estratégicos automáticos
- Cards categorizados: Risco Alto | Atenção | Oportunidade
- Exemplos simulados: "Microrregião Noroeste com baixa execução e queda de 4pp nas pesquisas"
- Priorização territorial automática com justificativa
- Recomendações de ação por região

### 10. Hierarquia e Equipe
- Organograma interativo da campanha (5 níveis)
- Perfis de coordenadores por região
- Ranking de desempenho por liderança
- Trilha de atividade por usuário

### 11. Dashboards por Perfil
- **Executivo/Geral**: Sala de Guerra completa
- **Regional**: Foco na macrorregião com rankings municipais
- **Microrregional**: Ações locais, cidades descobertas, lideranças ativas
- **Municipal/Campo**: Agenda local, comprovações pendentes, mapa local

---

## Dados Simulados Realistas
- 399 municípios do Paraná com coordenadas geográficas reais
- 8 macrorregiões (Curitiba/RMC, Norte Central, Noroeste, Oeste, Sudoeste, Centro-Sul, Campos Gerais, Norte Pioneiro)
- ~150 ações simuladas em diversos status
- ~30 pesquisas eleitorais fictícias com evolução temporal
- ~80 ativos políticos distribuídos pelo estado
- Scores de engajamento variados para demonstrar o mapa de calor

---

## Navegação Principal (Sidebar)
- 🗺️ Sala de Guerra
- 📍 Mapa Estratégico
- 🌎 Territórios
- 📋 Ações
- 📱 Campo (input móvel)
- 👥 Ativos Políticos
- 📊 Pesquisas
- 🧠 Inteligência
- 🏛️ Hierarquia
- ⚙️ Configurações

---

## Stack
- React + TypeScript + Tailwind CSS
- Leaflet.js + React-Leaflet para mapas
- GeoJSON dos municípios do Paraná (dados públicos)
- Recharts para gráficos
- Lovable Cloud para auth e backend (fase futura)
- Dados mockados ricos para demonstração imediata
