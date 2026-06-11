import { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Camera, CheckCircle, Loader2, X, AlertTriangle, Plus } from 'lucide-react';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { supabase } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'pre_campanha_irregular', label: 'Pré-campanha irregular (pedido explícito de voto)' },
  { value: 'abuso_poder_economico', label: 'Abuso do poder econômico' },
  { value: 'uso_maquina_publica', label: 'Uso da máquina pública' },
  { value: 'material_irregular', label: 'Material irregular de campanha' },
  { value: 'outro', label: 'Outra irregularidade eleitoral' },
];

interface EvidenceFile {
  file: File;
  previewUrl: string;
  uploading: boolean;
  capturedAt: string;
  uploaded?: {
    url: string;
    path: string;
    sha256: string;
    mime: string;
    size: number;
    captured_at: string;
  };
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatStamp(d: Date): string {
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

// Aplica selo de data/hora + GPS na imagem usando canvas
async function stampImage(file: File, capturedAt: Date, geoText: string): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);

    const stamp = formatStamp(capturedAt);
    const lines = [stamp, geoText].filter(Boolean);
    const base = Math.max(canvas.width, canvas.height);
    const fontSize = Math.round(base * 0.028);
    const pad = Math.round(fontSize * 0.6);
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'bottom';

    const lineH = fontSize * 1.25;
    const blockH = lines.length * lineH + pad;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2;
    const x = pad;
    const y = canvas.height - pad;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - pad / 2, y - blockH, maxW, blockH + pad / 2);

    ctx.fillStyle = '#fff';
    lines.forEach((l, i) => {
      ctx.fillText(l, x + pad / 2, y - (lines.length - 1 - i) * lineH);
    });

    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92));
    const newName = file.name.replace(/\.[^.]+$/, '') + '_stamped.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: capturedAt.getTime() });
  } catch {
    return file;
  }
}

type Step = 'evidence' | 'form' | 'confirm';

export default function CampoFiscalize() {
  const { user } = useAuth();
  const { activeCandidate } = useCandidate();
  const captureRef = useRef<HTMLInputElement>(null);
  const autoOpenedRef = useRef(false);

  const [step, setStep] = useState<Step>('evidence');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [denouncedName, setDenouncedName] = useState('');
  const [denouncedRole, setDenouncedRole] = useState('');
  const [denouncedParty, setDenouncedParty] = useState('');
  const [narrative, setNarrative] = useState('');
  const [geo, setGeo] = useState<GeoValue>({ city: '', lat: null, lng: null });
  const [evidences, setEvidences] = useState<EvidenceFile[]>([]);

  const baseValid = category && title.trim() && denouncedName.trim() && narrative.trim() && geo.city.trim();

  // Auto-abrir câmera + GPS em background no primeiro mount (modo flagrante)
  useEffect(() => {
    if (autoOpenedRef.current || !user) return;
    autoOpenedRef.current = true;

    // Dispara câmera
    setTimeout(() => captureRef.current?.click(), 250);

    // GPS em paralelo
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setGeo(prev => ({ ...prev, lat: latitude, lng: longitude }));
          // Reverse geocoding leve via Nominatim para popular cidade
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`);
            const data = await res.json();
            const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.municipality || '';
            const road = data?.address?.road || '';
            const label = [road, city].filter(Boolean).join(', ');
            if (label) setGeo(prev => ({ ...prev, city: prev.city || label }));
          } catch { /* silencioso */ }
        },
        () => { /* usuário negou; segue sem GPS */ },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [user]);

  async function handleFiles(files: FileList | null) {
    if (!files || !user) return;
    const list = Array.from(files).slice(0, 5 - evidences.length);
    for (const file of list) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: arquivo acima de 20MB`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const item: EvidenceFile = { file, previewUrl, uploading: true };
      setEvidences(prev => [...prev, item]);

      try {
        const hash = await sha256Hex(file);
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${user.id}/${Date.now()}-${hash.slice(0, 12)}.${ext}`;
        const { error } = await supabase.storage.from('fiscalize-evidence').upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (error) throw error;
        const { data: pub } = supabase.storage.from('fiscalize-evidence').getPublicUrl(path);
        setEvidences(prev => prev.map(e => e.file === file ? {
          ...e, uploading: false,
          uploaded: { url: pub.publicUrl, path, sha256: hash, mime: file.type, size: file.size },
        } : e));
      } catch (err: any) {
        toast.error(`Falha ao enviar ${file.name}: ${err.message}`);
        setEvidences(prev => prev.filter(e => e.file !== file));
      }
    }
  }

  async function handleSubmit() {
    if (!baseValid) return;
    setSubmitting(true);
    try {
      const evidence = evidences.filter(e => e.uploaded).map(e => e.uploaded!);
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('fiscalize-submit', {
        body: {
          candidate_id: activeCandidate?.id ?? null,
          category, title,
          denounced_name: denouncedName,
          denounced_role: denouncedRole || null,
          denounced_party: denouncedParty || null,
          narrative,
          lat: geo.lat, lng: geo.lng,
          address: geo.city, municipality: geo.city,
          evidence,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setStep('evidence');
        autoOpenedRef.current = false;
        setCategory(''); setTitle(''); setDenouncedName(''); setDenouncedRole('');
        setDenouncedParty(''); setNarrative(''); setGeo({ city: '', lat: null, lng: null }); setEvidences([]);
      }, 3500);
    } catch (err: any) {
      toast.error(`Falha ao enviar denúncia: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-fade-in max-w-sm px-6">
          <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-brand-green" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Denúncia Enviada ao Jurídico</h2>
          <p className="text-muted-foreground text-sm">A equipe jurídica recebeu sua denúncia com a cadeia de custódia das provas.</p>
        </div>
      </div>
    );
  }

  const uploading = evidences.some(e => e.uploading);
  const hasEvidence = evidences.length > 0;

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto relative">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <div>
            <h1 className="text-base font-bold text-foreground">Fiscalize</h1>
            <p className="text-xs text-muted-foreground">Flagrante eleitoral · capture a prova primeiro</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {[
            { id: 'evidence', label: '1. Provas' },
            { id: 'form', label: '2. Denúncia' },
            { id: 'confirm', label: '3. Enviar' },
          ].map(s => (
            <button key={s.id} onClick={() => setStep(s.id as Step)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                step === s.id ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input camera global — sempre montado para o FAB funcionar */}
      <input ref={captureRef} type="file" accept="image/*,video/*,audio/*"
        capture="environment" multiple
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} className="hidden" />

      <div className="flex-1 overflow-auto p-4 pb-24">
        {step === 'evidence' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Capture pela câmera para preservar a cadeia de custódia. Cada arquivo recebe hash SHA-256, GPS e timestamp do servidor.
              </p>
            </div>

            {!hasEvidence && (
              <button onClick={() => captureRef.current?.click()}
                className="w-full aspect-video rounded-2xl border-2 border-dashed border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center gap-3 hover:bg-destructive/10 transition-colors">
                <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-destructive" />
                </div>
                <div className="text-center px-6">
                  <div className="text-sm font-semibold text-foreground">Abrir câmera</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Toque para registrar foto, vídeo ou áudio do flagrante</div>
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              {evidences.map((e, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted border border-border relative overflow-hidden">
                  {e.file.type.startsWith('image/') ? (
                    <img src={e.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted-foreground p-2 text-center">
                      <Camera className="w-6 h-6 mb-1" />
                      {e.file.name.slice(0, 24)}
                    </div>
                  )}
                  {e.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  {e.uploaded && (
                    <div className="absolute bottom-1 left-1 right-1 bg-black/70 rounded px-1.5 py-0.5 text-[9px] text-white truncate font-mono">
                      sha {e.uploaded.sha256.slice(0, 10)}…
                    </div>
                  )}
                  <button onClick={() => setEvidences(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {hasEvidence && evidences.length < 5 && (
                <button onClick={() => captureRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-destructive/50 hover:bg-destructive/5 transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Nova prova</span>
                </button>
              )}
            </div>

            {geo.lat && (
              <div className="text-[10px] text-muted-foreground text-center">
                📍 GPS capturado: {geo.lat.toFixed(5)}, {geo.lng?.toFixed(5)}
              </div>
            )}

            <button onClick={() => setStep('form')} disabled={uploading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-destructive-foreground bg-destructive disabled:opacity-40">
              {uploading ? 'Enviando provas…' : hasEvidence ? 'Próximo: Preencher denúncia →' : 'Pular e preencher sem provas →'}
            </button>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4 animate-fade-in">
            {hasEvidence && (
              <div className="rounded-lg bg-brand-green/10 border border-brand-green/30 p-2 text-xs text-foreground">
                ✓ {evidences.filter(e => e.uploaded).length} prova(s) já preservada(s) com hash e timestamp
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Categoria da Irregularidade *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Título da Denúncia *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={140}
                placeholder="Ex: Distribuição de cestas básicas em comício"
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Denunciado *</label>
              <input value={denouncedName} onChange={e => setDenouncedName(e.target.value)} maxLength={120}
                placeholder="Nome do denunciado"
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-2" />
              <div className="grid grid-cols-2 gap-2">
                <input value={denouncedRole} onChange={e => setDenouncedRole(e.target.value)} maxLength={60}
                  placeholder="Cargo / função"
                  className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={denouncedParty} onChange={e => setDenouncedParty(e.target.value)} maxLength={20}
                  placeholder="Partido"
                  className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <GeoLocationInput value={geo} onChange={setGeo} required
              label="Local da Irregularidade *"
              placeholder="Geolocalizar ou informar endereço" />

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Relato dos Fatos *</label>
              <textarea value={narrative} onChange={e => setNarrative(e.target.value)} rows={5} maxLength={3000}
                placeholder="Descreva quando, onde e como a irregularidade ocorreu..."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              <div className="text-[10px] text-muted-foreground text-right mt-1">{narrative.length}/3000</div>
            </div>

            <button onClick={() => baseValid && setStep('confirm')} disabled={!baseValid}
              className="w-full h-12 rounded-xl font-semibold text-sm text-destructive-foreground bg-destructive disabled:opacity-40 disabled:cursor-not-allowed">
              {baseValid ? 'Próximo: Revisar e Enviar →' : 'Preencha os campos obrigatórios'}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Confirmar Denúncia</h2>
            <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
              {[
                { label: 'Categoria', value: CATEGORIES.find(c => c.value === category)?.label ?? '—' },
                { label: 'Título', value: title },
                { label: 'Denunciado', value: `${denouncedName}${denouncedRole ? ` · ${denouncedRole}` : ''}${denouncedParty ? ` · ${denouncedParty}` : ''}` },
                { label: 'Local', value: geo.city },
                { label: 'Coordenadas', value: geo.lat ? `${geo.lat.toFixed(5)}, ${geo.lng?.toFixed(5)}` : '—' },
                { label: 'Provas anexadas', value: `${evidences.filter(e => e.uploaded).length} arquivo(s)` },
                { label: 'Candidato vinculado', value: activeCandidate?.name ?? 'Nenhum (visível ao admin master)' },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted-foreground flex-shrink-0">{item.label}</span>
                  <span className="text-xs font-medium text-foreground text-right">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Relato:</div>
              <div className="text-xs text-foreground whitespace-pre-wrap">{narrative}</div>
            </div>
            <button onClick={handleSubmit} disabled={submitting || !baseValid}
              className="w-full h-12 rounded-xl font-semibold text-sm text-destructive-foreground bg-destructive disabled:opacity-40 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando ao jurídico…</> : 'Enviar Denúncia ao Jurídico'}
            </button>
          </div>
        )}
      </div>

      {/* FAB +Prova persistente em todas as etapas (exceto quando ainda não há nenhuma e a tela já mostra o botão grande) */}
      {!(step === 'evidence' && !hasEvidence) && evidences.length < 5 && (
        <button onClick={() => captureRef.current?.click()}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-destructive text-destructive-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Capturar nova prova">
          <Camera className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
