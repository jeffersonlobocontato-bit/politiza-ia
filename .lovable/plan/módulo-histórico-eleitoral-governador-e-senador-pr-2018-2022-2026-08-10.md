# Módulo Histórico Eleitoral (Governador e Senador — PR 2018/2022)

Incorporar o pacote enviado como um novo módulo navegável dentro de Inteligência, com mapa coroplético do Paraná por município, filtros de ano, cargo e candidato.

## O que será entregue

- Nova página **Histórico Eleitoral** (rota `/historico-eleitoral`), no padrão visual dos demais módulos (mesma moldura de Municípios / Mapa Estratégico).
- Filtros: Ano (2018 / 2022), Turno, Cargo (Governador / Senador) e Candidato.
- Mapa do Paraná pintado por percentual de votos do candidato selecionado em cada município, com tooltip mostrando município, votos e %.
- Painel lateral com ranking de municípios (maiores e menores percentuais) e total de votos do candidato no estado.
- Acesso restrito: apenas `admin_master` e `coordenador_estadual`.

## Ajustes necessários no pacote enviado

Três pontos do pacote não batem com este projeto e serão corrigidos na implementação:

1. **Políticas de acesso** — o SQL enviado consulta `profiles.role`, coluna que não existe aqui (a tabela `profiles` tem apenas id, nome, e-mail, telefone, avatar, indicado por). Os papéis ficam em `user_roles`, lidos pela função `has_role`. As políticas serão reescritas com `has_role`, mais os GRANTs obrigatórios que faltam no arquivo original.
2. **Biblioteca de mapa** — o componente enviado usa `react-map-gl`, que não está no projeto. Será reescrito em `react-leaflet`, reaproveitando o padrão já usado em `PrAssociationChoropleth` (malha IBGE do Paraná + junção por código IBGE).
3. **Junção com o cadastro** — confirmado que `pr_municipios` tem `nome` e `codigo_ibge` preenchidos para os 399 municípios, então a view funciona com os nomes que o arquivo assume. Após a carga, rodo a conferência de municípios sem correspondência e ajusto os nomes divergentes.

## Passos técnicos

1. Migração: criar `resultados_eleicoes_historicos` (colunas do `01_schema.sql`, incluindo a coluna normalizada gerada e os índices), GRANTs, RLS e políticas via `has_role` (leitura: admin_master e coordenador_estadual; escrita: admin_master).
2. Migração: criar `vw_resultados_por_municipio_ibge` com `security_invoker = true`, juntando por nome normalizado e expondo `codigo_ibge` para o mapa.
3. Carga dos 19.371 registros do `02_importar_dados.sql` (executada em blocos).
4. Conferência de municípios sem par e correção dos nomes divergentes; reporto a lista.
5. Nova página `src/pages/HistoricoEleitoral.tsx` + hook de consulta (TanStack Query) agregando por `cd_municipio_ibge`; camada GeoJSON com escala de cor por percentual.
6. Rota em `App.tsx` e item no menu lateral, visível apenas para os papéis permitidos.

## Fora de escopo (conforme o pacote)

Deputado Federal/Estadual, eleições de 2014 e Presidente.
