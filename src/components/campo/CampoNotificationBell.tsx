import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Sino compacto para o header mobile do app de Campo. */
export function CampoNotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  async function load() {
    if (!user) return;
    const { count: c } = await (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setCount(c ?? 0);
  }

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`campo-notif-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load(),
      ).subscribe();
    const t = setInterval(load, 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [user?.id]);

  return (
    <Link
      to="/campo/tarefas"
      className="relative flex items-center justify-center w-8 h-8 rounded-md"
      style={{ color: 'var(--campo-text-mute)' }}
      title="Notificações e tarefas"
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: '#EF4444' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
