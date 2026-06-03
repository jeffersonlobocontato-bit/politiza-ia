import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, Send, Settings, Upload, Trash2, FileText, Loader2, Bot, User, X,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  selectedRoundId: string | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tracking-ai`;

export function TrackingAI({ selectedRoundId }: Props) {
  const { activeCandidate } = useCandidate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const candidateId = activeCandidate?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Agent config ---
  const configQuery = useQuery({
    queryKey: ['tracking-ai-config', candidateId],
    queryFn: async () => {
      if (!candidateId) return null;
      const { data } = await (supabase as any)
        .from('tracking_ai_config')
        .select('*')
        .eq('candidate_id', candidateId)
        .maybeSingle();
      return data;
    },
    enabled: !!candidateId,
  });

  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState('google/gemini-3-flash-preview');

  useEffect(() => {
    if (configQuery.data) {
      setInstructions(configQuery.data.system_instructions || '');
      setModel(configQuery.data.model || 'google/gemini-3-flash-preview');
    }
  }, [configQuery.data]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!candidateId) return;
      const payload = { candidate_id: candidateId, system_instructions: instructions, model };
      if (configQuery.data?.id) {
        await (supabase as any).from('tracking_ai_config').update({ system_instructions: instructions, model }).eq('id', configQuery.data.id);
      } else {
        await (supabase as any).from('tracking_ai_config').insert(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-ai-config'] });
      toast({ title: 'Configuração salva!' });
    },
  });

  // --- Knowledge files ---
  const knowledgeQuery = useQuery({
    queryKey: ['tracking-ai-knowledge', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data } = await (supabase as any)
        .from('tracking_ai_knowledge')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!candidateId,
  });

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !candidateId) return;
    setUploading(true);

    try {
      const filePath = `${candidateId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('tracking-knowledge').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Extract text for txt/md/csv files
      let contentText: string | null = null;
      if (/\.(txt|md|csv|json|xml)$/i.test(file.name)) {
        contentText = await file.text();
        if (contentText.length > 50000) contentText = contentText.slice(0, 50000);
      }

      await (supabase as any).from('tracking_ai_knowledge').insert({
        candidate_id: candidateId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_text: contentText,
        uploaded_by: user?.id,
      });

      qc.invalidateQueries({ queryKey: ['tracking-ai-knowledge'] });
      toast({ title: 'Arquivo enviado!', description: file.name });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deleteKnowledge = async (id: string, filePath: string) => {
    await supabase.storage.from('tracking-knowledge').remove([filePath]);
    await (supabase as any).from('tracking_ai_knowledge').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['tracking-ai-knowledge'] });
    toast({ title: 'Arquivo removido' });
  };

  // --- Chat messages from DB ---
  const savedMessagesQuery = useQuery({
    queryKey: ['tracking-ai-messages', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data } = await (supabase as any)
        .from('tracking_ai_messages')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: true })
        .limit(100);
      return (data || []).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    },
    enabled: !!candidateId,
  });

  useEffect(() => {
    if (savedMessagesQuery.data && messages.length === 0) {
      setMessages(savedMessagesQuery.data);
    }
  }, [savedMessagesQuery.data]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Streaming chat ---
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !candidateId) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsStreaming(true);

    let assistantSoFar = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: allMessages, candidateId, roundId: selectedRoundId }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save messages to DB
      await (supabase as any).from('tracking_ai_messages').insert([
        { candidate_id: candidateId, role: 'user', content: text, created_by: user?.id },
        { candidate_id: candidateId, role: 'assistant', content: assistantSoFar, created_by: user?.id },
      ]);
    } catch (e: any) {
      toast({ title: 'Erro na IA', description: e.message, variant: 'destructive' });
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, candidateId, messages, selectedRoundId, user?.id, toast]);

  const clearChat = async () => {
    if (!candidateId) return;
    await (supabase as any).from('tracking_ai_messages').delete().eq('candidate_id', candidateId);
    setMessages([]);
    toast({ title: 'Conversa limpa' });
  };

  const knowledgeFiles = knowledgeQuery.data || [];

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Agente de IA Estratégico</h3>
          <Badge variant="outline" className="text-[10px]">
            {knowledgeFiles.length} arquivo{knowledgeFiles.length !== 1 ? 's' : ''} na base
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearChat} className="text-xs gap-1">
              <Trash2 className="w-3 h-3" /> Limpar
            </Button>
          )}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Settings className="w-4 h-4" /> Configurar Agente
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[450px] sm:w-[500px]">
              <SheetHeader>
                <SheetTitle>Configuração do Agente IA</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                {/* Instructions */}
                <div>
                  <Label className="text-sm font-bold">Instrução do Sistema</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Defina o comportamento e personalidade do agente. Ele terá acesso automático aos dados de tracking e ações de campo.
                  </p>
                  <Textarea
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    rows={8}
                    placeholder="Você é um analista político estratégico..."
                    className="text-sm"
                  />
                </div>

                {/* Model */}
                <div>
                  <Label className="text-sm font-bold">Modelo</Label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="google/gemini-3-flash-preview">Gemini Flash (rápido)</option>
                    <option value="google/gemini-2.5-pro">Gemini Pro (preciso)</option>
                    <option value="openai/gpt-5-mini">GPT-5 Mini (balanceado)</option>
                    <option value="openai/gpt-5">GPT-5 (avançado)</option>
                  </select>
                </div>

                <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="w-full">
                  {saveConfig.isPending ? 'Salvando...' : 'Salvar Configuração'}
                </Button>

                {/* Knowledge base */}
                <div className="border-t border-border pt-4">
                  <Label className="text-sm font-bold">Base de Conhecimento</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Envie arquivos (.txt, .md, .csv, .json) para que o agente use como contexto nas respostas.
                  </p>

                  <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? 'Enviando...' : 'Clique para enviar arquivo'}
                    </span>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading}
                      accept=".txt,.md,.csv,.json,.xml,.pdf,.docx" />
                  </label>

                  {knowledgeFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {knowledgeFiles.map((f: any) => (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{f.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(f.file_size / 1024).toFixed(1)} KB
                              {f.content_text ? ' • Indexado' : ' • Não indexado'}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                            onClick={() => deleteKnowledge(f.id, f.file_path)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">Agente IA Estratégico</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Faça perguntas sobre o tracking, ações de campo, tendências eleitorais.
              O agente tem acesso aos dados reais da campanha.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 max-w-lg justify-center">
              {[
                'Quais cidades precisam de mais ações?',
                'Analise a evolução do tracking',
                'Onde investir para crescer?',
                'Compare resultados entre rodadas',
              ].map(q => (
                <Button key={q} variant="outline" size="sm" className="text-xs"
                  onClick={() => { setInput(q); }}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border pt-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Pergunte sobre o tracking, ações, territórios..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} size="icon">
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
