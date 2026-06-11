## Redesign do Jurídico — Kanban + Detalhe Completo + Colaboração

Reformular `/juridico` para operar como board estilo Trello, com card de detalhe completo, anexos complementares, notas com menções e notificações ao advogado responsável.

### 1. Kanban com scroll lateral
- 4 colunas fixas: **Nova · Em análise · Protocolada · Arquivada**.
- Layout horizontal com `overflow-x-auto`, colunas de largura fixa (~320px), scroll interno vertical em cada coluna.
- Cada card mostra: título, denunciado, município, data, nº de provas, score IA, severidade (borda colorida à esquerda).
- Mudança de status por:
  - clique no card → painel lateral (drawer) com ações; ou
  - botões "mover para →" no rodapé do card (rápido).
- Filtro atual (chips) vira filtro por candidato/severidade/responsável — o filtro por status sai (board já segmenta).

### 2. Card aberto — exibir TODOS os dados da denúncia
Drawer lateral (não modal central) com abas:

**Aba 1 · Denúncia (completo)**
- Categoria, título, severidade, status atual.
- Denunciado: nome, cargo, partido.
- Local: município, endereço, coordenadas (link p/ mapa), `captured_at` da primeira prova.
- Relato completo (sem clamp).
- Triagem IA: resumo + score + recomendações.
- Autor da denúncia (nome + role), data/hora de envio.
- Cadeia de custódia das provas: SHA-256, mime, tamanho, timestamp do servidor, GPS gravado, link assinado (10 min) para visualizar/baixar; thumbnails para imagens.

**Aba 2 · Andamento (timeline)**
- Histórico de `fiscalize_history` ordenado: mudança de status, notas, anexos adicionados, menções, com autor e timestamp.

**Aba 3 · Anexos do jurídico** (novo)
- Upload de documentos complementares (PDF, imagens, ofícios) — bucket privado `fiscalize-legal-docs`.
- Lista com nome, autor, data, link assinado para download.
- Não substitui as provas originais (imutáveis).

**Aba 4 · Notas & menções** (novo)
- Editor de nota com suporte a `@` para mencionar advogados (autocomplete em `profiles` filtrado por role jurídica).
- Notas ficam em `fiscalize_notes` com array de menções.
- Cada menção dispara notificação ao mencionado.

**Rodapé do drawer**
- Atribuir/alterar advogado responsável (select de usuários jurídicos) → também notifica.
- Mudar status (mantém regra de justificativa obrigatória).

### 3. Notificações ao advogado (estilo Trello)
- Tabela `notifications` (in-app): destinatário, tipo (`mention` | `assignment` | `status_change` | `new_attachment`), report_id, ator, mensagem, lida, created_at.
- Trigger/edge function ao inserir nota com menções ou ao mudar `assigned_lawyer_id` → cria notificações.
- Sino global no header com badge de não lidas + dropdown listando as 10 mais recentes (clique abre o card da denúncia correspondente).
- (Opcional, fora desta entrega) e-mail via Lovable Emails — aviso e ofereço como próxima iteração.

### 4. Mudanças de banco

```text
fiscalize_reports
  + assigned_lawyer_id uuid → profiles(id) null
  + last_activity_at    timestamptz default now()

fiscalize_notes (nova)
  id, report_id, author_id, body text, mentions uuid[],
  created_at, deleted_at

fiscalize_attachments (nova)
  id, report_id, uploaded_by, path, name, mime, size,
  created_at, deleted_at

notifications (nova)
  id, user_id, type, report_id, actor_id, message,
  is_read bool, created_at
```
- GRANTs para `authenticated` + `service_role` em todas.
- RLS:
  - notas/anexos: leitura para quem já vê o report (mesma regra de `fiscalize_reports`); insert por usuários jurídicos/admin.
  - notifications: cada usuário vê só as suas; update (marcar lida) só pelo próprio.
- Bucket novo: `fiscalize-legal-docs` (privado) com policies p/ jurídico+admin.

### 5. Arquivos a editar/criar
- `src/pages/Juridico.tsx` — reescrever para kanban + drawer com abas.
- `src/components/juridico/JuridicoKanban.tsx` (novo) — colunas e cards.
- `src/components/juridico/ReportDrawer.tsx` (novo) — abas Denúncia/Andamento/Anexos/Notas.
- `src/components/juridico/NoteEditor.tsx` (novo) — textarea + autocomplete `@`.
- `src/components/notifications/NotificationBell.tsx` (novo) — sino no header.
- Migração SQL (1 arquivo) com as 3 tabelas + colunas + RLS + GRANTs + bucket policies.
- `supabase/functions/fiscalize-notify/index.ts` (novo) — opcional; também dá para fazer com trigger SQL puro (preferência: trigger SQL, menos peças móveis).

### 6. Pontos a confirmar antes de implementar
1. **Quem é "advogado/jurídico"?** Criar uma role nova `juridico` em `app_role`, ou usar `admin_master` + lista manual em `profiles`? Recomendo nova role `juridico` para autocomplete e RLS limpos.
2. **Anexos do jurídico — limite**: ok PDF/imagem até 20MB cada, máx. 10 por denúncia?
3. **Notificações por e-mail agora ou só in-app nesta entrega?** Recomendo só in-app agora; e-mail numa iteração seguinte usando Lovable Emails.
4. **Filtros do board**: além de candidato e severidade, quer filtro por "minhas denúncias" (atribuídas a mim)?
