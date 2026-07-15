import { useState } from 'react';
import { ClipboardList, Plus, Search, MapPin, Calendar, User, Target, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { macroRegions, getStatusColor, getStatusLabel, getActionTypeLabel } from '@/data/mockData';
import { InfographicDonut, InfographicHBar, InfographicVBar } from '@/components/ui/InfographicCharts';
import { useActions, useCreateAction, useUpdateAction, useUpdateActionStatus, useDeleteAction } from '@/hooks/useActions';
import type { DbAction, DbActionStatus, DbActionType, DbPriorityLevel } from '@/types/database';
import ActionDetailSheet from '@/components/campo/ActionDetailSheet';

const STATUS_OPTIONS: DbActionStatus[] = ['prevista','confirmada','em_andamento','realizada','atrasada','cancelada','pendente_validacao'];
const TYPE_OPTIONS: { value: DbActionType; label: string }[] = [
  { value: 'reuniao_politica',       label: 'Reunião Política' },
  { value: 'visita_institucional',   label: 'Visita Institucional' },
  { value: 'mobilizacao_comunitaria',label: 'Mobilização Comunitária' },
  { value: 'adesivacao',             label: 'Adesivação' },
  { value: 'panfletagem',            label: 'Panfletagem' },
  { value: 'carreata',               label: 'Carreata' },
  { value: 'evento_regional',        label: 'Evento Regional' },
  { value: 'agenda_candidato',       label: 'Agenda Candidato' },
  { value: 'reuniao_empresarios',    label: 'Reunião Empresários' },
  { value: 'encontro_liderancas',    label: 'Encontro Lideranças' },
  { value: 'acao_digital',           label: 'Ação Digital' },
];
const PRIORITY_OPTIONS: { value: DbPriorityLevel; label: string; color: string }[] = [
  { value: 'critica', label: 'Crítica', color: '#ef4444' },
  { value: 'alta',    label: 'Alta',    color: '#f59e0b' },
  { value: 'media',   label: 'Média',   color: '#3b82f6' },
  { value: 'baixa',   label: 'Baixa',   color: '#6b7280' },
];

interface ActionForm {
  title: string;
  type: DbActionType;
  municipality: string;
  responsible: string;
  planned_date: string;
  planned_time: string;
  estimated_impact: string;
  macroregion_id: string;
  priority: DbPriorityLevel;
  description: string;
  target_audience: string;
}

const emptyForm = (): ActionForm => ({
  title: '',
  type: 'mobilizacao_comunitaria',
  municipality: '',
  responsible: '',
  planned_date: new Date().toISOString().split('T')[0],
  planned_time: '09:00',
  estimated_impact: '',
  macroregion_id: 'rmc',
  priority: 'media',
  description: '',
  target_audience: 'Público geral',
});

export default function Acoes() {
  const { data: actions = [], isLoading } = useActions();
  const createAction = useCreateAction();
  const updateAction = useUpdateAction();
  const updateStatus = useUpdateActionStatus();
  const deleteAction = useDeleteAction();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [macroFilter, setMacroFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActionForm>(emptyForm());
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = actions.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.title.toLowerCase().includes(q) || (a.municipality ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchMacro = macroFilter === 'all' || a.macroregion_id === macroFilter;
    return matchSearch && matchStatus && matchMacro;
  });

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = actions.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const updateForm = (key: keyof ActionForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (action: DbAction) => {
    setEditingId(action.id);
    setForm({
      title: action.title,
      type: action.type,
      municipality: action.municipality ?? '',
      responsible: action.responsible ?? '',
      planned_date: action.planned_date,
      planned_time: action.planned_time ?? '09:00',
      estimated_impact: String(action.estimated_impact),
      macroregion_id: action.macroregion_id ?? 'rmc',
      priority: action.priority,
      description: action.description ?? '',
      target_audience: action.target_audience ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title) return;
    const lat = -25.4244 + (Math.random() - 0.5) * 3;
    const lng = -49.2654 + (Math.random() - 0.5) * 5;
    if (editingId) {
      await updateAction.mutateAsync({
        id: editingId,
        title: form.title,
        type: form.type,
        municipality: form.municipality || null,
        responsible: form.responsible || null,
        planned_date: form.planned_date,
        planned_time: form.planned_time || null,
        estimated_impact: parseInt(form.estimated_impact) || 0,
        macroregion_id: form.macroregion_id || null,
        priority: form.priority,
        description: form.description || null,
        target_audience: form.target_audience || null,
      });
    } else {
      await createAction.mutateAsync({
        title: form.title,
        type: form.type,
        category: 'Campo',
        description: form.description || null,
        municipality: form.municipality || null,
        microregion: form.municipality || null,
        macroregion_id: form.macroregion_id || null,
        address: null,
        lat,
        lng,
        responsible: form.responsible || 'A definir',
        team: [],
        planned_date: form.planned_date,
        planned_time: form.planned_time || null,
        priority: form.priority,
        target_audience: form.target_audience || 'Público geral',
        estimated_impact: parseInt(form.estimated_impact) || 0,
        status: 'prevista',
        observations: null,
        executed_date: null,
        executed_people_count: null,
        evidence_photos: [],
        created_by: null,
        updated_by: null,
      });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleStatusChange = async (id: string, status: DbActionStatus) => {
    await updateStatus.mutateAsync({ id, status });
    setStatusMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta ação?')) return;
    await deleteAction.mutateAsync(id);
  };

  // ── Chart data ───────────────────────────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    prevista: '#3b82f6', confirmada: '#6366f1', em_andamento: '#f59e0b',
    realizada: '#22c55e', atrasada: '#ef4444', cancelada: '#6b7280', pendente_validacao: '#a855f7',
  };
  const STATUS_LABELS_MAP: Record<string, string> = {
    prevista: 'Prevista', confirmada: 'Confirmada', em_andamento: 'Em Andamento',
    realizada: 'Realizada', atrasada: 'Atrasada', cancelada: 'Cancelada', pendente_validacao: 'Pendente',
  };
  const statusChartData = STATUS_OPTIONS
    .map(s => ({ name: STATUS_LABELS_MAP[s] ?? s, value: statusCounts[s] ?? 0, color: STATUS_COLORS[s] }))
    .filter(d => d.value > 0);

  const typeCounts = TYPE_OPTIONS.reduce((acc, t) => {
    acc[t.value] = actions.filter(a => a.type === t.value).length;
    return acc;
  }, {} as Record<string, number>);
  const typeChartData = TYPE_OPTIONS
    .map(t => ({ name: t.label, value: typeCounts[t.value] ?? 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const macroCounts = macroRegions.map(m => ({
    name: m.name.replace('Macrorregião ', '').replace('Região ', ''),
    value: actions.filter(a => a.macroregion_id === m.id).length,
  })).filter(d => d.value > 0);

  return (
    <div className="h-full flex flex-col" onClick={() => setStatusMenuId(null)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Planejamento de Ações</h1>
            <p className="text-xs text-muted-foreground">
              {actions.length} ações · {actions.filter(a => a.status === 'realizada').length} realizadas
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Plus className="w-4 h-4" /> Nova Ação
        </button>
      </div>

      {/* ── Charts Panel ──────────────────────────────────────────────────────── */}
      {actions.length > 0 && (
        <div className="px-6 py-4 border-b border-border flex-shrink-0 bg-card/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfographicDonut
              title="Distribuição por Status"
              unit="ações"
              data={statusChartData}
              height={190}
            />
            <InfographicHBar
              title="Ações por Tipo"
              subtitle="top 8"
              data={typeChartData}
            />
            <InfographicHBar
              title="Ações por Macrorregião"
              data={macroCounts}
              accentColor="#0FFCBE"
            />
          </div>
        </div>
      )}

      {/* Status pills */}
      <div className="px-6 py-3 border-b border-border flex gap-2 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Todas ({actions.length})
        </button>
        {STATUS_OPTIONS.map(s => statusCounts[s] > 0 && (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border ${statusFilter === s ? 'text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
            style={statusFilter === s ? { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) } : { borderColor: `${getStatusColor(s)}40` }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(s) }} />
            {getStatusLabel(s)} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ação ou município..."
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={macroFilter}
          onChange={e => setMacroFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Todas as macrorregiões</option>
          {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mx-6 my-4 rounded-xl border border-primary/30 p-5 flex-shrink-0" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">{editingId ? 'Editar Ação' : 'Nova Ação'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground text-xs">Cancelar</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Título *</label>
              <input value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="Ex: Carreata Centro — Curitiba" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tipo</label>
              <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Município</label>
              <input value={form.municipality} onChange={e => updateForm('municipality', e.target.value)} placeholder="Curitiba" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Responsável</label>
              <input value={form.responsible} onChange={e => updateForm('responsible', e.target.value)} placeholder="Nome do coordenador" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => updateForm('priority', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Data Prevista</label>
              <input type="date" value={form.planned_date} onChange={e => updateForm('planned_date', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Hora</label>
              <input type="time" value={form.planned_time} onChange={e => updateForm('planned_time', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Meta de Impacto</label>
              <input type="number" value={form.estimated_impact} onChange={e => updateForm('estimated_impact', e.target.value)} placeholder="5000" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Macrorregião</label>
              <select value={form.macroregion_id} onChange={e => updateForm('macroregion_id', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
              <input value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Detalhes da ação..." className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.title || createAction.isPending || updateAction.isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {createAction.isPending || updateAction.isPending ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Ação'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando ações...</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(action => {
              const pColor = PRIORITY_OPTIONS.find(p => p.value === action.priority)?.color ?? '#6b7280';
              return (
                <div
                  key={action.id}
                  onClick={() => setDetailId(action.id)}
                  className="px-6 py-4 hover:bg-accent/30 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: getStatusColor(action.status) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{action.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: pColor, borderColor: `${pColor}40`, backgroundColor: `${pColor}15` }}>
                              {PRIORITY_OPTIONS.find(p => p.value === action.priority)?.label}
                            </span>
                            {/* Status dropdown */}
                            <div className="relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setStatusMenuId(statusMenuId === action.id ? null : action.id)}
                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: getStatusColor(action.status) }}
                              >
                                {getStatusLabel(action.status)}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {statusMenuId === action.id && (
                                <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-lg min-w-[180px] py-1">
                                  {STATUS_OPTIONS.map(s => (
                                    <button
                                      key={s}
                                      onClick={() => handleStatusChange(action.id, s)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                                    >
                                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(s) }} />
                                      {getStatusLabel(s)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" /> {action.municipality ?? '—'} · {action.macroregion_id ?? '—'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" /> {action.planned_date} {action.planned_time ? `às ${action.planned_time}` : ''}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" /> {action.responsible ?? '—'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Target className="w-3 h-3" /> ~{action.estimated_impact.toLocaleString()} impactados
                            </span>
                          </div>
                          {action.status === 'realizada' && action.executed_people_count && (
                            <div className="mt-1 text-xs text-brand-green font-medium">
                              ✓ Realizada — {action.executed_people_count.toLocaleString()} pessoas impactadas
                            </div>
                          )}
                          {action.observations && (
                            <div className="mt-1 text-xs text-brand-amber font-medium">⚠ {action.observations}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md hidden group-hover:block">
                            {TYPE_OPTIONS.find(t => t.value === action.type)?.label ?? action.type}
                          </span>
                          <button
                            onClick={() => openEdit(action)}
                            className="p-1.5 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(action.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma ação encontrada.</p>
            <button onClick={openNew} className="mt-3 text-xs text-primary hover:underline">Criar primeira ação</button>
          </div>
        )}
      </div>

      <ActionDetailSheet
        actionId={detailId}
        onClose={() => setDetailId(null)}
        onDelete={async () => {
          if (!detailId) return;
          const id = detailId;
          setDetailId(null);
          if (!confirm('Tem certeza que deseja remover esta ação?')) return;
          await deleteAction.mutateAsync(id);
        }}
      />
    </div>
  );
}
