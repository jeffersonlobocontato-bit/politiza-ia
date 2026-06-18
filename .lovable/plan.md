## Objetivo

Trocar as URLs públicas de eventos do formato atual `/e/:slug` para um formato amigável baseado em **cidade + data do evento**, ex.: `politiza.ia.br/curitiba25-12-2026`, `politiza.ia.br/cascavel10-01-2027`.

A data garante unicidade quando houver mais de um evento na mesma cidade.

## Formato do slug

- Padrão: `{cidade-normalizada}{DD-MM-AAAA}` (sem separador entre cidade e data, conforme exemplo do usuário).
- Normalização da cidade: minúsculas, sem acento, espaços viram `-` (ex.: "São José dos Pinhais" → `sao-jose-dos-pinhais`).
- Data: dia do evento (`data_inicio`) formatada como `DD-MM-AAAA`.
- Exemplo final: `sao-jose-dos-pinhais25-12-2026`.

## Mudanças

### 1. Banco (migration)
- Garantir `UNIQUE` no campo `slug` da tabela `eventos` (já provável, confirmar).
- Backfill: recalcular `slug` dos eventos existentes para o novo padrão (cidade + data_inicio).
- Nenhum schema novo — apenas atualização de dados via migration.

### 2. Geração de slug (`src/pages/Eventos.tsx` e/ou helper novo)
- Criar util `gerarSlugEvento(cidade, dataInicio)` em `src/lib/eventoSlug.ts`.
- Ao criar/editar evento, regenerar o slug automaticamente sempre que cidade ou data mudarem.
- Mostrar preview da URL final no formulário (`politiza.ia.br/{slug}`).

### 3. Roteamento (`src/App.tsx`)
- Manter `/e/:slug` como rota legado (redireciona para o novo formato) para não quebrar links antigos.
- Adicionar rota raiz dinâmica `/:slug` apontando para `EventoPublico`.
- Implementar **lista de rotas reservadas** (`eventos`, `campo`, `login`, `dashboard`, `auth`, etc.) — se o slug bater com uma reservada, segue o fluxo normal do app (não trata como evento).
- `EventoPublico` busca o evento pelo `slug`. Se não existir, mostra 404.

### 4. Compartilhamento
- Atualizar todos os pontos que exibem/copiam o link público do evento em `src/pages/Eventos.tsx` para usar `https://politiza.ia.br/{slug}`.

## Detalhes técnicos

- Conflito com rotas internas resolvido pela lista de reservadas + ordem de matching no React Router (rotas específicas declaradas antes de `/:slug`).
- Slug é regenerado em update — se o organizador mudar a data, o link muda. Aceitável para o caso de uso.
- Rate-limit e RLS de `inscricoes`/`eventos` permanecem inalterados.

## Fora de escopo

- Histórico de slugs antigos / redirects permanentes por slug (apenas o redirect genérico `/e/:slug`).
- Customização manual do slug pelo organizador.
