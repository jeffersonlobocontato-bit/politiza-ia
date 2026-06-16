// Rodapé com legenda e big numbers de cada categoria selecionada.
import { PRINT_LAYERS, type PrintLayerId } from '@/lib/printLayers';

interface Props {
  counts: Partial<Record<PrintLayerId, number>>;
  selected: Record<PrintLayerId, boolean>;
  bigNumberPt: number;
  title: string;
  subtitle?: string;
  emendasByFaixa?: Array<{ id: string; label: string; color: string; count: number }>;
}

export function PrintLegendFooter({ counts, selected, bigNumberPt, title, subtitle, emendasByFaixa }: Props) {
  const visible = PRINT_LAYERS.filter(l => selected[l.id] && (counts[l.id] ?? 0) > 0);
  const total = visible.reduce((s, l) => s + (counts[l.id] ?? 0), 0);

  return (
    <div
      style={{
        borderTop: '2px solid #1A2A45',
        background: '#ffffff',
        padding: '6mm 8mm',
        display: 'flex',
        flexDirection: 'column',
        gap: '3mm',
        color: '#1A2A45',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '14pt', fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '9pt', color: '#64748B' }}>{subtitle}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>
            Total georreferenciado
          </div>
          <div style={{ fontSize: `${bigNumberPt + 4}pt`, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {total}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(4, visible.length || 1)}, minmax(0, 1fr))`,
          gap: '3mm',
        }}
      >
        {visible.map(l => (
          <div
            key={l.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5mm',
              padding: '2.5mm 3mm',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${l.color}`,
              borderRadius: '2mm',
              background: '#F8FAFC',
            }}
          >
            <div
              style={{
                width: '4mm',
                height: '4mm',
                borderRadius: '50%',
                background: l.color,
                flexShrink: 0,
                border: '1px solid #fff',
                boxShadow: `0 0 0 1px ${l.color}`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '7.5pt', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', lineHeight: 1.1 }}>
                {l.shortLabel}
              </div>
              <div style={{ fontSize: '9pt', fontWeight: 600, color: '#1A2A45', lineHeight: 1.2 }}>
                {l.label}
              </div>
            </div>
            <div style={{ fontSize: `${bigNumberPt}pt`, fontWeight: 900, color: l.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {counts[l.id] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {emendasByFaixa && emendasByFaixa.length > 0 && selected.emendas && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', flexWrap: 'wrap', paddingTop: '2mm', borderTop: '1px dashed #CBD5E1' }}>
          <span style={{ fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', fontWeight: 700 }}>
            Emendas por faixa:
          </span>
          {emendasByFaixa.map(f => (
            <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5mm', fontSize: '8.5pt' }}>
              <span style={{ width: '2.5mm', height: '2.5mm', borderRadius: '50%', background: f.color }} />
              <span style={{ color: '#1A2A45', fontWeight: 600 }}>{f.label}</span>
              <span style={{ color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{f.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
