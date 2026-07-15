import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Bell, BellOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskStatus } from '@/hooks/useTasks';
import { TaskCard } from '@/components/campo/TaskCard';
import { getOverdueDays, STATUS_LABEL } from '@/lib/taskOverdue';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';

const ORDER: TaskStatus[] = ['a_fazer', 'em_andamento', 'bloqueado', 'concluido'];

export default function CampoTarefas() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const push = usePushSubscription();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['campo-my-tasks', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select('*')
        .eq('assigned_to', user!.id)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: 15_000,
  });

  const selectedId = params.get('task');
  const selected = useMemo(() => tasks.find(t => t.id === selectedId) ?? null, [tasks, selectedId]);

  const groups = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { a_fazer: [], em_andamento: [], bloqueado: [], concluido: [] };
    tasks.forEach(t => { map[t.status].push(t); });
    return map;
  }, [tasks]);

  const overdueCount = useMemo(
    () => tasks.filter(t => getOverdueDays(t.due_date, t.status) > 0).length,
    [tasks],
  );

  async function handleEnablePush() {
    const r = await push.enable();
    if (r.ok) toast.success('Notificações ativadas!');
    else if (r.reason === 'denied') toast.error('Permissão negada. Habilite nas configurações do navegador.');
    else if (r.reason === 'unsupported') toast.error('Seu dispositivo não suporta notificações web push.');
    else toast.error('Falha ao ativar notificações.');
  }

  return (
    <div className="campo-screen">
      <div className="campo-page-header">
        <Link to="/campo" className="campo-icon-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(91,160,255,0.15)', border: '1px solid rgba(91,160,255,0.35)' }}
        >
          <ClipboardList className="w-4 h-4" style={{ color: '#5BA0FF' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1>Minhas Tarefas</h1>
          <p>
            {tasks.length} atribuída{tasks.length === 1 ? '' : 's'}
            {overdueCount > 0 && <span style={{ color: '#F87171' }}> · {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 pb-24 space-y-4">
        {/* Push permission banner */}
        {push.supported && push.permission !== 'granted' && (
          <button
            onClick={handleEnablePush}
            disabled={push.busy}
            className="w-full campo-card p-3 flex items-center gap-3 text-left"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(47,168,90,0.15)', border: '1px solid rgba(47,168,90,0.35)' }}
            >
              <Bell className="w-5 h-5" style={{ color: 'var(--campo-mint-glow)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">Ativar alertas de tarefas</p>
              <p className="text-[11px]" style={{ color: 'var(--campo-text-mute)' }}>
                Receba notificação ao ser designado e lembretes diários (07h) de tarefas atrasadas.
              </p>
            </div>
          </button>
        )}
        {push.supported && push.permission === 'granted' && push.subscribed && (
          <button
            onClick={() => push.disable()}
            className="w-full text-left flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg"
            style={{ color: 'var(--campo-text-mute)', border: '1px solid var(--campo-line)' }}
          >
            <BellOff className="w-3.5 h-3.5" /> Notificações ativas — clique para desativar neste dispositivo
          </button>
        )}

        {isLoading && <div className="text-xs text-white/60">Carregando...</div>}

        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--campo-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--campo-text-mute)' }}>
              Nenhuma tarefa atribuída a você ainda.
            </p>
          </div>
        )}

        {ORDER.map(status => {
          const list = groups[status];
          if (list.length === 0) return null;
          return (
            <section key={status} className="space-y-2">
              <h3 className="campo-h2">{STATUS_LABEL[status]} · {list.length}</h3>
              <div className="space-y-2">
                {list.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onClick={() => setParams(prev => { const p = new URLSearchParams(prev); p.set('task', t.id); return p; })}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setParams(prev => { const p = new URLSearchParams(prev); p.delete('task'); return p; })}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" style={{ background: 'rgba(10,15,31,0.98)', borderTop: '1px solid var(--campo-line)' }}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 mt-4 text-sm text-white/90">
                {selected.description && (
                  <p style={{ color: 'var(--campo-text-mute)' }}>{selected.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Info label="Status" value={STATUS_LABEL[selected.status]} />
                  <Info label="Prioridade" value={(selected.priority ?? '').toUpperCase()} />
                  <Info label="Área" value={selected.area ?? '—'} />
                  <Info label="Prazo" value={selected.due_date ? new Date(selected.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                </div>
                {getOverdueDays(selected.due_date, selected.status) > 0 && (
                  <div className="rounded-lg p-3" style={{ background: '#ef444422', border: '1px solid #ef444455', color: '#F87171' }}>
                    Esta tarefa está atrasada há {getOverdueDays(selected.due_date, selected.status)} dia(s). Você receberá lembretes diários até concluí-la.
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="campo-card p-2">
      <div className="text-[9px] uppercase" style={{ color: 'var(--campo-text-faint)' }}>{label}</div>
      <div className="text-xs font-semibold text-white mt-0.5">{value}</div>
    </div>
  );
}
