# Plano: Insights de Comunicação Eleitoral

Evoluir a camada de Inteligência de Campanha sem quebrar dados, importações ou abas existentes. Foco em prompt, UX do chat e nova aba de cards visuais.

## 1. Edge Function `chat-inteligencia`

Reescrever `SYSTEM_PROMPT` em `supabase/functions/chat-inteligencia/index.ts` com:

- **Papel**: estrategista sênior + analista de pesquisa + planejador de comunicação + redator + sala de guerra pró-Moro.
- **Tese central** (guardião do dinheiro das famílias paranaenses) e traduções obrigatórias (corrupção, segurança, gestão, integridade, obra, futuro).
- **Regras de dados**: apenas dados do contexto, citar percentuais/institutos/datas, nunca inventar.
- **Regras de contraste** por adversário (Sandro Alex, Requião Filho, Greca) conforme briefing.
- **Regras jurídicas/factuais**: vocabulário permitido ("indícios", "apontamentos", "segundo reportagem") e proibido ("roubo", "fraude comprovada", "esquema", etc.).
- **Regra de alianças/oportunidades**: nunca citar nomes de partidos (regra já acordada).
- **Formato de resposta padrão** para insights/planos/análises, com as 14 seções: Leitura estratégica, Diagnóstico, Decisão da semana, Maior risco, Maior oportunidade, Públicos prioritários, Narrativa recomendada, Peças recomendadas, Contraste com adversários, Agenda recomendada, Métricas de validação, Frases para o candidato, Alertas jurídicos e factuais, "O marketing deve fazer agora" (5–8 ações).
- **Peças concretas obrigatórias** quando pedir comunicação (3 Reels, 3 cards, 2 áudios WhatsApp, 1 fala pública, 1 corte de contraste, 1 resposta rápida, 1 manchete, 1 roteiro curto), cada uma com objetivo, público, gancho, mensagem, texto sugerido, CTA e métrica.

Preservar: streaming SSE, persistência de threads/mensagens, verificação `is_admin`, envio do `context` JSON, modelo `google/gemini-2.5-flash`.

Aplicar as mesmas regras (tese, vocabulário responsável, sem partidos) ao prompt de `supabase/functions/strategic-analysis/index.ts` para alinhar alertas curtos com o novo tom.

## 2. Chat `AnaliseIAChat.tsx`

- Substituir `SUGESTOES` pelos 6 prompts orientados a marketing listados no briefing.
- Adicionar barra de **Ações rápidas** logo acima do `PromptInput` (grid de chips/botões `variant="outline" size="sm"`), com 8 ações:
  - Plano semanal, Briefing criação, Peças WhatsApp, Roteiro de vídeo, Frases do candidato, Plano mulheres, Contraste adversário, Resposta rápida.
- Cada botão dispara `send(promptCompleto)` com um prompt pré-formado (definidos em constante `ACOES_RAPIDAS`) que instrui o agente a usar a estrutura padrão + entregar peças concretas.
- Manter streaming, threads, sugestões iniciais e comportamento atual.

## 3. Nova aba "Insights de Comunicação" em `Inteligencia.tsx`

Adicionar aba nova (`Tabs`) sem remover as existentes. Conteúdo:

- Botão **"Gerar insights"** que chama `chat-inteligencia` (fora do fluxo de thread — request única, não-streaming ou consumindo o stream até o fim) com um prompt fixo pedindo JSON estruturado:

```text
{
  decisao_semana, risco_urgente, oportunidade_prioritaria,
  publico_decisivo, narrativa_recomendada,
  pecas_sugeridas[], metricas_validacao[]
}
```

Cada item com: `dado_origem`, `leitura`, `acao`, `peca`, `canal`, `metrica`, `risco`.

- Renderizar como grid de cards (reutilizando `Card`, tokens MobNex) — 7 cards principais + lista de peças.
- Estado local: `insights`, `loading`, `geradoEm`. Botão de regenerar.
- Sem persistência nova no banco nesta fase (evita mudanças de schema); se o usuário quiser histórico depois, avaliamos.

## 4. Detalhes técnicos

- **Prompts pré-formados** vivem em `src/components/inteligencia/prompts.ts` (novo arquivo) para reutilização entre chat e aba de insights.
- **Parsing JSON** dos insights: pedir ao modelo bloco `json` cercado por fences, extrair via regex, fallback para exibir texto bruto num card se parse falhar.
- Layout mantém DM Sans, dark Navy/Verde, sem hardcode de cores.
- Nenhuma alteração em Supabase schema, RLS, importação de pesquisas, ou nas abas atuais (Overview, Cruzamento, Cenários, Análise IA).

## Arquivos afetados

```text
supabase/functions/chat-inteligencia/index.ts   (prompt + tese + estrutura)
supabase/functions/strategic-analysis/index.ts  (alinhamento de tom)
src/components/inteligencia/AnaliseIAChat.tsx   (sugestões + ações rápidas)
src/components/inteligencia/prompts.ts          (novo — biblioteca de prompts)
src/components/inteligencia/InsightsComunicacao.tsx (novo — aba de cards)
src/pages/Inteligencia.tsx                      (nova aba + integração)
```

## Fora de escopo

- Persistir insights gerados no banco.
- Alterar importação de pesquisas ou dados existentes.
- Mudar modelo/gateway ou fluxo de streaming.
