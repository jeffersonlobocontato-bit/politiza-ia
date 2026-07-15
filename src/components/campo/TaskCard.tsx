import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2, Calendar, MoreHorizontal } from 'lucide-react';
import type { Task, TaskStatus } from '@/hooks/useTasks';
import { formatDue, getOverdueDays, STATUS_COLOR, STATUS_LABEL } from '@/lib/taskOverdue';
import { useUpdateTaskStatus } from '@/hooks/useTasks';

const ICONS: Record<TaskStatus, any> = {
  a_fazer: Clock,
  em_andamento: Loader2,
  bloqueado: AlertCircle,
  concluido: CheckCircle2,
};

interface Props {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: Props) {
  const overdue = getOverdueDays(task.due_date, task.status);
  const Icon = ICONS[task.status];
  const color = STATUS_COLOR[task.status];
  const update = useUpdateTaskStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  const nextStatus: TaskStatus | null =
    task.status === 'a_fazer' ? 'em_andamento'
    : task.status === 'em_andamento' ? 'concluido'
    : null;

  const nextLabel = useMemo(() => {
    if (!nextStatus) return null;
    return nextStatus === 'em_andamento' ? 'Iniciar' : 'Concluir';
  }, [nextStatus]);

  return (
    <div
      className="campo-card p-3 relative"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22`, border: `1px solid ${color}55` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
              {task.title}
            </p>
            {overdue > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: '#ef444422', color: '#F87171', border: '1px solid #ef444455' }}
              >
                ATRASADA {overdue}d
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--campo-text-mute)' }}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: 'var(--campo-text-mute)' }}>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ background: `${color}22`, color }}
            >
              {STATUS_LABEL[task.status]}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDue(task.due_date)}
            </span>
            {task.priority && task.priority !== 'normal' && (
              <span
                className="uppercase font-bold"
                style={{ color: task.priority === 'urgente' ? '#F87171' : task.priority === 'alta' ? '#F59E0B' : 'var(--campo-text-mute)' }}
              >
                {task.priority}
              </span>
            )}
          </div>
        </div>
      </div>

      {task.status !== 'concluido' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          {nextStatus && nextLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                update.mutate({ id: task.id, status: nextStatus });
              }}
              className="flex-1 h-8 rounded-md text-[11px] font-semibold text-white"
              style={{ background: 'var(--campo-grad-cta)' }}
            >
              {nextLabel}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="h-8 w-8 rounded-md flex items-center justify-center border border-white/10"
            style={{ color: 'var(--campo-text-mute)' }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {menuOpen && (
        <div
          className="absolute right-3 top-14 rounded-md border border-white/10 shadow-xl z-10"
          style={{ background: 'rgba(10,15,31,0.98)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {(['a_fazer', 'em_andamento', 'bloqueado', 'concluido'] as TaskStatus[])
            .filter(s => s !== task.status)
            .map(s => (
              <button
                key={s}
                onClick={() => { update.mutate({ id: task.id, status: s }); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-white/5"
                style={{ color: STATUS_COLOR[s] }}
              >
                Mover para {STATUS_LABEL[s]}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
