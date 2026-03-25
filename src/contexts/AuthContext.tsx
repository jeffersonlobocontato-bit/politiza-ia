import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, DbProfile } from '@/types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: DbProfile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isCampoOperator: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles' as any).select('*').eq('id', userId).single(),
        supabase.from('user_roles' as any).select('role').eq('user_id', userId),
      ]);
      if (profileRes.data) setProfile(profileRes.data as DbProfile);
      if (rolesRes.data) setRoles((rolesRes.data as any[]).map(r => r.role as AppRole));
    } catch {
      // ignore — tables may not exist yet
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          await loadUserData(sess.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadUserData(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.some(r => ['admin_master', 'coordenador_geral', 'coordenador_estadual'].includes(r));
  const isCampoOperator = roles.includes('operador_campo') && !isAdmin;

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, isAdmin, isCampoOperator, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
