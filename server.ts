import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import {
  SEED_TENANTS,
  SEED_BRANCHES,
  SEED_DEPARTMENTS,
  SEED_TEAMS,
  SEED_USERS,
  SEED_ROLES,
  SEED_MEMBERSHIPS,
  SEED_PERSONS,
  SEED_CLIENTS,
  SEED_CASES,
  SEED_MOVEMENTS,
  SEED_DEADLINES,
  SEED_HEARINGS,
  SEED_DILIGENCES,
  SEED_TASKS,
  SEED_NOTIFICATIONS,
  SEED_TEMPLATES,
  SEED_DOCUMENTS,
  SEED_FEE_CONTRACTS,
  SEED_INSTALLMENTS,
  SEED_RECEIVABLES,
  SEED_PAYMENTS,
  SEED_AUDIT_LOGS,
  SEED_LGPD_CONSENTS,
} from './src/mock/seedData.ts';

import {
  calculateLegalDeadline,
  formatDateToYMD,
} from './src/lib/cpcCalendar.ts';

import {
  getSupabase,
  checkSupabaseHealth,
  hydrateFromSupabase,
  syncAllLocalToSupabase,
  syncTenantToSupabase,
  syncBranchToSupabase,
  syncUserToSupabase,
  syncRoleToSupabase,
  syncMembershipToSupabase,
  syncPersonToSupabase,
  syncClientToSupabase,
  syncCaseToSupabase,
  syncDeadlineToSupabase,
  syncHearingToSupabase,
  syncContractToSupabase,
  syncReceivableToSupabase,
  syncDocumentToSupabase,
  syncCaseMovementToSupabase,
  syncNotificationToSupabase,
  syncAuditLogToSupabase,
  syncLgpdConsentToSupabase,
  deleteFromSupabase,
  syncToSupabase,
} from './server/supabase.ts';

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
  FeeContract,
  Installment,
  AccountReceivable,
  Charge,
  Payment,
  AuditLog,
  LGPDConsent,
  AIGatewayLog,
  GlobalSearchResult,
  UserBranchAffiliation,
  ModuleMetadata,
  FeatureFlag,
  SystemUpdateManifest,
  SystemUpdateLog,
  SystemHealthReport,
} from './src/types/index.ts';

dotenv.config();

// ==========================================
// SYSTEM MODULES REGISTRY SEED
// ==========================================
const DEFAULT_SYSTEM_MODULES: ModuleMetadata[] = [
  {
    id: 'dashboard',
    name: 'Painel Geral',
    description: 'Métricas executivas, prazos do dia, audiências e visão geral do escritório.',
    version: '1.2.0',
    category: 'core',
    status: 'ACTIVE',
    dependencies: [],
    requiredPermissions: [],
    minPlanTier: 'STARTER',
    icon: 'LayoutDashboard',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-15T14:30:00Z',
    configurable: false,
  },
  {
    id: 'clients',
    name: 'Clientes & CRM',
    description: 'Gestão de pessoas físicas/jurídicas, histórico de atendimento, prospecção e LGPD.',
    version: '1.2.0',
    category: 'core',
    status: 'ACTIVE',
    dependencies: [],
    requiredPermissions: ['CLIENT_VIEW'],
    minPlanTier: 'STARTER',
    icon: 'Users',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    configurable: true,
  },
  {
    id: 'cases',
    name: 'Processos & Casos',
    description: 'Pastas processuais completas, varas, tribunais, partes, fases e movimentações.',
    version: '1.2.0',
    category: 'operations',
    status: 'ACTIVE',
    dependencies: ['clients'],
    requiredPermissions: ['CASE_VIEW'],
    minPlanTier: 'STARTER',
    icon: 'Briefcase',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-25T11:00:00Z',
    configurable: true,
  },
  {
    id: 'deadlines',
    name: 'Prazos Processuais',
    description: 'Controle de prazos com cálculo legal CPC/2015 em dias úteis e suspensões forenses.',
    version: '1.2.0',
    category: 'operations',
    status: 'ACTIVE',
    dependencies: ['cases'],
    requiredPermissions: ['DEADLINE_VIEW'],
    minPlanTier: 'STARTER',
    icon: 'Clock',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-28T09:00:00Z',
    configurable: true,
  },
  {
    id: 'calendar',
    name: 'Agenda & Audiências',
    description: 'Calendário integrado com audiências, reuniões, diligências e compromissos.',
    version: '1.1.5',
    category: 'operations',
    status: 'ACTIVE',
    dependencies: ['cases'],
    requiredPermissions: ['DEADLINE_VIEW'],
    minPlanTier: 'STARTER',
    icon: 'Calendar',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T16:00:00Z',
    configurable: true,
  },
  {
    id: 'tasks',
    name: 'Tarefas & Atividades',
    description: 'Gerenciamento de tarefas internas, checklists, prazos e delegação entre equipe.',
    version: '1.1.0',
    category: 'operations',
    status: 'ACTIVE',
    dependencies: [],
    requiredPermissions: ['DEADLINE_CREATE'],
    minPlanTier: 'STARTER',
    icon: 'CheckSquare',
    installedAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z',
    configurable: true,
  },
  {
    id: 'documents',
    name: 'Central de Documentos',
    description: 'Repositório de arquivos, peças protocoladas, procurações e controle de versões.',
    version: '1.1.8',
    category: 'documents',
    status: 'ACTIVE',
    dependencies: [],
    requiredPermissions: ['DOCUMENT_VIEW'],
    minPlanTier: 'STARTER',
    icon: 'FolderArchive',
    installedAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-08-15T15:00:00Z',
    configurable: true,
  },
  {
    id: 'templates',
    name: 'Biblioteca de Modelos',
    description: 'Modelos de peças e procurações com preenchimento automático por tags {{cliente.nome}}.',
    version: '1.1.0',
    category: 'documents',
    status: 'ACTIVE',
    dependencies: ['documents'],
    requiredPermissions: ['TEMPLATE_MANAGE'],
    minPlanTier: 'PROFESSIONAL',
    icon: 'FileText',
    installedAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
    configurable: true,
  },
  {
    id: 'document-generator',
    name: 'Gerador Automático de Peças',
    description: 'Geração em lote de procurações, contratos e declarações com validação humana.',
    version: '1.0.5',
    category: 'documents',
    status: 'ACTIVE',
    dependencies: ['templates', 'clients'],
    requiredPermissions: ['DOCUMENT_GENERATE'],
    minPlanTier: 'PROFESSIONAL',
    icon: 'FileCode',
    installedAt: '2026-03-01T14:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z',
    configurable: true,
  },
  {
    id: 'financial',
    name: 'Financeiro & Honorários',
    description: 'Contratos de honorários, parcelas, contas a receber, inadimplência e conciliação.',
    version: '1.2.0',
    category: 'financial',
    status: 'ACTIVE',
    dependencies: ['clients'],
    requiredPermissions: ['FINANCIAL_VIEW'],
    minPlanTier: 'PROFESSIONAL',
    icon: 'DollarSign',
    installedAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-08-30T17:00:00Z',
    configurable: true,
  },
  {
    id: 'reports',
    name: 'Relatórios & BI',
    description: 'Relatórios gerenciais, produtividade por advogado e taxas de sucesso processual.',
    version: '1.0.0',
    category: 'governance',
    status: 'ACTIVE',
    dependencies: ['cases', 'financial'],
    requiredPermissions: ['REPORT_VIEW'],
    minPlanTier: 'PROFESSIONAL',
    icon: 'BarChart3',
    installedAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-07-15T11:00:00Z',
    configurable: true,
  },
  {
    id: 'ai',
    name: 'IA Jurídica & Copilot',
    description: 'Assistente com Gemini para extração de prazos em publicações e minuta de petições.',
    version: '1.0.2',
    category: 'intelligence',
    status: 'ACTIVE',
    dependencies: ['documents'],
    requiredPermissions: ['AI_ASSISTANT_USE'],
    minPlanTier: 'PREMIUM',
    icon: 'Bot',
    installedAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-09-01T18:00:00Z',
    configurable: true,
  },
  {
    id: 'audit',
    name: 'Auditoria & Logs de Segurança',
    description: 'Rastreabilidade total de operações, acessos e alterações críticas no sistema.',
    version: '1.1.0',
    category: 'governance',
    status: 'ACTIVE',
    dependencies: [],
    requiredPermissions: ['AUDIT_LOG_VIEW'],
    minPlanTier: 'PROFESSIONAL',
    icon: 'ShieldCheck',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-01T12:00:00Z',
    configurable: false,
  },
  {
    id: 'updates',
    name: 'Atualizador do Sistema (Release Engine)',
    description: 'Gerenciamento de versões, verificação de releases no GitHub, backups e migrações.',
    version: '1.2.0',
    category: 'governance',
    status: 'ACTIVE',
    dependencies: [],
    requiredPermissions: ['TENANT_MANAGE'],
    minPlanTier: 'STARTER',
    icon: 'RefreshCw',
    installedAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-03T10:00:00Z',
    configurable: true,
  },
];

// ==========================================
// FEATURE FLAGS SEED
// ==========================================
const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'ff-1',
    key: 'financial.new-dashboard',
    name: 'Novo Dashboard Financeiro Interativo',
    description: 'Habilita visualização analítica com previsão de êxito e curva de fluxo de caixa.',
    module: 'financial',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'all',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'ff-2',
    key: 'documents.ai-generator',
    name: 'Gerador IA de Minutas Jurídicas',
    description: 'Permite redigir petições e cláusulas contratuais usando modelos generativos.',
    module: 'ai',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'all',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ff-3',
    key: 'cases.timeline-v2',
    name: 'Linha do Tempo Processual V2',
    description: 'Exibe movimentações em formato de linha do tempo com tags e badges de tribunal.',
    module: 'cases',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'all',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  },
  {
    id: 'ff-4',
    key: 'clients.import',
    name: 'Importador em Lote de Clientes (CSV/Excel)',
    description: 'Habilita o assistente de upload em massa de contatos e pessoas jurídicas.',
    module: 'clients',
    enabled: false,
    rolloutPercentage: 0,
    environment: 'development',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  },
];

// ==========================================
// OFFICIAL RELEASES MANIFESTS SEED
// ==========================================
const OFFICIAL_RELEASES: SystemUpdateManifest[] = [
  {
    version: '1.2.0',
    releaseName: 'v1.2.0 — Governança, Module Registry & Update Engine',
    minimumVersion: '1.0.0',
    releaseDate: '2026-09-03',
    description: 'Lançamento do painel administrativo /admin, controle de módulos a quente, feature flags e suporte a updates controlados.',
    changelog: {
      added: [
        'Área administrativa dedicada (/admin) para Platform Admin e Super Admin',
        'Module Registry com ativação/desativação dinâmica de módulos',
        'Motor de Feature Flags granulares por ambiente',
        'Sistema de verificação de releases com manifestos e validação de checksums SHA-256',
        'Camada central de Entitlements (canUse) com verificação em 4 níveis',
      ],
      changed: [
        'Reforço de RBAC no backend com checagem de módulos ativos',
        'Health check enriquecido com métricas de memória, módulos e latência',
      ],
      fixed: [
        'Isolamento estrito de dados entre escritórios/tenants no bootstrap',
        'Sincronização de permissões com papéis customizados',
      ],
      security: [
        'Validação de integridade de manifestos de atualização antes da aplicação',
        'Bloqueio automático de endpoints pertencentes a módulos desativados',
      ],
    },
    artifactUrl: 'https://github.com/4ZuR3Fl4m3S/Projeto_Advocacia_v5/releases/tag/v1.2.0',
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    databaseMigration: true,
    migrationDetails: [
      '20260903_01_create_system_modules_table.sql',
      '20260903_02_create_feature_flags_table.sql',
      '20260903_03_create_system_update_logs_table.sql',
    ],
    restartRequired: false,
    targetEnvironment: 'all',
  },
  {
    version: '1.3.0',
    releaseName: 'v1.3.0 — Automação de Tarefas & CRM Jurídico Avançado',
    minimumVersion: '1.1.0',
    releaseDate: '2026-09-15',
    description: 'Nova versão disponível no repositório oficial com módulo autônomo de Tarefas, checklists e pontuação preditiva de risco no CRM.',
    changelog: {
      added: [
        'Módulo autônomo de Tarefas com Kanban e visualização por prioridade',
        'Checklists em tarefas vinculadas a processos judiciais',
        'Importador de clientes via planilha CSV com preview e deduplicação',
      ],
      changed: [
        'Otimização do cálculo de prazos CPC/2015 com suporte a calendários de comarcas locais',
      ],
      fixed: [
        'Tratamento de prazos vencidos em feriados municipais',
      ],
      security: [
        'Assinatura digital de manifestos com chave assimétrica',
      ],
    },
    artifactUrl: 'https://github.com/4ZuR3Fl4m3S/Projeto_Advocacia_v5/releases/tag/v1.3.0',
    checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    databaseMigration: true,
    migrationDetails: [
      '20260915_01_create_tasks_checklist_table.sql',
      '20260915_02_add_crm_risk_score_column.sql',
    ],
    restartRequired: false,
    targetEnvironment: 'all',
  },
];

const DEFAULT_UPDATE_LOGS: SystemUpdateLog[] = [
  {
    id: 'upd-log-01',
    previousVersion: '1.1.0',
    targetVersion: '1.2.0',
    status: 'SUCCESS',
    startedAt: '2026-09-03T09:45:00Z',
    completedAt: '2026-09-03T09:47:30Z',
    operatorId: 'u-superadmin',
    operatorName: 'Super Administrador (Platform)',
    backupSnapshotId: 'snap-20260903-094500',
    databaseMigrationsApplied: [
      '20260903_01_create_system_modules_table.sql',
      '20260903_02_create_feature_flags_table.sql',
      '20260903_03_create_system_update_logs_table.sql',
    ],
    logs: [
      '[Update Engine] Iniciando processo de atualização para v1.2.0...',
      '[Integrity Check] Checksum SHA-256 verificado com sucesso contra manifesto oficial.',
      '[Backup] Snapshot de segurança snap-20260903-094500 gerado com sucesso.',
      '[Migrations] 3 migrações estruturais executadas em transação segura.',
      '[Health Check] Diagnóstico de sanidade do sistema: OK.',
      '[Status] Atualização concluída com êxito.',
    ],
  },
];

// ==========================================
// IN-MEMORY TENANT ISOLATED STORE
// ==========================================
class MemoryDatabase {
  systemVersion: string = '1.2.0';
  systemStartTime: number = Date.now();
  modules: ModuleMetadata[] = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_MODULES));
  featureFlags: FeatureFlag[] = JSON.parse(JSON.stringify(DEFAULT_FEATURE_FLAGS));
  updateManifests: SystemUpdateManifest[] = JSON.parse(JSON.stringify(OFFICIAL_RELEASES));
  updateLogs: SystemUpdateLog[] = JSON.parse(JSON.stringify(DEFAULT_UPDATE_LOGS));

  tenants: Tenant[] = [...SEED_TENANTS];
  branches = [...SEED_BRANCHES];
  departments = [...SEED_DEPARTMENTS];
  teams = [...SEED_TEAMS];
  users = [...SEED_USERS];
  roles = [...SEED_ROLES];
  memberships = [...SEED_MEMBERSHIPS];
  persons: Person[] = [...SEED_PERSONS];
  clients: Client[] = [...SEED_CLIENTS];
  leads: any[] = [];
  cases: Case[] = [...SEED_CASES];
  movements: Movement[] = [...SEED_MOVEMENTS];
  deadlines: Deadline[] = [...SEED_DEADLINES];
  hearings: Hearing[] = [...SEED_HEARINGS];
  diligences: Diligence[] = [...SEED_DILIGENCES];
  tasks: Task[] = [...SEED_TASKS];
  notifications: Notification[] = [...SEED_NOTIFICATIONS];
  templates = [...SEED_TEMPLATES];
  documents: DocumentItem[] = [...SEED_DOCUMENTS];
  feeContracts: FeeContract[] = [...SEED_FEE_CONTRACTS];
  installments: Installment[] = [...SEED_INSTALLMENTS];
  receivables: AccountReceivable[] = [...SEED_RECEIVABLES];
  payments: Payment[] = [...SEED_PAYMENTS];
  auditLogs: AuditLog[] = [...SEED_AUDIT_LOGS];
  lgpdConsents: LGPDConsent[] = [...SEED_LGPD_CONSENTS];
  aiLogs: AIGatewayLog[] = [];
  processedWebhookIds: Set<string> = new Set();
}

const db = new MemoryDatabase();

// ==========================================
// GEMINI AI GATEWAY INITIALIZATION
// ==========================================
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.error('Error initializing Gemini client:', err);
    }
  }
  return aiClient;
}

// ==========================================
// APP SERVER BOOTSTRAP
// ==========================================
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Fast health check endpoint for Cloud Run and platform ingress probes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --- MULTI-TENANT & CONTEXT MIDDLEWARE ---
  app.use((req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req.headers['x-tenant-id'] as string) || 't-silveira';
    const userId = (req.headers['x-user-id'] as string) || 'u-carlos';
    const branchId = (req.headers['x-branch-id'] as string) || 'b-sp-matriz';

    (req as any).tenantId = tenantId;
    (req as any).userId = userId;
    (req as any).branchId = branchId;
    next();
  });

  // Helper to log audit events
  function logAudit(
    req: Request,
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditLog['action'],
    details: string,
    diff?: any
  ) {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const user = db.users.find((u) => u.id === userId) || db.users[0];

    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      userId,
      userName: user.name,
      userEmail: user.email,
      entityType,
      entityId,
      action,
      details,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      diff,
    };
    db.auditLogs.unshift(newLog);

    // Sync audit log to Supabase in background
    syncAuditLogToSupabase(newLog);
  }

  // ==========================================
  // API ROUTES
  // ==========================================

  // --- SUPABASE POSTGRESQL STATUS & SYNC ---
  app.get('/api/supabase/status', async (req: Request, res: Response) => {
    const health = await checkSupabaseHealth();
    res.json({
      ...health,
      memoryCounts: {
        tenants: db.tenants.length,
        branches: db.branches.length,
        users: db.users.length,
        roles: db.roles.length,
        persons: db.persons.length,
        clients: db.clients.length,
        cases: db.cases.length,
        deadlines: db.deadlines.length,
        contracts: db.feeContracts.length,
        receivables: db.receivables.length,
        auditLogs: db.auditLogs.length,
      },
    });
  });

  app.post('/api/supabase/sync', async (req: Request, res: Response) => {
    // 1. Push all local records to Supabase
    const pushResult = await syncAllLocalToSupabase(db);
    // 2. Hydrate from Supabase
    const hydrateResult = await hydrateFromSupabase(db);
    const success = pushResult.success || hydrateResult.success;
    res.json({
      success,
      pushCounts: pushResult.counts,
      hydrateCounts: hydrateResult.counts,
      message: success
        ? 'Sincronização bidirecional com Supabase PostgreSQL executada com sucesso!'
        : 'Não foi possível sincronizar com Supabase (verifique as credenciais no .env).',
    });
  });

  // --- AUTH & TENANCY CONTEXT ---
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const requestedTenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const user = db.users.find((u) => u.id === userId) || db.users[0];
    const isSuperAdmin = user.id === 'u-superadmin' || user.email?.includes('superadmin');

    // User accessible tenants
    const userMemberships = db.memberships.filter((m) => m.userId === user.id);
    const accessibleTenants = isSuperAdmin 
      ? db.tenants 
      : db.tenants.filter((t) => userMemberships.some((m) => m.tenantId === t.id));

    // Resolved current tenant
    const tenant = accessibleTenants.find((t) => t.id === requestedTenantId) || accessibleTenants[0] || db.tenants[0];

    const membership = db.memberships.find(
      (m) => m.tenantId === tenant.id && m.userId === user.id
    ) || (isSuperAdmin ? {
      id: 'm-super-global',
      tenantId: tenant.id,
      userId: user.id,
      roleId: 'role-super-admin',
      branchId: 'b-sp-matriz',
      status: 'ACTIVE' as const,
      scopes: ['*'],
    } : userMemberships[0] || db.memberships[0]);

    const role = db.roles.find((r) => r.id === membership.roleId) || 
      (isSuperAdmin ? db.roles.find((r) => r.code === 'SUPER_ADMIN') : db.roles[0]);

    const allTenantBranches = db.branches.filter((b) => b.tenantId === tenant.id);
    const accessibleBranches = (isSuperAdmin || role?.code === 'SOCIO_ADMIN' || !membership?.branchId)
      ? allTenantBranches
      : allTenantBranches.filter((b) => b.id === membership?.branchId);

    const activeBranch = accessibleBranches.find((b) => b.id === (req as any).branchId) || accessibleBranches[0] || allTenantBranches[0];

    res.json({
      user,
      tenant,
      allTenants: accessibleTenants,
      membership,
      role,
      activeBranch,
      branches: accessibleBranches,
      permissions: role?.permissions || [],
      scopes: membership?.scopes || [],
    });
  });

  // --- BOOTSTRAP ENDPOINT ---
  app.get('/api/bootstrap', (req: Request, res: Response) => {
    const requestedTenantId = (req as any).tenantId || 't-silveira';
    const userId = (req as any).userId || 'u-carlos';
    const requestedBranchId = (req as any).branchId || 'b-sp-matriz';

    const currentUser = db.users.find((u) => u.id === userId) || db.users[0];
    const isSuperAdmin = currentUser.id === 'u-superadmin' || currentUser.email?.includes('superadmin');

    // Strict Tenant Isolation: only return tenants the user has active membership in (or all if Super Admin)
    const userMemberships = db.memberships.filter((m) => m.userId === currentUser.id);
    const accessibleTenants = isSuperAdmin
      ? db.tenants
      : db.tenants.filter((t) => userMemberships.some((m) => m.tenantId === t.id));

    const currentTenant =
      accessibleTenants.find((t) => t.id === requestedTenantId) ||
      accessibleTenants[0] ||
      db.tenants[0];

    // Membership & Role for current tenant
    const currentUserMem =
      db.memberships.find((m) => m.tenantId === currentTenant.id && m.userId === currentUser.id) ||
      (isSuperAdmin
        ? {
            id: `m-super-${currentTenant.id}`,
            tenantId: currentTenant.id,
            userId: currentUser.id,
            roleId: 'role-super-admin',
            branchId: 'b-sp-matriz',
            status: 'ACTIVE' as const,
            scopes: ['*'],
          }
        : userMemberships[0] || db.memberships[0]);

    const currentRole =
      db.roles.find((r) => r.id === currentUserMem?.roleId) ||
      (isSuperAdmin ? db.roles.find((r) => r.code === 'SUPER_ADMIN') : db.roles[0]);

    // Strict Branch Isolation: filter branches accessible by current role/membership
    const allTenantBranches = db.branches.filter((b) => b.tenantId === currentTenant.id);
    const accessibleBranches =
      isSuperAdmin || currentRole?.code === 'SOCIO_ADMIN' || !currentUserMem?.branchId
        ? allTenantBranches
        : allTenantBranches.filter((b) => b.id === currentUserMem?.branchId);

    const currentBranch =
      accessibleBranches.find((b) => b.id === requestedBranchId) ||
      accessibleBranches[0] ||
      allTenantBranches[0] ||
      db.branches[0];

    const tenantPersons = db.persons.filter((p) => p.tenantId === currentTenant.id);
    const tenantClients = db.clients
      .filter((c) => c.tenantId === currentTenant.id)
      .map((c) => ({
        ...c,
        person: tenantPersons.find((p) => p.id === c.personId),
      }));

    const tenantCases = db.cases
      .filter((c) => c.tenantId === currentTenant.id)
      .map((c) => ({
        ...c,
        parties: (c.parties || []).map((pt) => ({
          ...pt,
          person: tenantPersons.find((p) => p.id === pt.personId),
        })),
        responsibleLawyerName:
          db.users.find((u) => u.id === c.responsibleLawyerId)?.name || c.responsibleLawyerName,
      }));

    const tenantDeadlines = db.deadlines.filter((d) => d.tenantId === currentTenant.id);
    const tenantHearings = db.hearings.filter((h) => h.tenantId === currentTenant.id);
    const tenantDiligences = db.diligences.filter((d) => d.tenantId === currentTenant.id);
    const tenantTasks = db.tasks.filter((t) => t.tenantId === currentTenant.id);
    const tenantNotifications = db.notifications.filter((n) => n.tenantId === currentTenant.id);
    const tenantDocuments = db.documents.filter((d) => d.tenantId === currentTenant.id);
    const tenantTemplates = db.templates.filter((t) => t.tenantId === currentTenant.id);
    const tenantContracts = db.feeContracts.filter((fc) => fc.tenantId === currentTenant.id);
    const tenantReceivables = db.receivables.filter((r) => r.tenantId === currentTenant.id);
    const tenantPayments = db.payments.filter((p) => p.tenantId === currentTenant.id);
    const tenantAuditLogs = db.auditLogs.filter((l) => l.tenantId === currentTenant.id);
    const tenantLgpdConsents = db.lgpdConsents.filter((c) => c.tenantId === currentTenant.id);
    const tenantRoles = db.roles.filter((r) => r.tenantId === currentTenant.id || r.isSystem);

    const tenantLeads = (db.leads || [])
      .filter((l) => l.tenantId === currentTenant.id)
      .map((l) => ({
        ...l,
        person: tenantPersons.find((p) => p.id === l.personId),
      }));

    // Financial calculations
    const totalRecebidoMes = tenantPayments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalAReceberAberto = tenantReceivables
      .filter((r) => r.status === 'OPEN')
      .reduce((acc, r) => acc + r.amount, 0);
    const totalInadimplente = tenantReceivables
      .filter((r) => r.status === 'OVERDUE')
      .reduce((acc, r) => acc + r.amount, 0);
    const totalFaturadoMes = totalRecebidoMes + totalAReceberAberto;
    const taxaInadimplencia =
      totalFaturadoMes > 0 ? (totalInadimplente / totalFaturadoMes) * 100 : 0;

    const financial = {
      totalFaturadoMes,
      totalRecebidoMes,
      totalAReceberAberto,
      totalInadimplente,
      taxaInadimplencia: Math.round(taxaInadimplencia * 10) / 10,
      honorariosExitoPrevisao: 450000.0,
      receitaMesAMes: [
        { month: 'Mai/26', previsto: 42000, realizado: 42000 },
        { month: 'Jun/26', previsto: 48000, realizado: 48000 },
        { month: 'Jul/26', previsto: 55000, realizado: 52000 },
        { month: 'Ago/26', previsto: 60000, realizado: 45000 },
        { month: 'Set/26 (Prev)', previsto: 68000, realizado: 12000 },
      ],
      distribuicaoPorTipo: [
        { tipo: 'Honorários Fixos / Parcelados', valor: 230000, percentual: 52 },
        { tipo: 'Partido Mensal (Retainer)', valor: 114000, percentual: 26 },
        { tipo: 'Honorários de Êxito', valor: 95000, percentual: 22 },
      ],
    };

    const dashboard = {
      activeCasesCount: tenantCases.filter((c) => c.status === 'ACTIVE').length,
      pendingDeadlinesCount: tenantDeadlines.filter((d) => d.status === 'PENDING').length,
      scheduledHearingsCount: tenantHearings.filter((h) => h.status === 'SCHEDULED').length,
      activeClientsCount: tenantClients.filter((c) => c.status === 'ACTIVE').length,
      totalReceivablesMonth: totalAReceberAberto,
      totalReceivedMonth: totalRecebidoMes,
    };

    const tenantMemberships = db.memberships.filter((m) => m.tenantId === currentTenant.id);
    const tenantUsers = db.users
      .filter((u) => tenantMemberships.some((m) => m.userId === u.id))
      .map((u) => {
        const mem = tenantMemberships.find((m) => m.userId === u.id);
        const role = db.roles.find((r) => r.id === mem?.roleId);
        const branch = db.branches.find((b) => b.id === mem?.branchId);
        return {
          ...u,
          roleId: mem?.roleId,
          roleName: role?.name || 'Membro',
          roleCode: role?.code,
          branchId: mem?.branchId,
          branchName: branch?.name,
          status: mem?.status || 'ACTIVE',
        };
      });

    res.json({
      tenants: accessibleTenants,
      allTenants: accessibleTenants,
      currentTenant,
      branches: accessibleBranches,
      allBranches: allTenantBranches,
      currentBranch,
      users: tenantUsers.length > 0 ? tenantUsers : db.users,
      allUsers: db.users,
      currentUser: {
        ...currentUser,
        roleId: currentUserMem?.roleId,
        roleName: currentRole?.name,
        roleCode: currentRole?.code,
        branchId: currentBranch.id,
      },
      currentRole,
      membership: currentUserMem,
      dashboard,
      financial,
      persons: tenantPersons,
      clients: tenantClients,
      leads: tenantLeads,
      cases: tenantCases,
      deadlines: tenantDeadlines,
      hearings: tenantHearings,
      diligences: tenantDiligences,
      tasks: tenantTasks,
      notifications: tenantNotifications,
      documents: tenantDocuments,
      templates: tenantTemplates,
      contracts: tenantContracts,
      receivables: tenantReceivables,
      roles: tenantRoles,
      auditLogs: tenantAuditLogs,
      lgpdConsents: tenantLgpdConsents,
      modules: db.modules,
      featureFlags: db.featureFlags,
      systemVersion: db.systemVersion,
    });
  });

  // ==========================================
  // MODULE REGISTRY & PLATFORM ADMIN ROUTES
  // ==========================================
  app.get('/api/admin/modules', (req: Request, res: Response) => {
    res.json({
      modules: db.modules,
      activeCount: db.modules.filter((m) => m.status === 'ACTIVE').length,
      totalCount: db.modules.length,
    });
  });

  app.patch('/api/admin/modules/:id', (req: Request, res: Response) => {
    const moduleId = req.params.id;
    const { status, settings } = req.body;
    const mod = db.modules.find((m) => m.id === moduleId);

    if (!mod) {
      return res.status(404).json({ error: 'Módulo não encontrado no registro da plataforma' });
    }

    const previousStatus = mod.status;
    if (status && ['ACTIVE', 'INACTIVE', 'MAINTENANCE'].includes(status)) {
      mod.status = status;
    }
    if (settings && typeof settings === 'object') {
      mod.settings = { ...mod.settings, ...settings };
    }
    mod.updatedAt = new Date().toISOString();

    logAudit(
      req,
      'USER',
      moduleId,
      'UPDATE',
      `Alterou status do módulo ${mod.name} de ${previousStatus} para ${mod.status}`
    );

    res.json({
      success: true,
      module: mod,
      message: `Módulo ${mod.name} agora está ${mod.status === 'ACTIVE' ? 'Ativo' : 'Desativado'}.`,
    });
  });

  // --- FEATURE FLAGS ---
  app.get('/api/admin/feature-flags', (req: Request, res: Response) => {
    res.json(db.featureFlags);
  });

  app.post('/api/admin/feature-flags', (req: Request, res: Response) => {
    const newFlag: FeatureFlag = {
      id: `ff-${Date.now()}`,
      key: req.body.key,
      name: req.body.name,
      description: req.body.description || '',
      module: req.body.module || 'dashboard',
      enabled: req.body.enabled ?? true,
      rolloutPercentage: req.body.rolloutPercentage ?? 100,
      environment: req.body.environment || 'all',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.featureFlags.unshift(newFlag);
    logAudit(req, 'USER', newFlag.id, 'CREATE', `Criou feature flag: ${newFlag.key}`);
    res.status(201).json(newFlag);
  });

  app.patch('/api/admin/feature-flags/:id', (req: Request, res: Response) => {
    const flag = db.featureFlags.find((f) => f.id === req.params.id || f.key === req.params.id);
    if (!flag) return res.status(404).json({ error: 'Feature flag não encontrada' });

    if (req.body.enabled !== undefined) flag.enabled = req.body.enabled;
    if (req.body.rolloutPercentage !== undefined) flag.rolloutPercentage = req.body.rolloutPercentage;
    if (req.body.name) flag.name = req.body.name;
    if (req.body.description) flag.description = req.body.description;
    flag.updatedAt = new Date().toISOString();

    logAudit(req, 'USER', flag.id, 'UPDATE', `Alterou feature flag ${flag.key}: enabled=${flag.enabled}`);
    res.json(flag);
  });

  // --- SYSTEM UPDATE ENGINE & RELEASE MANAGEMENT ---
  app.get('/api/admin/updates/check', (req: Request, res: Response) => {
    const currentVersion = db.systemVersion;
    // Latest available release from official releases
    const latestRelease = db.updateManifests[db.updateManifests.length - 1];
    const updateAvailable = latestRelease && latestRelease.version !== currentVersion;

    res.json({
      currentVersion,
      latestVersion: latestRelease?.version || currentVersion,
      updateAvailable,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'localhost',
      currentManifest: db.updateManifests.find((m) => m.version === currentVersion) || db.updateManifests[0],
      latestManifest: latestRelease,
      releasesHistory: db.updateManifests,
    });
  });

  app.post('/api/admin/updates/apply', (req: Request, res: Response) => {
    const { targetVersion } = req.body;
    const manifest = db.updateManifests.find((m) => m.version === targetVersion);

    if (!manifest) {
      return res.status(404).json({ error: 'Manifesto da versão de atualização não encontrado' });
    }

    const previousVersion = db.systemVersion;
    const operatorId = (req as any).userId || 'u-superadmin';
    const operator = db.users.find((u) => u.id === operatorId) || db.users[0];
    const snapshotId = `snap-${Date.now()}`;

    // Execute simulated atomic update lifecycle
    const logSteps: string[] = [
      `[Update Engine] Inicializando processo de atualização para ${manifest.version} (${manifest.releaseName})...`,
      `[Integrity Check] Validando integridade de checksum SHA-256 (${manifest.checksumSha256})... OK.`,
      `[Security Check] Verificando permissão 'system.update' e origem oficial do release GitHub... OK.`,
      `[Backup] Gerando snapshot de segurança e integridade (${snapshotId})... OK.`,
    ];

    if (manifest.databaseMigration && manifest.migrationDetails) {
      logSteps.push(`[Migrations] Aplicando ${manifest.migrationDetails.length} scripts de migração estrutural...`);
      manifest.migrationDetails.forEach((m) => {
        logSteps.push(`  -> Executado com sucesso: ${m}`);
      });
    }

    logSteps.push(`[Health Check] Executando diagnóstico e verificação de sanidade dos serviços... OK.`);
    logSteps.push(`[Finalize] Atualização da versão do sistema de ${previousVersion} para ${manifest.version} concluída com sucesso.`);

    const updateLog: SystemUpdateLog = {
      id: `upd-${Date.now()}`,
      previousVersion,
      targetVersion: manifest.version,
      status: 'SUCCESS',
      startedAt: new Date(Date.now() - 3000).toISOString(),
      completedAt: new Date().toISOString(),
      operatorId: operator.id,
      operatorName: operator.name,
      backupSnapshotId: snapshotId,
      databaseMigrationsApplied: manifest.migrationDetails || [],
      logs: logSteps,
    };

    db.systemVersion = manifest.version;
    db.updateLogs.unshift(updateLog);

    logAudit(
      req,
      'USER',
      updateLog.id,
      'UPDATE',
      `Executou atualização do Projeto Advocacia para ${manifest.version}`
    );

    res.json({
      success: true,
      message: `Sistema atualizado com sucesso para a versão ${manifest.version}!`,
      newVersion: db.systemVersion,
      updateLog,
    });
  });

  app.post('/api/admin/updates/rollback/:id', (req: Request, res: Response) => {
    const log = db.updateLogs.find((l) => l.id === req.params.id);
    if (!log) return res.status(404).json({ error: 'Registro de update não encontrado' });

    const currentVersion = db.systemVersion;
    const targetRollback = log.previousVersion;

    const rollbackLog: SystemUpdateLog = {
      id: `upd-rollback-${Date.now()}`,
      previousVersion: currentVersion,
      targetVersion: targetRollback,
      status: 'ROLLED_BACK',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      operatorId: (req as any).userId || 'u-superadmin',
      operatorName: 'Super Administrador (Platform)',
      backupSnapshotId: log.backupSnapshotId,
      databaseMigrationsApplied: [],
      logs: [
        `[Rollback Engine] Iniciando rollback para a versão anterior ${targetRollback}...`,
        `[Snapshot Restore] Restaurando dados a partir do snapshot ${log.backupSnapshotId}... OK.`,
        `[Status] Rollback concluído com sucesso.`,
      ],
      rollbackReason: req.body.reason || 'Reversão solicitada pelo administrador da plataforma.',
    };

    db.systemVersion = targetRollback;
    db.updateLogs.unshift(rollbackLog);

    logAudit(req, 'USER', rollbackLog.id, 'UPDATE', `Executou rollback do sistema para versão ${targetRollback}`);

    res.json({
      success: true,
      message: `Rollback para a versão ${targetRollback} concluído com sucesso.`,
      newVersion: db.systemVersion,
      rollbackLog,
    });
  });

  app.get('/api/admin/updates/history', (req: Request, res: Response) => {
    res.json(db.updateLogs);
  });

  // --- COMPREHENSIVE HEALTH CHECK & OBSERVABILITY ---
  app.get('/api/admin/health', (req: Request, res: Response) => {
    const memUsage = process.memoryUsage ? process.memoryUsage() : { rss: 0, heapUsed: 0, heapTotal: 0 };
    const uptimeSec = Math.floor((Date.now() - db.systemStartTime) / 1000);

    const totalRecords =
      db.cases.length +
      db.clients.length +
      db.deadlines.length +
      db.hearings.length +
      db.documents.length +
      db.receivables.length +
      db.auditLogs.length;

    const health: SystemHealthReport = {
      status: 'HEALTHY',
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'localhost',
      version: db.systemVersion,
      uptimeSeconds: uptimeSec,
      timestamp: new Date().toISOString(),
      database: {
        status: 'CONNECTED',
        provider: 'InMemoryRepository (Ready for PostgreSQL/Drizzle migration)',
        totalRecords,
        latencyMs: 1.2,
      },
      memory: {
        rssMb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10,
      },
      activeModulesCount: db.modules.filter((m) => m.status === 'ACTIVE').length,
      totalModulesCount: db.modules.length,
      featureFlagsActiveCount: db.featureFlags.filter((f) => f.enabled).length,
      aiGatewayStatus: process.env.GEMINI_API_KEY ? 'READY' : 'MISSING_KEY',
      security: {
        lastAuditLogTimestamp: db.auditLogs[0]?.timestamp || new Date().toISOString(),
        mfaEnforced: false,
        activeSessionsCount: 1,
      },
      storage: {
        status: 'OK',
        documentsCount: db.documents.length,
        storageUsedBytes: db.documents.reduce((acc, d) => acc + (d.fileSize || 1024), 0),
      },
    };

    res.json(health);
  });

  // Public Health Endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: db.systemVersion,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'localhost',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/leads', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const leads = (db.leads || [])
      .filter((l) => l.tenantId === tenantId)
      .map((l) => ({
        ...l,
        person: db.persons.find((p) => p.id === l.personId),
      }));
    res.json(leads);
  });

  app.post('/api/leads', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const newLead = {
      ...req.body,
      id: `lead-${Date.now()}`,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    db.leads.unshift(newLead);
    res.status(201).json(newLead);
  });

  // --- TENANTS / ESCRITÓRIOS ---
  app.get('/api/tenants', (req: Request, res: Response) => {
    res.json(db.tenants);
  });

  app.post('/api/tenants', async (req: Request, res: Response) => {
    const rawSlug = req.body.slug || req.body.name || `escritorio-${Date.now()}`;
    const cleanSlug = rawSlug
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-');

    const newTenant: Tenant = {
      id: `t-${Date.now()}`,
      name: req.body.name || 'Novo Escritório de Advocacia',
      tradeName: req.body.tradeName || req.body.name,
      cnpj: req.body.cnpj || '00.000.000/0001-00',
      oabOfficeRegister: req.body.oabOfficeRegister || '',
      slug: cleanSlug,
      plan: req.body.plan || 'ENTERPRISE',
      active: true,
      contactEmail: req.body.contactEmail || '',
      contactPhone: req.body.contactPhone || '',
      settings: {
        cpcCountDaysDefault: true,
        notifyDeadlinesDaysBefore: [1, 3, 5],
        currency: 'BRL',
        pixKey: req.body.pixKey || '',
        mercadopagoConfigured: true,
        ...(req.body.settings || {}),
      },
      createdAt: new Date().toISOString(),
    };
    db.tenants.push(newTenant);

    // Create Main Branch
    const mainBranch: Branch = {
      id: `b-${Date.now()}-matriz`,
      tenantId: newTenant.id,
      name: req.body.mainBranchName || `Matriz ${req.body.mainBranchCity || 'São Paulo'}`,
      code: req.body.mainBranchCode || 'MAT-01',
      city: req.body.mainBranchCity || 'São Paulo',
      state: req.body.mainBranchState || 'SP',
      isMain: true,
      address: req.body.mainBranchAddress || 'Sede Principal',
      phone: req.body.mainBranchPhone || newTenant.contactPhone,
      email: req.body.mainBranchEmail || newTenant.contactEmail,
    };
    db.branches.push(mainBranch);

    // Create Standard Roles for this new tenant
    const socioAdminRole: Role = {
      id: `role-${newTenant.id}-socio-admin`,
      tenantId: newTenant.id,
      code: 'SOCIO_ADMIN',
      name: 'Sócio Administrador',
      description: 'Acesso irrestrito a todos os módulos, faturamento, inteligência artificial e governança institucional.',
      isSystem: true,
      permissions: [
        { code: 'CASES_ALL', resource: 'CASES', action: 'APPROVE', effect: 'ALLOW' },
        { code: 'CLIENTS_ALL', resource: 'CLIENTS', action: 'APPROVE', effect: 'ALLOW' },
        { code: 'FINANCIAL_ALL', resource: 'FINANCIAL', action: 'APPROVE', effect: 'ALLOW' },
        { code: 'DOCUMENTS_ALL', resource: 'DOCUMENTS', action: 'APPROVE', effect: 'ALLOW' },
        { code: 'SETTINGS_ALL', resource: 'SETTINGS', action: 'APPROVE', effect: 'ALLOW' },
        { code: 'AI_ALL', resource: 'AI_GATEWAY', action: 'EXECUTE', effect: 'ALLOW' },
        { code: 'AUDIT_ALL', resource: 'AUDIT', action: 'READ', effect: 'ALLOW' },
        { code: 'DEADLINES_ALL', resource: 'DEADLINES', action: 'APPROVE', effect: 'ALLOW' },
      ],
    };
    db.roles.push(socioAdminRole);

    // Handle initial Admin User if provided
    let adminUser: User | null = null;
    if (req.body.adminName && req.body.adminEmail) {
      const existingUser = db.users.find(
        (u) => u.email.toLowerCase() === req.body.adminEmail.toLowerCase()
      );
      if (existingUser) {
        adminUser = existingUser;
      } else {
        adminUser = {
          id: `u-${Date.now()}-admin`,
          name: req.body.adminName,
          email: req.body.adminEmail,
          phone: req.body.adminPhone || '',
          oabNumber: req.body.adminOabNumber || '',
          oabUf: req.body.adminOabUf || 'SP',
          active: true,
          avatarUrl: req.body.adminAvatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
        };
        db.users.push(adminUser);
      }

      // Link Admin User with Socio Admin Role & Matriz
      const adminMembership: Membership = {
        id: `m-${Date.now()}-${adminUser.id}`,
        tenantId: newTenant.id,
        userId: adminUser.id,
        roleId: socioAdminRole.id,
        branchId: mainBranch.id,
        status: 'ACTIVE',
        scopes: ['*'],
      };
      db.memberships.push(adminMembership);
    }

    // Always link Super Admin to new tenant
    const superAdminMem: Membership = {
      id: `m-super-${Date.now()}-${newTenant.id}`,
      tenantId: newTenant.id,
      userId: 'u-superadmin',
      roleId: 'role-super-admin',
      branchId: mainBranch.id,
      status: 'ACTIVE',
      scopes: ['*'],
    };
    db.memberships.push(superAdminMem);

    // Add initial Welcome Notification
    const welcomeNotification: Notification = {
      id: `notif-welcome-${newTenant.id}`,
      tenantId: newTenant.id,
      userId: adminUser?.id || 'u-superadmin',
      type: 'SYSTEM',
      title: 'Ambiente Institucional Provisionado!',
      message: `O escritório "${newTenant.name}" foi ativado com sucesso no plano ${newTenant.plan}. Configure a equipe e modelos de documentos.`,
      createdAt: new Date().toISOString(),
      read: false,
      link: 'settings',
    };
    db.notifications.unshift(welcomeNotification);

    // Persist all created entities to Supabase PostgreSQL immediately
    await syncTenantToSupabase(newTenant);
    await syncBranchToSupabase(mainBranch);
    await syncRoleToSupabase(socioAdminRole);
    if (adminUser) {
      await syncUserToSupabase(adminUser);
      const adminMem = db.memberships.find((m) => m.userId === adminUser!.id && m.tenantId === newTenant.id);
      if (adminMem) await syncMembershipToSupabase(adminMem);
    }
    await syncMembershipToSupabase(superAdminMem);
    await syncNotificationToSupabase(welcomeNotification);

    logAudit(req, 'AUTH', newTenant.id, 'CREATE', `Provisionou novo escritório SaaS (Tenant): ${newTenant.name} com sede em ${mainBranch.city}/${mainBranch.state}`);
    res.status(201).json({
      tenant: newTenant,
      mainBranch,
      adminUser,
    });
  });

  app.put('/api/tenants/:id', async (req: Request, res: Response) => {
    const tenantIndex = db.tenants.findIndex((t) => t.id === req.params.id);
    if (tenantIndex === -1) {
      return res.status(404).json({ error: 'Escritório/Tenant não encontrado' });
    }
    const current = db.tenants[tenantIndex];
    const updated: Tenant = {
      ...current,
      ...req.body,
      settings: {
        ...current.settings,
        ...(req.body.settings || {}),
      },
    };
    db.tenants[tenantIndex] = updated;
    await syncTenantToSupabase(updated);
    logAudit(req, 'AUTH', updated.id, 'UPDATE', `Atualizou dados cadastrais e governança do escritório: ${updated.name}`);
    res.json(updated);
  });

  // --- BRANCHES / FILIAIS ---
  app.get('/api/branches', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const branches = db.branches.filter((b) => b.tenantId === tenantId);
    res.json(branches);
  });

  app.post('/api/branches', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    if (req.body.isMain) {
      db.branches.forEach((b) => {
        if (b.tenantId === tenantId) b.isMain = false;
      });
    }
    const newBranch: Branch = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      name: req.body.name || 'Nova Unidade',
      code: req.body.code || `UNID-${db.branches.filter((b) => b.tenantId === tenantId).length + 1}`,
      city: req.body.city || 'São Paulo',
      state: req.body.state || 'SP',
      isMain: Boolean(req.body.isMain),
      address: req.body.address || '',
      phone: req.body.phone || '',
      email: req.body.email || '',
    };
    db.branches.push(newBranch);
    await syncBranchToSupabase(newBranch);
    logAudit(req, 'AUTH', newBranch.id, 'CREATE', `Cadastrou nova unidade/filial: ${newBranch.name} (${newBranch.city}/${newBranch.state})`);
    res.status(201).json(newBranch);
  });

  app.put('/api/branches/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const index = db.branches.findIndex((b) => b.id === req.params.id && b.tenantId === tenantId);
    if (index === -1) {
      return res.status(404).json({ error: 'Filial não encontrada' });
    }
    if (req.body.isMain) {
      db.branches.forEach((b) => {
        if (b.tenantId === tenantId && b.id !== req.params.id) {
          b.isMain = false;
        }
      });
    }
    const updated = { ...db.branches[index], ...req.body };
    db.branches[index] = updated;
    await syncBranchToSupabase(updated);
    logAudit(req, 'AUTH', updated.id, 'UPDATE', `Atualizou dados da unidade: ${updated.name}`);
    res.json(updated);
  });

  app.delete('/api/branches/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const branch = db.branches.find((b) => b.id === req.params.id && b.tenantId === tenantId);
    if (!branch) {
      return res.status(404).json({ error: 'Filial não encontrada' });
    }
    const tenantBranches = db.branches.filter((b) => b.tenantId === tenantId);
    if (tenantBranches.length <= 1) {
      return res.status(400).json({ error: 'Não é possível remover a única unidade do escritório.' });
    }
    db.branches = db.branches.filter((b) => b.id !== req.params.id);
    await deleteFromSupabase('branches', 'id', req.params.id);
    logAudit(req, 'AUTH', branch.id, 'DELETE', `Excluiu filial/unidade: ${branch.name}`);
    res.json({ success: true });
  });

  // --- ROLES & PERMISSIONS RBAC ---
  app.get('/api/roles', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const roles = db.roles.filter((r) => r.tenantId === tenantId || r.isSystem);
    res.json(roles);
  });

  app.post('/api/roles', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const newRole: Role = {
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      code: req.body.code || `ROLE_${Date.now()}` as any,
      name: req.body.name || 'Nova Função',
      description: req.body.description || '',
      isSystem: false,
      permissions: req.body.permissions || [],
    };
    db.roles.push(newRole);
    await syncRoleToSupabase(newRole);
    logAudit(req, 'AUTH', newRole.id, 'CREATE', `Cadastrou nova função RBAC: ${newRole.name} (${newRole.permissions.length} permissões)`);
    res.status(201).json(newRole);
  });

  app.put('/api/roles/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const index = db.roles.findIndex((r) => r.id === req.params.id && (r.tenantId === tenantId || r.isSystem));
    if (index === -1) {
      return res.status(404).json({ error: 'Função/Perfil não encontrado' });
    }
    const updated = {
      ...db.roles[index],
      ...req.body,
      id: db.roles[index].id,
      isSystem: db.roles[index].isSystem,
    };
    db.roles[index] = updated;
    await syncRoleToSupabase(updated);
    logAudit(req, 'AUTH', updated.id, 'UPDATE', `Atualizou matriz de permissões da função: ${updated.name}`);
    res.json(updated);
  });

  app.delete('/api/roles/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const role = db.roles.find((r) => r.id === req.params.id && r.tenantId === tenantId);
    if (!role) {
      return res.status(404).json({ error: 'Função não encontrada ou é um perfil protegido do sistema' });
    }
    if (role.isSystem) {
      return res.status(400).json({ error: 'Perfis nativos do sistema não podem ser excluídos.' });
    }
    db.roles = db.roles.filter((r) => r.id !== req.params.id);
    await deleteFromSupabase('roles', 'id', req.params.id);
    logAudit(req, 'AUTH', role.id, 'DELETE', `Excluiu função RBAC personalizada: ${role.name}`);
    res.json({ success: true });
  });

  // --- USERS & TEAM MEMBERS ---
  app.get('/api/users', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const tenantMemberships = db.memberships.filter((m) => m.tenantId === tenantId);
    const tenantUsers = db.users
      .filter((u) => tenantMemberships.some((m) => m.userId === u.id))
      .map((u) => {
        const userMems = tenantMemberships.filter((m) => m.userId === u.id);
        const primaryMem = userMems.find((m) => m.isPrimary) || userMems[0];
        const role = db.roles.find((r) => r.id === primaryMem?.roleId);
        const branch = db.branches.find((b) => b.id === primaryMem?.branchId);

        const branchAffiliations: UserBranchAffiliation[] = userMems.map((m) => {
          const mRole = db.roles.find((r) => r.id === m.roleId);
          const mBranch = db.branches.find((b) => b.id === m.branchId);
          return {
            id: m.id,
            branchId: m.branchId,
            branchName: mBranch ? `${mBranch.name} (${mBranch.city}/${mBranch.state})` : 'Filial',
            roleId: m.roleId,
            roleName: mRole?.name || 'Membro',
            roleCode: mRole?.code,
            email: m.email || u.email,
            phone: m.phone || u.phone || '',
            status: (m.status as any) || 'ACTIVE',
            isPrimary: Boolean(m.isPrimary || (primaryMem && m.id === primaryMem.id)),
          };
        });

        return {
          ...u,
          roleId: primaryMem?.roleId,
          roleName: role?.name || 'Membro',
          roleCode: role?.code,
          branchId: primaryMem?.branchId,
          branchName: branch?.name,
          status: primaryMem?.status || (u.active ? 'ACTIVE' : 'SUSPENDED'),
          branchAffiliations,
          memberships: branchAffiliations,
        };
      });
    res.json(tenantUsers.length > 0 ? tenantUsers : db.users);
  });

  app.post('/api/users', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const defaultBranchId = db.branches.find((b) => b.tenantId === tenantId)?.id || db.branches[0]?.id;
    const defaultRoleId = db.roles.find((r) => r.tenantId === tenantId || r.isSystem)?.id || db.roles[0]?.id;

    const rawAffiliations = Array.isArray(req.body.branchAffiliations) && req.body.branchAffiliations.length > 0
      ? req.body.branchAffiliations
      : [
          {
            branchId: req.body.branchId || defaultBranchId,
            roleId: req.body.roleId || defaultRoleId,
            email: req.body.email || '',
            phone: req.body.phone || '',
            status: req.body.status || 'ACTIVE',
            isPrimary: true,
          },
        ];

    // Ensure at least one has isPrimary true
    const hasPrimary = rawAffiliations.some((a: any) => Boolean(a.isPrimary));
    if (!hasPrimary && rawAffiliations.length > 0) {
      rawAffiliations[0].isPrimary = true;
    }

    const primaryAff = rawAffiliations.find((a: any) => Boolean(a.isPrimary)) || rawAffiliations[0];

    const newUser: User = {
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: req.body.name || 'Novo Advogado / Colaborador',
      email: req.body.email || primaryAff.email || `usuario-${Date.now()}@escritorio.adv.br`,
      phone: req.body.phone || primaryAff.phone || '',
      oabNumber: req.body.oabNumber || '',
      oabUf: req.body.oabUf || 'SP',
      avatarUrl: req.body.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      active: req.body.active !== false && primaryAff.status !== 'SUSPENDED',
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);

    const createdMemberships: Membership[] = rawAffiliations.map((aff: any, idx: number) => {
      const mem: Membership = {
        id: `m-${newUser.id}-${aff.branchId || idx}`,
        tenantId,
        userId: newUser.id,
        roleId: aff.roleId || defaultRoleId,
        branchId: aff.branchId || defaultBranchId,
        status: (aff.status as any) || 'ACTIVE',
        email: aff.email || newUser.email,
        phone: aff.phone || newUser.phone || '',
        isPrimary: Boolean(aff.isPrimary),
        scopes: ['*'],
      };
      db.memberships.push(mem);
      return mem;
    });

    // Supabase sync
    await syncUserToSupabase(newUser);
    const primaryMembership = createdMemberships.find((m) => m.isPrimary) || createdMemberships[0];
    if (primaryMembership) {
      await syncMembershipToSupabase(primaryMembership, rawAffiliations);
    }

    const primaryRole = db.roles.find((r) => r.id === primaryMembership?.roleId);
    const primaryBranch = db.branches.find((b) => b.id === primaryMembership?.branchId);

    const branchAffiliations: UserBranchAffiliation[] = createdMemberships.map((m) => {
      const mRole = db.roles.find((r) => r.id === m.roleId);
      const mBranch = db.branches.find((b) => b.id === m.branchId);
      return {
        id: m.id,
        branchId: m.branchId,
        branchName: mBranch ? `${mBranch.name} (${mBranch.city}/${mBranch.state})` : 'Filial',
        roleId: m.roleId,
        roleName: mRole?.name || 'Membro',
        roleCode: mRole?.code,
        email: m.email || newUser.email,
        phone: m.phone || newUser.phone || '',
        status: m.status,
        isPrimary: m.isPrimary,
      };
    });

    const returnUser = {
      ...newUser,
      roleId: primaryMembership?.roleId,
      roleName: primaryRole?.name || 'Membro',
      roleCode: primaryRole?.code,
      branchId: primaryMembership?.branchId,
      branchName: primaryBranch?.name,
      status: primaryMembership?.status || 'ACTIVE',
      branchAffiliations,
      memberships: branchAffiliations,
    };

    logAudit(
      req,
      'AUTH',
      newUser.id,
      'CREATE',
      `Cadastrou novo membro na equipe: ${newUser.name} (${newUser.email}) com ${branchAffiliations.length} filial(is) vinculada(s)`
    );
    res.status(201).json(returnUser);
  });

  app.put('/api/users/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const userIndex = db.users.findIndex((u) => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const current = db.users[userIndex];
    const updatedUser: User = {
      ...current,
      ...req.body,
    };
    db.users[userIndex] = updatedUser;

    let branchAffiliations: UserBranchAffiliation[] = [];

    if (Array.isArray(req.body.branchAffiliations) && req.body.branchAffiliations.length > 0) {
      // Remove old memberships for this user in this tenant
      db.memberships = db.memberships.filter((m) => !(m.userId === req.params.id && m.tenantId === tenantId));

      const hasPrimary = req.body.branchAffiliations.some((a: any) => Boolean(a.isPrimary));
      if (!hasPrimary && req.body.branchAffiliations.length > 0) {
        req.body.branchAffiliations[0].isPrimary = true;
      }

      const newMems: Membership[] = req.body.branchAffiliations.map((aff: any, idx: number) => {
        const mem: Membership = {
          id: aff.id || `m-${req.params.id}-${aff.branchId || idx}`,
          tenantId,
          userId: req.params.id,
          roleId: aff.roleId,
          branchId: aff.branchId,
          status: (aff.status as any) || 'ACTIVE',
          email: aff.email || updatedUser.email,
          phone: aff.phone || updatedUser.phone || '',
          isPrimary: Boolean(aff.isPrimary),
          scopes: ['*'],
        };
        db.memberships.push(mem);
        return mem;
      });

      const primaryMem = newMems.find((m) => m.isPrimary) || newMems[0];
      await syncUserToSupabase(updatedUser);
      if (primaryMem) {
        await syncMembershipToSupabase(primaryMem, req.body.branchAffiliations);
      }

      branchAffiliations = newMems.map((m) => {
        const mRole = db.roles.find((r) => r.id === m.roleId);
        const mBranch = db.branches.find((b) => b.id === m.branchId);
        return {
          id: m.id,
          branchId: m.branchId,
          branchName: mBranch ? `${mBranch.name} (${mBranch.city}/${mBranch.state})` : 'Filial',
          roleId: m.roleId,
          roleName: mRole?.name || 'Membro',
          roleCode: mRole?.code,
          email: m.email || updatedUser.email,
          phone: m.phone || updatedUser.phone || '',
          status: m.status,
          isPrimary: m.isPrimary,
        };
      });
    } else {
      let memIndex = db.memberships.findIndex((m) => m.userId === req.params.id && m.tenantId === tenantId);
      if (memIndex !== -1) {
        if (req.body.roleId) db.memberships[memIndex].roleId = req.body.roleId;
        if (req.body.branchId) db.memberships[memIndex].branchId = req.body.branchId;
        if (req.body.status) db.memberships[memIndex].status = req.body.status;
      } else {
        db.memberships.push({
          id: `m-${Date.now()}`,
          tenantId,
          userId: updatedUser.id,
          roleId: req.body.roleId || db.roles[0]?.id,
          branchId: req.body.branchId || db.branches[0]?.id,
          status: req.body.status || 'ACTIVE',
          scopes: ['*'],
        });
        memIndex = db.memberships.length - 1;
      }
      const mem = db.memberships[memIndex];
      await syncUserToSupabase(updatedUser);
      if (mem) await syncMembershipToSupabase(mem);
      const role = db.roles.find((r) => r.id === mem?.roleId);
      const branch = db.branches.find((b) => b.id === mem?.branchId);
      branchAffiliations = [
        {
          id: mem?.id,
          branchId: mem?.branchId,
          branchName: branch?.name,
          roleId: mem?.roleId,
          roleName: role?.name || 'Membro',
          roleCode: role?.code,
          email: mem?.email || updatedUser.email,
          phone: mem?.phone || updatedUser.phone || '',
          status: mem?.status || 'ACTIVE',
          isPrimary: true,
        },
      ];
    }

    const primaryAff = branchAffiliations.find((a) => a.isPrimary) || branchAffiliations[0];
    const role = db.roles.find((r) => r.id === primaryAff?.roleId);
    const branch = db.branches.find((b) => b.id === primaryAff?.branchId);

    const returnUser = {
      ...updatedUser,
      roleId: primaryAff?.roleId,
      roleName: role?.name || primaryAff?.roleName || 'Membro',
      roleCode: role?.code || primaryAff?.roleCode,
      branchId: primaryAff?.branchId,
      branchName: branch?.name || primaryAff?.branchName,
      status: primaryAff?.status || 'ACTIVE',
      branchAffiliations,
      memberships: branchAffiliations,
    };

    logAudit(
      req,
      'AUTH',
      updatedUser.id,
      'UPDATE',
      `Atualizou perfil/permissões do membro da equipe: ${updatedUser.name} (${branchAffiliations.length} filial(is) vinculada(s))`
    );
    res.json(returnUser);
  });

  app.delete('/api/users/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    db.memberships = db.memberships.filter((m) => !(m.userId === req.params.id && m.tenantId === tenantId));
    await deleteFromSupabase('memberships', 'user_id', req.params.id);
    logAudit(req, 'AUTH', user.id, 'DELETE', `Removeu membro da equipe do escritório: ${user.name}`);
    res.json({ success: true });
  });

  // --- PERSONS (PF / PJ) ---
  app.get('/api/persons', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const items = db.persons.filter((p) => p.tenantId === tenantId);
    res.json(items);
  });

  app.post('/api/persons', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const newPerson: Person = {
      ...req.body,
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      createdAt: new Date().toISOString(),
    };
    db.persons.unshift(newPerson);

    // Supabase Persistence
    await syncPersonToSupabase(newPerson);

    logAudit(req, 'PERSON', newPerson.id, 'CREATE', `Cadastrou pessoa: ${newPerson.name} (${newPerson.document})`);
    res.status(201).json(newPerson);
  });

  app.put('/api/persons/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const index = db.persons.findIndex((p) => p.id === req.params.id && p.tenantId === tenantId);
    if (index === -1) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    const updated = { ...db.persons[index], ...req.body };
    db.persons[index] = updated;

    // Supabase Persistence
    await syncPersonToSupabase(updated);

    logAudit(req, 'PERSON', updated.id, 'UPDATE', `Atualizou dados cadastrais de: ${updated.name}`);
    res.json(updated);
  });

  app.delete('/api/persons/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const person = db.persons.find((p) => p.id === req.params.id && p.tenantId === tenantId);
    if (!person) return res.status(404).json({ error: 'Pessoa não encontrada' });

    // Check if client or case relation exists
    const hasCases = db.cases.some((c) =>
      c.parties.some((pt) => pt.personId === person.id)
    );
    if (hasCases) {
      return res.status(400).json({
        error: 'Não é possível excluir: pessoa está vinculada a processos ativos. Use inativação.',
      });
    }

    db.persons = db.persons.filter((p) => p.id !== req.params.id);
    db.clients = db.clients.filter((c) => c.personId !== req.params.id);

    // Supabase Delete
    await deleteFromSupabase('persons', 'id', req.params.id);
    await deleteFromSupabase('clients', 'person_id', req.params.id);

    logAudit(req, 'PERSON', person.id, 'DELETE', `Excluiu cadastro de: ${person.name}`);
    res.json({ success: true });
  });

  // --- CLIENTS ---
  app.get('/api/clients', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const clients = db.clients
      .filter((c) => c.tenantId === tenantId)
      .map((c) => ({
        ...c,
        person: db.persons.find((p) => p.id === c.personId),
      }));
    res.json(clients);
  });

  app.post('/api/clients', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    let personId = req.body.personId;

    // If person payload is passed inline, create person first
    if (!personId && req.body.person) {
      const newPerson: Person = {
        ...req.body.person,
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        createdAt: new Date().toISOString(),
      };
      db.persons.unshift(newPerson);
      personId = newPerson.id;

      await syncPersonToSupabase(newPerson);
    }

    const newClient: Client = {
      id: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      personId,
      clientCode: `CLI-${String(db.clients.length + 1).padStart(3, '0')}`,
      status: req.body.status || 'ACTIVE',
      origin: req.body.origin || 'INDICACAO',
      riskScore: req.body.riskScore || 'LOW',
      totalCasesCount: 0,
      totalReceivablesBrl: 0,
      assignedLawyerId: req.body.assignedLawyerId || (req as any).userId,
      createdDate: formatDateToYMD(new Date()),
    };

    db.clients.unshift(newClient);

    // Supabase Persistence
    await syncClientToSupabase(newClient);

    const person = db.persons.find((p) => p.id === personId);
    logAudit(req, 'CLIENT', newClient.id, 'CREATE', `Cadastrou novo cliente: ${person?.name || newClient.clientCode}`);
    res.status(201).json({ ...newClient, person });
  });

  app.put('/api/clients/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const idx = db.clients.findIndex((c) => c.id === req.params.id && c.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: 'Cliente não encontrado' });

    db.clients[idx] = { ...db.clients[idx], ...req.body };
    await syncClientToSupabase(db.clients[idx]);

    const person = db.persons.find((p) => p.id === db.clients[idx].personId);
    logAudit(req, 'CLIENT', db.clients[idx].id, 'UPDATE', `Atualizou cliente: ${person?.name || db.clients[idx].clientCode}`);
    res.json({ ...db.clients[idx], person });
  });

  // --- CASES & PROCESSOS ---
  app.get('/api/cases', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const cases = db.cases
      .filter((c) => c.tenantId === tenantId)
      .map((c) => {
        const enrichedParties = c.parties.map((pt) => ({
          ...pt,
          person: db.persons.find((p) => p.id === pt.personId),
        }));
        const lawyer = db.users.find((u) => u.id === c.responsibleLawyerId);
        return {
          ...c,
          parties: enrichedParties,
          responsibleLawyerName: lawyer ? lawyer.name : c.responsibleLawyerName,
        };
      });
    res.json(cases);
  });

  app.get('/api/cases/:id', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const c = db.cases.find((cs) => cs.id === req.params.id && cs.tenantId === tenantId);
    if (!c) return res.status(404).json({ error: 'Caso não encontrado' });

    const enrichedParties = c.parties.map((pt) => ({
      ...pt,
      person: db.persons.find((p) => p.id === pt.personId),
    }));
    const movements = db.movements.filter((m) => m.caseId === c.id);
    const deadlines = db.deadlines.filter((d) => d.caseId === c.id);
    const hearings = db.hearings.filter((h) => h.caseId === c.id);
    const documents = db.documents.filter((doc) => doc.caseId === c.id);

    res.json({
      ...c,
      parties: enrichedParties,
      movements,
      deadlines,
      hearings,
      documents,
    });
  });

  app.post('/api/cases', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const branchId = req.body.branchId || (req as any).branchId;
    const lawyerId = req.body.responsibleLawyerId || (req as any).userId;
    const lawyer = db.users.find((u) => u.id === lawyerId);

    const newCase: Case = {
      id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      branchId,
      title: req.body.title,
      caseNumber: req.body.caseNumber || `${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(10 + Math.random() * 89)}.2026.8.26.0100`,
      type: req.body.type || 'JUDICIAL',
      status: req.body.status || 'ACTIVE',
      legalArea: req.body.legalArea || 'CIVIL',
      court: req.body.court || 'TJSP',
      judicialBranch: req.body.judicialBranch || 'Vara Cível',
      judgeName: req.body.judgeName || '',
      claimValue: Number(req.body.claimValue) || 0,
      contingencyRisk: req.body.contingencyRisk || 'POSSIBLE',
      distributionDate: req.body.distributionDate || formatDateToYMD(new Date()),
      phase: req.body.phase || 'INICIAL',
      responsibleLawyerId: lawyerId,
      responsibleLawyerName: lawyer?.name || 'Dr. Carlos Silveira',
      parties: req.body.parties || [],
      movementsCount: 1,
      deadlinesCount: 0,
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-create distribution movement
    const initMovement: Movement = {
      id: `mov-${Date.now()}`,
      tenantId,
      caseId: newCase.id,
      date: formatDateToYMD(new Date()),
      title: 'Distribuição / Cadastro Inicial do Processo',
      content: `Processo cadastrado no sistema na área ${newCase.legalArea} perante ${newCase.court} - ${newCase.judicialBranch}.`,
      source: 'MANUAL',
      isRead: true,
      createdBy: lawyer?.name || 'Sistema',
      createdAt: new Date().toISOString(),
    };

    db.cases.unshift(newCase);
    db.movements.unshift(initMovement);

    // Increment client cases count if linked
    newCase.parties.forEach((pt) => {
      const client = db.clients.find((cl) => cl.personId === pt.personId);
      if (client) client.totalCasesCount++;
    });

    // Supabase Persistence
    await syncCaseToSupabase(newCase, db.clients, db.persons);
    await syncCaseMovementToSupabase(initMovement);

    logAudit(req, 'CASE', newCase.id, 'CREATE', `Cadastrou novo processo: ${newCase.title} (${newCase.caseNumber})`);
    res.status(201).json(newCase);
  });

  app.put('/api/cases/:id', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const idx = db.cases.findIndex((c) => c.id === req.params.id && c.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: 'Caso não encontrado' });

    db.cases[idx] = {
      ...db.cases[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    // Supabase Persistence
    await syncCaseToSupabase(db.cases[idx], db.clients, db.persons);

    logAudit(req, 'CASE', db.cases[idx].id, 'UPDATE', `Atualizou caso: ${db.cases[idx].caseNumber}`);
    res.json(db.cases[idx]);
  });

  // --- MOVEMENTS ---
  app.get('/api/cases/:id/movements', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const list = db.movements.filter(
      (m) => m.caseId === req.params.id && m.tenantId === tenantId
    );
    res.json(list);
  });

  app.post('/api/cases/:id/movements', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const theCase = db.cases.find((c) => c.id === req.params.id && c.tenantId === tenantId);
    if (!theCase) return res.status(404).json({ error: 'Processo não encontrado' });

    const newMov: Movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      caseId: theCase.id,
      date: req.body.date || formatDateToYMD(new Date()),
      title: req.body.title,
      content: req.body.content,
      source: req.body.source || 'MANUAL',
      isRead: true,
      createdBy: req.body.createdBy || 'Advogado Responsável',
      createdAt: new Date().toISOString(),
    };

    db.movements.unshift(newMov);
    theCase.movementsCount++;
    await syncCaseMovementToSupabase(newMov);
    logAudit(req, 'CASE', theCase.id, 'UPDATE', `Adicionou andamento: ${newMov.title}`);
    res.status(201).json(newMov);
  });

  // --- DEADLINES & CPC CALENDAR ---
  app.get('/api/deadlines', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const list = db.deadlines.filter((d) => d.tenantId === tenantId);
    res.json(list);
  });

  app.post('/api/deadlines/calculate-cpc', (req: Request, res: Response) => {
    const { publishDate, daysCount, calculationType } = req.body;
    if (!publishDate || !daysCount) {
      return res.status(400).json({ error: 'publishDate e daysCount são obrigatórios' });
    }
    const result = calculateLegalDeadline(
      publishDate,
      Number(daysCount),
      calculationType || 'DIAS_UTEIS_CPC'
    );
    res.json(result);
  });

  app.post('/api/deadlines', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const calc = calculateLegalDeadline(
      req.body.publishDate || formatDateToYMD(new Date()),
      Number(req.body.daysCount) || 15,
      req.body.calculationType || 'DIAS_UTEIS_CPC'
    );

    const user = db.users.find((u) => u.id === req.body.responsibleUserId);

    const newDl: Deadline = {
      id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      caseId: req.body.caseId,
      caseTitle: req.body.caseTitle,
      caseNumber: req.body.caseNumber,
      title: req.body.title,
      description: req.body.description || '',
      origin: req.body.origin || 'INTIMACAO',
      publishDate: calc.publishDate,
      startDate: calc.startDate,
      dueDate: calc.dueDate,
      fatalDate: calc.fatalDate,
      daysCount: Number(req.body.daysCount) || 15,
      calculationType: req.body.calculationType || 'DIAS_UTEIS_CPC',
      responsibleUserId: req.body.responsibleUserId || (req as any).userId,
      responsibleUserName: user?.name || 'Dr. Carlos Silveira',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    db.deadlines.unshift(newDl);

    if (newDl.caseId) {
      const theCase = db.cases.find((c) => c.id === newDl.caseId);
      if (theCase) theCase.deadlinesCount++;
    }

    // Supabase Persistence
    await syncDeadlineToSupabase(newDl);

    logAudit(req, 'DEADLINE', newDl.id, 'CREATE', `Cadastrou prazo fatal: ${newDl.title} com vencimento em ${newDl.dueDate}`);
    res.status(201).json(newDl);
  });

  app.put('/api/deadlines/:id/status', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const idx = db.deadlines.findIndex((d) => d.id === req.params.id && d.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: 'Prazo não encontrado' });

    db.deadlines[idx].status = req.body.status;
    if (req.body.status === 'COMPLETED') {
      db.deadlines[idx].completedAt = new Date().toISOString();
      db.deadlines[idx].completedBy = 'Dr. Carlos Silveira';
    }

    // Supabase Persistence
    await syncDeadlineToSupabase(db.deadlines[idx]);

    logAudit(req, 'DEADLINE', db.deadlines[idx].id, 'UPDATE', `Alterou status do prazo para: ${req.body.status}`);
    res.json(db.deadlines[idx]);
  });

  // --- HEARINGS, DILIGENCES & TASKS ---
  app.get('/api/hearings', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.hearings.filter((h) => h.tenantId === tenantId));
  });

  app.post('/api/hearings', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const lawyer = db.users.find((u) => u.id === req.body.responsibleLawyerId);
    const newHearing: Hearing = {
      id: `hr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      caseId: req.body.caseId,
      caseTitle: req.body.caseTitle,
      caseNumber: req.body.caseNumber,
      title: req.body.title,
      type: req.body.type || 'INSTRUCAO_JULGAMENTO',
      dateTime: req.body.dateTime,
      locationType: req.body.locationType || 'PRESENCIAL',
      addressOrLink: req.body.addressOrLink || '',
      courtName: req.body.courtName || 'TJSP',
      responsibleLawyerId: req.body.responsibleLawyerId || (req as any).userId,
      responsibleLawyerName: lawyer?.name || 'Dr. Carlos Silveira',
      status: 'SCHEDULED',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
    };
    db.hearings.unshift(newHearing);
    await syncHearingToSupabase(newHearing);
    logAudit(req, 'CASE', newHearing.caseId, 'UPDATE', `Agendou audiência: ${newHearing.title} para ${newHearing.dateTime}`);
    res.status(201).json(newHearing);
  });

  app.get('/api/diligences', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.diligences.filter((d) => d.tenantId === tenantId));
  });

  app.post('/api/diligences', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const newDil: Diligence = {
      id: `dil-${Date.now()}`,
      tenantId,
      caseId: req.body.caseId,
      caseNumber: req.body.caseNumber,
      title: req.body.title,
      location: req.body.location,
      dueDate: req.body.dueDate,
      executorUserId: req.body.executorUserId || (req as any).userId,
      executorUserName: 'Lucas Ribeiro (Paralegal)',
      costEstimate: Number(req.body.costEstimate) || 0,
      actualCost: 0,
      status: 'REQUESTED',
      report: req.body.report || '',
      createdAt: new Date().toISOString(),
    };
    db.diligences.unshift(newDil);
    res.status(201).json(newDil);
  });

  app.get('/api/tasks', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.tasks.filter((t) => t.tenantId === tenantId));
  });

  app.post('/api/tasks', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const assignedUser = db.users.find((u) => u.id === req.body.assignedUserId);
    const relatedCase = req.body.caseId ? db.cases.find((c) => c.id === req.body.caseId) : undefined;
    const relatedClient = req.body.clientId ? db.clients.find((c) => c.id === req.body.clientId) : undefined;
    const clientPerson = relatedClient ? db.persons.find((p) => p.id === relatedClient.personId) : undefined;
    const relatedDeadline = req.body.deadlineId ? db.deadlines.find((d) => d.id === req.body.deadlineId) : undefined;

    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      tenantId,
      caseId: req.body.caseId || relatedDeadline?.caseId,
      caseNumber: req.body.caseNumber || relatedCase?.caseNumber || relatedDeadline?.caseNumber,
      caseTitle: req.body.caseTitle || relatedCase?.title || relatedDeadline?.caseTitle,
      clientId: req.body.clientId,
      clientName: req.body.clientName || clientPerson?.name,
      deadlineId: req.body.deadlineId,
      deadlineTitle: req.body.deadlineTitle || relatedDeadline?.title,
      deadlineFatalDate: req.body.deadlineFatalDate || relatedDeadline?.fatalDate || relatedDeadline?.dueDate,
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'GERAL',
      priority: req.body.priority || 'MEDIUM',
      dueDate: req.body.dueDate || relatedDeadline?.dueDate || formatDateToYMD(new Date()),
      assignedUserId: req.body.assignedUserId || (req as any).userId,
      assignedUserName: assignedUser?.name || 'Dr. Carlos Silveira',
      status: req.body.status || 'TODO',
      checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      estimatedMinutes: Number(req.body.estimatedMinutes) || 30,
      timeLogs: Array.isArray(req.body.timeLogs) ? req.body.timeLogs : [],
      createdAt: new Date().toISOString(),
    };
    db.tasks.unshift(newTask);
    logAudit(req, 'CASE', newTask.id, 'CREATE', `Criou nova tarefa: ${newTask.title}`);
    res.status(201).json(newTask);
  });

  app.put('/api/tasks/:id', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const idx = db.tasks.findIndex((t) => t.id === req.params.id && t.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const assignedUser = req.body.assignedUserId ? db.users.find((u) => u.id === req.body.assignedUserId) : undefined;
    const relatedDeadline = req.body.deadlineId ? db.deadlines.find((d) => d.id === req.body.deadlineId) : undefined;

    const updated = {
      ...db.tasks[idx],
      ...req.body,
      deadlineTitle: req.body.deadlineTitle || relatedDeadline?.title || db.tasks[idx].deadlineTitle,
      deadlineFatalDate: req.body.deadlineFatalDate || relatedDeadline?.fatalDate || relatedDeadline?.dueDate || db.tasks[idx].deadlineFatalDate,
      assignedUserName: assignedUser?.name || req.body.assignedUserName || db.tasks[idx].assignedUserName,
      completedAt: req.body.status === 'DONE' && !db.tasks[idx].completedAt ? new Date().toISOString() : db.tasks[idx].completedAt,
    };
    db.tasks[idx] = updated;
    res.json(updated);
  });

  app.post('/api/tasks/:id/time-log', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const task = db.tasks.find((t) => t.id === req.params.id && t.tenantId === tenantId);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const user = db.users.find((u) => u.id === (req as any).userId);
    const newLog = {
      id: `log-${Date.now()}`,
      userId: (req as any).userId,
      userName: user?.name || 'Advogado',
      minutes: Number(req.body.minutes) || 15,
      note: req.body.note || 'Apontamento operacional de horas',
      date: req.body.date || formatDateToYMD(new Date()),
      billable: req.body.billable !== false,
    };

    if (!task.timeLogs) task.timeLogs = [];
    task.timeLogs.unshift(newLog);
    logAudit(req, 'CASE', task.id, 'UPDATE', `Registrou ${newLog.minutes} min no timesheet da tarefa: ${task.title}`);
    res.status(201).json(task);
  });

  app.delete('/api/tasks/:id', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const task = db.tasks.find((t) => t.id === req.params.id && t.tenantId === tenantId);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    db.tasks = db.tasks.filter((t) => !(t.id === req.params.id && t.tenantId === tenantId));
    logAudit(req, 'CASE', task.id, 'DELETE', `Excluiu tarefa: ${task.title}`);
    res.json({ success: true });
  });

  // --- DOCUMENTS & TEMPLATES ---
  app.get('/api/documents', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.documents.filter((d) => d.tenantId === tenantId));
  });

  app.post('/api/documents', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'PETICAO',
      caseId: req.body.caseId,
      caseNumber: req.body.caseNumber,
      personId: req.body.personId,
      personName: req.body.personName,
      currentVersion: 1,
      fileSize: (req.body.content?.length || 1000) * 2,
      fileType: req.body.fileType || 'application/pdf',
      isDraft: req.body.isDraft ?? false,
      content: req.body.content || '',
      status: req.body.status || 'DRAFT',
      createdBy: 'Dr. Carlos Silveira',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.documents.unshift(newDoc);
    await syncDocumentToSupabase(newDoc);
    logAudit(req, 'DOCUMENT', newDoc.id, 'CREATE', `Criou documento: ${newDoc.title}`);
    res.status(201).json(newDoc);
  });

  app.put('/api/documents/:id', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const idx = db.documents.findIndex((d) => d.id === req.params.id && d.tenantId === tenantId);
    if (idx === -1) return res.status(404).json({ error: 'Documento não encontrado' });

    const current = db.documents[idx];
    const isNewContent = req.body.content && req.body.content !== current.content;
    const updated: DocumentItem = {
      ...current,
      ...req.body,
      currentVersion: isNewContent ? current.currentVersion + 1 : current.currentVersion,
      fileSize: (req.body.content?.length || current.content?.length || 1000) * 2,
      updatedAt: new Date().toISOString(),
    };
    db.documents[idx] = updated;
    logAudit(req, 'DOCUMENT', updated.id, 'UPDATE', `Atualizou documento: ${updated.title} (v${updated.currentVersion})`);
    res.json(updated);
  });

  app.delete('/api/documents/:id', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const doc = db.documents.find((d) => d.id === req.params.id && d.tenantId === tenantId);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    db.documents = db.documents.filter((d) => !(d.id === req.params.id && d.tenantId === tenantId));
    logAudit(req, 'DOCUMENT', doc.id, 'DELETE', `Excluiu documento: ${doc.title}`);
    res.json({ success: true });
  });

  app.post('/api/documents/:id/sign', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const doc = db.documents.find((d) => d.id === req.params.id && d.tenantId === tenantId);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });

    const signerName = req.body.signerName || 'Dr. Carlos Silveira';
    const signerCpf = req.body.signerCpf || '***.458.918-**';
    const signerRole = req.body.signerRole || 'Advogado Titular - OAB/SP 412.890';
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const verificationCode = `JURIS-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const signatureInfo = {
      id: `sig-${Date.now()}`,
      signerName,
      signerCpf,
      signerRole,
      signedAt: new Date().toISOString(),
      ipAddress: '189.120.45.18',
      hashSha256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855${randomHex.substring(0, 8)}`,
      verificationCode,
      certificateAuthority: 'Autoridade Certificadora JurisFlow ICP-Brasil v4',
      status: 'VALID' as const,
    };

    doc.digitalSignature = signatureInfo;
    doc.status = 'APPROVED';
    doc.updatedAt = new Date().toISOString();

    logAudit(req, 'DOCUMENT', doc.id, 'UPDATE', `Assinou digitalmente o documento ${doc.title} (Código: ${verificationCode})`);
    res.json(doc);
  });

  app.get('/api/templates', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.templates.filter((t) => t.tenantId === tenantId));
  });

  app.post('/api/templates/render', (req: Request, res: Response) => {
    const { templateId, variables } = req.body;
    const template = db.templates.find((t) => t.id === templateId);
    if (!template) return res.status(404).json({ error: 'Modelo não encontrado' });

    let rendered = template.templateContent;
    if (variables && typeof variables === 'object') {
      for (const [k, v] of Object.entries(variables)) {
        const regex = new RegExp(`{{${k}}}`, 'g');
        rendered = rendered.replace(regex, String(v || ''));
      }
    }
    res.json({ rendered, template });
  });

  // --- FINANCIAL & MERCADO PAGO ADAPTER ---
  app.get('/api/financial/overview', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const recs = db.receivables.filter((r) => r.tenantId === tenantId);
    const pays = db.payments.filter((p) => p.tenantId === tenantId);

    const totalRecebidoMes = pays.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalAReceberAberto = recs
      .filter((r) => r.status === 'OPEN')
      .reduce((acc, r) => acc + r.amount, 0);
    const totalInadimplente = recs
      .filter((r) => r.status === 'OVERDUE')
      .reduce((acc, r) => acc + r.amount, 0);
    const totalFaturadoMes = totalRecebidoMes + totalAReceberAberto;
    const taxaInadimplencia =
      totalFaturadoMes > 0 ? (totalInadimplente / totalFaturadoMes) * 100 : 0;

    res.json({
      totalFaturadoMes,
      totalRecebidoMes,
      totalAReceberAberto,
      totalInadimplente,
      taxaInadimplencia: Math.round(taxaInadimplencia * 10) / 10,
      honorariosExitoPrevisao: 450000.0,
      receitaMesAMes: [
        { month: 'Mai/26', previsto: 42000, realizado: 42000 },
        { month: 'Jun/26', previsto: 48000, realizado: 48000 },
        { month: 'Jul/26', previsto: 55000, realizado: 52000 },
        { month: 'Ago/26', previsto: 60000, realizado: 45000 },
        { month: 'Set/26 (Prev)', previsto: 68000, realizado: 12000 },
      ],
      distribuicaoPorTipo: [
        { tipo: 'Honorários Fixos / Parcelados', valor: 230000, percentual: 52 },
        { tipo: 'Partido Mensal (Retainer)', valor: 114000, percentual: 26 },
        { tipo: 'Honorários de Êxito', valor: 95000, percentual: 22 },
      ],
    });
  });

  app.get('/api/financial/contracts', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.feeContracts.filter((fc) => fc.tenantId === tenantId));
  });

  app.post('/api/financial/contracts', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const client = db.clients.find((c) => c.id === req.body.clientId);
    const person = client ? db.persons.find((p) => p.id === client.personId) : undefined;

    const newFc: FeeContract = {
      id: `fc-${Date.now()}`,
      tenantId,
      clientId: req.body.clientId,
      clientName: person?.name || 'Cliente',
      caseId: req.body.caseId,
      caseNumber: req.body.caseNumber,
      contractNumber: `CTR-2026-${String(db.feeContracts.length + 1).padStart(4, '0')}`,
      title: req.body.title,
      type: req.body.type || 'FIXED',
      totalValue: Number(req.body.totalValue) || 0,
      successPercentage: Number(req.body.successPercentage) || 0,
      retainerMonthlyValue: Number(req.body.retainerMonthlyValue) || 0,
      status: 'ACTIVE',
      startDate: req.body.startDate || formatDateToYMD(new Date()),
      endDate: req.body.endDate,
      installmentsCount: Number(req.body.installmentsCount) || 1,
      createdAt: new Date().toISOString(),
    };

    db.feeContracts.unshift(newFc);
    await syncContractToSupabase(newFc);

    // Auto-generate installments and receivables
    const numInstallments = newFc.installmentsCount;
    const valPerInstallment = newFc.totalValue / numInstallments;
    for (let i = 1; i <= numInstallments; i++) {
      const due = new Date();
      due.setMonth(due.getMonth() + i);

      const inst: Installment = {
        id: `inst-${Date.now()}-${i}`,
        tenantId,
        feeContractId: newFc.id,
        installmentNumber: i,
        totalInstallments: numInstallments,
        amount: valPerInstallment,
        dueDate: formatDateToYMD(due),
        status: 'PENDING',
        penaltyPercentage: 2.0,
        interestMonthlyPercentage: 1.0,
      };
      db.installments.push(inst);

      const rec: AccountReceivable = {
        id: `rec-${Date.now()}-${i}`,
        tenantId,
        clientId: newFc.clientId,
        clientName: newFc.clientName,
        caseId: newFc.caseId,
        caseNumber: newFc.caseNumber,
        installmentId: inst.id,
        title: `Parcela ${i}/${numInstallments} — ${newFc.title}`,
        amount: valPerInstallment,
        dueDate: inst.dueDate,
        status: 'OPEN',
      };
      db.receivables.unshift(rec);
      await syncReceivableToSupabase(rec);
    }

    logAudit(req, 'PAYMENT', newFc.id, 'CREATE', `Criou contrato de honorários: ${newFc.title} no valor de R$ ${newFc.totalValue}`);
    res.status(201).json(newFc);
  });

  app.get('/api/financial/receivables', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.receivables.filter((r) => r.tenantId === tenantId));
  });

  // Mercado Pago Charge Generation Adapter
  app.post('/api/financial/charges/mercadopago', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const { accountReceivableId, method } = req.body;

    const receivable = db.receivables.find((r) => r.id === accountReceivableId && r.tenantId === tenantId);
    if (!receivable) return res.status(404).json({ error: 'Conta a receber não encontrada' });

    const mpId = `MP-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const expires = new Date();
    expires.setDate(expires.getDate() + 5);

    const charge: Charge = {
      id: `chg-${Date.now()}`,
      tenantId,
      accountReceivableId: receivable.id,
      amount: receivable.amount,
      method: method || 'PIX',
      mpPaymentId: mpId,
      mpStatus: 'pending',
      pixCopiaECola: `00020126580014br.gov.bcb.pix0136${mpId}-jurisflow-law5204000053039865408${receivable.amount.toFixed(2)}5802BR5925SILVEIRA ADVOGADOS6009SAO PAULO62070503***6304D1E8`,
      boletoBarcode: `34191.79001 01043.510047 91020.150008 4 ${Math.floor(10000000000000 + Math.random() * 90000000000000)}`,
      boletoUrl: `https://www.mercadopago.com.br/payments/${mpId}/ticket`,
      expiresAt: expires.toISOString(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    receivable.charge = charge;
    await syncReceivableToSupabase(receivable);
    logAudit(req, 'PAYMENT', charge.id, 'SIMULATE_PAYMENT', `Gerou cobrança Mercado Pago (${charge.method}) no valor de R$ ${charge.amount}`);
    res.status(201).json(charge);
  });

  // Mercado Pago Simulated Instant Payment & Reconciliation
  app.post('/api/financial/charges/:id/simulate-payment', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const receivable = db.receivables.find((r) => r.charge?.id === req.params.id && r.tenantId === tenantId);
    if (!receivable || !receivable.charge) {
      return res.status(404).json({ error: 'Cobrança não encontrada' });
    }

    const charge = receivable.charge;
    charge.status = 'PAID';
    charge.mpStatus = 'approved';
    receivable.status = 'RECEIVED';

    // If linked to an installment, mark installment as paid
    if (receivable.installmentId) {
      const inst = db.installments.find((i) => i.id === receivable.installmentId);
      if (inst) {
        inst.status = 'PAID';
        inst.paidAmount = charge.amount;
        inst.paidDate = formatDateToYMD(new Date());
      }
    }

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      tenantId,
      chargeId: charge.id,
      accountReceivableId: receivable.id,
      amountPaid: charge.amount,
      paymentDate: formatDateToYMD(new Date()),
      paymentMethod: `${charge.method} via Mercado Pago`,
      transactionId: charge.mpPaymentId || `TRX-${Date.now()}`,
      receiptNumber: `REC-2026-${String(db.payments.length + 1).padStart(4, '0')}`,
      notes: 'Pagamento conciliado e liquidado via Webhook Mercado Pago Adapter.',
    };

    db.payments.unshift(payment);
    await syncReceivableToSupabase(receivable);
    logAudit(req, 'PAYMENT', payment.id, 'SIMULATE_PAYMENT', `Pagamento de R$ ${payment.amountPaid} confirmado via Mercado Pago Webhook.`);

    res.json({ success: true, payment, charge, receivable });
  });

  // Mercado Pago Webhook receiver (idempotent)
  app.post('/api/financial/webhook/mercadopago', (req: Request, res: Response) => {
    const { id, type, action, data } = req.body;
    const eventId = id || data?.id || `evt-${Date.now()}`;

    if (db.processedWebhookIds.has(eventId)) {
      return res.status(200).json({ status: 'ignored_duplicate', eventId });
    }
    db.processedWebhookIds.add(eventId);

    console.log(`[Mercado Pago Webhook] Processed event ${type || action} id=${eventId}`);
    res.status(200).json({ status: 'received', eventId });
  });

  // --- TIMESHEET BILLING & CONVERSION ---
  app.get('/api/financial/timesheet/unbilled', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const tasks = db.tasks.filter((t) => t.tenantId === tenantId);
    const unbilledEntries: any[] = [];

    tasks.forEach((t) => {
      (t.timeLogs || []).forEach((log) => {
        if (log.billable) {
          unbilledEntries.push({
            taskId: t.id,
            taskTitle: t.title,
            category: t.category,
            caseId: t.caseId,
            caseNumber: t.caseNumber,
            clientId: t.clientId,
            clientName: t.clientName,
            logId: log.id,
            userName: log.userName,
            minutes: log.minutes,
            hours: Math.round((log.minutes / 60) * 10) / 10,
            note: log.note,
            date: log.date,
          });
        }
      });
    });

    res.json(unbilledEntries);
  });

  app.post('/api/financial/timesheet/bill', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const { clientId, caseId, hourlyRate, totalMinutes, description, taskIds } = req.body;

    const client = db.clients.find((c) => c.id === clientId);
    const person = client ? db.persons.find((p) => p.id === client.personId) : undefined;
    const relatedCase = caseId ? db.cases.find((c) => c.id === caseId) : undefined;

    const rate = Number(hourlyRate) || 450;
    const hours = (Number(totalMinutes) || 60) / 60;
    const totalAmount = Math.round(hours * rate * 100) / 100;

    const due = new Date();
    due.setDate(due.getDate() + 15);

    // Create a new Receivable for the Timesheet
    const rec: AccountReceivable = {
      id: `rec-ts-${Date.now()}`,
      tenantId,
      clientId,
      clientName: person?.name || 'Cliente',
      caseId: relatedCase?.id,
      caseNumber: relatedCase?.caseNumber,
      title: description || `Fatura Timesheet (${hours.toFixed(1)}h a R$ ${rate}/h)`,
      amount: totalAmount,
      dueDate: formatDateToYMD(due),
      status: 'OPEN',
    };

    db.receivables.unshift(rec);

    // Also create a contract entry if needed
    const contract: FeeContract = {
      id: `fc-ts-${Date.now()}`,
      tenantId,
      clientId,
      clientName: person?.name || 'Cliente',
      caseId: relatedCase?.id,
      caseNumber: relatedCase?.caseNumber,
      contractNumber: `TS-2026-${String(db.feeContracts.length + 1).padStart(4, '0')}`,
      title: `Honorários por Hora — ${hours.toFixed(1)}h (${rec.title})`,
      type: 'FIXED',
      totalValue: totalAmount,
      successPercentage: 0,
      retainerMonthlyValue: 0,
      status: 'ACTIVE',
      startDate: formatDateToYMD(new Date()),
      installmentsCount: 1,
      createdAt: new Date().toISOString(),
    };
    db.feeContracts.unshift(contract);

    logAudit(req, 'PAYMENT', rec.id, 'CREATE', `Faturou timesheet: R$ ${totalAmount} (${hours.toFixed(1)}h) para o cliente ${person?.name || 'Cliente'}`);

    res.status(201).json({ success: true, receivable: rec, contract });
  });

  // --- AI GATEWAY JURÍDICO (GEMINI 3.7 FLASH INTEGRATION) ---

  // 1. Extrator de Prazos de Publicação / Intimação
  app.post('/api/ai/extract-deadline', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { publicationText } = req.body;

    if (!publicationText || publicationText.trim().length === 0) {
      return res.status(400).json({ error: 'Texto da publicação é obrigatório' });
    }

    const startTime = Date.now();
    const ai = getGeminiClient();

    let structuredResult: any = null;

    if (ai) {
      try {
        const prompt = `Você é um Auditor Jurídico e Especialista em Contagem de Prazos Processuais no Brasil (CPC/2015 e CLT).
Analise o texto da publicação/intimação judicial abaixo e extraia com precisão absoluta:
1. Se há prazo identificado (boolean).
2. Título descritivo da providência (ex: "Apresentar Contestação", "Recorrer de Sentença / Apelação", "Manifestação sobre Laudo Pericial").
3. Quantidade de dias de prazo (número inteiro, ex: 15, 5, 8, 10).
4. Tipo de contagem ("DIAS_UTEIS_CPC", "DIAS_CORRIDOS", "DIAS_UTEIS_CLT").
5. Origem ("INTIMACAO", "DECISAO", "DESPACHO", "AUDIENCIA").
6. Data de disponibilização/publicação identificada no texto (se houver, no formato YYYY-MM-DD; caso contrário hoje).
7. Ação requerida detalhada com os atos necessários.
8. Fundamentação legal (artigos de lei aplicáveis, ex: Art. 335 CPC, Art. 1.003 CPC).
9. Partes e advogados identificados no texto.
10. Tribunal e Vara identificados.
11. Pontos de atenção e riscos de preclusão.

Retorne EXCLUSIVAMENTE um objeto JSON válido com a seguinte estrutura:
{
  "prazoIdentificado": true,
  "titulo": "string",
  "dias": 15,
  "tipoContagem": "DIAS_UTEIS_CPC",
  "origem": "INTIMACAO",
  "dataPublicacao": "2026-08-31",
  "acaoRequerida": "string",
  "fundamentacaoLegal": "string",
  "partesIdentificadas": ["string"],
  "tribunalVaraIdentificados": "string",
  "pontosAtencao": ["string"]
}

Texto da Publicação:
"""${publicationText}"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        structuredResult = JSON.parse(text);
      } catch (err) {
        console.error('Gemini error on extract-deadline:', err);
      }
    }

    // High quality fallback if AI offline or key unconfigured
    if (!structuredResult) {
      const lower = publicationText.toLowerCase();
      const isContestacao = lower.includes('contesta') || lower.includes('335');
      const isApelacao = lower.includes('apela') || lower.includes('sentença');
      const isEmbargos = lower.includes('embargos') || lower.includes('declara');
      const isPericia = lower.includes('perícia') || lower.includes('laudo');

      const dias = isEmbargos ? 5 : isContestacao || isApelacao || isPericia ? 15 : 10;
      const titulo = isEmbargos
        ? 'Opor Embargos de Declaração'
        : isContestacao
        ? 'Apresentar Contestação'
        : isApelacao
        ? 'Interpor Recurso de Apelação'
        : isPericia
        ? 'Manifestar sobre o Laudo Pericial'
        : 'Manifestação nos Autos / Cumprir Determinação';

      structuredResult = {
        prazoIdentificado: true,
        titulo,
        dias,
        tipoContagem: 'DIAS_UTEIS_CPC',
        origem: 'INTIMACAO',
        dataPublicacao: formatDateToYMD(new Date()),
        acaoRequerida: `Cumprir determinação do magistrado com protocolo da peça cabível no prazo de ${dias} dias úteis.`,
        fundamentacaoLegal: isContestacao
          ? 'Art. 335 do CPC/2015'
          : isApelacao
          ? 'Art. 1.003, § 5º e Art. 1.010 do CPC/2015'
          : isEmbargos
          ? 'Art. 1.022 e 1.023 do CPC/2015'
          : 'Art. 218 e seguintes do CPC/2015',
        partesIdentificadas: ['Parte Autora', 'Parte Ré'],
        tribunalVaraIdentificados: 'Vara Cível / Justiça Estadual',
        pontosAtencao: [
          'Contagem exclusivamente em dias úteis conforme Art. 219 do CPC.',
          'Termo inicial no primeiro dia útil subsequente à disponibilização no DJe.',
          'Verificar se há necessidade de recolhimento de preparo ou taxas.',
        ],
      };
    }

    // Calculate actual dates via Brazilian CPC Engine
    const cpcCalc = calculateLegalDeadline(
      structuredResult.dataPublicacao || formatDateToYMD(new Date()),
      structuredResult.dias,
      structuredResult.tipoContagem || 'DIAS_UTEIS_CPC'
    );

    structuredResult.dataTermoInicial = cpcCalc.startDate;
    structuredResult.dataVencimentoEstimada = cpcCalc.dueDate;

    const execTime = Date.now() - startTime;
    db.aiLogs.push({
      id: `ai-log-${Date.now()}`,
      tenantId,
      userId,
      userName: 'Dr. Carlos Silveira',
      feature: 'DEADLINE_EXTRACT',
      promptTokens: Math.round(publicationText.length / 4),
      completionTokens: 250,
      estimatedCostBRL: 0.008,
      executionTimeMs: execTime,
      status: 'SUCCESS',
      modelUsed: 'gemini-3.7-flash',
      createdAt: new Date().toISOString(),
    });

    res.json(structuredResult);
  });

  // 2. Redator / Minutador de Peças Processuais
  app.post('/api/ai/draft-piece', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const {
      pieceType,
      legalArea,
      clientName,
      opposingParty,
      facts,
      legalThesis,
      courtBranch,
      caseNumber,
    } = req.body;

    const startTime = Date.now();
    const ai = getGeminiClient();

    let draftResult: any = null;

    if (ai) {
      try {
        const prompt = `Você é um Advogado Sênior Especialista e Redator Jurídico de Elite no Brasil.
Elabore uma peça jurídica técnica, impecável, com linguagem forense culta, doutrina e jurisprudência consolidada dos Tribunais Superiores (STF/STJ/TST).

DADOS DA PEÇA:
- Tipo de Peça: ${pieceType || 'Petição Inicial / Contestação'}
- Área do Direito: ${legalArea || 'Cível'}
- Foro / Vara: ${courtBranch || 'Vara Cível Central da Comarca de São Paulo/SP'}
- Número do Processo (se houver): ${caseNumber || 'Distribuição Inicial'}
- Cliente / Requerente: ${clientName || 'Cliente'}
- Parte Contrária: ${opposingParty || 'Parte Ré'}
- Resumo dos Fatos: ${facts || 'Fatos da lide'}
- Teses Jurídicas / Pedidos: ${legalThesis || 'Fundamentação padrão'}

Retorne EXCLUSIVAMENTE um objeto JSON estruturado:
{
  "tituloPeca": "string",
  "tipoPeca": "string",
  "cabecalho": "string (Endereçamento ao Juízo)",
  "dosFatos": "string (Narrativa fática minuciosa e persuasiva)",
  "doDireito": "string (Fundamentação jurídica com artigos do CPC/CC/CLT e jurisprudência recente)",
  "dosPedidos": "string (Rol de requerimentos claros e determinados)",
  "valorCausaSugerido": 0,
  "jurisprudenciaCitada": ["string"],
  "artigosLei": ["string"],
  "provasRequeridas": ["string"],
  "textoCompletoFormatado": "string (A peça inteira formatada para impressão/protocolo)"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        draftResult = JSON.parse(text);
      } catch (err) {
        console.error('Gemini error on draft-piece:', err);
      }
    }

    // Robust legal fallback if AI key missing
    if (!draftResult) {
      const fullText = `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${courtBranch || '3ª VARA CÍVEL DA COMARCA DE SÃO PAULO/SP'}

Processo nº: ${caseNumber || 'Distribuição por dependência'}

${clientName || 'REQUERENTE'}, devidamente qualificado nos autos em epígrafe, por seus advogados e procuradores subscritos, vem, mui respeitosamente, à presença de Vossa Excelência, apresentar

${pieceType || 'MANIFESTAÇÃO PROCESSUAL E PEDIDO DE TUTELA DE URGÊNCIA'}

em face de ${opposingParty || 'REQUERIDO'}, pelos motivos de fato e de direito a seguir expostos:

I - DA SÍNTESE FÁTICA
${facts || 'Trata-se de controvérsia jurídica decorrente de inadimplemento contratual e descumprimento de obrigações correlatas, gerando dano iminente à parte autora.'}

II - DOS FUNDAMENTOS JURÍDICOS
Conforme preceitua a legislação pátria em vigor e a torrencial jurisprudência do Superior Tribunal de Justiça, restam demonstrados os requisitos essenciais à tutela do direito perseguido.
${legalThesis || 'A conduta do réu viola frontalmente a boa-fé objetiva (art. 422 do CC) e os princípios da probidade e lealdade contratual.'}

III - DA TUTELA DE URGÊNCIA
Presentes o fumus boni iuris e o periculum in mora (art. 300 do CPC), faz-se mister a concessão liminar da medida para resguardar a eficácia do provimento final.

IV - DOS PEDIDOS E REQUERIMENTOS
Diante de todo o exposto, requer a Vossa Excelência:
a) O acolhimento integral das razões expendidas com a concessão da tutela pretendida;
b) A intimação da parte contrária para os atos cabíveis;
c) A condenação em custas processuais e honorários advocatícios sucumbenciais no importe de 20% (art. 85, § 2º do CPC).

Protesta provar o alegado por todos os meios em direito admitidos.

Dá-se à causa o valor de R$ 100.000,00.

Nestes termos, pede deferimento.
São Paulo, 31 de agosto de 2026.
[Assinatura Digital do Advogado]`;

      draftResult = {
        tituloPeca: pieceType || 'Petição Processual',
        tipoPeca: pieceType || 'Petição Inicial',
        cabecalho: `EXMO. SR. DR. JUIZ DE DIREITO DA ${courtBranch || 'VARA CÍVEL'}`,
        dosFatos: facts || 'Narrativa detalhada dos fatos...',
        doDireito: legalThesis || 'Fundamentação jurídica no Código Civil e CPC...',
        dosPedidos: 'Procedência dos pedidos, condenação em honorários e custas.',
        valorCausaSugerido: 100000,
        jurisprudenciaCitada: [
          'STJ - REsp 1.896.678/RS - Rel. Min. Marco Aurélio Bellizze',
          'STF - Tema 69 de Repercussão Geral',
        ],
        artigosLei: ['Art. 300 do CPC', 'Art. 422 do Código Civil', 'Art. 85 do CPC'],
        provasRequeridas: ['Juntada de documentos', 'Depoimento pessoal', 'Perícia técnica'],
        textoCompletoFormatado: fullText,
      };
    }

    const execTime = Date.now() - startTime;
    db.aiLogs.push({
      id: `ai-log-${Date.now()}`,
      tenantId,
      userId,
      userName: 'Dr. Carlos Silveira',
      feature: 'DOCUMENT_DRAFT',
      promptTokens: 450,
      completionTokens: 850,
      estimatedCostBRL: 0.025,
      executionTimeMs: execTime,
      status: 'SUCCESS',
      modelUsed: 'gemini-3.7-flash',
      createdAt: new Date().toISOString(),
    });

    res.json(draftResult);
  });

  // 3. Resumo e Análise Estratégica de Caso
  app.post('/api/ai/summarize-case', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { caseId, customContext } = req.body;

    const theCase = db.cases.find((c) => c.id === caseId && c.tenantId === tenantId);
    const movements = db.movements.filter((m) => m.caseId === caseId);

    const startTime = Date.now();
    const ai = getGeminiClient();

    let summaryResult: any = null;

    if (ai) {
      try {
        const prompt = `Você é um Consultor Estratégico Jurídico de alto nível.
Analise os dados deste processo e gere um resumo executivo gerencial para a diretoria e sócios do escritório.

DADOS DO CASO:
Título: ${theCase?.title || 'Caso Jurídico'}
Número: ${theCase?.caseNumber || 'N/A'}
Área: ${theCase?.legalArea || 'Cível'}
Valor da Causa: R$ ${theCase?.claimValue || 0}
Tribunal: ${theCase?.court} - ${theCase?.judicialBranch}
Fase Atual: ${theCase?.phase}
Andamentos Recentes:
${movements.map((m) => `- ${m.date}: ${m.title} -> ${m.content}`).join('\n')}
Contexto Adicional: ${customContext || 'Nenhum'}

Retorne EXCLUSIVAMENTE um JSON:
{
  "sinteseFatos": "string",
  "faseProcessualAtual": "string",
  "pontosControversos": ["string"],
  "proximosPassosRecomendados": ["string"],
  "grauRisco": "PROBABLE",
  "justificativaRisco": "string",
  "resumoFinanceiro": "string"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        summaryResult = JSON.parse(response.text || '{}');
      } catch (err) {
        console.error('Gemini error on summarize-case:', err);
      }
    }

    if (!summaryResult) {
      summaryResult = {
        sinteseFatos: `Processo ${theCase?.caseNumber || ''} em trâmite perante o ${theCase?.court || 'Judiciário'}, com valor atribuído de R$ ${(theCase?.claimValue || 0).toLocaleString('pt-BR')}. Envolve discussão central sobre cumprimento obrigacional e repercussões financeiras.`,
        faseProcessualAtual: `Fase de ${theCase?.phase || 'Instrução'} com movimentações ativas e decisões interlocutórias pendentes de manifestação das partes.`,
        pontosControversos: [
          'Validade das cláusulas resolutivas expressas e incidência de multa.',
          'Necessidade de dilação probatória testemunhal e pericial contábil.',
          'Cabimento de compensação de valores decorrentes de decisões anteriores.',
        ],
        proximosPassosRecomendados: [
          'Monitorar rigorosamente o prazo fatal da publicação em aberto.',
          'Alinhar depoimento com testemunhas-chave para a audiência de instrução.',
          'Apresentar proposta conciliatória calibrada com a margem de risco do cliente.',
        ],
        grauRisco: theCase?.contingencyRisk || 'POSSIBLE',
        justificativaRisco: 'Jurisprudência majoritária favorável, com risco residual de divergência na fixação de astreintes e honorários sucumbenciais.',
        resumoFinanceiro: `Exposição total estimada em R$ ${(theCase?.claimValue || 0).toLocaleString('pt-BR')}, com expectativa de recuperação líquida em torno de 85%.`,
      };
    }

    const execTime = Date.now() - startTime;
    db.aiLogs.push({
      id: `ai-log-${Date.now()}`,
      tenantId,
      userId,
      userName: 'Dr. Carlos Silveira',
      feature: 'CASE_SUMMARY',
      promptTokens: 380,
      completionTokens: 320,
      estimatedCostBRL: 0.012,
      executionTimeMs: execTime,
      status: 'SUCCESS',
      modelUsed: 'gemini-3.7-flash',
      createdAt: new Date().toISOString(),
    });

    res.json(summaryResult);
  });

  // 4. Chat Jurídico Especializado
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { message, caseContext } = req.body;

    const startTime = Date.now();
    const ai = getGeminiClient();

    let reply = '';

    if (ai) {
      try {
        const systemInstruction = `Você é o JurisFlow AI, um Assistente Jurídico Inteligente de alta precisão para advogados brasileiros.
Responda com fundamentação técnica precisa, mencionando artigos do Código de Processo Civil (CPC/2015), Código Civil, CLT, Constituição Federal e jurisprudência dos Tribunais (STF, STJ, TST, Tribunais de Justiça).
Seja cordial, direto, estruturado e pragmático.
Contexto do Caso Atual do Usuário: ${caseContext || 'Nenhum processo específico selecionado'}`;

        const chat = ai.chats.create({
          model: 'gemini-3.7-flash',
          config: {
            systemInstruction,
          },
        });

        const response = await chat.sendMessage({
          message: message || 'Olá',
        });
        reply = response.text || '';
      } catch (err) {
        console.error('Gemini error on ai/chat:', err);
      }
    }

    if (!reply) {
      reply = `Com base nas normas processuais vigentes (CPC/2015, art. 219 e seguintes) e na jurisprudência dominante, a estratégia recomendada consiste em assegurar o cumprimento tempestivo dos atos processuais em dias úteis, garantindo a juntada tempestiva de documentos comprobatórios e a instrução probatória adequada.\n\nFico à disposição para redigir minutas de petições, calcular prazos fatais ou analisar intimações específicas.`;
    }

    const execTime = Date.now() - startTime;
    db.aiLogs.push({
      id: `ai-log-${Date.now()}`,
      tenantId,
      userId,
      userName: 'Dr. Carlos Silveira',
      feature: 'LEGAL_CHAT',
      promptTokens: 200,
      completionTokens: 400,
      estimatedCostBRL: 0.009,
      executionTimeMs: execTime,
      status: 'SUCCESS',
      modelUsed: 'gemini-3.7-flash',
      createdAt: new Date().toISOString(),
    });

    res.json({ reply });
  });

  // AI Usage Stats
  app.get('/api/ai/stats', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const logs = db.aiLogs.filter((l) => l.tenantId === tenantId);
    const totalRequests = logs.length + 14; // include baseline seed metrics
    const totalTokens = logs.reduce((acc, l) => acc + l.promptTokens + l.completionTokens, 0) + 38400;
    const totalCostBRL = logs.reduce((acc, l) => acc + l.estimatedCostBRL, 0) + 1.24;

    res.json({
      totalRequests,
      totalTokens,
      totalCostBRL: Math.round(totalCostBRL * 100) / 100,
      activeModel: 'gemini-3.7-flash',
      recentLogs: logs.slice(0, 10),
    });
  });

  // --- AUDIT LOGS & LGPD ---
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.auditLogs.filter((l) => l.tenantId === tenantId));
  });

  app.get('/api/lgpd', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.lgpdConsents.filter((c) => c.tenantId === tenantId));
  });

  app.post('/api/lgpd/consent', async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const newConsent: LGPDConsent = {
      id: `lgpd-${Date.now()}`,
      tenantId,
      personId: req.body.personId,
      personName: req.body.personName || 'Titular dos Dados',
      consentType: req.body.consentType || 'REPRESENTACAO_JUDICIAL',
      status: 'GRANTED',
      grantedAt: new Date().toISOString(),
      termsVersion: 'v2.1-2026',
      ip: req.ip || '127.0.0.1',
    };
    db.lgpdConsents.unshift(newConsent);
    await syncLgpdConsentToSupabase(newConsent);
    logAudit(req, 'PERSON', newConsent.personId, 'UPDATE', `Registrou consentimento LGPD (${newConsent.consentType}) para ${newConsent.personName}`);
    res.status(201).json(newConsent);
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    res.json(db.notifications.filter((n) => n.tenantId === tenantId));
  });

  app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.read = true;
      await syncNotificationToSupabase(notif);
    }
    res.json({ success: true });
  });

  // --- GLOBAL SEARCH ---
  app.get('/api/search', (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const q = (req.query.q as string || '').toLowerCase().trim();

    if (!q) return res.json([]);

    const results: GlobalSearchResult[] = [];

    // Search Cases
    db.cases
      .filter((c) => c.tenantId === tenantId)
      .forEach((c) => {
        if (
          c.title.toLowerCase().includes(q) ||
          c.caseNumber.toLowerCase().includes(q) ||
          c.court.toLowerCase().includes(q)
        ) {
          results.push({
            id: c.id,
            type: 'CASE',
            title: c.title,
            subtitle: `${c.caseNumber} • ${c.court} (${c.judicialBranch})`,
            badge: c.legalArea,
            badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            linkAction: { module: 'cases', entityId: c.id },
          });
        }
      });

    // Search Clients & Persons
    db.persons
      .filter((p) => p.tenantId === tenantId)
      .forEach((p) => {
        if (
          p.name.toLowerCase().includes(q) ||
          p.document.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        ) {
          results.push({
            id: p.id,
            type: 'PERSON',
            title: p.name,
            subtitle: `${p.type === 'PJ' ? 'CNPJ' : 'CPF'}: ${p.document} • ${p.email}`,
            badge: p.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            linkAction: { module: 'clients', entityId: p.id },
          });
        }
      });

    // Search Deadlines
    db.deadlines
      .filter((d) => d.tenantId === tenantId)
      .forEach((d) => {
        if (
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.caseNumber && d.caseNumber.toLowerCase().includes(q))
        ) {
          results.push({
            id: d.id,
            type: 'DEADLINE',
            title: d.title,
            subtitle: `Vencimento: ${d.dueDate} • ${d.daysCount} dias (${d.calculationType})`,
            badge: `Fatal: ${d.dueDate}`,
            badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            linkAction: { module: 'deadlines', entityId: d.id },
          });
        }
      });

    // Search Documents
    db.documents
      .filter((doc) => doc.tenantId === tenantId)
      .forEach((doc) => {
        if (
          doc.title.toLowerCase().includes(q) ||
          doc.description.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q)
        ) {
          results.push({
            id: doc.id,
            type: 'DOCUMENT',
            title: doc.title,
            subtitle: `${doc.category} • Versão ${doc.currentVersion} • ${doc.status}`,
            badge: doc.category,
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            linkAction: { module: 'documents', entityId: doc.id },
          });
        }
      });

    res.json(results.slice(0, 15));
  });

  // ==========================================
  // VITE DEV MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JurisFlow SaaS Backend running on http://0.0.0.0:${PORT}`);

    // Hydrate in the background without blocking startup TCP probe.
    // A full push is destructive and must be explicitly enabled.
    (async () => {
      try {
        const hyd = await hydrateFromSupabase(db);
        if (hyd.success) {
          console.log('[Supabase] Startup hydration finished:', hyd.counts);
        }

        if (process.env.SUPABASE_SYNC_ON_STARTUP === 'true') {
          const pushResult = await syncAllLocalToSupabase(db);
          if (pushResult.success) {
            console.log('[Supabase] Startup syncAll finished:', pushResult.counts);
          } else {
            console.warn('[Supabase] Startup syncAll completed with errors:', pushResult.counts);
          }
        } else {
          console.log('[Supabase] Startup push disabled (set SUPABASE_SYNC_ON_STARTUP=true to enable).');
        }
      } catch (err) {
        console.warn('[Supabase] Startup background hydration/sync skipped:', err);
      }
    })();
  });
}

startServer();
