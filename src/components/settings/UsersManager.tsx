import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Key, ShieldCheck, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

type AppRole =
  | 'admin_master' | 'coordenador_geral' | 'coordenador_estadual'
  | 'coordenador_regional' | 'coordenador_microrregional' | 'coordenador_municipal'
  | 'lideranca_local' | 'operador_campo' | 'analista_inteligencia'
  | 'analista_pesquisa' | 'executivo_leitura'
  | 'gestor_estadual_novo' | 'gestor_estadual_pl';

const ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  { value: 'admin_master',              label: 'Admin Master',              description: 'Acesso total. Gerencia plataforma, usuários e candidatos.', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'coordenador_geral',         label: 'Coordenador Geral',         description: 'Gestão completa da campanha do candidato ativo.',          color: 'bg-primary/15 text-primary border-primary/30' },
  { value: 'coordenador_estadual',      label: 'Coordenador Estadual',      description: 'Coordena todo o estado, todas as macrorregiões.',          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'gestor_estadual_novo',      label: 'Gestor Estadual — Novo',    description: 'Vê apenas dados do partido Novo e o que ele próprio cadastrar.', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { value: 'gestor_estadual_pl',        label: 'Gestor Estadual — PL',      description: 'Vê apenas dados do PL e o que ele próprio cadastrar.',     color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { value: 'coordenador_regional',      label: 'Coordenador Regional',      description: 'Responsável por uma macrorregião.',                        color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { value: 'coordenador_microrregional',label: 'Coordenador Microrregional',description: 'Responsável por uma microrregião / associação.',           color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  { value: 'coordenador_municipal',     label: 'Coordenador Municipal',     description: 'Responsável por um município.',                            color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'lideranca_local',           label: 'Liderança Local',           description: 'Liderança comunitária / bairro.',                          color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'operador_campo',            label: 'Operador de Campo',         description: 'Executa ações e coleta tracking em campo.',                color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'analista_inteligencia',     label: 'Analista de Inteligência',  description: 'Análise estratégica, alertas e indicadores.',              color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  { value: 'analista_pesquisa',         label: 'Analista de Pesquisa',      description: 'Gerencia pesquisas eleitorais e tracking.',                color: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  { value: 'executivo_leitura',         label: 'Executivo (Leitura)',       description: 'Visualiza dashboards sem permissão de edição.',            color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
];

const roleMeta = (r: AppRole) => ROLES.find(x => x.value === r);

type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: AppRole | null;
  macroregion_id: string | null;
  microregion: string | null;
  municipality: string | null;
};

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | AppRole>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pwDialog, setPwDialog] = useState<UserRow | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    role: 'operador_campo' as AppRole,
    macroregion_id: '', microregion: '', municipality: '',
  });
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name, email, phone').order('full_name');
    const { data: roles } = await (supabase as any).from('user_roles').select('user_id, role, macroregion_id, microregion, municipality');
    const rolesMap = new Map<string, any>();
    (roles ?? []).forEach((r: any) => rolesMap.set(r.user_id, r));
    setUsers((profiles ?? []).map((p: any) => ({
      ...p,
      role: rolesMap.get(p.id)?.role ?? null,
      macroregion_id: rolesMap.get(p.id)?.macroregion_id ?? null,
      microregion: rolesMap.get(p.id)?.microregion ?? null,
      municipality: rolesMap.get(p.id)?.municipality ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: '', email: '', password: '', phone: '', role: 'operador_campo', macroregion_id: '', microregion: '', municipality: '' });
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      full_name: u.full_name || '', email: u.email || '', password: '', phone: u.phone || '',
      role: (u.role ?? 'operador_campo') as AppRole,
      macroregion_id: u.macroregion_id || '', microregion: u.microregion || '', municipality: u.municipality || '',
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.role) {
      toast.error('Preencha nome, e-mail e nível de acesso');
      return;
    }
    if (!editing && (!form.password || form.password.length < 6)) {
      toast.error('Senha de no mínimo 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const r1 = await supabase.functions.invoke('manage-user', {
          body: {
            action: 'update_profile',
            user_id: editing.id, full_name: form.full_name, phone: form.phone,
          },
        });
        if (r1.error || (r1.data as any)?.error) throw new Error((r1.data as any)?.error || r1.error?.message);

        const r2 = await supabase.functions.invoke('manage-user', {
          body: {
            action: 'update_role',
            user_id: editing.id, role: form.role,
            macroregion_id: form.macroregion_id, microregion: form.microregion, municipality: form.municipality,
          },
        });
        if (r2.error || (r2.data as any)?.error) throw new Error((r2.data as any)?.error || r2.error?.message);
        toast.success('Usuário atualizado');
      } else {
        const r = await supabase.functions.invoke('manage-user', {
          body: { action: 'create', ...form },
        });
        if (r.error || (r.data as any)?.error) throw new Error((r.data as any)?.error || r.error?.message);
        toast.success('Usuário criado com sucesso');
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: UserRow) => {
    if (!confirm(`Excluir definitivamente ${u.full_name}?`)) return;
    const r = await supabase.functions.invoke('manage-user', { body: { action: 'delete', user_id: u.id } });
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error || r.error?.message || 'Erro');
      return;
    }
    toast.success('Usuário removido');
    await load();
  };

  const resetPassword = async () => {
    if (!pwDialog || newPassword.length < 6) {
      toast.error('Senha de no mínimo 6 caracteres');
      return;
    }
    const r = await supabase.functions.invoke('manage-user', {
      body: { action: 'reset_password', user_id: pwDialog.id, password: newPassword },
    });
    if (r.error || (r.data as any)?.error) {
      toast.error((r.data as any)?.error || r.error?.message || 'Erro');
      return;
    }
    toast.success('Senha redefinida');
    setPwDialog(null);
    setNewPassword('');
  };

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    const matchSearch = !s || u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const countsByRole = ROLES.map(r => ({ ...r, count: users.filter(u => u.role === r.value).length }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Usuários e Níveis de Acesso</h2>
            <p className="text-xs text-muted-foreground">{users.length} usuário(s) cadastrado(s) na plataforma</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Novo usuário
        </Button>
      </div>

      {/* Role counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {countsByRole.filter(r => r.count > 0).map(r => (
          <button key={r.value} onClick={() => setFilterRole(filterRole === r.value ? 'all' : r.value)}
            className={`rounded-lg border p-3 text-left transition-all ${filterRole === r.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80'}`}>
            <p className="text-xs text-muted-foreground truncate">{r.label}</p>
            <p className="text-lg font-bold text-foreground">{r.count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9 h-9 text-sm" placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={v => setFilterRole(v as any)}>
          <SelectTrigger className="w-56 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Users list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const meta = u.role ? roleMeta(u.role) : null;
            return (
              <div key={u.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{u.full_name || '(sem nome)'}</span>
                    {meta ? (
                      <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">Sem nível</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                  {(u.macroregion_id || u.microregion || u.municipality) && (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Escopo: {[u.municipality, u.microregion, u.macroregion_id].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPwDialog(u)} title="Redefinir senha">
                    <Key className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(u)} title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input type="email" disabled={!!editing} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Senha inicial *</Label>
                <Input type="text" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">O usuário poderá alterar depois do primeiro acesso.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nível de acesso *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-[11px] text-muted-foreground">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Macrorregião</Label>
                <Input placeholder="(opcional)" value={form.macroregion_id} onChange={e => setForm({ ...form, macroregion_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Microrregião</Label>
                <Input placeholder="(opcional)" value={form.microregion} onChange={e => setForm({ ...form, microregion: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Município</Label>
                <Input placeholder="(opcional)" value={form.municipality} onChange={e => setForm({ ...form, municipality: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar usuário'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog open={!!pwDialog} onOpenChange={o => { if (!o) { setPwDialog(null); setNewPassword(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Defina uma nova senha para <strong>{pwDialog?.full_name}</strong>.</p>
            <Input type="text" placeholder="Nova senha (mín. 6 caracteres)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwDialog(null); setNewPassword(''); }}>Cancelar</Button>
            <Button onClick={resetPassword}>Redefinir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
