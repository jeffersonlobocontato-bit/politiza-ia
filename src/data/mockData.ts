// Mock data for CampanhaOS — Paraná Electoral Campaign Platform

export type ActionStatus = 'prevista' | 'confirmada' | 'em_andamento' | 'realizada' | 'atrasada' | 'cancelada' | 'pendente_validacao';
export type ActionType = 'reuniao_politica' | 'visita_institucional' | 'mobilizacao_comunitaria' | 'adesivaço' | 'panfletagem' | 'carreata' | 'evento_regional' | 'agenda_candidato' | 'reuniao_empresarios' | 'encontro_liderancas' | 'acao_digital';
export type Priority = 'alta' | 'media' | 'baixa' | 'critica';
export type EngagementLevel = 'risco' | 'atencao' | 'competitivo' | 'consolidado';
export type AlertLevel = 'critico' | 'atencao' | 'oportunidade' | 'info';
export type AssetType = 'prefeito' | 'ex_prefeito' | 'vereador' | 'ex_vereador' | 'lideranca_comunitaria' | 'lideranca_empresarial' | 'lideranca_religiosa' | 'presidente_entidade' | 'influenciador_regional' | 'coordenador_partidario';
export type AlignmentStatus = 'alinhado' | 'provavel' | 'neutro' | 'oposicao' | 'indefinido';

export interface Municipality {
  id: string;
  name: string;
  macroregion: string;
  microregion: string;
  lat: number;
  lng: number;
  population: number;
  electoralVoters: number;
  engagementScore: number;
  actionsPlanned: number;
  actionsCompleted: number;
  actionsDelayed: number;
  peopleImpacted: number;
  pollScore?: number; // Current voting intention %
  coordinator?: string;
}

export interface MacroRegion {
  id: string;
  name: string;
  coordinator: string;
  municipalities: number;
  engagementScore: number;
  actionsPlanned: number;
  actionsCompleted: number;
  actionsDelayed: number;
  peopleImpacted: number;
  pollScore: number;
  pollTrend: 'up' | 'down' | 'stable';
  centerLat: number;
  centerLng: number;
}

export interface Action {
  id: string;
  title: string;
  type: ActionType;
  category: string;
  description: string;
  municipality: string;
  microregion: string;
  macroregion: string;
  address: string;
  lat: number;
  lng: number;
  responsible: string;
  team: string[];
  plannedDate: string;
  plannedTime: string;
  priority: Priority;
  targetAudience: string;
  estimatedImpact: number;
  status: ActionStatus;
  observations?: string;
  executedDate?: string;
  executedPeopleCount?: number;
  evidencePhotos?: string[];
}

export interface PollData {
  id: string;
  institute: string;
  collectionDate: string;
  releaseDate: string;
  scope: string;
  territory: string;
  sampleSize: number;
  marginOfError: number;
  methodology: string;
  scenario: string;
  votingIntention: number;
  rejection: number;
  undecided: number;
  votePool: number;
  observations?: string;
}

export interface PollTimeline {
  date: string;
  candidate: number;
  rival1: number;
  rival2: number;
  undecided: number;
}

export interface PoliticalAsset {
  id: string;
  name: string;
  type: AssetType;
  municipality: string;
  microregion: string;
  macroregion: string;
  position?: string;
  influenceLevel: number; // 1-10
  alignmentStatus: AlignmentStatus;
  supportStatus: string;
  observations?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  territory: string;
  macroregion?: string;
  recommendation: string;
  createdAt: string;
  isRead: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  level: 1 | 2 | 3 | 4 | 5;
  region?: string;
  municipality?: string;
  actionsManaged: number;
  completionRate: number;
  avatar?: string;
  phone?: string;
}

// =====================================================
// MACRO REGIONS
// =====================================================
export const macroRegions: MacroRegion[] = [
  {
    id: 'rmc',
    name: 'Curitiba / RMC',
    coordinator: 'Carlos Mendonça',
    municipalities: 41,
    engagementScore: 78,
    actionsPlanned: 142,
    actionsCompleted: 98,
    actionsDelayed: 12,
    peopleImpacted: 284000,
    pollScore: 47.2,
    pollTrend: 'up',
    centerLat: -25.4244,
    centerLng: -49.2654,
  },
  {
    id: 'norte_central',
    name: 'Norte',
    coordinator: 'Fernanda Rocha',
    municipalities: 79,
    engagementScore: 65,
    actionsPlanned: 98,
    actionsCompleted: 61,
    actionsDelayed: 18,
    peopleImpacted: 156000,
    pollScore: 42.8,
    pollTrend: 'stable',
    centerLat: -23.3045,
    centerLng: -51.1696,
  },
  {
    id: 'noroeste',
    name: 'Noroeste',
    coordinator: 'Roberto Silveira',
    municipalities: 53,
    engagementScore: 38,
    actionsPlanned: 67,
    actionsCompleted: 28,
    actionsDelayed: 24,
    peopleImpacted: 68000,
    pollScore: 36.4,
    pollTrend: 'down',
    centerLat: -23.2068,
    centerLng: -53.0000,
  },
  {
    id: 'oeste',
    name: 'Oeste',
    coordinator: 'Ana Paula Ferreira',
    municipalities: 50,
    engagementScore: 72,
    actionsPlanned: 88,
    actionsCompleted: 71,
    actionsDelayed: 7,
    peopleImpacted: 198000,
    pollScore: 45.1,
    pollTrend: 'up',
    centerLat: -25.0916,
    centerLng: -53.6085,
  },
  {
    id: 'sudoeste',
    name: 'Sudoeste',
    coordinator: 'Marcelo Cunha',
    municipalities: 37,
    engagementScore: 84,
    actionsPlanned: 76,
    actionsCompleted: 68,
    actionsDelayed: 3,
    peopleImpacted: 142000,
    pollScore: 51.3,
    pollTrend: 'up',
    centerLat: -25.7682,
    centerLng: -52.8744,
  },
  {
    id: 'centro_sul',
    name: 'Centro-Sul',
    coordinator: 'Juliana Teixeira',
    municipalities: 29,
    engagementScore: 55,
    actionsPlanned: 54,
    actionsCompleted: 34,
    actionsDelayed: 11,
    peopleImpacted: 87000,
    pollScore: 39.6,
    pollTrend: 'down',
    centerLat: -25.7824,
    centerLng: -51.8950,
  },
  {
    id: 'campos_gerais',
    name: 'Campos Gerais',
    coordinator: 'Eduardo Pinheiro',
    municipalities: 22,
    engagementScore: 61,
    actionsPlanned: 63,
    actionsCompleted: 45,
    actionsDelayed: 9,
    peopleImpacted: 112000,
    pollScore: 43.7,
    pollTrend: 'stable',
    centerLat: -24.7789,
    centerLng: -50.0161,
  },
  {
    id: 'norte_pioneiro',
    name: 'Norte Pioneiro',
    coordinator: 'Sônia Batista',
    municipalities: 46,
    engagementScore: 44,
    actionsPlanned: 58,
    actionsCompleted: 31,
    actionsDelayed: 16,
    peopleImpacted: 79000,
    pollScore: 38.2,
    pollTrend: 'down',
    centerLat: -23.5000,
    centerLng: -50.4000,
  },
  {
    id: 'litoral',
    name: 'Litoral',
    coordinator: 'Ricardo Almeida',
    municipalities: 37,
    engagementScore: 52,
    actionsPlanned: 64,
    actionsCompleted: 35,
    actionsDelayed: 14,
    peopleImpacted: 95000,
    pollScore: 40.5,
    pollTrend: 'stable' as const,
    centerLat: -25.5200,
    centerLng: -48.5100,
  },
];

// =====================================================
// MUNICIPALITIES (sample of key cities)
// =====================================================
export const municipalities: Municipality[] = [
  { id: 'curitiba', name: 'Curitiba', macroregion: 'rmc', microregion: 'Curitiba', lat: -25.4244, lng: -49.2654, population: 1963726, electoralVoters: 1181000, engagementScore: 82, actionsPlanned: 45, actionsCompleted: 38, actionsDelayed: 3, peopleImpacted: 125000, pollScore: 49.3, coordinator: 'Carlos Mendonça' },
  { id: 'londrina', name: 'Londrina', macroregion: 'norte_central', microregion: 'Londrina', lat: -23.3045, lng: -51.1696, population: 575482, electoralVoters: 363000, engagementScore: 68, actionsPlanned: 28, actionsCompleted: 19, actionsDelayed: 4, peopleImpacted: 45000, pollScore: 43.1, coordinator: 'Fernanda Rocha' },
  { id: 'maringa', name: 'Maringá', macroregion: 'norte_central', microregion: 'Maringá', lat: -23.4273, lng: -51.9375, population: 436472, electoralVoters: 288000, engagementScore: 71, actionsPlanned: 22, actionsCompleted: 16, actionsDelayed: 3, peopleImpacted: 38000, pollScore: 44.8, coordinator: 'Fernanda Rocha' },
  { id: 'cascavel', name: 'Cascavel', macroregion: 'oeste', microregion: 'Cascavel', lat: -24.9557, lng: -53.4558, population: 345249, electoralVoters: 228000, engagementScore: 76, actionsPlanned: 19, actionsCompleted: 15, actionsDelayed: 2, peopleImpacted: 42000, pollScore: 46.2, coordinator: 'Ana Paula Ferreira' },
  { id: 'foz_iguacu', name: 'Foz do Iguaçu', macroregion: 'oeste', microregion: 'Foz do Iguaçu', lat: -25.5478, lng: -54.5882, population: 260348, electoralVoters: 167000, engagementScore: 69, actionsPlanned: 16, actionsCompleted: 11, actionsDelayed: 3, peopleImpacted: 28000, pollScore: 44.0, coordinator: 'Ana Paula Ferreira' },
  { id: 'sao_jose_dos_pinhais', name: 'São José dos Pinhais', macroregion: 'rmc', microregion: 'Curitiba', lat: -25.5317, lng: -49.2068, population: 349043, electoralVoters: 218000, engagementScore: 74, actionsPlanned: 18, actionsCompleted: 13, actionsDelayed: 2, peopleImpacted: 32000, pollScore: 47.1, coordinator: 'Carlos Mendonça' },
  { id: 'colombo', name: 'Colombo', macroregion: 'rmc', microregion: 'Curitiba', lat: -25.2967, lng: -49.2233, population: 261899, electoralVoters: 160000, engagementScore: 66, actionsPlanned: 14, actionsCompleted: 9, actionsDelayed: 3, peopleImpacted: 19000, pollScore: 45.6, coordinator: 'Carlos Mendonça' },
  { id: 'ponta_grossa', name: 'Ponta Grossa', macroregion: 'campos_gerais', microregion: 'Ponta Grossa', lat: -25.0945, lng: -50.1633, population: 355498, electoralVoters: 228000, engagementScore: 63, actionsPlanned: 21, actionsCompleted: 14, actionsDelayed: 4, peopleImpacted: 34000, pollScore: 42.3, coordinator: 'Eduardo Pinheiro' },
  { id: 'guarapuava', name: 'Guarapuava', macroregion: 'centro_sul', microregion: 'Guarapuava', lat: -25.3950, lng: -51.4600, population: 186185, electoralVoters: 116000, engagementScore: 52, actionsPlanned: 16, actionsCompleted: 9, actionsDelayed: 5, peopleImpacted: 14000, pollScore: 38.8, coordinator: 'Juliana Teixeira' },
  { id: 'pato_branco', name: 'Pato Branco', macroregion: 'sudoeste', microregion: 'Pato Branco', lat: -26.2273, lng: -52.6714, population: 84374, electoralVoters: 55000, engagementScore: 87, actionsPlanned: 12, actionsCompleted: 11, actionsDelayed: 0, peopleImpacted: 18000, pollScore: 52.4, coordinator: 'Marcelo Cunha' },
  { id: 'francisco_beltrao', name: 'Francisco Beltrão', macroregion: 'sudoeste', microregion: 'Sudoeste', lat: -26.0814, lng: -53.0540, population: 92951, electoralVoters: 62000, engagementScore: 83, actionsPlanned: 14, actionsCompleted: 12, actionsDelayed: 1, peopleImpacted: 21000, pollScore: 51.8, coordinator: 'Marcelo Cunha' },
  { id: 'apucarana', name: 'Apucarana', macroregion: 'norte_central', microregion: 'Apucarana', lat: -23.5516, lng: -51.4614, population: 134891, electoralVoters: 87000, engagementScore: 58, actionsPlanned: 10, actionsCompleted: 6, actionsDelayed: 3, peopleImpacted: 11000, pollScore: 40.1, coordinator: 'Fernanda Rocha' },
  { id: 'umuarama', name: 'Umuarama', macroregion: 'noroeste', microregion: 'Umuarama', lat: -23.7669, lng: -53.3243, population: 113558, electoralVoters: 73000, engagementScore: 41, actionsPlanned: 9, actionsCompleted: 4, actionsDelayed: 4, peopleImpacted: 7000, pollScore: 35.2, coordinator: 'Roberto Silveira' },
  { id: 'cornelio_procopio', name: 'Cornélio Procópio', macroregion: 'norte_pioneiro', microregion: 'Norte Pioneiro', lat: -23.1829, lng: -50.6449, population: 48025, electoralVoters: 32000, engagementScore: 39, actionsPlanned: 8, actionsCompleted: 3, actionsDelayed: 4, peopleImpacted: 5500, pollScore: 36.9, coordinator: 'Sônia Batista' },
  { id: 'toledo', name: 'Toledo', macroregion: 'oeste', microregion: 'Toledo', lat: -24.7260, lng: -53.7435, population: 145371, electoralVoters: 96000, engagementScore: 74, actionsPlanned: 13, actionsCompleted: 10, actionsDelayed: 1, peopleImpacted: 22000, pollScore: 45.9, coordinator: 'Ana Paula Ferreira' },
  { id: 'medianeira', name: 'Medianeira', macroregion: 'oeste', microregion: 'Foz do Iguaçu', lat: -25.2947, lng: -54.0958, population: 47564, electoralVoters: 30000, engagementScore: 66, actionsPlanned: 8, actionsCompleted: 5, actionsDelayed: 2, peopleImpacted: 7800, pollScore: 43.5, coordinator: 'Ana Paula Ferreira' },
  { id: 'paranagua', name: 'Paranaguá', macroregion: 'rmc', microregion: 'Litoral', lat: -25.5196, lng: -48.5073, population: 154936, electoralVoters: 96000, engagementScore: 57, actionsPlanned: 11, actionsCompleted: 7, actionsDelayed: 3, peopleImpacted: 13000, pollScore: 41.2, coordinator: 'Carlos Mendonça' },
  { id: 'jacarezinho', name: 'Jacarezinho', macroregion: 'norte_pioneiro', microregion: 'Norte Pioneiro', lat: -23.1597, lng: -49.9707, population: 40694, electoralVoters: 27000, engagementScore: 46, actionsPlanned: 7, actionsCompleted: 4, actionsDelayed: 2, peopleImpacted: 6200, pollScore: 38.5, coordinator: 'Sônia Batista' },
  { id: 'campo_mourao', name: 'Campo Mourão', macroregion: 'norte_central', microregion: 'Campo Mourão', lat: -24.0457, lng: -52.3836, population: 94622, electoralVoters: 63000, engagementScore: 60, actionsPlanned: 11, actionsCompleted: 7, actionsDelayed: 2, peopleImpacted: 12500, pollScore: 41.7, coordinator: 'Fernanda Rocha' },
  { id: 'irati', name: 'Irati', macroregion: 'centro_sul', microregion: 'Irati', lat: -25.4680, lng: -50.6534, population: 60282, electoralVoters: 39000, engagementScore: 54, actionsPlanned: 9, actionsCompleted: 6, actionsDelayed: 2, peopleImpacted: 9200, pollScore: 40.1, coordinator: 'Juliana Teixeira' },
];

// =====================================================
// ACTIONS
// =====================================================
export const actions: Action[] = [
  // ── RMC / CURITIBA (14 ações) ──────────────────────────────────────────────
  { id: 'a001', title: 'Grande Encontro de Lideranças — Curitiba Norte', type: 'encontro_liderancas', category: 'Mobilização', description: 'Reunião com prefeitos e vereadores da RMC Norte para alinhamento de estratégia.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Teatro Guaíra — Praça Santos Andrade, 800', lat: -25.4285, lng: -49.2709, responsible: 'Carlos Mendonça', team: ['Ana Silva', 'Pedro Costa', 'Maria Lima'], plannedDate: '2024-04-15', plannedTime: '19:00', priority: 'critica', targetAudience: 'Lideranças políticas', estimatedImpact: 3500, status: 'realizada', executedDate: '2024-04-15', executedPeopleCount: 3800 },
  { id: 'a002', title: 'Mobilização Comunitária Zona Leste — Curitiba', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Ação porta a porta em conjuntos habitacionais da zona leste.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Bairro Boqueirão — Curitiba', lat: -25.4918, lng: -49.2341, responsible: 'Carlos Mendonça', team: ['Adriana Lima', 'Bruno Oliveira', 'Cláudia Santos'], plannedDate: '2024-04-29', plannedTime: '09:00', priority: 'alta', targetAudience: 'Moradores de conjuntos habitacionais', estimatedImpact: 5500, status: 'em_andamento' },
  { id: 'a003', title: 'Carreata Zona Sul — Curitiba', type: 'carreata', category: 'Mobilização', description: 'Carreata pelos bairros populosos da zona sul com som e distribuição de material.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Av. Winston Churchill — Bairro Novo', lat: -25.5100, lng: -49.2600, responsible: 'Carlos Mendonça', team: ['Marcelo Souza', 'Fernanda Lima'], plannedDate: '2024-05-03', plannedTime: '10:00', priority: 'alta', targetAudience: 'Eleitores gerais', estimatedImpact: 12000, status: 'realizada', executedDate: '2024-05-03', executedPeopleCount: 13500 },
  { id: 'a004', title: 'Agenda Candidato CIC — Curitiba', type: 'agenda_candidato', category: 'Agenda', description: 'Visita às indústrias do CIC com anúncio de programa de emprego.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Cidade Industrial de Curitiba', lat: -25.4700, lng: -49.3500, responsible: 'Carlos Mendonça', team: ['Assessoria Política'], plannedDate: '2024-05-06', plannedTime: '14:00', priority: 'critica', targetAudience: 'Trabalhadores e empresários', estimatedImpact: 8000, status: 'confirmada' },
  { id: 'a005', title: 'Panfletagem Mercadão Municipal — Curitiba', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material informativo no mercado municipal e arredores.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Mercado Municipal de Curitiba', lat: -25.4370, lng: -49.2710, responsible: 'Carlos Mendonça', team: ['Voluntários RMC'], plannedDate: '2024-05-08', plannedTime: '07:00', priority: 'media', targetAudience: 'Frequentadores do mercado', estimatedImpact: 3000, status: 'realizada', executedDate: '2024-05-08', executedPeopleCount: 3200 },
  { id: 'a006', title: 'Reunião com Vereadores Aliados — Curitiba', type: 'reuniao_politica', category: 'Político', description: 'Alinhamento estratégico com bancada aliada na Câmara Municipal.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Câmara Municipal de Curitiba', lat: -25.4155, lng: -49.2642, responsible: 'Carlos Mendonça', team: ['Senadora Patrícia Valle'], plannedDate: '2024-05-10', plannedTime: '17:00', priority: 'alta', targetAudience: 'Vereadores aliados', estimatedImpact: 30, status: 'prevista' },
  { id: 'a007', title: 'Evento Grande Porte — Curitiba Centro', type: 'evento_regional', category: 'Regional', description: 'Comício central com presença do candidato e artistas regionais.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Praça Rui Barbosa — Curitiba', lat: -25.4244, lng: -49.2654, responsible: 'Carlos Mendonça', team: ['Equipe Estadual', 'Marketing'], plannedDate: '2024-05-15', plannedTime: '19:00', priority: 'critica', targetAudience: 'Público geral', estimatedImpact: 25000, status: 'prevista' },
  { id: 'a008', title: 'Reunião Lideranças Religiosas — São José dos Pinhais', type: 'encontro_liderancas', category: 'Político', description: 'Encontro com pastores, padres e líderes religiosos da RMC Sul.', municipality: 'São José dos Pinhais', microregion: 'Curitiba', macroregion: 'rmc', address: 'Centro Comunitário SJP', lat: -25.5317, lng: -49.2068, responsible: 'Carlos Mendonça', team: ['Renata Barbosa'], plannedDate: '2024-04-30', plannedTime: '19:00', priority: 'alta', targetAudience: 'Lideranças religiosas', estimatedImpact: 200, status: 'confirmada' },
  { id: 'a009', title: 'Adesivaço Colombo — RMC Norte', type: 'adesivaço', category: 'Campo', description: 'Colagem de adesivos em pontos estratégicos de Colombo.', municipality: 'Colombo', microregion: 'Curitiba', macroregion: 'rmc', address: 'Colombo — Região Central', lat: -25.2967, lng: -49.2233, responsible: 'Carlos Mendonça', team: ['Voluntários RMC Norte'], plannedDate: '2024-05-04', plannedTime: '08:00', priority: 'media', targetAudience: 'Eleitores gerais', estimatedImpact: 9000, status: 'realizada', executedDate: '2024-05-04', executedPeopleCount: 9000 },
  { id: 'a010', title: 'Panfletagem Porto de Paranaguá', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material para trabalhadores do porto e comunidades litorâneas.', municipality: 'Paranaguá', microregion: 'Litoral', macroregion: 'rmc', address: 'Porto de Paranaguá', lat: -25.5080, lng: -48.5130, responsible: 'Carlos Mendonça', team: ['Equipe Litoral'], plannedDate: '2024-05-01', plannedTime: '06:00', priority: 'media', targetAudience: 'Trabalhadores portuários', estimatedImpact: 4000, status: 'realizada', executedDate: '2024-05-01', executedPeopleCount: 3700 },
  { id: 'a011', title: 'Mobilização Araucária — RMC Sul', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Ação de campo nos bairros industriais de Araucária.', municipality: 'Araucária', microregion: 'Curitiba', macroregion: 'rmc', address: 'Araucária — Polo Industrial', lat: -25.5930, lng: -49.4060, responsible: 'Carlos Mendonça', team: ['Voluntários Araucária'], plannedDate: '2024-05-09', plannedTime: '17:00', priority: 'alta', targetAudience: 'Operários e famílias', estimatedImpact: 7000, status: 'prevista' },
  { id: 'a012', title: 'Visita Institucional Prefeitura — Pinhais', type: 'visita_institucional', category: 'Institucional', description: 'Reunião com prefeito e secretariado de Pinhais.', municipality: 'Pinhais', microregion: 'Curitiba', macroregion: 'rmc', address: 'Prefeitura Municipal de Pinhais', lat: -25.4430, lng: -49.1930, responsible: 'Carlos Mendonça', team: ['Assessoria Política'], plannedDate: '2024-05-12', plannedTime: '10:00', priority: 'alta', targetAudience: 'Gestores municipais', estimatedImpact: 80, status: 'atrasada', observations: 'Prefeito remarcou para semana seguinte' },
  { id: 'a013', title: 'Evento Trabalhadores — Campo Largo', type: 'encontro_liderancas', category: 'Mobilização', description: 'Encontro com sindicatos e associações de trabalhadores de Campo Largo.', municipality: 'Campo Largo', microregion: 'Curitiba', macroregion: 'rmc', address: 'Sede do Sindicato — Campo Largo', lat: -25.4590, lng: -49.5290, responsible: 'Carlos Mendonça', team: ['Equipe Sindical'], plannedDate: '2024-05-14', plannedTime: '18:30', priority: 'media', targetAudience: 'Sindicalistas e trabalhadores', estimatedImpact: 1200, status: 'prevista' },
  { id: 'a014', title: 'Ação Digital RMC — Engajamento Online', type: 'acao_digital', category: 'Digital', description: 'Campanha digital geolocalizada para eleitores da Região Metropolitana.', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', address: 'Online — RMC', lat: -25.4340, lng: -49.2750, responsible: 'Carlos Mendonça', team: ['Equipe Digital'], plannedDate: '2024-05-05', plannedTime: '00:00', priority: 'alta', targetAudience: 'Usuários de redes sociais na RMC', estimatedImpact: 180000, status: 'realizada', executedDate: '2024-05-05', executedPeopleCount: 210000 },

  // ── NORTE CENTRAL (11 ações) ───────────────────────────────────────────────
  { id: 'a015', title: 'Carreata das Regiões — Londrina Centro', type: 'carreata', category: 'Mobilização', description: 'Carreata percorrendo os principais bairros de Londrina com carro de som.', municipality: 'Londrina', microregion: 'Londrina', macroregion: 'norte_central', address: 'Calçadão de Londrina', lat: -23.3105, lng: -51.1632, responsible: 'Fernanda Rocha', team: ['Ricardo Alves', 'Camila Santos'], plannedDate: '2024-04-18', plannedTime: '10:00', priority: 'alta', targetAudience: 'Público geral', estimatedImpact: 8000, status: 'realizada', executedDate: '2024-04-18', executedPeopleCount: 9200 },
  { id: 'a016', title: 'Encontro com Empresários — Londrina', type: 'reuniao_empresarios', category: 'Institucional', description: 'Café da manhã com ACIL e lideranças econômicas do norte do Paraná.', municipality: 'Londrina', microregion: 'Londrina', macroregion: 'norte_central', address: 'Hotel Bourbon — Londrina', lat: -23.3000, lng: -51.1750, responsible: 'Fernanda Rocha', team: ['Equipe Norte'], plannedDate: '2024-05-02', plannedTime: '08:00', priority: 'alta', targetAudience: 'Empresários', estimatedImpact: 350, status: 'realizada', executedDate: '2024-05-02', executedPeopleCount: 420 },
  { id: 'a017', title: 'Mobilização Zona Norte — Londrina', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Porta a porta na região do Cafezal e bairros populares do norte.', municipality: 'Londrina', microregion: 'Londrina', macroregion: 'norte_central', address: 'Zona Norte de Londrina', lat: -23.2810, lng: -51.1700, responsible: 'Fernanda Rocha', team: ['Voluntários Londrina'], plannedDate: '2024-05-07', plannedTime: '09:00', priority: 'media', targetAudience: 'Moradores zona norte', estimatedImpact: 6000, status: 'em_andamento' },
  { id: 'a018', title: 'Adesivaço Maringá — Zona Norte', type: 'adesivaço', category: 'Campo', description: 'Ação de colagem de adesivos em pontos estratégicos da zona norte de Maringá.', municipality: 'Maringá', microregion: 'Maringá', macroregion: 'norte_central', address: 'Zona Norte — Maringá', lat: -23.4100, lng: -51.9200, responsible: 'Fernanda Rocha', team: ['Luiz Henrique', 'Patricia Souza', 'Rodrigo Lima'], plannedDate: '2024-04-26', plannedTime: '08:00', priority: 'media', targetAudience: 'Eleitores gerais', estimatedImpact: 15000, status: 'confirmada' },
  { id: 'a019', title: 'Reunião Lideranças Religiosas — Maringá', type: 'encontro_liderancas', category: 'Político', description: 'Encontro com pastor Gilson Neves e líderes da Assembleia de Deus.', municipality: 'Maringá', microregion: 'Maringá', macroregion: 'norte_central', address: 'Igreja Assembleia de Deus — Maringá', lat: -23.4350, lng: -51.9400, responsible: 'Fernanda Rocha', team: ['Assessoria Religiosa'], plannedDate: '2024-05-05', plannedTime: '10:00', priority: 'critica', targetAudience: 'Lideranças religiosas', estimatedImpact: 15000, status: 'realizada', executedDate: '2024-05-05', executedPeopleCount: 18000 },
  { id: 'a020', title: 'Agenda Candidato — Maringá', type: 'agenda_candidato', category: 'Agenda', description: 'Visita oficial do candidato a Maringá com agenda empresarial e popular.', municipality: 'Maringá', microregion: 'Maringá', macroregion: 'norte_central', address: 'Catedral Basílica — Maringá', lat: -23.4273, lng: -51.9375, responsible: 'Fernanda Rocha', team: ['Equipe Estadual'], plannedDate: '2024-05-10', plannedTime: '10:00', priority: 'critica', targetAudience: 'Público geral', estimatedImpact: 20000, status: 'prevista' },
  { id: 'a021', title: 'Visita ao Hospital Regional — Apucarana', type: 'visita_institucional', category: 'Institucional', description: 'Visita ao HRA com anúncio de apoio a melhorias na saúde regional.', municipality: 'Apucarana', microregion: 'Apucarana', macroregion: 'norte_central', address: 'Hospital Regional — Apucarana', lat: -23.5516, lng: -51.4614, responsible: 'Fernanda Rocha', team: ['Dr. Mário Santos'], plannedDate: '2024-05-02', plannedTime: '10:00', priority: 'media', targetAudience: 'Profissionais de saúde', estimatedImpact: 800, status: 'realizada', executedDate: '2024-05-02', executedPeopleCount: 950 },
  { id: 'a022', title: 'Panfletagem Apucarana — Centro', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material no centro comercial de Apucarana.', municipality: 'Apucarana', microregion: 'Apucarana', macroregion: 'norte_central', address: 'Centro de Apucarana', lat: -23.5550, lng: -51.4550, responsible: 'Fernanda Rocha', team: ['Voluntários Apucarana'], plannedDate: '2024-05-11', plannedTime: '09:00', priority: 'baixa', targetAudience: 'Público geral', estimatedImpact: 2500, status: 'prevista' },
  { id: 'a023', title: 'Reunião Municipal — Campo Mourão', type: 'reuniao_politica', category: 'Político', description: 'Reunião com coordenadores municipais da região de Campo Mourão.', municipality: 'Campo Mourão', microregion: 'Campo Mourão', macroregion: 'norte_central', address: 'Sede Partidária — Campo Mourão', lat: -24.0457, lng: -52.3836, responsible: 'Fernanda Rocha', team: ['Coord. Regional'], plannedDate: '2024-05-04', plannedTime: '14:00', priority: 'media', targetAudience: 'Coordenadores municipais', estimatedImpact: 150, status: 'atrasada', observations: 'Baixa presença esperada, necessita reforço' },
  { id: 'a024', title: 'Carreata Campo Mourão', type: 'carreata', category: 'Mobilização', description: 'Carreata por todo Campo Mourão com apoio das lideranças locais.', municipality: 'Campo Mourão', microregion: 'Campo Mourão', macroregion: 'norte_central', address: 'Praça Central — Campo Mourão', lat: -24.0400, lng: -52.3900, responsible: 'Fernanda Rocha', team: ['Equipe Campo Mourão'], plannedDate: '2024-05-16', plannedTime: '10:00', priority: 'alta', targetAudience: 'Público geral', estimatedImpact: 5000, status: 'prevista' },
  { id: 'a025', title: 'Ação Digital Norte Central', type: 'acao_digital', category: 'Digital', description: 'Impulsionamento segmentado nas cidades do Norte Central.', municipality: 'Londrina', microregion: 'Londrina', macroregion: 'norte_central', address: 'Online — Norte Central', lat: -23.3045, lng: -51.1696, responsible: 'Fernanda Rocha', team: ['Equipe Digital'], plannedDate: '2024-04-24', plannedTime: '00:00', priority: 'media', targetAudience: 'Usuários de redes sociais', estimatedImpact: 65000, status: 'realizada', executedDate: '2024-04-24', executedPeopleCount: 78000 },

  // ── NOROESTE (7 ações) ─────────────────────────────────────────────────────
  { id: 'a026', title: 'Evento Regional — Umuarama', type: 'evento_regional', category: 'Regional', description: 'Evento político regional com presença do candidato e lideranças.', municipality: 'Umuarama', microregion: 'Umuarama', macroregion: 'noroeste', address: 'Ginásio Municipal de Umuarama', lat: -23.7669, lng: -53.3243, responsible: 'Roberto Silveira', team: ['Vera Gomes', 'Antonio Neto'], plannedDate: '2024-04-25', plannedTime: '19:30', priority: 'critica', targetAudience: 'Público geral', estimatedImpact: 5000, status: 'atrasada', observations: 'Confirmação do candidato pendente' },
  { id: 'a027', title: 'Panfletagem Umuarama — Zona Rural', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material em propriedades rurais e distritos de Umuarama.', municipality: 'Umuarama', microregion: 'Umuarama', macroregion: 'noroeste', address: 'Distritos rurais de Umuarama', lat: -23.7800, lng: -53.3100, responsible: 'Roberto Silveira', team: ['Equipe Rural'], plannedDate: '2024-05-03', plannedTime: '07:00', priority: 'media', targetAudience: 'Produtores rurais', estimatedImpact: 2000, status: 'prevista' },
  { id: 'a028', title: 'Reunião Partidária — Paranavaí', type: 'reuniao_politica', category: 'Político', description: 'Reorganização da estrutura partidária em Paranavaí.', municipality: 'Paranavaí', microregion: 'Noroeste', macroregion: 'noroeste', address: 'Sede Partidária — Paranavaí', lat: -23.0729, lng: -52.4651, responsible: 'Roberto Silveira', team: ['Coord. Noroeste'], plannedDate: '2024-05-06', plannedTime: '14:00', priority: 'alta', targetAudience: 'Filiados partidários', estimatedImpact: 200, status: 'prevista' },
  { id: 'a029', title: 'Carreata Paranavaí', type: 'carreata', category: 'Mobilização', description: 'Carreata pelos principais bairros de Paranavaí.', municipality: 'Paranavaí', microregion: 'Noroeste', macroregion: 'noroeste', address: 'Centro de Paranavaí', lat: -23.0750, lng: -52.4700, responsible: 'Roberto Silveira', team: ['Voluntários Paranavaí'], plannedDate: '2024-05-11', plannedTime: '09:00', priority: 'media', targetAudience: 'Público geral', estimatedImpact: 3500, status: 'confirmada' },
  { id: 'a030', title: 'Visita Institucional — Cianorte', type: 'visita_institucional', category: 'Institucional', description: 'Reunião com prefeito e câmara de Cianorte.', municipality: 'Cianorte', microregion: 'Noroeste', macroregion: 'noroeste', address: 'Prefeitura de Cianorte', lat: -23.6607, lng: -52.6046, responsible: 'Roberto Silveira', team: ['Assessoria Política'], plannedDate: '2024-05-08', plannedTime: '10:00', priority: 'alta', targetAudience: 'Gestores municipais', estimatedImpact: 50, status: 'prevista' },
  { id: 'a031', title: 'Mobilização Rural — Noroeste', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Encontro com associações de agricultores familiares do noroeste.', municipality: 'Umuarama', microregion: 'Umuarama', macroregion: 'noroeste', address: 'Cooperativa Rural — Umuarama', lat: -23.7550, lng: -53.3350, responsible: 'Roberto Silveira', team: ['EMATER Regional'], plannedDate: '2024-05-14', plannedTime: '09:00', priority: 'media', targetAudience: 'Agricultores familiares', estimatedImpact: 1800, status: 'prevista' },
  { id: 'a032', title: 'Ação Digital Noroeste', type: 'acao_digital', category: 'Digital', description: 'Campanha digital de alcance regional para o noroeste paranaense.', municipality: 'Umuarama', microregion: 'Umuarama', macroregion: 'noroeste', address: 'Online — Noroeste', lat: -23.7700, lng: -53.3200, responsible: 'Roberto Silveira', team: ['Equipe Digital'], plannedDate: '2024-05-01', plannedTime: '00:00', priority: 'media', targetAudience: 'Eleitores online do Noroeste', estimatedImpact: 28000, status: 'realizada', executedDate: '2024-05-01', executedPeopleCount: 31000 },

  // ── OESTE (10 ações) ───────────────────────────────────────────────────────
  { id: 'a033', title: 'Panfletagem Zona Industrial — Cascavel', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material nos portões das indústrias de Cascavel.', municipality: 'Cascavel', microregion: 'Cascavel', macroregion: 'oeste', address: 'Distrito Industrial de Cascavel', lat: -24.9621, lng: -53.4234, responsible: 'Ana Paula Ferreira', team: ['José Carlos', 'Silvia Torres', 'Marcos Pereira'], plannedDate: '2024-04-20', plannedTime: '17:00', priority: 'media', targetAudience: 'Trabalhadores industriais', estimatedImpact: 2000, status: 'realizada', executedDate: '2024-04-20', executedPeopleCount: 2400 },
  { id: 'a034', title: 'Agenda Candidato — Cascavel', type: 'agenda_candidato', category: 'Agenda', description: 'Agenda completa do candidato em Cascavel com eventos em todos os setores.', municipality: 'Cascavel', microregion: 'Cascavel', macroregion: 'oeste', address: 'Parque de Exposições — Cascavel', lat: -24.9450, lng: -53.4700, responsible: 'Ana Paula Ferreira', team: ['Equipe Estadual'], plannedDate: '2024-05-04', plannedTime: '10:00', priority: 'critica', targetAudience: 'Público geral', estimatedImpact: 18000, status: 'realizada', executedDate: '2024-05-04', executedPeopleCount: 21000 },
  { id: 'a035', title: 'Carreata Cascavel', type: 'carreata', category: 'Mobilização', description: 'Grande carreata pelos 4 quadrantes da cidade de Cascavel.', municipality: 'Cascavel', microregion: 'Cascavel', macroregion: 'oeste', address: 'Praça Castelo Branco — Cascavel', lat: -24.9570, lng: -53.4570, responsible: 'Ana Paula Ferreira', team: ['Voluntários Cascavel'], plannedDate: '2024-05-08', plannedTime: '09:00', priority: 'alta', targetAudience: 'Eleitores gerais', estimatedImpact: 10000, status: 'confirmada' },
  { id: 'a036', title: 'Reunião com Empresários — Foz do Iguaçu', type: 'reuniao_empresarios', category: 'Institucional', description: 'Café com associação comercial e industrial de Foz do Iguaçu.', municipality: 'Foz do Iguaçu', microregion: 'Foz do Iguaçu', macroregion: 'oeste', address: 'Hotel Bella Italia — Foz do Iguaçu', lat: -25.5205, lng: -54.5854, responsible: 'Ana Paula Ferreira', team: ['Rafael Santos', 'Daniela Castro'], plannedDate: '2024-04-28', plannedTime: '08:00', priority: 'alta', targetAudience: 'Empresários e lideranças econômicas', estimatedImpact: 280, status: 'realizada', executedDate: '2024-04-28', executedPeopleCount: 310 },
  { id: 'a037', title: 'Evento Turismo — Foz do Iguaçu', type: 'evento_regional', category: 'Regional', description: 'Evento de proposta turística com lideranças do setor e trabalhadores.', municipality: 'Foz do Iguaçu', microregion: 'Foz do Iguaçu', macroregion: 'oeste', address: 'Centro de Convenções — Foz do Iguaçu', lat: -25.5350, lng: -54.5900, responsible: 'Ana Paula Ferreira', team: ['Setor Turismo'], plannedDate: '2024-05-10', plannedTime: '19:00', priority: 'alta', targetAudience: 'Trabalhadores do turismo', estimatedImpact: 5000, status: 'prevista' },
  { id: 'a038', title: 'Panfletagem Centros Comerciais — Toledo', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material nos centros comerciais de Toledo.', municipality: 'Toledo', microregion: 'Toledo', macroregion: 'oeste', address: 'Centro de Toledo', lat: -24.7260, lng: -53.7435, responsible: 'Ana Paula Ferreira', team: ['Lúcia Martins', 'Geraldo Sousa'], plannedDate: '2024-04-27', plannedTime: '09:00', priority: 'media', targetAudience: 'Consumidores', estimatedImpact: 3500, status: 'realizada', executedDate: '2024-04-27', executedPeopleCount: 3800 },
  { id: 'a039', title: 'Reunião Cooagri — Toledo', type: 'reuniao_politica', category: 'Político', description: 'Reunião com diretores da maior cooperativa agrícola de Toledo.', municipality: 'Toledo', microregion: 'Toledo', macroregion: 'oeste', address: 'Sede Coopavel — Toledo', lat: -24.7200, lng: -53.7500, responsible: 'Ana Paula Ferreira', team: ['Assessoria Agrícola'], plannedDate: '2024-05-09', plannedTime: '14:00', priority: 'alta', targetAudience: 'Produtores rurais', estimatedImpact: 8000, status: 'confirmada' },
  { id: 'a040', title: 'Mobilização Medianeira', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Ação comunitária nos bairros de Medianeira com distribuição de material.', municipality: 'Medianeira', microregion: 'Foz do Iguaçu', macroregion: 'oeste', address: 'Medianeira — Centro', lat: -25.2947, lng: -54.0958, responsible: 'Ana Paula Ferreira', team: ['Voluntários Medianeira'], plannedDate: '2024-05-06', plannedTime: '09:00', priority: 'media', targetAudience: 'Moradores locais', estimatedImpact: 2500, status: 'prevista' },
  { id: 'a041', title: 'Carreata Mercedes — Oeste', type: 'carreata', category: 'Mobilização', description: 'Carreata em Mercedes com forte base sojicultora.', municipality: 'Mercedes', microregion: 'Toledo', macroregion: 'oeste', address: 'Centro de Mercedes', lat: -24.4060, lng: -54.1780, responsible: 'Ana Paula Ferreira', team: ['Equipe Oeste'], plannedDate: '2024-05-13', plannedTime: '10:00', priority: 'media', targetAudience: 'Eleitores gerais', estimatedImpact: 1200, status: 'prevista' },
  { id: 'a042', title: 'Ação Digital Oeste', type: 'acao_digital', category: 'Digital', description: 'Campanha digital para eleitores da região Oeste do Paraná.', municipality: 'Cascavel', microregion: 'Cascavel', macroregion: 'oeste', address: 'Online — Oeste', lat: -24.9620, lng: -53.4450, responsible: 'Ana Paula Ferreira', team: ['Equipe Digital'], plannedDate: '2024-05-01', plannedTime: '00:00', priority: 'media', targetAudience: 'Eleitores online Oeste', estimatedImpact: 55000, status: 'realizada', executedDate: '2024-05-01', executedPeopleCount: 61000 },

  // ── SUDOESTE (8 ações) ─────────────────────────────────────────────────────
  { id: 'a043', title: 'Visita à Associação Rural — Pato Branco', type: 'visita_institucional', category: 'Institucional', description: 'Reunião com presidentes de cooperativas e sindicato rural do Sudoeste.', municipality: 'Pato Branco', microregion: 'Pato Branco', macroregion: 'sudoeste', address: 'Sindicato Rural de Pato Branco', lat: -26.2312, lng: -52.6789, responsible: 'Marcelo Cunha', team: ['Elaine Rodrigues', 'Fábio Monteiro'], plannedDate: '2024-04-22', plannedTime: '14:00', priority: 'alta', targetAudience: 'Produtores rurais', estimatedImpact: 450, status: 'realizada', executedDate: '2024-04-22', executedPeopleCount: 520 },
  { id: 'a044', title: 'Carreata Francisco Beltrão', type: 'carreata', category: 'Mobilização', description: 'Grande carreata percorrendo os 4 distritos de Francisco Beltrão.', municipality: 'Francisco Beltrão', microregion: 'Sudoeste', macroregion: 'sudoeste', address: 'Praça Getúlio Vargas — Francisco Beltrão', lat: -26.0814, lng: -53.0540, responsible: 'Marcelo Cunha', team: ['Cíntia Barros', 'Odair Silva', 'Nilton Freitas'], plannedDate: '2024-04-19', plannedTime: '09:00', priority: 'alta', targetAudience: 'Público geral', estimatedImpact: 6000, status: 'realizada', executedDate: '2024-04-19', executedPeopleCount: 7200 },
  { id: 'a045', title: 'Reunião Lideranças Rurais — Pato Branco', type: 'encontro_liderancas', category: 'Político', description: 'Encontro com lideranças rurais do sudoeste paranaense.', municipality: 'Pato Branco', microregion: 'Pato Branco', macroregion: 'sudoeste', address: 'UTFPR — Pato Branco', lat: -26.2250, lng: -52.6750, responsible: 'Marcelo Cunha', team: ['Prof. Sudoeste'], plannedDate: '2024-05-03', plannedTime: '10:00', priority: 'alta', targetAudience: 'Lideranças rurais e acadêmicas', estimatedImpact: 600, status: 'realizada', executedDate: '2024-05-03', executedPeopleCount: 680 },
  { id: 'a046', title: 'Evento Agronegócio — Francisco Beltrão', type: 'evento_regional', category: 'Regional', description: 'Evento com proposta ao agronegócio regional com presença do candidato.', municipality: 'Francisco Beltrão', microregion: 'Sudoeste', macroregion: 'sudoeste', address: 'Parque Exposições — Fco. Beltrão', lat: -26.0780, lng: -53.0590, responsible: 'Marcelo Cunha', team: ['Equipe Sudoeste'], plannedDate: '2024-05-08', plannedTime: '19:00', priority: 'critica', targetAudience: 'Agricultores e cooperativistas', estimatedImpact: 8000, status: 'confirmada' },
  { id: 'a047', title: 'Panfletagem Capanema', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material eleitoral em Capanema e municípios vizinhos.', municipality: 'Capanema', microregion: 'Sudoeste', macroregion: 'sudoeste', address: 'Centro de Capanema', lat: -25.6743, lng: -53.3627, responsible: 'Marcelo Cunha', team: ['Voluntários Capanema'], plannedDate: '2024-05-06', plannedTime: '08:00', priority: 'media', targetAudience: 'Eleitores locais', estimatedImpact: 1800, status: 'prevista' },
  { id: 'a048', title: 'Mobilização Dois Vizinhos', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Ação comunitária em Dois Vizinhos com forte base de colonos.', municipality: 'Dois Vizinhos', microregion: 'Sudoeste', macroregion: 'sudoeste', address: 'Centro de Dois Vizinhos', lat: -25.7518, lng: -53.0532, responsible: 'Marcelo Cunha', team: ['Coord. Municipal'], plannedDate: '2024-05-11', plannedTime: '09:00', priority: 'media', targetAudience: 'Colonos e agricultores', estimatedImpact: 2200, status: 'prevista' },
  { id: 'a049', title: 'Adesivaço Sudoeste — Barracão', type: 'adesivaço', category: 'Campo', description: 'Colagem de adesivos na fronteira com Santa Catarina e Argentina.', municipality: 'Barracão', microregion: 'Sudoeste', macroregion: 'sudoeste', address: 'Centro de Barracão', lat: -26.2507, lng: -53.1815, responsible: 'Marcelo Cunha', team: ['Equipe Fronteira'], plannedDate: '2024-05-09', plannedTime: '07:00', priority: 'baixa', targetAudience: 'Moradores da fronteira', estimatedImpact: 800, status: 'realizada', executedDate: '2024-05-09', executedPeopleCount: 900 },
  { id: 'a050', title: 'Ação Digital Sudoeste', type: 'acao_digital', category: 'Digital', description: 'Campanha digital para eleitores do sudoeste paranaense.', municipality: 'Pato Branco', microregion: 'Pato Branco', macroregion: 'sudoeste', address: 'Online — Sudoeste', lat: -26.2310, lng: -52.6720, responsible: 'Marcelo Cunha', team: ['Equipe Digital'], plannedDate: '2024-05-02', plannedTime: '00:00', priority: 'media', targetAudience: 'Eleitores online Sudoeste', estimatedImpact: 40000, status: 'realizada', executedDate: '2024-05-02', executedPeopleCount: 48000 },

  // ── CENTRO-SUL (6 ações) ───────────────────────────────────────────────────
  { id: 'a051', title: 'Encontro Partidário — Guarapuava', type: 'reuniao_politica', category: 'Político', description: 'Reunião ampliada com filiados e coordenadores do Centro-Sul.', municipality: 'Guarapuava', microregion: 'Guarapuava', macroregion: 'centro_sul', address: 'Clube Bela Vista — Guarapuava', lat: -25.3950, lng: -51.4600, responsible: 'Juliana Teixeira', team: ['Wilson Alves', 'Marcia Lopes'], plannedDate: '2024-04-23', plannedTime: '18:00', priority: 'alta', targetAudience: 'Filiados e coordenadores', estimatedImpact: 800, status: 'atrasada', observations: 'Remarcado por chuvas' },
  { id: 'a052', title: 'Agenda Candidato — Guarapuava', type: 'agenda_candidato', category: 'Agenda', description: 'Visita do candidato a Guarapuava com agenda no hospital e associações.', municipality: 'Guarapuava', microregion: 'Guarapuava', macroregion: 'centro_sul', address: 'HUOP — Hospital Unicentro', lat: -25.3900, lng: -51.4650, responsible: 'Juliana Teixeira', team: ['Equipe Estadual'], plannedDate: '2024-05-07', plannedTime: '10:00', priority: 'critica', targetAudience: 'Público geral', estimatedImpact: 10000, status: 'prevista' },
  { id: 'a053', title: 'Visita Unicentro — Guarapuava', type: 'visita_institucional', category: 'Institucional', description: 'Visita à Universidade Estadual do Centro-Oeste com anúncios para educação.', municipality: 'Guarapuava', microregion: 'Guarapuava', macroregion: 'centro_sul', address: 'UNICENTRO — Guarapuava', lat: -25.3970, lng: -51.4570, responsible: 'Juliana Teixeira', team: ['Assessoria Educação'], plannedDate: '2024-05-12', plannedTime: '14:00', priority: 'alta', targetAudience: 'Acadêmicos e professores', estimatedImpact: 4000, status: 'prevista' },
  { id: 'a054', title: 'Panfletagem Irati Centro', type: 'panfletagem', category: 'Campo', description: 'Panfletagem em Irati cobrindo o centro e zona rural próxima.', municipality: 'Irati', microregion: 'Irati', macroregion: 'centro_sul', address: 'Centro de Irati', lat: -25.4680, lng: -50.6534, responsible: 'Juliana Teixeira', team: ['Voluntários Irati'], plannedDate: '2024-05-05', plannedTime: '08:00', priority: 'media', targetAudience: 'Eleitores locais', estimatedImpact: 2800, status: 'realizada', executedDate: '2024-05-05', executedPeopleCount: 3100 },
  { id: 'a055', title: 'Carreata Centro-Sul — Irati', type: 'carreata', category: 'Mobilização', description: 'Carreata unificada entre Irati e municípios vizinhos.', municipality: 'Irati', microregion: 'Irati', macroregion: 'centro_sul', address: 'Praça dos Expedicionários — Irati', lat: -25.4720, lng: -50.6490, responsible: 'Juliana Teixeira', team: ['Coord. Centro-Sul'], plannedDate: '2024-05-13', plannedTime: '10:00', priority: 'alta', targetAudience: 'Público geral', estimatedImpact: 4500, status: 'confirmada' },
  { id: 'a056', title: 'Ação Digital Centro-Sul', type: 'acao_digital', category: 'Digital', description: 'Impulsionamento segmentado para a região Centro-Sul.', municipality: 'Guarapuava', microregion: 'Guarapuava', macroregion: 'centro_sul', address: 'Online — Centro-Sul', lat: -25.3940, lng: -51.4610, responsible: 'Juliana Teixeira', team: ['Equipe Digital'], plannedDate: '2024-05-03', plannedTime: '00:00', priority: 'media', targetAudience: 'Eleitores online Centro-Sul', estimatedImpact: 32000, status: 'realizada', executedDate: '2024-05-03', executedPeopleCount: 37000 },

  // ── CAMPOS GERAIS (6 ações) ────────────────────────────────────────────────
  { id: 'a057', title: 'Agenda Candidato — Ponta Grossa', type: 'agenda_candidato', category: 'Agenda', description: 'Visita oficial do candidato à cidade com programa completo de agenda.', municipality: 'Ponta Grossa', microregion: 'Ponta Grossa', macroregion: 'campos_gerais', address: 'Praça Barão do Rio Branco — Ponta Grossa', lat: -25.0917, lng: -50.1655, responsible: 'Eduardo Pinheiro', team: ['Simone Ferreira', 'Paulo Henrique'], plannedDate: '2024-05-01', plannedTime: '10:00', priority: 'critica', targetAudience: 'Público geral', estimatedImpact: 12000, status: 'realizada', executedDate: '2024-05-01', executedPeopleCount: 14500 },
  { id: 'a058', title: 'Reunião Empresários ACIPG — Ponta Grossa', type: 'reuniao_empresarios', category: 'Institucional', description: 'Encontro com a Associação Comercial e Industrial de Ponta Grossa.', municipality: 'Ponta Grossa', microregion: 'Ponta Grossa', macroregion: 'campos_gerais', address: 'ACIPG — Ponta Grossa', lat: -25.0960, lng: -50.1620, responsible: 'Eduardo Pinheiro', team: ['Dr. Antônio Menezes'], plannedDate: '2024-05-05', plannedTime: '08:00', priority: 'alta', targetAudience: 'Empresários regionais', estimatedImpact: 4200, status: 'realizada', executedDate: '2024-05-05', executedPeopleCount: 4800 },
  { id: 'a059', title: 'Carreata Ponta Grossa', type: 'carreata', category: 'Mobilização', description: 'Carreata pelos 4 distritos de Ponta Grossa com forte mobilização.', municipality: 'Ponta Grossa', microregion: 'Ponta Grossa', macroregion: 'campos_gerais', address: 'Praça Marechal Floriano — PG', lat: -25.0940, lng: -50.1660, responsible: 'Eduardo Pinheiro', team: ['Voluntários PG'], plannedDate: '2024-05-09', plannedTime: '09:00', priority: 'alta', targetAudience: 'Eleitores gerais', estimatedImpact: 9000, status: 'confirmada' },
  { id: 'a060', title: 'Mobilização Carambeí — Campos Gerais', type: 'mobilizacao_comunitaria', category: 'Mobilização', description: 'Ação em Carambeí com foco em colonos holandeses e cooperativistas.', municipality: 'Carambeí', microregion: 'Ponta Grossa', macroregion: 'campos_gerais', address: 'Centro de Carambeí', lat: -24.9150, lng: -50.0970, responsible: 'Eduardo Pinheiro', team: ['Coord. Municipal'], plannedDate: '2024-05-10', plannedTime: '09:00', priority: 'media', targetAudience: 'Cooperativistas e colonos', estimatedImpact: 2000, status: 'prevista' },
  { id: 'a061', title: 'Evento Educação — Castro', type: 'evento_regional', category: 'Regional', description: 'Evento de proposta educacional com professores e gestores de Castro.', municipality: 'Castro', microregion: 'Campos Gerais', macroregion: 'campos_gerais', address: 'Teatro Municipal — Castro', lat: -24.7903, lng: -50.0117, responsible: 'Eduardo Pinheiro', team: ['Equipe Educação'], plannedDate: '2024-05-14', plannedTime: '19:00', priority: 'media', targetAudience: 'Professores e educadores', estimatedImpact: 1500, status: 'prevista' },
  { id: 'a062', title: 'Ação Digital Campos Gerais', type: 'acao_digital', category: 'Digital', description: 'Campanha digital para eleitores dos Campos Gerais paranaenses.', municipality: 'Ponta Grossa', microregion: 'Ponta Grossa', macroregion: 'campos_gerais', address: 'Online — Campos Gerais', lat: -25.0930, lng: -50.1640, responsible: 'Eduardo Pinheiro', team: ['Equipe Digital'], plannedDate: '2024-05-04', plannedTime: '00:00', priority: 'media', targetAudience: 'Eleitores online Campos Gerais', estimatedImpact: 38000, status: 'realizada', executedDate: '2024-05-04', executedPeopleCount: 43000 },

  // ── NORTE PIONEIRO (5 ações) ───────────────────────────────────────────────
  { id: 'a063', title: 'Ação Digital — Norte Pioneiro', type: 'acao_digital', category: 'Digital', description: 'Impulsionamento de conteúdo segmentado para cidades do Norte Pioneiro.', municipality: 'Cornélio Procópio', microregion: 'Norte Pioneiro', macroregion: 'norte_pioneiro', address: 'Online — Norte Pioneiro', lat: -23.1829, lng: -50.6449, responsible: 'Sônia Batista', team: ['Equipe Digital'], plannedDate: '2024-04-24', plannedTime: '00:00', priority: 'media', targetAudience: 'Usuários de redes sociais', estimatedImpact: 45000, status: 'realizada', executedDate: '2024-04-24', executedPeopleCount: 52000 },
  { id: 'a064', title: 'Reunião Lideranças — Cornélio Procópio', type: 'encontro_liderancas', category: 'Político', description: 'Encontro com lideranças políticas municipais do Norte Pioneiro.', municipality: 'Cornélio Procópio', microregion: 'Norte Pioneiro', macroregion: 'norte_pioneiro', address: 'Câmara Municipal — Cornélio Procópio', lat: -23.1860, lng: -50.6410, responsible: 'Sônia Batista', team: ['Coord. Norte Pioneiro'], plannedDate: '2024-05-03', plannedTime: '18:00', priority: 'alta', targetAudience: 'Lideranças políticas', estimatedImpact: 200, status: 'atrasada', observations: 'Baixa adesão confirmada' },
  { id: 'a065', title: 'Carreata Jacarezinho', type: 'carreata', category: 'Mobilização', description: 'Carreata unificada em Jacarezinho e região cafeeira do Norte Pioneiro.', municipality: 'Jacarezinho', microregion: 'Norte Pioneiro', macroregion: 'norte_pioneiro', address: 'Praça Rui Barbosa — Jacarezinho', lat: -23.1597, lng: -49.9707, responsible: 'Sônia Batista', team: ['Voluntários Norte Pioneiro'], plannedDate: '2024-05-07', plannedTime: '09:00', priority: 'alta', targetAudience: 'Eleitores gerais', estimatedImpact: 3500, status: 'confirmada' },
  { id: 'a066', title: 'Panfletagem Bandeirantes', type: 'panfletagem', category: 'Campo', description: 'Distribuição de material em Bandeirantes e municípios do entorno.', municipality: 'Bandeirantes', microregion: 'Norte Pioneiro', macroregion: 'norte_pioneiro', address: 'Centro de Bandeirantes', lat: -23.1134, lng: -50.3666, responsible: 'Sônia Batista', team: ['Voluntários Bandeirantes'], plannedDate: '2024-05-10', plannedTime: '08:00', priority: 'media', targetAudience: 'Eleitores locais', estimatedImpact: 2000, status: 'prevista' },
  { id: 'a067', title: 'Visita Cooperativa — Santo Antônio da Platina', type: 'visita_institucional', category: 'Institucional', description: 'Visita à cooperativa cafeeira com maior produção do norte pioneiro.', municipality: 'Santo Antônio da Platina', microregion: 'Norte Pioneiro', macroregion: 'norte_pioneiro', address: 'Cooperativa Cafezinho — Platina', lat: -23.3017, lng: -50.0741, responsible: 'Sônia Batista', team: ['Assessoria Agrícola'], plannedDate: '2024-05-12', plannedTime: '10:00', priority: 'media', targetAudience: 'Cafeicultores', estimatedImpact: 1500, status: 'prevista' },
];

// =====================================================
// POLL DATA
// =====================================================
export const pollTimeline: PollTimeline[] = [
  { date: 'Jan/24', candidate: 38.2, rival1: 28.4, rival2: 11.2, undecided: 22.2 },
  { date: 'Fev/24', candidate: 40.1, rival1: 27.8, rival2: 10.9, undecided: 21.2 },
  { date: 'Mar/24', candidate: 41.5, rival1: 27.2, rival2: 11.4, undecided: 19.9 },
  { date: 'Abr/24', candidate: 43.8, rival1: 26.9, rival2: 10.8, undecided: 18.5 },
  { date: 'Mai/24', candidate: 44.2, rival1: 27.3, rival2: 10.5, undecided: 18.0 },
  { date: 'Jun/24', candidate: 45.7, rival1: 26.8, rival2: 10.2, undecided: 17.3 },
  { date: 'Jul/24', candidate: 46.9, rival1: 26.4, rival2: 10.1, undecided: 16.6 },
];

export const polls: PollData[] = [
  { id: 'p001', institute: 'DataParaná', collectionDate: '2024-07-15', releaseDate: '2024-07-18', scope: 'Estadual', territory: 'Paraná', sampleSize: 2000, marginOfError: 2.2, methodology: 'Entrevistas presenciais', scenario: '1º Turno', votingIntention: 46.9, rejection: 24.1, undecided: 16.6, votePool: 58.2 },
  { id: 'p002', institute: 'IBOPE Regional', collectionDate: '2024-07-12', releaseDate: '2024-07-15', scope: 'Regional', territory: 'Curitiba / RMC', sampleSize: 600, marginOfError: 4.0, methodology: 'Telefônica', scenario: '1º Turno', votingIntention: 47.2, rejection: 23.8, undecided: 15.4, votePool: 59.1 },
  { id: 'p003', institute: 'Paraná Pesquisas', collectionDate: '2024-07-10', releaseDate: '2024-07-12', scope: 'Regional', territory: 'Norte Central', sampleSize: 400, marginOfError: 4.9, methodology: 'Online + presencial', scenario: '1º Turno', votingIntention: 42.8, rejection: 26.3, undecided: 19.1, votePool: 54.3 },
  { id: 'p004', institute: 'Instituto Sudoeste', collectionDate: '2024-07-08', releaseDate: '2024-07-10', scope: 'Regional', territory: 'Sudoeste', sampleSize: 350, marginOfError: 5.3, methodology: 'Presencial', scenario: '1º Turno', votingIntention: 51.3, rejection: 19.2, undecided: 14.8, votePool: 63.2 },
  { id: 'p005', institute: 'DataParaná', collectionDate: '2024-07-05', releaseDate: '2024-07-08', scope: 'Regional', territory: 'Noroeste', sampleSize: 300, marginOfError: 5.7, methodology: 'Presencial', scenario: '1º Turno', votingIntention: 36.4, rejection: 31.5, undecided: 22.8, votePool: 47.1 },
  { id: 'p006', institute: 'Paraná Pesquisas', collectionDate: '2024-07-03', releaseDate: '2024-07-05', scope: 'Regional', territory: 'Norte Pioneiro', sampleSize: 280, marginOfError: 5.9, methodology: 'Presencial', scenario: '1º Turno', votingIntention: 38.2, rejection: 29.4, undecided: 21.3, votePool: 48.5 },
];

// =====================================================
// POLITICAL ASSETS
// =====================================================
export const politicalAssets: PoliticalAsset[] = [
  { id: 'pa001', name: 'Eduardo Silvano', type: 'prefeito', municipality: 'Cascavel', microregion: 'Cascavel', macroregion: 'oeste', position: 'Prefeito de Cascavel', influenceLevel: 9, alignmentStatus: 'alinhado', supportStatus: 'Apoio público declarado', observations: 'Parceiro estratégico no Oeste. Garantiu estrutura de campo.', lat: -24.9557, lng: -53.4558 },
  { id: 'pa002', name: 'Maria Helena Borges', type: 'prefeito', municipality: 'Francisco Beltrão', microregion: 'Sudoeste', macroregion: 'sudoeste', position: 'Prefeita de Francisco Beltrão', influenceLevel: 8, alignmentStatus: 'alinhado', supportStatus: 'Apoio público declarado', observations: 'Liderança feminina estratégica no Sudoeste.', lat: -26.0814, lng: -53.0540 },
  { id: 'pa003', name: 'Roberto Andrade', type: 'ex_prefeito', municipality: 'Londrina', microregion: 'Londrina', macroregion: 'norte_central', position: 'Ex-Prefeito de Londrina (2016-2020)', influenceLevel: 7, alignmentStatus: 'provavel', supportStatus: 'Em negociação', observations: 'Tem rede de 12 vereadores aliados. Negociação em andamento.', lat: -23.3045, lng: -51.1696 },
  { id: 'pa004', name: 'Claudia Fernandes', type: 'vereador', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', position: 'Vereadora de Curitiba — 3º mandato', influenceLevel: 8, alignmentStatus: 'alinhado', supportStatus: 'Coordenadora de Base na RMC', observations: 'Articuladora política na zona sul de Curitiba. Alta influência comunitária.', lat: -25.4900, lng: -49.2800 },
  { id: 'pa005', name: 'Pastor Gilson Neves', type: 'lideranca_religiosa', municipality: 'Maringá', microregion: 'Maringá', macroregion: 'norte_central', position: 'Pastor — Igreja Assembleia de Deus', influenceLevel: 9, alignmentStatus: 'alinhado', supportStatus: 'Apoio formal confirmado', observations: 'Mais de 15.000 fiéis. Influência em todo Norte Central.', lat: -23.4273, lng: -51.9375 },
  { id: 'pa006', name: 'Dr. Antônio Menezes', type: 'lideranca_empresarial', municipality: 'Ponta Grossa', microregion: 'Ponta Grossa', macroregion: 'campos_gerais', position: 'Presidente ACIPG', influenceLevel: 8, alignmentStatus: 'provavel', supportStatus: 'Reunião marcada', observations: 'Representa 4.200 empresas. Decisivo nos Campos Gerais.', lat: -25.0945, lng: -50.1633 },
  { id: 'pa007', name: 'Benedito Carneiro', type: 'prefeito', municipality: 'Guarapuava', microregion: 'Guarapuava', macroregion: 'centro_sul', position: 'Prefeito de Guarapuava', influenceLevel: 7, alignmentStatus: 'neutro', supportStatus: 'Aguardando definição', observations: 'Posição indefinida. Pressão da base local necessária.', lat: -25.3950, lng: -51.4600 },
  { id: 'pa008', name: 'Joselito Campos', type: 'influenciador_regional', municipality: 'Foz do Iguaçu', microregion: 'Foz do Iguaçu', macroregion: 'oeste', position: 'Radialista e digital influencer', influenceLevel: 7, alignmentStatus: 'alinhado', supportStatus: 'Parceiro de comunicação', observations: 'Programa de rádio com 200k ouvintes. Posts com alto alcance no WhatsApp.', lat: -25.5478, lng: -54.5882 },
  { id: 'pa009', name: 'Padre Arlindo Costa', type: 'lideranca_religiosa', municipality: 'Toledo', microregion: 'Toledo', macroregion: 'oeste', position: 'Pároco — Diocese de Toledo', influenceLevel: 6, alignmentStatus: 'neutro', supportStatus: 'Contato inicial realizado', observations: 'Influência em 22 paróquias da região Oeste.', lat: -24.7260, lng: -53.7435 },
  { id: 'pa010', name: 'Sérgio Monteiro', type: 'coordenador_partidario', municipality: 'Umuarama', microregion: 'Umuarama', macroregion: 'noroeste', position: 'Presidente Municipal do Partido', influenceLevel: 5, alignmentStatus: 'alinhado', supportStatus: 'Base confirmada', observations: 'Estrutura partidária fraca na região. Precisa de reforço.', lat: -23.7669, lng: -53.3243 },
  { id: 'pa011', name: 'Vera Lúcia Moraes', type: 'lideranca_comunitaria', municipality: 'Curitiba', microregion: 'Curitiba', macroregion: 'rmc', position: 'Presidente Conselho Comunitário Bairro Alto', influenceLevel: 7, alignmentStatus: 'alinhado', supportStatus: 'Mobilizadora ativa', observations: 'Referência na periferia norte de Curitiba. Rede de 800 líderes de rua.', lat: -25.3500, lng: -49.2900 },
  { id: 'pa012', name: 'Coronel Belmiro Saraiva', type: 'ex_vereador', municipality: 'Paranaguá', microregion: 'Litoral', macroregion: 'rmc', position: 'Ex-vereador e liderança do litoral', influenceLevel: 6, alignmentStatus: 'provavel', supportStatus: 'Em conversa', observations: 'Forte no litoral. Pode mobilizar municípios litorâneos.', lat: -25.5196, lng: -48.5073 },
];

// =====================================================
// ALERTS
// =====================================================
export const alerts: Alert[] = [
  { id: 'al001', level: 'critico', title: 'Noroeste em queda nas pesquisas', description: 'Macrorregião Noroeste registrou queda de 4.2pp na intenção de voto nos últimos 30 dias. Score de engajamento em 38 — Nível RISCO.', territory: 'Noroeste', macroregion: 'noroeste', recommendation: 'Acionar coordenação regional com urgência. Planejar agenda do candidato na região. Mínimo 3 eventos de grande impacto nas próximas 2 semanas.', createdAt: '2024-07-18T09:00:00Z', isRead: false },
  { id: 'al002', level: 'critico', title: 'Norte Pioneiro: alta taxa de indecisos + baixa presença', description: '21.3% de indecisos registrados na pesquisa + apenas 31 ações realizadas de 58 previstas. Combinação de risco alto.', territory: 'Norte Pioneiro', macroregion: 'norte_pioneiro', recommendation: 'Reforçar coordenação com Sônia Batista. Mobilizar lideranças municipais locais. Priorizar porta-a-porta nos municípios com maior concentração de indecisos.', createdAt: '2024-07-18T08:30:00Z', isRead: false },
  { id: 'al003', level: 'atencao', title: 'Centro-Sul: execução abaixo da meta', description: 'Taxa de execução em 63% (34/54 ações). Guarapuava com prefeito indefinido. Score em queda para 55.', territory: 'Centro-Sul', macroregion: 'centro_sul', recommendation: 'Cobrar execução pendente. Priorizar reunião com prefeito Benedito Carneiro para definição de posicionamento.', createdAt: '2024-07-17T14:00:00Z', isRead: false },
  { id: 'al004', level: 'atencao', title: 'Campos Gerais: potencial subutilizado', description: 'Ponta Grossa tem 228k eleitores mas apenas 14 ações realizadas. Score de 63 pode evoluir com reforço.', territory: 'Ponta Grossa', macroregion: 'campos_gerais', recommendation: 'Agendar agenda do candidato em Ponta Grossa. Mobilizar liderança empresarial (Dr. Antônio Menezes). Alto potencial de conversão.', createdAt: '2024-07-17T11:00:00Z', isRead: true },
  { id: 'al005', level: 'atencao', title: 'Umuarama: 0 ações realizadas na última semana', description: 'Região de Umuarama não registrou execuções nos últimos 7 dias. Coordenação regional sem resposta.', territory: 'Umuarama', macroregion: 'noroeste', recommendation: 'Contatar Roberto Silveira. Verificar estrutura operacional. Considerar reforço de campo externo para a região.', createdAt: '2024-07-16T09:00:00Z', isRead: true },
  { id: 'al006', level: 'oportunidade', title: 'Sudoeste: desempenho acima da média', description: 'Macrorregião Sudoeste com score 84 e intenção de 51.3% — melhor resultado regional. Potencial de consolidação.', territory: 'Sudoeste', macroregion: 'sudoeste', recommendation: 'Usar modelo de organização do Sudoeste como referência para outras regiões. Pode servir como região-âncora em 2º turno eventual.', createdAt: '2024-07-15T10:00:00Z', isRead: true },
  { id: 'al007', level: 'oportunidade', title: 'Londrina: base crescendo após carreata', description: 'Engajamento em Londrina subiu 8 pontos após carreata de 04/18. 9.200 pessoas impactadas. Momento favorável.', territory: 'Londrina', macroregion: 'norte_central', recommendation: 'Manter ritmo em Londrina. Marcar segunda carreata em bairros populares nos próximos 15 dias. Alta receptividade identificada.', createdAt: '2024-07-14T09:00:00Z', isRead: true },
  { id: 'al008', level: 'info', title: 'RMC: agenda do candidato em Curitiba confirmada', description: 'Evento de grande porte confirmado para próxima semana em Curitiba. Estimativa de 15.000 presentes.', territory: 'Curitiba', macroregion: 'rmc', recommendation: 'Mobilizar estrutura completa. Acionar todas as lideranças da RMC para garantir público máximo.', createdAt: '2024-07-13T15:00:00Z', isRead: true },
];

// =====================================================
// TEAM MEMBERS
// =====================================================
export const teamMembers: TeamMember[] = [
  { id: 'tm001', name: 'Dr. José Moreira', role: 'Coordenador Geral da Campanha', level: 1, actionsManaged: 646, completionRate: 67, phone: '(41) 99901-0001' },
  { id: 'tm002', name: 'Senadora Patrícia Valle', role: 'Coordenadora Política Estadual', level: 1, actionsManaged: 380, completionRate: 72, phone: '(41) 99901-0002' },
  { id: 'tm003', name: 'Adv. Ricardo Torres', role: 'Coordenador Jurídico Estadual', level: 1, actionsManaged: 45, completionRate: 89, phone: '(41) 99901-0003' },
  { id: 'tm004', name: 'Paulo Henrique Marques', role: 'Coordenador de Marketing e Comunicação', level: 1, actionsManaged: 198, completionRate: 81, phone: '(41) 99901-0004' },
  { id: 'tm005', name: 'Dra. Larissa Campos', role: 'Coordenadora de Dados e Inteligência', level: 1, actionsManaged: 86, completionRate: 94, phone: '(41) 99901-0005' },
  { id: 'tm006', name: 'Carlos Mendonça', role: 'Coordenador Geral RMC', level: 2, region: 'rmc', actionsManaged: 142, completionRate: 78, phone: '(41) 99902-0001' },
  { id: 'tm007', name: 'Fernanda Rocha', role: 'Coordenadora Geral Norte Central', level: 2, region: 'norte_central', actionsManaged: 98, completionRate: 65, phone: '(44) 99902-0002' },
  { id: 'tm008', name: 'Roberto Silveira', role: 'Coordenador Geral Noroeste', level: 2, region: 'noroeste', actionsManaged: 67, completionRate: 42, phone: '(44) 99902-0003' },
  { id: 'tm009', name: 'Ana Paula Ferreira', role: 'Coordenadora Geral Oeste', level: 2, region: 'oeste', actionsManaged: 88, completionRate: 80, phone: '(45) 99902-0004' },
  { id: 'tm010', name: 'Marcelo Cunha', role: 'Coordenador Geral Sudoeste', level: 2, region: 'sudoeste', actionsManaged: 76, completionRate: 92, phone: '(46) 99902-0005' },
  { id: 'tm011', name: 'Juliana Teixeira', role: 'Coordenadora Geral Centro-Sul', level: 2, region: 'centro_sul', actionsManaged: 54, completionRate: 63, phone: '(42) 99902-0006' },
  { id: 'tm012', name: 'Eduardo Pinheiro', role: 'Coordenador Geral Campos Gerais', level: 2, region: 'campos_gerais', actionsManaged: 63, completionRate: 71, phone: '(42) 99902-0007' },
  { id: 'tm013', name: 'Sônia Batista', role: 'Coordenadora Geral Norte Pioneiro', level: 2, region: 'norte_pioneiro', actionsManaged: 58, completionRate: 53, phone: '(43) 99902-0008' },
];

// =====================================================
// KPI CALCULATIONS
// =====================================================
export const globalKPIs = {
  totalActions: actions.length + 131,
  completedActions: actions.filter(a => a.status === 'realizada').length + 94,
  delayedActions: actions.filter(a => a.status === 'atrasada').length + 7,
  pendingValidation: 14,
  totalPeopleImpacted: 1268000,
  municipalitiesCovered: 287,
  totalMunicipalities: 399,
  currentPollScore: 46.9,
  pollTrend: '+0.6pp',
  engagementScore: 64,
  executionRate: 72,
};

export const getEngagementLevel = (score: number): EngagementLevel => {
  if (score <= 30) return 'risco';
  if (score <= 60) return 'atencao';
  if (score <= 80) return 'competitivo';
  return 'consolidado';
};

export const getEngagementColor = (score: number): string => {
  if (score <= 30) return '#ef4444';
  if (score <= 60) return '#f59e0b';
  if (score <= 80) return '#3b82f6';
  return '#22c55e';
};

export const getStatusColor = (status: ActionStatus): string => {
  const colors: Record<ActionStatus, string> = {
    prevista: '#60a5fa',
    confirmada: '#818cf8',
    em_andamento: '#f59e0b',
    realizada: '#22c55e',
    atrasada: '#ef4444',
    cancelada: '#6b7280',
    pendente_validacao: '#f97316',
  };
  return colors[status];
};

export const getStatusLabel = (status: ActionStatus): string => {
  const labels: Record<ActionStatus, string> = {
    prevista: 'Prevista',
    confirmada: 'Confirmada',
    em_andamento: 'Em Andamento',
    realizada: 'Realizada',
    atrasada: 'Atrasada',
    cancelada: 'Cancelada',
    pendente_validacao: 'Pend. Validação',
  };
  return labels[status];
};

export const getActionTypeLabel = (type: ActionType): string => {
  const labels: Record<ActionType, string> = {
    reuniao_politica: 'Reunião Política',
    visita_institucional: 'Visita Institucional',
    mobilizacao_comunitaria: 'Mobilização Comunitária',
    adesivaço: 'Adesivaço',
    panfletagem: 'Panfletagem',
    carreata: 'Carreata',
    evento_regional: 'Evento Regional',
    agenda_candidato: 'Agenda do Candidato',
    reuniao_empresarios: 'Reunião Empresários',
    encontro_liderancas: 'Encontro Lideranças',
    acao_digital: 'Ação Digital',
  };
  return labels[type];
};

export const getAlignmentLabel = (status: AlignmentStatus): string => {
  const labels: Record<AlignmentStatus, string> = {
    alinhado: 'Alinhado',
    provavel: 'Provável',
    neutro: 'Neutro',
    oposicao: 'Oposição',
    indefinido: 'Indefinido',
  };
  return labels[status];
};

export const getAlignmentColor = (status: AlignmentStatus): string => {
  const colors: Record<AlignmentStatus, string> = {
    alinhado: '#22c55e',
    provavel: '#3b82f6',
    neutro: '#f59e0b',
    oposicao: '#ef4444',
    indefinido: '#6b7280',
  };
  return colors[status];
};

export const getAssetTypeLabel = (type: AssetType): string => {
  const labels: Record<AssetType, string> = {
    prefeito: 'Prefeito',
    ex_prefeito: 'Ex-Prefeito',
    vereador: 'Vereador',
    ex_vereador: 'Ex-Vereador',
    lideranca_comunitaria: 'Lider. Comunitária',
    lideranca_empresarial: 'Lider. Empresarial',
    lideranca_religiosa: 'Lider. Religiosa',
    presidente_entidade: 'Pres. de Entidade',
    influenciador_regional: 'Influenciador Regional',
    coordenador_partidario: 'Coord. Partidário',
  };
  return labels[type];
};
