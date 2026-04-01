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
  Trash2, ChevronDown, ChevronUp, FileText,
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
  const { rounds, isLoading, interviewCounts, createRound, updateRoundStatus } = useTrackingRounds();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
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
    setExpandedQ(null);
  };

  const handleCreate = async () => {
    if (!title.trim() || !startDate) {
      toast({ title: 'Preencha o nome e data de início', variant: 'destructive' });
      return;
    }
    await createRound.mutateAsync({
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
    });
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Criar Rodada de Tracking</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createRound.isPending}>
                {createRound.isPending ? 'Criando...' : 'Criar Rodada'}
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
      />
    </div>
  );
}
