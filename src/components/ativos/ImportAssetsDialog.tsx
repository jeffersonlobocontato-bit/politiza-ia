import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { macroRegions } from '@/data/mockData';
import type { DbAssetType, DbAlignmentStatus } from '@/types/database';

const VALID_TYPES: DbAssetType[] = [
  'prefeito','ex_prefeito','pretenso_prefeito','vereador','ex_vereador','pretenso_vereador',
  'lideranca_comunitaria','lideranca_empresarial','lideranca_religiosa',
  'presidente_entidade','influenciador_regional','coordenador_partidario',
];
const VALID_ALIGNMENTS: DbAlignmentStatus[] = ['alinhado','provavel','neutro','oposicao','indefinido'];
const VALID_MACRO_IDS = macroRegions.map(m => m.id);

const TEMPLATE_HEADERS = [
  'nome','tipo','municipio','macroregion_id','cargo','alinhamento',
  'influencia','status_apoio','telefone','email','responsavel','observacoes',
];

interface ParsedRow {
  raw: Record<string, any>;
  payload: any;
  errors: string[];
}

function normalize(v: any): string {
  return String(v ?? '').trim();
}

function parseRow(row: Record<string, any>): ParsedRow {
  const errors: string[] = [];
  const get = (k: string) => normalize(row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()]);

  const name = get('nome');
  if (!name) errors.push('nome obrigatório');

  const municipality = get('municipio') || get('município');
  if (!municipality) errors.push('municipio obrigatório');

  let type = get('tipo').toLowerCase().replace(/[\s-]/g, '_') as DbAssetType;
  if (!VALID_TYPES.includes(type)) type = 'lideranca_comunitaria';

  let alignment = get('alinhamento').toLowerCase() as DbAlignmentStatus;
  if (!VALID_ALIGNMENTS.includes(alignment)) alignment = 'neutro';

  let macro = get('macroregion_id').toLowerCase();
  if (!VALID_MACRO_IDS.includes(macro)) macro = 'rmc';

  const influence = parseInt(get('influencia') || get('influência') || '5');

  return {
    raw: row,
    errors,
    payload: {
      name,
      type,
      municipality: municipality || null,
      microregion: null,
      macroregion_id: macro,
      position: get('cargo') || null,
      influence_level: isNaN(influence) ? 5 : Math.max(1, Math.min(10, influence)),
      alignment_status: alignment,
      support_status: get('status_apoio') || null,
      phone: get('telefone') || null,
      email: get('email') || null,
      lat: null,
      lng: null,
      observations: get('observacoes') || get('observações') || null,
      relationship_owner: get('responsavel') || get('responsável') || null,
    },
  };
}

export function ImportAssetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    setRows(json.map(parseRow));
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ['João Silva','lideranca_comunitaria','Curitiba','rmc','Presidente Associação','alinhado',8,'Apoio confirmado','(41) 99999-0000','joao@email.com','Coordenador X','Notas estratégicas...'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ativos');
    XLSX.writeFile(wb, 'modelo-ativos-politicos.xlsx');
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const payloads = validRows.map(r => ({ ...r.payload, created_by: user?.id ?? null }));
      const chunkSize = 100;
      let inserted = 0;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { error } = await db.from('political_assets').insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }
      toast.success(`${inserted} ativo${inserted !== 1 ? 's' : ''} importado${inserted !== 1 ? 's' : ''} com sucesso!`);
      qc.invalidateQueries({ queryKey: ['political-assets'] });
      setRows([]);
      setFileName('');
      onClose();
    } catch (e: any) {
      toast.error(`Erro ao importar: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Importar Ativos via Excel</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Baixe o modelo, preencha com seus ativos e faça o upload. Aceita <strong>.xlsx</strong>, <strong>.xls</strong> e <strong>.csv</strong>.
            Colunas obrigatórias: <code className="text-foreground">nome</code> e <code className="text-foreground">municipio</code>.
          </p>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-accent text-foreground"
          >
            <Download className="w-3.5 h-3.5" /> Baixar modelo Excel
          </button>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/50 p-8 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {fileName || 'Clique para selecionar arquivo'}
          </span>
          <span className="text-xs text-muted-foreground">XLSX, XLS ou CSV</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        {rows.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-4 mb-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-green-500">
                <CheckCircle2 className="w-4 h-4" /> {validRows.length} válidos
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="w-4 h-4" /> {invalidCount} com erros
                </span>
              )}
            </div>
            <div className="rounded-lg border border-border max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Município</th>
                    <th className="px-3 py-2 font-medium">Alinhamento</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-foreground">{r.payload.name || '—'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.payload.type}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.payload.municipality || '—'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.payload.alignment_status}</td>
                      <td className="px-3 py-1.5">
                        {r.errors.length === 0
                          ? <span className="text-green-500">OK</span>
                          : <span className="text-destructive" title={r.errors.join(', ')}>{r.errors.join(', ')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <div className="px-3 py-2 text-[11px] text-muted-foreground text-center border-t border-border">
                  ... e mais {rows.length - 50} linhas
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {importing ? 'Importando...' : `Importar ${validRows.length} ativo${validRows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
