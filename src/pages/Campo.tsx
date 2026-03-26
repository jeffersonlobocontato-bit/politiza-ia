import { useState } from 'react';
import { Smartphone, Camera, CheckCircle } from 'lucide-react';
import { useCreateAction } from '@/hooks/useActions';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';

interface FieldInput {
  actionTitle: string;
  executedDate: string;
  executedTime: string;
  peopleCount: string;
  observations: string;
  result: string;
}

export default function Campo() {
  const createAction = useCreateAction();
  const [step, setStep] = useState<'form' | 'photo' | 'confirm'>('form');
  const [input, setInput] = useState<FieldInput>({
    actionTitle: '',
    executedDate: new Date().toISOString().split('T')[0],
    executedTime: new Date().toTimeString().slice(0, 5),
    peopleCount: '',
    observations: '',
    result: '',
  });
  const [geo, setGeo] = useState<GeoValue>({ city: '', lat: null, lng: null });
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof FieldInput, value: string) => setInput(prev => ({ ...prev, [key]: value }));

  const geoValid = geo.city.trim() !== '' && geo.lat !== null && geo.lng !== null;

  const handleSubmit = () => {
    if (!geoValid) return;

    createAction.mutate({
      title: input.actionTitle || 'Ação de Campo',
      type: 'mobilizacao_comunitaria',
      category: 'Campo',
      description: input.observations || input.result || 'Registro de campo',
      municipality: geo.city,
      microregion: geo.city || null,
      macroregion_id: 'rmc',
      address: null,
      lat: geo.lat!,
      lng: geo.lng!,
      responsible: 'Equipe de Campo',
      team: [],
      planned_date: input.executedDate,
      planned_time: input.executedTime,
      priority: 'media',
      target_audience: 'Público geral',
      estimated_impact: parseInt(input.peopleCount) || 0,
      status: 'realizada',
      executed_date: input.executedDate,
      executed_people_count: parseInt(input.peopleCount) || 0,
      observations: input.observations || null,
      evidence_photos: photos,
      created_by: null,
      updated_by: null,
    });

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setStep('form');
    setInput({
      actionTitle: '',
      executedDate: new Date().toISOString().split('T')[0],
      executedTime: new Date().toTimeString().slice(0, 5),
      peopleCount: '', observations: '', result: '',
    });
    setGeo({ city: '', lat: null, lng: null });
    setPhotos([]);
  };

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-brand-green" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Ação Registrada!</h2>
          <p className="text-muted-foreground text-sm">Sua execução foi enviada para o sistema.</p>
          <p className="text-xs text-muted-foreground mt-1">Já aparece no Mapa Estratégico e na Sala de Guerra.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Registro de Campo</h1>
            <p className="text-xs text-muted-foreground">Input de execução — Interface simplificada</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {[
            { id: 'form', label: '1. Dados + Local' },
            { id: 'photo', label: '2. Evidências' },
            { id: 'confirm', label: '3. Enviar' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStep(s.id as any)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${step === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">

        {/* ── Step 1: Dados + Localização ── */}
        {step === 'form' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Dados da Execução</h2>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Título / Nome da Ação *</label>
              <input
                value={input.actionTitle}
                onChange={e => update('actionTitle', e.target.value)}
                placeholder="Ex: Panfletagem Centro de Curitiba"
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Geolocation — obrigatória */}
            <GeoLocationInput
              value={geo}
              onChange={setGeo}
              required
              label="Cidade / Localização Exata *"
              placeholder="Ex: Curitiba, Londrina, Maringá..."
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Data de Execução</label>
                <input type="date" value={input.executedDate} onChange={e => update('executedDate', e.target.value)} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Horário Real</label>
                <input type="time" value={input.executedTime} onChange={e => update('executedTime', e.target.value)} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Pessoas Impactadas (estimativa) *</label>
              <input
                type="number"
                value={input.peopleCount}
                onChange={e => update('peopleCount', e.target.value)}
                placeholder="Ex: 500"
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Resultado Percebido</label>
              <select value={input.result} onChange={e => update('result', e.target.value)} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                <option>Ótimo — Alta receptividade</option>
                <option>Bom — Boa receptividade</option>
                <option>Regular — Receptividade moderada</option>
                <option>Fraco — Baixa receptividade</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Observações</label>
              <textarea
                value={input.observations}
                onChange={e => update('observations', e.target.value)}
                placeholder="Descreva como foi a ação, situações relevantes..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button
              onClick={() => geoValid && setStep('photo')}
              disabled={!geoValid}
              className="w-full h-12 rounded-xl font-semibold text-sm text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {geoValid ? 'Próximo: Adicionar Evidências →' : 'Informe a localização para continuar'}
            </button>
          </div>
        )}

        {/* ── Step 2: Evidências ── */}
        {step === 'photo' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Evidências Fotográficas</h2>
            <p className="text-xs text-muted-foreground">Adicione fotos que comprovem a realização da ação.</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted border border-border flex items-center justify-center relative overflow-hidden">
                  <img src={p} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                </div>
              ))}
              <button
                onClick={() => setPhotos([...photos, `https://picsum.photos/200/200?random=${Date.now()}`])}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Adicionar foto</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Clique em "Adicionar foto" para simular upload de evidência</p>
            <button onClick={() => setStep('confirm')} className="w-full h-12 rounded-xl font-semibold text-sm text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
              Próximo: Confirmar Envio →
            </button>
          </div>
        )}

        {/* ── Step 3: Confirmar ── */}
        {step === 'confirm' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Confirmar Registro</h2>
            <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'var(--gradient-card)' }}>
              {[
                { label: 'Ação', value: input.actionTitle || '(não informado)' },
                { label: 'Cidade', value: geo.city || '(não informado)' },
                { label: 'Coordenadas', value: geo.lat ? `${geo.lat.toFixed(5)}, ${geo.lng?.toFixed(5)}` : 'Não definido' },
                { label: 'Data/Hora', value: `${input.executedDate} às ${input.executedTime}` },
                { label: 'Pessoas Impactadas', value: input.peopleCount ? `~${parseInt(input.peopleCount).toLocaleString()}` : '(não informado)' },
                { label: 'Resultado', value: input.result || '(não informado)' },
                { label: 'Evidências', value: `${photos.length} foto(s)` },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted-foreground flex-shrink-0">{item.label}</span>
                  <span className="text-xs font-medium text-foreground text-right">{item.value}</span>
                </div>
              ))}
            </div>
            {input.observations && (
              <div className="rounded-xl border border-border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">Observações:</div>
                <div className="text-xs text-foreground">{input.observations}</div>
              </div>
            )}
            {!geoValid && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                ⚠ Geolocalização não confirmada. Volte ao passo 1 e confirme a cidade.
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!geoValid}
              className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, hsl(142 72% 45%), hsl(142 72% 38%))' }}
            >
              <CheckCircle className="w-5 h-5" />
              Confirmar e Enviar Registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
