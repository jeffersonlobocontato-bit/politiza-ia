import { useEffect, useState } from 'react';
import { Gavel, ShieldAlert, MapPin, Calendar, User, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Report {
  id: string;
  category: string;
  title: string;
  denounced_name: string;
  denounced_role: string | null;
  denounced_party: string | null;
  narrative: string;
  municipality: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  evidence: any[];
  ai_summary: string | null;
  ai_risk_score: number | null;
  status: string;
  severity: string;
  legal_notes: string | null;
  created_at: string;
  created_by: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  protocolada: 'Protocolada',
  arquivada: 'Arquivada',
};

const STATUS_COLORS: Record<string, string> = {
  nova: 'bg-destructive/20 text-destructive border-destructive/40',
  em_analise: 'bg-amber-500/20 text-amber-600 border-amber-500/40',
  protocolada: 'bg-primary/20 text-primary border-primary/40',
  arquivada: 'bg-muted text-muted-foreground border-border',
};

export default function Juridico() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fiscalize_reports')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setReports((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  async function updateStatus() {
    if (!selected || !newStatus || !note.trim()) {
      toast.error('Informe uma nota de justificativa.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const fromStatus = selected.status;
    const { error: e1 } = await supabase.from('fiscalize_reports').update({
      status: newStatus, legal_notes: note,
    }).eq('id', selected.id);
    if (!e1) {
      await supabase.from('fiscalize_history').insert({
        report_id: selected.id, from_status: fromStatus, to_status: newStatus,
        note, changed_by: user?.id,
      });
      toast.success('Status atualizado.');
      setNote(''); setNewStatus(''); setSelected(null);
      load();
    } else {
      toast.error(e1.message);
    }
    setSaving(false);
  }

  async function signedUrl(path: string): Promise<string | null> {
    const { data } = await supabase.storage.from('fiscalize-evidence').createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Gavel className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">Jurídico — Denúncias Fiscalize</h1>
          <p className="text-xs text-muted-foreground">Triagem e encaminhamento de irregularidades eleitorais</p>
        </div>
        <div className="ml-auto flex gap-2">
          {['all', 'nova', 'em_analise', 'protocolada', 'arquivada'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent'
              }`}>
              {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Nenhuma denúncia neste filtro.</div>
        ) : (
          <div className="grid gap-3 max-w-4xl mx-auto">
            {filtered.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setNewStatus(r.status); setNote(r.legal_notes ?? ''); }}
                className="text-left rounded-xl border border-border bg-card hover:border-primary/50 transition-all p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                      <h3 className="font-semibold text-sm text-foreground truncate">{r.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.narrative}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${STATUS_COLORS[r.status] ?? STATUS_COLORS.nova}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.denounced_name}</span>
                  {r.municipality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.municipality}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{r.evidence?.length ?? 0} prova(s)</span>
                  {r.ai_risk_score !== null && (
                    <span className={`font-semibold ${r.ai_risk_score > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      IA: {Math.round(r.ai_risk_score)}% manipul.
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto">
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">{selected.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.category.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><div className="text-muted-foreground mb-0.5">Denunciado</div><div className="font-medium text-foreground">{selected.denounced_name}</div></div>
                <div><div className="text-muted-foreground mb-0.5">Cargo / Partido</div><div className="font-medium text-foreground">{[selected.denounced_role, selected.denounced_party].filter(Boolean).join(' · ') || '—'}</div></div>
                <div><div className="text-muted-foreground mb-0.5">Município</div><div className="font-medium text-foreground">{selected.municipality ?? '—'}</div></div>
                <div><div className="text-muted-foreground mb-0.5">Coordenadas</div><div className="font-mono text-[11px] text-foreground">{selected.lat ? `${selected.lat.toFixed(5)}, ${selected.lng?.toFixed(5)}` : '—'}</div></div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Relato</div>
                <div className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3">{selected.narrative}</div>
              </div>

              {selected.ai_summary && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Triagem IA</div>
                  <div className="text-xs text-foreground rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    {selected.ai_summary}
                    {selected.ai_risk_score !== null && (
                      <span className="block mt-2 font-semibold">Score médio de manipulação: {Math.round(selected.ai_risk_score)}%</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-muted-foreground mb-1">Provas ({selected.evidence?.length ?? 0})</div>
                <div className="grid grid-cols-3 gap-2">
                  {(selected.evidence ?? []).map((e: any, i: number) => (
                    <button key={i} onClick={async () => { const u = await signedUrl(e.path); if (u) window.open(u, '_blank'); }}
                      className="aspect-square rounded-lg border border-border bg-muted hover:border-primary/50 p-2 flex flex-col items-center justify-center text-[10px] text-muted-foreground gap-1">
                      <FileText className="w-5 h-5" />
                      <span className="truncate w-full text-center">{e.mime}</span>
                      <span className="font-mono truncate w-full text-center">{e.sha256?.slice(0, 8)}…</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Mudar status para</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nota / Justificativa (obrigatória) *</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                    placeholder="Descreva a análise jurídica, decisão ou número de protocolo..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
                </div>
                <button onClick={updateStatus} disabled={saving || !note.trim()}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando…</> : 'Salvar mudança de status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
