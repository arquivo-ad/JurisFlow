import { User, Role, ModuleMetadata, FeatureFlag, ModuleId } from '../types/index.ts';
import { hasPermission, isSuperAdmin } from './rbac';

export interface EntitlementContext {
  user: User | null;
  role: Role | null;
  modules: ModuleMetadata[];
  featureFlags: FeatureFlag[];
  planTier?: 'STARTER' | 'PROFESSIONAL' | 'PREMIUM';
}

// Capability to Module mapping
export const CAPABILITY_MAP: Record<string, { module: ModuleId; requiredPermission?: string; minPlan?: 'STARTER' | 'PROFESSIONAL' | 'PREMIUM' }> = {
  // Core CRM & Clientes
  'clients.view': { module: 'clients', requiredPermission: 'CLIENT_VIEW', minPlan: 'STARTER' },
  'clients.create': { module: 'clients', requiredPermission: 'CLIENT_CREATE', minPlan: 'STARTER' },
  'clients.edit': { module: 'clients', requiredPermission: 'CLIENT_EDIT', minPlan: 'STARTER' },
  'clients.delete': { module: 'clients', requiredPermission: 'CLIENT_DELETE', minPlan: 'STARTER' },
  'clients.export': { module: 'clients', requiredPermission: 'CLIENT_VIEW', minPlan: 'PROFESSIONAL' },

  // Processos & Casos
  'cases.view': { module: 'cases', requiredPermission: 'CASE_VIEW', minPlan: 'STARTER' },
  'cases.create': { module: 'cases', requiredPermission: 'CASE_CREATE', minPlan: 'STARTER' },
  'cases.edit': { module: 'cases', requiredPermission: 'CASE_EDIT', minPlan: 'STARTER' },
  'cases.delete': { module: 'cases', requiredPermission: 'CASE_DELETE', minPlan: 'STARTER' },
  'cases.movements.add': { module: 'cases', requiredPermission: 'CASE_EDIT', minPlan: 'STARTER' },
  'cases.timeline-v2': { module: 'cases', requiredPermission: 'CASE_VIEW', minPlan: 'PROFESSIONAL' },

  // Prazos & Agenda
  'deadlines.view': { module: 'deadlines', requiredPermission: 'DEADLINE_VIEW', minPlan: 'STARTER' },
  'deadlines.manage': { module: 'deadlines', requiredPermission: 'DEADLINE_CREATE', minPlan: 'STARTER' },
  'calendar.view': { module: 'calendar', requiredPermission: 'DEADLINE_VIEW', minPlan: 'STARTER' },
  'tasks.manage': { module: 'tasks', requiredPermission: 'DEADLINE_CREATE', minPlan: 'STARTER' },
  'hearings.manage': { module: 'hearings', requiredPermission: 'CASE_EDIT', minPlan: 'STARTER' },

  // Documentos & Minutas
  'documents.view': { module: 'documents', requiredPermission: 'DOCUMENT_VIEW', minPlan: 'STARTER' },
  'documents.upload': { module: 'documents', requiredPermission: 'DOCUMENT_UPLOAD', minPlan: 'STARTER' },
  'templates.manage': { module: 'templates', requiredPermission: 'TEMPLATE_MANAGE', minPlan: 'PROFESSIONAL' },
  'documents.generate': { module: 'document-generator', requiredPermission: 'DOCUMENT_GENERATE', minPlan: 'PROFESSIONAL' },
  'documents.ai-generator': { module: 'ai', requiredPermission: 'DOCUMENT_GENERATE', minPlan: 'PREMIUM' },

  // Financeiro
  'financial.view': { module: 'financial', requiredPermission: 'FINANCIAL_VIEW', minPlan: 'PROFESSIONAL' },
  'financial.manage': { module: 'financial', requiredPermission: 'FINANCIAL_MANAGE', minPlan: 'PROFESSIONAL' },
  'financial.export': { module: 'financial', requiredPermission: 'FINANCIAL_MANAGE', minPlan: 'PROFESSIONAL' },
  'financial.new-dashboard': { module: 'financial', requiredPermission: 'FINANCIAL_VIEW', minPlan: 'PREMIUM' },

  // Inteligência Artificial
  'ai.view': { module: 'ai', requiredPermission: 'AI_ASSISTANT_USE', minPlan: 'PREMIUM' },
  'ai.extract-deadline': { module: 'ai', requiredPermission: 'AI_ASSISTANT_USE', minPlan: 'PREMIUM' },
  'ai.draft-piece': { module: 'ai', requiredPermission: 'AI_ASSISTANT_USE', minPlan: 'PREMIUM' },
  'ai.case-summary': { module: 'ai', requiredPermission: 'AI_ASSISTANT_USE', minPlan: 'PREMIUM' },

  // Relatórios & Auditoria
  'reports.view': { module: 'reports', requiredPermission: 'REPORT_VIEW', minPlan: 'PROFESSIONAL' },
  'reports.advanced': { module: 'reports', requiredPermission: 'REPORT_VIEW', minPlan: 'PREMIUM' },
  'audit.view': { module: 'audit', requiredPermission: 'AUDIT_LOG_VIEW', minPlan: 'PROFESSIONAL' },

  // Administração & Plataforma
  'admin.access': { module: 'admin', requiredPermission: 'TENANT_MANAGE', minPlan: 'STARTER' },
  'modules.manage': { module: 'admin', requiredPermission: 'TENANT_MANAGE', minPlan: 'STARTER' },
  'feature-flags.manage': { module: 'admin', requiredPermission: 'TENANT_MANAGE', minPlan: 'STARTER' },
  'system.update': { module: 'updates', requiredPermission: 'TENANT_MANAGE', minPlan: 'STARTER' },
  'users.manage': { module: 'users', requiredPermission: 'USER_MANAGE', minPlan: 'STARTER' },
  'roles.manage': { module: 'profiles', requiredPermission: 'ROLE_MANAGE', minPlan: 'STARTER' },
};

const PLAN_LEVELS: Record<'STARTER' | 'PROFESSIONAL' | 'PREMIUM', number> = {
  STARTER: 1,
  PROFESSIONAL: 2,
  PREMIUM: 3,
};

/**
 * Central Entitlement & Capability Checker
 * Follows the formula:
 * (Plan Allows) AND (Module is Active) AND (Feature Flag is Enabled if applicable) AND (User/Role has Permission)
 */
export function canUse(
  capability: string,
  context: EntitlementContext
): boolean {
  const { user, role, modules, featureFlags, planTier = 'PREMIUM' } = context;

  // Super Admin bypasses user permissions, but still respects module active status unless testing
  const isSuper = user ? isSuperAdmin(user) : false;

  const mapping = CAPABILITY_MAP[capability];
  if (!mapping) {
    // If unknown capability, fallback to Super Admin check or deny
    return isSuper;
  }

  // 1. Check if underlying Module is Active
  if (modules && modules.length > 0) {
    const mod = modules.find((m) => m.id === mapping.module);
    if (mod && mod.status !== 'ACTIVE') {
      // Inactive module blocks usage
      return false;
    }
  }

  // 2. Check Feature Flag if capability is flag-driven
  const flag = featureFlags?.find((f) => f.key === capability);
  if (flag && !flag.enabled) {
    return false;
  }

  // 3. Check Plan Tier
  if (mapping.minPlan) {
    const userPlanLevel = PLAN_LEVELS[planTier] || 1;
    const requiredPlanLevel = PLAN_LEVELS[mapping.minPlan] || 1;
    if (userPlanLevel < requiredPlanLevel) {
      return false;
    }
  }

  // 4. Super Admin passes permission check once module & flag allow
  if (isSuper) {
    return true;
  }

  // 5. Check User RBAC Permission
  if (mapping.requiredPermission) {
    if (!role) return false;
    if (role.code === 'SUPER_ADMIN' || role.code === 'SOCIO_ADMIN') return true;
    const hasPerm = role.permissions?.some((p) => p.code === mapping.requiredPermission || p.resource === mapping.module.toUpperCase());
    if (!hasPerm && !hasPermission(role)) {
      return false;
    }
  }

  return true;
}

export function getModuleForCapability(capability: string): ModuleId | null {
  return CAPABILITY_MAP[capability]?.module || null;
}
