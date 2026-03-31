import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveRounds, useCreateInterview, useRoundInterviewCount } from '@/hooks/useTracking';
import { useRoundQuestions, QUESTION_PRESETS } from '@/hooks/useTrackingQuestions';
import { AGE_RANGES, GENDERS, INCOME_RANGES, EDUCATION_LEVELS, TRACKING_QUESTION_KEYS } from '@/types/tracking';
import { MapPin, CheckCircle, ClipboardList, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

export default function TrackingForm() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const roundFromUrl = searchParams.get('round');

  const { data: activeRounds = [], isLoading: loadingRounds } = useActiveRounds();
  const createInterview = useCreateInterview();

  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const { data: interviewCount = 0 } = useRoundInterviewCount(selectedRoundId || undefined);
  const { data: roundQuestions = [] } = useRoundQuestions(selectedRoundId || undefined);

  const [municipality, setMunicipality] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [income, setIncome] = useState('');
  const [education, setEducation] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const selectedRound = activeRounds.find(r => r.id === selectedRoundId);

  // Use dynamic questions if available, fallback to static presets
  const displayQuestions = roundQuestions.length > 0
    ? roundQuestions.map(q => ({ key: q.question_key, label: q.label, type: q.question_type, options: (q.options as string[] | null) || [] }))
    : TRACKING_QUESTION_KEYS.map(q => ({ key: q.key, label: q.label, type: 'text', options: [] as string[] }));

  useEffect(() => {
    if (activeRounds.length > 0 && !selectedRoundId) {
      if (roundFromUrl && activeRounds.some(r => r.id === roundFromUrl)) {
        setSelectedRoundId(roundFromUrl);
      } else {
        setSelectedRoundId(activeRounds[0].id);
      }
    }
  }, [activeRounds, selectedRoundId, roundFromUrl]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {}
    );
  }, []);

  const handleSubmit = async () => {
    if (!selectedRoundId || !user?.id) return;
    if (!municipality.trim()) {
      toast.error('Informe o município');
      return;
    }

    const candidateQuestionKeys = roundQuestions.length > 0
      ? roundQuestions.filter(q => q.question_type === 'candidate_name').map(q => q.question_key)
      : ['intencao_voto_espontanea', 'intencao_voto_estimulada', 'rejeicao', 'conhecimento'];

    const answersList = Object.entries(answers)
      .filter(([, v]) => v.trim())
      .map(([key, value]) => ({
        question_key: key,
        answer_value: value,
        candidate_name: candidateQuestionKeys.includes(key) ? value : null,
      }));

    await createInterview.mutateAsync({
      interview: {
        round_id: selectedRoundId,
        interviewer_id: user.id,
        municipality: municipality.trim(),
        microregion: null,
        macroregion_id: null,
        lat,
        lng,
        respondent_age_range: ageRange || null,
        respondent_gender: gender || null,
        respondent_income: income || null,
        respondent_education: education || null,
      },
      answers: answersList,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMunicipality('');
      setGender('');
      setAgeRange('');
      setIncome('');
      setEducation('');
      setAnswers({});
    }, 2000);
  };

  if (loadingRounds) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (activeRounds.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma rodada de tracking ativa no momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <p className="text-lg font-semibold">Entrevista registrada!</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Tracking de Campo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Round selector */}
          {activeRounds.length > 1 && (
            <div>
              <Label>Rodada</Label>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeRounds.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedRound && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{selectedRound.title}</span>
                <Badge variant="secondary">{interviewCount} / {selectedRound.target_interviews}</Badge>
              </div>
              {selectedRound.territory_scope !== 'estado' && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  Escopo: {selectedRound.territory_scope}
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div>
            <Label>Município *</Label>
            <div className="relative">
              <Input value={municipality} onChange={e => setMunicipality(e.target.value)} placeholder="Ex: Curitiba" />
              {lat && <MapPin className="absolute right-3 top-2.5 w-4 h-4 text-green-500" />}
            </div>
          </div>

          {/* Respondent profile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gênero</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Faixa Etária</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Renda</Label>
              <Select value={income} onValueChange={setIncome}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {INCOME_RANGES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escolaridade</Label>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions - dynamic */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Perguntas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayQuestions.map(q => (
            <div key={q.key}>
              <Label>{q.label}</Label>
              <Input
                value={answers[q.key] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                placeholder={`Resposta para ${q.label}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={createInterview.isPending}
        className="w-full"
        size="lg"
      >
        {createInterview.isPending ? 'Salvando...' : 'Registrar Entrevista'}
      </Button>
    </div>
  );
}
