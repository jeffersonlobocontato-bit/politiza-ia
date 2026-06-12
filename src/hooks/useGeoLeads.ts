// Agrega TODOS os cadastros georreferenciáveis e resolve coordenadas via resolveGeo.
// Cada item retorna pronto para plotagem.

import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { resolveGeo, type GeoSource, type ResolvedPoint } from '@/lib/geo';

export interface GeoLead {
  id: string;
  source: GeoSource;
  name: string;
  subtitle: string; // papel, cargo, função
  municipality: string | null;
  point: ResolvedPoint;
  raw: any;
}

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const { data, error } = await (db as any).from(table).select(columns).limit(2000);
  if (error) throw error;
  return (data ?? []) as T[];
}

export function useGeoLeads(enabled: { [K in GeoSource]?: boolean } = {
  leaders: true, assets: true, members: true, actions: true, interviews: false, alerts: false, candidates: true,
}) {
  return useQuery<GeoLead[]>({
    queryKey: ['geo-leads', enabled],
    queryFn: async () => {
      const out: GeoLead[] = [];
      const tasks: Promise<void>[] = [];

      if (enabled.leaders) {
        tasks.push(
          fetchAll<any>('leaders', 'id,name,municipality,neighborhood,microregion,macroregion_id,lat,lng,current_party,alignment_status,influence_level').then(rows => {
            for (const r of rows) {
              if (r.deleted_at) continue;
              const point = resolveGeo(r);
              if (!point) continue;
              out.push({
                id: r.id, source: 'leaders', name: r.name,
                subtitle: [r.current_party, r.alignment_status].filter(Boolean).join(' · ') || 'Liderança',
                municipality: r.municipality, point, raw: r,
              });
            }
          })
        );
      }

      if (enabled.assets) {
        tasks.push(
          fetchAll<any>('political_assets', 'id,name,position,municipality,microregion,macroregion_id,lat,lng,alignment_status,influence_level').then(rows => {
            for (const r of rows) {
              const point = resolveGeo(r);
              if (!point) continue;
              out.push({
                id: r.id, source: 'assets', name: r.name,
                subtitle: r.position || 'Ativo político',
                municipality: r.municipality, point, raw: r,
              });
            }
          })
        );
      }

      if (enabled.members) {
        tasks.push(
          fetchAll<any>('campaign_members', 'id,name,role,hierarchy_level,municipality,microregion,macroregion_id,lat,lng').then(rows => {
            for (const r of rows) {
              const point = resolveGeo(r);
              if (!point) continue;
              out.push({
                id: r.id, source: 'members', name: r.name,
                subtitle: r.role || `Nível ${r.hierarchy_level}`,
                municipality: r.municipality, point, raw: r,
              });
            }
          })
        );
      }

      if (enabled.actions) {
        tasks.push(
          fetchAll<any>('actions', 'id,title,responsible,municipality,microregion,macroregion_id,lat,lng,status,planned_date').then(rows => {
            for (const r of rows) {
              const point = resolveGeo(r);
              if (!point) continue;
              out.push({
                id: r.id, source: 'actions', name: r.title,
                subtitle: [r.responsible, r.status].filter(Boolean).join(' · '),
                municipality: r.municipality, point, raw: r,
              });
            }
          })
        );
      }

      if (enabled.interviews) {
        tasks.push(
          fetchAll<any>('tracking_interviews', 'id,municipality,microregion,macroregion_id,lat,lng,respondent_gender,respondent_age_range').then(rows => {
            for (const r of rows) {
              const point = resolveGeo(r);
              if (!point) continue;
              out.push({
                id: r.id, source: 'interviews', name: 'Entrevista',
                subtitle: [r.respondent_gender, r.respondent_age_range].filter(Boolean).join(' · ') || 'Respondente',
                municipality: r.municipality, point, raw: r,
              });
            }
          })
        );
      }

      if (enabled.candidates) {
        tasks.push(
          fetchAll<any>('party_slate_candidates', 'id,name,party,cargo,city,association').then(rows => {
            for (const r of rows) {
              const point = resolveGeo({ ...r, municipality: r.city });
              if (!point) continue;
              out.push({
                id: r.id, source: 'candidates', name: r.name,
                subtitle: [r.party, r.cargo].filter(Boolean).join(' · '),
                municipality: r.city, point, raw: r,
              });
            }
          })
        );
      }

      await Promise.all(tasks);
      return out;
    },
  });
}
