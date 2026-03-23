import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import { polls, pollTimeline, macroRegions } from '@/data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Pesquisas() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <BarChart2 className="w-5 h-5 text-primary" />
        <div><h1 className="text-base font-bold">Pesquisas Eleitorais</h1><p className="text-xs text-muted-foreground">{polls.length} pesquisas registradas</p></div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Timeline chart */}
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Evolução — Jan/24 a Jul/24</span>
            <span className="ml-auto text-xs text-brand-green font-semibold">Candidato: +8.7pp</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pollTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 60]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="candidate" name="Candidato" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="rival1" name="Rival A" stroke="hsl(var(--brand-red))" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="rival2" name="Rival B" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="undecided" name="Indecisos" stroke="hsl(var(--brand-amber))" strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Poll list */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {polls.map(poll => (
            <div key={poll.id} className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <div className="text-xs font-bold text-primary mb-1">{poll.institute}</div>
              <div className="text-xs text-muted-foreground mb-3">{poll.territory} · {poll.releaseDate}</div>
              <div className="text-3xl font-black text-brand-green mb-1">{poll.votingIntention}%</div>
              <div className="text-xs text-muted-foreground mb-3">Intenção de voto</div>
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div><div className="text-[10px] text-muted-foreground">Rejeição</div><div className="text-sm font-bold text-brand-red">{poll.rejection}%</div></div>
                <div><div className="text-[10px] text-muted-foreground">Indecisos</div><div className="text-sm font-bold text-brand-amber">{poll.undecided}%</div></div>
                <div><div className="text-[10px] text-muted-foreground">Amostra</div><div className="text-sm font-bold text-foreground">{poll.sampleSize.toLocaleString()}</div></div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">Margem: ±{poll.marginOfError}pp · {poll.methodology}</div>
            </div>
          ))}
        </div>
        {/* By region */}
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="text-sm font-semibold mb-4">Intenção de Voto por Macrorregião</div>
          <div className="space-y-3">
            {macroRegions.map(r => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 flex-shrink-0 truncate">{r.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pollScore}%`, backgroundColor: r.pollScore > 45 ? '#22c55e' : r.pollScore > 40 ? '#3b82f6' : '#ef4444' }} />
                </div>
                <div className="flex items-center gap-1 w-16 flex-shrink-0">
                  <span className="text-sm font-bold text-foreground">{r.pollScore}%</span>
                  {r.pollTrend === 'up' ? <TrendingUp className="w-3 h-3 text-brand-green" /> : r.pollTrend === 'down' ? <TrendingDown className="w-3 h-3 text-brand-red" /> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
