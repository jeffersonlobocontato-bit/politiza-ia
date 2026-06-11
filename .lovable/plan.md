# FISCALIZE — Denúncias de Irregularidades Eleitorais

Novo card na área **Campo** (ao lado de "Registrar Ação" e "Cadastrar Liderança") para qualquer liderança em campo enviar denúncias diretamente ao jurídico da campanha, com prova autenticada.

## Estratégia de autenticação de mídia (nativa + barata)

100% nativo, sem custo de terceiros, com força probatória adequada para representações no TSE/TRE:

1. **Captura obrigatória pela câmera do device** (não permite upload da galeria) — usa `<input capture="environment">` no mobile.
2. **Cadeia de custódia gravada no servidor**:
   - SHA-256 do arquivo (calculado no client e revalidado no servidor)
   - EXIF preservado (timestamp e GPS da câmera, quando houver)
   - GPS do navegador no momento do envio + endereço reverso
   - Timestamp **do servidor** (não do device, que pode ser adulterado)
   - ID do usuário autenticado + IP + user-agent
   - URL imutável no Storage (bucket privado `fiscalize-evidence`)
3. **Triagem opcional de deepfake/IA** via **Lovable AI Gateway** (Gemini 2.5 Flash, já incluso — sem custo extra de chave): para imagens, retorna score de suspeita de manipulação/IA e descrição do conteúdo, anexados ao registro.
4. **Sem integração paga no MVP**. Se mais tarde o jurídico exigir padrão C2PA forense, plugamos **Truepic** (única integração paga recomendada, ~US$0,10 por captura) sem refatorar o módulo.

## Fluxo do usuário (mobile-first, 1 tela)

```text
[Campo] → [Fiscalize]
  ├─ Categoria* (dropdown: Pré-campanha irregular / Abuso poder econômico /
  │              Uso da máquina pública / Material irregular / Outro)
  ├─ Título* (input curto)
  ├─ Denunciado* (nome + cargo/partido opcional)
  ├─ Localização* [Geolocalizar] OU [Informar endereço] (offline)
  ├─ Relato* (textarea)
  ├─ Provas (até 5: foto/vídeo/áudio, captura na câmera)
  └─ [Enviar ao jurídico]
```

Suporte **offline**: rascunhos ficam no IndexedDB e sincronizam ao reconectar (mesmo padrão já usado no tracking).

## Destino da denúncia

**Caixa interna na plataforma + notificação** (recomendado):
- Nova rota `/juridico` visível apenas para `admin_master` e novo papel `juridico`.
- Lista com filtros (status, categoria, candidato, território, severidade IA).
- Status: `nova → em_analise → protocolada → arquivada` com nota obrigatória na mudança (mesmo padrão dos alertas estratégicos).
- Notificação por **toast + badge** no sino do header para o jurídico ao receber nova denúncia.
- Export PDF da denúncia + provas + cadeia de custódia (para anexar em representação).

## Banco de dados

Nova tabela `fiscalize_reports` (soft-delete, RLS, GRANTs, candidate_id para multi-candidato, created_by para rastreabilidade):
- `category`, `title`, `denounced_name`, `denounced_role`, `narrative`
- `lat`, `lng`, `address`, `municipality`
- `evidence` (jsonb: array de `{url, sha256, mime, exif, ai_score, ai_description}`)
- `status`, `severity`, `legal_notes`, `protocol_number`
- `candidate_id`, `created_by`, `assigned_to`

Tabela `fiscalize_history` para auditoria de mudanças de status.

Bucket privado `fiscalize-evidence` com policies por `created_by` (denunciante vê só as suas) e por papel `juridico`/`admin_master` (vê tudo do candidato ativo).

## RLS
- Denunciante (`operador_campo`, lideranças): cria e lê **apenas as próprias** denúncias.
- `juridico` e `admin_master`: leem/editam todas dentro do escopo de `candidate_id`.
- Gestores estaduais (Novo/PL): leem apenas as do seu partido (mesmo padrão `can_view_by_creator_party`).

## Edge function `fiscalize-submit`
- Recebe payload + arquivos já enviados ao Storage.
- Revalida SHA-256, grava timestamp do servidor, IP, UA.
- Chama Lovable AI (Gemini 2.5 Flash) para cada imagem → score de manipulação + descrição.
- Insere o registro e dispara notificação ao jurídico.

## Detalhes técnicos

- **Stack**: React + Vite + Tailwind + Supabase (já no projeto). Nenhuma dependência nova obrigatória.
- **Hash client**: `crypto.subtle.digest('SHA-256', ...)` nativo do browser.
- **Geo**: reaproveita `GeoLocationInput` já existente.
- **IA**: `LOVABLE_API_KEY` (já configurado) → endpoint `https://ai.gateway.lovable.dev/v1/chat/completions` com `google/gemini-2.5-flash` e input multimodal `image_url`.
- **Roles**: adiciona `juridico` ao enum `app_role`.
- **Sidebar**: novo item "Jurídico" visível apenas para `juridico`/`admin_master`.
- **Página Campo**: adiciona terceiro card "Fiscalize" + rota `/campo/fiscalize`.

## Entregas (ordem de implementação)

1. Migração: enum `app_role` + tabelas `fiscalize_reports` / `fiscalize_history` + bucket + policies.
2. Edge function `fiscalize-submit` (com triagem IA).
3. Tela `/campo/fiscalize` (form mobile com captura, hash client, offline draft).
4. Tela `/juridico` (lista, detalhe, mudança de status, export PDF).
5. Sidebar + card no `/campo` + notificações.

## Fora do escopo deste plano
- Integração Truepic (deixar gancho pronto, mas só plugar se o jurídico pedir).
- Link público anônimo para denúncia externa (pode virar v2).
- Workflow de protocolo automático no TSE/TRE.
