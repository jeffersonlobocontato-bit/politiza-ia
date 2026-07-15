import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, Calendar, Users, Target, Pencil, Trash2, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db';
import { scoreColor, scoreLabel } from '@/lib/impactScore';
import type { DbAction } from '@/types/database';

interface Props {
  actionId: string | null;
  authorName?: string;
  onClose: () => void;
  onDelete: () => void;
}

export default function ActionDetailSheet({ actionId, authorName, onClose, onDelete }: Props) {
  const [action, setAction] = useState<DbAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!actionId) { setAction(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await db.from('actions').select('*').eq('id', actionId).maybeSingle();
      if (!cancelled) { setAction(data as any); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [actionId]);

  useEffect(() => {
    if (!action) return;
    const photos = (action.evidence_photos ?? []) as string[];
    let cancelled = false;
    (async () => {
      const missing = photos.filter(p => !photoUrls[p] && !p.startsWith('http'));
      if (missing.length === 0) return;
      const entries = await Promise.all(missing.map(async p => {
        const { data } = await supabase.storage.from('action-evidence').createSignedUrl(p, 60 * 60);
        return [p, data?.signedUrl ?? ''] as const;
      }));
      if (!cancelled) setPhotoUrls(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => { cancelled = true; };
  }, [action, photoUrls]);

  if (!actionId) return null;

  const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
  const impact = (action as any)?.impact_score ?? 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl flex flex-col animate-slide-in-right"
        style={{ background: 'linear-gradient(180deg,#132038 0%,#0F1B2E 100%)', border: '1px solid rgba(232,93,58,0.3)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-start gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232,93,58,0.15)', color: '#E85D3A' }}>
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white truncate">{action?.title ?? (loading ? 'Carregando…' : 'Ação')}</h2>
            <p className="text-[11px] text-white/60 truncate">{action ? `${action.category ?? action.type} · ${action.status}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {loading && (
            <div className="py-10 flex items-center justify-center text-white/50 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando ação…
            </div>
          )}
          {action && (
            <>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60">Impacto</span>
                  <div>
                    <span className="text-xl font-black" style={{ color: scoreColor(impact) }}>{impact}</span>
                    <span className="text-[11px] text-white/50 ml-1">/ 100</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${impact}%`, background: `linear-gradient(90deg, #E11D48 0%, #F59E0B 50%, ${scoreColor(impact)} 100%)` }} />
                </div>
                <div className="text-[11px] mt-1 font-semibold" style={{ color: scoreColor(impact) }}>{scoreLabel(impact)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <InfoTile icon={MapPin} label="Município" value={action.municipality ?? '—'} />
                <InfoTile icon={Calendar} label="Data" value={fmtDate(action.executed_date ?? action.planned_date)} />
                <InfoTile icon={Users} label="Pessoas" value={(action.executed_people_count ?? 0).toLocaleString('pt-BR')} />
                <InfoTile icon={Target} label="Prioridade" value={String(action.priority ?? '—')} />
              </div>

              {(action.planned_time || action.responsible) && (
                <div className="text-[11px] text-white/60">
                  {action.planned_time && <>Horário: <span className="text-white/80 font-semibold">{action.planned_time}</span> · </>}
                  {action.responsible && <>Responsável: <span className="text-white/80 font-semibold">{action.responsible}</span></>}
                </div>
              )}

              {(action.lat && action.lng) && (
                <div className="text-[10px] text-white/50">
                  Coord.: {action.lat.toFixed(5)}, {action.lng.toFixed(5)}
                </div>
              )}

              {action.description && (
                <Section title="Descrição">
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{action.description}</p>
                </Section>
              )}

              {action.observations && (
                <Section title="Observações">
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{action.observations}</p>
                </Section>
              )}

              <Section title={`Evidências (${(action.evidence_photos ?? []).length})`}>
                {(action.evidence_photos ?? []).length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <ImageIcon className="w-4 h-4" /> Sem fotos anexadas
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(action.evidence_photos ?? []).map((p, i) => {
                      const src = p.startsWith('http') ? p : photoUrls[p];
                      return (
                        <a key={i} href={src} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                          {src ? (
                            <img src={src} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </Section>

              <div className="text-[10px] text-white/40 pt-2 border-t border-white/5">
                Registrado por {authorName ?? '—'} em {fmtDate(action.created_at)}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            onClick={onDelete}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-red-300 hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
          <Link
            to={`/campo/acao?edit=${actionId}`}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-white"
            style={{ background: 'linear-gradient(135deg,#E85D3A 0%,#F59E0B 100%)' }}
            onClick={onClose}
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1 text-white/50 text-[10px] uppercase tracking-wider">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="text-xs text-white font-semibold truncate mt-0.5">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1.5">{title}</div>
      {children}
    </div>
  );
}
