import { useMemo, useState } from 'react';
import {
  Shield, Phone, Mail, User, MapPin, Users as UsersIcon, Star,
  Plus, ExternalLink, Trash2, FileText, Handshake, UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UnifiedAsset } from '@/hooks/useUnifiedPoliticalAssets';
import type { DbAlignmentStatus } from '@/types/database';
import { assetKeyFor, useRaioXReports, useDeleteRaioXReport, type RaioXReport } from '@/hooks/useRaioXReports';
import { useLeadershipProfiles, useAssetLeadershipLinks } from '@/hooks/useLeadershipProfiles';
import { RaioXReportViewer } from './RaioXReportViewer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ALIGNMENT_COLORS: Record<DbAlignmentStatus, string> = {
  alinhado: '#22c55e', provavel: '#3b82f6', neutro: '#6b7280',
  oposicao: '#ef4444', indefinido: '#f59e0b',
};
const ALIGNMENT_LABELS: Record<DbAlignmentStatus, string> = {
  alinhado: 'Alinhado', provavel: 'Provável', neutro: 'Neutro',
  oposicao: 'Oposição', indefinido: 'Indefinido',
};

interface Props {
  asset: UnifiedAsset | null;
  onClose: () => void;
  onStartRaioX: (asset: UnifiedAsset) => void;
  canRaioX: boolean;
  rawAssetExtras?: {
    relationship_owner?: string | null;
    referred_by?: string | null;
  } | null;
}

export function AssetProfileSheet({ asset, onClose, onStartRaioX, canRaioX, rawAssetExtras }: Props) {
  const [openReport, setOpenReport] = useState<RaioXReport | null>(null);
  const { data: allReports = [] } = useRaioXReports();
  const deleteReport = useDeleteRaioXReport();
  const { data: leadershipProfiles = [] } = useLeadershipProfiles(true);
  const { data: assetLinks = [] } = useAssetLeadershipLinks(
    asset && asset.origin === 'nativo' ? [asset.source_id] : [],
  );

  const reports = useMemo(() => {
    if (!asset) return [] as RaioXReport[];
    const key = assetKeyFor(asset.name, asset.municipality);
    return allReports.filter(
      (r) =>
        r.asset_key === key ||
        (r.asset_source_id && r.asset_source_id === asset.source_id && r.asset_origin === asset.origin),
    );
  }, [allReports, asset]);

  const profiles = useMemo(() => {
    if (!asset || asset.origin !== 'nativo') return [];
    return assetLinks
      .filter((l) => l.asset_id === asset.source_id)
      .map((l) => leadershipProfiles.find((p) => p.id === l.profile_id))
      .filter(Boolean) as Array<{ id: string; name: string; color: string }>;
  }, [asset, assetLinks, leadershipProfiles]);

  if (!asset) return null;
  const ac = ALIGNMENT_COLORS[asset.alignment_status] ?? '#6b7280';

  return (
    <>
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl p-0 flex flex-col gap-0"
        >
          <SheetHeader className="p-5 border-b border-border bg-gradient-to-br from-card to-background">
            <SheetTitle className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                  Perfil do Ativo · {asset.source_label}
                </div>
                <div className="text-lg font-bold text-foreground leading-tight break-words">
                  {asset.name}
                </div>
                {asset.nickname && (
                  <div className="text-sm font-medium text-primary mt-0.5">“{asset.nickname}”</div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {asset.position ?? '—'}
                </div>
              </div>
              <Badge
                variant="outline"
                className="flex-shrink-0"
                style={{ color: ac, borderColor: `${ac}55`, backgroundColor: `${ac}15` }}
              >
                {ALIGNMENT_LABELS[asset.alignment_status] ?? asset.alignment_status}
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Todos os dados relacionados ao ativo político
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5">
              {/* Identificação */}
              <Section title="Identificação" icon={<User className="w-3.5 h-3.5" />}>
                <FieldRow label="Município" value={asset.municipality ?? '—'} icon={<MapPin className="w-3.5 h-3.5" />} />
                <FieldRow label="Macrorregião" value={asset.macroregion_id ?? '—'} />
                <FieldRow label="Tipo" value={asset.type} />
                <FieldRow label="Origem" value={asset.source_label} />
                {asset.readonly && (
                  <div className="text-[10px] text-muted-foreground italic mt-1">
                    Registro somente-leitura (proveniente de outro módulo).
                  </div>
                )}
              </Section>

              {/* Alinhamento */}
              <Section title="Alinhamento & Influência" icon={<Star className="w-3.5 h-3.5" />}>
                <FieldRow label="Status de apoio" value={asset.support_status ?? '—'} />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Influência</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: i < asset.influence_level ? ac : 'hsl(var(--border))' }}
                      />
                    ))}
                    <span className="ml-2 text-xs font-mono">{asset.influence_level}/10</span>
                  </div>
                </div>
                {profiles.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5">Perfis de liderança</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profiles.map((p) => (
                        <span
                          key={p.id}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                          style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}12` }}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Contato */}
              <Section title="Contato & Relacionamento" icon={<Handshake className="w-3.5 h-3.5" />}>
                <FieldRow label="Telefone" value={asset.phone ?? '—'} icon={<Phone className="w-3.5 h-3.5" />} />
                <FieldRow label="E-mail" value={asset.email ?? '—'} icon={<Mail className="w-3.5 h-3.5" />} />
                {rawAssetExtras?.relationship_owner && (
                  <FieldRow
                    label="Responsável"
                    value={rawAssetExtras.relationship_owner}
                    icon={<UserCheck className="w-3.5 h-3.5" />}
                  />
                )}
                {rawAssetExtras?.referred_by && (
                  <FieldRow label="Indicado por" value={rawAssetExtras.referred_by} />
                )}
              </Section>

              {/* Observações */}
              {asset.observations && (
                <Section title="Observações estratégicas" icon={<FileText className="w-3.5 h-3.5" />}>
                  <p className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed">
                    {asset.observations}
                  </p>
                </Section>
              )}

              {/* RAIO-X salvos */}
              <Section
                title={`Investigações RAIO-X (${reports.length})`}
                icon={<Shield className="w-3.5 h-3.5 text-destructive" />}
                action={
                  canRaioX && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onStartRaioX(asset)}
                    >
                      <Plus className="w-3 h-3" />
                      {reports.length ? 'Nova investigação' : 'Iniciar RAIO-X'}
                    </Button>
                  )
                }
              >
                {reports.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum relatório salvo para este ativo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {reports.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-border p-3 bg-muted/30 hover:border-destructive/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-foreground">
                              RAIO-X · {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {r.model && (
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                {r.model}
                              </div>
                            )}
                            {r.reviewer_notes && (
                              <div className="text-[11px] text-muted-foreground italic mt-1 line-clamp-2">
                                “{r.reviewer_notes}”
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => setOpenReport(r)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm('Remover este relatório RAIO-X?')) {
                                  deleteReport.mutate(r.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Link para origem */}
              {asset.origin !== 'nativo' && (
                <Link
                  to={asset.source_route}
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir cadastro em {asset.source_label}
                </Link>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Viewer inline para um relatório */}
      {openReport && (
        <Sheet open onOpenChange={(v) => !v && setOpenReport(null)}>
          <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-destructive" />
                Relatório RAIO-X · {openReport.subject_name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {format(new Date(openReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {openReport.subject_municipality ? ` · ${openReport.subject_municipality}` : ''}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-hidden p-3">
              <RaioXReportViewer html={openReport.report_html} height="100%" />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function Section({
  title, icon, action, children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {action}
      </header>
      <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">{children}</div>
    </section>
  );
}

function FieldRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-foreground text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
