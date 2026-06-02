import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

export type CampaignType = 'majoritaria' | 'proporcional' | null;

const MAJORITARIA_CARGOS = ['Prefeito', 'Governador', 'Presidente'];
const PROPORCIONAL_CARGOS = ['Vereador', 'Deputado Estadual', 'Deputado Federal', 'Senador'];

export function getCampaignType(cargo: string): CampaignType {
  if (MAJORITARIA_CARGOS.includes(cargo)) return 'majoritaria';
  if (PROPORCIONAL_CARGOS.includes(cargo)) return 'proporcional';
  return null;
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  cargo: string;
  state: string;
  bio: string | null;
  photo_url: string | null;
  election_year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface CandidateContextValue {
  /** Candidato em foco no filtro do header (null = "Todos os candidatos"). */
  activeCandidate: Candidate | null;
  /** Tipo de campanha do candidato em foco. */
  campaignType: CampaignType;
  /** Todos os candidatos visíveis para o usuário (já filtrados por RLS). */
  candidates: Candidate[];
  /** Candidatos ativos (is_active = true) visíveis para o usuário. */
  activeCandidates: Candidate[];
  /** IDs dos candidatos aos quais o usuário está restrito; vazio = sem restrição. */
  scopedCandidateIds: string[];
  /** True se o usuário pode ver dados de todos os candidatos. */
  hasFullAccess: boolean;
  /** True se há filtro "Todos" selecionado (apenas para quem tem acesso total). */
  isViewingAll: boolean;
  loading: boolean;
  /** Define o candidato em foco. Passar null para visão consolidada (admin). */
  setActive: (id: string | null) => void;
  /** Ativa/desativa um candidato (toggle is_active). */
  toggleActive: (id: string, active: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const CandidateContext = createContext<CandidateContextValue | null>(null);

const STORAGE_KEY = 'activeCandidateFilter';

export function CandidateProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scopedCandidateIds, setScopedCandidateIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setCandidates(data as Candidate[]);
    } catch {
      // ignore
    }
  }, []);

  const fetchScope = useCallback(async () => {
    if (!user?.id) {
      setScopedCandidateIds([]);
      return;
    }
    try {
      const { data } = await (supabase as any)
        .from('user_candidates')
        .select('candidate_id')
        .eq('user_id', user.id);
      setScopedCandidateIds(((data ?? []) as { candidate_id: string }[]).map(r => r.candidate_id));
    } catch {
      setScopedCandidateIds([]);
    }
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchCandidates(), fetchScope()]);
      setLoading(false);
    })();
  }, [fetchCandidates, fetchScope]);

  const hasFullAccess = isAdmin || scopedCandidateIds.length === 0;

  // Para usuário com escopo, força candidato em foco a um dos vinculados
  useEffect(() => {
    if (loading || candidates.length === 0) return;
    if (!hasFullAccess) {
      const allowedActive = candidates.filter(c => c.is_active && scopedCandidateIds.includes(c.id));
      if (allowedActive.length === 0) {
        setActiveId(null);
      } else if (!activeId || !allowedActive.some(c => c.id === activeId)) {
        setActiveId(allowedActive[0].id);
      }
    }
  }, [loading, candidates, scopedCandidateIds, hasFullAccess, activeId]);

  const setActive = useCallback((id: string | null) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
  }, []);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
    await (supabase as any).from('candidates').update({ is_active: active }).eq('id', id);
    await fetchCandidates();
  }, [fetchCandidates]);

  const visibleCandidates = useMemo(() => {
    if (hasFullAccess) return candidates;
    return candidates.filter(c => scopedCandidateIds.includes(c.id));
  }, [candidates, scopedCandidateIds, hasFullAccess]);

  const activeCandidates = useMemo(
    () => visibleCandidates.filter(c => c.is_active),
    [visibleCandidates],
  );

  const activeCandidate = useMemo(() => {
    if (!activeId) return null;
    return visibleCandidates.find(c => c.id === activeId) ?? null;
  }, [activeId, visibleCandidates]);

  const campaignType = useMemo(
    () => activeCandidate ? getCampaignType(activeCandidate.cargo) : null,
    [activeCandidate],
  );

  const isViewingAll = activeId === null;

  return (
    <CandidateContext.Provider value={{
      activeCandidate,
      campaignType,
      candidates: visibleCandidates,
      activeCandidates,
      scopedCandidateIds,
      hasFullAccess,
      isViewingAll,
      loading,
      setActive,
      toggleActive,
      refetch: fetchCandidates,
    }}>
      {children}
    </CandidateContext.Provider>
  );
}

export function useCandidate() {
  const ctx = useContext(CandidateContext);
  if (!ctx) throw new Error('useCandidate must be used within CandidateProvider');
  return ctx;
}
