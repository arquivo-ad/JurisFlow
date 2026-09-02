import {
  Tenant,
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
  FinancialOverviewMetrics,
  AIExtractDeadlineResponse,
  AIDraftPieceResponse,
  AICaseSummaryResponse,
  GlobalSearchResult,
} from '../types';

let currentTenantId = 't-silveira';
let currentBranchId = 'b-sp-matriz';
let currentUserId = 'u-carlos';

export function setTenantContext(tenantId: string, branchId?: string, userId?: string) {
  currentTenantId = tenantId;
  if (branchId) currentBranchId = branchId;
  if (userId) currentUserId = userId;
}

export function getTenantContext() {
  return { tenantId: currentTenantId, branchId: currentBranchId, userId: currentUserId };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': currentTenantId,
    'x-branch-id': currentBranchId,
    'x-user-id': currentUserId,
    ...(options.headers || {}),
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
  },
  setBranch: (branchId: string) => {
    currentBranchId = branchId;
  },
  setUser: (userId: string) => {
    currentUserId = userId;
  },

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

  getBranches: () => request<Branch[]>('/api/branches'),
  createBranch: (data: Partial<Branch>) => request<Branch>('/api/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: Partial<Branch>) => request<Branch>(`/api/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBranch: (id: string) => request<{ success: boolean }>(`/api/branches/${id}`, { method: 'DELETE' }),

  getUsers: () => request<User[]>('/api/users'),
  createUser: (data: Partial<User> & { roleId?: string; branchId?: string; status?: string }) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User> & { roleId?: string; branchId?: string; status?: string }) =>
    request<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),

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

  // Documents & Templates
  getDocuments: () => request<DocumentItem[]>('/api/documents'),
  createDocument: (data: Partial<DocumentItem>) => request<DocumentItem>('/api/documents', { method: 'POST', body: JSON.stringify(data) }),
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

  // AI Gateway (Gemini 3.7 Flash)
  aiExtractDeadline: (publicationText: string) =>
    request<AIExtractDeadlineResponse>('/api/ai/extract-deadline', {
      method: 'POST',
      body: JSON.stringify({ publicationText }),
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
  }) => request<AIDraftPieceResponse>('/api/ai/draft-piece', { method: 'POST', body: JSON.stringify(params) }),
  aiSummarizeCase: (caseId: string, customContext?: string) =>
    request<AICaseSummaryResponse>('/api/ai/summarize-case', {
      method: 'POST',
      body: JSON.stringify({ caseId, customContext }),
    }),
  aiChat: (message: string, caseContext?: string) =>
    request<{ reply: string }>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, caseContext }) }),
  getAiStats: () =>
    request<{
      totalRequests: number;
      totalTokens: number;
      totalCostBRL: number;
      activeModel: string;
      recentLogs: any[];
    }>('/api/ai/stats'),

  // Audit, LGPD & Notifications
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),
  getLgpdConsents: () => request<LGPDConsent[]>('/api/lgpd'),
  createLgpdConsent: (data: Partial<LGPDConsent>) => request<LGPDConsent>('/api/lgpd/consent', { method: 'POST', body: JSON.stringify(data) }),
  getNotifications: () => request<Notification[]>('/api/notifications'),
  markNotificationAsRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // Supabase PostgreSQL Persistence Status & Sync
  getSupabaseStatus: () =>
    request<{
      connected: boolean;
      url: string | null;
      tables: Record<string, number>;
      error?: string;
    }>('/api/supabase/status'),
  syncSupabase: () =>
    request<{
      success: boolean;
      hydrated: boolean;
      counts: Record<string, number>;
      message?: string;
    }>('/api/supabase/sync', { method: 'POST' }),

  // Global Search
  search: (query: string) => request<GlobalSearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`),
};
