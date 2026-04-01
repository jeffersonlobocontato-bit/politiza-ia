import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTrackingRounds, type TrackingRoundQuestion } from '@/hooks/useTrackingRounds';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Copy, BarChart3, MapPin, Users, ClipboardCheck,
  Calendar, Clock, Target, ExternalLink, GripVertical,
  Trash2, ChevronDown, ChevronUp, FileText, Pencil,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TrackingCharts } from '@/components/tracking/TrackingCharts';
import { TrackingMap } from '@/components/tracking/TrackingMap';
import { TrackingAI } from '@/components/tracking/TrackingAI';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  aberta: { label: 'Ativa', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  fechada: { label: 'Encerrada', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  em_analise: { label: 'Em Análise', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

const QUESTION_TYPES = [
  { value: 'select', label: 'Múltipla Escolha (uma resposta)' },
  { value: 'multiselect', label: 'Múltipla Resposta' },
  { value: 'scale', label: 'Escala (0 a 10)' },
  { value: 'boolean', label: 'Sim / Não' },
  { value: 'text', label: 'Texto Livre' },
];

interface NewQuestion {
  question_key: string;
  label: string;
  description: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  allow_other: boolean;
  conditional_question_key: string;
  conditional_value: string;
}

const emptyQuestion = (): NewQuestion => ({
  question_key: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  label: '',
  description: '',
  question_type: 'select',
  options: [],
  is_required: true,
  allow_other: false,
  conditional_question_key: '',
  conditional_value: '',
});

export default function TrackingDashboard() {
  const { activeCandidate } = useCandidate();
  const { rounds, isLoading, interviewCounts, createRound, updateRound, updateRoundStatus } = useTrackingRounds();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('rodadas');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('PR');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetInterviews, setTargetInterviews] = useState('100');
  const [questions, setQuestions] = useState<NewQuestion[]>([]);
  const [newOptionText, setNewOptionText] = useState<Record<number, string>>({});
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  if (!activeCandidate) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Nenhum candidato ativo</h2>
          <p className="text-sm text-muted-foreground">Ative um candidato em Configurações para usar o Tracking.</p>
        </Card>
      </div>
    );
  }

  const totalInterviews = Object.values(interviewCounts).reduce((a, b) => a + b, 0);
  const uniqueCities = new Set(rounds.map(r => r.city).filter(Boolean)).size;
  const activeRounds = rounds.filter(r => r.status === 'aberta').length;

  const resetForm = () => {
    setTitle(''); setDescription(''); setCity(''); setState('PR');
    setStartDate(''); setEndDate(''); setStartTime(''); setEndTime('');
    setTargetInterviews('100'); setQuestions([]); setNewOptionText({});
    setExpandedQ(null); setEditingRoundId(null);
  };

  const loadRoundForEdit = async (round: any) => {
    setEditingRoundId(round.id);
    setTitle(round.title || '');
    setDescription(round.description || '');
    setCity(round.city || '');
    setState(round.state || 'PR');
    setStartDate(round.start_date || '');
    setEndDate(round.end_date || '');
    setStartTime(round.start_time?.slice(0, 5) || '');
    setEndTime(round.end_time?.slice(0, 5) || '');
    setTargetInterviews(String(round.target_interviews || 100));

    // Load questions
    const { data } = await (supabase as any)
      .from('tracking_round_questions')
      .select('*')
      .eq('round_id', round.id)
      .order('sort_order');
    
    const loadedQs: NewQuestion[] = (data || []).map((q: any) => ({
      question_key: q.question_key,
      label: q.label || '',
      description: q.description || '',
      question_type: q.question_type || 'select',
      options: Array.isArray(q.options) ? q.options : [],
      is_required: q.is_required ?? true,
      allow_other: q.allow_other ?? false,
      conditional_question_key: q.conditional_question_key || '',
      conditional_value: q.conditional_value || '',
    }));
    setQuestions(loadedQs);
    setNewOptionText({});
    setExpandedQ(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !startDate) {
      toast({ title: 'Preencha o nome e data de início', variant: 'destructive' });
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      start_date: startDate,
      end_date: endDate || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      target_interviews: parseInt(targetInterviews) || 100,
      questions: questions.map(q => ({
        question_key: q.question_key,
        label: q.label,
        description: q.description || null,
        question_type: q.question_type,
        options: q.options.length > 0 ? q.options : null,
        sort_order: 0,
        is_required: q.is_required,
        allow_other: q.allow_other,
        conditional_question_key: q.conditional_question_key || null,
        conditional_value: q.conditional_value || null,
      })),
    };

    if (editingRoundId) {
      await updateRound.mutateAsync({ id: editingRoundId, ...payload });
    } else {
      await createRound.mutateAsync(payload);
    }
    resetForm();
    setDialogOpen(false);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()]);
    setExpandedQ(questions.length);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setExpandedQ(null);
  };

  const updateQuestion = (idx: number, field: keyof NewQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const addOption = (idx: number) => {
    const text = (newOptionText[idx] || '').trim();
    if (!text) return;
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, options: [...q.options, text] } : q));
    setNewOptionText(prev => ({ ...prev, [idx]: '' }));
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setExpandedQ(target);
  };

  const copyLink = (round: any) => {
    const url = `${window.location.origin}/tracking/coleta/${round.share_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: url });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Tracking Eleitoral</h1>
          <p className="text-sm text-muted-foreground">Pesquisa de campo própria com inteligência analítica</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus className="w-4 h-4" /> Nova Rodada
            </Button>
          </DialogTrigger>
           <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingRoundId ? 'Editar Rodada' : 'Criar Rodada de Tracking'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 max-h-[calc(90vh-140px)] pr-4">
              <div className="space-y-6 pb-4">
                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nome da Rodada *</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Tracking Curitiba - Abril 2026" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descrição</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo e detalhes da rodada..." rows={2} />
                  </div>
                  <div>
                    <Label>Cidade *</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Curitiba" />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={state} onChange={e => setState(e.target.value)} placeholder="PR" />
                  </div>
                </div>

                {/* Dates & times */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Data Início *</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Horário Início</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>Horário Fim</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="w-48">
                  <Label>Meta de Entrevistas</Label>
                  <Input type="number" value={targetInterviews} onChange={e => setTargetInterviews(e.target.value)} />
                </div>

                {/* Questions */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground">Perguntas do Questionário</h3>
                    <Button size="sm" variant="outline" onClick={addQuestion} className="gap-1">
                      <Plus className="w-3 h-3" /> Pergunta
                    </Button>
                  </div>

                  {questions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                      Nenhuma pergunta adicionada. Clique em "+ Pergunta" para começar.
                    </p>
                  )}

                  <div className="space-y-2">
                    {questions.map((q, idx) => {
                      const isExpanded = expandedQ === idx;
                      const needsOptions = ['select', 'multiselect'].includes(q.question_type);
                      return (
                        <div key={q.question_key} className="border border-border rounded-lg bg-card">
                          {/* Collapsed header */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                            onClick={() => setExpandedQ(isExpanded ? null : idx)}
                          >
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                            <span className="text-sm font-medium text-foreground flex-1 truncate">
                              {q.label || 'Nova pergunta...'}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); moveQuestion(idx, -1); }}>
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); moveQuestion(idx, 1); }}>
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); removeQuestion(idx); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Expanded form */}
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                              <div>
                                <Label className="text-xs">Texto da pergunta *</Label>
                                <Input
                                  value={q.label}
                                  onChange={e => updateQuestion(idx, 'label', e.target.value)}
                                  placeholder="Se as eleições fossem hoje, em quem você votaria?"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Descrição (opcional)</Label>
                                <Input
                                  value={q.description}
                                  onChange={e => updateQuestion(idx, 'description', e.target.value)}
                                  placeholder="Orientação para o entrevistador..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Tipo de resposta</Label>
                                  <Select value={q.question_type} onValueChange={v => updateQuestion(idx, 'question_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {QUESTION_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex flex-col gap-2 pt-5">
                                  <div className="flex items-center gap-2">
                                    <Switch checked={q.is_required} onCheckedChange={v => updateQuestion(idx, 'is_required', v)} />
                                    <Label className="text-xs">Obrigatória</Label>
                                  </div>
                                  {needsOptions && (
                                    <div className="flex items-center gap-2">
                                      <Switch checked={q.allow_other} onCheckedChange={v => updateQuestion(idx, 'allow_other', v)} />
                                      <Label className="text-xs">Opção "Outro"</Label>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Options for select/multiselect */}
                              {needsOptions && (
                                <div>
                                  <Label className="text-xs">Opções de resposta</Label>
                                  <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                                    {q.options.map((opt, oIdx) => (
                                      <Badge key={oIdx} variant="secondary" className="gap-1 pr-1">
                                        {opt}
                                        <button onClick={() => removeOption(idx, oIdx)} className="ml-1 hover:text-destructive">×</button>
                                      </Badge>
                                    ))}
                                    {q.options.length === 0 && (
                                      <span className="text-[10px] text-muted-foreground">Nenhuma opção adicionada</span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Input
                                      value={newOptionText[idx] || ''}
                                      onChange={e => setNewOptionText(prev => ({ ...prev, [idx]: e.target.value }))}
                                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption(idx))}
                                      placeholder="Digite uma opção e pressione Enter"
                                      className="text-sm"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => addOption(idx)}>
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Conditional logic */}
                              {idx > 0 && (
                                <div className="border-t border-border pt-2">
                                  <Label className="text-xs text-muted-foreground">Lógica Condicional (opcional)</Label>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                      <Select
                                        value={q.conditional_question_key}
                                        onValueChange={v => updateQuestion(idx, 'conditional_question_key', v)}
                                      >
                                        <SelectTrigger className="text-xs"><SelectValue placeholder="Mostrar se..." /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="">Sempre visível</SelectItem>
                                          {questions.slice(0, idx).map(pq => (
                                            <SelectItem key={pq.question_key} value={pq.question_key}>
                                              {pq.label || `Pergunta ${questions.indexOf(pq) + 1}`}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Input
                                        value={q.conditional_value}
                                        onChange={e => updateQuestion(idx, 'conditional_value', e.target.value)}
                                        placeholder="Valor esperado"
                                        className="text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createRound.isPending || updateRound.isPending}>
                {(createRound.isPending || updateRound.isPending) ? 'Salvando...' : editingRoundId ? 'Salvar Alterações' : 'Criar Rodada'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Rodadas', value: rounds.length, icon: FileText, color: 'text-primary' },
          { label: 'Rodadas Ativas', value: activeRounds, icon: Target, color: 'text-green-400' },
          { label: 'Cidades', value: uniqueCities, icon: MapPin, color: 'text-blue-400' },
          { label: 'Entrevistas', value: totalInterviews, icon: ClipboardCheck, color: 'text-amber-400' },
          { label: 'Entrevistadores', value: '-', icon: Users, color: 'text-purple-400' },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <TrackingTabsSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        rounds={rounds}
        isLoading={isLoading}
        interviewCounts={interviewCounts}
        resetForm={resetForm}
        setDialogOpen={setDialogOpen}
        copyLink={copyLink}
        updateRoundStatus={updateRoundStatus}
        activeCandidate={activeCandidate}
        loadRoundForEdit={loadRoundForEdit}
      />
    </div>
  );
}

/* ─── Tabs Section (extracted to keep main component clean) ─── */
function TrackingTabsSection({ activeTab, setActiveTab, rounds, isLoading, interviewCounts, resetForm, setDialogOpen, copyLink, updateRoundStatus, activeCandidate }: any) {
  const [chartRoundId, setChartRoundId] = useState<string | null>(null);
  const [chartFilters, setChartFilters] = useState({ city: '', neighborhood: '', interviewer: '' });

  // Load all interviews and answers for charts/map
  const { data: allInterviews = [] } = useQuery({
    queryKey: ['tracking-all-interviews', activeCandidate?.id],
    queryFn: async () => {
      const roundIds = rounds.map((r: any) => r.id);
      if (!roundIds.length) return [];
      const { data } = await (supabase as any).from('tracking_interviews').select('*').in('round_id', roundIds);
      return data || [];
    },
    enabled: rounds.length > 0,
  });

  const { data: allAnswers = [] } = useQuery({
    queryKey: ['tracking-all-answers', allInterviews.length],
    queryFn: async () => {
      const ids = allInterviews.map((i: any) => i.id);
      if (!ids.length) return [];
      // Batch in chunks of 200
      const results: any[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { data } = await (supabase as any).from('tracking_interview_answers').select('*').in('interview_id', chunk);
        if (data) results.push(...data);
      }
      return results;
    },
    enabled: allInterviews.length > 0,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['tracking-all-questions', rounds.length],
    queryFn: async () => {
      const roundIds = rounds.map((r: any) => r.id);
      if (!roundIds.length) return [];
      const { data } = await (supabase as any).from('tracking_round_questions').select('*').in('round_id', roundIds).order('sort_order');
      return data || [];
    },
    enabled: rounds.length > 0,
  });

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
    aberta: { label: 'Ativa', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    fechada: { label: 'Encerrada', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    em_analise: { label: 'Em Análise', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="rodadas">Rodadas</TabsTrigger>
        <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        <TabsTrigger value="mapa">Mapa</TabsTrigger>
        <TabsTrigger value="ia">IA Analítica</TabsTrigger>
      </TabsList>

      <TabsContent value="rodadas" className="mt-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando rodadas...</div>
        ) : rounds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">Nenhuma rodada criada</h3>
              <p className="text-sm text-muted-foreground mb-4">Crie sua primeira rodada de tracking para começar a coletar entrevistas.</p>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Criar Primeira Rodada
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rounds.map((round: any) => {
              const count = interviewCounts[round.id] || 0;
              const pct = round.target_interviews > 0 ? Math.min(100, Math.round((count / round.target_interviews) * 100)) : 0;
              const st = STATUS_MAP[round.status] || STATUS_MAP.rascunho;

              return (
                <Card key={round.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{round.title}</CardTitle>
                        {round.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {round.city}{round.state ? ` - ${round.state}` : ''}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(round.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {round.end_date && ` → ${new Date(round.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                      </span>
                      {round.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {round.start_time?.slice(0, 5)}{round.end_time ? ` - ${round.end_time.slice(0, 5)}` : ''}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{count} / {round.target_interviews} entrevistas</span>
                        <span className="font-bold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" className="gap-1 text-xs"
                        onClick={() => loadRoundForEdit(round)}>
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      {round.share_code && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs flex-1" onClick={() => copyLink(round)}>
                          <Copy className="w-3 h-3" /> Copiar Link
                        </Button>
                      )}
                      {round.status === 'rascunho' && (
                        <Button size="sm" variant="default" className="gap-1 text-xs flex-1"
                          onClick={() => updateRoundStatus.mutate({ id: round.id, status: 'aberta' })}>
                          <ExternalLink className="w-3 h-3" /> Ativar
                        </Button>
                      )}
                      {round.status === 'aberta' && (
                        <Button size="sm" variant="secondary" className="gap-1 text-xs flex-1"
                          onClick={() => updateRoundStatus.mutate({ id: round.id, status: 'fechada' })}>
                          Encerrar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="graficos" className="mt-4">
        <TrackingCharts
          rounds={rounds}
          interviews={allInterviews}
          answers={allAnswers}
          questions={allQuestions}
          selectedRoundId={chartRoundId}
          onRoundChange={setChartRoundId}
          filters={chartFilters}
          onFiltersChange={setChartFilters}
        />
      </TabsContent>

      <TabsContent value="mapa" className="mt-4">
        <TrackingMap
          interviews={allInterviews}
          rounds={rounds}
          selectedRoundId={chartRoundId}
          onRoundChange={setChartRoundId}
        />
      </TabsContent>

      <TabsContent value="ia" className="mt-4">
        <TrackingAI selectedRoundId={chartRoundId} />
      </TabsContent>
    </Tabs>
  );
}
