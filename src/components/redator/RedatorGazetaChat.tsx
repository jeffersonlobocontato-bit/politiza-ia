import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, User, Send, Loader2, Newspaper } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Emendas do Senador na região',
    prompt:
      'Escreva uma nota para imprensa sobre as emendas parlamentares destinadas às cidades do Paraná, cruzando os valores por município com a finalidade de cada emenda. Destaque os municípios com maior valor total.',
  },
  {
    label: 'Artigo de opinião persuasivo',
    prompt:
      'Escreva um artigo de opinião persuasivo, no padrão editorial da Gazeta do Povo, usando os dados de emendas e ações de campo como evidência central.',
  },
  {
    label: 'Post para redes sociais',
    prompt:
      'Transforme os dados de emendas do município filtrado em um post curto e persuasivo para redes sociais, com uma manchete forte.',
  },
  {
    label: 'Discurso',
    prompt:
      'Redija um discurso de 2 minutos cruzando os dados de emendas, ações de campo e o clima das pesquisas eleitorais da região.',
  },
];

export function RedatorGazetaChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const allMessages = [...messages, { role: 'user' as const, content }];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('redator-gazeta-chat', {
        body: { messages: allMessages, municipio: municipio.trim() || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text ?? '' }]);
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar conteúdo',
        description: err?.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1)); // remove a mensagem do usuário que falhou
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Newspaper className="w-4 h-4" />
            Filtro opcional de município (foca o cruzamento de emendas nessa cidade)
          </div>
          <Input
            placeholder="Ex.: Curitiba, Londrina, Maringá..."
            value={municipio}
            onChange={e => setMunicipio(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_PROMPTS.map(qp => (
              <Badge
                key={qp.label}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => send(qp.prompt)}
              >
                {qp.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardContent className="p-0">
          <ScrollArea className="h-[480px] p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-12">
                Escolha um atalho acima ou descreva o conteúdo que você quer gerar.
              </div>
            )}
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <Bot className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted prose prose-sm max-w-none dark:prose-invert'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === 'user' && <User className="w-5 h-5 mt-1 flex-shrink-0" />}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redigindo e cruzando dados da plataforma…
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Textarea
          placeholder="Descreva o conteúdo que quer gerar (formato, tom, foco)..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          className="min-h-[60px]"
        />
        <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
