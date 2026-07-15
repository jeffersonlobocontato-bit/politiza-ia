/** Utilitários para status/atraso de tarefas no app de campo. */
import type { TaskStatus } from '@/hooks/useTasks';

export function getOverdueDays(dueDate: string | null | undefined, status: TaskStatus): number {
  if (!dueDate || status === 'concluido') return 0;
  const due = new Date(dueDate + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

export function isOverdue(dueDate: string | null | undefined, status: TaskStatus): boolean {
  return getOverdueDays(dueDate, status) > 0;
}

export function formatDue(dueDate: string | null | undefined): string {
  if (!dueDate) return 'sem prazo';
  const d = new Date(dueDate + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  a_fazer: '#8FA0BE',
  em_andamento: '#5BA0FF',
  bloqueado: '#F59E0B',
  concluido: '#2FA85A',
};
