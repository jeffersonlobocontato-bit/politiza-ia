// src/hooks/useEmendas.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import { normalizarStatus, type EmendaStatus, type EmendaTipo, type EmendaFaixa } from '@/lib/emendas';

const TABLE = 'emendas' as const;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Emenda {
  id: string;
  exercicio: number;
  tipo: EmendaTipo;
  numero_emenda: string | null;
  orgao_gestor: string | null;
  area_tematica: string | null;
  acao_orcamentaria: string | null;
  ente_federativo: string;
  unidade_beneficiaria: string | null;
  municipio: string | null;
  macroregion_id: string | null;
  finalidade: string | null;
  valor_total: number;
  valor_custeio: number;
  valor_investimento: number;
  valor_empenhado: number;
  valor_pago: number;
  instrumento_repasse: string | null;
  numero_empenho: string | null;
  data_empenho: string | null;
  numero_ordem_bancaria: string | null;
  data_pagamento: string | null;
  status_raw: string | null;
  status: EmendaStatus;
  faixa_valor: EmendaFaixa;
  lat: number | null;
  lng: number | null;
  observacoes_internas: string | null;
  candidate_id: string | null;
  created_at: string;
  updated_at: string;
}

export type EmendaInput = Omit<Emenda,
  'id' | 'faixa_valor' | 'candidate_id' | 'created_at' | 'updated_at'
>;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEmendas(filters?: {
  exercicio?: number;
  status?: EmendaStatus;
  area?: string;
  faixa?: EmendaFaixa;
  municipio?: string;
}) {
  const { activeCandidate } = useCandidate();
  const candidateId = activeCandidate?.id ?? null;

  return useQuery({
    queryKey: ['emendas', candidateId, filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from(TABLE)
        .select('*')
        .order('valor_total', { ascending: false });

      if (candidateId) q = q.eq('candidate_id', candidateId);
      if (filters?.exercicio) q = q.eq('exercicio', filters.exercicio);
      if (filters?.status)    q = q.eq('status', filters.status);
      if (filters?.area)      q = q.eq('area_tematica', filters.area);
      if (filters?.faixa)     q = q.eq('faixa_valor', filters.faixa);
      if (filters?.municipio) q = q.ilike('municipio', `%${filters.municipio}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Emenda[];
    },
    staleTime: 60_000,
  });
}

export function useEmendaById(id: string | null) {
  return useQuery({
    queryKey: ['emenda', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE).select('*').eq('id', id).single();
      if (error) throw error;
      return data as Emenda;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateEmenda() {
  const qc = useQueryClient();
  const { activeCandidate } = useCandidate();

  return useMutation({
    mutationFn: async (input: EmendaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({ ...input, candidate_id: activeCandidate?.id ?? null, created_by: user?.id })
        .select().single();
      if (error) throw error;
      return data as Emenda;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emendas'] }),
  });
}

export function useUpdateEmenda() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Emenda> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Emenda;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['emendas'] });
      qc.invalidateQueries({ queryKey: ['emenda', vars.id] });
    },
  });
}

export function useDeleteEmenda() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emendas'] }),
  });
}

// ─── Import de planilha ───────────────────────────────────────────────────────

function safeNum(v: any): number {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
  return isNaN(n) || !isFinite(n) ? 0 : Math.abs(n);
}

function safeStr(v: any): string | null {
  const s = String(v ?? '').trim();
  return s === '' || s === '*' ? null : s;
}

function normalizeTipo(raw: string): EmendaTipo {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('bancada'))  return 'bancada';
  if (t.includes('comissão') || t.includes('comissao')) return 'comissao';
  if (t.includes('pública') || t.includes('publica'))   return 'politicas_publicas';
  return 'individual';
}

function parseDate(v: any): string | null {
  if (!v) return null;
  // Excel serial date
  if (typeof v === 'number' && v > 40000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(v).trim();
  if (!s || s === '*') return null;
  // dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export interface ParsedEmendaRow {
  payload: Partial<EmendaInput>;
  raw: Record<string, any>;
  errors: string[];
}

export function parseEmendaSheet(sheet: XLSX.WorkSheet): ParsedEmendaRow[] {
  // Header começa na linha 5 (índice 4), dado a estrutura da planilha
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    range: 4,
    defval: '',
    raw: false,
  });

  return json
    .filter(row => {
      const ex = row['Exercício'] ?? row['ExercÃ­cio'];
      return ex && !isNaN(parseInt(String(ex)));
    })
    .map(row => {
      const errors: string[] = [];
      const g = (keys: string[]): string => {
        for (const k of keys) {
          const v = safeStr(row[k]);
          if (v) return v;
        }
        return '';
      };

      const ente = g(['Ente Federativo']);
      if (!ente) errors.push('Ente federativo obrigatório');

      const valorTotal = safeNum(row['Valor Total Destinado']);

      const statusRaw = g(['Status da Execução', 'Status da ExecuÃ§Ã£o']);

      return {
        raw: row,
        errors,
        payload: {
          exercicio:           parseInt(String(row['Exercício'] ?? row['ExercÃ­cio'])) || new Date().getFullYear(),
          tipo:                normalizeTipo(g(['Tipo de emenda'])),
          numero_emenda:       safeStr(row['Nº da Emenda']) ?? safeStr(row['N\u00ba da Emenda']),
          orgao_gestor:        safeStr(row['Órgão Gestor']) ?? safeStr(row['\u00d3rg\u00e3o Gestor']),
          area_tematica:       safeStr(row['Área Temático']) ?? safeStr(row['\u00c1rea Tem\u00e1tico']),
          acao_orcamentaria:   safeStr(row['Ação Orçamentária']) ?? safeStr(row['A\u00e7\u00e3o Or\u00e7ament\u00e1ria']),
          ente_federativo:     ente,
          unidade_beneficiaria:safeStr(row['Unidade Beneficiária']) ?? safeStr(row['Unidade Benefici\u00e1ria']),
          municipio:           ente.split(' ')[0] || null,  // primeiro token como município base
          finalidade:          safeStr(row['Finalidade/Objeto']),
          valor_total:         valorTotal,
          valor_custeio:       safeNum(row['Despesa em custeio']),
          valor_investimento:  safeNum(row['Despesa em Investimento']),
          valor_empenhado:     safeNum(row['Valor Empenhado']),
          valor_pago:          safeNum(row['Valor Pago']),
          instrumento_repasse: safeStr(row['Instrumento de Repasse']),
          numero_empenho:      safeStr(row['Nº do Empenho']) ?? safeStr(row['N\u00ba do Empenho']),
          data_empenho:        parseDate(row['Data de Empenho']),
          numero_ordem_bancaria: safeStr(row['Nº da Ordem Bancária']) ?? safeStr(row['N\u00ba da Ordem Banc\u00e1ria']),
          data_pagamento:      parseDate(row['Data do Pagamento']),
          status_raw:          statusRaw || null,
          status:              normalizarStatus(statusRaw) as EmendaStatus,
          lat:                 null,
          lng:                 null,
          observacoes_internas: null,
        } satisfies Partial<EmendaInput>,
      };
    });
}

export function useImportEmendas() {
  const qc = useQueryClient();
  const { activeCandidate } = useCandidate();

  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      // Processar as 3 abas da planilha do Senador Moro
      const sheetNames = wb.SheetNames;
      const allRows: ParsedEmendaRow[] = [];

      for (const name of sheetNames) {
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        const rows = parseEmendaSheet(sheet);
        allRows.push(...rows);
      }

      const valid = allRows.filter(r => r.errors.length === 0 && (r.payload.valor_total ?? 0) > 0);
      const invalid = allRows.length - valid.length;

      if (valid.length === 0) throw new Error('Nenhuma linha válida encontrada na planilha.');

      // Buscar coordenadas dos municípios existentes no banco
      const municipios = [...new Set(valid.map(r => r.payload.municipio).filter(Boolean))];
      const { data: muns } = await (supabase as any)
        .from('municipalities')
        .select('name, lat, lng, macroregion_id')
        .in('name', municipios);

      const munMap = new Map<string, { lat: number; lng: number; macroregion_id: string }>();
      (muns ?? []).forEach((m: any) => munMap.set(m.name, m));

      const payloads = valid.map(r => {
        const geo = r.payload.municipio ? munMap.get(r.payload.municipio) : null;
        return {
          ...r.payload,
          lat:           geo?.lat ?? null,
          lng:           geo?.lng ?? null,
          macroregion_id: r.payload.macroregion_id ?? geo?.macroregion_id ?? null,
          candidate_id:  activeCandidate?.id ?? null,
          created_by:    user?.id ?? null,
        };
      });

      // Insert em lotes de 200
      let inserted = 0;
      const CHUNK = 200;
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const { error } = await (supabase as any).from(TABLE).insert(payloads.slice(i, i + CHUNK));
        if (error) throw error;
        inserted += Math.min(CHUNK, payloads.length - i);
      }

      return { inserted, invalid, total: allRows.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emendas'] }),
  });
}
