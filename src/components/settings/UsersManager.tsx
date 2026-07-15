import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Key, ShieldCheck, Search, Users, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_MODULES, supportsCustomModules } from '@/config/modules';

type AppRole =
  | 'admin_master' | 'coordenador_geral' | 'coordenador_estadual'
  | 'coordenador_regional' | 'coordenador_microrregional' | 'coordenador_municipal'
  | 'lideranca_local' | 'operador_campo' | 'analista_inteligencia'
  | 'analista_pesquisa' | 'executivo_leitura'
  | 'gestor_estadual_novo' | 'gestor_estadual_pl' | 'gestor_operacional';

const ESTADUAL_ALLOWED_ROLES: AppRole[] = [
  'coordenador_regional', 'coordenador_microrregional', 'coordenador_municipal',
  'operador_campo', 'lideranca_local',
];
const REGIONAL_ALLOWED_ROLES: AppRole[] = [
  'coordenador_microrregional', 'coordenador_municipal',
  'operador_campo', 'lideranca_local',
];
const MICRO_ALLOWED_ROLES: AppRole[] = [
  'coordenador_municipal', 'operador_campo', 'lideranca_local',
];
const MUNICIPAL_ALLOWED_ROLES: AppRole[] = [
  'operador_campo', 'lideranca_local',
];

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
  { value: 'gestor_operacional',        label: 'Gestor Operacional',        description: 'Acesso limitado: dashboard, Pesquisas, Campo, Proporcional, Agenda e Hierarquia.', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
];

const roleMeta = (r: AppRole) => ROLES.find(x => x.value === r);

type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  referred_by: string | null;
  role: AppRole | null;
  macroregion_id: string | null;
  microregion: string | null;
  municipality: string | null;
  coordinated_municipalities: string[];
  allowed_modules: string[] | null;
  candidate_ids: string[];
};

type CandidateOption = { id: string; name: string; cargo: string; party: string };
type MacroOption = { id: string; name: string };
type MunicipalityOption = { nome: string; macroregion_id: string | null };

export function UsersManager() {
  const { roles: callerRoles } = useAuth();
  const isFullAdmin = callerRoles.some(r => ['admin_master', 'coordenador_geral'].includes(r));
  const isEstadualOnly = !isFullAdmin && callerRoles.includes('coordenador_estadual' as any);
  const isRegionalOnly = !isFullAdmin && !isEstadualOnly && callerRoles.includes('coordenador_regional' as any);
  const isMicroOnly = !isFullAdmin && !isEstadualOnly && !isRegionalOnly && callerRoles.includes('coordenador_microrregional' as any);
  const isMunicipalOnly = !isFullAdmin && !isEstadualOnly && !isRegionalOnly && !isMicroOnly && callerRoles.includes('coordenador_municipal' as any);
  const manageableRoleSet: AppRole[] = isFullAdmin
    ? ROLES.map(r => r.value)
    : isEstadualOnly
      ? ESTADUAL_ALLOWED_ROLES
      : isRegionalOnly
        ? REGIONAL_ALLOWED_ROLES
        : isMicroOnly
          ? MICRO_ALLOWED_ROLES
          : isMunicipalOnly
            ? MUNICIPAL_ALLOWED_ROLES
            : [];
  const allowedRoles = ROLES.filter(r => manageableRoleSet.includes(r.value));
  const canManageRow = (r: AppRole | null) => isFullAdmin || (r != null && manageableRoleSet.includes(r));


  const [users, setUsers] = useState<UserRow[]>([]);
  const [candidatesList, setCandidatesList] = useState<CandidateOption[]>([]);
  const [macros, setMacros] = useState<MacroOption[]>([]);
  const [municipiosList, setMunicipiosList] = useState<MunicipalityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | AppRole>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pwDialog, setPwDialog] = useState<UserRow | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '', referred_by: '',
    role: 'operador_campo' as AppRole,
    macroregion_id: '', microregion: '', municipality: '',
    coordinated_municipalities: [] as string[],
    candidate_ids: [] as string[],
    allowed_modules: null as string[] | null,
  });
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: links }, { data: cands }, { data: macrosData }, { data: munData }] = await Promise.all([
      (supabase as any).from('profiles').select('id, full_name, email, phone, referred_by').order('full_name'),
      (supabase as any).from('user_roles').select('user_id, role, macroregion_id, microregion, municipality, coordinated_municipalities, allowed_modules'),
      (supabase as any).from('user_candidates').select('user_id, candidate_id'),
      (supabase as any).from('candidates').select('id, name, cargo, party').order('name'),
      (supabase as any).from('macroregions').select('id, name').order('name'),
      (supabase as any).from('pr_municipios').select('nome, macroregion_id').order('nome'),
    ]);
    const rolesMap = new Map<string, any>();
    (roles ?? []).forEach((r: any) => rolesMap.set(r.user_id, r));
    const linksMap = new Map<string, string[]>();
    (links ?? []).forEach((l: any) => {
      const arr = linksMap.get(l.user_id) ?? [];
      arr.push(l.candidate_id);
      linksMap.set(l.user_id, arr);
    });
    setCandidatesList((cands ?? []) as CandidateOption[]);
    setMacros((macrosData ?? []) as MacroOption[]);
    setMunicipiosList((munData ?? []) as MunicipalityOption[]);
    setUsers((profiles ?? []).map((p: any) => ({
      ...p,
      role: rolesMap.get(p.id)?.role ?? null,
      macroregion_id: rolesMap.get(p.id)?.macroregion_id ?? null,
      microregion: rolesMap.get(p.id)?.microregion ?? null,
      municipality: rolesMap.get(p.id)?.municipality ?? null,
      coordinated_municipalities: rolesMap.get(p.id)?.coordinated_municipalities ?? [],
      allowed_modules: rolesMap.get(p.id)?.allowed_modules ?? null,
      candidate_ids: linksMap.get(p.id) ?? [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    const defaultRole: AppRole = (allowedRoles[allowedRoles.length - 1]?.value ?? 'operador_campo') as AppRole;
    setForm({ full_name: '', email: '', password: '', phone: '', referred_by: '', role: defaultRole, macroregion_id: '', microregion: '', municipality: '', coordinated_municipalities: [], candidate_ids: [], allowed_modules: null });
    setCitySearch('');
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      full_name: u.full_name || '', email: u.email || '', password: '', phone: u.phone || '', referred_by: u.referred_by || '',
      role: (u.role ?? 'operador_campo') as AppRole,
      macroregion_id: u.macroregion_id || '', microregion: u.microregion || '', municipality: u.municipality || '',
      coordinated_municipalities: u.coordinated_municipalities ?? [],
      candidate_ids: u.candidate_ids ?? [],
      allowed_modules: u.allowed_modules ?? null,
    });
    setCitySearch('');
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
      let targetUserId: string | null = editing?.id ?? null;
      if (editing) {
        const r1 = await supabase.functions.invoke('manage-user', {
          body: {
            action: 'update_profile',
            user_id: editing.id, full_name: form.full_name, phone: form.phone, referred_by: form.referred_by,
          },
        });
        if (r1.error || (r1.data as any)?.error) throw new Error((r1.data as any)?.error || r1.error?.message);

        const r2 = await supabase.functions.invoke('manage-user', {
          body: {
            action: 'update_role',
            user_id: editing.id, role: form.role,
            macroregion_id: form.macroregion_id, microregion: form.microregion, municipality: form.municipality,
            coordinated_municipalities: form.role === 'coordenador_microrregional' ? form.coordinated_municipalities : [],
            allowed_modules: supportsCustomModules(form.role) ? form.allowed_modules : null,
          },
        });
        if (r2.error || (r2.data as any)?.error) throw new Error((r2.data as any)?.error || r2.error?.message);
        toast.success('Membro atualizado');
      } else {
        const r = await supabase.functions.invoke('manage-user', {
          body: { action: 'create', ...form },
        });
        if (r.error || (r.data as any)?.error) throw new Error((r.data as any)?.error || r.error?.message);
        targetUserId = (r.data as any)?.user_id ?? null;
        toast.success('Membro da equipe criado com sucesso');
      }

      // Sincronizar vínculos de candidatos (sempre, inclusive para limpar lista)
      if (targetUserId) {
        const rc = await supabase.functions.invoke('manage-user', {
          body: { action: 'set_candidates', user_id: targetUserId, candidate_ids: form.candidate_ids },
        });
        if (rc.error || (rc.data as any)?.error) throw new Error((rc.data as any)?.error || rc.error?.message);
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
    toast.success('Membro removido');
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
    const matchScope = isFullAdmin || canManageRow(u.role);
    return matchSearch && matchRole && matchScope;
  });

  const countsByRole = allowedRoles.map(r => ({ ...r, count: users.filter(u => u.role === r.value).length }));


  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Membros da Equipe e Níveis de Acesso</h2>
            <p className="text-xs text-muted-foreground">{users.length} membro(s) cadastrado(s) na plataforma</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Cadastrar Membro da Equipe
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
          <Input className="pl-9 h-9 text-sm" placeholder="Buscar membro por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={v => setFilterRole(v as any)}>
          <SelectTrigger className="w-56 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            {allowedRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Users list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum membro da equipe encontrado.</p>
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
                  {u.candidate_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.candidate_ids.map(cid => {
                        const c = candidatesList.find(x => x.id === cid);
                        return (
                          <Badge key={cid} variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                            {c ? `${c.name} · ${c.cargo}` : '—'}
                          </Badge>
                        );
                      })}
                    </div>
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
            <DialogTitle>{editing ? 'Editar membro da equipe' : 'Cadastrar Membro da Equipe'}</DialogTitle>
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
            <div className="space-y-1.5">
              <Label>Indicado por</Label>
              <Input placeholder="Nome de quem indicou este membro" value={form.referred_by} onChange={e => setForm({ ...form, referred_by: e.target.value })} />
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
                  {allowedRoles.map(r => (
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Macrorregião (vínculo)</Label>
                <Select
                  value={form.macroregion_id || 'none'}
                  onValueChange={v => setForm({ ...form, macroregion_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {macros.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade base *</Label>
                <Input
                  list="cidades-base-list"
                  placeholder="Digite a cidade"
                  value={form.municipality}
                  onChange={e => setForm({ ...form, municipality: e.target.value })}
                />
                <datalist id="cidades-base-list">
                  {municipiosList
                    .filter(m => !form.macroregion_id || m.macroregion_id === form.macroregion_id)
                    .map(m => <option key={m.nome} value={m.nome} />)}
                </datalist>
              </div>
            </div>

            {form.role === 'coordenador_microrregional' && (
              <div className="space-y-2 border border-teal-500/30 bg-teal-500/5 rounded-lg p-3">
                <Label className="text-xs font-semibold text-teal-400">
                  Cidades sob coordenação ({form.coordinated_municipalities.length} selecionadas)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Selecione todos os municípios que este coordenador microrregional é responsável por coordenar.
                </p>
                <Input
                  placeholder="Buscar cidade..."
                  className="h-8 text-xs"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-56 overflow-y-auto rounded-lg border border-border p-2 bg-background">
                  {municipiosList
                    .filter(m => {
                      if (form.macroregion_id && m.macroregion_id !== form.macroregion_id) return false;
                      if (citySearch && !m.nome.toLowerCase().includes(citySearch.toLowerCase())) return false;
                      return true;
                    })
                    .map(m => {
                      const checked = form.coordinated_municipalities.includes(m.nome);
                      return (
                        <label
                          key={m.nome}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[11px] ${checked ? 'bg-teal-500/20 border border-teal-500/40' : 'hover:bg-muted'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              setForm(f => ({
                                ...f,
                                coordinated_municipalities: e.target.checked
                                  ? [...f.coordinated_municipalities, m.nome]
                                  : f.coordinated_municipalities.filter(x => x !== m.nome),
                              }));
                            }}
                          />
                          <span className="truncate">{m.nome}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}



            {/* Módulos permitidos (Nível 2 e assessores) */}
            {supportsCustomModules(form.role) && (
              <div className="space-y-2 border border-primary/30 bg-primary/5 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Ferramentas com acesso
                    {form.allowed_modules && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({form.allowed_modules.length}/{ALL_MODULES.length})
                      </span>
                    )}
                  </Label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button type="button" className="text-primary hover:underline"
                      onClick={() => setForm(f => ({ ...f, allowed_modules: ALL_MODULES.map(m => m.key) }))}>
                      Marcar todos
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button type="button" className="text-primary hover:underline"
                      onClick={() => setForm(f => ({ ...f, allowed_modules: [] }))}>
                      Limpar
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button type="button" className="text-muted-foreground hover:underline"
                      onClick={() => setForm(f => ({ ...f, allowed_modules: null }))}>
                      Usar padrão do papel
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Marque as ferramentas que este membro poderá acessar. Deixe em "padrão do papel" para seguir a regra do nível de acesso.
                </p>
                {form.allowed_modules !== null && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto rounded-lg border border-border p-2 bg-background">
                    {ALL_MODULES.map(m => {
                      const checked = form.allowed_modules?.includes(m.key) ?? false;
                      return (
                        <label key={m.key}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs ${checked ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              setForm(f => {
                                const base = f.allowed_modules ?? [];
                                return {
                                  ...f,
                                  allowed_modules: e.target.checked
                                    ? Array.from(new Set([...base, m.key]))
                                    : base.filter(k => k !== m.key),
                                };
                              });
                            }}
                          />
                          <span className="truncate">{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}




            {/* Candidatos vinculados */}
            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-xs">Candidatos vinculados (restringe a visualização)</Label>
              <p className="text-[11px] text-muted-foreground">
                Deixe vazio para permitir acesso aos candidatos definidos pela regra de partido ou pelo perfil de admin.
                Selecione candidatos específicos para restringir o usuário apenas a eles.
              </p>
              {candidatesList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum candidato cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-border p-2 bg-muted/30">
                  {candidatesList.map(c => {
                    const checked = form.candidate_ids.includes(c.id);
                    return (
                      <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs ${checked ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            setForm(f => ({
                              ...f,
                              candidate_ids: e.target.checked
                                ? [...f.candidate_ids, c.id]
                                : f.candidate_ids.filter(x => x !== c.id),
                            }));
                          }}
                        />
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                        <span className="text-muted-foreground truncate">· {c.cargo} {c.party}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar membro'}</Button>
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
