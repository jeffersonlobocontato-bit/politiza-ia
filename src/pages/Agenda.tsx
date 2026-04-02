import { useState, useMemo, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, MapPin, User, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgendaEvents, type AgendaEvent } from '@/hooks/useAgenda';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ACTION_TYPE_LABELS: Record<string, string> = {
  reuniao_politica: 'Reunião Política',
  visita_institucional: 'Visita Institucional',
  mobilizacao_comunitaria: 'Mobilização',
  adesivacao: 'Adesivação',
  panfletagem: 'Panfletagem',
  carreata: 'Carreata',
  evento_regional: 'Evento Regional',
  agenda_candidato: 'Agenda Candidato',
  reuniao_empresarios: 'Reunião Empresários',
  encontro_liderancas: 'Encontro Lideranças',
  acao_digital: 'Ação Digital',
};

const STATUS_COLORS: Record<string, string> = {
  prevista: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  confirmada: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  em_andamento: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  realizada: 'bg-green-500/20 text-green-300 border-green-500/30',
  atrasada: 'bg-red-500/20 text-red-300 border-red-500/30',
  cancelada: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pendente_validacao: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const EVENT_TYPE_DOT: Record<string, string> = {
  action: 'bg-blue-400',
  tracking_round: 'bg-emerald-400',
  alert: 'bg-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  critica: 'bg-red-500',
  alta: 'bg-orange-500',
  media: 'bg-amber-500',
  baixa: 'bg-green-500',
};

const ACTION_TYPE_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'reuniao_politica', label: 'Reuniões' },
  { value: 'mobilizacao_comunitaria', label: 'Mobilização' },
  { value: 'agenda_candidato', label: 'Candidato' },
  { value: 'carreata', label: 'Carreata' },
  { value: 'evento_regional', label: 'Eventos' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'prevista', label: 'Prevista' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'realizada', label: 'Realizada' },
  { value: 'atrasada', label: 'Atrasada' },
];

export default function Agenda() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showLayers, setShowLayers] = useState({ actions: true, tracking: true, alerts: true });
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedEventId(prev => prev === id ? null : id);
  }, []);

  const { isAdmin } = useAuth();
  const { data, isLoading } = useAgendaEvents(currentMonth, currentYear);
  const events = data?.events ?? [];
  const scope = data?.scope;

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.type === 'action' && !showLayers.actions) return false;
      if (e.type === 'tracking_round' && !showLayers.tracking) return false;
      if (e.type === 'alert' && !showLayers.alerts) return false;
      if (filterType !== 'all' && e.type === 'action' && e.category !== filterType) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterType, filterStatus, showLayers]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth, currentYear]);

  const eventsForDate = (dateStr: string) => filteredEvents.filter(e => e.date === dateStr);

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  // Week view days
  const weekDays = useMemo(() => {
    const start = new Date(weekStart + 'T12:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };
  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const todayStr = now.toISOString().split('T')[0];

  const scopeLabel = scope?.level === 'regional' ? 'Região'
    : scope?.level === 'microrregional' ? 'Microrregião'
    : scope?.level === 'municipal' ? 'Município'
    : 'Visão Geral';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-400" />
            Agenda da Campanha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {scopeLabel} · {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} neste período
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(f => !f)}
              className={cn("border-border/50", showFilters && "bg-blue-500/20 border-blue-500/50")}
            >
              <Filter className="w-4 h-4 mr-1" /> Filtros
            </Button>
          )}
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="text-xs h-7"
            >
              Mês
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="text-xs h-7"
            >
              Semana
            </Button>
          </div>
        </div>
      </div>

      {/* Filters panel (admin only) */}
      {showFilters && isAdmin && (
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Camadas</div>
                <div className="flex gap-1.5">
                  {[
                    { key: 'actions' as const, label: 'Ações', dot: 'bg-blue-400' },
                    { key: 'tracking' as const, label: 'Tracking', dot: 'bg-emerald-400' },
                    { key: 'alerts' as const, label: 'Alertas', dot: 'bg-red-400' },
                  ].map(l => (
                    <button
                      key={l.key}
                      onClick={() => setShowLayers(s => ({ ...s, [l.key]: !s[l.key] }))}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all",
                        showLayers[l.key]
                          ? "bg-white/10 border-white/20 text-foreground"
                          : "bg-transparent border-border/30 text-muted-foreground opacity-50"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full", l.dot)} />
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Tipo de Ação</div>
                <div className="flex gap-1 flex-wrap">
                  {ACTION_TYPE_FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFilterType(f.value)}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs border transition-all",
                        filterType === f.value
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "border-border/30 text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Status</div>
                <div className="flex gap-1 flex-wrap">
                  {STATUS_FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFilterStatus(f.value)}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs border transition-all",
                        filterStatus === f.value
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "border-border/30 text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-2 bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={view === 'month' ? prevMonth : prevWeek} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base font-bold">
                {view === 'month'
                  ? `${MONTHS[currentMonth]} ${currentYear}`
                  : `Semana de ${new Date(weekStart + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`
                }
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={view === 'month' ? nextMonth : nextWeek} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {view === 'month' ? (
              <>
                <div className="grid grid-cols-7 gap-px mb-1">
                  {WEEKDAYS.map(wd => (
                    <div key={wd} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
                      {wd}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={i} className="h-20 bg-muted/10 rounded" />;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = eventsForDate(dateStr);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(dateStr)}
                        className={cn(
                          "h-20 rounded p-1 text-left transition-all relative group",
                          "hover:bg-white/10",
                          isToday && "ring-1 ring-blue-500/50",
                          isSelected && "bg-blue-500/15 ring-1 ring-blue-400/60",
                          !isToday && !isSelected && "bg-muted/5"
                        )}
                      >
                        <span className={cn(
                          "text-xs font-medium",
                          isToday ? "text-blue-400 font-bold" : "text-foreground/70"
                        )}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 4).map(e => (
                              <span
                                key={e.id}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  EVENT_TYPE_DOT[e.type],
                                  e.priority && PRIORITY_COLORS[e.priority]
                                )}
                                title={e.title}
                              />
                            ))}
                            {dayEvents.length > 4 && (
                              <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 4}</span>
                            )}
                          </div>
                        )}
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-0.5 left-1 right-1 overflow-hidden">
                            {dayEvents.slice(0, 2).map(e => (
                              <div
                                key={e.id}
                                className={cn(
                                  "text-[8px] leading-tight truncate rounded px-0.5",
                                  e.type === 'action' ? "text-blue-300" : e.type === 'tracking_round' ? "text-emerald-300" : "text-red-300"
                                )}
                              >
                                {e.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Week view */
              <div className="space-y-1">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((dateStr, i) => {
                    const d = new Date(dateStr + 'T12:00:00');
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const dayEvents = eventsForDate(dateStr);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={cn(
                          "rounded-lg p-2 text-center transition-all min-h-[160px] flex flex-col",
                          isToday && "ring-1 ring-blue-500/50",
                          isSelected && "bg-blue-500/15 ring-1 ring-blue-400/60",
                          "hover:bg-white/10 bg-muted/5"
                        )}
                      >
                        <div className="text-[10px] text-muted-foreground uppercase">{WEEKDAYS[i]}</div>
                        <div className={cn("text-lg font-bold", isToday ? "text-blue-400" : "text-foreground/80")}>
                          {d.getDate()}
                        </div>
                        <div className="flex-1 space-y-0.5 mt-1">
                          {dayEvents.slice(0, 5).map(e => (
                            <div
                              key={e.id}
                              className={cn(
                                "text-[9px] leading-tight truncate rounded px-1 py-0.5",
                                e.type === 'action' ? "bg-blue-500/15 text-blue-300"
                                  : e.type === 'tracking_round' ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-red-500/15 text-red-300"
                              )}
                            >
                              {e.time ? `${e.time.slice(0, 5)} ` : ''}{e.title}
                            </div>
                          ))}
                          {dayEvents.length > 5 && (
                            <div className="text-[8px] text-muted-foreground">+{dayEvents.length - 5} mais</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <List className="w-4 h-4 text-blue-400" />
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'Selecione um dia'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
            {!selectedDate && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Clique em um dia do calendário para ver os eventos
              </p>
            )}
            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento neste dia
              </p>
            )}
            {selectedEvents.map(e => (
              <div
                key={e.id}
                className={cn(
                  "rounded-lg border p-3 space-y-2 transition-all hover:bg-white/5",
                  e.type === 'action' ? "border-blue-500/20"
                    : e.type === 'tracking_round' ? "border-emerald-500/20"
                    : "border-red-500/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{e.title}</div>
                    {e.category && (
                      <div className="text-[10px] text-muted-foreground">
                        {ACTION_TYPE_LABELS[e.category] ?? e.category}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {e.priority && (
                      <span className={cn("w-2 h-2 rounded-full", PRIORITY_COLORS[e.priority])} />
                    )}
                    {e.status && (
                      <Badge variant="outline" className={cn("text-[9px] h-5 border", STATUS_COLORS[e.status] ?? 'border-border/30')}>
                        {e.status?.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  {e.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {e.time.slice(0, 5)}
                    </span>
                  )}
                  {e.municipality && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {e.municipality}
                    </span>
                  )}
                  {e.responsible && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {e.responsible}
                    </span>
                  )}
                </div>

                {e.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                )}

                {e.type === 'tracking_round' && e.endDate && (
                  <div className="text-[10px] text-emerald-400">
                    Período: {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(e.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Ações</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Tracking</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Alertas</span>
        {scope && scope.level !== 'admin' && (
          <span className="ml-auto text-amber-400/80">
            🔒 Filtrado por {scopeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
