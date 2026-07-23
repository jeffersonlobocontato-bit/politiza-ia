import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, User, MapPin, Tag, Vote, FileCheck, Camera } from 'lucide-react';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { LeadershipProfileSelect } from '@/components/leadership/LeadershipProfileSelect';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import {
  useLeader, useCreateLeader, useUpdateLeader,
  useLeaderPoliticalHistory, useSaveLeaderPoliticalHistory,
  useLeaderProfiles, useSetLeaderProfiles,
} from '@/hooks/useLeaders';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Pessoa', icon: User },
  { id: 2, label: 'Local', icon: MapPin },
  { id: 3, label: 'Segmento', icon: Tag },
  { id: 4, label: 'Político', icon: Vote },
  { id: 5, label: 'Revisão', icon: FileCheck },
];

export default function CampoLiderancaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const { activeCandidate, scopedCandidateIds, allActiveCandidates } = useCandidate();

  const { data: existing } = useLeader(id);
  const { data: politicalHistory } = useLeaderPoliticalHistory(id);
  const { data: existingProfileIds } = useLeaderProfiles(id);
  const createLeader = useCreateLeader();
  const updateLeader = useUpdateLeader();
  const savePolHistory = useSaveLeaderPoliticalHistory();
  const setProfiles = useSetLeaderProfiles();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [geo, setGeo] = useState<GeoValue>({ city: '', lat: null, lng: null });
  const [neighborhood, setNeighborhood] = useState('');
  const [profileIds, setProfileIds] = useState<string[]>([]);
  const [alignment, setAlignment] = useState('neutro');
  const [influence, setInfluence] = useState(5);
  const [mobilization, setMobilization] = useState(5);
  const [currentParty, setCurrentParty] = useState('');
  const [supportedLast, setSupportedLast] = useState('');
  const [observations, setObservations] = useState('');
  const [wasCandidate, setWasCandidate] = useState(false);
  const [timesCandidate, setTimesCandidate] = useState(0);
  const [heldMandate, setHeldMandate] = useState(false);
  const [mandateCount, setMandateCount] = useState(0);
  const [positionsHeld, setPositionsHeld] = useState('');
  const [electoralPerformance, setElectoralPerformance] = useState('');
  const [wasNeighborhoodPresident, setWasNeighborhoodPresident] = useState(false);
  const [hasCurrentMandate, setHasCurrentMandate] = useState(false);
  const [currentMandatePosition, setCurrentMandatePosition] = useState('');
  const [currentMandateCommunity, setCurrentMandateCommunity] = useState('');
  const [currentMandateEntity, setCurrentMandateEntity] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? '');
      setPhone(existing.phone ?? '');
      setEmail(existing.email ?? '');
      setPhotoUrl(existing.photo_url ?? '');
      setGeo({ city: existing.municipality ?? '', lat: existing.lat, lng: existing.lng });
      setNeighborhood(existing.neighborhood ?? '');
      setAlignment(existing.alignment_status ?? 'neutro');
      setInfluence(existing.influence_level ?? 5);
      setMobilization(existing.mobilization_capacity ?? 5);
      setCurrentParty(existing.current_party ?? '');
      setObservations(existing.observations ?? '');
    }
  }, [existing]);

  useEffect(() => { if (existingProfileIds) setProfileIds(existingProfileIds); }, [existingProfileIds]);

  useEffect(() => {
    if (politicalHistory) {
      setWasCandidate(politicalHistory.was_candidate ?? false);
      setTimesCandidate(politicalHistory.times_candidate ?? 0);
      setHeldMandate(politicalHistory.held_mandate ?? false);
      setMandateCount(politicalHistory.mandate_count ?? 0);
      setPositionsHeld((politicalHistory.positions_held ?? []).join(', '));
      setElectoralPerformance(politicalHistory.electoral_performance ?? '');
      setWasNeighborhoodPresident(politicalHistory.was_neighborhood_president ?? false);
      setHasCurrentMandate((politicalHistory as any).has_current_mandate ?? false);
      setCurrentMandatePosition((politicalHistory as any).current_mandate_position ?? '');
      setCurrentMandateCommunity((politicalHistory as any).current_mandate_community ?? '');
      setCurrentMandateEntity((politicalHistory as any).current_mandate_entity ?? '');
    }
  }, [politicalHistory]);

  const canAdvance = () => {
    if (step === 1) return (name ?? '').trim() !== '';
    if (step === 2) return geo.city && geo.lat !== null && geo.lng !== null;
    return true;
  };

  const handleSubmit = async () => {
    if (!name || !geo.city || geo.lat === null) {
      toast.error('Nome e localização são obrigatórios.');
      return;
    }
    const payload: any = {
      name,
      phone: phone || null,
      email: email || null,
      photo_url: photoUrl || null,
      municipality: geo.city,
      neighborhood: neighborhood || null,
      lat: geo.lat,
      lng: geo.lng,
      alignment_status: alignment,
      influence_level: influence,
      mobilization_capacity: mobilization,
      current_party: currentParty || null,
      observations: [observations, supportedLast ? `Apoiou na última: ${supportedLast}` : ''].filter(Boolean).join('\n') || null,
      coverage_type: neighborhood ? 'bairro' : 'cidade',
      status: 'ativo',
    };
    try {
      let leaderId = id;
      if (isEdit && id) {
        await updateLeader.mutateAsync({ id, ...payload, updated_by: user?.id ?? null });
      } else {
        const candidateId =
          activeCandidate?.id
          ?? scopedCandidateIds[0]
          ?? (allActiveCandidates.length === 1 ? allActiveCandidates[0].id : null);
        const res = await createLeader.mutateAsync({
          ...payload,
          candidate_id: candidateId,
          created_by: user?.id ?? null,
        });
        leaderId = (res as any)?.id;
      }
      if (leaderId) {
        await setProfiles.mutateAsync({ leaderId, profileIds });
        await savePolHistory.mutateAsync({
          leader_id: leaderId,
          was_candidate: wasCandidate,
          times_candidate: timesCandidate,
          held_mandate: heldMandate,
          mandate_count: mandateCount,
          positions_held: positionsHeld.split(',').map(s => s.trim()).filter(Boolean),
          electoral_performance: electoralPerformance || null,
          was_neighborhood_president: wasNeighborhoodPresident,
          was_councilperson: false,
          positions_disputed: [],
          election_years: [],
          has_current_mandate: hasCurrentMandate,
          current_mandate_position: hasCurrentMandate ? (currentMandatePosition || null) : null,
          current_mandate_community: hasCurrentMandate && currentMandatePosition === 'lideranca_comunitaria' ? (currentMandateCommunity || null) : null,
          current_mandate_entity: hasCurrentMandate && currentMandatePosition === 'presidente_entidade' ? (currentMandateEntity || null) : null,
        });
      }
      toast.success(isEdit ? 'Liderança atualizada!' : 'Liderança cadastrada!');
      navigate('/campo/liderancas');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    }
  };

  // Design system: classes globais .campo-* (definidas em styles/campo-mobile.css)
  const inputCls = 'campo-input';
  const labelCls = 'campo-label';

  return (
    <div className="campo-screen w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="campo-page-header">
        <Link to="/campo/liderancas" className="campo-icon-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1>{isEdit ? 'Editar Liderança' : 'Nova Liderança'}</h1>
          <p>Passo {step} de {STEPS.length} — {STEPS[step-1].label}</p>
        </div>
      </div>

      {/* Stepper */}
      <div
        className="px-4 py-3 flex gap-1.5 flex-shrink-0 overflow-x-auto scrollbar-none"
        style={{ borderBottom: '1px solid var(--campo-line)' }}
      >
        {STEPS.map(s => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`campo-pill ${active ? 'campo-pill-active' : ''} flex flex-col items-center gap-1 py-2 min-w-[64px]`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Content — uniform px-4 py-4 (symmetric on all sides) */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4 pb-24">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className={labelCls}>Nome completo *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Ex: João Silva" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={labelCls}>Telefone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="(41) 99999-0000" />
              </div>
              <div className="min-w-0">
                <label className={labelCls}>E-mail</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="email@dominio.com" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Foto (URL)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className={inputCls} placeholder="URL da foto" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(`https://i.pravatar.cc/200?u=${Date.now()}`)}
                  className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" /> Simular
                </button>
              </div>
              {photoUrl && <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover mt-3 border-2 border-[#2FA85A]/40" />}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <GeoLocationInput value={geo} onChange={setGeo} required label="Cidade / GPS *" placeholder="Ex: Curitiba" />
            <div>
              <label className={labelCls}>Bairro / Comunidade</label>
              <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inputCls} placeholder="Ex: Centro, Vila Hauer..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-white/60 leading-relaxed">Selecione os segmentos em que essa liderança atua (religiosa, comunitária, jovens, etc.).</p>
            <LeadershipProfileSelect selectedIds={profileIds} onChange={setProfileIds} label="Segmentos da Liderança" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={labelCls}>Alinhamento</label>
                <select value={alignment} onChange={e => setAlignment(e.target.value)} className={inputCls}>
                  <option value="alinhado">Alinhado</option>
                  <option value="provavel">Provável</option>
                  <option value="neutro">Neutro</option>
                  <option value="oposicao">Oposição</option>
                  <option value="indefinido">Indefinido</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className={labelCls}>Partido atual</label>
                <input value={currentParty} onChange={e => setCurrentParty(e.target.value)} className={inputCls} placeholder="Ex: PL, Novo..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={labelCls}>Influência (1-10)</label>
                <ScoreStepper value={influence} onChange={setInfluence} min={1} max={10} />
              </div>
              <div className="min-w-0">
                <label className={labelCls}>Mobilização (1-10)</label>
                <ScoreStepper value={mobilization} onChange={setMobilization} min={1} max={10} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Quem apoiou na última eleição?</label>
              <input value={supportedLast} onChange={e => setSupportedLast(e.target.value)} className={inputCls} placeholder="Ex: Candidato X (Prefeito 2024)" />
            </div>

            <div className="rounded-xl border border-white/10 p-3 space-y-3 bg-white/5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#5BE0A0]">Histórico Político</div>
              <label className="flex items-center gap-2 text-xs text-white/80">
                <input type="checkbox" checked={wasCandidate} onChange={e => setWasCandidate(e.target.checked)} className="accent-[#2FA85A]" /> Já foi candidato
              </label>
              {wasCandidate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                  <div className="min-w-0">
                    <label className="text-[10px] text-white/50 block mb-1">Quantas vezes</label>
                    <input type="number" min={0} value={timesCandidate} onChange={e => setTimesCandidate(parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] text-white/50 block mb-1">Desempenho (votos)</label>
                    <input value={electoralPerformance} onChange={e => setElectoralPerformance(e.target.value)} className={inputCls} placeholder="Ex: 2.300 votos" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-white/80">
                <input type="checkbox" checked={heldMandate} onChange={e => setHeldMandate(e.target.checked)} className="accent-[#2FA85A]" /> Já teve mandato
              </label>
              {heldMandate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                  <div className="min-w-0">
                    <label className="text-[10px] text-white/50 block mb-1">Quantos mandatos</label>
                    <input type="number" min={0} value={mandateCount} onChange={e => setMandateCount(parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] text-white/50 block mb-1">Cargos (vírgulas)</label>
                    <input value={positionsHeld} onChange={e => setPositionsHeld(e.target.value)} className={inputCls} placeholder="Vereador, Secretário..." />
                  </div>
                </div>
              )}
              <label className="flex items-start gap-2 text-xs text-white/80 leading-snug">
                <input type="checkbox" checked={wasNeighborhoodPresident} onChange={e => setWasNeighborhoodPresident(e.target.checked)} className="accent-[#2FA85A] mt-0.5" />
                <span>Já presidiu associação de bairro/entidade</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={hasCurrentMandate}
                  onChange={e => {
                    setHasCurrentMandate(e.target.checked);
                    if (!e.target.checked) {
                      setCurrentMandatePosition('');
                      setCurrentMandateCommunity('');
                      setCurrentMandateEntity('');
                    }
                  }}
                  className="accent-[#2FA85A]"
                /> Tem mandato (atual)
              </label>
              {hasCurrentMandate && (
                <div className="pl-5 space-y-2">
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1">Cargo atual</label>
                    <select
                      value={currentMandatePosition}
                      onChange={e => {
                        const v = e.target.value;
                        setCurrentMandatePosition(v);
                        if (v !== 'lideranca_comunitaria') setCurrentMandateCommunity('');
                        if (v !== 'presidente_entidade') setCurrentMandateEntity('');
                      }}
                      className={inputCls}
                    >
                      <option value="">Selecione…</option>
                      <option value="lideranca_comunitaria">Liderança comunitária</option>
                      <option value="presidente_entidade">Presidente de entidade</option>
                      <option value="vereador">Vereador</option>
                      <option value="prefeito">Prefeito</option>
                      <option value="deputado_estadual">Deputado estadual</option>
                      <option value="deputado_federal">Deputado federal</option>
                    </select>
                  </div>
                  {currentMandatePosition === 'lideranca_comunitaria' && (
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1">Comunidade / Bairro</label>
                      <input
                        value={currentMandateCommunity}
                        onChange={e => setCurrentMandateCommunity(e.target.value)}
                        className={inputCls}
                        placeholder="Nome da comunidade ou bairro"
                      />
                    </div>
                  )}
                  {currentMandatePosition === 'presidente_entidade' && (
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1">Entidade</label>
                      <input
                        value={currentMandateEntity}
                        onChange={e => setCurrentMandateEntity(e.target.value)}
                        className={inputCls}
                        placeholder="Nome da entidade"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Observações estratégicas</label>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
                className="campo-textarea"
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 animate-fade-in">
            <div className="campo-card p-4 space-y-2.5">
              {[
                { l: 'Nome', v: name },
                { l: 'Cidade / Bairro', v: `${geo.city || '—'}${neighborhood ? ` · ${neighborhood}` : ''}` },
                { l: 'GPS', v: geo.lat ? `${geo.lat.toFixed(4)}, ${geo.lng?.toFixed(4)}` : '—' },
                { l: 'Telefone', v: phone || '—' },
                { l: 'Segmentos', v: `${profileIds.length} selecionados` },
                { l: 'Alinhamento', v: alignment },
                { l: 'Partido', v: currentParty || '—' },
                { l: 'Influência / Mobilização', v: `${influence} / ${mobilization}` },
                { l: 'Já candidato', v: wasCandidate ? `Sim (${timesCandidate}x)` : 'Não' },
                { l: 'Já mandato', v: heldMandate ? `Sim (${mandateCount})` : 'Não' },
                { l: 'Mandato atual', v: hasCurrentMandate ? (() => {
                  const labels: Record<string, string> = {
                    lideranca_comunitaria: 'Liderança comunitária',
                    presidente_entidade: 'Presidente de entidade',
                    vereador: 'Vereador',
                    prefeito: 'Prefeito',
                    deputado_estadual: 'Deputado estadual',
                    deputado_federal: 'Deputado federal',
                  };
                  const base = labels[currentMandatePosition] || '—';
                  if (currentMandatePosition === 'lideranca_comunitaria' && currentMandateCommunity) return `${base} · ${currentMandateCommunity}`;
                  if (currentMandatePosition === 'presidente_entidade' && currentMandateEntity) return `${base} · ${currentMandateEntity}`;
                  return base;
                })() : 'Não' },
                { l: 'Apoiou última eleição', v: supportedLast || '—' },
              ].map(r => (
                <div key={r.l} className="flex items-start justify-between gap-3 text-xs">
                  <span style={{ color: 'var(--campo-text-mute)' }} className="flex-shrink-0">{r.l}</span>
                  <span className="font-semibold text-white text-right break-words min-w-0">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-shrink-0 sticky bottom-0"
        style={{ background: 'rgba(10,15,31,0.92)', borderTop: '1px solid var(--campo-line)', backdropFilter: 'blur(10px)' }}
      >
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="campo-cta campo-cta-ghost"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {step < STEPS.length ? (
          <button
            onClick={() => canAdvance() && setStep(step + 1)}
            disabled={!canAdvance()}
            className="campo-cta flex-1"
          >
            Avançar <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createLeader.isPending || updateLeader.isPending}
            className="campo-cta flex-1"
          >
            <CheckCircle className="w-5 h-5" /> {isEdit ? 'Salvar' : 'Cadastrar Liderança'}
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreStepper({
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const dec = () => onChange(clamp(value - 1));
  const inc = () => onChange(clamp(value + 1));

  const canDec = value > min;
  const canInc = value < max;

  const btnBase =
    'flex items-center justify-center h-11 w-11 rounded-xl text-lg font-bold select-none transition active:scale-95';
  const btnOn = 'bg-white/10 text-white border border-white/15 hover:bg-white/15';
  const btnOff = 'bg-white/5 text-white/25 border border-white/5 cursor-not-allowed';

  return (
    <div
      className="flex items-center gap-2 h-11 rounded-xl border border-white/10 bg-[#0F1B33] px-1.5"
    >
      <button
        type="button"
        onClick={dec}
        disabled={!canDec}
        aria-label="Diminuir"
        className={`${btnBase} ${canDec ? btnOn : btnOff}`}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={e => {
          const only = e.target.value.replace(/\D/g, '').slice(0, 2);
          setDraft(only);
          if (only === '') return;
          const n = parseInt(only, 10);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        onFocus={e => e.currentTarget.select()}
        onBlur={() => {
          if (draft === '') { setDraft(String(value)); return; }
          const n = parseInt(draft, 10);
          const c = clamp(Number.isNaN(n) ? value : n);
          onChange(c);
          setDraft(String(c));
        }}
        className="flex-1 min-w-0 h-full bg-transparent text-center text-lg font-bold text-white outline-none"
      />
      <button
        type="button"
        onClick={inc}
        disabled={!canInc}
        aria-label="Aumentar"
        className={`${btnBase} ${canInc ? btnOn : btnOff}`}
      >
        +
      </button>
    </div>
  );
}

