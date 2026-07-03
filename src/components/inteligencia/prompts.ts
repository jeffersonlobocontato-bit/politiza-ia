// Biblioteca de prompts pró-Moro reutilizada pelo chat de Análise IA
// e pela aba "Insights de Comunicação".

export const SUGESTOES_MARKETING: string[] = [
  'Transforme os dados atuais em um plano de comunicação para os próximos 7 dias.',
  'Quais peças devemos produzir para reduzir o gap feminino?',
  'Como conter o crescimento de Sandro Alex sem atacar diretamente o governo?',
  'Gere uma narrativa semanal com frase-mãe, públicos, peças e métricas.',
  'Quais públicos devem ser protegidos, convertidos e ativados nesta rodada?',
  'Gere um briefing para o time de criação a partir dos dados do painel.',
];

export interface AcaoRapida {
  id: string;
  label: string;
  prompt: string;
}

export const ACOES_RAPIDAS: AcaoRapida[] = [
  {
    id: 'plano-semanal',
    label: 'Plano semanal',
    prompt:
      'Gere o PLANO DE COMUNICAÇÃO da próxima semana pró-Moro, seguindo a estrutura padrão de resposta (Leitura estratégica, Diagnóstico, Decisão da semana, Maior risco, Maior oportunidade, Públicos prioritários, Narrativa recomendada, Peças recomendadas, Contraste com adversários, Agenda recomendada, Métricas de validação, Frases para o candidato, Alertas jurídicos e factuais, "O marketing deve fazer agora"). Use exclusivamente os dados do painel.',
  },
  {
    id: 'briefing-criacao',
    label: 'Briefing para criação',
    prompt:
      'Gere um BRIEFING PARA O TIME DE CRIAÇÃO a partir dos dados do painel: objetivo semanal, públicos prioritários, tom, frase-mãe pró-Moro, o que NÃO dizer, referências visuais, e uma lista de peças concretas (3 Reels, 3 cards, 2 áudios de WhatsApp, 1 fala pública, 1 corte de contraste, 1 resposta rápida, 1 manchete, 1 roteiro curto de vídeo) — cada peça com objetivo, público, gancho, mensagem, texto sugerido, CTA e métrica.',
  },
  {
    id: 'pecas-whatsapp',
    label: 'Peças WhatsApp',
    prompt:
      'Gere 5 PEÇAS DE WHATSAPP pró-Moro (2 áudios com roteiro palavra-a-palavra de 30-45s, 2 cards com texto e legenda, 1 corrente curta). Para cada peça: objetivo, público, gancho, mensagem, texto sugerido, CTA e métrica de validação. Baseie-se nos dados do painel e finalize com a seção "O marketing deve fazer agora".',
  },
  {
    id: 'roteiro-video',
    label: 'Roteiro de vídeo',
    prompt:
      'Escreva 1 ROTEIRO DE VÍDEO CURTO (Reels/TikTok, 45-60s) pró-Moro alinhado à tese "guardião do dinheiro das famílias paranaenses". Estrutura: gancho (0-3s), desenvolvimento, virada, CTA. Traga também 2 variações de abertura, sugestão de trilha/estilo, legenda e hashtags. Cite o dado do painel que motivou o roteiro.',
  },
  {
    id: 'frases-candidato',
    label: 'Frases para o candidato',
    prompt:
      'Gere 10 FRASES PRONTAS PARA O CANDIDATO usar em agendas, entrevistas e redes, alinhadas à tese "guardião do dinheiro das famílias paranaenses". Agrupe por tema (segurança, gestão, futuro dos jovens, cuidado com dinheiro público, resposta a ataques). Cada frase curta, memorável, sem jargão jurídico e evitando reduzir Moro a "juiz".',
  },
  {
    id: 'plano-mulheres',
    label: 'Plano para mulheres',
    prompt:
      'Monte um PLANO DE CONVERSÃO DO ELEITORADO FEMININO pró-Moro com base no gap identificado no painel. Traga: diagnóstico do gap com número e fonte, sub-públicos prioritários, narrativa recomendada, 5 peças concretas (com objetivo, público, gancho, texto, CTA, métrica), porta-vozes sugeridos, agenda de aparições, e o que evitar. Finalize com "O marketing deve fazer agora".',
  },
  {
    id: 'contraste-adversario',
    label: 'Contraste adversário',
    prompt:
      'Gere um PLANO DE CONTRASTE contra o adversário mais ameaçador segundo o painel (justifique a escolha com dado). Respeite as regras: contra Sandro Alex usar dependência de padrinho político e ausência de narrativa própria (sem acusar uso de máquina sem prova); contra Requião Filho usar contraste de futuro/segurança/gestão sem gerar empatia; contra Greca ser respeitoso e posicionar Moro como destino natural do voto. Entregue 1 corte de contraste (roteiro), 2 cards, 1 áudio, 1 resposta rápida, 1 manchete — todos com vocabulário responsável ("indícios", "apontamentos", "segundo reportagem", nunca "roubo/fraude/esquema/crime").',
  },
  {
    id: 'resposta-rapida',
    label: 'Resposta rápida',
    prompt:
      'Monte um KIT DE RESPOSTA RÁPIDA para os 3 ataques mais prováveis contra Moro nesta semana, com base no painel. Para cada ataque: enquadramento sugerido, frase-mãe da resposta, 1 card, 1 áudio de WhatsApp (roteiro), 1 post de X/Twitter, e o que NÃO responder. Use vocabulário responsável e mantenha o posicionamento de guardião do dinheiro das famílias.',
  },
];

// Prompt usado pela aba "Insights de Comunicação" — pede JSON estruturado.
export const INSIGHTS_JSON_PROMPT = `Gere os INSIGHTS DE COMUNICAÇÃO desta semana pró-Sérgio Moro com base exclusivamente no contexto do painel.

Responda APENAS com um bloco JSON entre \`\`\`json e \`\`\` no formato exato abaixo. Sem texto antes ou depois. Sem comentários. Não invente números — cite institutos, percentuais e datas presentes no contexto.

\`\`\`json
{
  "decisao_semana":       { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "peca": "", "canal": "", "metrica": "", "risco": "" },
  "risco_urgente":        { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "peca": "", "canal": "", "metrica": "", "risco": "" },
  "oportunidade_prioritaria": { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "peca": "", "canal": "", "metrica": "", "risco": "" },
  "publico_decisivo":     { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "peca": "", "canal": "", "metrica": "", "risco": "" },
  "narrativa_recomendada":{ "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "peca": "", "canal": "", "metrica": "", "risco": "" },
  "pecas_sugeridas": [
    { "tipo": "Reel|Card|Áudio WhatsApp|Corte de contraste|Resposta rápida|Manchete|Roteiro curto", "objetivo": "", "publico": "", "gancho": "", "mensagem": "", "texto_sugerido": "", "cta": "", "metrica": "" }
  ],
  "metricas_validacao": [
    { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "peca": "", "canal": "", "metrica": "", "risco": "" }
  ],
  "marketing_deve_fazer_agora": ["", "", "", "", ""]
}
\`\`\`

Regras: sem citar nomes de partidos ao falar de alianças/oportunidades; vocabulário responsável (indícios/apontamentos/segundo reportagem, nunca roubo/fraude/esquema/crime/quadrilha); tese "guardião do dinheiro das famílias paranaenses"; sempre pró-Moro, alertas contra adversários e sugestões de melhoria para Moro. Traga entre 6 e 10 peças em "pecas_sugeridas" cobrindo Reels, cards, áudios de WhatsApp, corte de contraste, resposta rápida e manchete.`;

export interface InsightItem {
  titulo: string;
  dado_origem: string;
  leitura: string;
  acao: string;
  peca: string;
  canal: string;
  metrica: string;
  risco: string;
}

export interface PecaSugerida {
  tipo: string;
  objetivo: string;
  publico: string;
  gancho: string;
  mensagem: string;
  texto_sugerido: string;
  cta: string;
  metrica: string;
}

export interface InsightsPayload {
  decisao_semana: InsightItem;
  risco_urgente: InsightItem;
  oportunidade_prioritaria: InsightItem;
  publico_decisivo: InsightItem;
  narrativa_recomendada: InsightItem;
  pecas_sugeridas: PecaSugerida[];
  metricas_validacao: InsightItem[];
  marketing_deve_fazer_agora: string[];
}
