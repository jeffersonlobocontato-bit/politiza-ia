import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useCandidate } from '@/contexts/CandidateContext';
import type { DbPoliticalAsset, DbAssetType, DbAlignmentStatus, DbCampaignMember } from '@/types/database';

export type UnifiedAssetOrigin = 'nativo' | 'candidato' | 'coordenador';
export type UnifiedAssetType =
  | DbAssetType
  | 'candidato'
  | 'coord_geral'
  | 'coord_estadual'
  | 'coord_macro'
  | 'coord_micro'
  | 'coord_cidade';

export interface UnifiedAsset {
  id: string;
  origin: UnifiedAssetOrigin;
  source_id: string;
  name: string;
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
    queryKey: ['unified-political-assets', 'all-candidates-and-coords'],
    queryFn: async (): Promise<UnifiedAsset[]> => {
      const [assetsRes, candidatesRes, membersRes] = await Promise.all([
        db.from('political_assets').select('*').is('deleted_at', null).order('name'),
        db.from('candidates').select('*').order('name'),
        db.from('campaign_members').select('*').eq('status', 'ativo'),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;
      if (membersRes.error) throw membersRes.error;


      const nativos: UnifiedAsset[] = ((assetsRes.data ?? []) as DbPoliticalAsset[]).map(a => ({
        id: `nativo:${a.id}`,
        origin: 'nativo',
        source_id: a.id,
        name: a.name,
        type: a.type as UnifiedAssetType,
        position: a.position ?? null,
        municipality: a.municipality ?? null,
        macroregion_id: a.macroregion_id ?? null,
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
          origin: 'candidato',
          source_id: c.id,
          name: c.name,
          type: 'candidato',
          position: `${c.cargo ?? 'Candidato'}${c.party ? ` — ${c.party}` : ''}`,
          municipality: null,
          macroregion_id: null,
          influence_level: 10,
          alignment_status: 'alinhado',
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

      const coords: UnifiedAsset[] = ((membersRes.data ?? []) as DbCampaignMember[])
        .map(m => {
          const t = mapCoordRoleType(m.role);
          if (!t) return null;
          return {
            id: `coord:${m.id}`,
            origin: 'coordenador',
            source_id: m.id,
            name: m.name,
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

      return [...nativos, ...candidatos, ...coords];
    },
  });
}
