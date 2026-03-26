import type { ResponsibleEntry } from '@/components/alerts/ResponsibleChain';
import type { DbCampaignMember } from '@/types/database';

/** 
 * Given alert context, find who to contact:
 * 1. Creator (from created_by_name or passed name)
 * 2. Microregional coordinator for that microregion/municipality
 * 3. Regional coordinator for that macroregion
 */
export function resolveAlertTeam(
  members: DbCampaignMember[],
  opts: {
    macroregion_id?: string | null;
    microregion?: string | null;
    municipality?: string | null;
    creatorName?: string | null;
    creatorRole?: string | null;
  }
): ResponsibleEntry[] {
  const entries: ResponsibleEntry[] = [];

  // 1. Creator
  if (opts.creatorName) {
    entries.push({
      name: opts.creatorName,
      role: opts.creatorRole ?? 'Cadastrador',
      level: 'creator',
    });
  }

  // 2. Find microregional coordinator
  //    hierarchy_level 4 or role contains 'microrregional' or 'municipal'
  //    match by microregion or municipality first, fallback macroregion
  const microCoord = members.find(m => {
    const roleLC = m.role.toLowerCase();
    const isMicroLevel = m.hierarchy_level === 4 || roleLC.includes('microrregional') || roleLC.includes('municipal');
    if (!isMicroLevel) return false;
    if (opts.microregion && m.microregion === opts.microregion) return true;
    if (opts.municipality && m.municipality === opts.municipality) return true;
    if (!opts.microregion && !opts.municipality && opts.macroregion_id && m.macroregion_id === opts.macroregion_id) return true;
    return false;
  });

  if (microCoord) {
    entries.push({
      name: microCoord.name,
      role: microCoord.role,
      level: 'micro',
    });
  }

  // 3. Find regional coordinator for the macroregion
  //    hierarchy_level 3 or role contains 'regional'
  const regionalCoord = members.find(m => {
    const roleLC = m.role.toLowerCase();
    const isRegionalLevel = m.hierarchy_level === 3 || (roleLC.includes('regional') && !roleLC.includes('microrregional'));
    if (!isRegionalLevel) return false;
    if (opts.macroregion_id && m.macroregion_id === opts.macroregion_id) return true;
    // fallback: if no macroregion_id, take first regional coord
    if (!opts.macroregion_id) return true;
    return false;
  });

  if (regionalCoord) {
    entries.push({
      name: regionalCoord.name,
      role: regionalCoord.role,
      level: 'regional',
    });
  }

  // 4. If we have neither micro nor regional, add geral coordinator as fallback
  if (!microCoord && !regionalCoord) {
    const geralCoord = members.find(m => {
      const roleLC = m.role.toLowerCase();
      return m.hierarchy_level <= 2 || roleLC.includes('geral') || roleLC.includes('estadual');
    });
    if (geralCoord) {
      entries.push({
        name: geralCoord.name,
        role: geralCoord.role,
        level: 'geral',
      });
    }
  }

  return entries;
}
