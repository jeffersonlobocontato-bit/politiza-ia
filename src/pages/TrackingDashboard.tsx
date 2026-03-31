import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrackingRounds, useCreateRound, useUpdateRound } from '@/hooks/useTracking';
import { useTrackingDashboardData, useTrackingAlerts, useTrackingInsights, useRunTrackingAnalysis, useActiveAlertCount } from '@/hooks/useTrackingInsights';
import { useCreateRoundQuestions, QUESTION_PRESETS } from '@/hooks/useTrackingQuestions';
import { useCandidate } from '@/contexts/CandidateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, MapPin, AlertTriangle, TrendingUp, Plus, Brain, Eye, Link2, Trash2, CheckSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

interface NewQuestion {
  question_key: string;
  label: string;
  question_type: string;
  is_required: boolean;
  options: string[];
}

export default function TrackingDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { activeCandidate } = useCandidate();
  const { data: rounds = [] } = useTrackingRounds();
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const roundId = selectedRoundId || rounds[0]?.id;

  const { data: dashData } = useTrackingDashboardData(roundId);
  const { data: alerts = [] } = useTrackingAlerts(roundId);
  const { data: insights = [] } = useTrackingInsights(roundId);
  const { data: activeAlertCount = 0 } = useActiveAlertCount();
  const runAnalysis = useRunTrackingAnalysis();
  const createRound = useCreateRound();
  const createQuestions = useCreateRoundQuestions();

  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundDesc, setNewRoundDesc] = useState('');
  const [newRoundTarget, setNewRoundTarget] = useState(100);
  const [newRoundScope, setNewRoundScope] = useState('estado');
  const [newRoundMacro, setNewRoundMacro] = useState('');
  const [newRoundMicro, setNewRoundMicro] = useState('');
  const [newRoundMunicipality, setNewRoundMunicipality] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<NewQuestion[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customKey, setCustomKey] = useState('');

  const activeAlerts = alerts.filter(a => ['novo', 'em_analise'].includes(a.status));
  const lowCapAlerts = alerts.filter(a => a.alert_type === 'baixa_capilaridade' && a.status !== 'resolvido');

  const voteData = Object.entries(dashData?.voteCounts ?? {})
    .map(([name, count]) => ({ name, votos: count as number }))
    .sort((a, b) => b.votos - a.votos)
    .slice(0, 8);

  const rejectData = Object.entries(dashData?.rejectCounts ?? {})
    .map(([name, count]) => ({ name, value: count as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const copyRoundLink = (rId: string) => {
    const url = `${window.location.origin}/tracking?round=${rId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const [editingOptionsIdx, setEditingOptionsIdx] = useState<number | null>(null);
  const [newOption, setNewOption] = useState('');

  const addAllPresets = () => {
    const existing = new Set(questions.map(q => q.question_key));
    const toAdd = QUESTION_PRESETS.filter(p => !existing.has(p.question_key)).map(p => ({
      ...p,
      is_required: true,
      options: [] as string[],
    }));
    setQuestions(prev => [...prev, ...toAdd]);
  };

  const addCustomQuestion = () => {
    if (!customLabel.trim()) return;
    const key = customKey.trim() || customLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setQuestions(prev => [...prev, { question_key: key, label: customLabel.trim(), question_type: 'select', is_required: false, options: [] }]);
    setCustomLabel('');
    setCustomKey('');
    // Auto-open options editor for the new question
    setTimeout(() => setEditingOptionsIdx(questions.length), 0);
  };

  const addOptionToQuestion = (idx: number) => {
    if (!newOption.trim()) return;
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, options: [...q.options, newOption.trim()] } : q));
    setNewOption('');
  };

  const removeOptionFromQuestion = (qIdx: number, optIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, oi) => oi !== optIdx) } : q));
  };

  const toggleQuestionType = (idx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== idx) return q;
      const types = ['text', 'select', 'candidate_name'];
      const next = types[(types.indexOf(q.question_type) + 1) % types.length];
      return { ...q, question_type: next };
    }));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateRound = async () => {
    if (!activeCandidate?.id || !newRoundTitle.trim()) return;
    const round = await createRound.mutateAsync({
      candidate_id: activeCandidate.id,
      title: newRoundTitle.trim(),
      description: newRoundDesc.trim() || null,
      target_interviews: newRoundTarget,
      territory_scope: newRoundScope,
      created_by: user?.id,
    } as any);

    // Create questions for this round
    if (questions.length > 0 && round?.id) {
      await createQuestions.mutateAsync(
        questions.map((q, i) => ({
          round_id: round.id,
          question_key: q.question_key,
          label: q.label,
          question_type: q.question_type,
          options: null,
          sort_order: i,
          is_required: q.is_required,
        }))
      );
    }

    setDialogOpen(false);
    setNewRoundTitle('');
    setNewRoundDesc('');
    setNewRoundTarget(100);
    setNewRoundScope('estado');
    setNewRoundMacro('');
    setNewRoundMicro('');
    setNewRoundMunicipality('');
    setQuestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Tracking</h1>
          <p className="text-sm text-muted-foreground">Análise consolidada das rodadas de pesquisa de campo</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={roundId || ''} onValueChange={setSelectedRoundId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecionar rodada" />
            </SelectTrigger>
            <SelectContent>
              {rounds.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title} ({r.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {roundId && (
            <Button size="sm" variant="ghost" onClick={() => copyRoundLink(roundId)} title="Copiar link do formulário">
              <Link2 className="w-4 h-4" />
            </Button>
          )}

          {isAdmin && (
            <>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Rodada</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Rodada</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Título *</Label>
                      <Input value={newRoundTitle} onChange={e => setNewRoundTitle(e.target.value)} placeholder="Ex: Rodada 1 - Março 2026" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea value={newRoundDesc} onChange={e => setNewRoundDesc(e.target.value)} placeholder="Descrição da rodada..." />
                    </div>

                    {/* Territory */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Escopo Territorial</Label>
                        <Select value={newRoundScope} onValueChange={setNewRoundScope}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="estado">Estado</SelectItem>
                            <SelectItem value="macrorregiao">Macrorregião</SelectItem>
                            <SelectItem value="microrregiao">Microrregião</SelectItem>
                            <SelectItem value="municipio">Município</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Meta de Entrevistas</Label>
                        <Input type="number" value={newRoundTarget} onChange={e => setNewRoundTarget(Number(e.target.value))} />
                      </div>
                    </div>

                    {newRoundScope !== 'estado' && (
                      <div className="grid grid-cols-1 gap-3">
                        {['macrorregiao', 'microrregiao', 'municipio'].includes(newRoundScope) && (
                          <div>
                            <Label>Macrorregião</Label>
                            <Input value={newRoundMacro} onChange={e => setNewRoundMacro(e.target.value)} placeholder="Ex: Norte Pioneiro" />
                          </div>
                        )}
                        {['microrregiao', 'municipio'].includes(newRoundScope) && (
                          <div>
                            <Label>Microrregião</Label>
                            <Input value={newRoundMicro} onChange={e => setNewRoundMicro(e.target.value)} placeholder="Ex: Londrina" />
                          </div>
                        )}
                        {newRoundScope === 'municipio' && (
                          <div>
                            <Label>Município</Label>
                            <Input value={newRoundMunicipality} onChange={e => setNewRoundMunicipality(e.target.value)} placeholder="Ex: Curitiba" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Questions */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-semibold">Perguntas da Rodada</Label>
                        <Button type="button" size="sm" variant="outline" onClick={addAllPresets}>
                          <CheckSquare className="w-3 h-3 mr-1" /> Adicionar Padrão
                        </Button>
                      </div>

                      {questions.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {questions.map((q, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                              <span className="text-sm flex-1">{q.label}</span>
                              <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeQuestion(idx)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          value={customLabel}
                          onChange={e => setCustomLabel(e.target.value)}
                          placeholder="Nova pergunta personalizada..."
                          className="flex-1"
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomQuestion())}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={addCustomQuestion} disabled={!customLabel.trim()}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      {questions.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Clique em "Adicionar Padrão" para incluir as perguntas tradicionais ou crie perguntas personalizadas.
                        </p>
                      )}
                    </div>

                    <Button onClick={handleCreateRound} disabled={createRound.isPending} className="w-full">
                      {createRound.isPending ? 'Criando...' : 'Criar Rodada'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {roundId && (
                <Button size="sm" variant="outline" onClick={() => runAnalysis.mutate({ roundId, candidateId: activeCandidate!.id })} disabled={runAnalysis.isPending}>
                  <Brain className="w-4 h-4 mr-1" />
                  {runAnalysis.isPending ? 'Analisando...' : 'Rodar IA'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rounds list with copy link */}
      {rounds.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rodadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rounds.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.territory_scope} • Meta: {r.target_interviews}</p>
                  </div>
                  <Badge variant={r.status === 'aberta' ? 'default' : 'secondary'}>{r.status}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyRoundLink(r.id)} title="Copiar link">
                    <Link2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Big Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" /> Entrevistas
            </div>
            <p className="text-2xl font-bold">{dashData?.totalInterviews ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" /> Cobertura (Cidades)
            </div>
            <p className="text-2xl font-bold">{dashData?.coverageCities ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => navigate('/tracking/apontamentos')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-destructive mb-1">
              <AlertTriangle className="w-4 h-4" /> Alertas Ativos
            </div>
            <p className="text-2xl font-bold text-destructive">{activeAlertCount}</p>
            <p className="text-xs text-muted-foreground">{lowCapAlerts.length} baixa capilaridade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" /> Insights IA
            </div>
            <p className="text-2xl font-bold">{insights.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking - Intenção de Voto Estimulada</CardTitle>
          </CardHeader>
          <CardContent>
            {voteData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={voteData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="votos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados nesta rodada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rejeição</CardTitle>
          </CardHeader>
          <CardContent>
            {rejectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={rejectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {rejectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Card */}
      {activeAlerts.length > 0 && (
        <Card className="border-destructive/30 cursor-pointer hover:border-destructive/60 transition-colors" onClick={() => navigate('/tracking/apontamentos')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Alertas Estratégicos de Ativação
              <Badge variant="destructive" className="ml-2">{activeAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-destructive/5">
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${alert.severity >= 7 ? 'bg-red-500' : alert.severity >= 4 ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.municipality || alert.microregion || 'Regional'}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs">
                    {alert.alert_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
              {activeAlerts.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">+ {activeAlerts.length - 5} alertas</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5" /> Insights Recentes da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.slice(0, 5).map(insight => (
                <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <Badge variant={insight.insight_type === 'oportunidade' ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                    {insight.insight_type}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    {insight.recommendation && (
                      <p className="text-xs text-muted-foreground mt-1">{insight.recommendation}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">{insight.municipality || insight.microregion || ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
