import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import { useToast } from '@/hooks/use-toast';
import { Brain, Loader2, AlertTriangle, Lightbulb, TrendingUp, Target, RefreshCw } from 'lucide-react';

interface Insight {
  type: string;
  severity: number;
  title: string;
  description: string;
  territory: string;
  recommendation: string;
}

interface AnalysisResult {
  insights: Insight[];
  summary: string;
}

const ICON_MAP: Record<string, any> = {
  alerta: AlertTriangle,
  oportunidade: Lightbulb,
  tendencia: TrendingUp,
  recomendacao: Target,
};

const COLOR_MAP: Record<string, string> = {
  alerta: 'text-red-400 bg-red-500/10 border-red-500/30',
  oportunidade: 'text-green-400 bg-green-500/10 border-green-500/30',
  tendencia: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  recomendacao: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

interface Props {
  selectedRoundId: string | null;
}

export function TrackingAI({ selectedRoundId }: Props) {
  const { activeCandidate } = useCandidate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tracking-ai', {
        body: {
          roundId: selectedRoundId || null,
          candidateId: activeCandidate?.id || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast({ title: 'Análise concluída!' });
    } catch (e: any) {
      toast({ title: 'Erro na análise', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Inteligência Artificial</h3>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Analisando...' : result ? 'Reanalisar' : 'Gerar Análise'}
        </Button>
      </div>

      {!result && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-1">Análise Estratégica com IA</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              A IA cruza dados do tracking com ações de campo para identificar oportunidades,
              riscos e territórios que precisam de ativação.
            </p>
            <Button onClick={runAnalysis} className="gap-2">
              <Brain className="w-4 h-4" /> Iniciar Análise
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <p className="text-sm text-foreground font-medium">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Insights */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {result.insights?.map((insight, idx) => {
                const Icon = ICON_MAP[insight.type] || Lightbulb;
                const color = COLOR_MAP[insight.type] || COLOR_MAP.recomendacao;

                return (
                  <Card key={idx} className={`border ${color.split(' ').slice(1).join(' ')}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color.split(' ')[1]}`}>
                          <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-foreground">{insight.title}</h4>
                            <Badge variant="outline" className="text-[10px]">
                              Severidade: {insight.severity}/10
                            </Badge>
                            {insight.territory && (
                              <Badge variant="secondary" className="text-[10px]">
                                📍 {insight.territory}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                          {insight.recommendation && (
                            <div className="text-xs text-foreground/80 bg-muted/50 rounded p-2">
                              💡 <strong>Recomendação:</strong> {insight.recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
