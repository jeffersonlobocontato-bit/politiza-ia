import { useState } from 'react';
import { ClipboardList, Plus, Search, MapPin, Calendar, User, Target } from 'lucide-react';
import { getStatusColor, getStatusLabel, getActionTypeLabel, macroRegions } from '@/data/mockData';
import type { ActionStatus } from '@/data/mockData';
import { useCampaign } from '@/contexts/CampaignContext';

const statusOptions: ActionStatus[] = ['prevista', 'confirmada', 'em_andamento', 'realizada', 'atrasada', 'cancelada', 'pendente_validacao'];
const priorityColors: Record<string, string> = { critica: '#ef4444', alta: '#f59e0b', media: '#3b82f6', baixa: '#6b7280' };
const priorityLabels: Record<string, string> = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

interface NewActionForm {
  title: string;
  municipality: string;
  responsible: string;
  plannedDate: string;
  plannedTime: string;
  estimatedImpact: string;
  macroregion: string;
}

export default function Acoes() {
  const { actions, addAction } = useCampaign();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [macroFilter, setMacroFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewActionForm>({
    title: '',
    municipality: '',
    responsible: '',
    plannedDate: new Date().toISOString().split('T')[0],
    plannedTime: '09:00',
    estimatedImpact: '',
    macroregion: 'rmc',
  });

  const filtered = actions.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.municipality.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchMacro = macroFilter === 'all' || a.macroregion === macroFilter;
    return matchSearch && matchStatus && matchMacro;
  });

  const statusCounts = statusOptions.reduce((acc, s) => {
    acc[s] = actions.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const updateForm = (key: keyof NewActionForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleAddAction = () => {
    if (!form.title) return;
    // Random Paraná coords when not provided
    const lat = -25.4244 + (Math.random() - 0.5) * 3;
    const lng = -49.2654 + (Math.random() - 0.5) * 5;
    addAction({
      title: form.title,
      type: 'mobilizacao_comunitaria',
      category: 'Campo',
      description: '',
      municipality: form.municipality || 'Paraná',
      microregion: form.municipality || 'Paraná',
      macroregion: form.macroregion,
      address: '',
      lat,
      lng,
      responsible: form.responsible || 'A definir',
      team: [],
      plannedDate: form.plannedDate,
      plannedTime: form.plannedTime,
      priority: 'media',
      targetAudience: 'Público geral',
      estimatedImpact: parseInt(form.estimatedImpact) || 0,
      status: 'prevista',
    });
    setShowForm(false);
    setForm({
      title: '', municipality: '', responsible: '',
      plannedDate: new Date().toISOString().split('T')[0],
      plannedTime: '09:00', estimatedImpact: '', macroregion: 'rmc',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Planejamento de Ações</h1>
            <p className="text-xs text-muted-foreground">{actions.length} ações cadastradas — {actions.filter(a => a.status === 'realizada').length} realizadas</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Plus className="w-4 h-4" />
          Nova Ação
        </button>
      </div>

      {/* Status summary pills */}
      <div className="px-6 py-3 border-b border-border flex gap-2 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Todas ({actions.length})
        </button>
        {statusOptions.map(s => (
          statusCounts[s] > 0 && (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border ${statusFilter === s ? 'text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
              style={statusFilter === s ? { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) } : { borderColor: `${getStatusColor(s)}40` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(s) }} />
              {getStatusLabel(s)} ({statusCounts[s]})
            </button>
          )
        ))}
      </div>

      {/* Filters row */}
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

      {/* New Action Form */}
      {showForm && (
        <div className="mx-6 my-4 rounded-xl border border-primary/30 p-5 animate-fade-in flex-shrink-0" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Nova Ação</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xs">Cancelar</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Título da Ação *</label>
              <input
                value={form.title}
                onChange={e => updateForm('title', e.target.value)}
                placeholder="Ex: Carreata Centro - Curitiba"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Município</label>
              <input
                value={form.municipality}
                onChange={e => updateForm('municipality', e.target.value)}
                placeholder="Curitiba"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Responsável</label>
              <input
                value={form.responsible}
                onChange={e => updateForm('responsible', e.target.value)}
                placeholder="Nome do coordenador"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Data Prevista</label>
              <input
                type="date"
                value={form.plannedDate}
                onChange={e => updateForm('plannedDate', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Hora Prevista</label>
              <input
                type="time"
                value={form.plannedTime}
                onChange={e => updateForm('plannedTime', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Meta Estimada</label>
              <input
                type="number"
                value={form.estimatedImpact}
                onChange={e => updateForm('estimatedImpact', e.target.value)}
                placeholder="5000"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Macrorregião</label>
              <select
                value={form.macroregion}
                onChange={e => updateForm('macroregion', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleAddAction}
              disabled={!form.title}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
            >
              Cadastrar Ação
            </button>
          </div>
        </div>
      )}

      {/* Actions List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {filtered.map(action => (
            <div key={action.id} className="px-6 py-4 hover:bg-accent/30 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: getStatusColor(action.status) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{action.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: priorityColors[action.priority], borderColor: `${priorityColors[action.priority]}40`, backgroundColor: `${priorityColors[action.priority]}15` }}>
                          {priorityLabels[action.priority]}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getStatusColor(action.status) }}>
                          {getStatusLabel(action.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {action.municipality} · {action.macroregion}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" /> {action.plannedDate} às {action.plannedTime}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" /> {action.responsible}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="w-3 h-3" /> ~{action.estimatedImpact.toLocaleString()} impactados
                        </span>
                      </div>
                      {action.status === 'realizada' && action.executedPeopleCount && (
                        <div className="mt-1 text-xs text-brand-green font-medium">
                          ✓ Realizada — {action.executedPeopleCount.toLocaleString()} pessoas impactadas ({action.executedDate})
                        </div>
                      )}
                      {action.observations && (
                        <div className="mt-1 text-xs text-brand-amber font-medium">
                          ⚠ {action.observations}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                      {getActionTypeLabel(action.type)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma ação encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
