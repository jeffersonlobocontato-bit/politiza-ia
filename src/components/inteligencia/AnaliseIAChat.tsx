import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { cn } from '@/lib/utils';
import { SUGESTOES_MARKETING, ACOES_RAPIDAS } from './prompts';

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  context: unknown;
}

const SUGESTOES = SUGESTOES_MARKETING;

export default function AnaliseIAChat({ context }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load threads
  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_threads')
      .select('id,title,updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      // Likely RLS / not coordinator — silent
      return;
    }
    setThreads(data ?? []);
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages when thread changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMsgs(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, parts, created_at')
        .eq('thread_id', activeId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setMessages(
        (data ?? []).map((m) => {
          const parts = (Array.isArray(m.parts) ? m.parts : []) as Array<{ text?: string }>;
          return {
            id: m.id,
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
            text: parts.map((p) => p?.text ?? '').join(''),
          };
        }),
      );
      setLoadingMsgs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const newThread = () => {
    setActiveId(null);
    setMessages([]);
    setStreamingText('');
  };

  const deleteThread = async (id: string) => {
    if (!confirm('Excluir esta conversa?')) return;
    const { error } = await supabase.from('chat_threads').delete().eq('id', id);
    if (error) {
      toast.error('Não foi possível excluir');
      return;
    }
    if (activeId === id) newThread();
    loadThreads();
  };

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = { id: `tmp-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamingText('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/chat-inteligencia`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ threadId: activeId, message: text, context }),
          signal: ctrl.signal,
        },
      );

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let metaParsed = false;
      let newThreadId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        let chunk = decoder.decode(value, { stream: true });
        if (!metaParsed) {
          // Expect first chunk(s) to contain __META__{json}\n
          const idx = chunk.indexOf('\n');
          if (chunk.startsWith('__META__') && idx > 0) {
            const metaStr = chunk.slice(8, idx);
            try {
              const meta = JSON.parse(metaStr);
              newThreadId = meta.threadId;
            } catch {/* ignore */}
            chunk = chunk.slice(idx + 1);
            metaParsed = true;
          } else if (chunk.startsWith('__META__')) {
            // wait for more
            acc += chunk;
            continue;
          } else {
            metaParsed = true;
          }
        }
        if (chunk) {
          acc += chunk;
          setStreamingText(acc);
        }
      }

      // finalize: append assistant message
      setMessages((m) => [...m, { id: `tmp-a-${Date.now()}`, role: 'assistant', text: acc }]);
      setStreamingText('');

      if (newThreadId && newThreadId !== activeId) {
        setActiveId(newThreadId);
      }
      loadThreads();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro';
      toast.error(msg);
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[520px]">
      {/* Sidebar */}
      <Card className="p-3 flex flex-col gap-2 overflow-hidden">
        <Button size="sm" onClick={newThread} className="gap-2">
          <Plus className="w-4 h-4" /> Nova análise
        </Button>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 mt-2">
          Conversas
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {threads.length === 0 && (
              <div className="text-xs text-muted-foreground p-2">
                Nenhuma conversa ainda.
              </div>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted',
                  activeId === t.id && 'bg-muted',
                )}
                onClick={() => setActiveId(t.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{t.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThread(t.id);
                  }}
                  aria-label="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat */}
      <Card className="flex flex-col overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && !streaming && (
              <div className="max-w-2xl mx-auto py-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" /> Análise IA
                  </div>
                  <h2 className="text-2xl font-bold">Analista de Inteligência</h2>
                  <p className="text-sm text-muted-foreground">
                    Faça perguntas sobre o painel: tendências, cenários, comparativos entre institutos e ações estratégicas.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm p-3 rounded-md border hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingMsgs && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversa…
              </div>
            )}

            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
                </MessageContent>
              </Message>
            ))}

            {streaming && (
              <Message from="assistant">
                <MessageContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {streamingText || (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando…
                      </span>
                    )}
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t px-3 py-2 flex flex-wrap gap-1.5 bg-muted/30">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground self-center mr-1">
            Ações rápidas
          </span>
          {ACOES_RAPIDAS.map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={streaming}
              onClick={() => send(a.prompt)}
            >
              {a.label}
            </Button>
          ))}
        </div>

        <PromptInput
          onSubmit={(msg) => {
            const text = msg.text ?? input;
            send(text);
          }}
          className="mx-3 mb-[76px] rounded-lg border border-slate-300 bg-white shadow-sm"
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao analista — ex: compare Moro vs Requião por instituto…"
            disabled={streaming}
            className="min-h-[76px] bg-white text-slate-900 placeholder:text-slate-500 focus-visible:ring-0"
          />
          <PromptInputFooter className="bg-white border-t border-slate-200">
            <div className="text-[10px] text-slate-500">
              Respostas baseadas exclusivamente nos dados do painel.
            </div>
            <PromptInputSubmit
              status={streaming ? 'streaming' : undefined}
              disabled={!input.trim() || streaming}
            />
          </PromptInputFooter>
        </PromptInput>
      </Card>
    </div>
  );
}
