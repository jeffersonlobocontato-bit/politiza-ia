import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateVoteProjection, useUpdateVoteProjection, VoteProjection } from '@/hooks/useVoteProjections';
import { useLeaders } from '@/hooks/useLeaders';
import { supabase } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MACROREGIONS = [
  { id: 'curitiba_rmc', name: 'Curitiba/RMC' },
  { id: 'litoral', name: 'Litoral' },
  { id: 'campos_gerais', name: 'Campos Gerais' },
  { id: 'norte', name: 'Norte' },
  { id: 'noroeste', name: 'Noroeste' },
  { id: 'oeste', name: 'Oeste' },
  { id: 'sudoeste', name: 'Sudoeste' },
  { id: 'centro_sul', name: 'Centro-Sul' },
  { id: 'sudeste', name: 'Sudeste' },
];

const CANDIDACY_TYPES = [
  { value: 'vereador', label: 'Vereador(a)' },
  { value: 'deputado_estadual', label: 'Deputado(a) Estadual' },
  { value: 'deputado_federal', label: 'Deputado(a) Federal' },
  { value: 'senador', label: 'Senador(a)' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projection?: VoteProjection;
}

export function ProjectionFormDialog({ open, onOpenChange, projection }: Props) {
  const isEdit = !!projection;
  const create = useCreateVoteProjection();
  const update = useUpdateVoteProjection();
  const { data: leaders } = useLeaders({ status: 'ativo' });

  const { data: candidates } = useQuery({
    queryKey: ['candidates-active'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('candidates').select('*').order('name');
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    candidate_id: projection?.candidate_id ?? '',
    leader_id: projection?.leader_id ?? '',
    candidacy_type: projection?.candidacy_type ?? 'vereador',
    municipality: projection?.municipality ?? '',
    microregion: projection?.microregion ?? '',
    macroregion_id: projection?.macroregion_id ?? '',
    neighborhood: projection?.neighborhood ?? '',
    optimistic: projection?.optimistic ?? 0,
    intermediate: projection?.intermediate ?? 0,
    pessimistic: projection?.pessimistic ?? 0,
    justification: projection?.justification ?? '',
    observations: projection?.observations ?? '',
    revision_reason: '',
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.candidate_id) { toast.error('Selecione um candidato'); return; }
    if (!form.leader_id) { toast.error('Selecione uma liderança'); return; }
    if (form.optimistic < form.intermediate) { toast.error('Cenário otimista deve ser ≥ intermediário'); return; }
    if (form.intermediate < form.pessimistic) { toast.error('Cenário intermediário deve ser ≥ pessimista'); return; }
    if (form.optimistic <= 0) { toast.error('Cenários devem ser maiores que 0'); return; }

    try {
      if (isEdit) {
        await update.mutateAsync({
          id: projection.id,
          optimistic: form.optimistic,
          intermediate: form.intermediate,
          pessimistic: form.pessimistic,
          justification: form.justification || null,
          observations: form.observations || null,
          revisionReason: form.revision_reason || undefined,
        });
      } else {
        await create.mutateAsync({
          candidate_id: form.candidate_id,
          leader_id: form.leader_id,
          candidacy_type: form.candidacy_type,
          municipality: form.municipality || null,
          microregion: form.microregion || null,
          macroregion_id: form.macroregion_id || null,
          neighborhood: form.neighborhood || null,
          optimistic: form.optimistic,
          intermediate: form.intermediate,
          pessimistic: form.pessimistic,
          justification: form.justification || null,
          observations: form.observations || null,
        });
      }
      toast.success(isEdit ? 'Projeção atualizada!' : 'Projeção cadastrada!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  // Auto-fill territory from selected leader
  const handleLeaderChange = (leaderId: string) => {
    set('leader_id', leaderId);
    const leader = leaders?.find(l => l.id === leaderId);
    if (leader) {
      set('municipality', leader.municipality ?? '');
      set('microregion', leader.microregion ?? '');
      set('macroregion_id', leader.macroregion_id ?? '');
      set('neighborhood', leader.neighborhood ?? '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? 'Editar' : 'Nova'} Projeção de Votos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate + Leader + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Candidato *</Label>
              <Select value={form.candidate_id} onValueChange={v => set('candidate_id', v)} disabled={isEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(candidates ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.party})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Candidatura *</Label>
              <Select value={form.candidacy_type} onValueChange={v => set('candidacy_type', v)} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANDIDACY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Liderança Responsável *</Label>
              <Select value={form.leader_id} onValueChange={handleLeaderChange} disabled={isEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(leaders ?? []).map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name} — {l.municipality || 'Sem município'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Territory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
            </div>
            <div>
              <Label>Município</Label>
              <Input value={form.municipality} onChange={e => set('municipality', e.target.value)} />
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
          </div>

          {/* Scenarios */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Cenários de Projeção *</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" /> Otimista
                </Label>
                <Input
                  type="number" min={0}
                  value={form.optimistic}
                  onChange={e => set('optimistic', parseInt(e.target.value) || 0)}
                  className="text-center text-lg font-bold border-green-500/30 focus:border-green-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Minus className="w-3.5 h-3.5 text-amber-400" /> Intermediário
                </Label>
                <Input
                  type="number" min={0}
                  value={form.intermediate}
                  onChange={e => set('intermediate', parseInt(e.target.value) || 0)}
                  className="text-center text-lg font-bold border-amber-500/30 focus:border-amber-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Pessimista
                </Label>
                <Input
                  type="number" min={0}
                  value={form.pessimistic}
                  onChange={e => set('pessimistic', parseInt(e.target.value) || 0)}
                  className="text-center text-lg font-bold border-red-500/30 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Justification */}
          <div>
            <Label>Justificativa da Estimativa</Label>
            <Textarea value={form.justification} onChange={e => set('justification', e.target.value)} rows={3} />
          </div>

          {isEdit && (
            <div>
              <Label>Motivo da Revisão</Label>
              <Textarea value={form.revision_reason} onChange={e => set('revision_reason', e.target.value)} rows={2} placeholder="Descreva o motivo da alteração..." />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observations} onChange={e => set('observations', e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
