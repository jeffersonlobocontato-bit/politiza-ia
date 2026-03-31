import { useState } from 'react';
import { Plus, Pencil, X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  useLeadershipProfiles,
  useCreateLeadershipProfile,
  useUpdateLeadershipProfile,
  type LeadershipProfile,
} from '@/hooks/useLeadershipProfiles';

const LEVELS = [
  { value: 'local', label: 'Local' },
  { value: 'regional', label: 'Regional' },
  { value: 'estadual', label: 'Estadual' },
];

const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f59e0b',
  '#06b6d4', '#ef4444', '#84cc16', '#ec4899',
  '#f97316', '#14b8a6', '#8b5cf6', '#6b7280',
];

interface ProfileForm {
  name: string;
  description: string;
  category: string;
  level: string;
  color: string;
  active: boolean;
}

const emptyForm = (): ProfileForm => ({
  name: '', description: '', category: '', level: 'local', color: '#3b82f6', active: true,
});

export function LeadershipProfilesManager() {
  const { data: profiles = [], isLoading } = useLeadershipProfiles(false);
  const createProfile = useCreateLeadershipProfile();
  const updateProfile = useUpdateLeadershipProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm());

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (p: LeadershipProfile) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description ?? '', category: p.category ?? '', level: p.level, color: p.color, active: p.active });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        category: form.category || null,
        level: form.level,
        color: form.color,
        active: form.active,
      };
      if (editingId) {
        await updateProfile.mutateAsync({ id: editingId, ...payload });
        toast.success('Perfil atualizado!');
      } else {
        await createProfile.mutateAsync(payload as any);
        toast.success('Perfil criado!');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar perfil');
    }
  };

  const toggleActive = async (p: LeadershipProfile) => {
    try {
      await updateProfile.mutateAsync({ id: p.id, active: !p.active });
      toast.success(p.active ? 'Perfil inativado' : 'Perfil reativado');
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const activeProfiles = profiles.filter(p => p.active);
  const inactiveProfiles = profiles.filter(p => !p.active);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Perfis de Liderança
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{activeProfiles.length} perfis ativos · {inactiveProfiles.length} inativos</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" /> Novo Perfil
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando perfis...</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum perfil de liderança cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...activeProfiles, ...inactiveProfiles].map(p => (
            <div
              key={p.id}
              className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
                p.active ? 'border-border bg-card hover:border-primary/30' : 'border-border/50 bg-muted/30 opacity-60'
              }`}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]" style={{ color: p.color, borderColor: `${p.color}40` }}>
                    {LEVELS.find(l => l.value === p.level)?.label}
                  </Badge>
                  {p.category && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.category}</span>
                  )}
                  {!p.active && (
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">Inativo</Badge>
                  )}
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Perfil' : 'Novo Perfil de Liderança'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Liderança Comunitária" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o perfil..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Social, Político" />
              </div>
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label className="text-sm">Perfil ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || createProfile.isPending || updateProfile.isPending}
            >
              {createProfile.isPending || updateProfile.isPending ? 'Salvando…' : editingId ? 'Salvar' : 'Criar Perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
