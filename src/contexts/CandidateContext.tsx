import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/contexts/AuthContext';

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
  activeCandidate: Candidate | null;
  candidates: Candidate[];
  loading: boolean;
  setActive: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const CandidateContext = createContext<CandidateContextValue | null>(null);

export function CandidateProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    try {
      const { data } = await (supabase as any)
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setCandidates(data as Candidate[]);
    } catch {
      // table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const setActive = async (id: string) => {
    // Optimistic update
    setCandidates(prev => prev.map(c => ({ ...c, is_active: c.id === id })));
    await (supabase as any)
      .from('candidates')
      .update({ is_active: false })
      .neq('id', id);
    await (supabase as any)
      .from('candidates')
      .update({ is_active: true })
      .eq('id', id);
    await fetchCandidates();
  };

  const activeCandidate = candidates.find(c => c.is_active) ?? null;

  return (
    <CandidateContext.Provider value={{ activeCandidate, candidates, loading, setActive, refetch: fetchCandidates }}>
      {children}
    </CandidateContext.Provider>
  );
}

export function useCandidate() {
  const ctx = useContext(CandidateContext);
  if (!ctx) throw new Error('useCandidate must be used within CandidateProvider');
  return ctx;
}
