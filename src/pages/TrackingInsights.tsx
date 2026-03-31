import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTrackingInsights, useTrackingAlerts, useUpdateInsightStatus, useUpdateAlertStatus } from '@/hooks/useTrackingInsights';
import { useTrackingRounds } from '@/hooks/useTracking';
import { ALERT_TYPE_LABELS, INSIGHT_TYPE_LABELS } from '@/types/tracking';
import type { DbTrackingAiInsight, DbTrackingAiAlert, TrackingInsightStatus } from '@/types/tracking';
import { AlertTriangle, Lightbulb, Search, Filter } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  visualizado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  em_analise: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  resolvido: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

function getSeverityLevel(severity: number) {
  if (severity >= 7) return 'high';
  if (severity >= 4) return 'medium';
  return 'low';
}

export default function TrackingInsights() {
  const { data: rounds = [] } = useTrackingRounds();
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');
  const roundFilter = selectedRoundId === 'all' ? undefined : selectedRoundId;

  const { data: insights = [] } = useTrackingInsights(roundFilter);
  const { data: alerts = [] } = useTrackingAlerts(roundFilter);
  const updateInsight = useUpdateInsightStatus();
  const updateAlert = useUpdateAlertStatus();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [statusDialog, setStatusDialog] = useState<{ type: 'insight' | 'alert'; id: string; currentStatus: string } | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  const filterItems = <T extends { title: string; municipality?: string | null; microregion?: string | null; status: string }>(items: T[], extraTypeFilter?: (item: T) => boolean) => {
    return items.filter(item => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
          !(item.municipality || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (extraTypeFilter && !extraTypeFilter(item)) return false;
      return true;
    });
  };

  const filteredAlerts = filterItems(alerts, (a) => typeFilter === 'all' || a.alert_type === typeFilter);
  const filteredInsights = filterItems(insights, (i) => typeFilter === 'all' || i.insight_type === typeFilter);

  const handleStatusUpdate = async () => {
    if (!statusDialog || !newStatus) return;
    if (['em_analise', 'resolvido'].includes(newStatus) && !resolutionNote.trim()) return;

    if (statusDialog.type === 'insight') {
      await updateInsight.mutateAsync({ id: statusDialog.id, status: newStatus, resolution_note: resolutionNote.trim() || undefined });
    } else {
      await updateAlert.mutateAsync({ id: statusDialog.id, status: newStatus, resolution_note: resolutionNote.trim() || undefined });
    }
    setStatusDialog(null);
    setNewStatus('');
    setResolutionNote('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apontamentos Estratégicos</h1>
        <p className="text-sm text-muted-foreground">Insights e alertas gerados pela Inteligência Artificial do tracking</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou território..." className="pl-9" />
            </div>
            <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rodada" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as rodadas</SelectItem>
                {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="visualizado">Visualizado</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts" className="gap-1">
            <AlertTriangle className="w-4 h-4" /> Alertas ({filteredAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1">
            <Lightbulb className="w-4 h-4" /> Insights ({filteredInsights.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3 mt-4">
          {filteredAlerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta encontrado.</p>}
          {filteredAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onStatusClick={() => setStatusDialog({ type: 'alert', id: alert.id, currentStatus: alert.status })} />
          ))}
        </TabsContent>

        <TabsContent value="insights" className="space-y-3 mt-4">
          {filteredInsights.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum insight encontrado.</p>}
          {filteredInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} onStatusClick={() => setStatusDialog({ type: 'insight', id: insight.id, currentStatus: insight.status })} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Status update dialog */}
      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visualizado">Visualizado</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nota de Resolução {['em_analise', 'resolvido'].includes(newStatus) && '*'}</Label>
              <Textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="Descreva o plano de ação ou a resolução..." />
            </div>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || (['em_analise', 'resolvido'].includes(newStatus) && !resolutionNote.trim())} className="w-full">
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertCard({ alert, onStatusClick }: { alert: DbTrackingAiAlert; onStatusClick: () => void }) {
  const sev = getSeverityLevel(alert.severity);
  return (
    <Card className="border-l-4" style={{ borderLeftColor: sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f59e0b' : '#3b82f6' }}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[sev]}`} />
              <span className="font-semibold text-sm">{alert.title}</span>
              <Badge variant="outline" className="text-xs">{ALERT_TYPE_LABELS[alert.alert_type]}</Badge>
            </div>
            {alert.description && <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {alert.municipality && <span>📍 {alert.municipality}</span>}
              {alert.microregion && <span>🗺 {alert.microregion}</span>}
              <span>Ações: {alert.field_actions_count}</span>
              <span>Variação: {alert.tracking_variation > 0 ? '+' : ''}{alert.tracking_variation}%</span>
              <span>Capilaridade: {alert.capillarity_index}</span>
            </div>
            {alert.recommendation && (
              <div className="mt-2 p-2 rounded bg-muted text-xs">
                <strong>Recomendação:</strong> {alert.recommendation}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge className={`text-xs border ${STATUS_COLORS[alert.status]}`} variant="outline" onClick={onStatusClick} role="button">
              {alert.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">Score: {alert.priority_score}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight, onStatusClick }: { insight: DbTrackingAiInsight; onStatusClick: () => void }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="secondary" className="text-xs">{INSIGHT_TYPE_LABELS[insight.insight_type]}</Badge>
              <span className="font-semibold text-sm">{insight.title}</span>
            </div>
            {insight.description && <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {insight.municipality && <span>📍 {insight.municipality}</span>}
              <span>Capilaridade: {insight.capillarity_score}</span>
              <span>Eficiência: {insight.efficiency_score}</span>
            </div>
            {insight.recommendation && (
              <div className="mt-2 p-2 rounded bg-muted text-xs">
                <strong>Recomendação:</strong> {insight.recommendation}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge className={`text-xs border ${STATUS_COLORS[insight.status]}`} variant="outline" onClick={onStatusClick} role="button">
              {insight.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">Score: {insight.priority_score}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
