import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notif {
  id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  report_id: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const navigate = useNavigate();

  async function load() {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('notifications').select('*')
      .order('created_at', { ascending: false }).limit(15);
    setItems(data ?? []);
  }

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`notif-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load(),
      ).subscribe();
    const t = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [user?.id]);

  const unread = items.filter(i => !i.is_read).length;

  async function open(n: Notif) {
    if (!n.is_read) {
      await (supabase as any).from('notifications').update({ is_read: true }).eq('id', n.id);
      setItems(prev => prev.map(p => p.id === n.id ? { ...p, is_read: true } : p));
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    if (!user) return;
    await (supabase as any).from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
    setItems(prev => prev.map(p => ({ ...p, is_read: true })));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-full bg-status-error text-white text-[9px] font-bold">
              {unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold">Notificações</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-[10px] text-primary hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Sem notificações</div>
          ) : items.map(n => (
            <button key={n.id} onClick={() => open(n)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
