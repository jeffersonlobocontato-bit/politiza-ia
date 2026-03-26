import { useState } from 'react';
import { Network, Award, Plus, Pencil, Trash2, X } from 'lucide-react';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { macroRegions } from '@/data/mockData';
import { useCampaignMembers, useCreateMember, useUpdateMember, useDeleteMember } from '@/hooks/useCampaignMembers';
import type { DbCampaignMember } from '@/types/database';

const LEVEL_COLORS: Record<number, string> = {
  1: 'hsl(var(--brand-amber))',
  2: 'hsl(var(--primary))',
  3: 'hsl(var(--brand-cyan))',
  4: 'hsl(var(--brand-green))',
  5: 'hsl(var(--muted-foreground))',
};
const LEVEL_LABELS: Record<number, string> = {
  1: 'Comando Estadual',
  2: 'Coordenação Macrorregional',
  3: 'Coordenação Microrregional',
  4: 'Coordenação Municipal',
  5: 'Lideranças Locais',
};

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  hierarchy_level: string;
  macroregion_id: string;
  microregion: string;
  municipality: string;
  status: string;
  observations: string;
}

const emptyForm = (): MemberForm => ({
  name: '',
  email: '',
  phone: '',
  role: 'Coordenador Municipal',
  hierarchy_level: '4',
  macroregion_id: 'rmc',
  microregion: '',
  municipality: '',
  status: 'ativo',
  observations: '',
});

export default function Hierarquia() {
  const { data: members = [], isLoading } = useCampaignMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());

  const byLevel = [1, 2, 3, 4, 5].map(l => ({
    level: l,
    members: members.filter(m => m.hierarchy_level === l),
  }));
  const ranked = [...members].sort((a, b) => b.completion_rate - a.completion_rate);

  const updateForm = (key: keyof MemberForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (member: DbCampaignMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email ?? '',
      phone: member.phone ?? '',
      role: member.role,
      hierarchy_level: String(member.hierarchy_level),
      macroregion_id: member.macroregion_id ?? 'rmc',
      microregion: member.microregion ?? '',
      municipality: member.municipality ?? '',
      status: member.status,
      observations: member.observations ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      hierarchy_level: parseInt(form.hierarchy_level) as 1|2|3|4|5,
      macroregion_id: form.macroregion_id || null,
      microregion: form.microregion || null,
      municipality: form.municipality || null,
      supervisor_id: null as string | null,
      actions_managed: 0,
      completion_rate: 0,
      status: form.status,
      observations: form.observations || null,
      user_id: null as string | null,
      created_by: null as string | null,
    };
    if (editingId) {
      await updateMember.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMember.mutateAsync(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este membro?')) return;
    await deleteMember.mutateAsync(id);
  };

  // ── Chart data ───────────────────────────────────────────────────────────────
  const levelChartData = [1,2,3,4,5].map(l => ({
    name: LEVEL_LABELS[l].replace('Coordenação ', 'Coord. ').replace('Comando ', ''),
    value: members.filter(m => m.hierarchy_level === l).length,
    color: LEVEL_COLORS[l],
  })).filter(d => d.value > 0);

  const statusChartData = [
    { name: 'Ativo', value: members.filter(m => m.status === 'ativo').length, color: '#22c55e' },
    { name: 'Inativo', value: members.filter(m => m.status === 'inativo').length, color: '#ef4444' },
    { name: 'Licença', value: members.filter(m => m.status === 'licenca').length, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const macroCounts = macroRegions.map(m => ({
    name: m.name.replace('Macrorregião ', '').replace('Região ', ''),
    value: members.filter(x => x.macroregion_id === m.id).length,
  })).filter(d => d.value > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Hierarquia da Campanha</h1>
            <p className="text-xs text-muted-foreground">{members.length} membros em {byLevel.filter(b => b.members.length > 0).length} níveis</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Plus className="w-4 h-4" /> Novo Membro
        </button>
      </div>

      {/* ── Charts Panel ──────────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="px-6 py-4 border-b border-border flex-shrink-0 bg-card/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Donut — nível hierárquico */}
            <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <p className="text-xs font-semibold text-foreground mb-3">Membros por Nível</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={levelChartData} dataKey="value" cx="35%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                    {levelChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [`${v} membros`, n]}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={9} layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, paddingLeft: 8, lineHeight: '22px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Donut — status */}
            <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <p className="text-xs font-semibold text-foreground mb-3">Membros por Status</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" cx="35%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [`${v} membros`, n]}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={9} layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, paddingLeft: 8, lineHeight: '22px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar — macrorregião */}
            <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <p className="text-xs font-semibold text-foreground mb-3">Membros por Macrorregião</p>
              <ResponsiveContainer width="100%" height={Math.max(200, macroCounts.length * 32 + 20)}>
                <BarChart data={macroCounts} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barSize={16}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}`, 'Membros']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--brand-amber))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-foreground">{editingId ? 'Editar Membro' : 'Novo Membro'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Nome Completo *</label>
                <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Nome do membro" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cargo/Função</label>
                <input value={form.role} onChange={e => updateForm('role', e.target.value)} placeholder="Coordenador Regional" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nível Hierárquico</label>
                <select value={form.hierarchy_level} onChange={e => updateForm('hierarchy_level', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {[1,2,3,4,5].map(l => <option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="email@exemplo.com" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Telefone</label>
                <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="(41) 99999-0000" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Macrorregião</label>
                <select value={form.macroregion_id} onChange={e => updateForm('macroregion_id', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Microrregião</label>
                <input value={form.microregion} onChange={e => updateForm('microregion', e.target.value)} placeholder="Ex: Londrina" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Município</label>
                <input value={form.municipality} onChange={e => updateForm('municipality', e.target.value)} placeholder="Ex: Curitiba" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="licenca">Licença</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Observações</label>
                <textarea value={form.observations} onChange={e => updateForm('observations', e.target.value)} rows={2} placeholder="Notas sobre este membro..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || createMember.isPending || updateMember.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: 'var(--gradient-primary)' }}
              >
                {createMember.isPending || updateMember.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando membros...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum membro cadastrado.</p>
            <button onClick={openNew} className="mt-3 text-xs text-primary hover:underline">Cadastrar primeiro membro</button>
          </div>
        ) : (
          <>
            {byLevel.map(({ level, members: lvlMembers }) => lvlMembers.length > 0 && (
              <div key={level}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: LEVEL_COLORS[level] }}>
                    {level}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{LEVEL_LABELS[level]}</span>
                  <span className="text-xs text-muted-foreground">({lvlMembers.length})</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lvlMembers.map(m => (
                    <div key={m.id} className="rounded-xl border border-border p-4 group relative" style={{ background: 'var(--gradient-card)' }}>
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mb-3 pr-16">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: `${LEVEL_COLORS[level]}20`, color: LEVEL_COLORS[level] }}>
                          {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Ações</div>
                          <div className="text-base font-black text-foreground">{m.actions_managed}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Execução</div>
                          <div className="text-base font-black" style={{ color: m.completion_rate >= 70 ? '#22c55e' : m.completion_rate >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {m.completion_rate}%
                          </div>
                        </div>
                      </div>
                      {m.municipality && (
                        <div className="mt-2 text-[10px] text-muted-foreground">{m.municipality} {m.macroregion_id ? `· ${m.macroregion_id}` : ''}</div>
                      )}
                      <div className="mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.status === 'ativo' ? 'bg-brand-green/15 text-brand-green' : 'bg-muted text-muted-foreground'}`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ranking */}
            {ranked.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-brand-amber" />
                  <span className="text-sm font-semibold text-foreground">Ranking de Desempenho</span>
                </div>
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--gradient-card)' }}>
                  {ranked.map((m, i) => (
                    <div key={m.id} className={`flex items-center gap-4 px-4 py-3 ${i < ranked.length - 1 ? 'border-b border-border' : ''}`}>
                      <span className={`text-sm font-black w-5 flex-shrink-0 ${i === 0 ? 'text-brand-amber' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-brand-amber/60' : 'text-muted-foreground/50'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.role}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${m.completion_rate}%`, backgroundColor: m.completion_rate >= 70 ? '#22c55e' : m.completion_rate >= 50 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-8 text-right">{m.completion_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
