// ==========================================
// JURISFLOW - SAAS JURÍDICO MULTI-TENANT TYPES
// ==========================================

export type UUID = string;

// --- TENANT & ORG HIERARCHY ---
export interface TenantVisualIdentity {
  logoUrl?: string;
  logoPosition?: 'left' | 'center' | 'right';
  signatureImageUrl?: string;
  signatoryName?: string;
  signatoryOab?: string;
  signatoryRole?: string;
  headerAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  footerText?: string;
  // Discrete field display toggles (address, phone, email, etc are optional)
  showHeaderAddress?: boolean;
  showHeaderPhone?: boolean;
  showHeaderEmail?: boolean;
  showHeaderCnpj?: boolean;
  showHeaderOab?: boolean;
  showFooterAddress?: boolean;
  showFooterPhone?: boolean;
  showFooterEmail?: boolean;
  showFooterText?: boolean;
  showDigitalSignatureSeal?: boolean;
  // Visual layout & design customization
  headerStyle?: 'FULL_BANNER' | 'MINIMALIST' | 'MODERN_BAR' | 'CLASSIC_CENTERED' | 'SIDE_BY_SIDE' | 'CUSTOM_DESIGN' | 'OFFICIAL_EMBLEM' | 'MODERN' | 'CLASSIC';
  headerBannerUrl?: string; // High-resolution cropped official header banner
  pageBackgroundUrl?: string; // Full official letterhead page background
  bannerHeightRatio?: number;
  accentColor?: string;
  borderStyle?: 'SOLID' | 'DOUBLE' | 'DASHED' | 'NONE';
  borderWidth?: '1px' | '2px' | '3px' | '4px';
  logoMaxHeight?: number; // in px
  headerPadding?: 'COMPACT' | 'NORMAL' | 'SPACIOUS';
  fontFamily?: 'Arial' | 'Times New Roman' | 'Calibri' | 'Garamond' | 'Georgia';
  bodyFontSize?: '11pt' | '12pt' | '13pt';
  lineSpacing?: '1.0' | '1.15' | '1.5';
  paragraphIndent?: boolean;
  citationIndent?: boolean;
  closingFormula?: string;
  jurisprudenceStyle?: 'EMENDA_INTEGRAL' | 'DESTAQUE_ENXUTO';
  editorialTone?: 'TECNICO_DIRETO' | 'COMBATIVO_ELOQUENTE' | 'CONCILIATORIO';
  attachedLetterheadFile?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl?: string;
    headerBannerUrl?: string;
    pageBackgroundUrl?: string;
    uploadedAt: string;
    detectedFonts?: string[];
    detectedColors?: string[];
    headerHtml?: string;
    footerHtml?: string;
  };
  templates?: {
    id: string;
    name: string;
    category: string;
    content: string;
    htmlContent?: string;
    isDefault?: boolean;
    description?: string;
    variables?: string[];
    attachedFile?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl?: string;
      uploadedAt: string;
    };
    layoutStyle?: {
      fontFamily?: string;
      fontSize?: string;
      lineSpacing?: string;
      accentColor?: string;
      headerIncluded?: boolean;
      footerIncluded?: boolean;
    };
  }[];
}

export interface Tenant {
  id: UUID;
  name: string;
  tradeName?: string;
  cnpj: string;
  oabOfficeRegister?: string;
  slug: string;
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  active: boolean;
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  visualIdentity?: TenantVisualIdentity;
  settings: {
    cpcCountDaysDefault: boolean;
    notifyDeadlinesDaysBefore: number[];
    currency: string;
    pixKey?: string;
    pixKeyType?: 'EMAIL' | 'CNPJ' | 'CPF' | 'PHONE' | 'RANDOM';
    pixRecipientName?: string;
    pixBankName?: string;
    mercadopagoConfigured: boolean;
    paymentChannels?: {
      pix: boolean;
      boleto: boolean;
      creditCard: boolean;
    };
    bankingIntegration?: BankingIntegrationConfig;
  };
  createdAt: string;
}

export interface BankingIntegrationConfig {
  provider: 'MERCADO_PAGO' | 'BANCO_DO_BRASIL' | 'ITAU' | 'BRADESCO' | 'SANTANDER' | 'INTER' | 'CORA' | 'ASAAS' | 'STONE_PAGARME' | 'OUTRO';
  providerName?: string;
  accountType?: 'CONTA_CORRENTE_PJ' | 'CONTA_PAGAMENTO';
  agency?: string;
  accountNumber?: string;
  accountDigit?: string;
  holderName?: string;
  holderCnpj?: string;
  financialContactName?: string;
  financialContactEmail?: string;
  status: 'NOT_CONFIGURED' | 'PENDING_ANALYSIS' | 'ACTIVE';
  superAdminNotified?: boolean;
  submittedAt?: string;
  notes?: string;
}

export interface OABFeeEstimateResponse {
  categoryDetermined: string;
  minFee: number;
  recommendedFee: number;
  maxFee: number;
  successPercentageUsual?: number;
  justification: string;
  oabSectional: string;
  tableReference: string;
  modelUsed?: string;
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
  active?: boolean;
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
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

export interface UserBranchAffiliation {
  id?: UUID;
  branchId: UUID;
  branchName?: string;
  roleId: UUID;
  roleName?: string;
  roleCode?: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  isPrimary?: boolean;
}

export interface User {
  id: UUID;
  tenantId?: UUID;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  oabNumber?: string;
  oabUf?: string;
  active: boolean;
  createdAt: string;
  // Role & Branch info (Primary affiliation)
  roleId?: UUID;
  roleName?: string;
  roleCode?: string;
  branchId?: UUID;
  branchName?: string;
  status?: string;
  // Multi-branch affiliations
  branchAffiliations?: UserBranchAffiliation[];
  memberships?: UserBranchAffiliation[];
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
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

// --- AUDIT & LGPD ---
export interface AuditLog {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  userName: string;
  userEmail: string;
  entityType: 'CASE' | 'CLIENT' | 'PERSON' | 'DOCUMENT' | 'PAYMENT' | 'DEADLINE' | 'AI_REQUEST' | 'AUTH' | 'MODULE' | 'SETTING' | 'SYSTEM' | 'USER';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW_SENSITIVE' | 'EXPORT' | 'SIMULATE_PAYMENT' | 'GENERATE_AI' | 'UPDATE_STATUS' | 'ROLLBACK' | 'LOGIN';
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
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';
  grantedAt: string;
  revokedAt?: string;
  termsVersion: string;
  ip: string;
}

export interface LGPDPortalConfig {
  status: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';
  dpoName: string;
  dpoEmail: string;
  dpoPhone: string;
  privacyPolicyUrl: string;
  termsSummary: string;
  updatedAt: string;
}

// --- MULTI-DATABASE, DISASTER RECOVERY (DR) & REPLICATION ---
export interface DatabaseNode {
  id: string;
  name: string;
  provider: 'SUPABASE' | 'POSTGRESQL' | 'NEON' | 'AWS_RDS' | 'GCP_CLOUDSQL' | 'CUSTOM' | 'LOCAL_OFFLINE';
  url: string;
  anonKey?: string;
  serviceRoleKey?: string;
  role: 'ACTIVE' | 'PASSIVE'; // Ativo (Primary/Write) vs Passivo (Standby/DR/Backup)
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
  region?: string;
  latencyMs?: number;
  lastSyncAt?: string;
  tablesCount?: number;
  recordsCount?: number;
  isManagedDefault?: boolean;
  isLocalDr?: boolean;
  pendingOfflineSyncCount?: number;
  offlineStorageBytes?: number;
  notes?: string;
  createdAt: string;
}

// --- SUPPORT API KEY & STRICT TENANT ISOLATION ---
export interface SupportApiKey {
  id: string;
  tenantId: string;
  key: string; // Ex: sec-sup-xxxx-xxxx-xxxx
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  durationHours: number;
  reason: string;
  scope: 'FULL_ADMIN_SUPPORT' | 'READ_ONLY_AUDIT';
  lastUsedAt?: string;
  usedByIp?: string;
}

export interface TenantSecurityConfig {
  tenantId: string;
  isProductionLocked: boolean; // Quando true, o ambiente é 100% produtivo e Super Admin perde acesso sem API Key
  isolationMode: 'STRICT_CONTAINER_RLS' | 'HYBRID';
  activeSupportKey?: SupportApiKey | null;
  supportKeysHistory: SupportApiKey[];
  lastAuditVerification?: string;
}

export interface DatabaseSyncResult {
  success: boolean;
  sourceNodeId: string;
  targetNodeId: string;
  sourceRole: 'ACTIVE' | 'PASSIVE';
  targetRole: 'ACTIVE' | 'PASSIVE';
  startedAt: string;
  completedAt: string;
  recordsSynced: number;
  details: {
    table: string;
    count: number;
    status: 'SYNCED' | 'SKIPPED' | 'ERROR';
    message?: string;
  }[];
  checksumVerified: boolean;
  message: string;
}

// --- CONFIGURAÇÃO AVANÇADA DA RÉPLICA DR LOCAL (OFFLINE STANDBY) ---
export type DrLocationType = 'LOCAL_POSTGRES' | 'LOCAL_DIRECTORY' | 'NETWORK_SHARE' | 'CUSTOM_IP_HOST';

export interface LocalDrConfig {
  id: string;
  tenantId: string;
  locationType: DrLocationType;
  // Conexão e Localização
  hostOrIp: string; // Ex: localhost, 127.0.0.1, 192.168.1.150
  port: number; // Padrão 5432
  databaseName: string; // Ex: jurisflow_dr
  username: string; // Ex: jurisflow_master
  password?: string;
  directoryPath: string; // Ex: C:\JurisFlow\Gabriela_Capitani_Advocacia\Data
  networkSharePath?: string; // Ex: \\192.168.1.200\JurisFlow_DR
  driveLetter: string; // Ex: C:, D:, E:
  // Acesso Local do Escritório & Tailscale MagicDNS
  localServerUrl: string; // Ex: http://jurisflow.local:3000 ou http://192.168.1.100:3000
  tailscaleEnabled: boolean;
  tailscaleHostname: string; // Ex: jurisflow-escritorio
  tailscaleMagicDnsUrl: string; // Ex: http://jurisflow-escritorio.ts.net:3000
  tailscaleAuthKey?: string;
  autoFailoverEnabled: boolean;
  syncIntervalMinutes: number;
  lastTestedAt?: string;
  lastTestStatus?: 'SUCCESS' | 'ERROR' | 'UNTESTED';
  lastTestLogs?: string[];
  updatedAt: string;
}

export interface LocalDrTestStep {
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  message: string;
  durationMs: number;
}

export interface LocalDrTestResult {
  success: boolean;
  latencyMs: number;
  steps: LocalDrTestStep[];
  details: {
    resolvedIp?: string;
    portOpen?: boolean;
    authValid?: boolean;
    tablesValidCount?: number;
    tablesMissing?: string[];
    storageWriteOk?: boolean;
    tailscaleStatus?: 'ACTIVE' | 'INACTIVE' | 'UNCONFIGURED';
    magicDnsReachable?: boolean;
    directoryExists?: boolean;
  };
  logs: string[];
  diagnosis?: string;
  troubleshootingSuggestions?: string[];
}

export type SupportedLinuxDistro = 'UBUNTU_DEBIAN' | 'RHEL_CENTOS_ALMA' | 'FEDORA' | 'ARCH';

export interface EnvironmentSetupScriptRequest {
  os: 'WINDOWS' | 'LINUX';
  linuxDistro?: SupportedLinuxDistro;
  driveLetter?: string; // Ex: "C:", "D:", "E:"
  basePath?: string; // Ex: "C:\JurisFlow" ou "/opt/jurisflow"
  tenantName?: string;
  serverHostname?: string;
  localPort?: number;
  dbPort?: number;
  dbUser?: string;
  dbName?: string;
  tailscaleEnabled?: boolean;
  tailscaleHostname?: string;
}

export interface EnvironmentSetupScriptResponse {
  os: 'WINDOWS' | 'LINUX';
  linuxDistro?: SupportedLinuxDistro;
  fileName: string;
  scriptContent: string;
  installationPath: string;
  secretsPath: string;
  desktopLogPath: string;
  generatedPassword?: string;
  instructions: string[];
}

export interface PortCheckRequest {
  port: number;
  host?: string;
}

export interface PortCheckResponse {
  available: boolean;
  port: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'ERROR';
  latencyMs?: number;
  message: string;
  suggestedPort?: number;
  isHighPort: boolean;
  warning?: string;
}


// --- MULTIMODAL AI ATTACHMENT ---
export interface AIFileAttachment {
  id?: string;
  name: string;
  type: string; // mimeType (e.g. 'application/pdf', 'image/png', 'text/csv', 'audio/mp3', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  size: number;
  dataBase64?: string;
  extractedText?: string;
  previewUrl?: string;
  category?: 'PROVA' | 'DOCUMENTO' | 'PLANILHA' | 'PETICAO' | 'AUDIO_GRAVACAO' | 'OUTRO';
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
  date?: string;
  type?: string;
  notes?: string;
  executorUserId: UUID;
  executorUserName?: string;
  costEstimate: number;
  actualCost: number;
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_ROUTE' | 'DONE' | 'CANCELLED';
  report?: string;
  createdAt: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskTimeLog {
  id: string;
  userId: UUID;
  userName: string;
  minutes: number;
  note: string;
  date: string;
  billable: boolean;
}

export type TaskCategory =
  | 'PETICAO'
  | 'PESQUISA'
  | 'REUNIAO'
  | 'DILIGENCIA'
  | 'FINANCEIRO'
  | 'CONTRATO'
  | 'GERAL';

export interface Task {
  id: UUID;
  tenantId: UUID;
  caseId?: UUID;
  caseNumber?: string;
  caseTitle?: string;
  clientId?: UUID;
  clientName?: string;
  deadlineId?: UUID;
  deadlineTitle?: string;
  deadlineFatalDate?: string;
  title: string;
  description: string;
  category?: TaskCategory;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  assignedUserId: UUID;
  assignedUserName?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  checklist?: TaskChecklistItem[];
  tags?: string[];
  estimatedMinutes?: number;
  timeLogs?: TaskTimeLog[];
  completedAt?: string;
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

export interface DigitalSignatureInfo {
  id: string;
  signerName: string;
  signerCpf: string;
  signerRole: string;
  signedAt: string;
  ipAddress: string;
  hashSha256: string;
  verificationCode: string;
  certificateAuthority: string;
  status: 'VALID' | 'REVOKED';
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
  digitalSignature?: DigitalSignatureInfo;
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
  htmlContent?: string;
  placeholders?: string[];
  variables?: string[];
  description: string;
  attachedFile?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl?: string;
    uploadedAt: string;
  };
  layoutStyle?: {
    fontFamily?: string;
    fontSize?: string;
    lineSpacing?: string;
    accentColor?: string;
    headerIncluded?: boolean;
    footerIncluded?: boolean;
  };
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
  paymentMethod?: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  paymentPlan?: 'SEM_JUROS' | 'COM_JUROS';
  serviceFeeMonthlyPercent?: number;
  oabSuggestedMin?: number;
  oabSuggestedMax?: number;
  oabStateConsulted?: string;
  oabCategoryDetermined?: string;
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
  receiptSentTo?: string[];
  proofDispatchedAt?: string;
  notes?: string;
}

// --- AI GATEWAY ---
export type AIFeature = 
  | 'CASE_SUMMARY' 
  | 'DEADLINE_EXTRACT' 
  | 'DOCUMENT_DRAFT' 
  | 'RISK_ANALYSIS' 
  | 'LEGAL_CHAT' 
  | 'CONTRACT_REVIEW'
  | 'DOCUMENT_AUDIT_ERROR_REDUCTION'
  | 'LEGAL_GROUNDING_RAG';

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

// --- GEMINI ENTERPRISE FOR LEGAL ENHANCEMENTS ---
export interface AIAuditDocumentIssue {
  id: string;
  type: 'REVOKED_ARTICLE' | 'DEADLINE_CALCULATION' | 'SUPERSEDED_PRECEDENT' | 'FORMAL_DEFECT' | 'LOGICAL_CONTRADICTION' | 'SUGGESTION';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  snippetOriginal?: string;
  suggestedCorrection: string;
  legalGroundingSource: string;
}

export interface AIAuditDocumentResponse {
  documentTitle: string;
  documentType: string;
  complianceScore: number; // 0 to 100
  status: 'APPROVED' | 'REQUIRES_REVISION' | 'REJECTED';
  executiveSummary: string;
  criticalIssuesCount: number;
  warningsCount: number;
  suggestionsCount: number;
  detectedLegislation: string[];
  precedentsVerified: {
    precedent: string;
    court: string;
    status: 'VALID' | 'OVERRULED' | 'DISTINGUISHED' | 'UNVERIFIED';
    verificationNotes: string;
  }[];
  issues: AIAuditDocumentIssue[];
  auditedTextWithImprovements: string;
}

export interface AILegalKnowledgeItem {
  id: string;
  title: string;
  category: 'CONSTITUCIONAL' | 'CIVIL' | 'PROCESSO_CIVIL' | 'TRABALHISTA' | 'TRIBUTARIO' | 'CONSUMIDOR' | 'INTERNO_ESCRITORIO';
  officialSource: string;
  lastUpdated: string;
  groundingStatus: 'ACTIVE' | 'UPDATING' | 'SYNCED';
  articlesIndexed: number;
  description: string;
  isCustomOfficeTesis?: boolean;
}

export interface AILegalSyncConnector {
  id: string;
  name: string;
  type: 'PLANALTO_LEGISLACAO' | 'DJEN_DIARIO_JUSTICA' | 'STF_STJ_PRECEDENTES' | 'TRIBUNAIS_ESTADUAIS_DJE';
  status: 'CONNECTED' | 'SYNCING' | 'IDLE';
  protocol: 'REST_API' | 'WEBHOOK' | 'RSS_FEED';
  endpointUrl: string;
  webhookPushUrl?: string;
  lastSyncAt: string;
  frequency: string;
  recordsSynced: number;
  description: string;
  autoSyncEnabled: boolean;
}

export interface AILegalWebhookLog {
  id: string;
  timestamp: string;
  source: string;
  event: string;
  payloadSummary: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface AILegalGroundingOverview {
  enterpriseEngineVersion: string;
  activeModel: string;
  zeroHallucinationPolicy: boolean;
  totalNormsIndexed: number;
  totalPrecedentsIndexed: number;
  sources: AILegalKnowledgeItem[];
  supportedJurisdictions: string[];
  syncConnectors: AILegalSyncConnector[];
  webhookLogs: AILegalWebhookLog[];
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

// --- MODULE REGISTRY & CAPABILITIES (ADMIN & GOVERNANCE) ---
export type ModuleId =
  | 'clients'
  | 'cases'
  | 'legal-search'
  | 'deadlines'
  | 'calendar'
  | 'tasks'
  | 'hearings'
  | 'financial'
  | 'contracts'
  | 'documents'
  | 'templates'
  | 'document-generator'
  | 'reports'
  | 'dashboard'
  | 'notifications'
  | 'audit'
  | 'users'
  | 'profiles'
  | 'permissions'
  | 'admin'
  | 'updates'
  | 'integrations'
  | 'ai';

export interface ModuleMetadata {
  id: ModuleId;
  name: string;
  description: string;
  version: string;
  category: 'core' | 'operations' | 'documents' | 'financial' | 'intelligence' | 'governance';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  dependencies: ModuleId[];
  requiredPermissions: string[];
  minPlanTier: 'STARTER' | 'PROFESSIONAL' | 'PREMIUM';
  icon: string;
  installedAt: string;
  updatedAt: string;
  configurable: boolean;
  settings?: Record<string, any>;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  module: ModuleId;
  enabled: boolean;
  targetTenants?: UUID[];
  rolloutPercentage: number;
  environment: 'all' | 'development' | 'preview' | 'production';
  createdAt: string;
  updatedAt: string;
}

// --- SYSTEM UPDATES & RELEASE ENGINE ---
export interface SystemUpdateManifest {
  version: string;
  releaseName: string;
  minimumVersion: string;
  releaseDate: string;
  description: string;
  changelog: {
    added: string[];
    changed: string[];
    fixed: string[];
    security: string[];
  };
  artifactUrl: string;
  checksumSha256: string;
  databaseMigration: boolean;
  migrationDetails?: string[];
  restartRequired: boolean;
  targetEnvironment: 'all' | 'localhost' | 'vercel' | 'cloud';
}

export interface SystemUpdateLog {
  id: UUID;
  previousVersion: string;
  targetVersion: string;
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK' | 'IN_PROGRESS';
  startedAt: string;
  completedAt?: string;
  operatorId: UUID;
  operatorName: string;
  backupSnapshotId?: string;
  databaseMigrationsApplied: string[];
  logs: string[];
  rollbackReason?: string;
}

export interface SystemHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  environment: 'development' | 'preview' | 'production' | 'localhost';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    status: 'CONNECTED' | 'DISCONNECTED';
    provider: string;
    totalRecords: number;
    latencyMs: number;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  activeModulesCount: number;
  totalModulesCount: number;
  featureFlagsActiveCount: number;
  aiGatewayStatus: 'READY' | 'MISSING_KEY' | 'DISABLED';
  security: {
    lastAuditLogTimestamp: string;
    mfaEnforced: boolean;
    activeSessionsCount: number;
  };
  storage: {
    status: 'OK';
    documentsCount: number;
    storageUsedBytes: number;
  };
}

export interface CapabilityCheck {
  capability: string;
  allowed: boolean;
  reason?: string;
}

// --- JUDICIAL SEARCH & PROCESS CONSULTATION ---
export type JudicialSearchTab = 'jurisprudence' | 'process' | 'certificate' | 'history' | 'sources';

export interface JudicialProcessParty {
  role: string;
  name: string;
  document?: string;
  personType: 'INDIVIDUAL' | 'LEGAL_ENTITY';
}

export interface JudicialProcessLawyer {
  name: string;
  oabNumber: string;
  oabUf: string;
}

export interface JudicialProcessMovementItem {
  id: string;
  date: string;
  title: string;
  content?: string;
  complement?: string;
  code?: number;
  source?: string;
}

export interface JudicialProcessDocumentItem {
  id: string;
  title: string;
  documentType: string;
  date: string;
  sizeBytes?: number;
  sha256: string;
  downloadUrl?: string;
  isPublic: boolean;
}

export interface JudicialProcessSearchResult {
  processNumber: string;
  normalizedCnjNumber: string;
  court: string;
  courtCode: string;
  judicialDegree: string;
  processClass: string;
  courtOrgan: string;
  judgeName?: string;
  distributionDate: string;
  claimValue?: number;
  isConfidential: boolean;
  subjects: Array<{ code: number; name: string }>;
  parties: JudicialProcessParty[];
  lawyers: JudicialProcessLawyer[];
  movements: JudicialProcessMovementItem[];
  documents: JudicialProcessDocumentItem[];
  retrievedAt: string;
  sourceProvider: string;
  sourceUrl: string;
  evidenceState: 'VERIFIED_OFFICIAL' | 'FOUND_PENDING_REVIEW' | 'NOT_VERIFIED_PROHIBITED';
  evidenceId: string;
  isAlreadyImported: boolean;
  existingCaseId?: string;
  existingCaseTitle?: string;
  newMovementsCount?: number;
}

export interface JurisprudenceSearchParams {
  query: string;
  courtCodes?: string[];
  courtOrgan?: string;
  rapporteur?: string;
  caseNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  subject?: string;
  documentTypes?: string[];
  onlyQualifiedPrecedents?: boolean;
  onlyVerified?: boolean;
  page?: number;
  pageSize?: number;
}

export interface LawyerDigitalCertificateInfo {
  id: string;
  subjectName: string;
  cpf?: string;
  oabNumber?: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  algorithm: string;
  thumbprintSha256: string;
  status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'EXPIRING_SOON';
  isHardwareToken: boolean;
  compatibleCourts: string[];
  uploadedAt: string;
}

export interface JudicialSearchHistoryItem {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  searchType: 'JURISPRUDENCE' | 'PROCESS';
  query: string;
  filters: Record<string, any>;
  courtCode?: string;
  resultsCount: number;
  executionTimeMs: number;
  status: 'SUCCESS' | 'NO_RESULTS' | 'FAILED';
  timestamp: string;
}

export interface PrecedentFavoriteItem {
  id: string;
  decisionId: string;
  tenantId: string;
  userId: string;
  title: string;
  courtCode: string;
  citation: string;
  headnote: string;
  thesis?: string;
  officialUrl: string;
  favoritedAt: string;
  tags?: string[];
  notes?: string;
}

export interface CourtAvailabilityMatrixItem {
  courtCode: string;
  courtName: string;
  jurisdiction: string;
  jurisprudenceStatus: 'DISPONIVEL' | 'DISPONIVEL_PARCIAL' | 'EM_DESENVOLVIMENTO' | 'INDISPONIVEL';
  processStatus: 'DISPONIVEL_PUBLICO' | 'EXIGE_CERTIFICADO' | 'EM_DESENVOLVIMENTO' | 'RESTRITO';
  authenticationMethod: 'API_PUBLICA' | 'DADOS_ABERTOS' | 'CERTIFICADO_A1_A3' | 'PARCERIA_OFICIAL';
  officialUrl: string;
  latencyMs: number;
  status: 'READY' | 'NOT_CONFIGURED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'FAILED';
  lastCheckedAt: string;
  notes: string;
}
