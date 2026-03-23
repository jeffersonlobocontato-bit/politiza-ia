import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { CandidateResult, CANDIDATE_COLORS } from '@/data/pollsData';

interface CandidateBarChartProps {
  results: CandidateResult[];
  /** Exclude "structural" entries like Não sabe/Não opinou */
  hideNeutral?: boolean;
  height?: number;
}

const NEUTRAL = ['Não sabe/ Não opinou', 'Não sabe/Não opinou', 'Nenhum/ Branco/ Nulo', 'Ninguém/ Branco/ Nulo'];

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === 0) return null;
  return (
    <text
      x={x + width + 6}
      y={y + 10}
      fill="hsl(var(--foreground))"
      fontSize={12}
      fontWeight={600}
    >
      {value}%
    </text>
  );
};

export function CandidateBarChart({ results, hideNeutral = false, height = 320 }: CandidateBarChartProps) {
  const data = results
    .filter(r => !hideNeutral || !NEUTRAL.some(n => r.candidate.includes(n.split('/')[0].trim())))
    .sort((a, b) => b.percentage - a.percentage)
    .map(r => ({
      name: r.candidate,
      value: r.percentage,
      color: CANDIDATE_COLORS[r.candidate] ?? 'hsl(var(--muted-foreground))',
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, Math.ceil((data[0]?.value ?? 50) / 10) * 10 + 10]}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, 'Intenção']}
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
          <LabelList dataKey="value" content={<CustomLabel />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
