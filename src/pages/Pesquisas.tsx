import { useState, useMemo } from 'react';
import { BarChart2, Upload, BookOpen, Search, TrendingUp, GitCompare, FileText, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { CandidateBarChart } from '@/components/polls/CandidateBarChart';
import { CrossTabTable } from '@/components/polls/CrossTabTable';
import {
  pollWaves, pollQuestions, pollComparativos,
  PollWave, Cargo, FilterType, CANDIDATE_COLORS,
} from '@/data/pollsData';

// ─── helpers ─────────────────────────────────────────────────
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'genero', label: 'Gênero' },
  { value: 'faixa_etaria', label: 'Faixa Etária' },
  { value: 'escolaridade', label: 'Escolaridade' },
  { value: 'renda', label: 'Nível Econômico' },
  { value: 'religiosidade', label: 'Religiosidade' },
];

function WaveCard({ wave }: { wave: PollWave }) {
  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-3" style={{ background: 'var(--gradient-card)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-primary">{wave.institute}</div>
          <div className="text-sm font-semibold text-foreground mt-0.5">{wave.territory}</div>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">{wave.releaseDate}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
        <div>
          <div className="text-[10px] text-muted-foreground">Amostra</div>
          <div className="text-sm font-bold">{wave.sampleSize.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Margem</div>
          <div className="text-sm font-bold">±{wave.marginOfError}pp</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Cargos</div>
          <div className="text-sm font-bold capitalize">{wave.cargos.map(c => c === 'governador' ? 'Gov' : 'Sen').join(', ')}</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
        TSE: {wave.tseRegistration}
      </div>
      <div className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
        {wave.methodology}
      </div>
    </div>
  );
}

// ─── Tab: Biblioteca ─────────────────────────────────────────
function TabBiblioteca() {
  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 flex flex-col items-center gap-3 cursor-pointer"
        style={{ background: 'var(--gradient-card)' }}
        onClick={() => {}}
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold">Importar PDF de Pesquisa</div>
          <div className="text-xs text-muted-foreground mt-1">
            Arraste o arquivo ou clique para selecionar — padrão Paraná Pesquisas / tabulação
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground border border-border rounded px-2 py-1">
          Formatos suportados: Relatório completo · Tabulação cruzada
        </div>
      </div>

      {/* Wave cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pollWaves.map(w => <WaveCard key={w.id} wave={w} />)}
      </div>
    </div>
  );
}

// ─── Tab: Analisar ───────────────────────────────────────────
function TabAnalisar() {
  const [selectedWave, setSelectedWave] = useState(pollWaves[0]?.id ?? '');
  const [cargo, setCargo] = useState<Cargo>('governador');
  const [activeFilter, setActiveFilter] = useState<FilterType>('genero');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    espontanea: true, estimulada: true, rejeicao: false, aprovacao: false,
  });

  const wave = pollWaves.find(w => w.id === selectedWave);

  const questions = useMemo(() =>
    pollQuestions.filter(q => q.waveId === selectedWave && q.cargo === cargo),
    [selectedWave, cargo],
  );

  const estimuladas = questions.filter(q => q.questionType === 'estimulada');
  const [activeScenario, setActiveScenario] = useState(estimuladas[0]?.id ?? '');
  const currentEstimulada = estimuladas.find(q => q.id === activeScenario) ?? estimuladas[0];

  const espontanea = questions.find(q => q.questionType === 'espontanea');
  const rejeicao   = questions.find(q => q.questionType === 'rejeicao');

  const comparativos = pollComparativos.filter(c => c.waveId === selectedWave && c.cargo === cargo);
  const aprovacao = comparativos.find(c => c.questionType === 'aprovacao');

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <Select value={selectedWave} onValueChange={setSelectedWave}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione a pesquisa" />
            </SelectTrigger>
            <SelectContent>
              {pollWaves.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.institute} · {w.releaseDate} · {w.territory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['governador', 'senador'] as Cargo[]).map(c => (
            <button
              key={c}
              onClick={() => setCargo(c)}
              className={`px-4 py-2 capitalize font-medium transition-colors ${
                cargo === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {wave && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {wave.sampleSize.toLocaleString()} entrevistados · {wave.collectionStart} a {wave.collectionEnd} · Margem ±{wave.marginOfError}pp · {wave.methodology.slice(0, 80)}…
        </div>
      )}

      {/* ── ESPONTÂNEA ── */}
      {espontanea && (
        <Collapsible open={openSections.espontanea} onOpenChange={() => toggleSection('espontanea')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors" style={{ background: 'var(--gradient-card)' }}>
            <span className="flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Espontânea</span>
            {openSections.espontanea ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <div className="text-xs text-muted-foreground mb-3">BASE: {wave?.sampleSize.toLocaleString()} eleitores</div>
              <CandidateBarChart results={espontanea.results} height={280} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── ESTIMULADA ── */}
      {estimuladas.length > 0 && (
        <Collapsible open={openSections.estimulada} onOpenChange={() => toggleSection('estimulada')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors" style={{ background: 'var(--gradient-card)' }}>
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Estimulada</span>
            {openSections.estimulada ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border p-4 space-y-4" style={{ background: 'var(--gradient-card)' }}>
              {/* Scenario tabs */}
              <div className="flex gap-2 flex-wrap">
                {estimuladas.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setActiveScenario(q.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      activeScenario === q.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {q.scenarioLabel}
                  </button>
                ))}
              </div>

              {currentEstimulada && (
                <>
                  {currentEstimulada.note && (
                    <div className="text-[10px] text-muted-foreground italic">{currentEstimulada.note}</div>
                  )}
                  <CandidateBarChart results={currentEstimulada.results} hideNeutral height={260} />

                  {/* CrossTab filter */}
                  {currentEstimulada.crossTabs.length > 0 && (
                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground">Tabulação por:</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {FILTER_OPTIONS.map(f => {
                            const hasCrossTab = currentEstimulada.crossTabs.some(ct => ct.filterType === f.value);
                            if (!hasCrossTab) return null;
                            return (
                              <button
                                key={f.value}
                                onClick={() => setActiveFilter(f.value)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                                  activeFilter === f.value
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {currentEstimulada.crossTabs
                        .filter(ct => ct.filterType === activeFilter)
                        .map((ct, i) => <CrossTabTable key={i} crossTab={ct} />)
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── REJEIÇÃO ── */}
      {rejeicao && (
        <Collapsible open={openSections.rejeicao} onOpenChange={() => toggleSection('rejeicao')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors" style={{ background: 'var(--gradient-card)' }}>
            <span className="flex items-center gap-2">
              <X className="w-4 h-4 text-brand-red" /> Rejeição
              {rejeicao.note && <span className="text-[10px] font-normal text-muted-foreground">{rejeicao.note}</span>}
            </span>
            {openSections.rejeicao ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border p-4 space-y-4" style={{ background: 'var(--gradient-card)' }}>
              <CandidateBarChart results={rejeicao.results} hideNeutral height={240} />

              {rejeicao.crossTabs.length > 0 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">Tabulação por:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {FILTER_OPTIONS.map(f => {
                        const has = rejeicao.crossTabs.some(ct => ct.filterType === f.value);
                        if (!has) return null;
                        return (
                          <button
                            key={f.value}
                            onClick={() => setActiveFilter(f.value)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                              activeFilter === f.value
                                ? 'bg-brand-red/10 border-brand-red text-brand-red'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {rejeicao.crossTabs
                    .filter(ct => ct.filterType === activeFilter)
                    .map((ct, i) => <CrossTabTable key={i} crossTab={ct} />)
                  }
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── APROVAÇÃO (comparativo) ── */}
      {aprovacao && (
        <Collapsible open={openSections.aprovacao} onOpenChange={() => toggleSection('aprovacao')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors" style={{ background: 'var(--gradient-card)' }}>
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-green" /> Avaliação / Aprovação — Comparativo</span>
            {openSections.aprovacao ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border p-4 space-y-4" style={{ background: 'var(--gradient-card)' }}>
              <div className="text-xs text-muted-foreground">Ratinho Junior — Evolução da avaliação da administração estadual</div>

              {/* Approve/Disapprove line */}
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={aprovacao.rows.map(r => ({ wave: r.wave, ...r.values }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="wave" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: any) => [`${v}%`]} />
                  <Legend />
                  <Line type="monotone" dataKey="Aprova" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Desaprova" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>

              {/* Detailed evaluation lines */}
              <div className="border-t border-border pt-4">
                <div className="text-xs font-semibold text-muted-foreground mb-3">Avaliação Detalhada</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={aprovacao.rows.map(r => ({ wave: r.wave, ...r.values }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="wave" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 50]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: any) => [`${v}%`]} />
                    <Legend />
                    <Line type="monotone" dataKey="Ótima" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Boa" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Regular" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2.5 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Ruim" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2.5 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Péssima" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2.5 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ─── Tab: Cruzar ─────────────────────────────────────────────
function TabCruzar() {
  const [selectedWaves, setSelectedWaves] = useState<string[]>([pollWaves[0]?.id ?? '']);
  const [metricType, setMetricType] = useState<'estimulada' | 'rejeicao'>('estimulada');
  const [targetCargo, setTargetCargo] = useState<Cargo>('governador');
  const [targetCandidate, setTargetCandidate] = useState('Sergio Moro');

  const toggleWave = (id: string) => {
    setSelectedWaves(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };

  // Candidates available across selected waves and cargo
  const availableCandidates = useMemo(() => {
    const set = new Set<string>();
    pollQuestions
      .filter(q => selectedWaves.includes(q.waveId) && q.cargo === targetCargo && q.questionType === metricType)
      .forEach(q => q.results.forEach(r => {
        if (!['Não sabe/ Não opinou', 'Nenhum/ Branco/ Nulo', 'Ninguém/ Branco/ Nulo', 'Poderia votar em todos'].includes(r.candidate)) {
          set.add(r.candidate);
        }
      }));
    return [...set];
  }, [selectedWaves, targetCargo, metricType]);

  // Build chart data — one point per wave per scenario
  const chartData = useMemo(() => {
    const points: { label: string; value: number; wave: string; scenario: string }[] = [];
    pollQuestions
      .filter(q =>
        selectedWaves.includes(q.waveId) &&
        q.cargo === targetCargo &&
        q.questionType === metricType,
      )
      .forEach(q => {
        const wave = pollWaves.find(w => w.id === q.waveId);
        const result = q.results.find(r => r.candidate === targetCandidate);
        if (result) {
          points.push({
            label: `${wave?.releaseDate ?? q.waveId} — ${q.scenarioLabel}`,
            wave: wave?.releaseDate ?? q.waveId,
            scenario: q.scenarioLabel,
            value: result.percentage,
          });
        }
      });
    return points;
  }, [selectedWaves, targetCargo, metricType, targetCandidate]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-xl border border-border p-4 space-y-4" style={{ background: 'var(--gradient-card)' }}>
        <div className="text-sm font-semibold flex items-center gap-2"><GitCompare className="w-4 h-4 text-primary" /> Configurar Cruzamento</div>

        {/* Wave multi-select */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">Pesquisas (máx. 4):</div>
          <div className="flex flex-wrap gap-2">
            {pollWaves.map(w => (
              <button
                key={w.id}
                onClick={() => toggleWave(w.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedWaves.includes(w.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {w.institute} · {w.releaseDate}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {/* Cargo */}
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Cargo:</div>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {(['governador', 'senador'] as Cargo[]).map(c => (
                <button
                  key={c}
                  onClick={() => setTargetCargo(c)}
                  className={`flex-1 py-1.5 capitalize font-medium transition-colors text-xs ${
                    targetCargo === c ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Metric */}
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Métrica:</div>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {[{ v: 'estimulada', l: 'Estimulada' }, { v: 'rejeicao', l: 'Rejeição' }].map(m => (
                <button
                  key={m.v}
                  onClick={() => setMetricType(m.v as any)}
                  className={`flex-1 py-1.5 font-medium transition-colors ${
                    metricType === m.v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          {/* Candidate */}
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Candidato(a):</div>
            <Select value={targetCandidate} onValueChange={setTargetCandidate}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCandidates.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CANDIDATE_COLORS[targetCandidate] ?? 'hsl(var(--primary))' }} />
            <span className="text-sm font-semibold">{targetCandidate}</span>
            <span className="text-xs text-muted-foreground">· {metricType === 'estimulada' ? 'Intenção Estimulada' : 'Rejeição'} · {targetCargo}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ left: 0, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis domain={[0, 60]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(v: any) => [`${v}%`, targetCandidate]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CANDIDATE_COLORS[targetCandidate] ?? 'hsl(var(--primary))'}
                strokeWidth={3}
                dot={{ r: 5, fill: CANDIDATE_COLORS[targetCandidate] ?? 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Delta table */}
          {chartData.length > 1 && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="text-xs font-semibold text-muted-foreground mb-3">Variação entre cenários</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 px-2 text-left text-muted-foreground">Onda / Cenário</th>
                      <th className="py-1.5 px-2 text-right text-muted-foreground">Valor</th>
                      <th className="py-1.5 px-2 text-right text-muted-foreground">Δ anterior</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => {
                      const delta = i > 0 ? row.value - chartData[i - 1].value : null;
                      return (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-1.5 px-2">{row.label}</td>
                          <td className="py-1.5 px-2 text-right font-semibold">{row.value}%</td>
                          <td className={`py-1.5 px-2 text-right font-bold ${delta === null ? '' : delta > 0 ? 'text-brand-green' : delta < 0 ? 'text-brand-red' : 'text-muted-foreground'}`}>
                            {delta === null ? '—' : delta > 0 ? `+${delta.toFixed(1)}pp` : `${delta.toFixed(1)}pp`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border p-8 flex flex-col items-center gap-3 text-center" style={{ background: 'var(--gradient-card)' }}>
          <GitCompare className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground">Selecione ao menos uma pesquisa e um candidato com dados disponíveis para o cargo e métrica escolhidos.</div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function Pesquisas() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <BarChart2 className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold">Pesquisas Eleitorais</h1>
          <p className="text-xs text-muted-foreground">{pollWaves.length} pesquisa{pollWaves.length !== 1 ? 's' : ''} registrada{pollWaves.length !== 1 ? 's' : ''} · Paraná 2026</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="biblioteca" className="h-full flex flex-col">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="biblioteca" className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Biblioteca
              </TabsTrigger>
              <TabsTrigger value="analisar" className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Analisar
              </TabsTrigger>
              <TabsTrigger value="cruzar" className="flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5" />
                Cruzar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="biblioteca" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
            <TabBiblioteca />
          </TabsContent>
          <TabsContent value="analisar" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
            <TabAnalisar />
          </TabsContent>
          <TabsContent value="cruzar" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
            <TabCruzar />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
