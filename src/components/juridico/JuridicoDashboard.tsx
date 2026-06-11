import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldAlert, AlertTriangle, FileCheck2, Archive, MapPinned, UserCheck, Clock,
  Maximize2, Minimize2, ChevronDown, ChevronUp,
} from 'lucide-react';

function InvalidateOnResize({ trigger }: { trigger: any }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

type Status = 'nova' | 'em_analise' | 'protocolada' | 'arquivada';

interface ReportLite {
  id: string;
  title: string;
  status: Status;
  severity: string;
  municipality: string | null;
  lat: number | null;
  lng: number | null;
  assigned_lawyer_id: string | null;
  created_at: string;
  ai_risk_score: number | null;
}

const SEV_COLOR: Record<string, string> = {
  critica: '#ef4444',
  alta: '#f97316',
  media: '#f59e0b',
  baixa: '#10b981',
};

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 0 0 2px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.35);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const PR_CENTER: [number, number] = [-24.6, -51.4];

export function JuridicoDashboard({
  reports, onPick,
}: { reports: ReportLite[]; onPick: (id: string) => void }) {
  const kpis = useMemo(() => {
    const total = reports.length;
    const novas = reports.filter(r => r.status === 'nova').length;
    const emAnalise = reports.filter(r => r.status === 'em_analise').length;
    const protocoladas = reports.filter(r => r.status === 'protocolada').length;
    const arquivadas = reports.filter(r => r.status === 'arquivada').length;
    const criticas = reports.filter(r => r.severity === 'critica' || r.severity === 'alta').length;
    const semResp = reports.filter(r => !r.assigned_lawyer_id && r.status !== 'arquivada').length;
    const geocod = reports.filter(r => r.lat != null && r.lng != null).length;
    return { total, novas, emAnalise, protocoladas, arquivadas, criticas, semResp, geocod };
  }, [reports]);

  const pinned = reports.filter(r => r.lat != null && r.lng != null);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Lock body scroll when fullscreen
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  // Hotspot: aggregate by municipality
  const hotspots = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach(r => {
      if (!r.municipality) return;
      map.set(r.municipality, (map.get(r.municipality) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [reports]);

  return (
    <div className="border-b border-border bg-muted/20 p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Kpi icon={ShieldAlert} label="Total" value={kpis.total} tone="primary" />
        <Kpi icon={AlertTriangle} label="Novas" value={kpis.novas} tone="destructive" />
        <Kpi icon={Clock} label="Em análise" value={kpis.emAnalise} tone="amber" />
        <Kpi icon={FileCheck2} label="Protocoladas" value={kpis.protocoladas} tone="primary" />
        <Kpi icon={Archive} label="Arquivadas" value={kpis.arquivadas} tone="muted" />
        <Kpi icon={ShieldAlert} label="Alta/Crítica" value={kpis.criticas} tone="destructive" />
        <Kpi icon={UserCheck} label="Sem responsável" value={kpis.semResp} tone="amber" />
      </div>

      {/* Mapa + hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden" style={{ height: 320 }}>
          <MapContainer center={PR_CENTER} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {pinned.map(r => (
              <Marker
                key={r.id}
                position={[r.lat!, r.lng!]}
                icon={pinIcon(SEV_COLOR[r.severity] ?? '#94a3b8')}
                eventHandlers={{ click: () => onPick(r.id) }}
              >
                <Tooltip direction="top">
                  <div className="text-xs">
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-muted-foreground">{r.municipality ?? '—'} · {r.severity}</div>
                    <div className="text-[10px] italic">clique para abrir</div>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPinned className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Hotspots</h3>
          </div>
          {hotspots.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-4 text-center">Sem dados</p>
          ) : (
            <ul className="space-y-1.5">
              {hotspots.map(([city, n]) => (
                <li key={city} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate">{city}</span>
                  <span className="font-bold text-destructive">{n}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
            {kpis.geocod} de {kpis.total} denúncias com geolocalização
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number; tone: 'primary' | 'destructive' | 'amber' | 'muted' }) {
  const toneCls = {
    primary: 'text-primary border-primary/30 bg-primary/5',
    destructive: 'text-destructive border-destructive/30 bg-destructive/5',
    amber: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
    muted: 'text-muted-foreground border-border bg-muted/30',
  }[tone];
  return (
    <div className={`rounded-xl border ${toneCls} p-3 flex items-center gap-3`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
