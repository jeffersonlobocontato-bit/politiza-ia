/**
 * InfographicCharts — shared visual components for analytics panels.
 * Style: dark navy card, primary-blue + mint (#0FFCBE) palette,
 * inspired by the infographic reference (circle donuts, horizontal bars, vertical bars).
 */
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';

// ── Design constants ─────────────────────────────────────────────────────────
export const CHART_NAVY   = 'hsl(220 30% 13%)';   // dark card bg
export const CHART_NAVY2  = 'hsl(220 30% 17%)';   // slightly lighter
export const CHART_BORDER = 'hsl(220 20% 22%)';   // subtle border
export const CHART_PRIMARY = '#106EBE';
export const CHART_MINT   = '#0FFCBE';
export const CHART_WHITE  = '#FFFFFF';
export const CHART_MUTED  = 'hsl(215 13% 55%)';
export const CHART_TEXT   = 'hsl(213 18% 82%)';

/** Ordered palette for multi-series or Pie slices */
export const CHART_PALETTE = [
  '#106EBE', '#0FFCBE', '#FBC02D', '#E53935',
  '#7B61FF', '#43A047', '#1E88E5', '#F57C00',
  '#26C6DA', '#EC407A',
];

// ── Tooltip ──────────────────────────────────────────────────────────────────
export const InfographicTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: CHART_NAVY2, border: `1px solid ${CHART_BORDER}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12, minWidth: 120,
    }}>
      {label && <p style={{ color: CHART_WHITE, fontWeight: 700, marginBottom: 4, maxWidth: 180 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? CHART_MINT, margin: '2px 0' }}>
          <span style={{ color: CHART_TEXT }}>{p.name}: </span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Donut chart card ─────────────────────────────────────────────────────────
interface DonutItem { name: string; value: number; color?: string }
interface DonutProps {
  title: string;
  subtitle?: string;
  data: DonutItem[];
  height?: number;
  unit?: string;
}

export function InfographicDonut({ title, subtitle, data, height = 200, unit = '' }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const items = data.map((d, i) => ({ ...d, color: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length] }));

  return (
    <div style={{
      background: CHART_NAVY, border: `1px solid ${CHART_BORDER}`,
      borderRadius: 16, padding: '16px', overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: CHART_MINT }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: CHART_TEXT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: CHART_MUTED }}>{subtitle}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Donut */}
        <div style={{ flex: '0 0 auto', width: 120, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={54}
                paddingAngle={3}
                strokeWidth={0}
              >
                {items.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 18, fontWeight: 800, fill: CHART_WHITE }}>
                {total}
              </text>
              <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 9, fill: CHART_MUTED }}>
                {unit || 'total'}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: CHART_TEXT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: d.color, minWidth: 32, textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal bar chart card ─────────────────────────────────────────────────
interface BarItem { name: string; value: number; color?: string }
interface HBarProps {
  title: string;
  subtitle?: string;
  data: BarItem[];
  accentColor?: string;
}

export function InfographicHBar({ title, subtitle, data, accentColor = CHART_MINT }: HBarProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const items = data.slice(0, 8);

  return (
    <div style={{
      background: CHART_NAVY, border: `1px solid ${CHART_BORDER}`,
      borderRadius: 16, padding: '16px',
    }}>
      {/* header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: accentColor }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: CHART_TEXT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: CHART_MUTED }}>{subtitle}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((d, i) => {
          const pct = (d.value / max) * 100;
          const color = d.color ?? accentColor;
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: CHART_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                  {d.name}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color }}>
                  {d.value}
                </span>
              </div>
              {/* bar track */}
              <div style={{ height: 6, borderRadius: 3, background: 'hsl(220 20% 20%)' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${pct}%`,
                  background: color,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vertical stacked bar chart card ──────────────────────────────────────────
interface VBarSeries { key: string; label: string; color: string }
interface VBarItem { name: string; [key: string]: any }
interface VBarProps {
  title: string;
  subtitle?: string;
  data: VBarItem[];
  series: VBarSeries[];
  height?: number;
}

export function InfographicVBar({ title, subtitle, data, series, height = 200 }: VBarProps) {
  return (
    <div style={{
      background: CHART_NAVY, border: `1px solid ${CHART_BORDER}`,
      borderRadius: 16, padding: '16px',
    }}>
      {/* header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: CHART_PRIMARY }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: CHART_TEXT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: CHART_MUTED }}>{subtitle}</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={12}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: CHART_TEXT }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: CHART_MUTED }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<InfographicTooltip />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="a"
              fill={s.color}
              radius={i === series.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* legend pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {series.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 10, color: CHART_TEXT }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
