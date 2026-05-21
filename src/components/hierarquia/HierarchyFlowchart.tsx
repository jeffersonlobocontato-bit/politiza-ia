import { useRef, useState } from 'react';
import { X, User, Crown, Scale, Megaphone, Truck, Calendar, DollarSign, Handshake, FileText, Download, Loader2 } from 'lucide-react';
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

// (Jurídico e Comunicação agora descem como departamentos abaixo do Coordenador Geral)

// Staff lateral (Jurídico à esquerda, Comunicação à direita do Coordenador Geral)
const STAFF: DeptDef[] = [
  {
    key: 'juridico',
    label: 'Jurídico',
    icon: Scale,
    color: 'hsl(var(--brand-amber))',
    match: r => lc(r).includes('jurídic') || lc(r).includes('juridic') || lc(r).includes('advog'),
  },
  {
    key: 'comunicacao',
    label: 'Comunicação',
    icon: Megaphone,
    color: 'hsl(var(--brand-cyan))',
    match: r => lc(r).includes('comunica') || lc(r).includes('marketing') || lc(r).includes('imprensa'),
  },
];

// Departamentos da linha inferior (descem todos do Coordenador Geral)
const DEPARTMENTS: DeptDef[] = [
  {
    key: 'logistica',
    label: 'Logística',
    icon: Truck,
    color: 'hsl(var(--chart-4))',
    match: r => lc(r).includes('logíst') || lc(r).includes('logist'),
  },
  {
    key: 'agenda',
    label: 'Agenda',
    icon: Calendar,
    color: 'hsl(var(--brand-green))',
    match: r => lc(r).includes('agenda'),
  },
  {
    key: 'financas',
    label: 'Finanças',
    icon: DollarSign,
    color: 'hsl(var(--primary))',
    match: r => lc(r).includes('finan') || lc(r).includes('tesour'),
  },
  {
    key: 'politica',
    label: 'Coord. Política',
    icon: Handshake,
    color: 'hsl(var(--brand-cyan))',
    match: r => (lc(r).includes('polític') || lc(r).includes('politic')) && !lc(r).includes('plano'),
    children: [
      {
        key: 'coord_pl',
        label: 'PL',
        icon: Handshake,
        color: 'hsl(var(--primary))',
        match: r => {
          const s = lc(r);
          return (s.includes('coorden') && /\bpl\b/.test(s)) || s.includes('coord. pl') || s.includes('coord pl') || s.includes('coordenação do pl') || /\bpl\b/.test(s);
        },
      },
      {
        key: 'coord_novo',
        label: 'NOVO',
        icon: Handshake,
        color: 'hsl(var(--brand-amber))',
        match: r => {
          const s = lc(r);
          return (s.includes('coorden') && s.includes('novo')) || s.includes('coord. novo') || s.includes('coord novo') || s.includes('coordenação do novo') || /\bnovo\b/.test(s);
        },
      },
    ],
  },
  {
    key: 'plano',
    label: 'Plano de Governo',
    icon: FileText,
    color: 'hsl(var(--chart-4))',
    match: r => lc(r).includes('plano de governo') || lc(r).includes('programa'),
  },
];

const COORD_GERAL_COLOR = 'hsl(var(--primary))';
const ALL_DEFS = [...STAFF, ...DEPARTMENTS, ...DEPARTMENTS.flatMap(d => d.children ?? [])];

function findMember(members: DbCampaignMember[], def: DeptDef): DbCampaignMember | null {
  return members.find(m => def.match(m.role)) ?? null;
}

function findCoordGeral(members: DbCampaignMember[]): DbCampaignMember | null {
  return (
    members.find(m => {
      const r = lc(m.role);
      return r.includes('coorden') && r.includes('geral');
    }) ?? null
  );
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
  const { data: members = [] } = useCampaignMembers();
  const { activeCandidate } = useCandidate();
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

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


  const coordGeral = findCoordGeral(members);
  const staff = STAFF.map(def => ({ def, member: findMember(members, def) }));
  const departments = DEPARTMENTS.map(def => ({
    def,
    member: findMember(members, def),
    children: def.children?.map(c => ({ def: c, member: findMember(members, c) })) ?? [],
  }));

  const totalSlots =
    1 + staff.length + departments.length +
    departments.reduce((acc, d) => acc + d.children.length, 0) +
    (activeCandidate ? 1 : 0);
  const filledSlots =
    (coordGeral ? 1 : 0) +
    staff.filter(s => s.member).length +
    departments.filter(d => d.member).length +
    departments.reduce((acc, d) => acc + d.children.filter(c => c.member).length, 0) +
    (activeCandidate ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
              <h2 className="text-sm font-bold text-foreground truncate">Organograma da Campanha</h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {activeCandidate
                  ? `${activeCandidate.name} · ${activeCandidate.cargo} · ${activeCandidate.party}`
                  : 'Estrutura funcional de comando'}
              </p>
            </div>
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

            {/* L1 — Candidato */}
            <div className="flex justify-center">
              <div
                className="rounded-xl border-2 px-5 py-2.5 shadow-lg text-center"
                style={{
                  borderColor: 'hsl(var(--primary))',
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 8px 32px hsl(var(--primary) / 0.35)',
                }}
              >
                <div className="flex items-center gap-2 justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                  <div className="text-sm font-black text-primary-foreground">
                    {activeCandidate?.name ?? 'Candidato'}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-primary-foreground/85 mt-0.5">
                  {activeCandidate?.cargo ?? 'Cargo'}
                </div>
              </div>
            </div>

            <VLine />

            {/* L2 — Coordenador Geral centralizado com Jurídico (esq) e Comunicação (dir) ligeiramente abaixo */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-3">
              {/* Jurídico (lateral esquerda, levemente abaixo) */}
              <div className="flex justify-end items-center gap-2 pt-10 sm:pt-12">
                <div className="w-full max-w-[140px] sm:max-w-[160px]">
                  <DeptCard
                    member={staff[0].member}
                    label={staff[0].def.label}
                    icon={staff[0].def.icon}
                    color={staff[0].def.color}
                    compact
                    exportMode={exporting}
                  />
                </div>
                <div className="h-0.5 w-4 sm:w-8 bg-border flex-shrink-0" />
              </div>

              {/* Coordenador Geral (centro, no topo) */}
              <div className="w-[200px] sm:w-[230px]">
                <DeptCard
                  member={coordGeral}
                  label="Coordenador Geral"
                  icon={Crown}
                  color={COORD_GERAL_COLOR}
                  exportMode={exporting}
                />
              </div>

              {/* Comunicação (lateral direita, levemente abaixo) */}
              <div className="flex justify-start items-center gap-2 pt-10 sm:pt-12">
                <div className="h-0.5 w-4 sm:w-8 bg-border flex-shrink-0" />
                <div className="w-full max-w-[140px] sm:max-w-[160px]">
                  <DeptCard
                    member={staff[1].member}
                    label={staff[1].def.label}
                    icon={staff[1].def.icon}
                    color={staff[1].def.color}
                    compact
                    exportMode={exporting}
                  />
                </div>
              </div>
            </div>

            {/* Bus to departments */}
            <HorizontalBus count={departments.length} />

            {/* L3 — Departments responsive grid */}
            <div
              className="grid gap-2 sm:gap-3"
              style={{ gridTemplateColumns: `repeat(${departments.length}, minmax(0, 1fr))` }}
            >
              {departments.map(({ def, member, children }) => (
                <div key={def.key} className="flex flex-col items-stretch">
                  <DeptCard member={member} label={def.label} icon={def.icon} color={def.color} exportMode={exporting} />

                  {children.length > 0 && (
                    <>
                      <VLine h={12} />
                      <div className="flex flex-col items-stretch gap-1.5">
                        {children.map((c, i) => (
                          <div key={c.def.key} className="flex flex-col items-stretch">
                            {i > 0 && <VLine h={6} />}
                            <DeptCard
                              member={c.member}
                              label={c.def.label}
                              icon={c.def.icon}
                              color={c.def.color}
                              compact
                              exportMode={exporting}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>Estrutura funcional · cargos vinculados por palavra-chave do papel</span>
              <span>
                Sem departamento: <strong className="text-foreground">{
                  members.filter(m =>
                    !ALL_DEFS.some(d => d.match(m.role)) &&
                    !(lc(m.role).includes('coorden') && lc(m.role).includes('geral'))
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
