import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  BarChart2, Upload, BookOpen, Search, TrendingUp, GitCompare,
  X, ChevronDown, ChevronUp, Info, Plus, Trash2, FileText, Pencil, Loader2, Sparkles,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { CandidateBarChart } from '@/components/polls/CandidateBarChart';
import { CrossTabTable } from '@/components/polls/CrossTabTable';
import {
  pollWaves as initialWaves,
  pollQuestions as initialQuestions,
  pollComparativos as initialComparativos,
  PollWave, PollQuestion, Cargo, FilterType, CANDIDATE_COLORS,
} from '@/data/pollsData';
import { useSurveys, useCreateSurvey, useUpdateSurvey, useDeleteSurvey } from '@/hooks/useSurveys';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate, type Candidate } from '@/contexts/CandidateContext';
import { matchesCandidate, cargoToSurveyKey } from '@/lib/candidateMatch';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'genero', label: 'Gênero' },
  { value: 'faixa_etaria', label: 'Faixa Etária' },
  { value: 'escolaridade', label: 'Escolaridade' },
  { value: 'renda', label: 'Nível Econômico' },
  { value: 'religiosidade', label: 'Religiosidade' },
];

// ─── WaveCard ────────────────────────────────────────────────
function WaveCard({ wave, onDelete, onEdit }: { wave: PollWave; onDelete?: () => void; onEdit?: () => void }) {
  return (
    <div className="rounded-xl bg-[hsl(220,20%,13%)] border border-[hsl(220,15%,20%)] p-4 flex flex-col gap-3 relative shadow-lg">
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[#8899aa] hover:text-[#0FFCBE] transition-colors"
            title="Editar pesquisa"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-[#8899aa] hover:text-[#E53935] transition-colors"
            title="Remover pesquisa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 pr-14">
        <div>
          <div className="text-xs font-bold text-[#0FFCBE]">{wave.institute}</div>
          <div className="text-sm font-semibold text-white mt-0.5">{wave.territory}</div>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 border-[hsl(220,15%,25%)] text-[#8899aa]">{wave.releaseDate}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center border-t border-[hsl(220,15%,20%)] pt-3">
        <div>
          <div className="text-[10px] text-[#8899aa]">Amostra</div>
          <div className="text-sm font-bold text-white">{wave.sampleSize.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8899aa]">Margem</div>
          <div className="text-sm font-bold text-white">±{wave.marginOfError}pp</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8899aa]">Cargos</div>
          <div className="text-sm font-bold text-white capitalize">{wave.cargos.map(c => c === 'governador' ? 'Gov' : 'Sen').join(', ')}</div>
        </div>
      </div>
      <div className="text-[10px] text-[#8899aa] border-t border-[hsl(220,15%,20%)] pt-2">
        TSE: {wave.tseRegistration}
      </div>
      <div className="text-[10px] text-[#8899aa] leading-relaxed line-clamp-2">
        {wave.methodology}
      </div>
    </div>
  );
}

// ─── Import modal types ───────────────────────────────────────
interface CandidateEntry { name: string; pct: string }
interface ScenarioEntry {
  label: string;
  candidates: CandidateEntry[];
  isMultipleChoice?: boolean;
  isMainScenario?: boolean;
}
interface ImportForm {
  institute: string;
  territory: string;
  cargos: Cargo[];
  collectionStart: string;
  collectionEnd: string;
  releaseDate: string;
  sampleSize: string;
  marginOfError: string;
  methodology: string;
  tseRegistration: string;
  govScenarios: ScenarioEntry[];
  senScenarios: ScenarioEntry[];
}

const emptyScenario = (label = 'Cenário 1'): ScenarioEntry => ({
  label,
  candidates: [{ name: '', pct: '' }],
});

const emptyForm = (): ImportForm => ({
  institute: '',
  territory: 'Estado do Paraná',
  cargos: ['governador', 'senador'],
  collectionStart: '',
  collectionEnd: '',
  releaseDate: '',
  sampleSize: '',
  marginOfError: '',
  methodology: '',
  tseRegistration: '',
  govScenarios: [emptyScenario()],
  senScenarios: [emptyScenario()],
});

// ─── Tab: Biblioteca ─────────────────────────────────────────
interface BibliotecaProps {
  waves: PollWave[];
  questions: PollQuestion[];
  onAdd: (wave: PollWave, questions: PollQuestion[]) => void;
  onUpdate: (surveyId: string, wave: PollWave, questions: PollQuestion[]) => void;
  onDelete: (waveId: string) => void;
  dbIds: Set<string>;
}

function TabBiblioteca({ waves, questions: allQuestions, onAdd, onUpdate, onDelete, dbIds }: BibliotecaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [form, setForm] = useState<ImportForm>(emptyForm());
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const parseFileInputRef = useRef<HTMLInputElement>(null);

  const updateForm = (partial: Partial<ImportForm>) => setForm(f => ({ ...f, ...partial }));

  const handleParsePdf = useCallback(async (file: File) => {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-survey-pdf`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { data: parsed } = await res.json();

      // Auto-fill form with parsed data
      const govScenarios = parsed.govScenarios?.length > 0
        ? parsed.govScenarios.map((s: any, i: number) => ({
            label: s.label || 'Cenário',
            candidates: s.candidates?.map((c: any) => ({ name: c.name, pct: String(c.pct) })) || [],
            isMultipleChoice: !!s.isMultipleChoice,
            isMainScenario: i === 0,
          }))
        : form.govScenarios;

      const senScenarios = parsed.senScenarios?.length > 0
        ? parsed.senScenarios.map((s: any, i: number) => ({
            label: s.label || 'Cenário',
            candidates: s.candidates?.map((c: any) => ({ name: c.name, pct: String(c.pct) })) || [],
            isMultipleChoice: !!s.isMultipleChoice,
            isMainScenario: i === 0,
          }))
        : form.senScenarios;

      updateForm({
        institute: parsed.institute || form.institute,
        territory: parsed.territory || form.territory,
        collectionStart: parsed.collectionStart || form.collectionStart,
        collectionEnd: parsed.collectionEnd || form.collectionEnd,
        releaseDate: parsed.releaseDate || form.releaseDate,
        sampleSize: parsed.sampleSize ? String(parsed.sampleSize) : form.sampleSize,
        marginOfError: parsed.marginOfError ? String(parsed.marginOfError) : form.marginOfError,
        methodology: parsed.methodology || form.methodology,
        tseRegistration: parsed.tseRegistration || form.tseRegistration,
        cargos: parsed.cargos?.length > 0 ? parsed.cargos : form.cargos,
        govScenarios,
        senScenarios,
      });

      toast.success(`Dados extraídos! ${govScenarios.length} cenário(s) gov + ${senScenarios.length} cenário(s) sen.`);
    } catch (err: any) {
      console.error('PDF parse error:', err);
      toast.error(`Erro ao processar PDF: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  }, [form]);

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setStep(1);
      setForm(emptyForm());
      setOpen(true);
    }
    // reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCargo = (cargo: Cargo) => {
    updateForm({
      cargos: form.cargos.includes(cargo)
        ? form.cargos.filter(c => c !== cargo)
        : [...form.cargos, cargo],
    });
  };

  const addCandidate = (cargoField: 'govScenarios' | 'senScenarios', scenarioIdx: number) => {
    const scenarios = [...form[cargoField]];
    scenarios[scenarioIdx] = { ...scenarios[scenarioIdx], candidates: [...scenarios[scenarioIdx].candidates, { name: '', pct: '' }] };
    updateForm({ [cargoField]: scenarios });
  };

  const removeCandidate = (cargoField: 'govScenarios' | 'senScenarios', scenarioIdx: number, candIdx: number) => {
    const scenarios = [...form[cargoField]];
    scenarios[scenarioIdx] = { ...scenarios[scenarioIdx], candidates: scenarios[scenarioIdx].candidates.filter((_, i) => i !== candIdx) };
    updateForm({ [cargoField]: scenarios });
  };

  const updateCandidate = (cargoField: 'govScenarios' | 'senScenarios', scenarioIdx: number, candIdx: number, key: 'name' | 'pct', value: string) => {
    const scenarios = [...form[cargoField]];
    const cands = [...scenarios[scenarioIdx].candidates];
    cands[candIdx] = { ...cands[candIdx], [key]: value };
    scenarios[scenarioIdx] = { ...scenarios[scenarioIdx], candidates: cands };
    updateForm({ [cargoField]: scenarios });
  };

  const addScenario = (cargoField: 'govScenarios' | 'senScenarios') => {
    const scenarios = form[cargoField];
    updateForm({ [cargoField]: [...scenarios, emptyScenario(`Cenário ${scenarios.length + 1}`)] });
  };

  const removeScenario = (cargoField: 'govScenarios' | 'senScenarios', idx: number) => {
    updateForm({ [cargoField]: form[cargoField].filter((_, i) => i !== idx) });
  };

  const canGoNext = () => {
    if (step === 1 && !editingSurveyId) return !!fileName;
    if (step === 1 && editingSurveyId) return true;
    if (step === 2) return !!(form.institute && form.territory && form.cargos.length > 0 && form.releaseDate && form.sampleSize);
    return true;
  };

  const handleConfirm = () => {
    const waveId = editingSurveyId ?? `wave-${Date.now()}`;
    const newWave: PollWave = {
      id: waveId,
      institute: form.institute,
      territory: form.territory,
      cargos: form.cargos,
      collectionStart: form.collectionStart || form.releaseDate,
      collectionEnd: form.collectionEnd || form.releaseDate,
      releaseDate: form.releaseDate,
      sampleSize: parseInt(form.sampleSize) || 0,
      marginOfError: parseFloat(form.marginOfError) || 0,
      methodology: form.methodology,
      tseRegistration: form.tseRegistration,
    };

    const newQuestions: PollQuestion[] = [];

    if (form.cargos.includes('governador')) {
      form.govScenarios.forEach((scenario, sIdx) => {
        if (scenario.candidates.some(c => c.name && c.pct)) {
          newQuestions.push({
            id: `${waveId}-gov-est-${sIdx + 1}`,
            waveId,
            cargo: 'governador',
            questionType: 'estimulada',
            scenarioLabel: scenario.label || `Cenário ${sIdx + 1}`,
            isMultipleChoice: scenario.isMultipleChoice ?? false,
            isMainScenario: scenario.isMainScenario ?? sIdx === 0,
            results: scenario.candidates
              .filter(c => c.name)
              .map(c => ({ candidate: c.name, percentage: parseFloat(c.pct) || 0 }))
              .sort((a, b) => b.percentage - a.percentage),
            crossTabs: [],
          });
        }
      });
    }

    if (form.cargos.includes('senador')) {
      form.senScenarios.forEach((scenario, sIdx) => {
        if (scenario.candidates.some(c => c.name && c.pct)) {
          newQuestions.push({
            id: `${waveId}-sen-est-${sIdx + 1}`,
            waveId,
            cargo: 'senador',
            questionType: 'estimulada',
            scenarioLabel: scenario.label || `Cenário ${sIdx + 1}`,
            isMultipleChoice: scenario.isMultipleChoice ?? false,
            isMainScenario: scenario.isMainScenario ?? sIdx === 0,
            results: scenario.candidates
              .filter(c => c.name)
              .map(c => ({ candidate: c.name, percentage: parseFloat(c.pct) || 0 }))
              .sort((a, b) => b.percentage - a.percentage),
            crossTabs: [],
          });
        }
      });
    }

    if (editingSurveyId) {
      onUpdate(editingSurveyId, newWave, newQuestions);
    } else {
      onAdd(newWave, newQuestions);
    }
    closeDialog();
  };

  const closeDialog = () => {
    setOpen(false);
    setStep(1);
    setFileName('');
    setForm(emptyForm());
    setEditingSurveyId(null);
    setPdfFile(null);
    setIsParsing(false);
  };

  const handleEditWave = (wave: PollWave) => {
    const waveQuestions = allQuestions.filter(q => q.waveId === wave.id);
    const govQs = waveQuestions.filter(q => q.cargo === 'governador' && q.questionType === 'estimulada');
    const senQs = waveQuestions.filter(q => q.cargo === 'senador' && q.questionType === 'estimulada');

    setForm({
      institute: wave.institute,
      territory: wave.territory,
      cargos: wave.cargos as Cargo[],
      collectionStart: wave.collectionStart || '',
      collectionEnd: wave.collectionEnd || '',
      releaseDate: wave.releaseDate,
      sampleSize: String(wave.sampleSize),
      marginOfError: String(wave.marginOfError),
      methodology: wave.methodology || '',
      tseRegistration: wave.tseRegistration || '',
      govScenarios: govQs.length > 0
        ? govQs.map(q => ({
            label: q.scenarioLabel,
            candidates: q.results.map(r => ({ name: r.candidate, pct: String(r.percentage) })),
            isMultipleChoice: !!q.isMultipleChoice,
            isMainScenario: !!q.isMainScenario,
          }))
        : [emptyScenario()],
      senScenarios: senQs.length > 0
        ? senQs.map(q => ({
            label: q.scenarioLabel,
            candidates: q.results.map(r => ({ name: r.candidate, pct: String(r.percentage) })),
            isMultipleChoice: !!q.isMultipleChoice,
            isMainScenario: !!q.isMainScenario,
          }))
        : [emptyScenario()],
    });
    setEditingSurveyId(wave.id);
    setFileName(wave.fileName || 'pesquisa.pdf');
    setStep(2); // skip file step
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload area */}
      <div
        className="rounded-xl border-2 border-dashed border-[hsl(220,15%,25%)] hover:border-[#0FFCBE]/50 transition-colors p-8 flex flex-col items-center gap-3 cursor-pointer bg-[hsl(220,20%,13%)]"
        onClick={handleFileClick}
      >
        <div className="w-12 h-12 rounded-full bg-[#0FFCBE]/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-[#0FFCBE]" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">Importar PDF de Pesquisa</div>
          <div className="text-xs text-[#8899aa] mt-1">
            Arraste o arquivo ou clique para selecionar — padrão Paraná Pesquisas / tabulação
          </div>
        </div>
        <div className="text-[10px] text-[#8899aa] border border-[hsl(220,15%,25%)] rounded px-2 py-1">
          Formatos suportados: Relatório completo · Tabulação cruzada
        </div>
      </div>

      {/* Wave cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {waves.map(w => (
          <WaveCard
            key={w.id}
            wave={w}
            onEdit={dbIds.has(w.id) ? () => handleEditWave(w) : undefined}
            onDelete={() => onDelete(w.id)}
          />
        ))}
      </div>

      {/* Import Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0FFCBE]" />
              {editingSurveyId ? 'Editar Pesquisa' : 'Importar Pesquisa'}
              <Badge variant="outline" className="ml-auto text-[10px]">Passo {step} / 3</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1 mb-2">
            {(editingSurveyId ? [2, 3] : [1, 2, 3]).map((s, i, arr) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-[hsl(220,18%,16%)]'}`}
              />
            ))}
          </div>

          {/* ── Step 1: Arquivo ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-muted-foreground">Arquivo selecionado</div>
              <div className="flex items-center gap-3 rounded-lg border border-[hsl(220,15%,20%)] p-3 bg-[hsl(220,18%,16%)]">
                <FileText className="w-8 h-8 text-[#0FFCBE] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{fileName}</div>
                  <div className="text-xs text-muted-foreground">PDF · Pronto para importar</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-[hsl(220,18%,16%)] rounded-lg p-3 space-y-1">
                <div className="font-semibold text-foreground mb-1">Padrões reconhecidos:</div>
                <div>• Relatório completo (Paraná Pesquisas) — Espontânea, Estimulada por cenários, Rejeição, Aprovação + Comparativo</div>
                <div>• Tabulação cruzada colorida — sub/sobre-representação por segmento</div>
                <div className="mt-2 text-[10px] text-muted-foreground">Os dados serão inseridos manualmente nas próximas etapas.</div>
              </div>
            </div>
          )}

          {/* ── Step 2: Metadados ── */}
          {step === 2 && (
            <div className="space-y-3">
              {/* PDF Upload + AI Parse */}
              <input
                ref={parseFileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPdfFile(file);
                    if (!fileName) setFileName(file.name);
                    handleParsePdf(file);
                  }
                  if (parseFileInputRef.current) parseFileInputRef.current.value = '';
                }}
              />
              <div
                className={`rounded-lg border border-dashed p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                  isParsing
                    ? 'border-[#0FFCBE]/50 bg-[#0FFCBE]/5'
                    : 'border-[hsl(220,15%,25%)] hover:border-[#0FFCBE]/50 bg-[hsl(220,18%,16%)]'
                }`}
                onClick={() => !isParsing && parseFileInputRef.current?.click()}
              >
                {isParsing ? (
                  <Loader2 className="w-5 h-5 text-[#0FFCBE] animate-spin shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 text-[#0FFCBE] shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    {isParsing ? 'Extraindo dados do PDF com IA…' : 'Upload PDF para extração automática'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isParsing
                      ? 'Analisando documento — isso pode levar alguns segundos'
                      : 'A IA lerá o PDF e preencherá os campos automaticamente'}
                  </div>
                </div>
                {!isParsing && (
                  <Button variant="outline" size="sm" className="shrink-0 text-xs h-7 gap-1" onClick={(e) => { e.stopPropagation(); parseFileInputRef.current?.click(); }}>
                    <Upload className="w-3 h-3" />
                    Enviar PDF
                  </Button>
                )}
              </div>

              <div className="text-sm font-semibold text-muted-foreground mb-2">Metadados da pesquisa</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Instituto *</Label>
                  <Input
                    placeholder="ex: Paraná Pesquisas"
                    value={form.institute}
                    onChange={e => updateForm({ institute: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Território *</Label>
                  <Input
                    placeholder="ex: Estado do Paraná"
                    value={form.territory}
                    onChange={e => updateForm({ territory: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Coleta — início</Label>
                  <Input
                    type="date"
                    value={form.collectionStart}
                    onChange={e => updateForm({ collectionStart: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Coleta — fim</Label>
                  <Input
                    type="date"
                    value={form.collectionEnd}
                    onChange={e => updateForm({ collectionEnd: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Data de divulgação *</Label>
                  <Input
                    type="date"
                    value={form.releaseDate}
                    onChange={e => updateForm({ releaseDate: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Registro TSE</Label>
                  <Input
                    placeholder="ex: PR-00000/2026"
                    value={form.tseRegistration}
                    onChange={e => updateForm({ tseRegistration: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tamanho da amostra *</Label>
                  <Input
                    type="number"
                    placeholder="ex: 1500"
                    value={form.sampleSize}
                    onChange={e => updateForm({ sampleSize: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Margem de erro (pp)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="ex: 2.8"
                    value={form.marginOfError}
                    onChange={e => updateForm({ marginOfError: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Metodologia</Label>
                  <Textarea
                    placeholder="ex: Entrevistas presenciais com eleitores aptos a votar..."
                    value={form.methodology}
                    onChange={e => updateForm({ methodology: e.target.value })}
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cargos pesquisados *</Label>
                <div className="flex gap-4">
                  {(['governador', 'senador'] as Cargo[]).map(c => (
                    <div key={c} className="flex items-center gap-2">
                      <Checkbox
                        id={`cargo-${c}`}
                        checked={form.cargos.includes(c)}
                        onCheckedChange={() => toggleCargo(c)}
                      />
                      <label htmlFor={`cargo-${c}`} className="text-sm capitalize cursor-pointer">
                        {c}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Dados ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-sm font-semibold text-muted-foreground">
                Dados de intenção de voto — Estimulada (todos os cenários)
              </div>
              <div className="text-xs text-muted-foreground -mt-3">
                Preencha candidatos e percentuais. Adicione cenários se a pesquisa tiver múltiplos.
              </div>

              {form.cargos.includes('governador') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-foreground">Governador</div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => addScenario('govScenarios')}>
                      <Plus className="w-3 h-3" /> Cenário
                    </Button>
                  </div>
                  {form.govScenarios.map((scenario, sIdx) => (
                    <div key={sIdx} className="space-y-2 rounded-lg border border-[hsl(220,15%,20%)] p-3 bg-[hsl(220,18%,16%)]">
                      <div className="flex items-center justify-between">
                        <Input
                          value={scenario.label}
                          onChange={e => {
                            const s = [...form.govScenarios];
                            s[sIdx] = { ...s[sIdx], label: e.target.value };
                            updateForm({ govScenarios: s });
                          }}
                          className="h-6 text-xs font-semibold w-40 bg-transparent border-none p-0"
                        />
                        {form.govScenarios.length > 1 && (
                          <button onClick={() => removeScenario('govScenarios', sIdx)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <ScenarioToggles
                        cargoField="govScenarios"
                        sIdx={sIdx}
                        scenario={scenario}
                        scenarios={form.govScenarios}
                        updateForm={updateForm}
                      />
                      <CandidatesBlock
                        title=""
                        entries={scenario.candidates}
                        onAdd={() => addCandidate('govScenarios', sIdx)}
                        onRemove={idx => removeCandidate('govScenarios', sIdx, idx)}
                        onChange={(idx, key, val) => updateCandidate('govScenarios', sIdx, idx, key, val)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {form.cargos.includes('senador') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-foreground">Senador</div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => addScenario('senScenarios')}>
                      <Plus className="w-3 h-3" /> Cenário
                    </Button>
                  </div>
                  {form.senScenarios.map((scenario, sIdx) => (
                    <div key={sIdx} className="space-y-2 rounded-lg border border-[hsl(220,15%,20%)] p-3 bg-[hsl(220,18%,16%)]">
                      <div className="flex items-center justify-between">
                        <Input
                          value={scenario.label}
                          onChange={e => {
                            const s = [...form.senScenarios];
                            s[sIdx] = { ...s[sIdx], label: e.target.value };
                            updateForm({ senScenarios: s });
                          }}
                          className="h-6 text-xs font-semibold w-40 bg-transparent border-none p-0"
                        />
                        {form.senScenarios.length > 1 && (
                          <button onClick={() => removeScenario('senScenarios', sIdx)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <ScenarioToggles
                        cargoField="senScenarios"
                        sIdx={sIdx}
                        scenario={scenario}
                        scenarios={form.senScenarios}
                        updateForm={updateForm}
                      />
                      <CandidatesBlock
                        title=""
                        entries={scenario.candidates}
                        onAdd={() => addCandidate('senScenarios', sIdx)}
                        onRemove={idx => removeCandidate('senScenarios', sIdx, idx)}
                        onChange={(idx, key, val) => updateCandidate('senScenarios', sIdx, idx, key, val)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            {step > 1 && !(editingSurveyId && step === 2) && (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                Voltar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={closeDialog}>
              Cancelar
            </Button>
            {step < 3 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
                Próximo
              </Button>
            ) : (
              <Button size="sm" onClick={handleConfirm}>
                {editingSurveyId ? 'Salvar alterações' : 'Confirmar importação'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScenarioToggles({
  cargoField, sIdx, scenario, scenarios, updateForm,
}: {
  cargoField: 'govScenarios' | 'senScenarios';
  sIdx: number;
  scenario: ScenarioEntry;
  scenarios: ScenarioEntry[];
  updateForm: (patch: Partial<ImportForm>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`main-${cargoField}-${sIdx}`}
          checked={!!scenario.isMainScenario}
          onCheckedChange={(v) => {
            const s = scenarios.map((sc, i) => ({ ...sc, isMainScenario: i === sIdx ? !!v : false }));
            updateForm({ [cargoField]: s } as Partial<ImportForm>);
          }}
        />
        <label htmlFor={`main-${cargoField}-${sIdx}`} className="text-[11px] text-muted-foreground cursor-pointer">
          Usar como cenário principal nos cruzamentos
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`rm-${cargoField}-${sIdx}`}
          checked={!!scenario.isMultipleChoice}
          onCheckedChange={(v) => {
            const s = [...scenarios];
            s[sIdx] = { ...s[sIdx], isMultipleChoice: !!v };
            updateForm({ [cargoField]: s } as Partial<ImportForm>);
          }}
        />
        <label htmlFor={`rm-${cargoField}-${sIdx}`} className="text-[11px] text-muted-foreground cursor-pointer">
          Resposta múltipla (RM*) — entrevistado pôde citar mais de 1 candidato
        </label>
      </div>
    </div>
  );
}

function CandidatesBlock({
  title, entries, onAdd, onRemove, onChange,
}: {
  title: string;
  entries: CandidateEntry[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onChange: (idx: number, key: 'name' | 'pct', val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-foreground">{title}</div>
      {entries.map((entry, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <Input
            placeholder="Nome do candidato"
            value={entry.name}
            onChange={e => onChange(idx, 'name', e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <Input
            type="number"
            placeholder="%"
            value={entry.pct}
            onChange={e => onChange(idx, 'pct', e.target.value)}
            className="h-8 text-sm w-20"
            min={0}
            max={100}
          />
          {entries.length > 1 && (
            <button onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={onAdd}>
        <Plus className="w-3 h-3" /> Adicionar candidato
      </Button>
    </div>
  );
}

// ─── Tab: Analisar ───────────────────────────────────────────
interface AnalisarProps {
  waves: PollWave[];
  questions: PollQuestion[];
}

function TabAnalisar({ waves, questions: allQuestions }: AnalisarProps) {
  const [selectedWave, setSelectedWave] = useState(waves[0]?.id ?? '');
  const [cargo, setCargo] = useState<Cargo>('governador');
  const [activeFilter, setActiveFilter] = useState<FilterType>('genero');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    espontanea: true, estimulada: true, rejeicao: false, aprovacao: false,
  });

  const wave = waves.find(w => w.id === selectedWave);

  const questions = useMemo(() =>
    allQuestions.filter(q => q.waveId === selectedWave && q.cargo === cargo),
    [allQuestions, selectedWave, cargo],
  );

  const estimuladas = questions.filter(q => q.questionType === 'estimulada');
  const [activeScenario, setActiveScenario] = useState(estimuladas[0]?.id ?? '');
  const currentEstimulada = estimuladas.find(q => q.id === activeScenario) ?? estimuladas[0];

  const espontanea = questions.find(q => q.questionType === 'espontanea');
  const rejeicao   = questions.find(q => q.questionType === 'rejeicao');

  const comparativos = initialComparativos.filter(c => c.waveId === selectedWave && c.cargo === cargo);
  const aprovacao = comparativos.find(c => c.questionType === 'aprovacao');

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <Select value={selectedWave} onValueChange={setSelectedWave}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione a pesquisa" />
            </SelectTrigger>
            <SelectContent>
              {waves.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.institute} · {w.releaseDate} · {w.territory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex rounded-lg border border-[hsl(220,15%,20%)] overflow-hidden text-sm">
          {(['governador', 'senador'] as Cargo[]).map(c => (
            <button
              key={c}
              onClick={() => setCargo(c)}
              className={`px-4 py-2 capitalize font-medium transition-colors ${
                cargo === c
                  ? 'bg-primary text-[#0FFCBE]-foreground'
                  : 'bg-background text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {wave && (
        <div className="text-xs text-[#8899aa] flex items-center gap-1.5 bg-[hsl(220,18%,16%)] rounded-lg px-3 py-2 border border-[hsl(220,15%,20%)]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {wave.sampleSize.toLocaleString()} entrevistados · {wave.collectionStart} a {wave.collectionEnd} · Margem ±{wave.marginOfError}pp · {wave.methodology.slice(0, 80)}…
        </div>
      )}

      {/* ── ESPONTÂNEA ── */}
      {espontanea && (
        <Collapsible open={openSections.espontanea} onOpenChange={() => toggleSection('espontanea')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-[hsl(220,15%,20%)] px-4 py-3 text-sm font-semibold hover:bg-[hsl(220,18%,18%)] transition-colors bg-[hsl(220,20%,13%)] shadow-lg">
            <span className="flex items-center gap-2"><Search className="w-4 h-4 text-[#0FFCBE]" /> Espontânea</span>
            {openSections.espontanea ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-[hsl(220,15%,20%)] p-4 bg-[hsl(220,20%,13%)] shadow-lg">
              <div className="text-xs text-muted-foreground mb-3">BASE: {wave?.sampleSize.toLocaleString()} eleitores</div>
              <CandidateBarChart results={espontanea.results} height={280} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── ESTIMULADA ── */}
      {estimuladas.length > 0 && (
        <Collapsible open={openSections.estimulada} onOpenChange={() => toggleSection('estimulada')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-[hsl(220,15%,20%)] px-4 py-3 text-sm font-semibold hover:bg-[hsl(220,18%,18%)] transition-colors bg-[hsl(220,20%,13%)] shadow-lg">
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#0FFCBE]" /> Estimulada</span>
            {openSections.estimulada ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-[hsl(220,15%,20%)] p-4 space-y-4 bg-[hsl(220,20%,13%)] shadow-lg">
              {/* Scenario tabs */}
              <div className="flex gap-2 flex-wrap">
                {estimuladas.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setActiveScenario(q.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      (activeScenario === q.id || (!activeScenario && estimuladas[0]?.id === q.id))
                        ? 'bg-primary text-[#0FFCBE]-foreground border-primary'
                        : 'border-[hsl(220,15%,20%)] text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
                    }`}
                  >
                    {q.scenarioLabel}
                  </button>
                ))}
              </div>

              {currentEstimulada && (
                <>
                  {currentEstimulada.note && (
                    <div className="text-[10px] text-muted-foreground italic">{currentEstimulada.note}</div>
                  )}
                  <CandidateBarChart results={currentEstimulada.results} hideNeutral height={260} />

                  {/* CrossTab filter */}
                  {currentEstimulada.crossTabs.length > 0 && (
                    <div className="space-y-3 border-t border-[hsl(220,15%,20%)] pt-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground">Tabulação por:</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {FILTER_OPTIONS.map(f => {
                            const hasCrossTab = currentEstimulada.crossTabs.some(ct => ct.filterType === f.value);
                            if (!hasCrossTab) return null;
                            return (
                              <button
                                key={f.value}
                                onClick={() => setActiveFilter(f.value)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                                  activeFilter === f.value
                                    ? 'bg-[#0FFCBE]/10 border-[#0FFCBE] text-[#0FFCBE]'
                                    : 'border-[hsl(220,15%,20%)] text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
                                }`}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {currentEstimulada.crossTabs
                        .filter(ct => ct.filterType === activeFilter)
                        .map((ct, i) => <CrossTabTable key={i} crossTab={ct} />)
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── REJEIÇÃO ── */}
      {rejeicao && (
        <Collapsible open={openSections.rejeicao} onOpenChange={() => toggleSection('rejeicao')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-[hsl(220,15%,20%)] px-4 py-3 text-sm font-semibold hover:bg-[hsl(220,18%,18%)] transition-colors bg-[hsl(220,20%,13%)] shadow-lg">
            <span className="flex items-center gap-2">
              <X className="w-4 h-4 text-brand-red" /> Rejeição
              {rejeicao.note && <span className="text-[10px] font-normal text-muted-foreground">{rejeicao.note}</span>}
            </span>
            {openSections.rejeicao ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-[hsl(220,15%,20%)] p-4 space-y-4 bg-[hsl(220,20%,13%)] shadow-lg">
              <CandidateBarChart results={rejeicao.results} hideNeutral height={240} />

              {rejeicao.crossTabs.length > 0 && (
                <div className="space-y-3 border-t border-[hsl(220,15%,20%)] pt-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">Tabulação por:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {FILTER_OPTIONS.map(f => {
                        const has = rejeicao.crossTabs.some(ct => ct.filterType === f.value);
                        if (!has) return null;
                        return (
                          <button
                            key={f.value}
                            onClick={() => setActiveFilter(f.value)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                              activeFilter === f.value
                                ? 'bg-brand-red/10 border-brand-red text-brand-red'
                                : 'border-[hsl(220,15%,20%)] text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {rejeicao.crossTabs
                    .filter(ct => ct.filterType === activeFilter)
                    .map((ct, i) => <CrossTabTable key={i} crossTab={ct} />)
                  }
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── APROVAÇÃO (comparativo) ── */}
      {aprovacao && (
        <Collapsible open={openSections.aprovacao} onOpenChange={() => toggleSection('aprovacao')}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-[hsl(220,15%,20%)] px-4 py-3 text-sm font-semibold hover:bg-[hsl(220,18%,18%)] transition-colors bg-[hsl(220,20%,13%)] shadow-lg">
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-green" /> Avaliação / Aprovação — Comparativo</span>
            {openSections.aprovacao ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-[hsl(220,15%,20%)] p-4 space-y-4 bg-[hsl(220,20%,13%)] shadow-lg">
              <div className="text-xs text-muted-foreground">Ratinho Junior — Evolução da avaliação da administração estadual</div>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={aprovacao.rows.map(r => ({ wave: r.wave, ...r.values }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" />
                  <XAxis dataKey="wave" tick={{ fontSize: 11, fill: '#8899aa' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8899aa' }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 16%)', border: '1px solid hsl(220, 15%, 25%)', borderRadius: 10, fontSize: 12, color: '#fff' }} formatter={(v: any) => [`${v}%`]} />
                  <Legend />
                  <Line type="monotone" dataKey="Aprova" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Desaprova" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>

              <div className="border-t border-[hsl(220,15%,20%)] pt-4">
                <div className="text-xs font-semibold text-muted-foreground mb-3">Avaliação Detalhada</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={aprovacao.rows.map(r => ({ wave: r.wave, ...r.values }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" />
                    <XAxis dataKey="wave" tick={{ fontSize: 11, fill: '#8899aa' }} />
                    <YAxis domain={[0, 50]} tick={{ fontSize: 11, fill: '#8899aa' }} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 16%)', border: '1px solid hsl(220, 15%, 25%)', borderRadius: 10, fontSize: 12, color: '#fff' }} formatter={(v: any) => [`${v}%`]} />
                    <Legend />
                    <Line type="monotone" dataKey="Ótima" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Boa" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Regular" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2.5 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Ruim" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2.5 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Péssima" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2.5 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {questions.length === 0 && (
        <div className="rounded-xl border border-[hsl(220,15%,20%)] p-8 flex flex-col items-center gap-3 text-center bg-[hsl(220,20%,13%)] shadow-lg">
          <Search className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground">Nenhuma pergunta encontrada para este cargo nesta pesquisa.</div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cruzar ─────────────────────────────────────────────
interface CruzarProps {
  waves: PollWave[];
  questions: PollQuestion[];
}

const EXCLUDED_CANDIDATES = ['Não sabe/ Não opinou', 'Nenhum/ Branco/ Nulo', 'Ninguém/ Branco/ Nulo', 'Poderia votar em todos'];

function TabCruzar({ waves, questions: allQuestions }: CruzarProps) {
  const { candidates: masterCandidates } = useCandidate();
  const [selectedWaves, setSelectedWaves] = useState<string[]>([waves[0]?.id ?? '']);
  const [metricType, setMetricType] = useState<'estimulada' | 'rejeicao'>('estimulada');
  const [targetCargo, setTargetCargo] = useState<Cargo>('governador');
  const [targetCandidateId, setTargetCandidateId] = useState<string>('');
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [activeScenarioByWave, setActiveScenarioByWave] = useState<Record<string, string>>({});

  const toggleWave = (id: string) => {
    setSelectedWaves(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };

  // Master list: candidatos ativos cujo cargo bate com o cargo selecionado
  const masterForCargo = useMemo(() => {
    return masterCandidates
      .filter(c => c.is_active)
      .filter(c => cargoToSurveyKey(c.cargo) === targetCargo);
  }, [masterCandidates, targetCargo]);

  // Auto-init / mantém cenário ativo por wave
  useEffect(() => {
    setActiveScenarioByWave(prev => {
      const next: Record<string, string> = {};
      selectedWaves.forEach(waveId => {
        const candidates = allQuestions.filter(
          q => q.waveId === waveId && q.cargo === targetCargo && q.questionType === metricType,
        );
        if (candidates.length === 0) return;
        const current = prev[waveId];
        if (current && candidates.some(q => q.id === current)) {
          next[waveId] = current;
        } else {
          const main = candidates.find(q => q.isMainScenario) ?? candidates[0];
          next[waveId] = main.id;
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWaves, targetCargo, metricType, allQuestions]);

  // Filtered survey questions: respeita cenário ativo por wave (fallback: 1º)
  const filteredQuestions = useMemo(() =>
    allQuestions.filter(q => {
      if (!selectedWaves.includes(q.waveId)) return false;
      if (q.cargo !== targetCargo) return false;
      if (q.questionType !== metricType) return false;
      const active = activeScenarioByWave[q.waveId];
      if (active) return q.id === active;
      // Fallback: aceita apenas o primeiro da wave
      const first = allQuestions.find(
        x => x.waveId === q.waveId && x.cargo === targetCargo && x.questionType === metricType,
      );
      return first?.id === q.id;
    }),
    [allQuestions, selectedWaves, targetCargo, metricType, activeScenarioByWave],
  );

  // Presença por candidato mestre: nº de pesquisas (waves) em que aparece
  const presenceByCandidate = useMemo(() => {
    const m = new Map<string, number>();
    masterForCargo.forEach(c => {
      const wavesWith = new Set<string>();
      filteredQuestions.forEach(q => {
        if (q.results.some(r => !EXCLUDED_CANDIDATES.includes(r.candidate) && matchesCandidate(r.candidate, c))) {
          wavesWith.add(q.waveId);
        }
      });
      m.set(c.id, wavesWith.size);
    });
    return m;
  }, [masterForCargo, filteredQuestions]);

  const totalWaves = selectedWaves.length;

  // Auto-select principal: primeiro mestre presente
  useEffect(() => {
    if (targetCandidateId && masterForCargo.some(c => c.id === targetCandidateId)) return;
    const firstPresent = masterForCargo.find(c => (presenceByCandidate.get(c.id) ?? 0) > 0);
    setTargetCandidateId(firstPresent?.id ?? masterForCargo[0]?.id ?? '');
  }, [masterForCargo, presenceByCandidate, targetCandidateId]);

  // Auto-marcar comparações: todos os outros candidatos mestre presentes em ≥1 pesquisa
  useEffect(() => {
    const auto = masterForCargo
      .filter(c => c.id !== targetCandidateId && (presenceByCandidate.get(c.id) ?? 0) > 0)
      .map(c => c.id)
      .slice(0, 6);
    setComparisonIds(prev => {
      // Mantém manual: se o usuário desmarcou algo, não força de volta. Só preenche se vazio.
      if (prev.length === 0) return auto;
      // Remove inválidos (principal mudou, perdeu presença, etc.)
      return prev.filter(id => id !== targetCandidateId && masterForCargo.some(c => c.id === id) && (presenceByCandidate.get(id) ?? 0) > 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCandidateId, masterForCargo, presenceByCandidate]);

  const targetCandidate = masterForCargo.find(c => c.id === targetCandidateId) ?? null;
  const allSelected = useMemo(() => {
    if (!targetCandidate) return [] as Candidate[];
    const comps = comparisonIds
      .map(id => masterForCargo.find(c => c.id === id))
      .filter((c): c is Candidate => !!c);
    return [targetCandidate, ...comps];
  }, [targetCandidate, comparisonIds, masterForCargo]);

  // Chart data: 1 row por question, 1 chave por candidato mestre
  const chartData = useMemo(() => {
    return filteredQuestions
      .map(q => {
        const wave = waves.find(w => w.id === q.waveId);
        const row: Record<string, any> = { label: `${wave?.releaseDate ?? q.waveId} — ${q.scenarioLabel}` };
        let hasAny = false;
        allSelected.forEach(master => {
          const result = q.results.find(r => !EXCLUDED_CANDIDATES.includes(r.candidate) && matchesCandidate(r.candidate, master));
          if (result) {
            row[master.id] = result.percentage;
            hasAny = true;
          }
        });
        return hasAny ? row : null;
      })
      .filter((r): r is Record<string, any> => r !== null);
  }, [filteredQuestions, waves, allSelected]);

  const toggleComparison = (id: string) => {
    setComparisonIds(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : prev.length < 6 ? [...prev, id] : prev,
    );
  };

  const colorFor = (c: Candidate) => lookupCandidateColor(c.name, 'hsl(var(--muted-foreground))');

  return (
    <div className="space-y-4">
      {/* Config panel */}
      <div className="rounded-xl border border-[hsl(220,15%,20%)] p-4 space-y-4 bg-[hsl(220,20%,13%)] shadow-lg">
        <div className="text-sm font-semibold flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-[#0FFCBE]" /> Configurar Cruzamento
        </div>

        {/* Wave selector */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">Pesquisas (máx. 4):</div>
          <div className="flex flex-wrap gap-2">
            {waves.map(w => (
              <button
                key={w.id}
                onClick={() => toggleWave(w.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedWaves.includes(w.id)
                    ? 'bg-primary text-[#0FFCBE]-foreground border-primary'
                    : 'border-[hsl(220,15%,20%)] text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
                }`}
              >
                {w.institute} · {w.releaseDate}
              </button>
            ))}
          </div>
        </div>

        {/* Cargo + Métrica */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Cargo:</div>
            <div className="flex rounded-lg border border-[hsl(220,15%,20%)] overflow-hidden text-sm">
              {(['governador', 'senador'] as Cargo[]).map(c => (
                <button
                  key={c}
                  onClick={() => setTargetCargo(c)}
                  className={`flex-1 py-1.5 capitalize font-medium transition-colors text-xs ${
                    targetCargo === c ? 'bg-primary text-[#0FFCBE]-foreground' : 'bg-background text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Métrica:</div>
            <div className="flex rounded-lg border border-[hsl(220,15%,20%)] overflow-hidden text-xs">
              {[{ v: 'estimulada', l: 'Estimulada' }, { v: 'rejeicao', l: 'Rejeição' }].map(m => (
                <button
                  key={m.v}
                  onClick={() => setMetricType(m.v as any)}
                  className={`flex-1 py-1.5 font-medium transition-colors ${
                    metricType === m.v ? 'bg-primary text-[#0FFCBE]-foreground' : 'bg-background text-muted-foreground hover:bg-[hsl(220,18%,18%)]'
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Principal + Comparações */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Candidato principal:</div>
            <Select value={targetCandidateId} onValueChange={v => { setTargetCandidateId(v); setComparisonIds(prev => prev.filter(id => id !== v)); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {masterForCargo.map(c => {
                  const n = presenceByCandidate.get(c.id) ?? 0;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} <span className="text-muted-foreground">· {n}/{totalWaves}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {masterForCargo.length === 0 && (
              <div className="text-[11px] text-muted-foreground mt-2 italic">
                Nenhum candidato ativo para "{targetCargo}". Cadastre em Configurações → Candidatos.
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">
              Candidatos para cruzar <span className="text-[10px]">(máx. 6)</span>:
            </div>
            {masterForCargo.filter(c => c.id !== targetCandidateId).length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Nenhum outro candidato cadastrado.</div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {masterForCargo.filter(c => c.id !== targetCandidateId).map(c => {
                  const checked = comparisonIds.includes(c.id);
                  const presence = presenceByCandidate.get(c.id) ?? 0;
                  const absent = presence === 0;
                  return (
                    <div key={c.id} className="flex items-center gap-2 group">
                      <Checkbox
                        id={`cmp-${c.id}`}
                        checked={checked}
                        disabled={absent}
                        onCheckedChange={() => !absent && toggleComparison(c.id)}
                      />
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorFor(c), opacity: absent ? 0.35 : 1 }} />
                      <label
                        htmlFor={`cmp-${c.id}`}
                        className={`text-xs cursor-pointer transition-colors select-none flex-1 ${
                          absent ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      >
                        {c.name}
                      </label>
                      <span className={`text-[10px] font-mono ${absent ? 'text-muted-foreground/40' : presence === totalWaves ? 'text-[#0FFCBE]' : 'text-amber-400'}`}>
                        {presence}/{totalWaves}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground mt-2 leading-snug">
              Mostra todos os candidatos cadastrados. O contador "X/N" indica em quantas das pesquisas selecionadas o candidato aparece. Quem não aparece em nenhuma fica desabilitado.
            </div>
          </div>
        </div>
      </div>


      {/* Chart + table */}
      {chartData.length > 0 ? (
        <div className="rounded-xl border border-[hsl(220,15%,20%)] p-4 bg-[hsl(220,20%,13%)] shadow-lg">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
            {allSelected.map((c, i) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: i === 0 ? 12 : 8,
                    height: i === 0 ? 12 : 8,
                    backgroundColor: colorFor(c),
                    opacity: i === 0 ? 1 : 0.75,
                  }}
                />
                <span className={`text-xs ${i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{c.name}</span>
                {i === 0 && (
                  <span className="text-[10px] text-muted-foreground">· {metricType === 'estimulada' ? 'Estimulada' : 'Rejeição'} · {targetCargo}</span>
                )}
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={chartData} margin={{ left: 0, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#8899aa' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={52}
              />
              <YAxis
                domain={[0, 60]}
                tick={{ fontSize: 11, fill: '#8899aa' }}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220, 18%, 16%)', border: '1px solid hsl(220, 15%, 25%)', borderRadius: 10, fontSize: 12, color: '#fff' }}
                formatter={(v: any, _key: string, item: any) => {
                  const master = allSelected.find(c => c.id === item?.dataKey);
                  return [`${v}%`, master?.name ?? _key];
                }}
              />
              {allSelected.map((c, i) => (
                <Line
                  key={c.id}
                  type="monotone"
                  dataKey={c.id}
                  name={c.name}
                  stroke={colorFor(c)}
                  strokeWidth={i === 0 ? 3 : 2}
                  strokeDasharray={i === 0 ? undefined : '5 3'}
                  opacity={i === 0 ? 1 : 0.75}
                  dot={{ r: i === 0 ? 5 : 3, fill: colorFor(c) }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>


          {/* Variation table */}
          {chartData.length > 1 && (
            <div className="mt-4 border-t border-[hsl(220,15%,20%)] pt-4">
              <div className="text-xs font-semibold text-muted-foreground mb-3">Variação entre cenários</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,20%)]">
                      <th className="py-1.5 px-2 text-left text-muted-foreground whitespace-nowrap">Onda / Cenário</th>
                      {allSelected.map(c => (
                        <th key={c.id} className="py-1.5 px-2 text-right text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: colorFor(c) }}
                            />
                            {c.name.split(' ')[0]}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-[hsl(220,15%,20%)] last:border-0">
                        <td className="py-1.5 px-2 text-muted-foreground">{row.label}</td>
                        {allSelected.map(c => {
                          const val: number | undefined = row[c.id];
                          const prev: number | undefined = i > 0 ? chartData[i - 1][c.id] : undefined;
                          const delta = val !== undefined && prev !== undefined ? val - prev : null;
                          return (
                            <td key={c.id} className="py-1.5 px-2 text-right">
                              {val !== undefined ? (
                                <span className="font-semibold">{val.toFixed(1)}%</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {delta !== null && (
                                <span className={`ml-1 text-[10px] font-bold ${delta > 0 ? 'text-brand-green' : delta < 0 ? 'text-brand-red' : 'text-muted-foreground'}`}>
                                  {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[hsl(220,15%,20%)] p-8 flex flex-col items-center gap-3 text-center bg-[hsl(220,20%,13%)] shadow-lg">
          <GitCompare className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground">Selecione ao menos uma pesquisa e um candidato com dados disponíveis para o cargo e métrica escolhidos.</div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function Pesquisas() {
  const { data: dbData, isLoading: surveysLoading } = useSurveys();
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();

  // Merge DB surveys with static seed data (static listed last)
  const dbWaves = dbData?.waves ?? [];
  const dbQuestions = dbData?.questions ?? [];

  // IDs from DB to avoid duplicating static seeds that were already imported
  const dbIds = new Set(dbWaves.map(w => w.id));
  const staticWavesFiltered = initialWaves.filter(w => !dbIds.has(w.id));
  const staticQuestionsFiltered = initialQuestions.filter(q => !dbIds.has(q.waveId));

  const waves = [...dbWaves, ...staticWavesFiltered];
  const questions = [...dbQuestions, ...staticQuestionsFiltered];

  const handleAdd = (wave: PollWave, newQuestions: PollQuestion[]) => {
    createSurvey.mutate({ wave, questions: newQuestions });
  };

  const handleUpdate = (surveyId: string, wave: PollWave, newQuestions: PollQuestion[]) => {
    updateSurvey.mutate({ surveyId, wave, questions: newQuestions });
  };

  const handleDelete = (waveId: string) => {
    // Only delete from DB if it's a DB record (UUID format)
    if (dbIds.has(waveId)) {
      deleteSurvey.mutate(waveId);
    }
    // Static seeds cannot be deleted (they are read-only display data)
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-[hsl(220,15%,20%)] flex items-center gap-3 flex-shrink-0">
        <BarChart2 className="w-5 h-5 text-[#0FFCBE]" />
        <div>
          <h1 className="text-base font-bold">Pesquisas Eleitorais</h1>
          <p className="text-xs text-muted-foreground">
            {surveysLoading ? 'Carregando…' : `${waves.length} pesquisa${waves.length !== 1 ? 's' : ''} registrada${waves.length !== 1 ? 's' : ''} · Paraná 2026`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="biblioteca" className="h-full flex flex-col">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="biblioteca" className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Biblioteca
              </TabsTrigger>
              <TabsTrigger value="analisar" className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Analisar
              </TabsTrigger>
              <TabsTrigger value="cruzar" className="flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5" />
                Cruzar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="biblioteca" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
            <TabBiblioteca waves={waves} questions={questions} onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete} dbIds={dbIds} />
          </TabsContent>
          <TabsContent value="analisar" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
            <TabAnalisar waves={waves} questions={questions} />
          </TabsContent>
          <TabsContent value="cruzar" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
            <TabCruzar waves={waves} questions={questions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
