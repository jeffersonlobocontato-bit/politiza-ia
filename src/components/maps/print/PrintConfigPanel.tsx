// Painel lateral de configuração da impressão (oculto na impressão via @media print).
import { PAPER_OPTIONS, type PaperFormat, type PaperOrientation } from '@/lib/printScale';
import { PRINT_LAYERS, type PrintLayerId } from '@/lib/printLayers';
import { Printer, Download, ArrowLeft } from 'lucide-react';

interface Props {
  paperFormat: PaperFormat;
  paperOrientation: PaperOrientation;
  onPaperChange: (f: PaperFormat, o: PaperOrientation) => void;
  selected: Record<PrintLayerId, boolean>;
  onToggleLayer: (id: PrintLayerId) => void;
  counts: Partial<Record<PrintLayerId, number>>;
  showAssociations: boolean;
  onToggleAssociations: () => void;
  showCityLabels: boolean;
  onToggleCityLabels: () => void;
  title: string;
  onTitleChange: (v: string) => void;
  subtitle: string;
  onSubtitleChange: (v: string) => void;
  onPrint: () => void;
  onBack: () => void;
}

export function PrintConfigPanel(p: Props) {
  const paperLabel = `${p.paperFormat} ${p.paperOrientation === 'landscape' ? 'paisagem' : 'retrato'}`;
  return (
    <aside
      className="print-hide"
      style={{
        width: 300,
        flexShrink: 0,
        background: 'hsl(var(--card))',
        borderRight: '1px solid hsl(var(--border))',
        padding: '16px',
        overflowY: 'auto',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={p.onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao mapa
        </button>
      </div>

      <div>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Printer className="w-4 h-4 text-primary" /> Imprimir mapa
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Configure formato, camadas e legenda. O preview é WYSIWYG.
        </p>
      </div>

      {/* Papel */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
          Formato do papel
        </p>
        <div className="grid grid-cols-2 gap-1">
          {PAPER_OPTIONS.map(o => {
            const active = o.format === p.paperFormat && o.orientation === p.paperOrientation;
            return (
              <button
                key={`${o.format}-${o.orientation}`}
                onClick={() => p.onPaperChange(o.format, o.orientation)}
                className={`text-[11px] py-2 rounded border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-muted/20 border-border text-foreground hover:bg-accent'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Atual: {paperLabel}</p>
      </div>

      {/* Camadas */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
          Camadas de pins
        </p>
        <div className="space-y-1.5">
          {PRINT_LAYERS.map(l => (
            <label
              key={l.id}
              className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer p-1.5 rounded hover:bg-accent/50"
            >
              <input
                type="checkbox"
                checked={p.selected[l.id]}
                onChange={() => p.onToggleLayer(l.id)}
                className="accent-primary"
              />
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="flex-1 truncate">{l.label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{p.counts[l.id] ?? 0}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Opções de fundo */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
          Fundo cartográfico
        </p>
        <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer mb-1">
          <input type="checkbox" checked={p.showCityLabels} onChange={p.onToggleCityLabels} className="accent-primary" />
          Mostrar nomes das cidades
        </label>
        <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
          <input type="checkbox" checked={p.showAssociations} onChange={p.onToggleAssociations} className="accent-primary" />
          Pintar associações (tom pastel)
        </label>
      </div>

      {/* Título */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
          Cabeçalho do mapa
        </p>
        <input
          type="text"
          value={p.title}
          onChange={e => p.onTitleChange(e.target.value)}
          placeholder="Título do mapa"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background text-foreground mb-1.5"
        />
        <input
          type="text"
          value={p.subtitle}
          onChange={e => p.onSubtitleChange(e.target.value)}
          placeholder="Subtítulo (opcional)"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background text-foreground"
        />
      </div>

      <div className="flex-1" />

      <div className="space-y-2 pt-3 border-t border-border">
        <button
          onClick={p.onPrint}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Printer className="w-4 h-4" /> Imprimir
        </button>
        <button
          onClick={p.onPrint}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded border border-border bg-card text-foreground text-xs hover:bg-accent transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Salvar PDF (via "Imprimir → PDF")
        </button>
      </div>
    </aside>
  );
}
