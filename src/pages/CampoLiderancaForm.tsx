import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, User, MapPin, Tag, Vote, FileCheck, Camera } from 'lucide-react';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { LeadershipProfileSelect } from '@/components/leadership/LeadershipProfileSelect';
import { useAuth } from '@/contexts/AuthContext';
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
  // histórico político
  const [wasCandidate, setWasCandidate] = useState(false);
  const [timesCandidate, setTimesCandidate] = useState(0);
  const [heldMandate, setHeldMandate] = useState(false);
  const [mandateCount, setMandateCount] = useState(0);
  const [positionsHeld, setPositionsHeld] = useState('');
  const [electoralPerformance, setElectoralPerformance] = useState('');
  const [wasNeighborhoodPresident, setWasNeighborhoodPresident] = useState(false);

  // Pré-carrega dados em edição
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
        const res = await createLeader.mutateAsync({ ...payload, created_by: user?.id ?? null });
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
        });
      }
      toast.success(isEdit ? 'Liderança atualizada!' : 'Liderança cadastrada!');
      navigate('/campo/liderancas');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    }
  };

  const inputCls = 'w-full h-11 rounded-xl border border-input bg-background px-4 text-sm';

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Link to="/campo/liderancas" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-base font-bold text-foreground">{isEdit ? 'Editar Liderança' : 'Nova Liderança de Campo'}</h1>
          <p className="text-xs text-muted-foreground">Passo {step} de {STEPS.length} — {STEPS[step-1].label}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-6 py-3 border-b border-border flex gap-1 flex-shrink-0 overflow-x-auto">
        {STEPS.map(s => (
          <button key={s.id} onClick={() => setStep(s.id)} className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-colors ${step === s.id ? 'bg-primary/20 text-primary' : step > s.id ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {step === 1 && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nome completo *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Ex: João Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Telefone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="(41) 99999-0000" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">E-mail</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="email@dominio.com" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Foto (URL ou simulada)</label>
              <div className="flex gap-2">
                <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className={inputCls} placeholder="URL da foto" />
                <button type="button" onClick={() => setPhotoUrl(`https://i.pravatar.cc/200?u=${Date.now()}`)} className="px-3 rounded-xl border border-input bg-background text-xs flex items-center gap-1"><Camera className="w-3 h-3" /> Simular</button>
              </div>
              {photoUrl && <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover mt-2 border border-border" />}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            <GeoLocationInput value={geo} onChange={setGeo} required label="Cidade / GPS *" placeholder="Ex: Curitiba" />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bairro / Comunidade</label>
              <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inputCls} placeholder="Ex: Centro, Vila Hauer..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-muted-foreground">Selecione os segmentos em que essa liderança atua (religiosa, comunitária, jovens, etc.).</p>
            <LeadershipProfileSelect selectedIds={profileIds} onChange={setProfileIds} label="Segmentos da Liderança" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Alinhamento</label>
                <select value={alignment} onChange={e => setAlignment(e.target.value)} className={inputCls}>
                  <option value="alinhado">Alinhado</option>
                  <option value="provavel">Provável</option>
                  <option value="neutro">Neutro</option>
                  <option value="oposicao">Oposição</option>
                  <option value="indefinido">Indefinido</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Partido atual</label>
                <input value={currentParty} onChange={e => setCurrentParty(e.target.value)} className={inputCls} placeholder="Ex: PL, Novo..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Influência (1-10)</label>
                <input type="number" min={1} max={10} value={influence} onChange={e => setInfluence(parseInt(e.target.value) || 5)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Capacidade de mobilização (1-10)</label>
                <input type="number" min={1} max={10} value={mobilization} onChange={e => setMobilization(parseInt(e.target.value) || 5)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Quem apoiou na última eleição?</label>
              <input value={supportedLast} onChange={e => setSupportedLast(e.target.value)} className={inputCls} placeholder="Ex: Candidato X (Prefeito 2024)" />
            </div>

            <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/20">
              <div className="text-xs font-semibold text-foreground">Histórico Político</div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={wasCandidate} onChange={e => setWasCandidate(e.target.checked)} /> Já foi candidato</label>
              {wasCandidate && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Quantas vezes</label>
                    <input type="number" min={0} value={timesCandidate} onChange={e => setTimesCandidate(parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Desempenho (votos/colocação)</label>
                    <input value={electoralPerformance} onChange={e => setElectoralPerformance(e.target.value)} className={inputCls} placeholder="Ex: 2.300 votos" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={heldMandate} onChange={e => setHeldMandate(e.target.checked)} /> Já teve mandato</label>
              {heldMandate && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Quantos mandatos</label>
                    <input type="number" min={0} value={mandateCount} onChange={e => setMandateCount(parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Cargos ocupados (vírgulas)</label>
                    <input value={positionsHeld} onChange={e => setPositionsHeld(e.target.value)} className={inputCls} placeholder="Vereador, Secretário..." />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={wasNeighborhoodPresident} onChange={e => setWasNeighborhoodPresident(e.target.checked)} /> Já presidiu associação de bairro/entidade</label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Observações estratégicas</label>
              <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none" />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-xl border border-border p-4 space-y-2" style={{ background: 'var(--gradient-card)' }}>
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
                { l: 'Apoiou última eleição', v: supportedLast || '—' },
              ].map(r => (
                <div key={r.l} className="flex items-start justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="font-medium text-foreground text-right">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-shrink-0">
        <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="h-11 px-4 rounded-xl border border-input bg-background text-sm font-semibold disabled:opacity-40 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Voltar</button>
        {step < STEPS.length ? (
          <button onClick={() => canAdvance() && setStep(step + 1)} disabled={!canAdvance()} className="flex-1 h-11 rounded-xl font-semibold text-sm text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-1" style={{ background: 'var(--gradient-primary)' }}>
            Avançar <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={createLeader.isPending || updateLeader.isPending} className="flex-1 h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, hsl(142 72% 45%), hsl(142 72% 38%))' }}>
            <CheckCircle className="w-5 h-5" /> {isEdit ? 'Salvar Alterações' : 'Cadastrar Liderança'}
          </button>
        )}
      </div>
    </div>
  );
}
