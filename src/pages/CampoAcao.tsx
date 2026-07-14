import { useState, useEffect, useMemo, useRef } from 'react';
import { Smartphone, Camera, CheckCircle, Upload, Loader2 } from 'lucide-react';
import { useCreateAction } from '@/hooks/useActions';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { db } from '@/lib/db';
import { calcImpactScore, scoreColor, scoreLabel } from '@/lib/impactScore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import { toast } from 'sonner';

interface FieldInput {
  actionTitle: string;
  executedDate: string;
  executedTime: string;
  peopleCount: string;
  observations: string;
}

export default function CampoAcao() {
  const createAction = useCreateAction();
  const [step, setStep] = useState<'form' | 'photo' | 'confirm'>('form');
  const [input, setInput] = useState<FieldInput>({
    actionTitle: '',
    executedDate: new Date().toISOString().split('T')[0],
    executedTime: new Date().toTimeString().slice(0, 5),
    peopleCount: '',
    observations: '',
  });
  const [geo, setGeo] = useState<GeoValue>({ city: '', lat: null, lng: null });
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [cityPopulation, setCityPopulation] = useState<number | null>(null);

  const update = (key: keyof FieldInput, value: string) => setInput(prev => ({ ...prev, [key]: value }));
  const geoValid = geo.city.trim() !== '' && geo.lat !== null && geo.lng !== null;

  // Busca população do município sempre que a cidade mudar
  useEffect(() => {
    const city = geo.city.trim();
    if (!city) { setCityPopulation(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from('municipalities')
        .select('population')
        .ilike('name', city)
        .maybeSingle();
      if (!cancelled) setCityPopulation((data as any)?.population ?? null);
    })();
    return () => { cancelled = true; };
  }, [geo.city]);

  const peopleNum = parseInt(input.peopleCount) || 0;
  const impactScore = useMemo(
    () => calcImpactScore(peopleNum, cityPopulation),
    [peopleNum, cityPopulation]
  );
  const impactColor = scoreColor(impactScore);
  const impactLabel = scoreLabel(impactScore);

  const handleSubmit = () => {
    if (!geoValid) return;
    createAction.mutate({
      title: input.actionTitle || 'Ação de Campo',
      type: 'mobilizacao_comunitaria',
      category: 'Campo',
      description: input.observations || 'Registro de campo',
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
      impact_score: impactScore,
      municipality_population_snapshot: cityPopulation,
    } as any);

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setStep('form');
    setInput({
      actionTitle: '',
      executedDate: new Date().toISOString().split('T')[0],
      executedTime: new Date().toTimeString().slice(0, 5),
      peopleCount: '', observations: '',
    });
    setGeo({ city: '', lat: null, lng: null });
    setPhotos([]);
  };

  if (submitted) {
    return (
      <div className="campo-screen items-center justify-center">
        <div className="text-center animate-fade-in px-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(47,168,90,0.15)', border: '1px solid rgba(47,168,90,0.35)' }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--campo-mint-glow)' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ação Registrada!</h2>
          <p className="text-sm" style={{ color: 'var(--campo-text-mute)' }}>Sua execução foi enviada para o sistema.</p>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'form', label: '1. Dados' },
    { id: 'photo', label: '2. Evidências' },
    { id: 'confirm', label: '3. Enviar' },
  ] as const;

  return (
    <div className="campo-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="campo-page-header">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(31,90,180,0.18)', border: '1px solid rgba(31,90,180,0.4)' }}
        >
          <Smartphone className="w-4 h-4" style={{ color: '#5BA0FF' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1>Registrar Ação</h1>
          <p>Execução de campo · {steps.find(s => s.id === step)?.label}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-4 py-3 flex gap-1.5" style={{ borderBottom: '1px solid var(--campo-line)' }}>
        {steps.map(s => (
          <button
            key={s.id}
            onClick={() => setStep(s.id as any)}
            className={`campo-pill ${step === s.id ? 'campo-pill-active' : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-4 pb-24">
        {step === 'form' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="campo-h2">Dados da Execução</h2>

            <div>
              <label className="campo-label">Título / Nome da Ação *</label>
              <input
                value={input.actionTitle}
                onChange={e => update('actionTitle', e.target.value)}
                placeholder="Ex: Panfletagem Centro de Curitiba"
                className="campo-input"
              />
            </div>

            <GeoLocationInput
              value={geo}
              onChange={setGeo}
              required
              label="Cidade / Localização *"
              placeholder="Ex: Curitiba, Londrina, Maringá..."
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="campo-label">Data</label>
                <input type="date" value={input.executedDate} onChange={e => update('executedDate', e.target.value)} className="campo-input" />
              </div>
              <div className="min-w-0">
                <label className="campo-label">Horário</label>
                <input type="time" value={input.executedTime} onChange={e => update('executedTime', e.target.value)} className="campo-input" />
              </div>
            </div>

            <div>
              <label className="campo-label">Pessoas Impactadas *</label>
              <input
                type="number"
                value={input.peopleCount}
                onChange={e => update('peopleCount', e.target.value)}
                placeholder="Ex: 500"
                className="campo-input"
              />
            </div>

            {/* Pontuação de Impacto (calculada automaticamente) */}
            <div className="campo-card-flat p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <label className="campo-label !mb-0">Pontuação de Impacto</label>
                <div className="text-right">
                  <span className="text-lg font-bold" style={{ color: impactColor }}>
                    {impactScore}
                  </span>
                  <span className="text-xs ml-1" style={{ color: 'var(--campo-text-mute)' }}>/ 100</span>
                </div>
              </div>
              <div
                className="h-3 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${impactScore}%`,
                    background: `linear-gradient(90deg, #E11D48 0%, #F59E0B 50%, ${impactColor} 100%)`,
                    boxShadow: impactScore > 0 ? `0 0 8px ${impactColor}66` : 'none',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: impactColor, fontWeight: 600 }}>{impactLabel}</span>
                <span style={{ color: 'var(--campo-text-mute)' }}>
                  {cityPopulation
                    ? `${cityPopulation.toLocaleString('pt-BR')} hab. na cidade`
                    : geo.city ? 'População da cidade não cadastrada' : 'Selecione a cidade'}
                </span>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--campo-text-mute)' }}>
                Calculada a partir de pessoas impactadas + proporção da população do município. Quanto maior a % da cidade alcançada, maior o score.
              </p>
            </div>

            <div>
              <label className="campo-label">Observações</label>
              <textarea
                value={input.observations}
                onChange={e => update('observations', e.target.value)}
                placeholder="Descreva como foi a ação, situações relevantes..."
                rows={3}
                className="campo-textarea"
              />
            </div>

            <button
              onClick={() => geoValid && setStep('photo')}
              disabled={!geoValid}
              className="campo-cta w-full"
            >
              {geoValid ? 'Próximo: Evidências →' : 'Informe a localização para continuar'}
            </button>
          </div>
        )}

        {step === 'photo' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="campo-h2">Evidências Fotográficas</h2>
            <p className="campo-helper">Adicione fotos que comprovem a realização da ação.</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden relative campo-card-flat">
                  <img src={p} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setPhotos([...photos, `https://picsum.photos/200/200?random=${Date.now()}`])}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-colors"
                style={{
                  border: '2px dashed var(--campo-line-strong)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--campo-text-mute)',
                }}
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Adicionar foto</span>
              </button>
            </div>
            <button onClick={() => setStep('confirm')} className="campo-cta w-full">
              Próximo: Confirmar →
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="campo-h2">Confirmar Registro</h2>
            <div className="campo-card p-4 space-y-2.5">
              {[
                { label: 'Ação', value: input.actionTitle || '(não informado)' },
                { label: 'Cidade', value: geo.city || '(não informado)' },
                { label: 'Coordenadas', value: geo.lat ? `${geo.lat.toFixed(5)}, ${geo.lng?.toFixed(5)}` : '—' },
                { label: 'Data/Hora', value: `${input.executedDate} às ${input.executedTime}` },
                { label: 'Pessoas', value: input.peopleCount ? `~${parseInt(input.peopleCount).toLocaleString()}` : '—' },
                { label: 'Pontuação', value: `${impactScore}/100 (${impactLabel})` },
                { label: 'Evidências', value: `${photos.length} foto(s)` },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                  <span style={{ color: 'var(--campo-text-mute)' }}>{item.label}</span>
                  <span className="font-semibold text-right text-white">{item.value}</span>
                </div>
              ))}
            </div>
            {input.observations && (
              <div className="campo-card-flat p-3">
                <div className="text-[11px] mb-1" style={{ color: 'var(--campo-text-mute)' }}>Observações:</div>
                <div className="text-xs text-white">{input.observations}</div>
              </div>
            )}
            <button onClick={handleSubmit} disabled={!geoValid} className="campo-cta w-full">
              <CheckCircle className="w-5 h-5" /> Confirmar e Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
