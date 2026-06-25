import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Users, Mail, Phone, MapPin, Trash2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TrackingInterviewers() {
  const { activeCandidate, activeCandidates } = useCandidate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeCandidateIds = activeCandidates.map(c => c.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  const { data: interviewers = [], isLoading } = useQuery({
    queryKey: ['tracking-interviewers', activeCandidateIds],
    queryFn: async () => {
      if (!activeCandidateIds.length) return [];
      let q = (supabase as any)
        .from('tracking_interviewers')
        .select('*')
        .order('created_at', { ascending: false });

      q = activeCandidateIds.length === 1
        ? q.eq('candidate_id', activeCandidateIds[0])
        : q.in('candidate_id', activeCandidateIds);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: activeCandidateIds.length > 0,
  });

  const createInterviewer = useMutation({
    mutationFn: async () => {
      if (!activeCandidate?.id) throw new Error('Selecione apenas um candidato para cadastrar entrevistador.');
      const { data, error } = await supabase.functions.invoke('create-interviewer', {
        body: {
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          candidate_id: activeCandidate?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-interviewers'] });
      toast({ title: 'Entrevistador cadastrado!', description: `Login: ${email.trim()}` });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setCity('');
  };

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !password) {
      toast({ title: 'Preencha nome, e-mail e senha', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    createInterviewer.mutate();
  };

  const activeCount = interviewers.filter((i: any) => i.status === 'ativo').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Entrevistadores</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre entrevistadores com login e senha para executar as coletas
          </p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <UserPlus className="w-4 h-4" /> Novo Entrevistador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-foreground">{interviewers.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-foreground">{activeCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Ativos</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-foreground">{interviewers.length - activeCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Inativos</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : interviewers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum entrevistador cadastrado</p>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-1">
              <UserPlus className="w-3 h-3" /> Cadastrar Primeiro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviewers.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {inv.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {inv.phone}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.city ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {inv.city}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={inv.status === 'ativo'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-muted text-muted-foreground'
                      }>
                        {inv.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Cadastrar Entrevistador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="João da Silva" />
            </div>
            <div>
              <Label>E-mail (login) *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <p className="text-[10px] text-muted-foreground mt-1">
                O entrevistador usará este e-mail e senha para acessar o link de coleta
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(41) 99999-9999" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Curitiba" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createInterviewer.isPending}>
              {createInterviewer.isPending ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
