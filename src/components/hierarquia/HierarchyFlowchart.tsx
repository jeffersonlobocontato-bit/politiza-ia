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

// Flanker staff (sit beside Coordenação Geral)
const FLANKERS: DeptDef[] = [
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

// Main department row
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
const ALL_DEFS = [...FLANKERS, ...DEPARTMENTS, ...DEPARTMENTS.flatMap(d => d.children ?? [])];

function findMember(members: DbCampaignMember[], def: DeptDef): DbCampaignMember | null {
  return members.find(m => def.match(m.role)) ?? null;
}

function findCoordGeral(members: DbCampaignMember[]): DbCampaignMember | null {
  return (
    members.find(m => {
      const r = lc(m.role);
      return r.includes('coorden') && r.includes('geral');
    }) ?? members.find(m => m.hierarchy_level === 2) ?? null
  );
}

function DeptCard({
  member,
  label,
  icon: Icon,
  color,
  compact = false,
}: {
  member: DbCampaignMember | null;
  label: string;
  icon: LucideIcon;
  color: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-md border-2 bg-card relative ${compact ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="w-2.5 h-2.5" />
        </div>
        <div className="text-[9px] uppercase tracking-wider font-bold truncate" style={{ color }}>
          {label}
        </div>
      </div>
      {member ? (
        <>
          <div className="text-[11px] font-bold text-foreground truncate leading-tight">{member.name}</div>
          {member.role && lc(member.role) !== lc(label) && (
            <div className="text-[9px] text-muted-foreground truncate">{member.role}</div>
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
    try {
      // Resolve background from CSS variable so html2canvas doesn't paint transparent
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      const bgColor = bg ? `hsl(${bg})` : '#0b1220';

      const canvas = await html2canvas(chartRef.current, {
        scale: 3, // high resolution
        backgroundColor: bgColor,
        useCORS: true,
        logging: false,
        windowWidth: chartRef.current.scrollWidth,
        windowHeight: chartRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pxToMm = (px: number) => (px * 25.4) / 96 / 3; // scale=3 → divide
      const wMm = pxToMm(canvas.width);
      const hMm = pxToMm(canvas.height);
      const landscape = wMm >= hMm;
      const pdf = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [wMm + 20, hMm + 20], // 10mm margin each side
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
  const flankers = FLANKERS.map(def => ({ def, member: findMember(members, def) }));
  const departments = DEPARTMENTS.map(def => ({
    def,
    member: findMember(members, def),
    children: def.children?.map(c => ({ def: c, member: findMember(members, c) })) ?? [],
  }));

  const totalSlots =
    1 + flankers.length + departments.length +
    departments.reduce((acc, d) => acc + d.children.length, 0) +
    (activeCandidate ? 1 : 0);
  const filledSlots =
    (coordGeral ? 1 : 0) +
    flankers.filter(f => f.member).length +
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
          <div ref={chartRef} className="w-full max-w-[1040px] mx-auto">

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

            {/* L2 — Coordenação Geral com flankers (Jurídico esquerda · Comunicação direita) */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
              {/* Jurídico (flanker) */}
              <div className="flex justify-end items-center gap-2">
                <div className="w-full max-w-[150px]">
                  <DeptCard
                    member={flankers[0].member}
                    label={flankers[0].def.label}
                    icon={flankers[0].def.icon}
                    color={flankers[0].def.color}
                    compact
                  />
                </div>
                <div className="h-0.5 w-3 sm:w-6 bg-border flex-shrink-0" />
              </div>

              {/* Coordenação Geral */}
              <div className="w-[180px] sm:w-[210px]">
                <DeptCard
                  member={coordGeral}
                  label="Coordenação Geral"
                  icon={Crown}
                  color={COORD_GERAL_COLOR}
                />
              </div>

              {/* Comunicação (flanker) */}
              <div className="flex justify-start items-center gap-2">
                <div className="h-0.5 w-3 sm:w-6 bg-border flex-shrink-0" />
                <div className="w-full max-w-[150px]">
                  <DeptCard
                    member={flankers[1].member}
                    label={flankers[1].def.label}
                    icon={flankers[1].def.icon}
                    color={flankers[1].def.color}
                    compact
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
                  <DeptCard member={member} label={def.label} icon={def.icon} color={def.color} />

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
