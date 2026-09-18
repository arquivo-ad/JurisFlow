import {
  Tenant,
  TenantVisualIdentity,
  Branch,
  User,
  Role,
  Membership,
  Person,
  Client,
  Case,
  Movement,
  Deadline,
  Hearing,
  Diligence,
  Task,
  Notification,
  DocumentItem,
  DocumentTemplate,
  FeeContract,
  Installment,
  AccountReceivable,
  Charge,
  Payment,
  AuditLog,
  LGPDConsent,
  LGPDPortalConfig,
  DatabaseNode,
  DatabaseSyncResult,
  AIFileAttachment,
  FinancialOverviewMetrics,
  AIExtractDeadlineResponse,
  AIDraftPieceResponse,
  AICaseSummaryResponse,
  AIAuditDocumentResponse,
  BankingIntegrationConfig,
  OABFeeEstimateResponse,
  AILegalGroundingOverview,
  AILegalKnowledgeItem,
  GlobalSearchResult,
  ModuleMetadata,
  FeatureFlag,
  SystemUpdateManifest,
  SystemUpdateLog,
  SystemHealthReport,
  SupportApiKey,
  TenantSecurityConfig,
  LocalDrConfig,
  LocalDrTestResult,
  EnvironmentSetupScriptRequest,
  EnvironmentSetupScriptResponse,
  PortCheckRequest,
  PortCheckResponse,
  JudicialProcessSearchResult,
  JurisprudenceSearchParams,
  JudicialSearchHistoryItem,
  PrecedentFavoriteItem,
  LawyerDigitalCertificateInfo,
  CourtAvailabilityMatrixItem,
} from '../types';

const DEFAULT_TENANT_ID = 't-1789481820042';
const DEFAULT_BRANCH_ID = 'b-1789481820042-matriz';
const DEFAULT_USER_ID = 'u-1789481820042-admin';

function getInitialStorage(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    // Ignore legacy mock values
    if (
      val === 't-silveira' ||
      val === 't-campos' ||
      val === 't-1788431154885' ||
      val === 'u-carlos' ||
      val === 'u-marina' ||
      val === 'u-gabriel' ||
      val === 'b-sp-matriz' ||
      val === 'b-rj-filial'
    ) {
      localStorage.setItem(key, fallback);
      return fallback;
    }
    return val || fallback;
  } catch {
    return fallback;
  }
}

let currentTenantId = getInitialStorage('jurisflow_tenant_id', DEFAULT_TENANT_ID);
let currentBranchId = getInitialStorage('jurisflow_branch_id', DEFAULT_BRANCH_ID);
let currentUserId = getInitialStorage('jurisflow_user_id', DEFAULT_USER_ID);
let currentSupportApiKey = typeof window !== 'undefined' ? localStorage.getItem('jurisflow_support_apikey') || '' : '';

export function setTenantContext(tenantId: string, branchId?: string, userId?: string) {
  currentTenantId = tenantId;
  if (typeof window !== 'undefined') localStorage.setItem('jurisflow_tenant_id', tenantId);
  if (branchId) {
    currentBranchId = branchId;
    if (typeof window !== 'undefined') localStorage.setItem('jurisflow_branch_id', branchId);
  }
  if (userId) {
    currentUserId = userId;
    if (typeof window !== 'undefined') localStorage.setItem('jurisflow_user_id', userId);
  }
}

export function setSupportApiKey(key: string) {
  currentSupportApiKey = key;
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem('jurisflow_support_apikey', key);
    } else {
      localStorage.removeItem('jurisflow_support_apikey');
    }
  }
}

export function getSupportApiKey() {
  return currentSupportApiKey;
}

export function getTenantContext() {
  return { tenantId: currentTenantId, branchId: currentBranchId, userId: currentUserId, supportApiKey: currentSupportApiKey };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': currentTenantId,
    'x-branch-id': currentBranchId,
    'x-user-id': currentUserId,
    ...(currentSupportApiKey ? { 'x-support-apikey': currentSupportApiKey } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Erro de comunicação com o servidor' }));
    throw new Error(errData.error || `Erro HTTP: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Context Setters
  setTenant: (tenantId: string) => {
    currentTenantId = tenantId;
    if (typeof window !== 'undefined') localStorage.setItem('jurisflow_tenant_id', tenantId);
  },
  setBranch: (branchId: string) => {
    currentBranchId = branchId;
    if (typeof window !== 'undefined') localStorage.setItem('jurisflow_branch_id', branchId);
  },
  setUser: (userId: string) => {
    currentUserId = userId;
    if (typeof window !== 'undefined') localStorage.setItem('jurisflow_user_id', userId);
  },

  // Limpeza de Dados Fictícios / Reset para Produção Limpa
  purgeDemoData: () => request<any>('/api/system/purge-demo-data', { method: 'POST' }),

  // Bootstrap All System Data
  getBootstrap: () => request<any>('/api/bootstrap'),

  // Auth & Context
  getAuthContext: () =>
    request<{
      user: User;
      tenant: Tenant;
      allTenants: Tenant[];
      membership: Membership;
      role: Role;
      activeBranch: Branch;
      branches: Branch[];
    }>('/api/auth/me'),

  getTenants: () => request<Tenant[]>('/api/tenants'),
  createTenant: (data: any) => request<any>('/api/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: string, data: Partial<Tenant>) => request<Tenant>(`/api/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTenant: (id: string) => request<{ success: boolean; message?: string }>(`/api/tenants/${id}`, { method: 'DELETE' }),
  updateTenantStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<Tenant>(`/api/tenants/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateTenantVisualIdentity: (id: string, visualIdentity: TenantVisualIdentity) =>
    request<Tenant>(`/api/tenants/${id}/visual-identity`, { method: 'PUT', body: JSON.stringify(visualIdentity) }),

  getBranches: () => request<Branch[]>('/api/branches'),
  createBranch: (data: Partial<Branch>) => request<Branch>('/api/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: Partial<Branch>) => request<Branch>(`/api/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBranch: (id: string) => request<{ success: boolean }>(`/api/branches/${id}`, { method: 'DELETE' }),
  updateBranchStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<Branch>(`/api/branches/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getUsers: () => request<User[]>('/api/users'),
  createUser: (data: Partial<User> & { roleId?: string; branchId?: string; status?: string; branchAffiliations?: any[] }) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User> & { roleId?: string; branchId?: string; status?: string; branchAffiliations?: any[] }) =>
    request<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateUserAvatar: (id: string, avatarUrl: string) =>
    request<User>(`/api/users/${id}/avatar`, { method: 'PUT', body: JSON.stringify({ avatarUrl }) }),
  deleteUser: (id: string) => request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<User>(`/api/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getRoles: () => request<Role[]>('/api/roles'),
  createRole: (data: Partial<Role>) => request<Role>('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: Partial<Role>) => request<Role>(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => request<{ success: boolean }>(`/api/roles/${id}`, { method: 'DELETE' }),

  // Persons & Clients
  getPersons: () => request<Person[]>('/api/persons'),
  createPerson: (data: Partial<Person>) => request<Person>('/api/persons', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id: string, data: Partial<Person>) => request<Person>(`/api/persons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePerson: (id: string) => request<{ success: boolean }>(`/api/persons/${id}`, { method: 'DELETE' }),

  getClients: () => request<Client[]>('/api/clients'),
  createClient: (data: Partial<Client> & { person?: Partial<Person> }) => request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<Client>) => request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getLeads: () => request<any[]>('/api/leads'),
  createLead: (data: Partial<any>) => request<any>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),

  // Cases & Movements
  getCases: () => request<Case[]>('/api/cases'),
  getCaseDetail: (id: string) =>
    request<Case & { movements: Movement[]; deadlines: Deadline[]; hearings: Hearing[]; documents: DocumentItem[] }>(
      `/api/cases/${id}`
    ),
  createCase: (data: Partial<Case>) => request<Case>('/api/cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCase: (id: string, data: Partial<Case>) => request<Case>(`/api/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getCaseMovements: (caseId: string) => request<Movement[]>(`/api/cases/${caseId}/movements`),
  addCaseMovement: (caseId: string, data: Partial<Movement>) =>
    request<Movement>(`/api/cases/${caseId}/movements`, { method: 'POST', body: JSON.stringify(data) }),

  // Deadlines & CPC Calendar
  getDeadlines: () => request<Deadline[]>('/api/deadlines'),
  calculateCPC: (publishDate: string, daysCount: number, calculationType: string) =>
    request<{
      publishDate: string;
      startDate: string;
      dueDate: string;
      fatalDate: string;
      businessDaysCounted: number;
      recessIncluded: boolean;
      notes: string[];
    }>('/api/deadlines/calculate-cpc', {
      method: 'POST',
      body: JSON.stringify({ publishDate, daysCount, calculationType }),
    }),
  createDeadline: (data: Partial<Deadline>) => request<Deadline>('/api/deadlines', { method: 'POST', body: JSON.stringify(data) }),
  completeDeadline: (id: string) =>
    request<Deadline>(`/api/deadlines/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'COMPLETED' }) }),
  updateDeadlineStatus: (id: string, status: string) =>
    request<Deadline>(`/api/deadlines/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Hearings, Diligences & Tasks
  getHearings: () => request<Hearing[]>('/api/hearings'),
  createHearing: (data: Partial<Hearing>) => request<Hearing>('/api/hearings', { method: 'POST', body: JSON.stringify(data) }),
  getDiligences: () => request<Diligence[]>('/api/diligences'),
  createDiligence: (data: Partial<Diligence>) => request<Diligence>('/api/diligences', { method: 'POST', body: JSON.stringify(data) }),
  getTasks: () => request<Task[]>('/api/tasks'),
  createTask: (data: Partial<Task>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) => request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
  logTaskTime: (id: string, data: { minutes: number; note?: string; date?: string; billable?: boolean }) =>
    request<Task>(`/api/tasks/${id}/time-log`, { method: 'POST', body: JSON.stringify(data) }),

  // Documents & Templates
  getDocuments: () => request<DocumentItem[]>('/api/documents'),
  createDocument: (data: Partial<DocumentItem>) => request<DocumentItem>('/api/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDocument: (id: string, data: Partial<DocumentItem>) =>
    request<DocumentItem>(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => request<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),
  signDocument: (id: string, signerData?: { signerName?: string; signerCpf?: string; signerRole?: string }) =>
    request<DocumentItem>(`/api/documents/${id}/sign`, { method: 'POST', body: JSON.stringify(signerData || {}) }),
  getTemplates: () => request<DocumentTemplate[]>('/api/templates'),
  renderTemplate: (templateId: string, variables: Record<string, any>) =>
    request<{ rendered: string; template: DocumentTemplate }>('/api/templates/render', {
      method: 'POST',
      body: JSON.stringify({ templateId, variables }),
    }),

  // Financial & Mercado Pago
  getFinancialOverview: () => request<FinancialOverviewMetrics>('/api/financial/overview'),
  getFeeContracts: () => request<FeeContract[]>('/api/financial/contracts'),
  createFeeContract: (data: Partial<FeeContract>) => request<FeeContract>('/api/financial/contracts', { method: 'POST', body: JSON.stringify(data) }),
  createContract: (data: Partial<FeeContract>) => request<FeeContract>('/api/financial/contracts', { method: 'POST', body: JSON.stringify(data) }),
  getReceivables: () => request<AccountReceivable[]>('/api/financial/receivables'),
  getUnbilledTimesheet: () =>
    request<
      {
        taskId: string;
        taskTitle: string;
        category?: string;
        caseId?: string;
        caseNumber?: string;
        clientId?: string;
        clientName?: string;
        logId: string;
        userName: string;
        minutes: number;
        hours: number;
        note: string;
        date: string;
      }[]
    >('/api/financial/timesheet/unbilled'),
  billTimesheet: (params: {
    clientId: string;
    caseId?: string;
    hourlyRate: number;
    totalMinutes: number;
    description?: string;
    taskIds?: string[];
  }) =>
    request<{ success: boolean; receivable: AccountReceivable; contract: FeeContract }>('/api/financial/timesheet/bill', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  generateCharge: (accountReceivableId: string, method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') =>
    request<Charge>('/api/financial/charges/mercadopago', {
      method: 'POST',
      body: JSON.stringify({ accountReceivableId, method }),
    }),
  generateMercadoPagoCharge: (accountReceivableId: string, method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') =>
    request<Charge>('/api/financial/charges/mercadopago', {
      method: 'POST',
      body: JSON.stringify({ accountReceivableId, method }),
    }),
  simulatePayment: (chargeId: string) =>
    request<{ success: boolean; payment: Payment; charge: Charge; receivable: AccountReceivable }>(
      `/api/financial/charges/${chargeId}/simulate-payment`,
      { method: 'POST' }
    ),
  simulateMercadoPagoPayment: (chargeId: string) =>
    request<{ success: boolean; payment: Payment; charge: Charge; receivable: AccountReceivable }>(
      `/api/financial/charges/${chargeId}/simulate-payment`,
      { method: 'POST' }
    ),
  estimateOabFee: (params: {
    contractTitle: string;
    clientId: string;
    caseId?: string;
    feeType: string;
    uf?: string;
    oabNumber?: string;
  }) =>
    request<OABFeeEstimateResponse>('/api/ai/oab-fee-estimate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  requestBankingIntegration: (data: Partial<BankingIntegrationConfig>) =>
    request<{ success: boolean; message: string; bankingIntegration: BankingIntegrationConfig }>(
      '/api/financial/banking-integration/request',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  updatePaymentChannels: (data: {
    pix?: boolean;
    boleto?: boolean;
    creditCard?: boolean;
    pixKey?: string;
    pixKeyType?: string;
    pixRecipientName?: string;
    pixBankName?: string;
  }) =>
    request<{ success: boolean; message: string; tenant: Tenant }>(
      '/api/financial/payment-channels',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // AI Gateway (Gemini Enterprise for Legal) - Multimodal com Suporte a Arquivos
  aiExtractDeadline: (publicationText?: string, fileAttachment?: AIFileAttachment) =>
    request<AIExtractDeadlineResponse>('/api/ai/extract-deadline', {
      method: 'POST',
      body: JSON.stringify({ publicationText, fileAttachment }),
    }),
  aiDraftPiece: (params: {
    pieceType: string;
    legalArea: string;
    clientName?: string;
    opposingParty?: string;
    facts: string;
    legalThesis: string;
    courtBranch?: string;
    caseNumber?: string;
    fileAttachment?: AIFileAttachment;
    fileAttachments?: AIFileAttachment[];
  }) => request<AIDraftPieceResponse>('/api/ai/draft-piece', { method: 'POST', body: JSON.stringify(params) }),
  aiSummarizeCase: (caseId: string, customContext?: string, fileAttachment?: AIFileAttachment) =>
    request<AICaseSummaryResponse>('/api/ai/summarize-case', {
      method: 'POST',
      body: JSON.stringify({ caseId, customContext, fileAttachment }),
    }),
  aiAuditDocument: (params: {
    documentTitle: string;
    documentType: string;
    documentContent: string;
    context?: string;
    fileAttachment?: AIFileAttachment;
  }) =>
    request<AIAuditDocumentResponse>('/api/ai/audit-document', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  aiSanitizeOrSuggestTemplate: (params: {
    action: 'SANITIZE_REAL_MODEL' | 'SUGGEST_IMPROVEMENTS' | 'GENERATE_LEGAL_BASE';
    category: string;
    modelName?: string;
    rawContent?: string;
    rawHtmlContent?: string;
    attachedFile?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl?: string;
      uploadedAt: string;
    };
  }) =>
    request<{
      sanitizedContent: string;
      sanitizedHtmlContent?: string;
      extractedVariables: string[];
      titleSuggestion: string;
      summary: string;
      suggestions?: string[];
      complianceNotes?: string;
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
    }>('/api/ai/template-sanitize-suggest', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  extractDocumentText: async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${base64}`;

    return request<{
      text: string;
      htmlContent?: string;
      fileName: string;
      fileSize?: number;
      fileType?: string;
      fileBase64?: string;
      dataUrl?: string;
      charCount: number;
      detectedVariables: string[];
      suggestedTitle: string;
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
    }>('/api/documents/extract-file-content', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        fileBase64: base64,
      }),
    });
  },
  analyzeVisualIdentityFromDoc: async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const dataUrl = `data:${file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')};base64,${base64}`;

    return request<{
      success: boolean;
      visualIdentity: Partial<TenantVisualIdentity>;
      extractedImages: Array<{
        dataUrl: string;
        width?: number;
        height?: number;
        isPrimaryLogo?: boolean;
      }>;
      summary: string;
      detectedLawFirmName?: string;
      attachedLetterheadFile?: {
        fileName: string;
        fileType: string;
        fileSize: number;
        dataUrl: string;
        uploadedAt: string;
      };
    }>('/api/documents/analyze-visual-identity', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        fileSize: file.size,
        fileBase64: base64,
      }),
    });
  },
  getLegalKnowledge: () =>
    request<AILegalGroundingOverview>('/api/ai/legal-knowledge'),
  syncLegalSources: () =>
    request<{
      success: boolean;
      message: string;
      syncedAt: string;
      totalNormsIndexed: number;
      totalPrecedentsIndexed: number;
    }>('/api/ai/legal-knowledge/sync', { method: 'POST' }),
  addCustomLegalKnowledge: (item: Partial<AILegalKnowledgeItem>) =>
    request<{ success: boolean; item: AILegalKnowledgeItem }>('/api/ai/legal-knowledge/custom', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  aiChat: (
    message: string,
    optionsOrContext?:
      | {
          caseContext?: string;
          fileAttachment?: AIFileAttachment;
          userName?: string;
          honorific?: string;
        }
      | string,
    fileAttachment?: AIFileAttachment
  ) => {
    const payload =
      typeof optionsOrContext === 'string'
        ? { message, caseContext: optionsOrContext, fileAttachment }
        : {
            message,
            caseContext: optionsOrContext?.caseContext,
            fileAttachment: optionsOrContext?.fileAttachment || fileAttachment,
            userName: optionsOrContext?.userName,
            honorific: optionsOrContext?.honorific,
          };
    return request<{
      reply: string;
      salutation?: string;
      summary?: string;
      searchResults?: any[];
      citationReport?: any;
      verificationNotice?: string;
      status?: 'SUCCESS' | 'FAIL_CLOSED';
      failureCode?: string;
      failureReason?: string;
      diagnostic?: any;
      routingReport?: any;
      isModelAvailable?: boolean;
      modelStatus?: string;
      modelName?: string;
    }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getAiStats: () =>
    request<{
      totalRequests: number;
      totalTokens: number;
      totalCostBRL: number;
      activeModel: string;
      groundingRate: number;
      errorsPrevented: number;
      recentLogs: any[];
    }>('/api/ai/stats'),
  saveAiAttachmentToClientDocuments: (data: {
    clientId: string;
    caseId?: string;
    title: string;
    category: string;
    fileAttachment: AIFileAttachment;
  }) =>
    request<DocumentItem>('/api/documents/from-ai-attachment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Audit, LGPD & Notifications
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),
  getLgpdConsents: () => request<LGPDConsent[]>('/api/lgpd'),
  createLgpdConsent: (data: Partial<LGPDConsent>) => request<LGPDConsent>('/api/lgpd/consent', { method: 'POST', body: JSON.stringify(data) }),
  updateLgpdConsent: (id: string, data: Partial<LGPDConsent>) =>
    request<LGPDConsent>(`/api/lgpd/consent/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLgpdConsent: (id: string) => request<{ success: boolean }>(`/api/lgpd/consent/${id}`, { method: 'DELETE' }),
  getLgpdPortalConfig: () => request<LGPDPortalConfig>('/api/lgpd/portal-config'),
  updateLgpdPortalConfig: (data: Partial<LGPDPortalConfig>) =>
    request<LGPDPortalConfig>('/api/lgpd/portal-config', { method: 'PUT', body: JSON.stringify(data) }),
  getNotifications: () => request<Notification[]>('/api/notifications'),
  markNotificationAsRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // Multi-Database, Disaster Recovery (DR) & Replication
  getDatabases: () => request<DatabaseNode[]>('/api/databases'),
  createDatabase: (data: Partial<DatabaseNode>) => request<DatabaseNode>('/api/databases', { method: 'POST', body: JSON.stringify(data) }),
  updateDatabase: (id: string, data: Partial<DatabaseNode>) =>
    request<DatabaseNode>(`/api/databases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDatabase: (id: string) => request<{ success: boolean }>(`/api/databases/${id}`, { method: 'DELETE' }),
  failoverDatabase: (activeNodeId: string, passiveNodeId: string) =>
    request<{ success: boolean; message: string; nodes: DatabaseNode[] }>('/api/databases/failover', {
      method: 'POST',
      body: JSON.stringify({ activeNodeId, passiveNodeId }),
    }),
  syncDatabases: (sourceNodeId: string, targetNodeId: string) =>
    request<DatabaseSyncResult>('/api/databases/sync', {
      method: 'POST',
      body: JSON.stringify({ sourceNodeId, targetNodeId }),
    }),
  pingDatabase: (id: string) =>
    request<{ success: boolean; latencyMs: number; status: string; message: string }>(`/api/databases/${id}/ping`, {
      method: 'POST',
    }),

  // Disaster Recovery (DR) Local Offline & Automated Failover/Failback
  getDrStatus: () =>
    request<{
      activeNode: DatabaseNode;
      drNode: DatabaseNode;
      cloudNode: DatabaseNode;
      isDrActive: boolean;
      cloudStatus: string;
      lastCloudPingAt: string;
      pendingSyncCount: number;
      offlineStorageBytes: number;
      totalLocalRecords: number;
      mode: string;
    }>('/api/databases/dr-status'),
  failoverToDr: () =>
    request<{ success: boolean; message: string; activeNode: DatabaseNode; nodes: DatabaseNode[] }>(
      '/api/databases/failover-to-dr',
      { method: 'POST' }
    ),
  syncDrToCloud: () =>
    request<{
      success: boolean;
      cloudRestored: boolean;
      recordsSynced: number;
      message: string;
      activeNode: DatabaseNode;
      nodes: DatabaseNode[];
    }>('/api/databases/sync-dr-to-cloud', { method: 'POST' }),
  pingCloudDatabase: () =>
    request<{ success: boolean; status: string; latencyMs: number; message: string }>('/api/databases/cloud-ping', {
      method: 'POST',
    }),
  getLocalDrConfig: () => request<LocalDrConfig>('/api/databases/local-dr-config'),
  updateLocalDrConfig: (data: Partial<LocalDrConfig>) =>
    request<{ success: boolean; config: LocalDrConfig; message: string }>('/api/databases/local-dr-config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testLocalDrConnection: (config?: Partial<LocalDrConfig>) =>
    request<LocalDrTestResult>('/api/databases/test-connection', {
      method: 'POST',
      body: JSON.stringify(config || {}),
    }),
  generateEnvironmentSetupScript: (req: EnvironmentSetupScriptRequest) =>
    request<EnvironmentSetupScriptResponse>('/api/databases/generate-install-script', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  checkPortAvailability: (port: number, host?: string) =>
    request<PortCheckResponse>('/api/databases/check-port', {
      method: 'POST',
      body: JSON.stringify({ port, host }),
    }),

  // Tenant Security, Strict Isolation & Support API Keys
  getTenantSecurityConfig: () =>
    request<
      TenantSecurityConfig & {
        tenantName: string;
        tablesCount: number;
        totalTenantRecords: number;
        rlsEnforced: boolean;
        superAdminAccessGranted: boolean;
      }
    >('/api/tenant/security-config'),
  setProductionLock: (isProductionLocked: boolean) =>
    request<{ success: boolean; isProductionLocked: boolean; message: string }>('/api/tenant/production-lock', {
      method: 'POST',
      body: JSON.stringify({ isProductionLocked }),
    }),
  generateSupportApiKey: (data: { durationHours: number; reason: string; scope: 'FULL_ADMIN_SUPPORT' | 'READ_ONLY_AUDIT' }) =>
    request<{ success: boolean; supportKey: SupportApiKey; message: string }>('/api/tenant/support-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  revokeSupportApiKey: (keyId: string) =>
    request<{ success: boolean; message: string; key: SupportApiKey }>(`/api/tenant/support-keys/${keyId}/revoke`, {
      method: 'POST',
    }),
  validateSupportApiKey: (key: string, tenantId?: string) =>
    request<{
      valid: boolean;
      tenantId: string;
      scope: string;
      expiresAt: string;
      message: string;
      supportKey: SupportApiKey;
    }>('/api/tenant/support-keys/validate', {
      method: 'POST',
      body: JSON.stringify({ key, tenantId }),
    }),

  // Supabase PostgreSQL Persistence Status & Sync
  getSupabaseStatus: () =>
    request<{
      connected: boolean;
      url: string | null;
      tables: Record<string, number>;
      memoryCounts?: Record<string, number>;
      error?: string;
      keyInfo?: {
        keyType: 'SERVICE_ROLE' | 'PUBLISHABLE' | 'UNKNOWN';
        keyPrefix: string;
        isServiceRole: boolean;
      };
      rlsNotice?: string;
      rlsTables?: string[];
      suggestedSqlPolicy?: string;
    }>('/api/supabase/status'),
  syncSupabase: () =>
    request<{
      success: boolean;
      pushCounts?: Record<string, number>;
      hydrateCounts?: Record<string, number>;
      rlsBlockedTables?: string[];
      message?: string;
    }>('/api/supabase/sync', { method: 'POST' }),

  // Global Search
  search: (query: string) => request<GlobalSearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`),

  // Module Registry & Feature Flags (Platform Admin)
  getModules: () => request<{ modules: ModuleMetadata[]; activeCount: number; totalCount: number }>('/api/admin/modules'),
  updateModuleStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE', settings?: Record<string, any>) =>
    request<{ success: boolean; module: ModuleMetadata; message: string }>(`/api/admin/modules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, settings }),
    }),
  getFeatureFlags: () => request<FeatureFlag[]>('/api/admin/feature-flags'),
  createFeatureFlag: (data: Partial<FeatureFlag>) =>
    request<FeatureFlag>('/api/admin/feature-flags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFeatureFlag: (id: string, data: Partial<FeatureFlag>) =>
    request<FeatureFlag>(`/api/admin/feature-flags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // System Update Engine
  checkUpdates: () =>
    request<{
      currentVersion: string;
      latestVersion: string;
      updateAvailable: boolean;
      environment: string;
      currentManifest: SystemUpdateManifest;
      latestManifest: SystemUpdateManifest;
      releasesHistory: SystemUpdateManifest[];
    }>('/api/admin/updates/check'),
  applyUpdate: (targetVersion: string) =>
    request<{ success: boolean; message: string; newVersion: string; updateLog: SystemUpdateLog }>('/api/admin/updates/apply', {
      method: 'POST',
      body: JSON.stringify({ targetVersion }),
    }),
  rollbackUpdate: (logId: string, reason?: string) =>
    request<{ success: boolean; message: string; newVersion: string; rollbackLog: SystemUpdateLog }>(`/api/admin/updates/rollback/${logId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getUpdateHistory: () => request<SystemUpdateLog[]>('/api/admin/updates/history'),

  // Observability & System Health
  getAdminHealth: () => request<SystemHealthReport>('/api/admin/health'),

  // Judicial Research, Precedents & Process Consultation
  searchJurisprudence: (params: JurisprudenceSearchParams) =>
    request<{
      query: string;
      total: number;
      page: number;
      pageSize: number;
      results: any[];
      sourcesConsulted: string[];
      executionTimeMs: number;
      timestamp: string;
    }>('/api/judicial/search-jurisprudence', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  searchProcess: (params: {
    searchType: 'CNJ' | 'LAWYER_OAB' | 'PARTY_NAME';
    cnjNumber?: string;
    courtCode?: string;
    lawyerOab?: string;
    partyName?: string;
  }) =>
    request<{ success: boolean; result: JudicialProcessSearchResult | null }>('/api/judicial/search-process', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  importProcessToJurisFlow: (processResult: JudicialProcessSearchResult, responsibleLawyerId?: string) =>
    request<{
      success: boolean;
      case: Case;
      importedMovementsCount: number;
      importedDocumentsCount: number;
    }>('/api/judicial/import-process', {
      method: 'POST',
      body: JSON.stringify({ processResult, responsibleLawyerId }),
    }),

  syncProcessUpdates: (caseId: string, processNumber?: string) =>
    request<{
      success: boolean;
      newMovementsAdded: number;
      totalMovements: number;
      lastSyncAt: string;
    }>('/api/judicial/sync-process-updates', {
      method: 'POST',
      body: JSON.stringify({ caseId, processNumber }),
    }),

  associatePrecedentToCase: (data: {
    caseId: string;
    citation: string;
    headnote: string;
    thesis?: string;
    officialUrl: string;
  }) =>
    request<{ success: boolean; message: string; movementId?: string }>('/api/judicial/associate-precedent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPrecedentFavorites: () =>
    request<PrecedentFavoriteItem[]>('/api/judicial/favorites'),

  togglePrecedentFavorite: (data: {
    decisionId: string;
    title?: string;
    courtCode?: string;
    citation?: string;
    headnote?: string;
    thesis?: string;
    officialUrl?: string;
  }) =>
    request<{ favorited: boolean; item?: PrecedentFavoriteItem; message: string }>('/api/judicial/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getJudicialSearchHistory: () =>
    request<JudicialSearchHistoryItem[]>('/api/judicial/history'),

  inspectDigitalCertificate: (data: { fileName: string; passwordLength: number }) =>
    request<{ success: boolean; certificate: LawyerDigitalCertificateInfo }>('/api/judicial/certificate/inspect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCourtAvailabilityMatrix: () =>
    request<CourtAvailabilityMatrixItem[]>('/api/judicial/availability-matrix'),
};
