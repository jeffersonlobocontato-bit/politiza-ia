import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare } from 'lucide-react';
import { cruzamentoMoroData } from '@/data/cruzamentoMoro';

/**
 * Placeholder do componente de análise Quali-Quanti Moro.
 * Substitua pelo conteúdo real quando `CruzamentoQualiQuantiMoro.jsx`
 * for anexado — basta trocar este corpo mantendo o export default.
 */
export default function CruzamentoQualiQuantiMoro() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary" />
          Cruzamento Quali-Quanti — Moro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Este é o placeholder da análise. Anexe o arquivo original
          <code className="mx-1 px-1 py-0.5 rounded bg-muted">CruzamentoQualiQuantiMoro.jsx</code>
          e a base de dados
          <code className="mx-1 px-1 py-0.5 rounded bg-muted">src/data/cruzamentoMoro.ts</code>
          para exibir o conteúdo completo.
        </p>
        <div className="text-xs">
          Base carregada: {cruzamentoMoroData.segments.length} segmentos ·
          atualizada em {cruzamentoMoroData.updatedAt}.
        </div>
      </CardContent>
    </Card>
  );
}
