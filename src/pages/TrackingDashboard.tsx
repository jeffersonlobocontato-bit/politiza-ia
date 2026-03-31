import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrackingRounds, useCreateRound, useUpdateRound } from '@/hooks/useTracking';
import { useTrackingDashboardData, useTrackingAlerts, useTrackingInsights, useRunTrackingAnalysis, useActiveAlertCount } from '@/hooks/useTrackingInsights';
import { useCandidate } from '@/contexts/CandidateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, MapPin, AlertTriangle, TrendingUp, Plus, Brain, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

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

  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundDesc, setNewRoundDesc] = useState('');
  const [newRoundTarget, setNewRoundTarget] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleCreateRound = async () => {
    if (!activeCandidate?.id || !newRoundTitle.trim()) return;
    await createRound.mutateAsync({
      candidate_id: activeCandidate.id,
      title: newRoundTitle.trim(),
      description: newRoundDesc.trim() || null,
      target_interviews: newRoundTarget,
      created_by: user?.id,
    });
    setDialogOpen(false);
    setNewRoundTitle('');
    setNewRoundDesc('');
    setNewRoundTarget(100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Tracking</h1>
          <p className="text-sm text-muted-foreground">Análise consolidada das rodadas de pesquisa de campo</p>
        </div>
        <div className="flex items-center gap-2">
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

          {isAdmin && (
            <>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Rodada</Button>
                </DialogTrigger>
                <DialogContent>
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
                    <div>
                      <Label>Meta de Entrevistas</Label>
                      <Input type="number" value={newRoundTarget} onChange={e => setNewRoundTarget(Number(e.target.value))} />
                    </div>
                    <Button onClick={handleCreateRound} disabled={createRound.isPending} className="w-full">Criar Rodada</Button>
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
        {/* Vote ranking */}
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

        {/* Rejection pie */}
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

      {/* Alerts Card - clickable */}
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
