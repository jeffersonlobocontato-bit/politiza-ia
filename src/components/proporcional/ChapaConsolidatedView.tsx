import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  UsersRound, ArrowRight, TrendingUp, CheckCircle2, AlertCircle, ExternalLink,
  MapPin, Users, Sparkles, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { useChapaCrossAnalytics, SCENARIO_LABEL, type Scenario, slateVote } from '@/hooks/useChapaCrossAnalytics';
import type { SlateParty, SlateCargo, SlateCandidate } from '@/hooks/usePartySlate';

// Quociente eleitoral aproximado para o PR (valores históricos por cargo).
// Pode ser ajustado em configuração futura, por ora serve como gauge.
const QE_PR: Record<SlateCargo, number> = {
  'Deputado Federal': 230_000,
  'Deputado Estadual': 75_000,
};

const PARTY_META: Record<SlateParty, { label: string; tagline: string; color: string; accent: string }> = {
  PL:   { label: 'PL — Partido Liberal', tagline: 'Chapa proporcional do PL no Paraná',  color: 'from-blue-600/30 to-blue-900/10',     accent: '#1F5AB4' },
  Novo: { label: 'Novo',                 tagline: 'Chapa proporcional do Partido Novo',  color: 'from-orange-500/30 to-orange-900/10', accent: '#F97316' },
};

const CARGOS: SlateCargo[] = ['Deputado Federal', 'Deputado Estadual'];

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

interface Props {
  parties: SlateParty[];
  /** Quando o usuário clica num pré-candidato, opcionalmente abre a aba de drill-down. */
  onOpenPreCandidate?: (slate: SlateCandidate) => void;
}

export default function ChapaConsolidatedView({ parties, onOpenPreCandidate }: Props) {
  const [scenario, setScenario] = useState<Scenario>('medio');
  const [detail, setDetail] = useState<{ party: SlateParty; cargo: SlateCargo } | null>(null);
  const { rows, byParty, isLoading } = useChapaCrossAnalytics();

  const filteredRows = useMemo(
    () => rows.filter((r) => parties.includes(r.slate.party)),
    [rows, parties],
  );

  const totals = useMemo(() => {
    const t = {
      total: 0, fed: 0, est: 0,
      declaredFed: 0, declaredEst: 0,
      computedFed: 0, computedEst: 0,
      ok: 0, pendente: 0,
      leaderIds: new Set<string>(),
      municipalities: new Set<string>(),
      linked: 0, unlinked: 0,
    };
    for (const r of filteredRows) {
      t.total++;
      const isFed = r.slate.cargo === 'Deputado Federal';
      if (isFed) t.fed++; else t.est++;
      const declared = slateVote(r.slate, scenario);
      const computed = r.computed[scenario];
      if (isFed) { t.declaredFed += declared; t.computedFed += computed; }
      else { t.declaredEst += declared; t.computedEst += computed; }
      if (r.slate.filiacao_status === 'ok') t.ok++;
      if (r.slate.filiacao_status === 'pendente') t.pendente++;
      if (r.candidateId) t.linked++; else t.unlinked++;
    }
    // dedupe leaders/municipalities across party_slate rows would need projection-level data
    return t;
  }, [filteredRows, scenario]);

  const projFed = totals.declaredFed;
  const projEst = totals.declaredEst;
  const computedFed = totals.computedFed;
  const computedEst = totals.computedEst;

  // Estimativa de cadeiras (gauge) — declared scenario / QE.
  const seatsFed = projFed / QE_PR['Deputado Federal'];
  const seatsEst = projEst / QE_PR['Deputado Estadual'];

  // Ranking de pré-cands consolidado
  const rankingData = useMemo(() => {
    return [...filteredRows]
      .map((r) => ({
        name: r.slate.name.split(' ').slice(0, 2).join(' '),
        cargo: r.slate.cargo,
        party: r.slate.party,
        Declarado: slateVote(r.slate, scenario),
        Sustentado: r.computed[scenario],
        accent: PARTY_META[r.slate.party].accent,
      }))
      .filter((r) => r.Declarado > 0 || r.Sustentado > 0)
      .sort((a, b) => b.Declarado - a.Declarado)
      .slice(0, 15);
  }, [filteredRows, scenario]);

  // Filiação × Projeção (scatter feito como bar agrupado por status)
  const filiacaoData = useMemo(() => {
    const groups: Record<string, { status: string; total: number; pre: number }> = {};
    for (const r of filteredRows) {
      const k = r.slate.filiacao_status;
      if (!groups[k]) groups[k] = { status: k, total: 0, pre: 0 };
      groups[k].total += slateVote(r.slate, scenario);
      groups[k].pre++;
    }
    return Object.values(groups);
  }, [filteredRows, scenario]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      {/* Seletor de cenário */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ScenarioSelector value={scenario} onChange={setScenario} />
        {totals.unlinked > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {totals.unlinked} pré-cand(s) sem vínculo automático com candidato — cruzamento por nome
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <BigNumber label="Pré-candidatos" value={totals.total} icon={UsersRound} accent="hsl(var(--primary))" />
        <BigNumber label="Dep. Federal" value={totals.fed} icon={UsersRound} accent="#1F5AB4" />
        <BigNumber label="Dep. Estadual" value={totals.est} icon={UsersRound} accent="#2FA85A" />
        <BigNumber label="Filiação OK" value={totals.ok} icon={CheckCircle2} accent="#22c55e" />
        <BigNumber label="Filiação Pendente" value={totals.pendente} icon={AlertCircle} accent="#f59e0b" />
        <BigNumber
          label="Prontidão da chapa"
          value={`${totals.total ? Math.round((totals.ok / totals.total) * 100) : 0}%`}
          icon={Target}
          accent="#0FFCBE"
        />
      </div>

      {/* Projeção Total + QE estimado */}
      <div className="grid gap-3 md:grid-cols-2">
        <ProjectionBigNumber
          title="Projeção — Dep. Federal"
          accent="#1F5AB4"
          value={projFed}
          computed={computedFed}
          seats={seatsFed}
          qe={QE_PR['Deputado Federal']}
          scenario={scenario}
        />
        <ProjectionBigNumber
          title="Projeção — Dep. Estadual"
          accent="#2FA85A"
          value={projEst}
          computed={computedEst}
          seats={seatsEst}
          qe={QE_PR['Deputado Estadual']}
          scenario={scenario}
        />
      </div>

      {/* Comparativo Declarado vs Sustentado */}
      <Card className="p-4 bg-card/80 border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Declarado vs Sustentado pela base ({SCENARIO_LABEL[scenario]})
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Declarado = cenário registrado no cadastro da chapa. Sustentado = soma das projeções das lideranças vinculadas.
            </p>
          </div>
        </div>
        {rankingData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados para o cenário selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, rankingData.length * 28)}>
            <BarChart data={rankingData} layout="vertical" margin={{ left: 90, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={85} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
                formatter={(v: number) => fmt(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Declarado" fill="#1F5AB4" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Sustentado" fill="#0FFCBE" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filiação x Projeção */}
      <Card className="p-4 bg-card/80 border-border/60">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Filiação × Projeção declarada ({SCENARIO_LABEL[scenario]})
        </h3>
        {filiacaoData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filiacaoData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
                formatter={(v: number) => fmt(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="total" name="Votos projetados" fill="#0FFCBE" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="pre" name="Pré-cands" fill="#1F5AB4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top 10 por partido e cargo */}
      <TopTenByPartyCargo rows={filteredRows} parties={parties} scenario={scenario} onOpen={onOpenPreCandidate} />

      {/* Cards por partido x cargo */}
      {parties.map((p) => {
        const meta = PARTY_META[p];
        return (
          <div key={p} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-5 rounded-sm" style={{ background: meta.accent }} />
              <h2 className="text-lg font-bold">{meta.label}</h2>
              <Link to={`/chapas/${p}`} className="ml-auto text-xs text-primary hover:underline inline-flex items-center gap-1">
                Gerenciar chapa <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {CARGOS.map((c) => {
                const rs = byParty[p].filter((r) => r.slate.cargo === c);
                const proj = rs.reduce((s, r) => s + slateVote(r.slate, scenario), 0);
                const computed = rs.reduce((s, r) => s + r.computed[scenario], 0);
                const ok = rs.filter((r) => r.slate.filiacao_status === 'ok').length;
                const pend = rs.filter((r) => r.slate.filiacao_status === 'pendente').length;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDetail({ party: p, cargo: c })}
                    className="text-left group"
                  >
                    <Card className={`relative overflow-hidden p-5 hover:border-primary/60 transition-all bg-gradient-to-br ${meta.color}`}>
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: meta.accent }} />
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p}</div>
                          <div className="text-base font-bold mt-0.5">{c}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black leading-none">{rs.length}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">pré-cands</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <MiniStat label={`Decl. (${SCENARIO_LABEL[scenario]})`} value={fmt(proj)} />
                        <MiniStat label="Sust. base" value={fmt(computed)} />
                        <MiniStat label="OK" value={ok} />
                        <MiniStat label="Pend." value={pend} />
                      </div>
                      <div className="mt-3 flex items-center text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        Ver detalhes <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <DetailSheet
        detail={detail}
        rows={filteredRows}
        scenario={scenario}
        onClose={() => setDetail(null)}
        onOpenPreCandidate={onOpenPreCandidate}
      />
    </div>
  );
}

function ScenarioSelector({ value, onChange }: { value: Scenario; onChange: (s: Scenario) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border/60 bg-background/40 p-0.5">
      {(['bom', 'medio', 'ruim'] as Scenario[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
            value === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {SCENARIO_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

function BigNumber({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: string }) {
  return (
    <div className="relative rounded-lg bg-card border border-border/60 p-4 overflow-hidden shadow-card">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="absolute top-3 right-3 opacity-25">
        <Icon className="w-8 h-8" style={{ color: accent }} />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function ProjectionBigNumber({
  title, accent, value, computed, seats, qe, scenario,
}: { title: string; accent: string; value: number; computed: number; seats: number; qe: number; scenario: Scenario }) {
  const gap = value - computed;
  return (
    <div className="relative rounded-lg bg-card border border-border/60 p-4 overflow-hidden shadow-card">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="absolute top-3 right-3 opacity-25">
        <TrendingUp className="w-8 h-8" style={{ color: accent }} />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {title} — cenário {SCENARIO_LABEL[scenario]}
      </p>
      <p className="text-2xl font-black leading-tight">{fmt(value)}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded bg-background/40 px-2 py-1">
          <div className="text-muted-foreground">Sustentado</div>
          <div className="font-bold text-sm">{fmt(computed)}</div>
        </div>
        <div className="rounded bg-background/40 px-2 py-1">
          <div className="text-muted-foreground">Gap</div>
          <div className={`font-bold text-sm ${gap > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {gap > 0 ? '+' : ''}{fmt(gap)}
          </div>
        </div>
        <div className="rounded bg-background/40 px-2 py-1">
          <div className="text-muted-foreground">Cadeiras est.</div>
          <div className="font-bold text-sm">{seats.toFixed(2)}</div>
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground mt-1.5">QE de referência: {fmt(qe)}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-background/50 border border-border/50 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function DetailSheet({
  detail, rows, scenario, onClose, onOpenPreCandidate,
}: {
  detail: { party: SlateParty; cargo: SlateCargo } | null;
  rows: ReturnType<typeof useChapaCrossAnalytics>['rows'];
  scenario: Scenario;
  onClose: () => void;
  onOpenPreCandidate?: (s: SlateCandidate) => void;
}) {
  const open = detail !== null;
  const list = detail
    ? rows
        .filter((r) => r.slate.party === detail.party && r.slate.cargo === detail.cargo)
        .sort((a, b) => slateVote(b.slate, scenario) - slateVote(a.slate, scenario))
    : [];
  const totalScenario = list.reduce((s, r) => s + slateVote(r.slate, scenario), 0);
  const totalComputed = list.reduce((s, r) => s + r.computed[scenario], 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.party} — {detail.cargo}</SheetTitle>
              <SheetDescription>
                {list.length} pré-cand(s) · Decl. ({SCENARIO_LABEL[scenario]}): {fmt(totalScenario)} · Sust.: {fmt(totalComputed)}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {list.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Nenhum pré-candidato.</div>
              ) : list.map((r) => {
                const declared = slateVote(r.slate, scenario);
                const computed = r.computed[scenario];
                return (
                  <button
                    key={r.slate.id}
                    onClick={() => { onOpenPreCandidate?.(r.slate); onClose(); }}
                    className="w-full text-left rounded-md border border-border/60 bg-card/50 p-3 hover:border-primary/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{r.slate.name}</div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {[r.slate.city, r.slate.association].filter(Boolean).join(' · ') || '—'}
                          {r.matchedByName && (
                            <Badge variant="outline" className="ml-1 text-[9px] py-0">match por nome</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{r.slate.filiacao_status}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
                      <div><span className="text-muted-foreground">Declarado:</span> <span className="font-semibold">{fmt(declared)}</span></div>
                      <div><span className="text-muted-foreground">Sustentado:</span> <span className="font-semibold">{fmt(computed)}</span></div>
                      <div className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" /> {r.leaderCount}</div>
                      <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" /> {r.municipalityCount}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TopTenByPartyCargo({
  rows, parties, scenario, onOpen,
}: {
  rows: ReturnType<typeof useChapaCrossAnalytics>['rows'];
  parties: SlateParty[];
  scenario: Scenario;
  onOpen?: (s: SlateCandidate) => void;
}) {
  const [party, setParty] = useState<SlateParty>(parties[0] ?? 'PL');

  const top = (cargo: SlateCargo) =>
    rows
      .filter((r) => r.slate.party === party && r.slate.cargo === cargo)
      .map((r) => ({
        slate: r.slate,
        declared: slateVote(r.slate, scenario),
        computed: r.computed[scenario],
      }))
      .sort((a, b) => b.declared - a.declared)
      .slice(0, 10);

  const topFed = top('Deputado Federal');
  const topEst = top('Deputado Estadual');

  return (
    <Card className="p-4 bg-card/80 border-border/60 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Top 10 por partido — {SCENARIO_LABEL[scenario]}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Ranking dos 10 pré-candidatos com maior projeção declarada, separado por cargo.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border/60 bg-background/40 p-0.5">
          {parties.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setParty(p)}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                party === p ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              style={party === p ? { background: `${PARTY_META[p].accent}25` } : {}}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <TopList title="Top 10 Deputado Federal" accent="#1F5AB4" items={topFed} onOpen={onOpen} />
        <TopList title="Top 10 Deputado Estadual" accent="#2FA85A" items={topEst} onOpen={onOpen} />
      </div>
    </Card>
  );
}

function TopList({
  title, accent, items, onOpen,
}: {
  title: string;
  accent: string;
  items: { slate: SlateCandidate; declared: number; computed: number }[];
  onOpen?: (s: SlateCandidate) => void;
}) {
  const max = items[0]?.declared || 1;
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
        <span className="inline-block w-1.5 h-4 rounded-sm" style={{ background: accent }} />
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{items.length} de 10</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Sem pré-candidatos.</p>
      ) : (
        <ol className="divide-y divide-border/40">
          {items.map((it, i) => (
            <li key={it.slate.id}>
              <button
                type="button"
                onClick={() => onOpen?.(it.slate)}
                className="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-xs font-black text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{it.slate.name}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: accent }}>{fmt(it.declared)}</span>
                </div>
                <div className="ml-7 mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(it.declared / max) * 100}%`, background: accent }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    sust. {fmt(it.computed)} · {it.slate.city || '—'}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
