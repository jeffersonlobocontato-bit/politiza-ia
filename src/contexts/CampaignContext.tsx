import { createContext, useContext, useState, ReactNode } from 'react';
import { actions as initialActions } from '@/data/mockData';
import type { Action, ActionStatus } from '@/data/mockData';

interface CampaignContextValue {
  actions: Action[];
  addAction: (action: Omit<Action, 'id'> & { id?: string }) => void;
  updateActionStatus: (id: string, status: ActionStatus) => void;
  newActionIds: Set<string>;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [newActionIds, setNewActionIds] = useState<Set<string>>(new Set());

  const addAction = (action: Omit<Action, 'id'> & { id?: string }) => {
    const id = action.id ?? `field-${Date.now()}`;
    const newAction: Action = { ...action, id } as Action;
    setActions(prev => [newAction, ...prev]);
    setNewActionIds(prev => new Set(prev).add(id));
    // Remove "new" indicator after 5 minutes
    setTimeout(() => {
      setNewActionIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 5 * 60 * 1000);
  };

  const updateActionStatus = (id: string, status: ActionStatus) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <CampaignContext.Provider value={{ actions, addAction, updateActionStatus, newActionIds }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider');
  return ctx;
}
