import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useLeadershipProfiles,
  useCreateLeadershipProfile,
  type LeadershipProfile,
} from '@/hooks/useLeadershipProfiles';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

const PRESET_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ef4444'];

export function LeadershipProfileSelect({ selectedIds, onChange, label = 'Perfis de Liderança' }: Props) {
  const { data: profiles = [] } = useLeadershipProfiles(true);
  const createProfile = useCreateLeadershipProfile();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState('#3b82f6');
  const [quickLevel, setQuickLevel] = useState('local');

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const handleQuickCreate = async () => {
    if (!quickName.trim()) return;
    try {
      const newProfile = await createProfile.mutateAsync({
        name: quickName.trim(),
        description: null,
        category: null,
        level: quickLevel,
        color: quickColor,
        active: true,
      } as any);
      onChange([...selectedIds, (newProfile as any).id]);
      setQuickOpen(false);
      setQuickName('');
      toast.success('Perfil criado!');
    } catch {
      toast.error('Erro ao criar perfil');
    }
  };

  const selectedProfiles = profiles.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" /> Criar perfil
        </button>
      </div>

      {/* Selected tags */}
      {selectedProfiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedProfiles.map(p => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80"
              style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}15` }}
              onClick={() => toggle(p.id)}
            >
              {p.name}
              <X className="w-3 h-3" />
            </span>
          ))}
        </div>
      )}

      {/* Profile grid */}
      <div className="flex flex-wrap gap-1.5">
        {profiles
          .filter(p => !selectedIds.includes(p.id))
          .map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="text-[11px] px-2 py-0.5 rounded-full border transition-all hover:scale-105"
              style={{ color: p.color, borderColor: `${p.color}30`, backgroundColor: `${p.color}08` }}
            >
              + {p.name}
            </button>
          ))}
      </div>

      {/* Quick create dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar Perfil Rápido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="Ex: Líder Jovem" />
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select value={quickLevel} onValueChange={setQuickLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setQuickColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${quickColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickCreate} disabled={!quickName.trim() || createProfile.isPending}>
              {createProfile.isPending ? 'Criando…' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
