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
  name_aliases?: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface CandidateContextValue {
  /** Candidato em foco (não-nulo apenas quando exatamente 1 está selecionado). */
  activeCandidate: Candidate | null;
  /** Tipo de campanha do candidato em foco. */
  campaignType: CampaignType;
  /** Todos os candidatos visíveis para o usuário (já filtrados por RLS). */
  candidates: Candidate[];
  /** Candidatos ativos respeitando o filtro selecionado (consolidação). */
  activeCandidates: Candidate[];
  /** Lista completa de candidatos ativos visíveis ao usuário (sem filtro). */
  allActiveCandidates: Candidate[];
  /** IDs dos candidatos aos quais o usuário está restrito; vazio = sem restrição. */
  scopedCandidateIds: string[];
  /** IDs selecionados no filtro (vazio = ver todos). */
  selectedCandidateIds: string[];
  /** True se o usuário pode ver dados de todos os candidatos. */
  hasFullAccess: boolean;
  /** True se nenhum filtro está aplicado (visão consolidada completa). */
  isViewingAll: boolean;
  loading: boolean;
  /** Define o candidato em foco. null = visão consolidada. (compat) */
  setActive: (id: string | null) => void;
  /** Define múltiplos candidatos no filtro. Lista vazia = ver todos. */
  setSelectedCandidateIds: (ids: string[]) => void;
  /** Ativa/desativa um candidato (toggle is_active). */
  toggleActive: (id: string, active: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const CandidateContext = createContext<CandidateContextValue | null>(null);

const STORAGE_KEY = 'activeCandidateFilter';

function readStoredSelection(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    if (raw.startsWith('[')) return JSON.parse(raw) as string[];
    return [raw];
  } catch {
    return [];
  }
}

export function CandidateProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scopedCandidateIds, setScopedCandidateIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readStoredSelection());
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const persistSelection = useCallback((ids: string[]) => {
    try {
      if (ids.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch { /* noop */ }
  }, []);

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
    if (!user?.id || isAdmin) {
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
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    (async () => {
      setDataLoading(true);
      await Promise.all([fetchCandidates(), fetchScope()]);
      if (!cancelled) setDataLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, fetchCandidates, fetchScope]);

  const hasFullAccess = isAdmin || scopedCandidateIds.length === 0;

  const allActiveCandidates = useMemo(() => {
    const list = hasFullAccess
      ? candidates
      : candidates.filter(c => scopedCandidateIds.includes(c.id));
    return list.filter(c => c.is_active);
  }, [candidates, scopedCandidateIds, hasFullAccess]);

  useEffect(() => {
    setLoading(authLoading || dataLoading);
  }, [authLoading, dataLoading]);

  // Para usuário com escopo, mantém apenas IDs permitidos. Lista vazia = todos os vinculados.
  useEffect(() => {
    if (loading || candidates.length === 0) return;
    if (!hasFullAccess) {
      const allowedIds = new Set(allActiveCandidates.map(c => c.id));
      const filtered = selectedIds.filter(id => allowedIds.has(id));
      if (filtered.length !== selectedIds.length) {
        setSelectedIds(filtered);
        persistSelection(filtered);
      }
    }
  }, [loading, candidates, allActiveCandidates, hasFullAccess, selectedIds, persistSelection]);

  // Normaliza seleção "todos marcados" para o modo consolidado real.
  useEffect(() => {
    if (loading || allActiveCandidates.length === 0) return;
    if (selectedIds.length === allActiveCandidates.length) {
      setSelectedIds([]);
      persistSelection([]);
    }
    // Executa apenas quando o escopo inicial termina de carregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allActiveCandidates.length]);

  const setActive = useCallback((id: string | null) => {
    const next = id ? [id] : [];
    setSelectedIds(next);
    persistSelection(next);
  }, [persistSelection]);

  const setSelectedCandidateIds = useCallback((ids: string[]) => {
    const allowed = new Set(allActiveCandidates.map(c => c.id));
    const next = ids.filter((id, index) => allowed.has(id) && ids.indexOf(id) === index);
    const normalized = next.length === allActiveCandidates.length ? [] : next;
    setSelectedIds(normalized);
    persistSelection(normalized);
  }, [allActiveCandidates, persistSelection]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
    await (supabase as any).from('candidates').update({ is_active: active }).eq('id', id);
    await fetchCandidates();
  }, [fetchCandidates]);

  const visibleCandidates = useMemo(() => {
    if (hasFullAccess) return candidates;
    return candidates.filter(c => scopedCandidateIds.includes(c.id));
  }, [candidates, scopedCandidateIds, hasFullAccess]);

  const activeCandidates = useMemo(() => {
    if (selectedIds.length === 0) return allActiveCandidates;
    const set = new Set(selectedIds);
    return allActiveCandidates.filter(c => set.has(c.id));
  }, [allActiveCandidates, selectedIds]);

  const activeCandidate = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return visibleCandidates.find(c => c.id === selectedIds[0]) ?? null;
  }, [selectedIds, visibleCandidates]);

  const campaignType = useMemo(
    () => activeCandidate ? getCampaignType(activeCandidate.cargo) : null,
    [activeCandidate],
  );

  const isViewingAll = selectedIds.length === 0;

  return (
    <CandidateContext.Provider value={{
      activeCandidate,
      campaignType,
      candidates: visibleCandidates,
      activeCandidates,
      allActiveCandidates,
      scopedCandidateIds,
      selectedCandidateIds: selectedIds,
      hasFullAccess,
      isViewingAll,
      loading,
      setActive,
      setSelectedCandidateIds,
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
