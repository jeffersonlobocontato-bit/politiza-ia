import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  Target,
  AlertTriangle,
  Users,
  Megaphone,
  Film,
  Gauge,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { INSIGHTS_JSON_PROMPT, type InsightsPayload, type InsightItem, type PecaSugerida } from './prompts';

interface Props {
  context: unknown;
}

function extractJson(text: string): InsightsPayload | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as InsightsPayload;
  } catch {
    return null;
  }
}

function InsightCard({
  icon: Icon,
  title,
  tone,
  item,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: 'primary' | 'destructive' | 'secondary' | 'accent';
  item: InsightItem;
}) {
  if (!item) return null;
  const toneClass =
    tone === 'destructive'
      ? 'border-destructive/40'
      : tone === 'secondary'
      ? 'border-secondary/40'
      : tone === 'accent'
      ? 'border-accent/40'
      : 'border-primary/40';
  return (
    <Card className={`${toneClass} border-l-4`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
        {item.titulo && <p className="text-base font-bold leading-tight">{item.titulo}</p>}
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {item.dado_origem && (
          <p>
            <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Dado</span>
            <br />
            {item.dado_origem}
          </p>
        )}
        {item.leitura && (
          <p>
            <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Leitura</span>
            <br />
            {item.leitura}
          </p>
        )}
        {item.acao && (
          <p>
            <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Ação</span>
            <br />
            <span className="font-medium">{item.acao}</span>
          </p>
        )}
        {(item.peca || item.canal) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.peca && <Badge variant="outline" className="text-[10px]">{item.peca}</Badge>}
            {item.canal && <Badge variant="secondary" className="text-[10px]">{item.canal}</Badge>}
          </div>
        )}
        {item.metrica && (
          <p className="text-muted-foreground">
            <Gauge className="w-3 h-3 inline mr-1" />
            {item.metrica}
          </p>
        )}
        {item.risco && (
          <p className="text-destructive/80">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {item.risco}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PecaCard({ p }: { p: PecaSugerida }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Badge className="text-[10px]">{p.tipo}</Badge>
          {p.publico && <span className="text-[10px] text-muted-foreground">{p.publico}</span>}
        </div>
        {p.objetivo && <p className="text-sm font-semibold leading-tight pt-1">{p.objetivo}</p>}
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        {p.gancho && (
          <p>
            <span className="text-muted-foreground text-[10px] uppercase">Gancho: </span>
            {p.gancho}
          </p>
        )}
        {p.mensagem && (
          <p>
            <span className="text-muted-foreground text-[10px] uppercase">Mensagem: </span>
            {p.mensagem}
          </p>
        )}
        {p.texto_sugerido && (
          <p className="italic border-l-2 border-primary/40 pl-2">"{p.texto_sugerido}"</p>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {p.cta && <Badge variant="outline" className="text-[10px]">CTA: {p.cta}</Badge>}
          {p.metrica && <Badge variant="secondary" className="text-[10px]">{p.metrica}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InsightsComunicacao({ context }: Props) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [rawFallback, setRawFallback] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<Date | null>(null);

  const gerar = async () => {
    setLoading(true);
    setRawFallback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/chat-inteligencia`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: INSIGHTS_JSON_PROMPT, context }),
        },
      );
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let metaParsed = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        let chunk = decoder.decode(value, { stream: true });
        if (!metaParsed) {
          const idx = chunk.indexOf('\n');
          if (chunk.startsWith('__META__') && idx > 0) {
            chunk = chunk.slice(idx + 1);
            metaParsed = true;
          } else if (chunk.startsWith('__META__')) {
            continue;
          } else {
            metaParsed = true;
          }
        }
        acc += chunk;
      }
      const parsed = extractJson(acc);
      if (parsed) {
        setInsights(parsed);
        setGeradoEm(new Date());
      } else {
        setInsights(null);
        setRawFallback(acc);
        toast.error('Não foi possível interpretar a resposta como JSON. Exibindo texto bruto.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Insights de Comunicação Eleitoral
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              O que o marketing deve fazer agora para atrair, reter, converter e proteger votos pró-Moro.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {geradoEm && (
              <span className="text-[10px] text-muted-foreground">
                Gerado em {geradoEm.toLocaleString('pt-BR')}
              </span>
            )}
            <Button onClick={gerar} disabled={loading} size="sm" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {insights || rawFallback ? 'Regenerar insights' : 'Gerar insights'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!insights && !rawFallback && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Clique em <strong>Gerar insights</strong> para transformar os dados do painel em decisões de comunicação da semana.
          </CardContent>
        </Card>
      )}

      {loading && !insights && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analisando painel e montando plano de comunicação…
          </CardContent>
        </Card>
      )}

      {rawFallback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resposta bruta</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs">{rawFallback}</pre>
          </CardContent>
        </Card>
      )}

      {insights && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InsightCard icon={Target} tone="primary" title="Decisão da semana" item={insights.decisao_semana} />
            <InsightCard icon={AlertTriangle} tone="destructive" title="Risco urgente" item={insights.risco_urgente} />
            <InsightCard icon={Sparkles} tone="secondary" title="Oportunidade prioritária" item={insights.oportunidade_prioritaria} />
            <InsightCard icon={Users} tone="accent" title="Público decisivo" item={insights.publico_decisivo} />
            <InsightCard icon={Megaphone} tone="primary" title="Narrativa recomendada" item={insights.narrativa_recomendada} />
          </div>

          {Array.isArray(insights.metricas_validacao) && insights.metricas_validacao.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Métricas de validação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.metricas_validacao.map((m, i) => (
                  <InsightCard key={i} icon={Gauge} tone="secondary" title={`Métrica ${i + 1}`} item={m} />
                ))}
              </div>
            </div>
          )}

          {Array.isArray(insights.pecas_sugeridas) && insights.pecas_sugeridas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" /> Peças sugeridas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.pecas_sugeridas.map((p, i) => (
                  <PecaCard key={i} p={p} />
                ))}
              </div>
            </div>
          )}

          {Array.isArray(insights.marketing_deve_fazer_agora) && insights.marketing_deve_fazer_agora.length > 0 && (
            <Card className="border-primary/50 border-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  O marketing deve fazer agora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  {insights.marketing_deve_fazer_agora.filter(Boolean).map((a, i) => (
                    <li key={i} className="leading-relaxed">
                      {a}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
