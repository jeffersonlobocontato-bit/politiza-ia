import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import { History, Loader2, TrendingUp, TrendingDown, Users } from 'lucide-react';
import {
  useResultadosHistoricos,
  useCombinacoesDisponiveis,
  type ResultadoRow,
} from '@/hooks/useHistoricoEleitoral';

const IGNORAR = new Set(['Nulo', 'Branco', 'NULO', 'BRANCO']);

function usePrGeoJson() {
  return useQuery({
    queryKey: ['ibge-malha-pr-municipios'],
    queryFn: async () => {
      const r = await fetch(
        'https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio',
      );
      return await r.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

function colorForPct(pct: number | null): string {
  if (pct === null || isNaN(pct)) return 'hsl(220 12% 82%)';
  const stops: [number, string][] = [
    [5, '#eef2f7'],
    [10, '#cfe0f5'],
    [20, '#9dc2ec'],
    [30, '#6aa3e0'],
    [40, '#3f7fcd'],
    [50, '#245da8'],
    [100, '#123a70'],
  ];
  for (const [limit, color] of stops) if (pct < limit) return color;
  return '#123a70';
}

const LEGEND = [
  { label: '0 – 5%', color: '#eef2f7' },
  { label: '5 – 10%', color: '#cfe0f5' },
  { label: '10 – 20%', color: '#9dc2ec' },
  { label: '20 – 30%', color: '#6aa3e0' },
  { label: '30 – 40%', color: '#3f7fcd' },
  { label: '40 – 50%', color: '#245da8' },
  { label: '50%+', color: '#123a70' },
];

const fmt = (n: number) => n.toLocaleString('pt-BR');

export default function HistoricoEleitoral() {
  const { data: combos } = useCombinacoesDisponiveis();
  const [ano, setAno] = useState(2022);
  const [turno, setTurno] = useState(1);
  const [cargo, setCargo] = useState(3);
  const [candidato, setCandidato] = useState<string | null>(null);

  const { data: rows, isLoading } = useResultadosHistoricos(ano, turno, cargo);
  const { data: geo } = usePrGeoJson();

  const anos = useMemo(
    () => Array.from(new Set((combos ?? []).map(c => c.ano))).sort(),
    [combos],
  );
  const cargos = useMemo(() => {
    const map = new Map<number, string>();
    (combos ?? []).filter(c => c.ano === ano).forEach(c => map.set(c.cargo, c.label));
    return Array.from(map.entries()).map(([cd, label]) => ({ cd, label }));
  }, [combos, ano]);
  const turnos = useMemo(
    () =>
      Array.from(
        new Set((combos ?? []).filter(c => c.ano === ano && c.cargo === cargo).map(c => c.turno)),
      ).sort(),
    [combos, ano, cargo],
  );

  // Ranking estadual de candidatos do recorte atual
  const candidatos = useMemo(() => {
    const map = new Map<string, { nome: string; partido: string; votos: number }>();
    (rows ?? []).forEach((r: ResultadoRow) => {
      if (IGNORAR.has(r.nm_candidato)) return;
      const cur = map.get(r.nm_candidato) ?? {
        nome: r.nm_candidato,
        partido: r.sg_partido,
        votos: 0,
      };
      cur.votos += r.qt_votos;
      map.set(r.nm_candidato, cur);
    });
    const list = Array.from(map.values()).sort((a, b) => b.votos - a.votos);
    const total = list.reduce((s, c) => s + c.votos, 0);
    return list.map(c => ({ ...c, pct: total > 0 ? (c.votos / total) * 100 : 0 }));
  }, [rows]);

  const selecionado = candidato ?? candidatos[0]?.nome ?? null;

  // Mapa: código IBGE -> { votos, pct, nome }
  const porMunicipio = useMemo(() => {
    const map = new Map<string, { votos: number; pct: number; nome: string }>();
    if (!selecionado) return map;
    (rows ?? []).forEach((r: ResultadoRow) => {
      if (r.nm_candidato !== selecionado || !r.cd_municipio_ibge) return;
      map.set(String(r.cd_municipio_ibge), {
        votos: r.qt_votos,
        pct: r.pct_municipio ?? 0,
        nome: r.nm_municipio_ibge ?? '',
      });
    });
    return map;
  }, [rows, selecionado]);

  const ranking = useMemo(
    () =>
      Array.from(porMunicipio.values()).sort((a, b) => b.pct - a.pct),
    [porMunicipio],
  );

  const totalVotos = useMemo(
    () => Array.from(porMunicipio.values()).reduce((s, m) => s + m.votos, 0),
    [porMunicipio],
  );
  const pctEstadual = candidatos.find(c => c.nome === selecionado)?.pct ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Histórico Eleitoral</h1>
          <p className="text-xs text-muted-foreground">
            Governador e Senador no Paraná — resultados oficiais do TSE por município
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ano</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={ano}
            onChange={e => { setAno(Number(e.target.value)); setCandidato(null); }}
          >
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cargo</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={cargo}
            onChange={e => { setCargo(Number(e.target.value)); setCandidato(null); }}
          >
            {cargos.map(c => <option key={c.cd} value={c.cd}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Turno</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={turno}
            onChange={e => { setTurno(Number(e.target.value)); setCandidato(null); }}
          >
            {(turnos.length ? turnos : [1]).map(t => <option key={t} value={t}>{t}º turno</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Candidato</label>
          <select
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={selecionado ?? ''}
            onChange={e => setCandidato(e.target.value)}
          >
            {candidatos.map(c => (
              <option key={c.nome} value={c.nome}>
                {c.nome} ({c.partido}) — {c.pct.toFixed(1)}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando resultados...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Mapa */}
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Votos no estado</p>
                <p className="text-lg font-bold text-foreground">{fmt(totalVotos)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">% estadual</p>
                <p className="text-lg font-bold text-foreground">{pctEstadual.toFixed(1)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Municípios</p>
                <p className="text-lg font-bold text-foreground">{porMunicipio.size}</p>
              </div>
            </div>

            <div className="h-[520px] rounded-xl overflow-hidden border border-border">
              <MapContainer center={[-24.7, -51.5]} zoom={7} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                  opacity={0.35}
                />
                {geo && (
                  <GeoJSON
                    key={`${ano}-${turno}-${cargo}-${selecionado}`}
                    data={geo}
                    style={(f: any) => {
                      const info = porMunicipio.get(String(f?.properties?.codarea ?? ''));
                      return {
                        fillColor: colorForPct(info ? info.pct : null),
                        fillOpacity: 0.85,
                        color: '#ffffff',
                        weight: 0.6,
                      };
                    }}
                    onEachFeature={(feature: any, layer: any) => {
                      const code = String(feature?.properties?.codarea ?? '');
                      const info = porMunicipio.get(code);
                      layer.bindTooltip(
                        `<div style="font-size:11px"><strong>${info?.nome ?? code}</strong><br/>${
                          info
                            ? `${fmt(info.votos)} votos — ${info.pct.toFixed(1)}%`
                            : 'Sem dados'
                        }</div>`,
                        { sticky: true },
                      );
                    }}
                  />
                )}
              </MapContainer>
            </div>

            <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
              {LEGEND.map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm border border-border" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Painéis laterais */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Ranking estadual
              </p>
              <div className="space-y-1 max-h-64 overflow-auto pr-1">
                {candidatos.map((c, i) => (
                  <button
                    key={c.nome}
                    onClick={() => setCandidato(c.nome)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                      c.nome === selecionado ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate">{i + 1}. {c.nome} <span className="text-muted-foreground">({c.partido})</span></span>
                    <span className="flex-shrink-0">{c.pct.toFixed(1)}%</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Melhores municípios
              </p>
              <div className="space-y-1">
                {ranking.slice(0, 10).map(m => (
                  <div key={m.nome} className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-foreground">{m.nome}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {m.pct.toFixed(1)}% · {fmt(m.votos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Piores municípios
              </p>
              <div className="space-y-1">
                {ranking.slice(-10).reverse().map(m => (
                  <div key={m.nome} className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-foreground">{m.nome}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {m.pct.toFixed(1)}% · {fmt(m.votos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
