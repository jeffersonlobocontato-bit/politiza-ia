import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import { History, Loader2, TrendingUp, TrendingDown, Users, Search } from 'lucide-react';
import {
  useCandidatosHistoricos,
  useMunicipiosHistoricos,
  useCombinacoesDisponiveis,
} from '@/hooks/useHistoricoEleitoral';

const IGNORAR = new Set(['NULO', 'BRANCO', 'Nulo', 'Branco', '#NULO#', 'VOTO NULO', 'VOTO BRANCO']);
const CARGOS_COM_BUSCA = new Set([6, 7]); // Deputado Federal / Estadual

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
    [1, '#f5f8fc'],
    [5, '#e0eaf7'],
    [10, '#cfe0f5'],
    [20, '#9dc2ec'],
    [30, '#6aa3e0'],
    [40, '#3f7fcd'],
    [50, '#245da8'],
    [101, '#123a70'],
  ];
  for (const [limit, color] of stops) if (pct < limit) return color;
  return '#123a70';
}

const LEGEND = [
  { label: '0 – 1%', color: '#f5f8fc' },
  { label: '1 – 5%', color: '#e0eaf7' },
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
  const [busca, setBusca] = useState('');

  const { data: candidatosRaw, isLoading: loadingCand } = useCandidatosHistoricos(ano, turno, cargo);
  const { data: geo } = usePrGeoJson();

  const anos = useMemo(
    () => Array.from(new Set((combos ?? []).map(c => c.ano))).sort(),
    [combos],
  );
  const cargos = useMemo(() => {
    const map = new Map<number, string>();
    (combos ?? []).filter(c => c.ano === ano).forEach(c => map.set(c.cargo, c.label));
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([cd, label]) => ({ cd, label }));
  }, [combos, ano]);
  const turnos = useMemo(
    () =>
      Array.from(
        new Set((combos ?? []).filter(c => c.ano === ano && c.cargo === cargo).map(c => c.turno)),
      ).sort(),
    [combos, ano, cargo],
  );

  // Mantém o turno válido para o recorte atual
  useEffect(() => {
    if (turnos.length && !turnos.includes(turno)) setTurno(turnos[0]);
  }, [turnos, turno]);

  const candidatos = useMemo(
    () => (candidatosRaw ?? []).filter(c => !IGNORAR.has(c.nome.toUpperCase())),
    [candidatosRaw],
  );

  const mostrarBusca = CARGOS_COM_BUSCA.has(cargo);
  const candidatosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return candidatos;
    return candidatos.filter(
      c => c.nome.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q),
    );
  }, [candidatos, busca]);

  const selecionado = candidato ?? candidatos[0]?.nome ?? null;
  const infoSelecionado = candidatos.find(c => c.nome === selecionado);

  const { data: municipios, isLoading: loadingMun } = useMunicipiosHistoricos(
    ano,
    turno,
    cargo,
    selecionado,
  );

  const porMunicipio = useMemo(() => {
    const map = new Map<string, { votos: number; pct: number; nome: string }>();
    (municipios ?? []).forEach(m =>
      map.set(m.codigoIbge, { votos: m.votos, pct: m.pct, nome: m.nome }),
    );
    return map;
  }, [municipios]);

  const ranking = useMemo(
    () => [...(municipios ?? [])].sort((a, b) => b.pct - a.pct),
    [municipios],
  );

  const totalVotos = infoSelecionado?.votos ?? 0;
  const pctEstadual = infoSelecionado?.pct ?? 0;

  const trocarRecorte = (fn: () => void) => {
    fn();
    setCandidato(null);
    setBusca('');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Histórico Eleitoral</h1>
          <p className="text-xs text-muted-foreground">
            Presidente, Governador, Senador e Deputados no Paraná — resultados oficiais do TSE por município
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
            onChange={e => trocarRecorte(() => setAno(Number(e.target.value)))}
          >
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cargo</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={cargo}
            onChange={e => trocarRecorte(() => setCargo(Number(e.target.value)))}
          >
            {cargos.map(c => <option key={c.cd} value={c.cd}>{c.label}</option>)}
          </select>
        </div>
        {turnos.length > 1 && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Turno</label>
            <select
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
              value={turno}
              onChange={e => trocarRecorte(() => setTurno(Number(e.target.value)))}
            >
              {turnos.map(t => <option key={t} value={t}>{t}º turno</option>)}
            </select>
          </div>
        )}
        {mostrarBusca && (
          <div className="min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Buscar candidato</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground"
                placeholder="Sobrenome ou partido"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Candidato {candidatos.length > 0 && <span className="normal-case">({candidatos.length} neste recorte)</span>}
          </label>
          <select
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={selecionado ?? ''}
            onChange={e => setCandidato(e.target.value)}
          >
            {candidatosFiltrados.map(c => (
              <option key={c.nome} value={c.nome}>
                {c.nome} ({c.partido}) — {c.pct.toFixed(2)}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingCand ? (
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
                <p className="text-lg font-bold text-foreground">{pctEstadual.toFixed(2)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Municípios</p>
                <p className="text-lg font-bold text-foreground">{porMunicipio.size}</p>
              </div>
            </div>

            <div className="relative h-[520px] rounded-xl overflow-hidden border border-border">
              {loadingMun && (
                <div className="absolute inset-0 z-[500] bg-background/60 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculando mapa...
                </div>
              )}
              <MapContainer center={[-24.7, -51.5]} zoom={7} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                  opacity={0.35}
                />
                {geo && (
                  <GeoJSON
                    key={`${ano}-${turno}-${cargo}-${selecionado}-${porMunicipio.size}`}
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
                          info ? `${fmt(info.votos)} votos — ${info.pct.toFixed(2)}%` : 'Sem dados'
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
                {candidatosFiltrados.slice(0, 200).map((c, i) => (
                  <button
                    key={c.nome}
                    onClick={() => setCandidato(c.nome)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                      c.nome === selecionado ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate">{i + 1}. {c.nome} <span className="text-muted-foreground">({c.partido})</span></span>
                    <span className="flex-shrink-0">{c.pct.toFixed(2)}%</span>
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
                  <div key={m.codigoIbge} className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-foreground">{m.nome}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {m.pct.toFixed(2)}% · {fmt(m.votos)}
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
                  <div key={m.codigoIbge} className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-foreground">{m.nome}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {m.pct.toFixed(2)}% · {fmt(m.votos)}
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
