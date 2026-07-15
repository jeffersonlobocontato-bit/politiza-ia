import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Users, ClipboardList, UsersRound, Trash2, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useCandidate } from '@/contexts/CandidateContext';
import { useMyScope, softDeleteRow, newestSince } from '@/hooks/useMyScope';
import ActionDetailSheet from '@/components/campo/ActionDetailSheet';

type Tab = 'assets' | 'leaders' | 'actions' | 'members';

const TABS: { id: Tab; label: string; icon: any; accent: string }[] = [
  { id: 'assets', label: 'Ativos', icon: Users, accent: '#1F5AB4' },
  { id: 'leaders', label: 'Lideranças', icon: UsersRound, accent: '#2FA85A' },
  { id: 'actions', label: 'Ações', icon: ClipboardList, accent: '#E85D3A' },
  { id: 'members', label: 'Equipe', icon: UsersRound, accent: '#9B87F5' },
];

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export default function CampoMeusCadastros() {
  const { activeCandidate } = useCandidate();
  const scope = useMyScope(activeCandidate?.id ?? null);
  const [tab, setTab] = useState<Tab>('assets');
  const [q, setQ] = useState('');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const kpi = useMemo(() => ({
    assets: scope.assets.length,
    leaders: scope.leaders.length,
    actions: scope.actions.length,
    members: scope.members.length,
    news7: newestSince([...scope.assets, ...scope.leaders, ...scope.actions, ...scope.members], 7),
  }), [scope]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = (t: string) => !s || t.toLowerCase().includes(s);
    if (tab === 'assets') return scope.assets.filter(a => match(`${a.name} ${a.nickname ?? ''} ${a.municipality ?? ''}`));
    if (tab === 'leaders') return scope.leaders.filter(l => match(`${l.name} ${l.municipality ?? ''}`));
    if (tab === 'actions') return scope.actions.filter(a => match(`${a.title} ${a.municipality ?? ''}`));
    return scope.members.filter(m => match(`${m.name} ${m.role ?? ''} ${m.municipality ?? ''}`));
  }, [tab, q, scope]);

  const handleDelete = async (table: 'political_assets' | 'leaders' | 'actions' | 'campaign_members', id: string) => {
    if (!window.confirm('Excluir este registro?')) return;
    try {
      await softDeleteRow(table, id);
      toast.success('Excluído');
      await scope.refetchAll();
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao excluir');
    }
  };

  return (
    <div className="min-h-full mn-font" style={{ background: 'linear-gradient(180deg,#0F1B2E 0%,#1A2A45 60%,#0F1B2E 100%)' }}>
      <div className="px-4 pt-5 pb-24 max-w-md mx-auto space-y-4">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(47,168,90,0.15)', color: '#2FA85A' }}>
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">Meus Cadastros</h1>
            <p className="text-[11px] text-white/60">Você + sua equipe · {scope.subtreeUserIds.length} usuários</p>
          </div>
        </header>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2">
          <KpiTile label="Ativos" value={kpi.assets} accent="#1F5AB4" />
          <KpiTile label="Lideranças" value={kpi.leaders} accent="#2FA85A" />
          <KpiTile label="Ações" value={kpi.actions} accent="#E85D3A" />
          <KpiTile label="Membros" value={kpi.members} accent="#9B87F5" />
        </div>
        <div className="text-[11px] text-white/70 text-center">
          <span className="font-bold text-white">{kpi.news7}</span> novos cadastros nos últimos 7 dias
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-semibold uppercase transition-colors"
                style={{
                  background: active ? `${t.accent}22` : 'transparent',
                  color: active ? t.accent : 'rgba(255,255,255,0.7)',
                  border: active ? `1px solid ${t.accent}55` : '1px solid transparent',
                }}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {list.length === 0 && (
            <div className="text-center py-10 text-white/50 text-sm">Nada por aqui ainda.</div>
          )}
          {tab === 'assets' && (list as typeof scope.assets).map(a => (
            <ItemCard
              key={a.id}
              title={a.name}
              subtitle={[a.nickname && `"${a.nickname}"`, a.type, a.municipality].filter(Boolean).join(' · ')}
              meta={`por ${scope.authors[a.created_by ?? '']?.name ?? '—'} · ${fmt(a.created_at)}`}
              linkTo="/ativos"
              onDelete={() => handleDelete('political_assets', a.id)}
              accent="#1F5AB4"
            />
          ))}
          {tab === 'leaders' && (list as typeof scope.leaders).map(l => (
            <ItemCard
              key={l.id}
              title={l.name}
              subtitle={[l.municipality, l.status].filter(Boolean).join(' · ')}
              meta={`por ${scope.authors[l.created_by ?? '']?.name ?? '—'} · ${fmt(l.created_at)}`}
              linkTo={`/campo/liderancas/${l.id}`}
              onDelete={() => handleDelete('leaders', l.id)}
              accent="#2FA85A"
            />
          ))}
          {tab === 'actions' && (list as typeof scope.actions).map(a => (
            <div
              key={a.id}
              className="rounded-xl p-3 flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #E85D3A33' }}
              onClick={() => setSelectedActionId(a.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{a.title}</div>
                <div className="text-[11px] text-white/70 truncate">
                  {[a.category ?? a.type, a.municipality, `${a.executed_people_count ?? 0} pessoas`].filter(Boolean).join(' · ')}
                </div>
                <div className="text-[10px] text-white/40 truncate mt-0.5">
                  por {scope.authors[a.created_by ?? '']?.name ?? '—'} · {fmt(a.created_at)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete('actions', a.id); }}
                className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-white/50" />
            </div>
          ))}
          {tab === 'members' && (list as typeof scope.members).map(m => (
            <ItemCard
              key={m.id}
              title={m.name}
              subtitle={[m.role, m.municipality].filter(Boolean).join(' · ')}
              meta={`cadastrado por ${scope.authors[m.created_by ?? '']?.name ?? '—'} · ${fmt(m.created_at)}`}
              linkTo="/campo/membros"
              onDelete={() => handleDelete('campaign_members', m.id)}
              accent="#9B87F5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accent}33` }}>
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: accent }}>{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function ItemCard({ title, subtitle, meta, linkTo, onDelete, accent }: {
  title: string; subtitle: string; meta: string; linkTo: string; onDelete: () => void; accent: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-2"
      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accent}33` }}
    >
      <Link to={linkTo} className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">{title}</div>
        {subtitle && <div className="text-[11px] text-white/70 truncate">{subtitle}</div>}
        <div className="text-[10px] text-white/40 truncate mt-0.5">{meta}</div>
      </Link>
      <button
        onClick={onDelete}
        className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        aria-label="Excluir"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <Link to={linkTo} className="p-2 rounded-lg text-white/50" aria-label="Abrir">
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
