import { useQuery } from '@tanstack/react-query';
import { db, fetchAllRows } from '@/lib/db';
import { municipalities as mockMunicipalities } from '@/data/mockData';
import { PR_CITY_TO_MACRO } from '@/data/prCityMacro';

import type { DbPoliticalAsset, DbAssetType, DbAlignmentStatus, DbCampaignMember } from '@/types/database';

const normalizeCity = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Mock-based fallback (cobre apenas ~22 cidades); o lookup principal usa PR_CITY_TO_MACRO (399 municípios IBGE).
const CITY_TO_MACRO: Record<string, string> = mockMunicipalities.reduce((acc, m) => {
  acc[normalizeCity(m.name)] = m.macroregion;
  acc[normalizeCity(m.id)] = m.macroregion;
  return acc;
}, {} as Record<string, string>);

function macroFromCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const key = normalizeCity(city);
  return PR_CITY_TO_MACRO[key] ?? CITY_TO_MACRO[key] ?? null;
}

export type UnifiedAssetOrigin = 'nativo' | 'candidato' | 'coordenador' | 'evento';
export type UnifiedAssetType =
  | DbAssetType
  | 'candidato'
  | 'coord_geral'
  | 'coord_estadual'
  | 'coord_macro'
  | 'coord_micro'
  | 'coord_cidade'
  | 'publico_eventos';


export interface UnifiedAsset {
  id: string;
  origin: UnifiedAssetOrigin;
  source_id: string;
  name: string;
  nickname: string | null;
  type: UnifiedAssetType;
  position: string | null;
  municipality: string | null;
  macroregion_id: string | null;
  influence_level: number;
  alignment_status: DbAlignmentStatus;
  support_status: string | null;
  phone: string | null;
  email: string | null;
  observations: string | null;
  lat: number | null;
  lng: number | null;
  readonly: boolean;
  source_route: string;
  source_label: string;
}

const COORD_ROLE_TO_TYPE: Record<string, UnifiedAssetType> = {
  coordenador_geral: 'coord_geral',
  coordenador_estadual: 'coord_estadual',
  coordenador_regional: 'coord_macro',
  coordenador_microrregional: 'coord_micro',
  coordenador_municipal: 'coord_cidade',
};

function mapCoordRoleType(role: string): UnifiedAssetType | null {
  const k = (role || '').toLowerCase().trim();
  if (COORD_ROLE_TO_TYPE[k]) return COORD_ROLE_TO_TYPE[k];
  if (!k.includes('coord')) return null;
  if (k.includes('geral')) return 'coord_geral';
  if (k.includes('estad')) return 'coord_estadual';
  if (k.includes('macro') || k.includes('region')) return 'coord_macro';
  if (k.includes('micro')) return 'coord_micro';
  if (k.includes('municip') || k.includes('cidade')) return 'coord_cidade';
  return 'coord_macro';
}

function influenceFromLevel(level: number | null | undefined): number {
  if (level == null) return 6;
  return Math.max(4, Math.min(10, 11 - level));
}

export function useUnifiedPoliticalAssets() {
  return useQuery({
    queryKey: ['unified-political-assets', 'all-candidates-coords-and-proporcional'],
    queryFn: async (): Promise<UnifiedAsset[]> => {
      // Paginação explícita: o PostgREST corta em 1000 linhas por padrão.
      // Sem isto, os contadores/etiquetas dos dashboards param de crescer ao bater 1000.
      const [assetsData, candidatesData, membersData, slateData, leadersData, inscricoesData, municipalitiesData] = await Promise.all([
        fetchAllRows<DbPoliticalAsset>(() => db.from('political_assets').select('*').is('deleted_at', null).order('name')),
        fetchAllRows<any>(() => db.from('candidates').select('*').order('name')),
        fetchAllRows<DbCampaignMember>(() => db.from('campaign_members').select('*').eq('status', 'ativo')),
        fetchAllRows<any>(() => (db as any).from('party_slate_candidates').select('*').is('deleted_at', null).order('name')),
        fetchAllRows<any>(() => (db as any).from('leaders').select('*').is('deleted_at', null).order('name')),
        // inscricoes: não bloqueia o restante se falhar (ex.: usuário sem permissão)
        fetchAllRows<any>(() => (db as any).from('inscricoes').select('id, nome, telefone, email, municipio, cargo_interesse, partido, observacoes, evento_id, created_at, status')).catch(() => [] as any[]),
        fetchAllRows<any>(() => (db as any).from('municipalities').select('id, name, mayor_name, phone').not('mayor_name', 'is', null)),
      ]);


      const assetsRes = { data: assetsData };
      const candidatesRes = { data: candidatesData };
      const membersRes = { data: membersData };
      const slateRes = { data: slateData };
      const leadersRes = { data: leadersData };
      const inscricoesRes = { data: inscricoesData };


      const nativos: UnifiedAsset[] = ((assetsRes.data ?? []) as DbPoliticalAsset[]).map(a => ({
        id: `nativo:${a.id}`,
        origin: 'nativo',
        source_id: a.id,
        name: a.name,
        nickname: a.nickname ?? null,
        type: a.type as UnifiedAssetType,
        position: a.position ?? null,
        municipality: a.municipality ?? null,
        macroregion_id: a.macroregion_id ?? macroFromCity(a.municipality),
        influence_level: a.influence_level ?? 5,
        alignment_status: a.alignment_status,
        support_status: a.support_status ?? null,
        phone: a.phone ?? null,
        email: a.email ?? null,
        observations: a.observations ?? null,
        lat: a.lat ?? null,
        lng: a.lng ?? null,
        readonly: false,
        source_route: '/ativos-politicos',
        source_label: 'Ativo Nativo',
      }));

      const candidatos: UnifiedAsset[] = (candidatesRes.data ?? [])
        .map((c: any) => ({
          id: `candidato:${c.id}`,
          origin: 'candidato' as UnifiedAssetOrigin,
          source_id: c.id,
          name: c.name,
          nickname: null,
          type: 'candidato' as UnifiedAssetType,
          position: `${c.cargo ?? 'Candidato'}${c.party ? ` — ${c.party}` : ''}`,
          municipality: null,
          macroregion_id: null,
          influence_level: 10,
          alignment_status: 'alinhado' as DbAlignmentStatus,
          support_status: 'Candidato da coligação',
          phone: null,
          email: null,
          observations: c.bio ?? null,
          lat: null,
          lng: null,
          readonly: true,
          source_route: '/candidatos',
          source_label: 'via Candidatos',
        }));

      // Dedup: se o registro da Proporcional já está vinculado a um candidato da base principal, pula
      const candidatoIds = new Set((candidatesRes.data ?? []).map((c: any) => c.id));

      const proporcionais: UnifiedAsset[] = ((slateRes.data ?? []) as any[])
        .filter(s => !(s.candidate_id && candidatoIds.has(s.candidate_id)))
        .map(s => ({
          id: `proporcional:${s.id}`,
          origin: 'candidato' as UnifiedAssetOrigin,
          source_id: s.id,
          name: s.name,
          nickname: null,
          type: 'candidato' as UnifiedAssetType,
          position: `${s.cargo ?? 'Candidato'}${s.party ? ` — ${s.party}` : ''}`,
          municipality: s.city ?? null,
          macroregion_id: macroFromCity(s.city),
          influence_level: 9,
          alignment_status: 'alinhado' as DbAlignmentStatus,
          support_status: s.general_status ?? s.filiacao_status ?? 'Pré-candidato (Proporcional)',
          phone: s.phone ?? null,
          email: null,
          observations: s.notes ?? null,
          lat: null,
          lng: null,
          readonly: true,
          source_route: '/proporcional',
          source_label: 'via Proporcional',
        }));

      const coords: UnifiedAsset[] = ((membersRes.data ?? []) as DbCampaignMember[])
        .map(m => {
          const t = mapCoordRoleType(m.role);
          if (!t) return null;
          return {
            id: `coord:${m.id}`,
            origin: 'coordenador',
            source_id: m.id,
            name: m.name,
            nickname: null,
            type: t,
            position: m.role,
            municipality: m.municipality ?? null,
            macroregion_id: m.macroregion_id ?? null,
            influence_level: influenceFromLevel(m.hierarchy_level),
            alignment_status: 'alinhado',
            support_status: 'Membro da campanha',
            phone: m.phone ?? null,
            email: m.email ?? null,
            observations: m.observations ?? null,
            lat: m.lat ?? null,
            lng: m.lng ?? null,
            readonly: true,
            source_route: '/campanha',
            source_label: 'via Campanha',
          } as UnifiedAsset;
        })
        .filter((x): x is UnifiedAsset => x !== null);

      const leaders: UnifiedAsset[] = ((leadersRes.data ?? []) as any[]).map(l => ({
        id: `lider:${l.id}`,
        origin: 'coordenador' as UnifiedAssetOrigin,
        source_id: l.id,
        name: l.name,
        nickname: null,
        type: 'lideranca_comunitaria' as UnifiedAssetType,
        position: l.current_party ? `Liderança — ${l.current_party}` : 'Liderança',
        municipality: l.municipality ?? null,
        macroregion_id: l.macroregion_id ?? macroFromCity(l.municipality),
        influence_level: l.influence_level ?? 6,
        alignment_status: (l.alignment_status as DbAlignmentStatus) ?? 'indefinido',
        support_status: l.support_status ?? 'Liderança de campo',
        phone: l.phone ?? null,
        email: l.email ?? null,
        observations: l.observations ?? null,
        lat: l.lat ?? null,
        lng: l.lng ?? null,
        readonly: true,
        source_route: `/campo/liderancas/${l.id}`,
        source_label: 'via Lideranças',
      }));

      const publicoEventos: UnifiedAsset[] = ((inscricoesRes?.data ?? []) as any[]).map(i => ({
        id: `evento-lead:${i.id}`,
        origin: 'evento' as UnifiedAssetOrigin,
        source_id: i.id,
        name: i.nome,
        nickname: null,
        type: 'publico_eventos' as UnifiedAssetType,
        position: i.cargo_interesse
          ? `${i.cargo_interesse}${i.partido ? ` — ${i.partido}` : ''}`
          : (i.partido ? `Filiado(a) ${i.partido}` : 'Público de evento'),
        municipality: i.municipio ?? null,
        macroregion_id: macroFromCity(i.municipio),
        influence_level: 4,
        alignment_status: 'provavel' as DbAlignmentStatus,
        support_status: 'Inscrito em evento',
        phone: i.telefone ?? null,
        email: i.email ?? null,
        observations: i.observacoes ?? null,
        lat: null,
        lng: null,
        readonly: true,
        source_route: '/eventos',
        source_label: 'PÚBLICO EVENTOS',
      }));

      // Prefeitos cadastrados na aba Municípios — dedupe por cidade
      // (cada município só pode ter um prefeito; se já existe um em political_assets, pula)
      const citiesWithPrefeito = new Set(
        nativos
          .filter(n => n.type === 'prefeito' && n.municipality)
          .map(n => normalizeCity(n.municipality))
      );
      const prefeitos: UnifiedAsset[] = ((municipalitiesData ?? []) as any[])
        .filter(m => m.mayor_name && String(m.mayor_name).trim().length > 0)
        .filter(m => !citiesWithPrefeito.has(normalizeCity(m.name)))

        .map(m => ({
          id: `prefeito-mun:${m.id}`,
          origin: 'coordenador' as UnifiedAssetOrigin,
          source_id: m.id,
          name: m.mayor_name,
          nickname: null,
          type: 'prefeito' as UnifiedAssetType,
          position: `Prefeito(a) de ${m.name}`,
          municipality: m.name ?? null,
          macroregion_id: macroFromCity(m.name),
          influence_level: 9,
          alignment_status: 'indefinido' as DbAlignmentStatus,
          support_status: 'Prefeito em exercício',
          phone: m.phone ?? null,
          email: null,
          observations: null,
          lat: null,
          lng: null,
          readonly: true,
          source_route: '/municipios',
          source_label: 'via Municípios',
        }));

      return [...nativos, ...candidatos, ...proporcionais, ...coords, ...leaders, ...publicoEventos, ...prefeitos];

    },
  });
}

