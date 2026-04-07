import { useState, useMemo, useRef } from 'react';
import {
  BarChart2, Upload, BookOpen, Search, TrendingUp, GitCompare,
  X, ChevronDown, ChevronUp, Info, Plus, Trash2, FileText, Pencil,
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
  // per-cargo candidate data for one estimulada scenario
  govCandidates: CandidateEntry[];
  senCandidates: CandidateEntry[];
}

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
  govCandidates: [{ name: '', pct: '' }],
  senCandidates: [{ name: '', pct: '' }],
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

  const updateForm = (partial: Partial<ImportForm>) => setForm(f => ({ ...f, ...partial }));

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

  const addCandidate = (field: 'govCandidates' | 'senCandidates') =>
    updateForm({ [field]: [...form[field], { name: '', pct: '' }] });

  const removeCandidate = (field: 'govCandidates' | 'senCandidates', idx: number) =>
    updateForm({ [field]: form[field].filter((_, i) => i !== idx) });

  const updateCandidate = (field: 'govCandidates' | 'senCandidates', idx: number, key: 'name' | 'pct', value: string) => {
    const updated = [...form[field]];
    updated[idx] = { ...updated[idx], [key]: value };
    updateForm({ [field]: updated });
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

    if (form.cargos.includes('governador') && form.govCandidates.some(c => c.name && c.pct)) {
      newQuestions.push({
        id: `${waveId}-gov-est-1`,
        waveId,
        cargo: 'governador',
        questionType: 'estimulada',
        scenarioLabel: 'Cenário 1',
        results: form.govCandidates
          .filter(c => c.name)
          .map(c => ({ candidate: c.name, percentage: parseFloat(c.pct) || 0 }))
          .sort((a, b) => b.percentage - a.percentage),
        crossTabs: [],
      });
    }

    if (form.cargos.includes('senador') && form.senCandidates.some(c => c.name && c.pct)) {
      newQuestions.push({
        id: `${waveId}-sen-est-1`,
        waveId,
        cargo: 'senador',
        questionType: 'estimulada',
        scenarioLabel: 'Cenário 1',
        results: form.senCandidates
          .filter(c => c.name)
          .map(c => ({ candidate: c.name, percentage: parseFloat(c.pct) || 0 }))
          .sort((a, b) => b.percentage - a.percentage),
        crossTabs: [],
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
  };

  const handleEditWave = (wave: PollWave) => {
    const waveQuestions = allQuestions.filter(q => q.waveId === wave.id);
    const govQ = waveQuestions.find(q => q.cargo === 'governador' && q.questionType === 'estimulada');
    const senQ = waveQuestions.find(q => q.cargo === 'senador' && q.questionType === 'estimulada');

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
      govCandidates: govQ && govQ.results.length > 0
        ? govQ.results.map(r => ({ name: r.candidate, pct: String(r.percentage) }))
        : [{ name: '', pct: '' }],
      senCandidates: senQ && senQ.results.length > 0
        ? senQ.results.map(r => ({ name: r.candidate, pct: String(r.percentage) }))
        : [{ name: '', pct: '' }],
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
              Importar Pesquisa
              <Badge variant="outline" className="ml-auto text-[10px]">Passo {step} / 3</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1 mb-2">
            {[1, 2, 3].map(s => (
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
                Dados de intenção de voto — Cenário 1 (Estimulada)
              </div>
              <div className="text-xs text-muted-foreground -mt-3">
                Preencha candidatos e percentuais para visualização imediata. Você pode adicionar mais dados depois.
              </div>

              {form.cargos.includes('governador') && (
                <CandidatesBlock
                  title="Governador"
                  entries={form.govCandidates}
                  onAdd={() => addCandidate('govCandidates')}
                  onRemove={idx => removeCandidate('govCandidates', idx)}
                  onChange={(idx, key, val) => updateCandidate('govCandidates', idx, key, val)}
                />
              )}

              {form.cargos.includes('senador') && (
                <CandidatesBlock
                  title="Senador"
                  entries={form.senCandidates}
                  onAdd={() => addCandidate('senCandidates')}
                  onRemove={idx => removeCandidate('senCandidates', idx)}
                  onChange={(idx, key, val) => updateCandidate('senCandidates', idx, key, val)}
                />
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                Voltar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); setStep(1); }}>
              Cancelar
            </Button>
            {step < 3 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
                Próximo
              </Button>
            ) : (
              <Button size="sm" onClick={handleConfirm}>
                Confirmar importação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [selectedWaves, setSelectedWaves] = useState<string[]>([waves[0]?.id ?? '']);
  const [metricType, setMetricType] = useState<'estimulada' | 'rejeicao'>('estimulada');
  const [targetCargo, setTargetCargo] = useState<Cargo>('governador');
  const [targetCandidate, setTargetCandidate] = useState('Sergio Moro');
  const [comparisonCandidates, setComparisonCandidates] = useState<string[]>([]);

  const toggleWave = (id: string) => {
    setSelectedWaves(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };

  const availableCandidates = useMemo(() => {
    const set = new Set<string>();
    allQuestions
      .filter(q => selectedWaves.includes(q.waveId) && q.cargo === targetCargo && q.questionType === metricType)
      .forEach(q => q.results.forEach(r => {
        if (!EXCLUDED_CANDIDATES.includes(r.candidate)) set.add(r.candidate);
      }));
    return [...set];
  }, [allQuestions, selectedWaves, targetCargo, metricType]);

  // Reset comparison when available set changes
  useMemo(() => {
    setComparisonCandidates(prev => prev.filter(c => availableCandidates.includes(c) && c !== targetCandidate));
  }, [availableCandidates, targetCandidate]);

  const allSelectedCandidates = useMemo(
    () => [targetCandidate, ...comparisonCandidates],
    [targetCandidate, comparisonCandidates],
  );

  // Build chart data: one row per question point, keyed by candidate name
  const chartData = useMemo(() => {
    const rows: Record<string, any>[] = [];
    allQuestions
      .filter(q =>
        selectedWaves.includes(q.waveId) &&
        q.cargo === targetCargo &&
        q.questionType === metricType,
      )
      .forEach(q => {
        const wave = waves.find(w => w.id === q.waveId);
        const label = `${wave?.releaseDate ?? q.waveId} — ${q.scenarioLabel}`;
        const row: Record<string, any> = { label };
        let hasAny = false;
        allSelectedCandidates.forEach(candidate => {
          const result = q.results.find(r => r.candidate === candidate);
          if (result) {
            row[candidate] = result.percentage;
            hasAny = true;
          }
        });
        if (hasAny) rows.push(row);
      });
    return rows;
  }, [allQuestions, waves, selectedWaves, targetCargo, metricType, allSelectedCandidates]);

  const toggleComparison = (candidate: string) => {
    setComparisonCandidates(prev =>
      prev.includes(candidate)
        ? prev.filter(c => c !== candidate)
        : prev.length < 6 ? [...prev, candidate] : prev,
    );
  };

  const candidatesToCompare = availableCandidates.filter(c => c !== targetCandidate);

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

        {/* Candidato principal + candidatos para cruzar */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Candidato principal:</div>
            <Select
              value={targetCandidate}
              onValueChange={v => {
                setTargetCandidate(v);
                setComparisonCandidates(prev => prev.filter(c => c !== v));
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCandidates.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">
              Candidatos para cruzar <span className="text-[10px]">(máx. 6)</span>:
            </div>
            {candidatesToCompare.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Nenhum outro candidato disponível</div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {candidatesToCompare.map(c => {
                  const color = CANDIDATE_COLORS[c] ?? 'hsl(var(--muted-foreground))';
                  const checked = comparisonCandidates.includes(c);
                  return (
                    <div
                      key={c}
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => toggleComparison(c)}
                    >
                      <Checkbox
                        id={`cmp-${c}`}
                        checked={checked}
                        onCheckedChange={() => toggleComparison(c)}
                      />
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <label
                        htmlFor={`cmp-${c}`}
                        className="text-xs cursor-pointer group-hover:text-foreground text-muted-foreground transition-colors select-none"
                      >
                        {c}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart + table */}
      {chartData.length > 0 ? (
        <div className="rounded-xl border border-[hsl(220,15%,20%)] p-4 bg-[hsl(220,20%,13%)] shadow-lg">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
            {allSelectedCandidates.map((c, i) => (
              <div key={c} className="flex items-center gap-1.5">
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: i === 0 ? 12 : 8,
                    height: i === 0 ? 12 : 8,
                    backgroundColor: CANDIDATE_COLORS[c] ?? 'hsl(var(--primary))',
                    opacity: i === 0 ? 1 : 0.75,
                  }}
                />
                <span className={`text-xs ${i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{c}</span>
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
                formatter={(v: any, name: string) => [`${v}%`, name]}
              />
              {allSelectedCandidates.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={CANDIDATE_COLORS[c] ?? 'hsl(var(--primary))'}
                  strokeWidth={i === 0 ? 3 : 2}
                  strokeDasharray={i === 0 ? undefined : '5 3'}
                  opacity={i === 0 ? 1 : 0.75}
                  dot={{ r: i === 0 ? 5 : 3, fill: CANDIDATE_COLORS[c] ?? 'hsl(var(--primary))' }}
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
                      {allSelectedCandidates.map(c => (
                        <th key={c} className="py-1.5 px-2 text-right text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: CANDIDATE_COLORS[c] ?? 'hsl(var(--muted-foreground))' }}
                            />
                            {c.split(' ')[0]}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-[hsl(220,15%,20%)] last:border-0">
                        <td className="py-1.5 px-2 text-muted-foreground">{row.label}</td>
                        {allSelectedCandidates.map(c => {
                          const val: number | undefined = row[c];
                          const prev: number | undefined = i > 0 ? chartData[i - 1][c] : undefined;
                          const delta = val !== undefined && prev !== undefined ? val - prev : null;
                          return (
                            <td key={c} className="py-1.5 px-2 text-right">
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
            <TabBiblioteca waves={waves} onAdd={handleAdd} onDelete={handleDelete} />
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
