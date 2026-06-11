import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Gavel, ShieldAlert, MapPin, Calendar, User, FileText, Loader2,
  Paperclip, MessageSquare, History, Upload, X, AtSign, UserCircle2,
  ExternalLink, Download,
} from 'lucide-react';
import { supabase } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { JuridicoDashboard } from '@/components/juridico/JuridicoDashboard';

type Status = 'nova' | 'em_analise' | 'protocolada' | 'arquivada';

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
  status: Status;
  severity: string;
  legal_notes: string | null;
  created_at: string;
  created_by: string | null;
  assigned_lawyer_id: string | null;
  last_activity_at: string | null;
  protocol_number: string | null;
}

interface Note { id: string; body: string; mentions: string[]; created_at: string; author_id: string | null; author_name?: string }
interface Attachment { id: string; name: string; path: string; mime: string | null; size: number | null; created_at: string; uploaded_by: string | null; uploader_name?: string }
interface HistoryRow { id: string; from_status: string | null; to_status: string; note: string; created_at: string; changed_by: string | null; changed_by_name?: string }
interface Lawyer { id: string; full_name: string; email: string | null }

const COLUMNS: { key: Status; label: string; accent: string }[] = [
  { key: 'nova',        label: 'Nova',        accent: 'border-destructive/60 bg-destructive/5' },
  { key: 'em_analise',  label: 'Em análise',  accent: 'border-amber-500/60 bg-amber-500/5' },
  { key: 'protocolada', label: 'Protocolada', accent: 'border-primary/60 bg-primary/5' },
  { key: 'arquivada',   label: 'Arquivada',   accent: 'border-muted-foreground/40 bg-muted/30' },
];

const SEV_BORDER: Record<string, string> = {
  critica: 'border-l-destructive',
  alta: 'border-l-orange-500',
  media: 'border-l-amber-500',
  baixa: 'border-l-emerald-500',
};

export default function Juridico() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  const [params, setParams] = useSearchParams();

  async function loadAll() {
    setLoading(true);
    const [{ data: reps }, { data: lws }] = await Promise.all([
      (supabase as any).from('fiscalize_reports').select('*').is('deleted_at', null)
        .order('last_activity_at', { ascending: false, nullsFirst: false }),
      (supabase as any).from('juridico_users').select('*').order('full_name'),
    ]);
    setReports(reps ?? []);
    setLawyers(lws ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    const rid = params.get('report');
    if (rid) setSelectedId(rid);
  }, [params]);

  const filtered = filterMine && user
    ? reports.filter(r => r.assigned_lawyer_id === user.id)
    : reports;

  const grouped = useMemo(() => {
    const m: Record<Status, Report[]> = { nova: [], em_analise: [], protocolada: [], arquivada: [] };
    filtered.forEach(r => { (m[r.status] ?? m.nova).push(r); });
    return m;
  }, [filtered]);

  const selected = reports.find(r => r.id === selectedId) ?? null;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Gavel className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">Jurídico — Denúncias Fiscalize</h1>
          <p className="text-xs text-muted-foreground">Quadro de triagem e encaminhamento (Trello-like)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={filterMine} onChange={e => setFilterMine(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary" />
            Minhas denúncias
          </label>
          <span className="text-[10px] text-muted-foreground">{filtered.length} no quadro</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="flex gap-4 p-4 h-full min-w-max">
            {COLUMNS.map(col => (
              <div key={col.key} className={`w-80 flex-shrink-0 rounded-xl border ${col.accent} flex flex-col`}>
                <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">{col.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-background border border-border">
                    {grouped[col.key].length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {grouped[col.key].length === 0 ? (
                    <div className="text-center text-[11px] text-muted-foreground py-6">—</div>
                  ) : grouped[col.key].map(r => {
                    const lawyer = lawyers.find(l => l.id === r.assigned_lawyer_id);
                    return (
                      <button key={r.id} onClick={() => setSelectedId(r.id)}
                        className={`w-full text-left rounded-lg border border-l-4 ${SEV_BORDER[r.severity] ?? 'border-l-muted'} border-border bg-card hover:border-primary/50 transition-all p-3`}>
                        <div className="flex items-start gap-1.5 mb-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                          <h3 className="font-semibold text-xs text-foreground line-clamp-2">{r.title}</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{r.narrative}</p>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{r.denounced_name}</span>
                          {r.municipality && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{r.municipality}</span>}
                          <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{r.evidence?.length ?? 0}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />{new Date(r.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          {lawyer ? (
                            <span className="flex items-center gap-1 text-primary font-semibold">
                              <UserCircle2 className="w-3 h-3" />{lawyer.full_name?.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">sem responsável</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ReportDrawer
          report={selected}
          lawyers={lawyers}
          onClose={() => { setSelectedId(null); if (params.get('report')) { params.delete('report'); setParams(params); } }}
          onChanged={loadAll}
        />
      )}
    </div>
  );
}

// =========================== DRAWER ===========================

function ReportDrawer({ report, lawyers, onClose, onChanged }: {
  report: Report; lawyers: Lawyer[]; onClose: () => void; onChanged: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'detalhes' | 'andamento' | 'anexos' | 'notas'>('detalhes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [newStatus, setNewStatus] = useState<Status>(report.status);
  const [statusNote, setStatusNote] = useState('');
  const [assignee, setAssignee] = useState<string>(report.assigned_lawyer_id ?? '');
  const [saving, setSaving] = useState(false);

  async function loadCollab() {
    const [{ data: n }, { data: a }, { data: h }] = await Promise.all([
      (supabase as any).from('fiscalize_notes').select('*').eq('report_id', report.id).is('deleted_at', null).order('created_at'),
      (supabase as any).from('fiscalize_attachments').select('*').eq('report_id', report.id).is('deleted_at', null).order('created_at'),
      (supabase as any).from('fiscalize_history').select('*').eq('report_id', report.id).order('created_at'),
    ]);
    const userIds = new Set<string>();
    (n ?? []).forEach((x: Note) => x.author_id && userIds.add(x.author_id));
    (a ?? []).forEach((x: Attachment) => x.uploaded_by && userIds.add(x.uploaded_by));
    (h ?? []).forEach((x: HistoryRow) => x.changed_by && userIds.add(x.changed_by));
    let nameMap: Record<string, string> = {};
    if (userIds.size) {
      const { data: profs } = await supabase.from('profiles').select('id,full_name').in('id', Array.from(userIds));
      nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }
    setNotes((n ?? []).map((x: Note) => ({ ...x, author_name: x.author_id ? nameMap[x.author_id] : undefined })));
    setAttachments((a ?? []).map((x: Attachment) => ({ ...x, uploader_name: x.uploaded_by ? nameMap[x.uploaded_by] : undefined })));
    setHistory((h ?? []).map((x: HistoryRow) => ({ ...x, changed_by_name: x.changed_by ? nameMap[x.changed_by] : undefined })));
  }
  useEffect(() => { loadCollab(); }, [report.id]);

  async function signedUrl(bucket: string, path: string) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  }

  async function saveStatus() {
    if (newStatus === report.status && assignee === (report.assigned_lawyer_id ?? '')) {
      toast.info('Nada para atualizar.'); return;
    }
    if (newStatus !== report.status && !statusNote.trim()) {
      toast.error('Justificativa obrigatória para mudar status.'); return;
    }
    setSaving(true);
    const patch: any = {};
    if (newStatus !== report.status) { patch.status = newStatus; patch.legal_notes = statusNote; }
    if (assignee !== (report.assigned_lawyer_id ?? '')) patch.assigned_lawyer_id = assignee || null;
    const { error } = await (supabase as any).from('fiscalize_reports').update(patch).eq('id', report.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    if (newStatus !== report.status) {
      await (supabase as any).from('fiscalize_history').insert({
        report_id: report.id, from_status: report.status, to_status: newStatus,
        note: statusNote, changed_by: user?.id,
      });
    }
    toast.success('Atualizado.');
    setStatusNote('');
    setSaving(false);
    onChanged();
    loadCollab();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl h-full bg-card border-l border-border overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              <h2 className="text-base font-bold text-foreground truncate">{report.title}</h2>
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {report.category.replace(/_/g, ' ')} · Severidade {report.severity} · Status atual: {report.status.replace('_',' ')}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-border flex-shrink-0">
          {[
            { k: 'detalhes', icon: FileText, label: 'Detalhes' },
            { k: 'andamento', icon: History, label: 'Andamento' },
            { k: 'anexos', icon: Paperclip, label: `Anexos (${attachments.length})` },
            { k: 'notas', icon: MessageSquare, label: `Notas (${notes.length})` },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                tab === t.k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'detalhes' && <DetailsTab report={report} signedUrl={signedUrl} />}
          {tab === 'andamento' && <TimelineTab notes={notes} attachments={attachments} history={history} />}
          {tab === 'anexos' && <AttachmentsTab report={report} attachments={attachments} reload={loadCollab} signedUrl={signedUrl} />}
          {tab === 'notas' && <NotesTab report={report} notes={notes} lawyers={lawyers} reload={loadCollab} />}
        </div>

        <div className="border-t border-border p-4 space-y-3 flex-shrink-0 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Responsável jurídico</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs">
                <option value="">— sem responsável —</option>
                {lawyers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as Status)}
                className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs">
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {newStatus !== report.status && (
            <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={2}
              placeholder="Justificativa da mudança de status (obrigatória)…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none" />
          )}
          <button onClick={saveStatus} disabled={saving}
            className="w-full h-9 rounded-lg bg-primary text-primary-foreground font-semibold text-xs disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Salvando…</> : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================== TABS ===========================

function DetailsTab({ report, signedUrl }: { report: Report; signedUrl: (b: string, p: string) => Promise<string | null> }) {
  return (
    <div className="space-y-4 text-sm">
      <Section label="Denunciado">
        <Grid pairs={[
          ['Nome', report.denounced_name],
          ['Cargo', report.denounced_role ?? '—'],
          ['Partido', report.denounced_party ?? '—'],
        ]} />
      </Section>
      <Section label="Localização">
        <Grid pairs={[
          ['Município', report.municipality ?? '—'],
          ['Endereço', report.address ?? '—'],
          ['Coordenadas', report.lat ? `${report.lat.toFixed(5)}, ${report.lng?.toFixed(5)}` : '—'],
        ]} />
        {report.lat && (
          <button type="button"
            onClick={() => window.open(`https://www.google.com/maps?q=${report.lat},${report.lng}`, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1">
            <ExternalLink className="w-3 h-3" />Abrir no mapa
          </button>
        )}
      </Section>
      <Section label="Relato">
        <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3">{report.narrative}</p>
      </Section>
      {report.ai_summary && (
        <Section label="Triagem IA">
          <div className="text-xs text-foreground rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 whitespace-pre-wrap">
            {report.ai_summary}
            {report.ai_risk_score !== null && (
              <span className="block mt-2 font-semibold">Score de manipulação: {Math.round(report.ai_risk_score)}%</span>
            )}
          </div>
        </Section>
      )}
      <Section label={`Provas originais (${report.evidence?.length ?? 0})`}>
        <div className="grid grid-cols-3 gap-2">
          {(report.evidence ?? []).map((e: any, i: number) => (
            <button key={i} onClick={async () => { const u = await signedUrl('fiscalize-evidence', e.path); if (u) window.open(u, '_blank'); }}
              className="aspect-square rounded-lg border border-border bg-muted hover:border-primary/50 p-2 flex flex-col items-center justify-center text-[10px] text-muted-foreground gap-1">
              <FileText className="w-5 h-5" />
              <span className="truncate w-full text-center">{e.mime}</span>
              <span className="font-mono truncate w-full text-center">{e.sha256?.slice(0, 8)}…</span>
              {e.captured_at && <span className="text-[9px]">{new Date(e.captured_at).toLocaleString('pt-BR')}</span>}
            </button>
          ))}
        </div>
      </Section>
      <Section label="Metadados">
        <Grid pairs={[
          ['Protocolo', report.protocol_number ?? '—'],
          ['Criada em', new Date(report.created_at).toLocaleString('pt-BR')],
          ['Última atividade', report.last_activity_at ? new Date(report.last_activity_at).toLocaleString('pt-BR') : '—'],
        ]} />
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">{label}</div>
      {children}
    </div>
  );
}
function Grid({ pairs }: { pairs: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {pairs.map(([k, v]) => (
        <div key={k}>
          <div className="text-muted-foreground mb-0.5">{k}</div>
          <div className="font-medium text-foreground break-words">{v}</div>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ notes, attachments, history }: { notes: Note[]; attachments: Attachment[]; history: HistoryRow[] }) {
  const items = [
    ...history.map(h => ({ ts: h.created_at, type: 'status' as const, data: h })),
    ...notes.map(n => ({ ts: n.created_at, type: 'note' as const, data: n })),
    ...attachments.map(a => ({ ts: a.created_at, type: 'att' as const, data: a })),
  ].sort((a, b) => a.ts.localeCompare(b.ts));

  if (items.length === 0) return <p className="text-xs text-muted-foreground">Sem atividade ainda.</p>;

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">
              {it.type === 'status' && `Status → ${(it.data as HistoryRow).to_status.replace('_',' ')}`}
              {it.type === 'note' && 'Nota adicionada'}
              {it.type === 'att' && 'Anexo enviado'}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(it.ts).toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-muted-foreground">
            {it.type === 'status' && (it.data as HistoryRow).note}
            {it.type === 'note' && (it.data as Note).body}
            {it.type === 'att' && (it.data as Attachment).name}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            por {(it.data as any).author_name || (it.data as any).uploader_name || (it.data as any).changed_by_name || '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

function AttachmentsTab({ report, attachments, reload, signedUrl }: {
  report: Report; attachments: Attachment[]; reload: () => void;
  signedUrl: (b: string, p: string) => Promise<string | null>;
}) {
  const { user } = useAuth();
  const [up, setUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    setUp(true);
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name}: maior que 20MB`); continue; }
      const path = `${report.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('fiscalize-legal-docs').upload(path, f);
      if (upErr) { toast.error(upErr.message); continue; }
      await (supabase as any).from('fiscalize_attachments').insert({
        report_id: report.id, uploaded_by: user.id, path, name: f.name, mime: f.type, size: f.size,
      });
    }
    setUp(false);
    if (inputRef.current) inputRef.current.value = '';
    toast.success('Anexos enviados.');
    reload();
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer text-xs text-muted-foreground transition-colors">
        <Upload className="w-4 h-4" />
        {up ? 'Enviando…' : 'Adicionar documentos (PDF, imagens — até 20MB cada)'}
        <input ref={inputRef} type="file" multiple onChange={handleUpload} disabled={up}
          accept=".pdf,image/*,.doc,.docx,.odt"
          className="hidden" />
      </label>
      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum anexo complementar.</p>
      ) : attachments.map(a => (
        <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card text-xs">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="truncate text-foreground font-medium">{a.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {a.uploader_name ?? '—'} · {new Date(a.created_at).toLocaleString('pt-BR')}
              {a.size && ` · ${(a.size / 1024).toFixed(0)}KB`}
            </div>
          </div>
          <button onClick={async () => { const u = await signedUrl('fiscalize-legal-docs', a.path); if (u) window.open(u, '_blank'); }}
            className="p-1.5 rounded hover:bg-muted text-primary"><Download className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ report, notes, lawyers, reload }: {
  report: Report; notes: Note[]; lawyers: Lawyer[]; reload: () => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentions, setMentions] = useState<Lawyer[]>([]);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function onBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@([\w]*)$/);
    if (match) { setShowMentions(true); setMentionQuery(match[1].toLowerCase()); }
    else { setShowMentions(false); }
  }

  function insertMention(l: Lawyer) {
    const ta = taRef.current; if (!ta) return;
    const cursor = ta.selectionStart;
    const before = body.slice(0, cursor).replace(/@([\w]*)$/, `@${l.full_name.replace(/\s+/g, '_')} `);
    const after = body.slice(cursor);
    const next = before + after;
    setBody(next);
    setShowMentions(false);
    if (!mentions.find(m => m.id === l.id)) setMentions([...mentions, l]);
    setTimeout(() => { ta.focus(); ta.selectionEnd = before.length; }, 0);
  }

  async function submit() {
    if (!body.trim() || !user) return;
    setSaving(true);
    const activeMentions = mentions.filter(m => body.includes(`@${m.full_name.replace(/\s+/g, '_')}`));
    const { error } = await (supabase as any).from('fiscalize_notes').insert({
      report_id: report.id, author_id: user.id, body,
      mentions: activeMentions.map(m => m.id),
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    setBody(''); setMentions([]); setSaving(false);
    toast.success(activeMentions.length ? `Nota salva e ${activeMentions.length} pessoa(s) notificada(s).` : 'Nota salva.');
    reload();
  }

  const suggestions = lawyers.filter(l =>
    l.full_name?.toLowerCase().includes(mentionQuery)
  ).slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea ref={taRef} value={body} onChange={onBodyChange} rows={4}
          placeholder="Escreva uma nota. Use @ para mencionar um advogado e notificá-lo…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none" />
        {showMentions && suggestions.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 z-10 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(l => (
              <button key={l.id} onClick={() => insertMention(l)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2">
                <AtSign className="w-3 h-3 text-primary" />
                <span className="font-medium">{l.full_name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{l.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {mentions.length > 0 && `Mencionados: ${mentions.map(m => m.full_name).join(', ')}`}
        </span>
        <button onClick={submit} disabled={saving || !body.trim()}
          className="h-8 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs disabled:opacity-40 flex items-center gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
          Adicionar nota
        </button>
      </div>

      <div className="space-y-2 pt-3 border-t border-border">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sem notas ainda.</p>
        ) : notes.map(n => (
          <div key={n.id} className="rounded-lg border border-border bg-card p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-foreground">{n.author_name ?? '—'}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{renderMentions(n.body)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderMentions(text: string) {
  const parts = text.split(/(@[\w_]+)/g);
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} className="text-primary font-semibold">{p.replace(/_/g, ' ')}</span>
      : <span key={i}>{p}</span>
  );
}
