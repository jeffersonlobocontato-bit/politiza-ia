import { useMemo } from 'react';

interface Props {
  html: string;
  className?: string;
  height?: number | string;
}

/**
 * Renderiza o HTML salvo do relatório RAIO-X dentro de um iframe sandboxed,
 * garantindo que estilos e scripts do relatório não vazem para o app.
 */
export function RaioXReportViewer({ html, className, height = 620 }: Props) {
  const srcDoc = useMemo(() => {
    // Se o conteúdo já é um documento HTML completo, usa como está.
    if (/<html[\s>]/i.test(html)) return html;
    // Caso contrário, envolve com um shell mínimo escuro (mesma paleta do painel RAIO-X)
    return `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{margin:0;padding:16px;background:#05070f;color:#eef0ff;
        font-family:'Inter',system-ui,sans-serif;font-size:13px;line-height:1.55}
      h1,h2,h3,h4{color:#00e8a2;font-family:'Space Grotesk',sans-serif;margin:14px 0 8px}
      a{color:#3d9fff}
      strong{color:#fff}
      code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px}
      hr{border:0;border-top:1px solid rgba(255,255,255,.08);margin:16px 0}
      table{border-collapse:collapse;width:100%;margin:8px 0}
      td,th{border:1px solid rgba(255,255,255,.08);padding:6px 8px;text-align:left}
      ul,ol{padding-left:20px}
    </style></head><body>${html}</body></html>`;
  }, [html]);

  return (
    <iframe
      title="Relatório RAIO-X"
      className={className}
      style={{ width: '100%', height, border: '1px solid hsl(var(--border))', borderRadius: 10, background: '#05070f' }}
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
    />
  );
}
