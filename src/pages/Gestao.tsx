import { useMemo, useState } from 'react';
import {
  LayoutGrid, CheckSquare, BarChart2, Plus, X, AlertCircle, Clock, CheckCircle2, Loader2,
  Calendar, Users, TrendingUp, Flag, Trash2, ChevronDown, Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import {
  useTasks, useCreateTask, useUpdateTaskStatus, useDeleteTask,
  type Task, type TaskStatus, type TaskArea, type TaskPriority, type CreateTaskInput, type TaskScope,
} from '@/hooks/useTasks';
import {
  useTodayCheckins, useMyCheckinToday, useCreateCheckin, useWeekCheckins,
} from '@/hooks/useCheckins';
import { useAssignableTeam, useMyCampaignMember } from '@/hooks/useAssignableTeam';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ── Constantes de UI (apenas tokens semânticos) ──────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; icon: any; accent: string; chip: string }[] = [
  { id: 'a_fazer',      label: 'A fazer',      icon: Clock,        accent: 'bg-muted/40 text-muted-foreground border-border',           chip: 'bg-muted text-foreground' },
  { id: 'em_andamento', label: 'Em andamento', icon: Loader2,      accent: 'bg-primary/15 text-primary border-primary/30',              chip: 'bg-primary/20 text-primary' },
  { id: 'bloqueado',    label: 'Bloqueado',    icon: AlertCircle,  accent: 'bg-destructive/15 text-destructive border-destructive/30',  chip: 'bg-destructive/20 text-destructive' },
  { id: 'concluido',    label: 'Concluído',    icon: CheckCircle2, accent: 'bg-secondary/15 text-secondary border-secondary/30',        chip: 'bg-secondary/20 text-secondary' },
];

const AREA_LABELS: Record<TaskArea, string> = {
  central: 'Central', regional: 'Regional', partidario: 'Partidário',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baixa: 'Baixa',
};

function priorityVariant(p: TaskPriority): 'destructive' | 'default' | 'secondary' | 'outline' {
  if (p === 'urgente') return 'destructive';
  if (p === 'alta') return 'default';
  if (p === 'normal') return 'secondary';
  return 'outline';
}

function areaVariant(a: TaskArea): 'default' | 'secondary' | 'outline' {
  if (a === 'central') return 'default';
  if (a === 'regional') return 'secondary';
  return 'outline';
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isOverdue(d: string | null, status: TaskStatus) {
  if (!d || status === 'concluido') return false;
  const dt = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dt < today;
}

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function Gestao() {
  const { user, profile, roles } = useAuth();
  const { activeCandidate, allActiveCandidates } = useCandidate();
  const isAdminMaster = !!roles?.includes('admin_master' as any);

  // Escopo de visualização
  const [scope, setScope] = useState<TaskScope>('active');
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(scope);
  const { data: checkinsToday = [] } = useTodayCheckins(scope);
  const { data: weekCheckins = [] } = useWeekCheckins(scope);
  const { data: myCheckin } = useMyCheckinToday();

  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const createCheckin = useCreateCheckin();

  const [modalOpen, setModalOpen] = useState(false);

  // Posição hierárquica do usuário no candidato ativo (define quem ele pode delegar)
  const { data: myMember } = useMyCampaignMember(activeCandidate?.id ?? null);
  const canDelegate = isAdminMaster || !!myMember;
  const cannotDelegateReason = !canDelegate
    ? 'Você não possui posição na hierarquia da equipe deste candidato para delegar tarefas.'
    : null;

  // Métricas
  const counts = useMemo(() => {
    const by: Record<TaskStatus, number> = { a_fazer: 0, em_andamento: 0, bloqueado: 0, concluido: 0 };
    let overdue = 0;
    tasks.forEach(t => {
      by[t.status]++;
      if (isOverdue(t.due_date, t.status)) overdue++;
    });
    return { ...by, overdue, total: tasks.length };
  }, [tasks]);

  const areaData = useMemo(() => (
    (['central', 'regional', 'partidario'] as TaskArea[]).map(a => ({
      name: AREA_LABELS[a],
      total: tasks.filter(t => t.area === a).length,
    }))
  ), [tasks]);

  const statusData = useMemo(() => COLUMNS.map(c => ({
    name: c.label,
    value: counts[c.id],
    id: c.id,
  })), [counts]);

  const STATUS_COLORS = ['hsl(var(--muted-foreground))', 'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

  // Workload por pessoa (top 6)
  const workload = useMemo(() => {
    const map = new Map<string, { name: string; by: Record<TaskStatus, number>; total: number }>();
    tasks.forEach(t => {
      const key = t.assigned_name || 'Sem responsável';
      if (!map.has(key)) map.set(key, { name: key, by: { a_fazer: 0, em_andamento: 0, bloqueado: 0, concluido: 0 }, total: 0 });
      const row = map.get(key)!;
      row.by[t.status]++; row.total++;
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 6);
  }, [tasks]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gradient">Gestão de Equipe</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {scope === 'all' && isAdminMaster
                  ? 'Visão consolidada de todos os candidatos'
                  : activeCandidate
                    ? <>Equipe de <span className="text-foreground font-medium">{activeCandidate.name}</span></>
                    : 'Selecione um candidato ativo'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdminMaster && (
              <Select value={scope} onValueChange={(v) => setScope(v as TaskScope)}>
                <SelectTrigger className="w-[260px] bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Candidato ativo</SelectItem>
                  <SelectItem value="all">Todos os candidatos</SelectItem>
                  {allActiveCandidates.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={cannotDelegateReason ? 0 : -1}>
                    <Button onClick={() => setModalOpen(true)} className="gap-2" disabled={!canDelegate}>
                      <Plus className="w-4 h-4" /> Nova tarefa
                    </Button>
                  </span>
                </TooltipTrigger>
                {cannotDelegateReason && (
                  <TooltipContent className="max-w-xs">{cannotDelegateReason}</TooltipContent>
                )}
              </UITooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Clock} label="A fazer"       value={counts.a_fazer}      tone="muted" />
          <KpiCard icon={Loader2} label="Em andamento" value={counts.em_andamento} tone="primary" />
          <KpiCard icon={AlertCircle} label="Bloqueado" value={counts.bloqueado}  tone="destructive" />
          <KpiCard icon={CheckCircle2} label="Concluído" value={counts.concluido} tone="secondary" />
          <KpiCard icon={Flag} label="Atrasadas"       value={counts.overdue}     tone="destructive" />
          <KpiCard icon={Users} label="Check-ins hoje"  value={checkinsToday.length} tone="accent" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="w-4 h-4" /> Kanban</TabsTrigger>
            <TabsTrigger value="checkins" className="gap-2"><CheckSquare className="w-4 h-4" /> Check-ins</TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-2"><BarChart2 className="w-4 h-4" /> Relatório</TabsTrigger>
          </TabsList>

          {/* Kanban */}
          <TabsContent value="kanban" className="space-y-6">
            {/* Sprint overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Status overview</h3>
                </div>
                <div className="h-[180px] flex items-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-1/2 space-y-2 text-xs">
                    {statusData.map((s, i) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[i] }} />
                          <span className="text-muted-foreground truncate">{s.name}</span>
                        </div>
                        <span className="font-bold tabular-nums">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-sm">Carga por área</h3>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer>
                    <BarChart data={areaData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.4)' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm">Carga por pessoa</h3>
                </div>
                <ul className="space-y-2 text-xs">
                  {workload.length === 0 && <li className="text-muted-foreground">Nenhuma tarefa atribuída</li>}
                  {workload.map(p => (
                    <li key={p.name} className="flex items-center gap-3">
                      <Avatar className="w-7 h-7"><AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="flex gap-1 mt-1">
                          {COLUMNS.map(c => {
                            const n = p.by[c.id];
                            if (!n) return null;
                            return <span key={c.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.chip}`}>{n}</span>;
                          })}
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{p.total}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map(col => {
                const list = tasks.filter(t => t.status === col.id);
                const Icon = col.icon;
                return (
                  <div key={col.id} className="flex flex-col gap-3">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${col.accent}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="w-4 h-4" />
                        {col.label}
                      </div>
                      <span className="text-xs font-bold tabular-nums bg-background/40 px-2 py-0.5 rounded">{list.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[120px]">
                      {tasksLoading && <div className="text-xs text-muted-foreground p-3">Carregando...</div>}
                      {!tasksLoading && list.length === 0 && (
                        <div className="text-xs text-muted-foreground/60 italic p-3 text-center border border-dashed border-border rounded-lg">
                          Sem tarefas
                        </div>
                      )}
                      {list.map(t => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          canDelete={isAdminMaster || t.created_by === user?.id}
                          onChangeStatus={(s) => updateStatus.mutate({ id: t.id, status: s })}
                          onDelete={() => deleteTask.mutate(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Check-ins */}
          <TabsContent value="checkins" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MyCheckinCard
                myCheckin={myCheckin}
                onSubmit={(p) => createCheckin.mutate({ ...p, user_name: profile?.full_name ?? undefined })}
                loading={createCheckin.isPending}
              />
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Check-ins de hoje · {checkinsToday.length}</h3>
                {checkinsToday.length === 0 && (
                  <Card className="p-8 text-center text-sm text-muted-foreground bg-card border-border">
                    Ninguém fez check-in hoje ainda.
                  </Card>
                )}
                {checkinsToday.map(c => (
                  <Card key={c.id} className="p-4 bg-card border-border">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9"><AvatarFallback>{initials(c.user_name)}</AvatarFallback></Avatar>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">{c.user_name ?? 'Membro da equipe'}</div>
                          <div className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <CheckinLine label="Entreguei" text={c.delivered} tone="text-secondary" />
                        <CheckinLine label="Vou fazer" text={c.planned} tone="text-primary" />
                        {c.blocked && <CheckinLine label="Bloqueio" text={c.blocked} tone="text-destructive" />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Relatório */}
          <TabsContent value="relatorio" className="space-y-4">
            <Card className="p-5 bg-card border-border">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Atividade dos últimos 7 dias
              </h3>
              <WeekHeatmap checkins={weekCheckins} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New task modal */}
      <NewTaskDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        isAdminMaster={isAdminMaster}
        defaultCandidateId={scope === 'all' || scope === 'active' ? activeCandidate?.id ?? null : scope}
        candidates={allActiveCandidates}
        onCreate={(input) => createTask.mutateAsync(input)}
        loading={createTask.isPending}
      />
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'primary'|'secondary'|'destructive'|'accent'|'muted' }) {
  const toneMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary ring-primary/20',
    secondary: 'bg-secondary/10 text-secondary ring-secondary/20',
    destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
    accent: 'bg-accent/20 text-accent-foreground ring-accent/30',
    muted: 'bg-muted/30 text-muted-foreground ring-border',
  };
  return (
    <Card className="p-4 bg-card border-border">
      <div className={`w-9 h-9 rounded-lg ring-1 flex items-center justify-center mb-3 ${toneMap[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </Card>
  );
}

function TaskCard({ task, canDelete, onChangeStatus, onDelete }: {
  task: Task; canDelete: boolean;
  onChangeStatus: (s: TaskStatus) => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(task.due_date, task.status);
  return (
    <Card className="p-3 bg-card border-border hover:border-primary/40 transition-colors group">
      <div className="flex items-start gap-2 mb-2">
        <Avatar className="w-7 h-7 mt-0.5">
          <AvatarFallback className="text-[10px]">{initials(task.assigned_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-snug">{task.title}</div>
          {task.assigned_name && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{task.assigned_name}</div>
          )}
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            aria-label="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Badge variant={areaVariant(task.area)} className="text-[10px] h-5 px-1.5">{AREA_LABELS[task.area]}</Badge>
        <Badge variant={priorityVariant(task.priority)} className="text-[10px] h-5 px-1.5">{PRIORITY_LABELS[task.priority]}</Badge>
        {task.due_date && (
          <span className={`text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${overdue ? 'bg-destructive/15 text-destructive' : 'bg-muted/40 text-muted-foreground'}`}>
            <Calendar className="w-3 h-3" /> {fmtDate(task.due_date)}
          </span>
        )}
      </div>

      <Select value={task.status} onValueChange={(v) => onChangeStatus(v as TaskStatus)}>
        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Card>
  );
}

function CheckinLine({ label, text, tone }: { label: string; text: string; tone: string }) {
  return (
    <div className="text-xs">
      <span className={`font-bold uppercase tracking-wider text-[10px] ${tone}`}>{label}</span>
      <p className="text-foreground/80 whitespace-pre-wrap mt-0.5">{text}</p>
    </div>
  );
}

function MyCheckinCard({ myCheckin, onSubmit, loading }: {
  myCheckin: any; onSubmit: (p: { delivered: string; planned: string; blocked?: string }) => void; loading: boolean;
}) {
  const [delivered, setDelivered] = useState(myCheckin?.delivered ?? '');
  const [planned, setPlanned] = useState(myCheckin?.planned ?? '');
  const [blocked, setBlocked] = useState(myCheckin?.blocked ?? '');
  return (
    <Card className="p-5 bg-card border-border h-fit">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-primary" /> Meu check-in de hoje
      </h3>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-secondary">O que entreguei</Label>
          <Textarea value={delivered} onChange={e => setDelivered(e.target.value)} rows={2} className="mt-1 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-primary">O que vou fazer</Label>
          <Textarea value={planned} onChange={e => setPlanned(e.target.value)} rows={2} className="mt-1 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-destructive">Bloqueios (opcional)</Label>
          <Textarea value={blocked} onChange={e => setBlocked(e.target.value)} rows={2} className="mt-1 text-sm" />
        </div>
        <Button
          onClick={() => onSubmit({ delivered, planned, blocked: blocked || undefined })}
          disabled={loading || !delivered.trim() || !planned.trim()}
          className="w-full"
        >
          {loading ? 'Salvando...' : myCheckin ? 'Atualizar check-in' : 'Enviar check-in'}
        </Button>
      </div>
    </Card>
  );
}

function WeekHeatmap({ checkins }: { checkins: any[] }) {
  const days: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    days.push({
      date: iso,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      count: checkins.filter(c => c.checkin_date === iso).length,
    });
  }
  const max = Math.max(1, ...days.map(d => d.count));
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(d => {
        const intensity = d.count / max;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <div
              className="w-full aspect-square rounded-lg border border-border flex items-center justify-center text-lg font-bold tabular-nums"
              style={{ background: `hsl(var(--primary) / ${0.08 + intensity * 0.6})` }}
            >
              {d.count}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function NewTaskDialog({ open, onClose, isAdminMaster, defaultCandidateId, candidates, onCreate, loading }: {
  open: boolean; onClose: () => void; isAdminMaster: boolean;
  defaultCandidateId: string | null;
  candidates: { id: string; name: string }[];
  onCreate: (input: CreateTaskInput) => Promise<unknown>; loading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState<TaskArea>('central');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [candidateId, setCandidateId] = useState<string | null>(defaultCandidateId);
  const [assigneeId, setAssigneeId] = useState<string>('none');

  const { data: team = [], isLoading: teamLoading } = useAssignableTeam(candidateId);
  const { data: myMember } = useMyCampaignMember(candidateId);

  // Agrupa por nível hierárquico para exibir como grupos no Select
  const groupedTeam = useMemo(() => {
    const groups = new Map<number, typeof team>();
    team.forEach(m => {
      const lvl = m.hierarchy_level ?? 99;
      if (!groups.has(lvl)) groups.set(lvl, [] as any);
      groups.get(lvl)!.push(m);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [team]);

  const levelLabel = (lvl: number) => {
    if (lvl >= 99) return 'Outros';
    const names = ['', 'Nível 1 · Direção', 'Nível 2 · Coordenação Geral', 'Nível 3 · Coordenação Regional', 'Nível 4 · Coordenação Municipal', 'Nível 5 · Coordenação Local', 'Nível 6 · Operacional'];
    return names[lvl] ?? `Nível ${lvl}`;
  };

  // Reset when modal opens
  const handleClose = () => {
    setTitle(''); setDescription(''); setArea('central'); setPriority('normal');
    setDueDate(''); setCandidateId(defaultCandidateId); setAssigneeId('none');
    onClose();
  };

  const submit = () => {
    if (!title.trim()) return;
    const assignee = team.find(m => m.id === assigneeId);
    onCreate({
      title: title.trim(),
      description: description.trim() || null,
      area, priority,
      due_date: dueDate || null,
      candidate_id: candidateId,
      assigned_to: assignee?.user_id ?? null,
      assigned_name: assignee?.name ?? null,
    }).then(handleClose);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>

        {/* Quem está delegando */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          {isAdminMaster ? (
            <span><span className="text-muted-foreground">Delegando como</span> <strong className="text-primary">Admin Master</strong> · pode delegar para qualquer equipe.</span>
          ) : myMember ? (
            <span>
              <span className="text-muted-foreground">Delegando como</span>{' '}
              <strong className="text-foreground">{myMember.name}</strong>
              {myMember.role && <span className="text-muted-foreground"> · {myMember.role}</span>}
              {myMember.hierarchy_level && <span className="text-muted-foreground"> · Nível {myMember.hierarchy_level}</span>}
            </span>
          ) : (
            <span className="text-destructive">Você não possui posição na hierarquia deste candidato.</span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Validar peça de campanha" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          {isAdminMaster && candidates.length > 1 && (
            <div>
              <Label className="text-xs">Candidato (delegação)</Label>
              <Select value={candidateId ?? ''} onValueChange={(v) => { setCandidateId(v || null); setAssigneeId('none'); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {candidates.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Área</Label>
              <Select value={area} onValueChange={(v) => setArea(v as TaskArea)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(AREA_LABELS) as TaskArea[]).map(a => <SelectItem key={a} value={a}>{AREA_LABELS[a]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prazo</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>Delegar a (subordinado)</span>
                <span className="text-[10px] text-muted-foreground font-normal">{team.length} disponível{team.length === 1 ? '' : 'is'}</span>
              </Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={!candidateId}>
                <SelectTrigger>
                  <SelectValue placeholder={candidateId ? 'Selecione um subordinado' : 'Escolha um candidato'} />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {teamLoading && <div className="px-2 py-1.5 text-xs text-muted-foreground">Carregando hierarquia...</div>}
                  {!teamLoading && team.length === 0 && candidateId && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      Você não possui subordinados cadastrados neste candidato para delegar.
                    </div>
                  )}
                  {groupedTeam.map(([lvl, members]) => (
                    <div key={lvl}>
                      <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {levelLabel(lvl)}
                      </div>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="font-medium">{m.name}</span>
                          {m.role && <span className="text-muted-foreground"> · {m.role}</span>}
                          {m.municipality && <span className="text-muted-foreground"> · {m.municipality}</span>}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || !title.trim()}>{loading ? 'Criando...' : 'Criar tarefa'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
