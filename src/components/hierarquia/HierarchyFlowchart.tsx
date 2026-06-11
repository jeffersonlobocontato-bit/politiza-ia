import { useRef, useState, useMemo } from 'react';
import { X, User, Crown, Scale, Megaphone, Truck, Calendar, DollarSign, Handshake, FileText, Download, Loader2, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import { useCandidate } from '@/contexts/CandidateContext';
import type { DbCampaignMember } from '@/types/database';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DeptDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  match: (role: string) => boolean;
  children?: DeptDef[];
}

const lc = (s: string) => s.toLowerCase();

// Coordenação Central — trio no topo (Julio, Jefferson, Adilson)
const CENTRAL_MATCH = (r: string) => lc(r).includes('central');

// Departamentos da linha inferior (descem todos da Coordenação Central)
const DEPARTMENTS: DeptDef[] = [
  {
    key: 'politica',
    label: 'Política Estadual',
    icon: Handshake,
    color: 'hsl(var(--brand-cyan))',
    match: r => lc(r).includes('política estadual') || lc(r).includes('politica estadual'),
  },
  {
    key: 'juridico',
    label: 'Jurídica Eleitoral',
    icon: Scale,
    color: 'hsl(var(--brand-amber))',
    match: r => lc(r).includes('jurídic') || lc(r).includes('juridic'),
  },
  {
    key: 'operacional',
    label: 'Operacional / Eventos',
    icon: Truck,
    color: 'hsl(var(--brand-green))',
    match: r => lc(r).includes('operacional') || lc(r).includes('eventos'),
  },
  {
    key: 'admfin',
    label: 'Adm. / Financeira',
    icon: DollarSign,
    color: 'hsl(var(--primary))',
    match: r => lc(r).includes('administrativa') || lc(r).includes('financeira') || lc(r).includes('financeiro'),
  },
  {
    key: 'marketing',
    label: 'Marketing / Comunicação',
    icon: Megaphone,
    color: 'hsl(var(--brand-cyan))',
    match: r => lc(r).includes('marketing') || lc(r).includes('comunica'),
  },
  {
    key: 'plano',
    label: 'Plano de Governo',
    icon: FileText,
    color: 'hsl(var(--chart-4))',
    match: r => lc(r).includes('plano de governo') || lc(r).includes('programa'),
  },
];

const CENTRAL_COLOR = 'hsl(var(--primary))';
const ALL_DEFS = [...DEPARTMENTS];

function findMembers(members: DbCampaignMember[], match: (r: string) => boolean): DbCampaignMember[] {
  return members.filter(m => match(m.role));
}

function findCentralTrio(members: DbCampaignMember[]): { lead: DbCampaignMember | null; peers: DbCampaignMember[] } {
  const all = members.filter(m => CENTRAL_MATCH(m.role));
  // Julio Reis é o Coordenador Geral dentro da Central — fica no topo
  const lead =
    all.find(m => lc(m.name).includes('julio')) ??
    all.find(m => lc(m.role).includes('geral')) ??
    all[0] ?? null;
  const peers = all.filter(m => m.id !== lead?.id);
  return { lead, peers };
}

function DeptCard({
  member,
  label,
  icon: Icon,
  color,
  compact = false,
  exportMode = false,
}: {
  member: DbCampaignMember | null;
  label: string;
  icon: LucideIcon;
  color: string;
  compact?: boolean;
  exportMode?: boolean;
}) {
  const pad = exportMode
    ? (compact ? 'px-2.5 py-2.5' : 'px-3 py-3')
    : (compact ? 'px-2 py-1.5' : 'px-2.5 py-2');
  const textWrap = exportMode ? 'whitespace-normal break-words' : 'truncate';
  const leading = exportMode ? 'leading-snug' : 'leading-tight';
  return (
    <div
      className={`w-full rounded-md border-2 bg-card relative ${pad}`}
      style={{ borderColor: color, overflow: 'visible' }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="w-2.5 h-2.5" />
        </div>
        <div className={`text-[9px] uppercase tracking-wider font-bold ${textWrap}`} style={{ color }}>
          {label}
        </div>
      </div>
      {member ? (
        <>
          <div className={`text-[11px] font-bold text-foreground ${textWrap} ${leading}`}>{member.name}</div>
          {member.role && lc(member.role) !== lc(label) && (
            <div className={`text-[9px] text-muted-foreground ${textWrap} ${leading}`}>{member.role}</div>
          )}
        </>
      ) : (
        <div className="text-[10px] italic text-muted-foreground/70">Vaga Aberta</div>
      )}
    </div>
  );
}

function VLine({ h = 20 }: { h?: number }) {
  return <div className="w-0.5 mx-auto bg-border" style={{ height: h }} />;
}

function HorizontalBus({ count, dropH = 16 }: { count: number; dropH?: number }) {
  if (count <= 1) return <VLine />;
  return (
    <div className="relative w-full" style={{ height: 10 + dropH }}>
      <div className="absolute left-1/2 top-0 w-0.5 h-[10px] bg-border -translate-x-1/2" />
      <div
        className="absolute h-0.5 bg-border"
        style={{ top: 10, left: `${100 / (count * 2)}%`, right: `${100 / (count * 2)}%` }}
      />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 bg-border"
          style={{ top: 10, height: dropH, left: `calc(${((i + 0.5) * 100) / count}% - 1px)` }}
        />
      ))}
    </div>
  );
}

export function HierarchyFlowchart({ open, onClose }: Props) {
  const { data: allMembers = [] } = useCampaignMembers();
  const { activeCandidate, candidates } = useCandidate();
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [viewCandidateId, setViewCandidateId] = useState<string | null>(null);

  const viewCandidate = viewCandidateId
    ? candidates.find(c => c.id === viewCandidateId) ?? null
    : null;

  // Quando navegando para a árvore de um candidato específico, filtra membros pela vinculação.
  // Caso o candidato não tenha membros vinculados ainda, mostra apenas seu próprio card (Nível 1).
  const members = useMemo(() => {
    if (!viewCandidateId) return allMembers;
    const linked = allMembers.filter(m => (m as any).candidate_id === viewCandidateId);
    const self = allMembers.filter(m =>
      m.hierarchy_level === 1 &&
      viewCandidate &&
      lc(m.name).includes(lc(viewCandidate.name.split(' ')[0])) &&
      lc(m.name).includes(lc(viewCandidate.name.split(' ').slice(-1)[0]))
    );
    const map = new Map<string, DbCampaignMember>();
    [...self, ...linked].forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  }, [allMembers, viewCandidateId, viewCandidate]);

  const handleSelectCandidate = (memberName: string) => {
    const match = candidates.find(c =>
      lc(c.name).split(' ').every(part => lc(memberName).includes(part)) ||
      lc(memberName).split(' ').every(part => lc(c.name).includes(part))
    );
    if (match) setViewCandidateId(match.id);
    else toast.info(`Nenhuma candidatura vinculada encontrada para ${memberName}.`);
  };

  const handleResetView = () => setViewCandidateId(null);

  const handleDownloadPdf = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    // Aguarda React aplicar exportMode antes de capturar
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      const bgColor = bg ? `hsl(${bg})` : '#0b1220';

      const canvas = await html2canvas(chartRef.current, {
        scale: 3,
        backgroundColor: bgColor,
        useCORS: true,
        logging: false,
        windowWidth: chartRef.current.scrollWidth,
        windowHeight: chartRef.current.scrollHeight,
        onclone: (doc) => {
          // Garante que nada seja clipado durante a renderização do canvas
          doc.querySelectorAll('*').forEach((el) => {
            const he = el as HTMLElement;
            if (he.style) {
              he.style.textOverflow = 'clip';
            }
          });
          const root = doc.querySelector('[data-pdf-root]') as HTMLElement | null;
          if (root) {
            root.style.overflow = 'visible';
            root.style.lineHeight = '1.4';
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pxToMm = (px: number) => (px * 25.4) / 96 / 3;
      let wMm = pxToMm(canvas.width);
      let hMm = pxToMm(canvas.height);
      // Limite prático do jsPDF (~14400pt ≈ 5080mm), mas mantemos folga
      const MAX = 1000;
      if (wMm > MAX || hMm > MAX) {
        const k = MAX / Math.max(wMm, hMm);
        wMm *= k;
        hMm *= k;
      }
      const landscape = wMm >= hMm;
      const pdf = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [wMm + 20, hMm + 20],
        compress: true,
      });
      pdf.addImage(imgData, 'PNG', 10, 10, wMm, hMm, undefined, 'FAST');
      const name = activeCandidate?.name?.replace(/\s+/g, '_') ?? 'campanha';
      pdf.save(`organograma_${name}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (e: any) {
      toast.error(`Falha ao gerar PDF: ${e.message ?? e}`);
    } finally {
      setExporting(false);
    }
  };


  const centralTrio = findCentralTrio(members);
  const departments = DEPARTMENTS.map(def => ({
    def,
    member: findMembers(members, def.match)[0] ?? null,
    extraMembers: findMembers(members, def.match).slice(1),
  }));

  const centralCount = (centralTrio.lead ? 1 : 0) + centralTrio.peers.length;
  const totalSlots =
    1 + Math.max(1, centralCount) + departments.length +
    (activeCandidate ? 1 : 0);
  const filledSlots =
    centralCount +
    departments.filter(d => d.member).length +
    (activeCandidate ? 1 : 0);

  // ── Árvore territorial (níveis 3 → 4 → 5 → 6) via supervisor_id ─────────────
  const territorial = useMemo(() => {
    const t = members.filter(m => m.hierarchy_level >= 3 && m.hierarchy_level <= 6);
    const byParent = new Map<string, DbCampaignMember[]>();
    const orphans: DbCampaignMember[] = [];
    const ids = new Set(t.map(m => m.id));
    t.forEach(m => {
      if (m.supervisor_id && ids.has(m.supervisor_id)) {
        const arr = byParent.get(m.supervisor_id) ?? [];
        arr.push(m);
        byParent.set(m.supervisor_id, arr);
      }
    });
    const roots = t.filter(m => m.hierarchy_level === 3);
    const linkedIds = new Set<string>();
    const walk = (m: DbCampaignMember) => {
      linkedIds.add(m.id);
      (byParent.get(m.id) ?? []).forEach(walk);
    };
    roots.forEach(walk);
    t.forEach(m => { if (!linkedIds.has(m.id)) orphans.push(m); });
    return { roots, byParent, orphans };
  }, [members]);

  const LEVEL_COLORS: Record<number, string> = {
    3: 'hsl(var(--brand-cyan))',
    4: 'hsl(var(--brand-green))',
    5: 'hsl(var(--chart-4))',
    6: 'hsl(var(--muted-foreground))',
  };
  const LEVEL_LABEL_SHORT: Record<number, string> = {
    3: 'Macro',
    4: 'Micro',
    5: 'Municipal',
    6: 'Liderança',
  };

  const renderTreeNode = (m: DbCampaignMember, depth: number) => {
    const color = LEVEL_COLORS[m.hierarchy_level] ?? 'hsl(var(--muted-foreground))';
    const children = territorial.byParent.get(m.id) ?? [];
    return (
      <div key={m.id} className="flex flex-col" style={{ marginLeft: depth === 0 ? 0 : 16 }}>
        <div className="flex items-start gap-2 py-1">
          <div
            className="mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
          >
            {LEVEL_LABEL_SHORT[m.hierarchy_level]}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-foreground leading-tight">{m.name}</div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              {m.role}{m.municipality ? ` · ${m.municipality}` : ''}{m.microregion ? ` · ${m.microregion}` : ''}
            </div>
          </div>
        </div>
        {children.length > 0 && (
          <div className="border-l-2 ml-2 pl-2" style={{ borderColor: `${color}44` }}>
            {children
              .sort((a, b) => a.hierarchy_level - b.hierarchy_level || a.name.localeCompare(b.name))
              .map(c => renderTreeNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleResetView(); onClose(); } }}>
      <DialogContent className="max-w-[1100px] w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between flex-shrink-0 bg-card gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">
                {viewCandidate ? `Organograma — ${viewCandidate.name}` : 'Organograma da Campanha'}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {viewCandidate
                  ? `${viewCandidate.cargo} · ${viewCandidate.party}`
                  : activeCandidate
                    ? `${activeCandidate.name} · ${activeCandidate.cargo} · ${activeCandidate.party}`
                    : 'Estrutura funcional de comando'}
              </p>
            </div>
            {viewCandidate && (
              <button
                onClick={handleResetView}
                className="ml-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-border bg-background hover:bg-accent transition-colors"
                aria-label="Voltar à árvore principal"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Árvore principal
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Preenchimento</div>
              <div className="text-sm font-bold text-foreground">
                {filledSlots}/{totalSlots}
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({Math.round((filledSlots / totalSlots) * 100)}%)
                </span>
              </div>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-primary-foreground bg-primary hover:opacity-90 disabled:opacity-60 transition-opacity"
              aria-label="Baixar organograma em PDF"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{exporting ? 'Gerando…' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Org chart — responsive, no horizontal scroll */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-background">
          <div ref={chartRef} data-pdf-root className="w-full max-w-[1040px] mx-auto">

            {/* L1 — Candidato ao Governo + Candidatos ao Senado */}
            {(() => {
              const l1 = members.filter(m => m.hierarchy_level === 1);
              const governor =
                l1.find(m => lc(m.role).includes('governador')) ?? null;
              const senators = l1.filter(m => lc(m.role).includes('senado'));
              const others = l1.filter(m => m !== governor && !senators.includes(m));
              // Fallback ao activeCandidate se não houver governador cadastrado
              const govName = governor?.name ?? activeCandidate?.name ?? 'Candidato';
              const govCargo = governor?.role ?? activeCandidate?.cargo ?? 'Cargo';

              const SenateCard = ({ m }: { m: DbCampaignMember }) => (
                <button
                  type="button"
                  onClick={() => handleSelectCandidate(m.name)}
                  className="rounded-xl border-2 bg-card px-4 py-2.5 text-center shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                  style={{ borderColor: 'hsl(var(--brand-amber))' }}
                  title={`Ver organograma de ${m.name}`}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <User className="w-3.5 h-3.5" style={{ color: 'hsl(var(--brand-amber))' }} />
                    <div className="text-[13px] font-black text-foreground">{m.name}</div>
                  </div>
                  <div
                    className="text-[9px] uppercase tracking-widest mt-0.5 font-bold"
                    style={{ color: 'hsl(var(--brand-amber))' }}
                  >
                    Candidato ao Senado
                  </div>
                </button>
              );

              return (
                <div
                  className="rounded-2xl border-2 p-4 sm:p-5"
                  style={{
                    borderColor: 'hsl(var(--primary) / 0.35)',
                    background: 'linear-gradient(180deg, hsl(var(--primary) / 0.06), transparent)',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Crown className="w-3.5 h-3.5" style={{ color: 'hsl(var(--primary))' }} />
                    <div
                      className="text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      Bloco Majoritário
                    </div>
                  </div>

                  {/* Governador no topo */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(govName)}
                      className="rounded-xl border-2 px-5 py-2.5 shadow-lg text-center min-w-[240px] hover:scale-[1.02] transition-transform cursor-pointer"
                      style={{
                        borderColor: 'hsl(var(--primary))',
                        background: 'var(--gradient-primary)',
                        boxShadow: '0 8px 32px hsl(var(--primary) / 0.35)',
                      }}
                      title={`Ver organograma de ${govName}`}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <User className="w-4 h-4 text-primary-foreground" />
                        <div className="text-sm font-black text-primary-foreground">{govName}</div>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-primary-foreground/85 mt-0.5">
                        {govCargo}
                      </div>
                    </button>
                  </div>

                  {/* Conector para senadores */}
                  {(senators.length > 0 || others.length > 0) && (
                    <>
                      <HorizontalBus count={senators.length + others.length} dropH={14} />
                      <div className="flex flex-wrap items-stretch justify-center gap-3">
                        {senators.map(m => <SenateCard key={m.id} m={m} />)}
                        {others.map(m => <SenateCard key={m.id} m={m} />)}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <VLine />

            {/* L2 — Coordenação Central: Julio (Coord. Geral) acima do par Adilson + Jefferson */}
            <div className="flex justify-center">
              <div
                className="w-full max-w-[640px] rounded-xl border-2 bg-card px-4 py-3"
                style={{ borderColor: CENTRAL_COLOR, boxShadow: '0 6px 24px hsl(var(--primary) / 0.18)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${CENTRAL_COLOR}22`, color: CENTRAL_COLOR }}
                  >
                    <Crown className="w-3 h-3" />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: CENTRAL_COLOR }}>
                    Coordenação Central
                  </div>
                  <div className="ml-auto text-[9px] text-muted-foreground">
                    Supervisão geral · Integração entre coordenações
                  </div>
                </div>

                {centralCount === 0 ? (
                  <div className="text-[11px] italic text-muted-foreground/70 py-2 text-center">Nenhum membro da Coordenação Central cadastrado</div>
                ) : (
                  <div className="flex flex-col items-center">
                    {/* Coordenador Geral no topo */}
                    {centralTrio.lead && (
                      <div
                        className="w-full sm:w-2/3 rounded-md border-2 bg-background/60 px-3 py-2 text-center"
                        style={{ borderColor: CENTRAL_COLOR }}
                      >
                        <div className="text-[8px] uppercase tracking-widest font-bold mb-0.5" style={{ color: CENTRAL_COLOR }}>
                          Coordenador Geral
                        </div>
                        <div className="text-[12px] font-bold text-foreground leading-tight">{centralTrio.lead.name}</div>
                        {centralTrio.lead.role && lc(centralTrio.lead.role) !== 'coordenação central' && (
                          <div className="text-[9px] text-muted-foreground leading-tight">{centralTrio.lead.role}</div>
                        )}
                      </div>
                    )}

                    {/* Conector vertical + horizontal para os pares */}
                    {centralTrio.lead && centralTrio.peers.length > 0 && (
                      <HorizontalBus count={centralTrio.peers.length} dropH={12} />
                    )}

                    {/* Pares (Adilson + Jefferson) lado a lado */}
                    {centralTrio.peers.length > 0 && (
                      <div
                        className="grid gap-2 w-full"
                        style={{ gridTemplateColumns: `repeat(${centralTrio.peers.length}, minmax(0, 1fr))` }}
                      >
                        {centralTrio.peers.map(m => (
                          <div
                            key={m.id}
                            className="rounded-md border bg-background/40 px-2 py-1.5 text-center"
                            style={{ borderColor: `${CENTRAL_COLOR}66` }}
                          >
                            <div className="text-[8px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
                              Coordenação Adjunta
                            </div>
                            <div className="text-[11px] font-bold text-foreground leading-tight">{m.name}</div>
                            {m.role && lc(m.role) !== 'coordenação central' && (
                              <div className="text-[9px] text-muted-foreground leading-tight truncate">{m.role}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Faixa separadora — divisão clara entre Nível 2 (Central) e Nível 3 (Setoriais) */}
            <div className="my-3 flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
              <span
                className="text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-1 rounded-md border"
                style={{ borderColor: 'hsl(var(--brand-cyan) / 0.5)', color: 'hsl(var(--brand-cyan))', background: 'hsl(var(--brand-cyan) / 0.08)' }}
              >
                Coordenações Setoriais Estaduais
              </span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
            </div>

            {/* Bus to departments */}
            <HorizontalBus count={departments.length} />


            {/* L3 — Departments responsive grid */}
            <div
              className="grid gap-2 sm:gap-3 items-start"
              style={{ gridTemplateColumns: `repeat(${departments.length}, minmax(0, 1fr))` }}
            >
              {departments.map(({ def, member, extraMembers }) => {
                const isPolitica = def.key === 'politica';
                return (
                  <div key={def.key} className="flex flex-col items-stretch">
                    <DeptCard member={member} label={def.label} icon={def.icon} color={def.color} exportMode={exporting} />

                    {extraMembers.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {extraMembers.map(em => (
                          <div
                            key={em.id}
                            className="rounded-md border bg-background/40 px-2 py-1"
                            style={{ borderColor: `${def.color}55` }}
                          >
                            <div className="text-[10px] font-bold text-foreground leading-tight truncate">{em.name}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Árvore territorial pendurada sob Política Estadual */}
                    {isPolitica && (territorial.roots.length > 0 || territorial.orphans.length > 0) && (
                      <>
                        <VLine h={12} />
                        <div
                          className="rounded-md border-2 bg-card/40 px-2 py-2"
                          style={{ borderColor: def.color }}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MapPin className="w-3 h-3" style={{ color: def.color }} />
                            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: def.color }}>
                              Estrutura Territorial
                            </span>
                          </div>
                          {territorial.roots.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic">Nenhum coordenador macrorregional cadastrado.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {territorial.roots
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(root => renderTreeNode(root, 0))}
                            </div>
                          )}
                          {territorial.orphans.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/30">
                              <div className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                <ChevronRight className="w-2.5 h-2.5" />
                                Sem vínculo ({territorial.orphans.length})
                              </div>
                              {territorial.orphans.map(o => (
                                <div key={o.id} className="text-[9px] text-muted-foreground leading-tight">
                                  <span className="font-semibold text-foreground">{o.name}</span> · {o.role}{o.municipality ? ` · ${o.municipality}` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>



            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>Estrutura funcional · cargos vinculados por palavra-chave do papel</span>
              <span>
                Sem departamento: <strong className="text-foreground">{
                  members.filter(m =>
                    !ALL_DEFS.some(d => d.match(m.role)) &&
                    !CENTRAL_MATCH(m.role)
                  ).length
                }</strong>
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
