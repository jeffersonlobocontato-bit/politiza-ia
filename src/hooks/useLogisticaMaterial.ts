import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, fetchAllRows } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ---------- Tipos ----------

export interface MacroRegion {
  id: string;
  name: string;
  coordinator: string | null;
  municipalities_count: number | null;
}

export interface DomicilioMunicipio {
  codigo_ibge: string;
  municipio: string;
  macroregion_id: string | null;
  populacao_estimada: number | null;
  domicilios_estimado: number | null;
  eleitores_estimado: number | null;
  fonte: string;
  updated_at: string;
}

export interface LogisticaResponsavel {
  id: string;
  nome: string;
  telefone: string | null;
  tag_tipo: 'cidade' | 'regiao';
  municipio: string | null;
  macroregion_id: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface LogisticaEnvio {
  id: string;
  municipio: string;
  codigo_ibge: string | null;
  macroregion_id: string | null;
  tipo_material: string;
  quantidade: number;
  responsavel_id: string | null;
  data_envio: string;
  observacoes: string | null;
  rota: number | null;
  ordem_rota: number | null;
  grupo_entrega_id: string;
  tipo_movimentacao: 'entrega' | 'retirada';
  recibo_numero: string | null;
  responsavel_entrega: string | null;
  created_at: string;
}

export interface LogisticaItemCampanha {
  id: string;
  nome: string;
  descricao: string | null;
  unidade: string;
  ativo: boolean;
  created_at: string;
}

// ---------- Macrorregiões ----------

export function useMacroRegions() {
  return useQuery({
    queryKey: ['macro-regions'],
    queryFn: async () => {
      const { data, error } = await (db as any)
        .from('macro_regions')
        .select('id, name, coordinator, municipalities_count')
        .order('name');
      if (error) throw error;
      return (data ?? []) as MacroRegion[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Levantamento de domicílios por município ----------

export function useDomiciliosMunicipios() {
  return useQuery({
    queryKey: ['logistica-domicilios'],
    queryFn: async () => {
      const rows = await fetchAllRows<DomicilioMunicipio>(() =>
        (db as any).from('logistica_domicilios_municipio').select('*').order('municipio')
      );
      return rows;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateDomicilios() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ codigo_ibge, domicilios_estimado }: { codigo_ibge: string; domicilios_estimado: number }) => {
      const { error } = await (db as any)
        .from('logistica_domicilios_municipio')
        .update({ domicilios_estimado, fonte: 'manual', updated_by: user?.id })
        .eq('codigo_ibge', codigo_ibge);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-domicilios'] });
      toast.success('Estimativa de domicílios atualizada.');
    },
    onError: (e: any) => toast.error(`Erro ao atualizar domicílios: ${e.message}`),
  });
}

export function useUpdateEleitores() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ codigo_ibge, eleitores_estimado }: { codigo_ibge: string; eleitores_estimado: number }) => {
      const { error } = await (db as any)
        .from('logistica_domicilios_municipio')
        .update({ eleitores_estimado, updated_by: user?.id })
        .eq('codigo_ibge', codigo_ibge);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-domicilios'] });
      toast.success('Número de eleitores atualizado.');
    },
    onError: (e: any) => toast.error(`Erro ao atualizar eleitores: ${e.message}`),
  });
}

// ---------- Responsáveis pela retirada/recebimento ----------

export function useSearchResponsaveis(term: string) {
  return useQuery({
    queryKey: ['logistica-responsaveis', term],
    queryFn: async () => {
      let query = (db as any)
        .from('logistica_responsaveis')
        .select('*')
        .eq('ativo', true)
        .order('nome')
        .limit(8);
      if (term.trim().length >= 2) {
        query = query.ilike('nome', `%${term.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as LogisticaResponsavel[];
    },
    enabled: term.trim().length >= 2,
  });
}

export function useAllResponsaveis() {
  return useQuery({
    queryKey: ['logistica-responsaveis-all'],
    queryFn: async () => {
      const rows = await fetchAllRows<LogisticaResponsavel>(() =>
        (db as any).from('logistica_responsaveis').select('*').eq('ativo', true).order('nome')
      );
      return rows;
    },
  });
}

export function useCreateResponsavel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      nome: string; telefone?: string | null;
      tag_tipo: 'cidade' | 'regiao'; municipio?: string | null; macroregion_id?: string | null;
      observacoes?: string | null;
    }) => {
      const { data, error } = await (db as any)
        .from('logistica_responsaveis')
        .insert({
          nome: payload.nome,
          telefone: payload.telefone || null,
          tag_tipo: payload.tag_tipo,
          municipio: payload.tag_tipo === 'cidade' ? (payload.municipio || null) : null,
          macroregion_id: payload.tag_tipo === 'regiao' ? (payload.macroregion_id || null) : null,
          observacoes: payload.observacoes || null,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LogisticaResponsavel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-responsaveis'] });
      qc.invalidateQueries({ queryKey: ['logistica-responsaveis-all'] });
      toast.success('Responsável cadastrado.');
    },
    onError: (e: any) => toast.error(`Erro ao cadastrar responsável: ${e.message}`),
  });
}

// ---------- Envios de material ----------

export function useEnviosMaterial() {
  return useQuery({
    queryKey: ['logistica-envios'],
    queryFn: async () => {
      const rows = await fetchAllRows<LogisticaEnvio>(() =>
        (db as any).from('logistica_envios_material').select('*').is('deleted_at', null).order('data_envio', { ascending: false })
      );
      return rows;
    },
  });
}

export function useCreateEnvio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      municipio: string; codigo_ibge?: string | null; macroregion_id?: string | null;
      itens: { tipo_material: string; quantidade: number; observacao?: string | null }[];
      responsavel_id?: string | null;
      data_envio: string; observacoes?: string | null;
      rota?: number | null; ordem_rota?: number | null;
      tipo_movimentacao?: 'entrega' | 'retirada';
      recibo_numero?: string | null; responsavel_entrega?: string | null;
    }) => {
      const grupoEntregaId = crypto.randomUUID();
      const rows = payload.itens
        .filter(item => item.quantidade > 0)
        .map(item => ({
          municipio: payload.municipio,
          codigo_ibge: payload.codigo_ibge || null,
          macroregion_id: payload.macroregion_id || null,
          tipo_material: item.tipo_material,
          quantidade: item.quantidade,
          responsavel_id: payload.responsavel_id || null,
          data_envio: payload.data_envio,
          observacoes: item.observacao || payload.observacoes || null,
          rota: payload.rota ?? null,
          ordem_rota: payload.ordem_rota ?? null,
          grupo_entrega_id: grupoEntregaId,
          tipo_movimentacao: payload.tipo_movimentacao ?? 'entrega',
          recibo_numero: payload.recibo_numero || null,
          responsavel_entrega: payload.responsavel_entrega || null,
          created_by: user?.id,
          updated_by: user?.id,
        }));
      if (rows.length === 0) throw new Error('Informe ao menos um item de material com quantidade.');
      const { error } = await (db as any).from('logistica_envios_material').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['logistica-envios'] });
      toast.success(variables.tipo_movimentacao === 'retirada' ? 'Retirada registrada.' : 'Entrega de material registrada.');
    },
    onError: (e: any) => toast.error(`Erro ao registrar: ${e.message}`),
  });
}

export function useDeleteEntregaGrupo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (grupoEntregaId: string) => {
      const { error } = await (db as any)
        .from('logistica_envios_material')
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq('grupo_entrega_id', grupoEntregaId)
        .is('deleted_at', null);
      if (error) throw error;
      // Confirma que a remoção passou pelas regras de acesso (update sem permissão não gera erro)
      const { data: restantes } = await (db as any)
        .from('logistica_envios_material')
        .select('id')
        .eq('grupo_entrega_id', grupoEntregaId)
        .is('deleted_at', null);
      if (restantes && restantes.length > 0) {
        throw new Error('Você não tem permissão para remover entregas.');
      }
    },


    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-envios'] });
      toast.success('Cidade removida da rota.');
    },
    onError: (e: any) => toast.error(`Erro ao remover: ${e.message}`),
  });
}

export function useUpdateEnvioQuantidade() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: { id: string; quantidade: number }[]) => {
      for (const u of updates) {
        if (u.quantidade <= 0) {
          const { error } = await (db as any)
            .from('logistica_envios_material')
            .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
            .eq('id', u.id);
          if (error) throw error;
        } else {
          const { error } = await (db as any)
            .from('logistica_envios_material')
            .update({ quantidade: u.quantidade, updated_by: user?.id })
            .eq('id', u.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-envios'] });
      toast.success('Entrega atualizada.');
    },
    onError: (e: any) => toast.error(`Erro ao atualizar entrega: ${e.message}`),
  });

export function useAddItensEntrega() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      base: LogisticaEnvio;
      itens: { tipo_material: string; quantidade: number }[];
    }) => {
      const rows = payload.itens
        .filter(i => i.tipo_material.trim() && i.quantidade > 0)
        .map(i => ({
          municipio: payload.base.municipio,
          codigo_ibge: payload.base.codigo_ibge,
          macroregion_id: payload.base.macroregion_id,
          tipo_material: i.tipo_material.trim(),
          quantidade: i.quantidade,
          responsavel_id: payload.base.responsavel_id,
          data_envio: payload.base.data_envio,
          rota: payload.base.rota,
          ordem_rota: payload.base.ordem_rota,
          grupo_entrega_id: payload.base.grupo_entrega_id,
          tipo_movimentacao: payload.base.tipo_movimentacao,
          recibo_numero: payload.base.recibo_numero,
          responsavel_entrega: payload.base.responsavel_entrega,
          created_by: user?.id,
          updated_by: user?.id,
        }));
      if (rows.length === 0) throw new Error('Informe o material e uma quantidade maior que zero.');
      const { error } = await (db as any).from('logistica_envios_material').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-envios'] });
      toast.success('Item adicionado à entrega.');
    },
    onError: (e: any) => toast.error(`Erro ao adicionar item: ${e.message}`),
  });
}


// ---------- Itens de campanha (portfólio de material) ----------

export function useItensCampanha() {
  return useQuery({
    queryKey: ['logistica-itens-campanha'],
    queryFn: async () => {
      const rows = await fetchAllRows<LogisticaItemCampanha>(() =>
        (db as any).from('logistica_itens_campanha').select('*').eq('ativo', true).order('nome')
      );
      return rows;
    },
  });
}

export function useCreateItemCampanha() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string | null; unidade?: string | null }) => {
      const { data, error } = await (db as any)
        .from('logistica_itens_campanha')
        .insert({
          nome: payload.nome.trim(),
          descricao: payload.descricao || null,
          unidade: payload.unidade?.trim() || 'unidade',
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LogisticaItemCampanha;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-itens-campanha'] });
      toast.success('Item de campanha cadastrado no portfólio.');
    },
    onError: (e: any) => toast.error(`Erro ao cadastrar item: ${e.message}`),
  });
}

// ---------- Estoque (entradas cumulativas) ----------

export interface LogisticaEstoqueEntrada {
  id: string;
  item_id: string | null;
  tipo_material: string;
  quantidade: number;
  data_entrada: string;
  fornecedor: string | null;
  observacoes: string | null;
  created_at: string;
}

export function useEstoqueEntradas() {
  return useQuery({
    queryKey: ['logistica-estoque-entradas'],
    queryFn: async () => {
      const rows = await fetchAllRows<LogisticaEstoqueEntrada>(() =>
        (db as any)
          .from('logistica_estoque_entradas')
          .select('*')
          .is('deleted_at', null)
          .order('data_entrada', { ascending: false })
      );
      return rows;
    },
  });
}

export function useCreateEstoqueEntrada() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      item_id?: string | null;
      tipo_material: string;
      quantidade: number;
      data_entrada: string;
      fornecedor?: string | null;
      observacoes?: string | null;
    }) => {
      const { error } = await (db as any).from('logistica_estoque_entradas').insert({
        item_id: payload.item_id || null,
        tipo_material: payload.tipo_material,
        quantidade: payload.quantidade,
        data_entrada: payload.data_entrada,
        fornecedor: payload.fornecedor || null,
        observacoes: payload.observacoes || null,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-estoque-entradas'] });
      toast.success('Entrada de estoque registrada.');
    },
    onError: (e: any) => toast.error(`Erro ao registrar entrada: ${e.message}`),
  });
}

export function useDeleteEstoqueEntrada() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (db as any)
        .from('logistica_estoque_entradas')
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistica-estoque-entradas'] });
      toast.success('Entrada removida do estoque.');
    },
    onError: (e: any) => toast.error(`Erro ao remover entrada: ${e.message}`),
  });
}

export interface SaldoEstoque {
  tipo_material: string;
  entrada: number;
  saida: number;
  saldo: number;
}

export function computeSaldoEstoque(
  entradas: LogisticaEstoqueEntrada[],
  envios: LogisticaEnvio[],
): SaldoEstoque[] {
  const map = new Map<string, SaldoEstoque>();
  const get = (mat: string) => {
    const key = mat.trim();
    if (!map.has(key)) map.set(key, { tipo_material: key, entrada: 0, saida: 0, saldo: 0 });
    return map.get(key)!;
  };
  for (const e of entradas) get(e.tipo_material).entrada += e.quantidade;
  for (const s of envios) {
    if (s.tipo_movimentacao === 'retirada') continue;
    get(s.tipo_material).saida += s.quantidade;
  }
  return Array.from(map.values())
    .map(r => ({ ...r, saldo: r.entrada - r.saida }))
    .sort((a, b) => a.tipo_material.localeCompare(b.tipo_material));
}


// ---------- Agregações para o dashboard ----------

export interface CoberturaMunicipio {
  codigo_ibge: string;
  municipio: string;
  macroregion_id: string | null;
  domicilios_estimado: number | null;
  eleitores_estimado: number | null;
  quantidade_enviada: number;
  cobertura_pct: number | null; // null quando não há estimativa de domicílios
}

export function computeCobertura(
  domicilios: DomicilioMunicipio[],
  envios: LogisticaEnvio[],
): CoberturaMunicipio[] {
  const enviadoPorMunicipio = new Map<string, number>();
  for (const e of envios) {
    const key = e.codigo_ibge || e.municipio;
    enviadoPorMunicipio.set(key, (enviadoPorMunicipio.get(key) ?? 0) + e.quantidade);
  }

  return domicilios.map(d => {
    const quantidade_enviada = enviadoPorMunicipio.get(d.codigo_ibge) ?? 0;
    const cobertura_pct = d.domicilios_estimado && d.domicilios_estimado > 0
      ? Math.min(100, Math.round((quantidade_enviada / d.domicilios_estimado) * 1000) / 10)
      : null;
    return {
      codigo_ibge: d.codigo_ibge,
      municipio: d.municipio,
      macroregion_id: d.macroregion_id,
      domicilios_estimado: d.domicilios_estimado,
      eleitores_estimado: d.eleitores_estimado,
      quantidade_enviada,
      cobertura_pct,
    };
  });
}

export interface RegiaoResumo {
  macroregion_id: string;
  nome: string;
  total_enviado: number;
  municipios_atendidos: number;
  municipios_total: number;
  cobertura_media_pct: number | null;
  eleitores_total: number;
}

export function computeResumoPorRegiao(
  cobertura: CoberturaMunicipio[],
  macroRegions: MacroRegion[],
): RegiaoResumo[] {
  return macroRegions.map(r => {
    const doRegiao = cobertura.filter(c => c.macroregion_id === r.id);
    const atendidos = doRegiao.filter(c => c.quantidade_enviada > 0);
    const comEstimativa = doRegiao.filter(c => c.cobertura_pct !== null);
    const cobertura_media_pct = comEstimativa.length > 0
      ? Math.round((comEstimativa.reduce((sum, c) => sum + (c.cobertura_pct ?? 0), 0) / comEstimativa.length) * 10) / 10
      : null;
    return {
      macroregion_id: r.id,
      nome: r.name,
      total_enviado: doRegiao.reduce((sum, c) => sum + c.quantidade_enviada, 0),
      municipios_atendidos: atendidos.length,
      municipios_total: doRegiao.length,
      cobertura_media_pct,
      eleitores_total: doRegiao.reduce((sum, c) => sum + (c.eleitores_estimado ?? 0), 0),
    };
  });
}
