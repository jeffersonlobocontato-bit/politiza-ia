## Objetivo
Permitir editar eventos existentes, duplicar evento como base para um novo, e editar o slug/URL.

## Mudanças em `src/pages/Eventos.tsx`

1. **Refatorar o formulário de criação** em um componente `EventoForm` reutilizável, com estado controlado, que aceita:
   - `modo`: `'criar' | 'editar' | 'duplicar'`
   - `eventoBase?: Evento` (para preencher campos quando editando ou duplicando)
   - `onSalvar`, `onCancelar`

2. **Adicionar campo "URL do evento (slug)"** no formulário:
   - Texto editável, normalizado via `slugify` ao digitar (lowercase, sem acento, hífens).
   - Botão "Gerar automaticamente" que reaplica `gerarSlugEvento(municipio, data, titulo)`.
   - Preview da URL final: `politiza.ia.br/<slug>` e do link de compartilhamento.
   - Validação: obrigatório, mínimo 3 caracteres, único (tratar erro de violação de unique no submit com toast "Esse endereço já está em uso").

3. **Botão "Editar"** em cada card de evento (lista) e no header da página de detalhe:
   - Abre o `EventoForm` em modo edição preenchido com todos os campos (incluindo banner atual, tema e slug).
   - Usa `useUpdateEvento` para salvar. Banner novo passa por `useUploadEventoBanner`.
   - Avisa o usuário, quando o slug muda, que links antigos compartilhados deixam de funcionar.

4. **Botão "Duplicar"** em cada card:
   - Abre o `EventoForm` em modo duplicar, pré-preenchido com tudo do evento original (título + " (cópia)", mesma descrição, local, tema, banner) **exceto**:
     - `slug`: gera novo via `gerarSlugEvento` (usuário pode editar antes de salvar).
     - `status`: força `'rascunho'`.
     - datas: mantidas, mas destacadas para o usuário ajustar.
   - Banner: copia a `imagem_capa_url` (mesma URL pública do bucket) — não re-uploada. Se o usuário trocar a imagem no form, novo upload é feito no novo evento.
   - Salva via `useCreateEvento` (novo registro).

## Sem mudanças de schema
A tabela `eventos` já tem `slug` como coluna editável (unique). Nenhuma migração necessária.

## Itens fora de escopo
- Não muda RLS nem hooks (`useUpdateEvento` já aceita qualquer campo, inclusive `slug`).
- Não muda a edge function `og-evento`.
