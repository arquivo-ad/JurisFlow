// ==========================================
// JURISFLOW - SAAS JURÍDICO MULTI-TENANT TYPES
// ==========================================

export type UUID = string;

// --- TENANT & ORG HIERARCHY ---
export interface Tenant {
  id: UUID;
  name: string;
  tradeName?: string;
  cnpj: string;
  oabOfficeRegister?: string;
  slug: string;
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  active: boolean;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  settings: {
    cpcCountDaysDefault: boolean;
    notifyDeadlinesDaysBefore: number[];
    currency: string;
    pixKey?: string;
    mercadopagoConfigured: boolean;
  };
  createdAt: string;
}

export interface Branch {
  id: UUID;
  tenantId: UUID;
  name: string;
  code: string;
  city: string;
  state: string;
  isMain: boolean;
  address: string;
  phone?: string;
  email?: string;
}

export interface Department {
  id: UUID;
  tenantId: UUID;
  branchId: UUID;
  name: string;
  code: string;
  description?: string;
}

export interface Team {
  id: UUID;
  tenantId: UUID;
  departmentId: UUID;
  name: string;
  leaderId?: UUID;
}

export interface User {
  id: UUID;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  oabNumber?: string;
  oabUf?: string;
  active: boolean;
  createdAt: string;
}

export type RoleCode = 
  | 'SUPER_ADMIN'
  | 'SOCIO_ADMIN'
  | 'ADVOGADO_SENIOR'
  | 'ADVOGADO_PLENO'
  | 'ADVOGADO_JUNIOR'
  | 'PARALEGAL_ESTAGIARIO'
  | 'FINANCEIRO'
  | 'SECRETARIA'
  | 'AUDITOR_COMPLIANCE';

export interface Role {
  id: UUID;
  tenantId: UUID;
  code: RoleCode;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
}

export interface Permission {
  code: string;
  resource: 'CASES' | 'CLIENTS' | 'FINANCIAL' | 'DOCUMENTS' | 'SETTINGS' | 'AI_GATEWAY' | 'AUDIT' | 'DEADLINES';
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'APPROVE' | 'EXPORT';
  effect: 'ALLOW' | 'DENY';
}

export interface Membership {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  user?: User;
  roleId: UUID;
  role?: Role;
  branchId: UUID;
  departmentId?: UUID;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  scopes: string[];
}

// --- AUDIT & LGPD ---
export interface AuditLog {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  userName: string;
  userEmail: string;
  entityType: 'CASE' | 'CLIENT' | 'PERSON' | 'DOCUMENT' | 'PAYMENT' | 'DEADLINE' | 'AI_REQUEST' | 'AUTH';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW_SENSITIVE' | 'EXPORT' | 'SIMULATE_PAYMENT' | 'GENERATE_AI';
  details: string;
  ip: string;
  userAgent?: string;
  timestamp: string;
  diff?: Record<string, { before: unknown; after: unknown }>;
}

export interface LGPDConsent {
  id: UUID;
  tenantId: UUID;
  personId: UUID;
  personName: string;
  consentType: 'DADOS_CADASTRAIS' | 'REPRESENTACAO_JUDICIAL' | 'MARKETING_INFORMATIVOS' | 'COMPARTILHAMENTO_PERITOS';
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  grantedAt: string;
  revokedAt?: string;
  termsVersion: string;
  ip: string;
}

// --- CRM & PERSONS ---
export type PersonType = 'PF' | 'PJ';

export interface Person {
  id: UUID;
  tenantId: UUID;
  type: PersonType;
  name: string;
  tradeName?: string;
  document: string; // CPF or CNPJ
  stateRegOrRg?: string;
  email: string;
  phone: string;
  mobilePhone?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  maritalStatus?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';
  profession?: string;
  nationality?: string;
  oabNumber?: string;
  oabUf?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
}

export interface Client {
  id: UUID;
  tenantId: UUID;
  personId: UUID;
  person?: Person;
  clientCode: string;
  status: 'ACTIVE' | 'PROSPECT' | 'INACTIVE' | 'ARCHIVED';
  origin: 'INDICACAO' | 'SITE' | 'REDES_SOCIAIS' | 'CONTATO_DIRETO' | 'PARCEIRO' | 'EVENTO';
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  totalCasesCount: number;
  totalReceivablesBrl: number;
  assignedLawyerId?: UUID;
  createdDate: string;
}

// --- JURÍDICO & PROCESSOS ---
export type CaseType = 'JUDICIAL' | 'ADMINISTRATIVE' | 'CONSULTING' | 'OTHER';
export type CaseStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';
export type LegalArea = 
  | 'CIVIL' 
  | 'TRABALHISTA' 
  | 'TRIBUTARIO' 
  | 'FAMILIA' 
  | 'EMPRESARIAL' 
  | 'PREVIDENCIARIO' 
  | 'PENAL' 
  | 'CONSUMIDOR'
  | 'AMBIENTAL';

export type PartyRole = 
  | 'AUTOR' 
  | 'REU' 
  | 'TERCEIRO_INTERESSADO' 
  | 'TESTEMUNHA' 
  | 'PERITO' 
  | 'ADVOGADO_CONTRARIO' 
  | 'ASSISTENTE_TECNICO' 
  | 'LITISCONSORTE';

export interface CaseParty {
  id: UUID;
  tenantId: UUID;
  caseId: UUID;
  personId: UUID;
  person?: Person;
  role: PartyRole;
  isMainClient: boolean;
  notes?: string;
}

export interface Case {
  id: UUID;
  tenantId: UUID;
  branchId: UUID;
  title: string;
  caseNumber: string; // CNJ format: 0000000-00.0000.8.00.0000 or Admin ID
  type: CaseType;
  status: CaseStatus;
  legalArea: LegalArea;
  court: string; // e.g. TJSP, TRT-2, TRF-3, STJ, CARF, PROCON
  judicialBranch: string; // e.g. 5ª Vara Cível Central da Comarca de São Paulo
  judgeName?: string;
  claimValue: number;
  contingencyRisk: 'PROBABLE' | 'POSSIBLE' | 'REMOTE';
  distributionDate: string;
  phase: 'INICIAL' | 'INSTRUCAO' | 'DECISAO' | 'RECURSAL' | 'EXECUCAO' | 'ARQUIVADO';
  responsibleLawyerId: UUID;
  responsibleLawyerName?: string;
  parties: CaseParty[];
  movementsCount: number;
  deadlinesCount: number;
  notes?: string;
  folderId?: UUID;
  createdAt: string;
  updatedAt: string;
}

export type MovementSource = 'MANUAL' | 'COURT_API' | 'PUBLICATION' | 'IMPORT' | 'SYSTEM';

export interface Movement {
  id: UUID;
  tenantId: UUID;
  caseId: UUID;
  date: string;
  title: string;
  content: string;
  source: MovementSource;
  rawSourceData?: string;
  isRead: boolean;
  createdBy: string;
  createdAt: string;
}

export type DeadlineCalcType = 'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT';
export type DeadlineStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface Deadline {
  id: UUID;
  tenantId: UUID;
  caseId?: UUID;
  caseTitle?: string;
  caseNumber?: string;
  title: string;
  description: string;
  origin: 'INTIMACAO' | 'DECISAO' | 'DESPACHO' | 'AUDIENCIA' | 'INTERNO' | 'CONTRATUAL';
  publishDate: string;
  startDate: string;
  dueDate: string;
  fatalDate: string;
  daysCount: number;
  calculationType: DeadlineCalcType;
  responsibleUserId: UUID;
  responsibleUserName?: string;
  status: DeadlineStatus;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
}

export type HearingType = 
  | 'CONCILIACAO' 
  | 'INSTRUCAO_JULGAMENTO' 
  | 'INICIAL' 
  | 'UNA' 
  | 'PERICIAL' 
  | 'SUSTENTACAO_ORAL';

export interface Hearing {
  id: UUID;
  tenantId: UUID;
  caseId: UUID;
  caseTitle?: string;
  caseNumber?: string;
  title: string;
  type: HearingType;
  dateTime: string;
  locationType: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
  addressOrLink: string;
  courtName: string;
  responsibleLawyerId: UUID;
  responsibleLawyerName?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'HELD' | 'CANCELLED' | 'REDESIGNED';
  notes?: string;
  createdAt: string;
}

export interface Diligence {
  id: UUID;
  tenantId: UUID;
  caseId: UUID;
  caseNumber?: string;
  title: string;
  location: string;
  dueDate: string;
  executorUserId: UUID;
  executorUserName?: string;
  costEstimate: number;
  actualCost: number;
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_ROUTE' | 'DONE' | 'CANCELLED';
  report?: string;
  createdAt: string;
}

export interface Task {
  id: UUID;
  tenantId: UUID;
  caseId?: UUID;
  caseNumber?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  assignedUserId: UUID;
  assignedUserName?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  createdAt: string;
}

export interface Notification {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  title: string;
  message: string;
  type: 'DEADLINE_ALERT' | 'HEARING_ALERT' | 'PAYMENT_RECEIVED' | 'MOVEMENT_NEW' | 'SYSTEM' | 'AI_COMPLETE';
  read: boolean;
  link?: string;
  createdAt: string;
}

// --- DOCUMENTOS ---
export type DocumentCategory = 
  | 'PETICAO' 
  | 'CONTRATO' 
  | 'PROCURACAO' 
  | 'DECISAO' 
  | 'PROVA' 
  | 'NOTIFICACAO' 
  | 'PARECER' 
  | 'OUTRO';

export interface DocumentVersion {
  id: UUID;
  documentId: UUID;
  versionNumber: number;
  content: string;
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentFolder {
  id: UUID;
  tenantId: UUID;
  name: string;
  parentId?: UUID;
  color?: string;
  icon?: string;
}

export interface DocumentItem {
  id: UUID;
  tenantId: UUID;
  title: string;
  description: string;
  category: DocumentCategory;
  folderId?: UUID;
  caseId?: UUID;
  caseNumber?: string;
  personId?: UUID;
  personName?: string;
  currentVersion: number;
  fileSize: number; // in bytes
  fileType: string;
  isDraft: boolean;
  content: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'FILED' | 'ARCHIVED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: UUID;
  tenantId: UUID;
  name?: string;
  title?: string;
  category: DocumentCategory;
  templateContent: string;
  placeholders?: string[];
  variables?: string[];
  description: string;
}

export type CaseMovement = Movement;

export interface Lead {
  id: UUID;
  tenantId: UUID;
  personId: UUID;
  person?: Person;
  leadCode?: string;
  source: string;
  stage: 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  estimatedValue?: number;
  expectedCloseDate?: string;
  notes?: string;
  assignedUserId?: UUID;
  createdAt: string;
}

export interface BootstrapData {
  tenants: Tenant[];
  currentTenant: Tenant;
  branches: Branch[];
  currentBranch: Branch;
  users: User[];
  currentUser: User;
  dashboard: any;
  financial: FinancialOverviewMetrics;
  persons: Person[];
  clients: (Client & { person?: Person })[];
  leads: (Lead & { person?: Person })[];
  cases: Case[];
  deadlines: Deadline[];
  hearings: Hearing[];
  diligences: Diligence[];
  tasks?: Task[];
  notifications?: Notification[];
  documents: DocumentItem[];
  templates: DocumentTemplate[];
  contracts: FeeContract[];
  receivables: AccountReceivable[];
  roles: Role[];
  auditLogs: AuditLog[];
  lgpdConsents: LGPDConsent[];
}


// --- FINANCEIRO & MERCADO PAGO ---
export type FeeContractType = 'FIXED' | 'SUCCESS_FEE' | 'RETAINER_MONTHLY' | 'HOURLY' | 'HYBRID';

export interface FeeContract {
  id: UUID;
  tenantId: UUID;
  clientId: UUID;
  clientName?: string;
  caseId?: UUID;
  caseNumber?: string;
  contractNumber: string;
  title: string;
  type: FeeContractType;
  totalValue: number;
  successPercentage?: number;
  retainerMonthlyValue?: number;
  hourlyRate?: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  installmentsCount: number;
  createdAt: string;
}

export interface Installment {
  id: UUID;
  tenantId: UUID;
  feeContractId: UUID;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELLED';
  penaltyPercentage: number;
  interestMonthlyPercentage: number;
  paidAmount?: number;
  paidDate?: string;
  chargeId?: UUID;
}

export interface AccountReceivable {
  id: UUID;
  tenantId: UUID;
  clientId: UUID;
  clientName?: string;
  caseId?: UUID;
  caseNumber?: string;
  installmentId?: UUID;
  title: string;
  amount: number;
  dueDate: string;
  status: 'OPEN' | 'OVERDUE' | 'RECEIVED' | 'RENEGOTIATED' | 'WRITEOFF';
  charge?: Charge;
}

export interface Charge {
  id: UUID;
  tenantId: UUID;
  accountReceivableId: UUID;
  amount: number;
  method: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  mpPaymentId?: string;
  mpStatus: 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled';
  pixQrCode?: string;
  pixCopiaECola?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
  expiresAt: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED';
  createdAt: string;
}

export interface Payment {
  id: UUID;
  tenantId: UUID;
  chargeId: UUID;
  accountReceivableId: UUID;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  receiptNumber: string;
  notes?: string;
}

// --- AI GATEWAY ---
export type AIFeature = 
  | 'CASE_SUMMARY' 
  | 'DEADLINE_EXTRACT' 
  | 'DOCUMENT_DRAFT' 
  | 'RISK_ANALYSIS' 
  | 'LEGAL_CHAT' 
  | 'CONTRACT_REVIEW';

export interface AIGatewayLog {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  userName: string;
  feature: AIFeature;
  promptTokens: number;
  completionTokens: number;
  estimatedCostBRL: number;
  executionTimeMs: number;
  status: 'SUCCESS' | 'ERROR';
  modelUsed: string;
  createdAt: string;
}

export interface AIExtractDeadlineResponse {
  prazoIdentificado: boolean;
  titulo: string;
  dias: number;
  tipoContagem: DeadlineCalcType;
  origem: string;
  dataPublicacao?: string;
  dataTermoInicial?: string;
  dataVencimentoEstimada?: string;
  acaoRequerida: string;
  fundamentacaoLegal: string;
  partesIdentificadas: string[];
  tribunalVaraIdentificados?: string;
  pontosAtencao: string[];
}

export interface AIDraftPieceResponse {
  tituloPeca: string;
  tipoPeca: string;
  cabecalho: string;
  dosFatos: string;
  doDireito: string;
  dosPedidos: string;
  valorCausaSugerido?: number;
  jurisprudenciaCitada: string[];
  artigosLei: string[];
  provasRequeridas: string[];
  textoCompletoFormatado: string;
}

export interface AICaseSummaryResponse {
  sinteseFatos: string;
  faseProcessualAtual: string;
  pontosControversos: string[];
  proximosPassosRecomendados: string[];
  grauRisco: 'PROBABLE' | 'POSSIBLE' | 'REMOTE';
  justificativaRisco: string;
  resumoFinanceiro: string;
}

// --- FINANCIAL OVERVIEW ---
export interface FinancialOverviewMetrics {
  totalFaturadoMes: number;
  totalRecebidoMes: number;
  totalAReceberAberto: number;
  totalInadimplente: number;
  taxaInadimplencia: number;
  honorariosExitoPrevisao: number;
  receitaMesAMes: { month: string; previsto: number; realizado: number }[];
  distribuicaoPorTipo: { tipo: string; valor: number; percentual: number }[];
}

// --- SEARCH ---
export interface GlobalSearchResult {
  id: string;
  type: 'CASE' | 'CLIENT' | 'PERSON' | 'DOCUMENT' | 'DEADLINE';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  linkAction: { module: string; entityId: string };
}
