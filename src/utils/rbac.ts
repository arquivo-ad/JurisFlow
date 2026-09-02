import { Role, User, Membership } from '../types';

export type AppModule =
  | 'dashboard'
  | 'crm'
  | 'cases'
  | 'calendar'
  | 'documents'
  | 'financial'
  | 'ai-gateway'
  | 'settings';

export interface RBACContext {
  user: User | null;
  role: Role | null;
  memberships?: Membership[];
}

/**
 * Checks if a user or role has Super Admin privileges.
 */
export function isSuperAdmin(user?: User | null, role?: Role | null): boolean {
  if (!user && !role) return false;
  if (user?.id === 'u-superadmin' || user?.email?.includes('superadmin')) return true;
  if (role?.code === 'SUPER_ADMIN') return true;
  return false;
}

/**
 * Checks if a user or role is Managing Partner (Sócio Administrador).
 */
export function isSocioAdmin(user?: User | null, role?: Role | null): boolean {
  if (isSuperAdmin(user, role)) return true;
  if (role?.code === 'SOCIO_ADMIN') return true;
  return false;
}

/**
 * Validates if the current user/role is allowed to navigate to and use a specific AppModule.
 *
 * Strictest security rules:
 * - SUPER_ADMIN: All modules
 * - SOCIO_ADMIN: All modules
 * - ADVOGADO_SENIOR / ADVOGADO_PLENO: dashboard, crm, cases, calendar, documents, ai-gateway
 * - FINANCEIRO: dashboard, financial, crm (Strictly blocked from Cases, Calendar, AI Gateway, Settings)
 * - ESTAGIARIO: dashboard, calendar, cases, documents (Strictly blocked from Financial, AI Gateway, Settings)
 * - SECRETARIA: dashboard, crm, calendar, documents
 */
export function canAccessModule(
  module: AppModule,
  user?: User | null,
  role?: Role | null
): boolean {
  if (isSuperAdmin(user, role)) return true;
  if (isSocioAdmin(user, role)) return true;

  const roleCode = role?.code;

  switch (module) {
    case 'dashboard':
      // All authenticated members have tailored dashboard access
      return true;

    case 'financial':
      // Financial Controller and Managing Partners have access
      return roleCode === 'FINANCEIRO' || roleCode === 'SOCIO_ADMIN' || roleCode === 'SUPER_ADMIN';

    case 'cases':
      // Legal team (Lawyers, Paralegals, Partners). Blocked for Financeiro
      if (roleCode === 'FINANCEIRO') return false;
      return (
        roleCode === 'ADVOGADO_SENIOR' ||
        roleCode === 'ADVOGADO_PLENO' ||
        roleCode === 'ADVOGADO_JUNIOR' ||
        roleCode === 'PARALEGAL_ESTAGIARIO' ||
        roleCode === 'SOCIO_ADMIN' ||
        roleCode === 'SUPER_ADMIN' ||
        hasPermission(role, 'CASES', 'READ')
      );

    case 'calendar':
      // Legal team (Lawyers, Paralegals, Partners). Blocked for Financeiro
      if (roleCode === 'FINANCEIRO') return false;
      return (
        roleCode === 'ADVOGADO_SENIOR' ||
        roleCode === 'ADVOGADO_PLENO' ||
        roleCode === 'ADVOGADO_JUNIOR' ||
        roleCode === 'PARALEGAL_ESTAGIARIO' ||
        roleCode === 'SECRETARIA' ||
        roleCode === 'SOCIO_ADMIN' ||
        roleCode === 'SUPER_ADMIN' ||
        hasPermission(role, 'DEADLINES', 'READ')
      );

    case 'crm':
      // CRM / Clients is available to lawyers, partners, and financial controller (for billing registry)
      return (
        roleCode === 'FINANCEIRO' ||
        roleCode === 'ADVOGADO_SENIOR' ||
        roleCode === 'ADVOGADO_PLENO' ||
        roleCode === 'ADVOGADO_JUNIOR' ||
        roleCode === 'SECRETARIA' ||
        roleCode === 'SOCIO_ADMIN' ||
        roleCode === 'SUPER_ADMIN' ||
        hasPermission(role, 'CLIENTS', 'READ')
      );

    case 'documents':
      // Legal team and Secretariat. Blocked for standalone financial
      if (roleCode === 'FINANCEIRO') return false;
      return (
        roleCode === 'ADVOGADO_SENIOR' ||
        roleCode === 'ADVOGADO_PLENO' ||
        roleCode === 'ADVOGADO_JUNIOR' ||
        roleCode === 'PARALEGAL_ESTAGIARIO' ||
        roleCode === 'SECRETARIA' ||
        roleCode === 'SOCIO_ADMIN' ||
        roleCode === 'SUPER_ADMIN' ||
        hasPermission(role, 'DOCUMENTS', 'READ')
      );

    case 'ai-gateway':
      // Lawyers and Partners only. Blocked for Financeiro & Estagiário
      if (roleCode === 'FINANCEIRO' || roleCode === 'PARALEGAL_ESTAGIARIO') return false;
      return (
        roleCode === 'ADVOGADO_SENIOR' ||
        roleCode === 'ADVOGADO_PLENO' ||
        roleCode === 'ADVOGADO_JUNIOR' ||
        roleCode === 'SOCIO_ADMIN' ||
        roleCode === 'SUPER_ADMIN' ||
        hasPermission(role, 'AI_GATEWAY', 'EXECUTE')
      );

    case 'settings':
      // Only Super Admin & Sócio Admin can manage governance, branches, and multi-tenant settings
      return (
        roleCode === 'SUPER_ADMIN' ||
        roleCode === 'SOCIO_ADMIN' ||
        hasPermission(role, 'SETTINGS', 'APPROVE') ||
        hasPermission(role, 'SETTINGS', 'CREATE')
      );

    default:
      return false;
  }
}

/**
 * Returns a human-friendly Portuguese explanation why a module is restricted.
 */
export function getModuleRestrictionReason(
  module: AppModule,
  role?: Role | null
): { title: string; description: string; requiredRole: string } {
  const roleName = role?.name || 'Seu perfil';

  switch (module) {
    case 'cases':
      return {
        title: 'Módulo de Processos Judiciais Restrito',
        description: `O perfil "${roleName}" não possui credencial para acessar autos de processos judiciais contenciosos e teses jurídicas. Este módulo é restrito aos advogados e corpo jurídico habilitado.`,
        requiredRole: 'Advogado Sênior / Sócio Administrador',
      };
    case 'calendar':
      return {
        title: 'Agenda & Prazos CPC Restrito',
        description: `O perfil "${roleName}" não tem acesso à gestão de prazos processuais fatais e audiências judiciais da sociedade.`,
        requiredRole: 'Corpo Jurídico / Paralegal / Sócio',
      };
    case 'financial':
      return {
        title: 'Módulo Financeiro & Mercado Pago Restrito',
        description: `Dados de honorários, faturamento, DRE e conciliação bancária são confidenciais e restritos à Controladoria Financeira e aos Sócios Administradores.`,
        requiredRole: 'Controladoria & Financeiro / Sócio Administrador',
      };
    case 'ai-gateway':
      return {
        title: 'AI Gateway Jurídico Restrito',
        description: `A elaboração automatizada de peças processuais com IA generativa e análise de publicações é restrita a advogados com inscrição ativa na OAB.`,
        requiredRole: 'Advogado / Sócio Administrador',
      };
    case 'documents':
      return {
        title: 'Repositório de Minutas & Peças Restrito',
        description: `O perfil "${roleName}" não possui permissão para acessar o acervo de peças processuais e minutas contratuais.`,
        requiredRole: 'Advogado / Corpo Jurídico',
      };
    case 'settings':
      return {
        title: 'Governança Institucional & RBAC Restrito',
        description: `A gestão de filiais, quadro de usuários, concessão de permissões e provisionamento SaaS é exclusiva da Diretoria e Sócios Administradores.`,
        requiredRole: 'Sócio Administrador / Super Admin SaaS',
      };
    default:
      return {
        title: 'Acesso Não Autorizado',
        description: `Você não possui as permissões necessárias para acessar esta funcionalidade.`,
        requiredRole: 'Administrador',
      };
  }
}

/**
 * Returns the default module for a given role upon login/switch.
 */
export function getDefaultModuleForRole(role?: Role | null, user?: User | null): AppModule {
  if (isSuperAdmin(user, role) || isSocioAdmin(user, role)) {
    return 'dashboard';
  }
  if (role?.code === 'FINANCEIRO') {
    return 'financial';
  }
  if (role?.code === 'PARALEGAL_ESTAGIARIO') {
    return 'calendar';
  }
  if (role?.code === 'ADVOGADO_SENIOR' || role?.code === 'ADVOGADO_PLENO' || role?.code === 'ADVOGADO_JUNIOR') {
    return 'cases';
  }
  return 'dashboard';
}

/**
 * Checks if a specific action on a resource is allowed for the role.
 */
export function hasPermission(
  role?: Role | null,
  resource?: string,
  action?: string
): boolean {
  if (!role || !role.permissions) return false;
  if (role.code === 'SUPER_ADMIN' || role.code === 'SOCIO_ADMIN') return true;

  return role.permissions.some((p) => {
    if (p.effect === 'DENY') return false;
    const matchResource = p.resource === resource || p.resource === ('*' as any);
    const matchAction = p.action === action || p.action === ('APPROVE' as any) || p.action === ('*' as any);
    return matchResource && matchAction;
  });
}
