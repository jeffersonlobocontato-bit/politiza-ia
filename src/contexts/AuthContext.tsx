import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { AppRole, DbProfile } from '@/types/database';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

// Re-export so existing imports from AuthContext keep working
export const supabase = supabaseClient;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: DbProfile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isCampoOperator: boolean;
  isAuditorHierarquia: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const fetchUserData = async (userId: string): Promise<{ profile: DbProfile | null; roles: AppRole[] }> => {
  try {
    const [profileRes, rolesRes] = await Promise.all([
      (supabaseClient as any).from('profiles').select('*').eq('id', userId).single(),
      (supabaseClient as any).from('user_roles').select('role').eq('user_id', userId),
    ]);

    return {
      profile: (profileRes.data as DbProfile | null) ?? null,
      roles: ((rolesRes.data as { role: AppRole }[] | null) ?? []).map(({ role }) => role),
    };
  } catch {
    return { profile: null, roles: [] };
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    let active = true;

    const loadUserData = async (userId: string, seq: number) => {
      const userData = await fetchUserData(userId);
      if (!active || loadSeqRef.current !== seq) return;

      lastLoadedUserIdRef.current = userId;
      setProfile(userData.profile);
      setRoles(userData.roles);
      setLoading(false);
    };

    const applySession = (sess: Session | null) => {
      if (!active) return;

      const seq = ++loadSeqRef.current;
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        lastLoadedUserIdRef.current = null;
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      if (lastLoadedUserIdRef.current === sess.user.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setProfile(null);
      setRoles([]);
      void loadUserData(sess.user.id, seq);
    };

    const initialise = async () => {
      try {
        const { data: { session: sess } } = await supabaseClient.auth.getSession();
        applySession(sess);
      } catch {
        if (!active) return;
        lastLoadedUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    };

    void initialise();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, sess) => {
      applySession(sess);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
  };

    const isAdmin = roles.some(r => ['admin_master', 'coordenador_geral', 'coordenador_estadual'].includes(r));
  const isAuditorHierarquia = roles.includes('auditor_hierarquia' as AppRole);
  const isCampoOperator = !isAdmin && !isAuditorHierarquia && roles.some(r => [
    'operador_campo', 'lideranca_local',
    'coordenador_regional', 'coordenador_microrregional', 'coordenador_municipal',
  ].includes(r));

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, isAdmin, isCampoOperator, isAuditorHierarquia, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
