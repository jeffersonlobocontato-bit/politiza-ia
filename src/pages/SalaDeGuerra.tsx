import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import {
  Crosshair, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, Clock, Users, Activity, MapPin, Zap, Target
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import {
  macroRegions, municipalities, actions, alerts, globalKPIs,
  pollTimeline, getEngagementColor, getEngagementLevel, getStatusColor
} from '@/data/mockData';

const KPICard = ({ label, value, sub, icon: Icon, color, trend }: any) => (
  <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold ${trend > 0 ? 'text-brand-green' : trend < 0 ? 'text-brand-red' : 'text-muted-foreground'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-2xl font-black text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    {sub && <div className="text-xs text-foreground/60 mt-1 font-medium">{sub}</div>}
  </div>
);

const AlertCard = ({ alert }: any) => {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    critico: { bg: 'hsl(var(--brand-red) / 0.1)', border: 'hsl(var(--brand-red) / 0.3)', icon: 'hsl(var(--brand-red))' },
    atencao: { bg: 'hsl(var(--brand-amber) / 0.1)', border: 'hsl(var(--brand-amber) / 0.3)', icon: 'hsl(var(--brand-amber))' },
    oportunidade: { bg: 'hsl(var(--brand-green) / 0.1)', border: 'hsl(var(--brand-green) / 0.3)', icon: 'hsl(var(--brand-green))' },
    info: { bg: 'hsl(var(--primary) / 0.1)', border: 'hsl(var(--primary) / 0.3)', icon: 'hsl(var(--primary))' },
  };
  const c = colors[alert.level];
  const Icon = alert.level === 'critico' ? AlertTriangle : alert.level === 'oportunidade' ? Zap : Activity;
  return (
    <div className={`rounded-lg p-3 border mb-2 transition-all hover:scale-[1.01] cursor-pointer`} style={{ backgroundColor: c.bg, borderColor: c.border }}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.icon }} />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground leading-tight">{alert.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</div>
          <div className="text-[10px] mt-1.5 font-medium" style={{ color: c.icon }}>
            💡 {alert.recommendation.substring(0, 80)}...
          </div>
        </div>
        {!alert.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
      </div>
    </div>
  );
};

export default function SalaDeGuerra() {
  const [mapView, setMapView] = useState<'operacional' | 'calor' | 'politico'>('calor');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const completionRate = Math.round((globalKPIs.completedActions / globalKPIs.totalActions) * 100);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Crosshair className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Sala de Guerra</h1>
            <p className="text-xs text-muted-foreground">Dashboard Executivo — Campanha Governador do Paraná 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-green/10 border border-brand-green/20">
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-xs font-semibold text-brand-green">AO VIVO</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* KPIs Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="Ações Planejadas" value={globalKPIs.totalActions} icon={Target} color="hsl(var(--primary))" />
          <KPICard label="Ações Realizadas" value={globalKPIs.completedActions} sub={`${completionRate}% de execução`} icon={CheckCircle} color="hsl(var(--brand-green))" trend={8} />
          <KPICard label="Ações Atrasadas" value={globalKPIs.delayedActions} icon={Clock} color="hsl(var(--brand-red))" trend={-3} />
          <KPICard label="Pessoas Impactadas" value={`${(globalKPIs.totalPeopleImpacted / 1000000).toFixed(2)}M`} icon={Users} color="hsl(var(--brand-cyan))" trend={12} />
          <KPICard label="Municípios Cobertos" value={`${globalKPIs.municipalitiesCovered}/399`} sub="72% do estado" icon={MapPin} color="hsl(var(--brand-amber))" />
          <KPICard label="Intenção de Voto" value={`${globalKPIs.currentPollScore}%`} sub={`Tendência ${globalKPIs.pollTrend}`} icon={TrendingUp} color="hsl(var(--brand-green))" trend={2} />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          {/* Map */}
          <div className="rounded-xl border border-border overflow-hidden" style={{ minHeight: 420 }}>
            {/* Map controls */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/50">
              <span className="text-sm font-semibold text-foreground">Mapa Interativo — Paraná</span>
              <div className="flex gap-1">
                {(['calor', 'operacional', 'politico'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setMapView(view)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${mapView === view ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                  >
                    {view === 'calor' ? 'Calor' : view === 'operacional' ? 'Operacional' : 'Político'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 380 }}>
              <MapContainer
                center={[-24.7, -51.5]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                />
                {municipalities.map((muni) => {
                  const color = mapView === 'calor'
                    ? getEngagementColor(muni.engagementScore)
                    : mapView === 'operacional'
                    ? (muni.actionsDelayed > 3 ? '#ef4444' : muni.actionsCompleted > 10 ? '#22c55e' : '#3b82f6')
                    : (muni.pollScore && muni.pollScore > 45 ? '#22c55e' : muni.pollScore && muni.pollScore > 40 ? '#f59e0b' : '#ef4444');
                  const radius = mapView === 'operacional' ? Math.max(10, muni.actionsPlanned * 0.55) : Math.max(14, muni.engagementScore * 0.22);
                  return (
                    <CircleMarker
                      key={muni.id}
                      center={[muni.lat, muni.lng]}
                      radius={radius}
                      fillColor={color}
                      color={color}
                      weight={2}
                      opacity={1}
                      fillOpacity={0.8}
                      eventHandlers={{ click: () => setSelectedMunicipality(muni.id) }}
                    >
                      <Tooltip permanent={false}>
                        <div style={{ color: '#1e293b', minWidth: 140 }}>
                          <strong>{muni.name}</strong><br />
                          Score: {muni.engagementScore}/100<br />
                          Ações: {muni.actionsCompleted}/{muni.actionsPlanned}<br />
                          {muni.pollScore && `Pesquisa: ${muni.pollScore}%`}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
            {/* Action pins */}
                {mapView === 'operacional' && actions.map((action) => (
                  <CircleMarker
                    key={action.id}
                    center={[action.lat, action.lng]}
                    radius={7}
                    fillColor={getStatusColor(action.status)}
                    color="#ffffff"
                    weight={2}
                    fillOpacity={0.95}
                  >
                    <Popup>
                      <div style={{ color: '#1e293b', minWidth: 180 }}>
                        <strong className="text-sm">{action.title}</strong><br />
                        <span className="text-xs">Status: {action.status}</span><br />
                        <span className="text-xs">📅 {action.plannedDate}</span><br />
                        <span className="text-xs">👤 {action.responsible}</span>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            {/* Legend */}
            <div className="px-4 py-2 border-t border-border bg-card/30 flex flex-wrap gap-3">
              {mapView === 'calor' && [
                { color: '#22c55e', label: 'Consolidado (81-100)' },
                { color: '#3b82f6', label: 'Competitivo (61-80)' },
                { color: '#f59e0b', label: 'Atenção (31-60)' },
                { color: '#ef4444', label: 'Risco (0-30)' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
              {mapView === 'operacional' && [
                { color: '#22c55e', label: 'Realizada' },
                { color: '#3b82f6', label: 'Prevista' },
                { color: '#f59e0b', label: 'Em Andamento' },
                { color: '#ef4444', label: 'Atrasada' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="rounded-xl border border-border" style={{ background: 'var(--gradient-card)' }}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-brand-amber" />
              <span className="text-sm font-semibold text-foreground">Alertas Estratégicos</span>
              <span className="ml-auto text-[10px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-full font-bold">
                {alerts.filter(a => !a.isRead).length} novos
              </span>
            </div>
            <div className="p-3 overflow-auto" style={{ maxHeight: 380 }}>
              {alerts.slice(0, 6).map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid lg:grid-cols-[1fr_1fr_300px] gap-4">
          {/* Poll Chart */}
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Evolução das Pesquisas</span>
              <span className="ml-auto text-xs text-brand-green font-semibold">+8.7pp desde Jan/24</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={pollTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 60]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="candidate" name="Candidato" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="rival1" name="Rival A" stroke="hsl(var(--brand-red))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="rival2" name="Rival B" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Macro Regions Ranking */}
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-brand-cyan" />
              <span className="text-sm font-semibold text-foreground">Ranking Macrorregiões</span>
            </div>
            <div className="space-y-2">
              {[...macroRegions].sort((a, b) => b.engagementScore - a.engagementScore).map((r, i) => {
                const color = getEngagementColor(r.engagementScore);
                const rate = Math.round((r.actionsCompleted / r.actionsPlanned) * 100);
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{r.name}</span>
                        <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>{r.engagementScore}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${r.engagementScore}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs flex-shrink-0">
                      {r.pollTrend === 'up' ? <TrendingUp className="w-3 h-3 text-brand-green" /> : r.pollTrend === 'down' ? <TrendingDown className="w-3 h-3 text-brand-red" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                      <span className="text-muted-foreground">{r.pollScore}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Actions */}
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-brand-green" />
              <span className="text-sm font-semibold text-foreground">Últimas Ações</span>
            </div>
            <div className="space-y-2">
              {actions.filter(a => a.status === 'realizada').slice(0, 5).map(action => (
                <div key={action.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-brand-green" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground leading-tight truncate">{action.title}</div>
                    <div className="text-[10px] text-muted-foreground">{action.municipality} · {action.executedPeopleCount?.toLocaleString()} impactados</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
