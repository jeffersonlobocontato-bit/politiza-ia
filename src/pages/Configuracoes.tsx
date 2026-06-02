import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, User, Star, Plus, Pencil, Trash2, CheckCircle, ShieldCheck, Tag } from 'lucide-react';
import { useCandidate, type Candidate } from '@/contexts/CandidateContext';
import { LeadershipProfilesManager } from '@/components/leadership/LeadershipProfilesManager';
import { UsersManager } from '@/components/settings/UsersManager';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const candidateSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  party: z.string().min(1, 'Partido obrigatório'),
  cargo: z.string().min(1, 'Cargo obrigatório'),
  state: z.string().min(2, 'Estado obrigatório'),
  election_year: z.coerce.number().min(2024).max(2030),
  bio: z.string().optional(),
  photo_url: z.string().url('URL inválida').optional().or(z.literal('')),
});
type CandidateForm = z.infer<typeof candidateSchema>;

const CARGOS = [
  'Governador', 'Senador', 'Deputado Federal', 'Deputado Estadual',
  'Prefeito', 'Vereador', 'Presidente',
];

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const PRESET_CANDIDATES = [
  // Governador
  { name: 'Sergio Moro',       party: 'UNIÃO',   cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Ex-juiz federal e ex-ministro da Justiça. Lidera as pesquisas para o governo do Paraná 2026.' },
  { name: 'Requião Filho',     party: 'MDB',     cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Filho do ex-governador Roberto Requião. Principal adversário nas pesquisas de intenção de voto.' },
  { name: 'Alexandre Curi',    party: 'PSD',     cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Deputado Federal e ex-presidente da Assembleia Legislativa do Paraná.' },
  { name: 'Rafael Greca',      party: 'PSD',     cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Atual prefeito de Curitiba. Aparece nos cenários alternativos das pesquisas.' },
  { name: 'Giacobo',           party: 'PL',      cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Deputado Federal pelo Paraná. Presente nos cenários estimulados.' },
  { name: 'Guto Silva',        party: 'PP',      cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Liderança política do interior do Paraná.' },
  { name: 'Ratinho Junior',    party: 'PSD',     cargo: 'Governador', state: 'PR', election_year: 2026, bio: 'Atual governador do Paraná. Cotado para reeleição.' },
  // Senador
  { name: 'Alvaro Dias',       party: 'Podemos', cargo: 'Senador',    state: 'PR', election_year: 2026, bio: 'Senador e ex-governador do Paraná.' },
  { name: 'Gleisi Hoffmann',   party: 'PT',      cargo: 'Senador',    state: 'PR', election_year: 2026, bio: 'Presidente nacional do PT. Candidata ao Senado pelo Paraná.' },
  { name: 'Filipe Barros',     party: 'PL',      cargo: 'Senador',    state: 'PR', election_year: 2026, bio: 'Deputado Federal, candidato ao Senado pelo PL.' },
  { name: 'Cristina Graeml',   party: 'Novo',    cargo: 'Senador',    state: 'PR', election_year: 2026, bio: 'Ex-presidente da Copel, candidata ao Senado.' },
];

export default function Configuracoes() {
  const { candidates, activeCandidate, setActive, refetch } = useCandidate();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'candidatos' | 'usuarios' | 'perfis_lideranca' | 'conta'>('candidatos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const form = useForm<CandidateForm>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { name: '', party: '', cargo: 'Governador', state: 'PR', election_year: 2026, bio: '', photo_url: '' },
  });

  const openCreate = (preset?: typeof PRESET_CANDIDATES[0]) => {
    setEditingId(null);
    form.reset(preset
      ? { ...preset, bio: preset.bio, photo_url: '' }
      : { name: '', party: '', cargo: 'Governador', state: 'PR', election_year: 2026, bio: '', photo_url: '' }
    );
    setDialogOpen(true);
  };

  const openEdit = (c: Candidate) => {
    setEditingId(c.id);
    form.reset({
      name: c.name, party: c.party, cargo: c.cargo, state: c.state,
      election_year: c.election_year, bio: c.bio ?? '', photo_url: c.photo_url ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CandidateForm) => {
    setSaving(true);
    try {
      const payload = { ...data, bio: data.bio || null, photo_url: data.photo_url || null };
      if (editingId) {
        await (supabase as any).from('candidates').update(payload).eq('id', editingId);
        toast.success('Candidato atualizado!');
      } else {
        await (supabase as any).from('candidates').insert({ ...payload, is_active: candidates.length === 0 });
        toast.success('Candidato cadastrado!');
      }
      await refetch();
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar candidato');
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (id: string) => {
    setActivating(id);
    try {
      await setActive(id);
      toast.success('Candidato ativo atualizado!');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" da plataforma?`)) return;
    await (supabase as any).from('candidates').delete().eq('id', id);
    await refetch();
    toast.success('Candidato removido.');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Settings className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">Configurações</h1>
          <p className="text-xs text-muted-foreground">Gerencie candidatos e preferências da plataforma</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-border flex gap-1 flex-shrink-0">
        {([
          { key: 'candidatos', label: 'Candidatos', adminOnly: false },
          { key: 'usuarios', label: 'Usuários', adminOnly: true },
          { key: 'perfis_lideranca', label: 'Perfis de Liderança', adminOnly: false },
          { key: 'conta', label: 'Minha Conta', adminOnly: false },
        ] as const).filter(t => !t.adminOnly || isAdmin).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'candidatos' && (
          <div className="max-w-3xl space-y-6">
            {/* Active candidate banner */}
            {activeCandidate && (
              <div className="rounded-xl border border-primary/30 p-4 flex items-center gap-4" style={{ background: 'hsl(var(--primary) / 0.06)' }}>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {activeCandidate.photo_url
                    ? <img src={activeCandidate.photo_url} alt={activeCandidate.name} className="w-full h-full object-cover" />
                    : <User className="w-6 h-6 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{activeCandidate.name}</span>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">ATIVO</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeCandidate.cargo} • {activeCandidate.party} • {activeCandidate.state} • {activeCandidate.election_year}
                  </p>
                  {activeCandidate.bio && (
                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{activeCandidate.bio}</p>
                  )}
                </div>
                <Star className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" />
              </div>
            )}

            {/* Candidate list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Candidatos cadastrados</h2>
                {isAdmin && (
                  <Button size="sm" onClick={() => openCreate()} className="gap-1.5 text-xs h-8">
                    <Plus className="w-3.5 h-3.5" /> Novo candidato
                  </Button>
                )}
              </div>

              {candidates.length === 0 ? (
                <div className="rounded-xl border border-border p-8 text-center">
                  <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhum candidato cadastrado ainda.</p>
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {PRESET_CANDIDATES.map(p => (
                        <Button key={p.name} variant="outline" size="sm" className="text-xs" onClick={() => openCreate(p)}>
                          <Plus className="w-3 h-3 mr-1" /> {p.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map(c => (
                    <div
                      key={c.id}
                      className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
                        c.is_active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-border/80'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {c.photo_url
                          ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                          : <User className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{c.name}</span>
                          {c.is_active && <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">ATIVO</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.cargo} · {c.party} · {c.state} · {c.election_year}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!c.is_active && isAdmin && (
                          <Button
                            variant="outline" size="sm"
                            className="text-xs h-7 gap-1"
                            disabled={activating === c.id}
                            onClick={() => handleSetActive(c.id)}
                          >
                            <CheckCircle className="w-3 h-3" />
                            {activating === c.id ? 'Ativando…' : 'Ativar'}
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(c.id, c.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preset quick add */}
            {isAdmin && candidates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Candidatos sugeridos para adicionar rapidamente:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CANDIDATES.filter(p => !candidates.some(c => c.name === p.name)).map(p => (
                    <Button key={p.name} variant="outline" size="sm" className="text-xs h-7" onClick={() => openCreate(p)}>
                      <Plus className="w-3 h-3 mr-1" /> {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'perfis_lideranca' && <LeadershipProfilesManager />}

        {tab === 'conta' && (
          <div className="max-w-md space-y-6">
            <div className="rounded-xl border border-border p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Perfil de usuário</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gerencie suas informações pessoais na plataforma.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Edição de perfil em desenvolvimento.</p>
          </div>
        )}
      </div>

      {/* Dialog: create / edit candidate */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar candidato' : 'Novo candidato'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo *</Label>
                <Input placeholder="Ex: Sergio Moro" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Partido *</Label>
                <Input placeholder="Ex: UNIÃO" {...form.register('party')} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo disputado *</Label>
                <Select defaultValue={form.getValues('cargo')} onValueChange={v => form.setValue('cargo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado *</Label>
                <Select defaultValue={form.getValues('state')} onValueChange={v => form.setValue('state', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano da eleição</Label>
                <Input type="number" {...form.register('election_year')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>URL da foto</Label>
                <Input placeholder="https://..." {...form.register('photo_url')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Biografia / contexto</Label>
                <Textarea rows={3} placeholder="Descreva o candidato e seu contexto político..." {...form.register('bio')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
