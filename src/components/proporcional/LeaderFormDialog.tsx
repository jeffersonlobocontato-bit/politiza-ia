import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useCreateLeader, useUpdateLeader, Leader } from '@/hooks/useLeaders';
import { useLeadershipProfiles } from '@/hooks/useLeadershipProfiles';
import { useSetLeaderProfiles } from '@/hooks/useLeaders';
import { useCandidate } from '@/contexts/CandidateContext';
import { toast } from 'sonner';
import { Plus, X, User, MapPin, Handshake, History, Building2, Zap } from 'lucide-react';
import { GeoLocationInput } from '@/components/ui/GeoLocationInput';
import { useUserParty } from '@/hooks/useUserParty';

const MACROREGIONS = [
  { id: 'curitiba', name: 'Curitiba' },
  { id: 'rmc', name: 'RMC' },
  { id: 'litoral', name: 'Litoral' },
  { id: 'campos_gerais', name: 'Campos Gerais' },
  { id: 'norte', name: 'Norte' },
  { id: 'noroeste', name: 'Noroeste' },
  { id: 'oeste', name: 'Oeste' },
  { id: 'sudoeste', name: 'Sudoeste' },
  { id: 'centro_sul', name: 'Centro-Sul' },
  { id: 'sudeste', name: 'Sudeste' },
];

const COVERAGE_TYPES = [
  { value: 'bairro', label: 'Bairro' },
  { value: 'cidade', label: 'Cidade' },
  { value: 'microrregiao', label: 'Microrregião' },
  { value: 'macrorregiao', label: 'Macrorregião' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leader?: Leader;
  initialProfileIds?: string[];
}

export function LeaderFormDialog({ open, onOpenChange, leader, initialProfileIds = [] }: Props) {
  const isEdit = !!leader;
  const createLeader = useCreateLeader();
  const updateLeader = useUpdateLeader();
  const setProfiles = useSetLeaderProfiles();
  const { data: profiles } = useLeadershipProfiles();
  const { activeCandidate } = useCandidate();

  const [form, setForm] = useState({
    name: leader?.name ?? '',
    phone: leader?.phone ?? '',
    email: leader?.email ?? '',
    status: leader?.status ?? 'ativo',
    observations: leader?.observations ?? '',
    neighborhood: leader?.neighborhood ?? '',
    municipality: leader?.municipality ?? '',
    microregion: leader?.microregion ?? '',
    macroregion_id: leader?.macroregion_id ?? '',
    coverage_type: leader?.coverage_type ?? 'cidade',
    support_status: leader?.support_status ?? 'indefinido',
    alignment_status: leader?.alignment_status ?? 'neutro',
    relationship_owner: leader?.relationship_owner ?? '',
    current_party: leader?.current_party ?? '',
    influence_level: leader?.influence_level ?? 5,
    mobilization_capacity: leader?.mobilization_capacity ?? 5,
    estimated_supporters: leader?.estimated_supporters ?? 0,
    local_reputation: leader?.local_reputation ?? 5,
    political_reliability: leader?.political_reliability ?? 5,
    // Political history
    was_neighborhood_president: false,
    was_councilperson: false,
    was_candidate: false,
    times_candidate: 0,
    held_mandate: false,
    mandate_count: 0,
    electoral_performance: '',
    political_observations: '',
  });

  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(initialProfileIds);
  const [partyEntries, setPartyEntries] = useState<{ party_name: string; start_year: string; end_year: string }[]>([]);
  const [geoForm, setGeoForm] = useState<{ city: string; lat: number | null; lng: number | null }>({
    city: leader?.municipality ?? '',
    lat: (leader as any)?.lat ?? null,
    lng: (leader as any)?.lng ?? null,
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!activeCandidate) { toast.error('Nenhum candidato ativo. Configure em Configurações.'); return; }
    if (!isEdit && (geoForm.lat == null || geoForm.lng == null)) {
      toast.error('Geolocalização obrigatória — use o GPS ou selecione a cidade na aba Território.');
      return;
    }
    try {
      const payload = {
        name: form.name,
        candidate_id: activeCandidate.id,
        phone: form.phone || null,
        email: form.email || null,
        status: form.status,
        observations: form.observations || null,
        neighborhood: form.neighborhood || null,
        municipality: geoForm.city || form.municipality || null,
        microregion: form.microregion || null,
        macroregion_id: form.macroregion_id || null,
        lat: geoForm.lat,
        lng: geoForm.lng,
        coverage_type: form.coverage_type,
        support_status: form.support_status,
        alignment_status: form.alignment_status,
        relationship_owner: form.relationship_owner || null,
        current_party: form.current_party || null,
        influence_level: form.influence_level,
        mobilization_capacity: form.mobilization_capacity,
        estimated_supporters: form.estimated_supporters,
        local_reputation: form.local_reputation,
        political_reliability: form.political_reliability,
      };

      let leaderId: string;
      if (isEdit) {
        await updateLeader.mutateAsync({ id: leader.id, ...payload });
        leaderId = leader.id;
      } else {
        const result = await createLeader.mutateAsync(payload);
        leaderId = result.id;

        // Save political history for new leader
        const { supabase } = await import('@/contexts/AuthContext');
        await (supabase as any).from('leader_political_history').insert({
          leader_id: leaderId,
          was_neighborhood_president: form.was_neighborhood_president,
          was_councilperson: form.was_councilperson,
          was_candidate: form.was_candidate,
          times_candidate: form.times_candidate,
          held_mandate: form.held_mandate,
          mandate_count: form.mandate_count,
          electoral_performance: form.electoral_performance || null,
          observations: form.political_observations || null,
        });

        // Save party history
        if (partyEntries.length > 0) {
          const rows = partyEntries.filter(e => e.party_name).map(e => ({
            leader_id: leaderId,
            party_name: e.party_name,
            start_year: e.start_year ? parseInt(e.start_year) : null,
            end_year: e.end_year ? parseInt(e.end_year) : null,
          }));
          if (rows.length > 0) {
            await (supabase as any).from('leader_party_history').insert(rows);
          }
        }
      }

      // Save profiles
      await setProfiles.mutateAsync({ leaderId, profileIds: selectedProfileIds });

      toast.success(isEdit ? 'Liderança atualizada!' : 'Liderança cadastrada!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const toggleProfile = (id: string) => {
    setSelectedProfileIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? 'Editar' : 'Cadastrar'} Liderança</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basico" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50">
            <TabsTrigger value="basico" className="text-xs gap-1"><User className="w-3 h-3" />Básico</TabsTrigger>
            <TabsTrigger value="territorio" className="text-xs gap-1"><MapPin className="w-3 h-3" />Território</TabsTrigger>
            <TabsTrigger value="campanha" className="text-xs gap-1"><Handshake className="w-3 h-3" />Campanha</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs gap-1"><History className="w-3 h-3" />Histórico</TabsTrigger>
            <TabsTrigger value="forca" className="text-xs gap-1"><Zap className="w-3 h-3" />Força</TabsTrigger>
          </TabsList>

          {/* BÁSICO */}
          <TabsContent value="basico" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => set('email', e.target.value)} type="email" />
              </div>
              <div>
                <Label>Partido Atual</Label>
                <Input value={form.current_party} onChange={e => set('current_party', e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Perfis de Liderança */}
            <div>
              <Label className="mb-2 block">Perfis de Liderança</Label>
              <div className="flex flex-wrap gap-2">
                {(profiles ?? []).map(p => (
                  <Badge
                    key={p.id}
                    variant={selectedProfileIds.includes(p.id) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all"
                    style={selectedProfileIds.includes(p.id) ? { backgroundColor: p.color, borderColor: p.color } : { borderColor: p.color, color: p.color }}
                    onClick={() => toggleProfile(p.id)}
                  >
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={form.observations} onChange={e => set('observations', e.target.value)} rows={3} />
            </div>
          </TabsContent>

          {/* TERRITÓRIO */}
          <TabsContent value="territorio" className="space-y-4 mt-4">
            <GeoLocationInput
              value={geoForm}
              onChange={v => { setGeoForm(v); set('municipality', v.city); }}
              required={!isEdit}
              label="Localização da Liderança"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
              </div>
              <div>
                <Label>Microrregião</Label>
                <Input value={form.microregion} onChange={e => set('microregion', e.target.value)} />
              </div>
              <div>
                <Label>Macrorregião</Label>
                <Select value={form.macroregion_id} onValueChange={v => set('macroregion_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {MACROREGIONS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Cobertura</Label>
                <Select value={form.coverage_type} onValueChange={v => set('coverage_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COVERAGE_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>


          {/* CAMPANHA */}
          <TabsContent value="campanha" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status de Apoio</Label>
                <Select value={form.support_status} onValueChange={v => set('support_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="provavel">Provável</SelectItem>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                    <SelectItem value="oposicao">Oposição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alinhamento</Label>
                <Select value={form.alignment_status} onValueChange={v => set('alignment_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alinhado">Alinhado</SelectItem>
                    <SelectItem value="provavel">Provável</SelectItem>
                    <SelectItem value="neutro">Neutro</SelectItem>
                    <SelectItem value="oposicao">Oposição</SelectItem>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Responsável pelo Relacionamento</Label>
                <Input value={form.relationship_owner} onChange={e => set('relationship_owner', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="historico" className="space-y-6 mt-4">
            {!isEdit && (
              <>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4" /> Histórico Político-Eleitoral
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Switch checked={form.was_neighborhood_president} onCheckedChange={v => set('was_neighborhood_president', v)} />
                      <Label>Presidente de Bairro</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.was_councilperson} onCheckedChange={v => set('was_councilperson', v)} />
                      <Label>Já foi Vereador</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.was_candidate} onCheckedChange={v => set('was_candidate', v)} />
                      <Label>Já foi Candidato</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.held_mandate} onCheckedChange={v => set('held_mandate', v)} />
                      <Label>Exerceu Mandato</Label>
                    </div>
                    <div>
                      <Label>Vezes Candidato</Label>
                      <Input type="number" value={form.times_candidate} onChange={e => set('times_candidate', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Qtd. Mandatos</Label>
                      <Input type="number" value={form.mandate_count} onChange={e => set('mandate_count', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <Label>Desempenho Eleitoral</Label>
                    <Textarea value={form.electoral_performance} onChange={e => set('electoral_performance', e.target.value)} rows={2} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Trajetória Partidária
                  </h4>
                  {partyEntries.map((entry, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Partido</Label>
                        <Input value={entry.party_name} onChange={e => {
                          const arr = [...partyEntries];
                          arr[i].party_name = e.target.value;
                          setPartyEntries(arr);
                        }} />
                      </div>
                      <div className="w-24">
                        <Label>Início</Label>
                        <Input value={entry.start_year} onChange={e => {
                          const arr = [...partyEntries];
                          arr[i].start_year = e.target.value;
                          setPartyEntries(arr);
                        }} placeholder="Ano" />
                      </div>
                      <div className="w-24">
                        <Label>Fim</Label>
                        <Input value={entry.end_year} onChange={e => {
                          const arr = [...partyEntries];
                          arr[i].end_year = e.target.value;
                          setPartyEntries(arr);
                        }} placeholder="Ano" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setPartyEntries(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setPartyEntries(prev => [...prev, { party_name: '', start_year: '', end_year: '' }])}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Partido
                  </Button>
                </div>
              </>
            )}
            {isEdit && (
              <p className="text-sm text-muted-foreground">Para editar o histórico político e partidário, acesse a página de detalhe da liderança.</p>
            )}
          </TabsContent>

          {/* FORÇA POLÍTICA */}
          <TabsContent value="forca" className="space-y-6 mt-4">
            {[
              { key: 'influence_level', label: 'Grau de Influência' },
              { key: 'mobilization_capacity', label: 'Capacidade de Mobilização' },
              { key: 'local_reputation', label: 'Reputação Local' },
              { key: 'political_reliability', label: 'Confiabilidade Política' },
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <Label>{label}</Label>
                  <span className="text-xs font-mono text-muted-foreground">{(form as any)[key]}/10</span>
                </div>
                <Slider
                  min={1} max={10} step={1}
                  value={[(form as any)[key]]}
                  onValueChange={([v]) => set(key, v)}
                />
              </div>
            ))}
            <div>
              <Label>Base Estimada de Apoiadores</Label>
              <Input type="number" value={form.estimated_supporters} onChange={e => set('estimated_supporters', parseInt(e.target.value) || 0)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createLeader.isPending || updateLeader.isPending}>
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
