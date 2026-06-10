import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserParty } from '@/hooks/useUserParty';
import { useAllPartySlates, type SlateParty, type SlateCargo, type SlateCandidate } from '@/hooks/usePartySlate';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { UsersRound, ArrowRight, ShieldAlert, TrendingUp, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const PARTY_META: Record<SlateParty, { label: string; tagline: string; color: string; accent: string }> = {
  PL:   { label: 'PL — Partido Liberal', tagline: 'Chapa proporcional do PL no Paraná', color: 'from-blue-600/30 to-blue-900/10',   accent: '#1F5AB4' },
  Novo: { label: 'Novo',                 tagline: 'Chapa proporcional do Partido Novo', color: 'from-orange-500/30 to-orange-900/10', accent: '#F97316' },
};

const CARGOS: SlateCargo[] = ['Deputado Federal', 'Deputado Estadual'];

const fmt = (n: number) => n.toLocaleString('pt-BR');

export default function Chapas() {
  const { isAdmin } = useAuth();
  const { party: userParty, isPartyManager } = useUserParty();
  const { data: all = [], isLoading } = useAllPartySlates();

  const allowedParties: SlateParty[] = isAdmin
    ? ['PL', 'Novo']
    : isPartyManager && userParty
      ? [userParty]
      : [];

  if (!isAdmin && !isPartyManager) {
    return (
      <div className="p-8 max-w-2xl">
        <Card className="p-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <div className="font-semibold">Acesso restrito</div>
            <p className="text-sm text-muted-foreground mt-1">
              O módulo de Chapas é restrito a administradores da plataforma e gestores estaduais de partido.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Chapas Proporcionais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Base centralizada de pré-candidatos a Deputado Federal e Estadual por partido.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="resumo">Resumo por Partido</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <ChapasDashboard parties={allowedParties} rows={all} />
          )}
        </TabsContent>

        <TabsContent value="resumo" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {allowedParties.map((p) => {
                const rows = all.filter(r => r.party === p);
                const fed = rows.filter(r => r.cargo === 'Deputado Federal');
                const est = rows.filter(r => r.cargo === 'Deputado Estadual');
                const fedProj = fed.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
                const estProj = est.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
                const meta = PARTY_META[p];
                return (
                  <Link key={p} to={`/chapas/${p}`} className="group block">
                    <Card className={`relative overflow-hidden border-border p-6 hover:border-primary/60 transition-all bg-gradient-to-br ${meta.color}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Partido</div>
                          <div className="text-xl font-black mt-1">{meta.label}</div>
                          <p className="text-xs text-muted-foreground mt-1">{meta.tagline}</p>
                        </div>
                        <UsersRound className="w-6 h-6 text-primary/80" />
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <CargoStat label="Dep. Federal" count={fed.length} projection={fedProj} />
                        <CargoStat label="Dep. Estadual" count={est.length} projection={estProj} />
                      </div>
                      <div className="mt-5 flex items-center text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        Abrir chapa <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-background/60 border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function CargoStat({ label, count, projection }: { label: string; count: number; projection: number }) {
  return (
    <div className="rounded-md bg-background/60 border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <div className="text-xl font-black leading-none">{count}</div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">Proj. Bom</div>
          <div className="text-sm font-bold leading-tight">{fmt(projection)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard tab ──────────────────────────────────────────────────────────
type Detail = { party: SlateParty; cargo: SlateCargo } | null;
type Scenario = 'bom' | 'medio' | 'ruim';
const SCENARIO_LABEL: Record<Scenario, string> = { bom: 'Bom', medio: 'Médio', ruim: 'Ruim' };
const scenarioValue = (r: SlateCandidate, s: Scenario) =>
  s === 'bom' ? (r.votes_bom ?? 0) : s === 'medio' ? (r.votes_medio ?? 0) : (r.votes_ruim ?? 0);

function ChapasDashboard({ parties, rows }: { parties: SlateParty[]; rows: SlateCandidate[] }) {
  const [detail, setDetail] = useState<Detail>(null);
  const [scenario, setScenario] = useState<Scenario>('medio');

  const totals = useMemo(() => {
    const grand = {
      total: 0, fed: 0, est: 0,
      bomFed: 0, medioFed: 0, ruimFed: 0,
      bomEst: 0, medioEst: 0, ruimEst: 0,
      ok: 0, pendente: 0,
    };
    for (const p of parties) {
      const rs = rows.filter(r => r.party === p);
      grand.total += rs.length;
      const fed = rs.filter(r => r.cargo === 'Deputado Federal');
      const est = rs.filter(r => r.cargo === 'Deputado Estadual');
      grand.fed += fed.length;
      grand.est += est.length;
      grand.bomFed   += fed.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
      grand.medioFed += fed.reduce((s, r) => s + (r.votes_medio ?? 0), 0);
      grand.ruimFed  += fed.reduce((s, r) => s + (r.votes_ruim ?? 0), 0);
      grand.bomEst   += est.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
      grand.medioEst += est.reduce((s, r) => s + (r.votes_medio ?? 0), 0);
      grand.ruimEst  += est.reduce((s, r) => s + (r.votes_ruim ?? 0), 0);
      grand.ok += rs.filter(r => r.filiacao_status === 'ok').length;
      grand.pendente += rs.filter(r => r.filiacao_status === 'pendente').length;
    }
    return grand;
  }, [parties, rows]);

  const projFed = scenario === 'bom' ? totals.bomFed : scenario === 'medio' ? totals.medioFed : totals.ruimFed;
  const projEst = scenario === 'bom' ? totals.bomEst : scenario === 'medio' ? totals.medioEst : totals.ruimEst;

  return (
    <div className="space-y-6">
      {/* Big numbers consolidados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <BigNumber label="Pré-candidatos" value={totals.total} icon={UsersRound} accent="hsl(var(--primary))" />
        <BigNumber label="Dep. Federal" value={totals.fed} icon={UsersRound} accent="#1F5AB4" />
        <BigNumber label="Dep. Estadual" value={totals.est} icon={UsersRound} accent="#2FA85A" />
        <BigNumber label="Filiação OK" value={totals.ok} icon={CheckCircle2} accent="#22c55e" />
        <BigNumber label="Filiação Pendente" value={totals.pendente} icon={AlertCircle} accent="#f59e0b" />
      </div>

      {/* Projeções separadas por cargo */}
      <div className="grid gap-3 md:grid-cols-2">
        <ProjectionBigNumber
          title="Projeção — Dep. Federal"
          accent="#1F5AB4"
          scenario={scenario}
          onScenarioChange={setScenario}
          value={projFed}
        />
        <ProjectionBigNumber
          title="Projeção — Dep. Estadual"
          accent="#2FA85A"
          scenario={scenario}
          onScenarioChange={setScenario}
          value={projEst}
        />
      </div>

      {/* Cards segmentados por partido x cargo */}
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
                const rs = rows.filter(r => r.party === p && r.cargo === c);
                const proj = rs.reduce((s, r) => s + scenarioValue(r, scenario), 0);
                const ok = rs.filter(r => r.filiacao_status === 'ok').length;
                const pend = rs.filter(r => r.filiacao_status === 'pendente').length;
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
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MiniStat label={`Proj. (${SCENARIO_LABEL[scenario]})`} value={fmt(proj)} />
                        <MiniStat label="Filiação OK" value={ok} />
                        <MiniStat label="Pendentes" value={pend} />
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

      <DetailSheet detail={detail} rows={rows} scenario={scenario} onClose={() => setDetail(null)} />
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
  scenario, onScenarioChange, value, title = 'Projeção de Votos', accent = '#0FFCBE',
}: { scenario: Scenario; onScenarioChange: (s: Scenario) => void; value: number; title?: string; accent?: string }) {
  return (
    <div className="relative rounded-lg bg-card border border-border/60 p-4 overflow-hidden shadow-card">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="absolute top-3 right-3 opacity-25">
        <TrendingUp className="w-8 h-8" style={{ color: accent }} />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-black leading-tight">{fmt(value)}</p>
      <div className="mt-2 inline-flex rounded-md border border-border/60 bg-background/40 p-0.5">
        {(['bom', 'medio', 'ruim'] as Scenario[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={(e) => { e.stopPropagation(); onScenarioChange(s); }}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              scenario === s
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {SCENARIO_LABEL[s]}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1.5">
        Soma do cenário {SCENARIO_LABEL[scenario]} entre os pré-cands exibidos
      </p>
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

function DetailSheet({ detail, rows, scenario, onClose }: { detail: Detail; rows: SlateCandidate[]; scenario: Scenario; onClose: () => void }) {
  const open = detail !== null;
  const list = detail
    ? rows
        .filter(r => r.party === detail.party && r.cargo === detail.cargo)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];
  const totalScenario = list.reduce((s, r) => s + scenarioValue(r, scenario), 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>{detail.party} — {detail.cargo}</SheetTitle>
              <SheetDescription>
                {list.length} pré-candidato(s) · Projeção ({SCENARIO_LABEL[scenario]}): {fmt(totalScenario)} votos
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {list.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum pré-candidato cadastrado nesta segmentação.
                </div>
              ) : list.map((r) => (
                <div key={r.id} className="rounded-md border border-border/60 bg-card/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[r.city, r.association].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {r.filiacao_status}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Bom:</span> <span className="font-semibold">{fmt(r.votes_bom ?? 0)}</span></div>
                    <div><span className="text-muted-foreground">Médio:</span> <span className="font-semibold">{fmt(r.votes_medio ?? 0)}</span></div>
                    <div><span className="text-muted-foreground">Ruim:</span> <span className="font-semibold">{fmt(r.votes_ruim ?? 0)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to={`/chapas/${detail.party}`} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                Abrir gestão completa <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
