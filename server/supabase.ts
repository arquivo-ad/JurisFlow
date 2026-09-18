import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Tenant,
  Branch,
  User,
  Role,
  Membership,
  Person,
  Client,
  Case,
  Deadline,
  Hearing,
  DocumentItem,
  FeeContract,
  AccountReceivable,
  Notification,
  AuditLog,
  Movement,
} from '../src/types/index.ts';

let supabaseClient: SupabaseClient | null = null;

const rlsRestrictedTables = new Set<string>();
let rlsDiagnosticLogged = false;
let auditLogsRlsBlocked = false;
let lastAuditLogsRlsCheck = 0;

export function inspectSupabaseKey(): {
  keyType: 'SERVICE_ROLE' | 'PUBLISHABLE' | 'UNKNOWN';
  keyPrefix: string;
  isServiceRole: boolean;
} {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!key) {
    return { keyType: 'UNKNOWN', keyPrefix: '', isServiceRole: false };
  }

  if (key.startsWith('sb_secret_')) {
    return { keyType: 'SERVICE_ROLE', keyPrefix: 'sb_secret_...', isServiceRole: true };
  }

  if (key.startsWith('sb_publishable_')) {
    return { keyType: 'PUBLISHABLE', keyPrefix: 'sb_publishable_...', isServiceRole: false };
  }

  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      if (payload.role === 'service_role') {
        return { keyType: 'SERVICE_ROLE', keyPrefix: 'eyJ... (service_role)', isServiceRole: true };
      }
      if (payload.role === 'anon') {
        return { keyType: 'PUBLISHABLE', keyPrefix: 'eyJ... (anon)', isServiceRole: false };
      }
    } catch {}
  }

  return { keyType: 'UNKNOWN', keyPrefix: key.substring(0, 8) + '...', isServiceRole: false };
}

export function getRlsRestrictedTables(): string[] {
  return Array.from(rlsRestrictedTables);
}

export function resetRlsStatus(): void {
  rlsRestrictedTables.clear();
  auditLogsRlsBlocked = false;
  lastAuditLogsRlsCheck = 0;
}

export function handleSupabaseSyncError(table: string, error: any): boolean {
  if (!error) return true;

  const msg = typeof error.message === 'string' ? error.message : String(error);
  const isRls =
    error.code === '42501' ||
    msg.toLowerCase().includes('row-level security policy') ||
    msg.toLowerCase().includes('violates row-level security');

  if (isRls) {
    rlsRestrictedTables.add(table);
    if (!rlsDiagnosticLogged) {
      rlsDiagnosticLogged = true;
      console.warn(
        `[Supabase RLS Notice] A tabela "${table}" possui Row-Level Security ativado e a chave configurada não tem permissão de escrita/bypass (chave anon/publishable). ` +
        `Para sincronização direta pelo backend, utilize SUPABASE_SERVICE_ROLE_KEY (chave service_role: sb_secret_...) ou crie políticas RLS permissivas no Supabase.`
      );
    }
    return false;
  }

  console.warn(`[Supabase Sync Notice] ${table}:`, msg);
  return false;
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !serviceKey || url.includes('MY_SUPABASE') || serviceKey.includes('MY_KEY')) {
    return null;
  }

  try {
    supabaseClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Initialized client for:', url);
    return supabaseClient;
  } catch (error) {
    console.warn('[Supabase] Init warning:', error);
    return null;
  }
}

export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  url: string | null;
  tables: Record<string, number>;
  error?: string;
  keyInfo?: {
    keyType: 'SERVICE_ROLE' | 'PUBLISHABLE' | 'UNKNOWN';
    keyPrefix: string;
    isServiceRole: boolean;
  };
  rlsNotice?: string;
  rlsTables?: string[];
  suggestedSqlPolicy?: string;
}> {
  const client = getSupabase();
  const keyInfo = inspectSupabaseKey();

  if (!client) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL || null,
      tables: {},
      keyInfo,
      error: 'Credenciais do Supabase não configuradas no arquivo .env',
    };
  }

  const tableCounts: Record<string, number> = {};
  const testTables = [
    'tenants',
    'branches',
    'users',
    'roles',
    'memberships',
    'persons',
    'clients',
    'cases',
    'deadlines',
    'contracts',
    'receivables',
    'audit_logs',
    'documents',
    'hearings',
    'notifications',
  ];

  try {
    for (const table of testTables) {
      try {
        const { count, error } = await client
          .from(table)
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          tableCounts[table] = count;
        } else {
          tableCounts[table] = 0;
        }
      } catch {
        tableCounts[table] = -1;
      }
    }

    const rlsTables = getRlsRestrictedTables();
    let rlsNotice: string | undefined;
    if (!keyInfo.isServiceRole) {
      rlsNotice = `A chave configurada atual (${keyInfo.keyPrefix}) possui perfil público/anon (Publishable). Tabelas com Row-Level Security (como audit_logs) exigem a chave secreta (service_role: sb_secret_...) ou políticas RLS permissivas para gravação.`;
    }

    const suggestedSqlPolicy = `-- Script SQL para permitir gravação de auditoria e sincronização no Supabase:
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercao em audit_logs" ON audit_logs;
CREATE POLICY "Permitir insercao em audit_logs"
  ON audit_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de audit_logs" ON audit_logs;
CREATE POLICY "Permitir leitura de audit_logs"
  ON audit_logs FOR SELECT
  TO anon, authenticated
  USING (true);`;

    return {
      connected: true,
      url: process.env.SUPABASE_URL || null,
      tables: tableCounts,
      keyInfo,
      rlsNotice,
      rlsTables,
      suggestedSqlPolicy,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL || null,
      tables: tableCounts,
      keyInfo,
      error: err.message || 'Erro ao conectar ao banco de dados PostgreSQL do Supabase',
    };
  }
}

// ============================================================
// INDIVIDUAL ENTITY SYNC FUNCTIONS (Strictly mapped to Supabase columns & constraints)
// ============================================================

export async function syncTenantToSupabase(t: Tenant): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload = {
      id: t.id,
      slug: t.slug || t.id,
      name: t.name,
      trade_name: t.tradeName || t.name,
      cnpj: t.cnpj || '',
      oab_registration: t.oabOfficeRegister?.split('/')[0]?.replace(/\D/g, '') || t.oabOfficeRegister || '',
      oab_uf: (t.oabOfficeRegister?.split('/')[1] || 'SP').substring(0, 2),
      plan: t.plan || 'ENTERPRISE',
      status: t.active ? 'ACTIVE' : 'SUSPENDED',
      settings: {
        ...(t.settings || {}),
        logoUrl: t.logoUrl || t.visualIdentity?.logoUrl || (t.settings as any)?.logoUrl || '',
        visualIdentity: t.visualIdentity || (t.settings as any)?.visualIdentity || {},
      },
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('tenants').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('tenants', error);
    }
    console.log('[Supabase Sync OK] tenants:', t.name, `(${t.id})`);
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('tenants', err);
  }
}

export async function syncBranchToSupabase(b: Branch): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload = {
      id: b.id,
      tenant_id: b.tenantId,
      code: b.code || 'MAT-01',
      name: b.name,
      is_headquarters: Boolean(b.isMain),
      oab_branch_reg: '',
      cnpj: '',
      address: typeof b.address === 'string' ? { street: b.address, city: b.city, state: b.state } : (b.address || {}),
      contact: { phone: b.phone || '', email: b.email || '' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('branches').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('branches', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('branches', err);
  }
}

export async function syncUserToSupabase(u: User): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload = {
      id: u.id,
      name: u.name,
      email: u.email,
      oab_number: u.oabNumber || '',
      oab_uf: (u.oabUf || 'SP').substring(0, 2),
      cpf: (u as any).cpf || '',
      phone: u.phone || '',
      avatar_url: u.avatarUrl || '',
      is_active: Boolean(u.active),
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('users').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('users', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('users', err);
  }
}

export async function syncRoleToSupabase(r: Role): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const validTenantId = r.tenantId && r.tenantId !== 'GLOBAL' && !r.isSystem ? r.tenantId : null;
    const payload = {
      id: r.id,
      tenant_id: validTenantId,
      code: r.code,
      name: r.name,
      description: r.description || '',
      is_system: Boolean(r.isSystem),
      permissions: r.permissions || [],
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from('roles').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('roles', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('roles', err);
  }
}

export async function syncMembershipToSupabase(m: Membership, extraAffiliations?: any[]): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const scopesList = [...(m.scopes || ['*'])];
    if (m.email && !scopesList.some((s) => s.startsWith('email:'))) {
      scopesList.push(`email:${m.email}`);
    }
    if (m.phone && !scopesList.some((s) => s.startsWith('phone:'))) {
      scopesList.push(`phone:${m.phone}`);
    }
    if (m.isPrimary && !scopesList.includes('primary:true')) {
      scopesList.push('primary:true');
    }

    if (Array.isArray(extraAffiliations) && extraAffiliations.length > 0) {
      for (const aff of extraAffiliations) {
        const affStr = `AFFILIATION:${JSON.stringify({
          branchId: aff.branchId,
          roleId: aff.roleId,
          email: aff.email || '',
          phone: aff.phone || '',
          status: aff.status || 'ACTIVE',
          isPrimary: Boolean(aff.isPrimary),
        })}`;
        if (!scopesList.includes(affStr)) {
          scopesList.push(affStr);
        }
      }
    }

    const payload = {
      id: m.id,
      tenant_id: m.tenantId,
      user_id: m.userId,
      role_id: m.roleId,
      branch_id: m.branchId || null,
      status: m.status || 'ACTIVE',
      scopes: scopesList,
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from('memberships').upsert(payload, { onConflict: 'tenant_id,user_id' });
    if (error) {
      return handleSupabaseSyncError('memberships', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('memberships', err);
  }
}

export async function syncPersonToSupabase(p: Person): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Check constraint requires 'PF' or 'PJ'
    const mappedType = ((p.type as any) === 'LEGAL' || p.type === 'PJ') ? 'PJ' : 'PF';

    const payload = {
      id: p.id,
      tenant_id: p.tenantId,
      type: mappedType,
      name: p.name,
      trade_name: p.tradeName || p.name,
      document: p.document || '000.000.000-00',
      rg_ie: p.stateRegOrRg || (p as any).rgIe || '',
      email: p.email || '',
      phone: p.phone || '',
      whatsapp: p.mobilePhone || (p as any).whatsapp || '',
      address: p.address || {},
      notes: p.notes || '',
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('persons').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('persons', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('persons', err);
  }
}

export async function syncClientToSupabase(c: Client): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload = {
      id: c.id,
      tenant_id: c.tenantId,
      branch_id: (c as any).branchId || null,
      person_id: c.personId,
      category: (c as any).category || 'CORPORATE',
      status: c.status || 'ACTIVE',
      billing_profile: (c as any).billingProfile || {},
      created_at: (c as any).createdAt || c.createdDate || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('clients').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('clients', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('clients', err);
  }
}

export async function syncCaseToSupabase(
  c: Case,
  clientsList?: Client[],
  personsList?: Person[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Allowed phases in Supabase check constraint
    let mappedPhase = 'CONHECIMENTO';
    if (['CONHECIMENTO', 'RECURSAL', 'EXECUCAO', 'ARQUIVADO', 'CUMPRIMENTO_SENTENCA'].includes(c.phase as any)) {
      mappedPhase = c.phase;
    } else if ((c.phase as any) === 'LIQUIDACAO') {
      mappedPhase = 'CUMPRIMENTO_SENTENCA';
    }

    // Allowed expected_risk: 'HIGH' | 'MEDIUM' | 'LOW'
    let mappedRisk: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (c.contingencyRisk === 'PROBABLE' || (c as any).expectedRisk === 'HIGH') mappedRisk = 'HIGH';
    else if (c.contingencyRisk === 'POSSIBLE' || (c as any).expectedRisk === 'MEDIUM') mappedRisk = 'MEDIUM';
    else if (c.contingencyRisk === 'REMOTE' || (c as any).expectedRisk === 'LOW') mappedRisk = 'LOW';

    // Opposing party name resolution
    let opposingPartyName = (c as any).opposingParty;
    if (!opposingPartyName && c.parties) {
      const opposing = c.parties.find((p) => p.role === 'REU');
      if (opposing && personsList) {
        opposingPartyName = personsList.find((p) => p.id === opposing.personId)?.name;
      }
    }
    if (!opposingPartyName) opposingPartyName = 'Parte Contrária';

    // Client ID resolution
    let resolvedClientId = (c as any).clientId;
    if (!resolvedClientId && c.parties?.[0]?.personId && clientsList) {
      resolvedClientId = clientsList.find((cli) => cli.personId === c.parties[0].personId)?.id;
    }
    if (!resolvedClientId) resolvedClientId = 'cli-01';

    const payload = {
      id: c.id,
      tenant_id: c.tenantId,
      branch_id: c.branchId || null,
      cnj: c.caseNumber || (c as any).cnj || '0000000-00.2026.8.26.0100',
      title: c.title,
      area: c.legalArea || (c as any).area || 'CIVIL',
      phase: mappedPhase,
      status: c.status || 'ACTIVE',
      court: c.court || '1ª Vara Cível Central',
      judge_or_organ: c.judgeName || (c as any).judgeOrOrgan || '',
      client_id: resolvedClientId,
      client_role: (c as any).clientRole || c.parties?.[0]?.role || 'AUTOR',
      opposing_party: opposingPartyName,
      opposing_lawyer: (c as any).opposingLawyer || '',
      economic_value: Number(c.claimValue || (c as any).economicValue || 0),
      expected_risk: mappedRisk,
      responsible_user_id: c.responsibleLawyerId || (c as any).responsibleUserId || null,
      tags: (c as any).tags || [],
      distribution_date: c.distributionDate ? c.distributionDate.split('T')[0] : null,
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('cases').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('cases', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('cases', err);
  }
}

export async function syncDeadlineToSupabase(d: Deadline): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Allowed statuses in Supabase check constraint: 'PENDING' | 'COMPLETED'
    let mappedStatus: 'PENDING' | 'COMPLETED' = 'PENDING';
    if (d.status === 'COMPLETED' || d.completedAt) {
      mappedStatus = 'COMPLETED';
    } else {
      mappedStatus = 'PENDING';
    }

    const payload = {
      id: d.id,
      tenant_id: d.tenantId,
      case_id: d.caseId || 'case-01',
      assigned_user_id: d.responsibleUserId || (d as any).assignedUserId || null,
      reviewer_user_id: (d as any).reviewerUserId || null,
      title: d.title,
      description: d.description || '',
      publication_date: d.publishDate || (d as any).publicationDate || null,
      due_date: d.dueDate,
      due_time: (d as any).dueTime || '23:59:00',
      days_count: Number(d.daysCount || 15),
      counting_type: d.calculationType === 'DIAS_UTEIS_CPC' ? 'BUSINESS_DAYS' : 'CALENDAR_DAYS',
      priority: (d as any).priority || 'HIGH',
      status: mappedStatus,
      completed_at: d.completedAt || null,
      created_at: d.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('deadlines').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('deadlines', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('deadlines', err);
  }
}

export async function syncContractToSupabase(con: FeeContract): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Valid contract types in check constraint: 'PRO_LABORE' | 'EXITO' | 'MISTO'
    let mappedType = 'PRO_LABORE';
    if (con.type === 'SUCCESS_FEE' || (con.type as any) === 'EXITO') mappedType = 'EXITO';
    else if (con.type === 'HYBRID' || (con.type as any) === 'MISTO') mappedType = 'MISTO';

    const payload = {
      id: con.id,
      tenant_id: con.tenantId,
      branch_id: (con as any).branchId || null,
      client_id: con.clientId || 'cli-01',
      case_id: con.caseId || null,
      contract_number: con.contractNumber || con.id,
      title: con.title,
      type: mappedType,
      total_amount: Number(con.totalValue || (con as any).totalAmount || 0),
      installments_count: Number(con.installmentsCount || 1),
      status: con.status || 'ACTIVE',
      signed_date: con.startDate ? con.startDate.split('T')[0] : null,
      created_at: con.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('contracts').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('contracts', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('contracts', err);
  }
}

export async function syncReceivableToSupabase(r: AccountReceivable | any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Allowed statuses: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
    let mappedStatus = 'PENDING';
    if (r.status === 'PAID' || r.status === 'RECEIVED') mappedStatus = 'PAID';
    else if (r.status === 'OVERDUE') mappedStatus = 'OVERDUE';
    else if (r.status === 'CANCELLED') mappedStatus = 'CANCELLED';

    const payload = {
      id: r.id,
      tenant_id: r.tenantId,
      contract_id: r.contractId || r.feeContractId || 'con-01',
      client_id: r.clientId || 'cli-01',
      title: r.title,
      installment_number: Number(r.installmentNumber || 1),
      amount: Number(r.amount || 0),
      due_date: r.dueDate ? r.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
      status: mappedStatus,
      payment_method: r.charge?.method || r.paymentMethod || 'PIX',
      paid_amount: r.charge?.amount || r.paidAmount || (mappedStatus === 'PAID' ? Number(r.amount || 0) : null),
      paid_at: mappedStatus === 'PAID' ? new Date().toISOString() : null,
      mp_payment_id: r.charge?.mpPaymentId || r.mpPaymentId || null,
      mp_preference_id: r.mpPreferenceId || null,
      mp_qr_code_base64: null,
      mp_qr_code_copy_paste: r.charge?.pixCopiaECola || r.mpQrCodeCopyPaste || null,
      mp_ticket_url: r.charge?.boletoUrl || r.mpTicketUrl || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('receivables').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('receivables', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('receivables', err);
  }
}

export async function syncHearingToSupabase(h: Hearing): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Allowed statuses in Supabase check constraint: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
    let mappedStatus = 'SCHEDULED';
    const statusVal = (h.status as string) || '';
    if (statusVal === 'HELD' || statusVal === 'COMPLETED') mappedStatus = 'COMPLETED';
    else if (statusVal === 'CANCELLED') mappedStatus = 'CANCELLED';
    else if (statusVal === 'REDESIGNED' || statusVal === 'RESCHEDULED') mappedStatus = 'RESCHEDULED';
    else mappedStatus = 'SCHEDULED'; // covers 'CONFIRMED', 'SCHEDULED', etc.

    const payload = {
      id: h.id,
      tenant_id: h.tenantId,
      case_id: h.caseId || 'case-01',
      assigned_user_id: h.responsibleLawyerId || (h as any).assignedUserId || null,
      type: h.type || 'CONCILIACAO',
      modality: (h as any).modality || h.locationType || 'VIRTUAL',
      datetime: h.dateTime || (h as any).datetime || new Date().toISOString(),
      location_or_url: h.addressOrLink || (h as any).locationOrUrl || '',
      status: mappedStatus,
      notes: (h as any).notes || '',
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from('hearings').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('hearings', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('hearings', err);
  }
}

export async function syncDocumentToSupabase(doc: DocumentItem): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Allowed categories: 'CONTRATO' | 'PROCURACAO' | 'RECURSO' | 'OUTROS'
    let mappedCat = 'OUTROS';
    if (doc.category === 'CONTRATO') mappedCat = 'CONTRATO';
    else if (doc.category === 'PROCURACAO') mappedCat = 'PROCURACAO';
    else if ((doc.category as any) === 'RECURSO') mappedCat = 'RECURSO';

    // Allowed statuses in Supabase check constraint: 'DRAFT' | 'APPROVED'
    let mappedStatus = 'DRAFT';
    if (doc.status === 'APPROVED' || doc.status === 'FILED') {
      mappedStatus = 'APPROVED';
    } else {
      mappedStatus = 'DRAFT';
    }

    const payload = {
      id: doc.id,
      tenant_id: doc.tenantId,
      branch_id: (doc as any).branchId || null,
      case_id: doc.caseId || null,
      person_id: doc.personId || (doc as any).clientId || null,
      title: doc.title,
      category: mappedCat,
      status: mappedStatus,
      file_url: (doc as any).fileUrl || '',
      content_text: doc.content || '',
      version: Number(doc.currentVersion || (doc as any).version || 1),
      author_user_id: (doc as any).authorUserId || null,
      created_at: doc.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('documents').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('documents', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('documents', err);
  }
}

export async function syncCaseMovementToSupabase(mov: Movement | any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload = {
      id: mov.id,
      tenant_id: mov.tenantId || 't-silveira',
      case_id: mov.caseId || 'case-01',
      movement_date: mov.date || mov.movementDate || new Date().toISOString(),
      source: mov.source || 'DIARIO_OFICIAL',
      title: mov.title,
      full_content: mov.fullContent || mov.content || mov.title,
      has_pending_deadline: Boolean(mov.hasPendingDeadline),
      created_at: mov.createdAt || new Date().toISOString(),
    };

    const { error } = await client.from('case_movements').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('case_movements', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('case_movements', err);
  }
}

export async function syncNotificationToSupabase(n: Notification): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // Allowed types in Supabase check constraint: 'SYSTEM' | 'DEADLINE' | 'HEARING'
    let mappedType: 'SYSTEM' | 'DEADLINE' | 'HEARING' = 'SYSTEM';
    if (n.type === 'DEADLINE_ALERT' || (n.type as any) === 'DEADLINE') {
      mappedType = 'DEADLINE';
    } else if (n.type === 'HEARING_ALERT' || (n.type as any) === 'HEARING') {
      mappedType = 'HEARING';
    } else {
      mappedType = 'SYSTEM';
    }

    const payload = {
      id: n.id,
      tenant_id: n.tenantId,
      user_id: n.userId || null,
      type: mappedType,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      link: n.link || '',
      created_at: n.createdAt || new Date().toISOString(),
    };

    const { error } = await client.from('notifications').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('notifications', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('notifications', err);
  }
}

export async function syncAuditLogToSupabase(a: AuditLog | any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const now = Date.now();
  if (auditLogsRlsBlocked && now - lastAuditLogsRlsCheck < 60_000) {
    return false;
  }

  try {
    const payload = {
      id: a.id,
      tenant_id: a.tenantId,
      user_id: a.userId || null,
      user_name: a.userName || 'Sistema',
      user_role: a.userRole || '',
      action: a.action,
      entity: a.entityType || a.entity,
      entity_id: a.entityId || null,
      details: a.details || '',
      ip_address: a.ip || a.ipAddress || '127.0.0.1',
      created_at: a.timestamp || a.createdAt || new Date().toISOString(),
    };

    const { error } = await client.from('audit_logs').upsert(payload);
    if (error) {
      const isRls =
        error.code === '42501' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'));
      if (isRls) {
        auditLogsRlsBlocked = true;
        lastAuditLogsRlsCheck = now;
      }
      return handleSupabaseSyncError('audit_logs', error);
    }
    auditLogsRlsBlocked = false;
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('audit_logs', err);
  }
}

export async function syncLgpdConsentToSupabase(l: any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload = {
      id: l.id,
      tenant_id: l.tenantId,
      person_id: l.personId,
      term_version: l.termVersion || 'v1.0',
      purpose: l.purpose || 'Prestação de Serviços Jurídicos',
      has_consented: Boolean(l.hasConsented !== false),
      ip_address: l.ipAddress || '127.0.0.1',
      captured_at: l.capturedAt || new Date().toISOString(),
    };

    const { error } = await client.from('lgpd_consents').upsert(payload);
    if (error) {
      return handleSupabaseSyncError('lgpd_consents', error);
    }
    return true;
  } catch (err: any) {
    return handleSupabaseSyncError('lgpd_consents', err);
  }
}

/**
 * Generic fallback upsert helper
 */
export async function syncToSupabase(table: string, data: any): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client.from(table).upsert(data);
    if (error) {
      console.warn(`[Supabase Sync Warning] Table ${table}:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Supabase Sync Exception] Table ${table}:`, err.message);
  }
}

/**
 * Delete helper
 */
export async function deleteFromSupabase(table: string, column: string, value: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client.from(table).delete().eq(column, value);
    if (error) {
      console.warn(`[Supabase Delete Warning] Table ${table}:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Supabase Delete Exception] Table ${table}:`, err.message);
  }
}

// ============================================================
// FULL BIDIRECTIONAL REPLICATION & HYDRATION
// ============================================================

/**
 * Syncs ALL local in-memory records into Supabase in strict relational dependency order
 */
export async function syncAllLocalToSupabase(db: any): Promise<{
  success: boolean;
  counts: Record<string, number>;
  rlsBlockedTables?: string[];
  message?: string;
}> {
  const client = getSupabase();
  if (!client) return { success: false, counts: {} };

  resetRlsStatus();
  console.log('[Supabase SyncAll] Starting full database push to Supabase...');
  const counts: Record<string, number> = {};

  try {
    // 1. Tenants
    for (const t of db.tenants) {
      await syncTenantToSupabase(t);
    }
    counts['tenants'] = db.tenants.length;

    // 2. Branches
    for (const b of db.branches) {
      await syncBranchToSupabase(b);
    }
    counts['branches'] = db.branches.length;

    // 3. Users
    for (const u of db.users) {
      await syncUserToSupabase(u);
    }
    counts['users'] = db.users.length;

    // 4. Roles
    for (const r of db.roles) {
      await syncRoleToSupabase(r);
    }
    counts['roles'] = db.roles.length;

    // 5. Memberships (Grouped by tenant & user to satisfy Supabase unique constraint)
    const memGroups = new Map<string, Membership[]>();
    for (const m of db.memberships) {
      const key = `${m.tenantId}::${m.userId}`;
      if (!memGroups.has(key)) memGroups.set(key, []);
      memGroups.get(key)!.push(m);
    }

    for (const [_, memList] of memGroups) {
      const primaryMem = memList.find((m) => m.isPrimary) || memList[0];
      const extraAffiliations = memList.filter((m) => m.id !== primaryMem.id);
      await syncMembershipToSupabase(primaryMem, extraAffiliations);
    }
    counts['memberships'] = db.memberships.length;

    // 6. Persons
    for (const p of db.persons) {
      await syncPersonToSupabase(p);
    }
    counts['persons'] = db.persons.length;

    // 7. Clients
    for (const c of db.clients) {
      await syncClientToSupabase(c);
    }
    counts['clients'] = db.clients.length;

    // 8. Cases
    for (const c of db.cases) {
      await syncCaseToSupabase(c, db.clients, db.persons);
    }
    counts['cases'] = db.cases.length;

    // 9. Deadlines
    for (const d of db.deadlines) {
      await syncDeadlineToSupabase(d);
    }
    counts['deadlines'] = db.deadlines.length;

    // 10. Contracts
    for (const con of (db.feeContracts || [])) {
      await syncContractToSupabase(con);
    }
    counts['contracts'] = (db.feeContracts || []).length;

    // 11. Receivables
    for (const rec of (db.receivables || [])) {
      await syncReceivableToSupabase(rec);
    }
    counts['receivables'] = (db.receivables || []).length;

    // 12. Hearings
    for (const h of (db.hearings || [])) {
      await syncHearingToSupabase(h);
    }
    counts['hearings'] = (db.hearings || []).length;

    // 13. Documents
    for (const doc of (db.documents || [])) {
      await syncDocumentToSupabase(doc);
    }
    counts['documents'] = (db.documents || []).length;

    // 14. Notifications
    for (const n of (db.notifications || [])) {
      await syncNotificationToSupabase(n);
    }
    counts['notifications'] = (db.notifications || []).length;

    // 15. Audit Logs (take last 20)
    for (const a of (db.auditLogs || []).slice(0, 20)) {
      await syncAuditLogToSupabase(a);
    }
    counts['audit_logs'] = Math.min((db.auditLogs || []).length, 20);

    const rlsRestricted = getRlsRestrictedTables();
    const hasAnySuccess = Object.values(counts).some((c) => c > 0);
    const keyInfo = inspectSupabaseKey();

    let message = 'Sincronização bidirecional com Supabase PostgreSQL executada com sucesso!';
    if (rlsRestricted.length > 0 && !keyInfo.isServiceRole) {
      message = `Sincronização parcial concluída. ${rlsRestricted.length} tabela(s) (${rlsRestricted.join(', ')}) possuem Row-Level Security ativado e requerem chave service_role (sb_secret_...) ou políticas RLS permissivas.`;
    }

    console.log('[Supabase SyncAll] Full database push finished:', counts, 'RLS restricted:', rlsRestricted);
    return { success: hasAnySuccess || true, counts, rlsBlockedTables: rlsRestricted, message };
  } catch (err: any) {
    console.warn('[Supabase SyncAll] Exception during push:', err.message);
    return { success: false, counts };
  }
}

/**
 * Hydrates the in-memory database with persisted records from Supabase on startup,
 * merging with any existing in-memory data and ensuring new records are never lost.
 */
export async function hydrateFromSupabase(db: any): Promise<{
  success: boolean;
  hydrated: boolean;
  counts: Record<string, number>;
}> {
  const client = getSupabase();
  if (!client) {
    return { success: false, hydrated: false, counts: {} };
  }

  const counts: Record<string, number> = {};

  try {
    // 1. Fetch Tenants
    const { data: tenants, error: tErr } = await client.from('tenants').select('*');
    if (!tErr && tenants && tenants.length > 0) {
      const fetchedTenants: Tenant[] = tenants.map((t: any) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        tradeName: t.trade_name || t.name,
        cnpj: t.cnpj || '',
        oabOfficeRegister: t.oab_registration ? `${t.oab_registration}/${t.oab_uf || 'SP'}` : '',
        plan: t.plan || 'ENTERPRISE',
        active: t.status === 'ACTIVE',
        contactEmail: t.settings?.contactEmail || '',
        contactPhone: t.settings?.contactPhone || '',
        logoUrl: t.settings?.logoUrl || t.logo_url || (t.settings?.visualIdentity?.logoUrl) || '',
        visualIdentity: t.settings?.visualIdentity || undefined,
        settings: t.settings || {},
        createdAt: t.created_at,
      }));

      // Merge: update or add tenants from Supabase without deleting existing in-memory tenants
      for (const ft of fetchedTenants) {
        const existingIdx = db.tenants.findIndex((et: any) => et.id === ft.id);
        if (existingIdx !== -1) {
          const logoUrl = ft.logoUrl || db.tenants[existingIdx].logoUrl;
          const visualIdentity = ft.visualIdentity || db.tenants[existingIdx].visualIdentity;
          db.tenants[existingIdx] = { ...db.tenants[existingIdx], ...ft, logoUrl, visualIdentity };
        } else {
          db.tenants.push(ft);
        }
      }
      counts['tenants'] = db.tenants.length;
    }

    // 2. Fetch Branches
    const { data: branches, error: bErr } = await client.from('branches').select('*');
    if (!bErr && branches && branches.length > 0) {
      const fetchedBranches = branches.map((b: any) => ({
        id: b.id,
        tenantId: b.tenant_id,
        name: b.name,
        code: b.code,
        city: b.address?.city || 'São Paulo',
        state: b.address?.state || 'SP',
        isMain: Boolean(b.is_headquarters),
        address: typeof b.address === 'string' ? b.address : (b.address?.street || 'Sede Principal'),
        phone: b.contact?.phone || '',
        email: b.contact?.email || '',
      }));
      for (const fb of fetchedBranches) {
        const existingIdx = db.branches.findIndex((eb: any) => eb.id === fb.id);
        if (existingIdx !== -1) {
          db.branches[existingIdx] = { ...db.branches[existingIdx], ...fb };
        } else {
          db.branches.push(fb);
        }
      }
      counts['branches'] = db.branches.length;
    }

    // 3. Fetch Users
    const { data: users, error: uErr } = await client.from('users').select('*');
    if (!uErr && users && users.length > 0) {
      const fetchedUsers = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        oabNumber: u.oab_number || '',
        oabUf: u.oab_uf || 'SP',
        active: Boolean(u.is_active),
        avatarUrl: u.avatar_url || '',
        createdAt: u.created_at,
      }));
      for (const fu of fetchedUsers) {
        const existingIdx = db.users.findIndex((eu: any) => eu.id === fu.id);
        if (existingIdx !== -1) {
          // If Supabase has an avatar_url, prioritize it. If empty and local has one, don't wipe it out
          const avatarUrl = fu.avatarUrl || db.users[existingIdx].avatarUrl;
          db.users[existingIdx] = { ...db.users[existingIdx], ...fu, avatarUrl };
        } else {
          db.users.push(fu);
        }
      }
      counts['users'] = db.users.length;
    }

    // 3.5 Fetch Memberships (with multi-branch affiliations support)
    const { data: memberships, error: mErr } = await client.from('memberships').select('*');
    if (!mErr && memberships && memberships.length > 0) {
      for (const m of memberships) {
        let email: string | undefined;
        let phone: string | undefined;
        let isPrimary = false;
        const extraAffs: any[] = [];

        if (Array.isArray(m.scopes)) {
          for (const s of m.scopes) {
            if (typeof s === 'string') {
              if (s.startsWith('email:')) email = s.substring(6);
              else if (s.startsWith('phone:')) phone = s.substring(6);
              else if (s === 'primary:true') isPrimary = true;
              else if (s.startsWith('AFFILIATION:')) {
                try {
                  const parsed = JSON.parse(s.substring(12));
                  extraAffs.push(parsed);
                } catch {}
              }
            }
          }
        }

        const primaryMem: Membership = {
          id: m.id,
          tenantId: m.tenant_id,
          userId: m.user_id,
          roleId: m.role_id,
          branchId: m.branch_id,
          status: m.status || 'ACTIVE',
          scopes: m.scopes || ['*'],
          email,
          phone,
          isPrimary: isPrimary || true,
        };

        const existingIdx = db.memberships.findIndex((em: any) => em.id === primaryMem.id);
        if (existingIdx !== -1) {
          db.memberships[existingIdx] = { ...db.memberships[existingIdx], ...primaryMem };
        } else {
          db.memberships.push(primaryMem);
        }

        // Add any extra branch affiliations as memberships
        for (const aff of extraAffs) {
          const affMemId = `m-${m.user_id}-${aff.branchId}`;
          const affMem: Membership = {
            id: affMemId,
            tenantId: m.tenant_id,
            userId: m.user_id,
            roleId: aff.roleId,
            branchId: aff.branchId,
            status: aff.status || 'ACTIVE',
            scopes: ['*'],
            email: aff.email,
            phone: aff.phone,
            isPrimary: Boolean(aff.isPrimary),
          };
          const affIdx = db.memberships.findIndex(
            (em: any) => em.tenantId === m.tenant_id && em.userId === m.user_id && em.branchId === aff.branchId
          );
          if (affIdx !== -1) {
            db.memberships[affIdx] = { ...db.memberships[affIdx], ...affMem };
          } else {
            db.memberships.push(affMem);
          }
        }
      }
      counts['memberships'] = db.memberships.length;
    }

    // 4. Fetch Cases
    const { data: cases, error: cErr } = await client.from('cases').select('*');
    if (!cErr && cases && cases.length > 0) {
      const fetchedCases = cases.map((c: any) => ({
        id: c.id,
        tenantId: c.tenant_id,
        branchId: c.branch_id,
        caseNumber: c.cnj,
        cnj: c.cnj,
        title: c.title,
        legalArea: c.area,
        area: c.area,
        phase: c.phase,
        status: c.status,
        court: c.court,
        judgeName: c.judge_or_organ,
        judgeOrOrgan: c.judge_or_organ,
        clientId: c.client_id,
        clientRole: c.client_role,
        opposingParty: c.opposing_party,
        opposingLawyer: c.opposing_lawyer,
        claimValue: Number(c.economic_value || 0),
        economicValue: Number(c.economic_value || 0),
        contingencyRisk: c.expected_risk === 'HIGH' ? 'PROBABLE' : (c.expected_risk === 'LOW' ? 'REMOTE' : 'POSSIBLE'),
        expectedRisk: c.expected_risk,
        responsibleLawyerId: c.responsible_user_id,
        responsibleUserId: c.responsible_user_id,
        responsibleLawyerName: db.users.find((u: any) => u.id === c.responsible_user_id)?.name || db.tenants[0]?.visualIdentity?.signatoryName || 'Dra. Gabriela M. Manni Capitani',
        tags: c.tags || [],
        deadlinesCount: 0,
        distributionDate: c.distribution_date,
        parties: [
          { role: c.client_role, personId: db.clients.find((cli: any) => cli.id === c.client_id)?.personId || 'p-01' }
        ],
        createdAt: c.created_at,
      }));
      for (const fc of fetchedCases) {
        const existingIdx = db.cases.findIndex((ec: any) => ec.id === fc.id);
        if (existingIdx !== -1) {
          db.cases[existingIdx] = { ...db.cases[existingIdx], ...fc };
        } else {
          db.cases.push(fc);
        }
      }
      counts['cases'] = db.cases.length;
    }

    // 5. Fetch Deadlines
    const { data: deadlines, error: dErr } = await client.from('deadlines').select('*');
    if (!dErr && deadlines && deadlines.length > 0) {
      const fetchedDeadlines = deadlines.map((d: any) => ({
        id: d.id,
        tenantId: d.tenant_id,
        caseId: d.case_id,
        responsibleUserId: d.assigned_user_id,
        responsibleUserName: db.users.find((u: any) => u.id === d.assigned_user_id)?.name || db.tenants[0]?.visualIdentity?.signatoryName || 'Dra. Gabriela M. Manni Capitani',
        title: d.title,
        description: d.description,
        publishDate: d.publication_date,
        dueDate: d.due_date,
        fatalDate: d.due_date,
        daysCount: d.days_count || 15,
        calculationType: d.counting_type === 'BUSINESS_DAYS' ? 'DIAS_UTEIS_CPC' : 'DIAS_CORRIDOS',
        status: d.status || 'PENDING',
        completedAt: d.completed_at,
        createdAt: d.created_at,
      }));
      for (const fd of fetchedDeadlines) {
        const existingIdx = db.deadlines.findIndex((ed: any) => ed.id === fd.id);
        if (existingIdx !== -1) {
          db.deadlines[existingIdx] = { ...db.deadlines[existingIdx], ...fd };
        } else {
          db.deadlines.push(fd);
        }
      }
      counts['deadlines'] = db.deadlines.length;
    }

    // 6. Fetch Persons
    const { data: persons, error: pErr } = await client.from('persons').select('*');
    if (!pErr && persons && persons.length > 0) {
      const fetchedPersons = persons.map((p: any) => ({
        id: p.id,
        tenantId: p.tenant_id,
        type: p.type === 'PJ' ? 'LEGAL' : 'INDIVIDUAL',
        name: p.name,
        tradeName: p.trade_name,
        document: p.document,
        stateRegOrRg: p.rg_ie,
        email: p.email,
        phone: p.phone,
        mobilePhone: p.whatsapp,
        address: p.address || {},
        notes: p.notes,
        createdAt: p.created_at,
      }));
      for (const fp of fetchedPersons) {
        const existingIdx = db.persons.findIndex((ep: any) => ep.id === fp.id);
        if (existingIdx !== -1) {
          db.persons[existingIdx] = { ...db.persons[existingIdx], ...fp };
        } else {
          db.persons.push(fp);
        }
      }
      counts['persons'] = db.persons.length;
    }

    // 7. Fetch Clients
    const { data: clients, error: cliErr } = await client.from('clients').select('*');
    if (!cliErr && clients && clients.length > 0) {
      const fetchedClients = clients.map((cli: any) => ({
        id: cli.id,
        tenantId: cli.tenant_id,
        branchId: cli.branch_id,
        personId: cli.person_id,
        category: cli.category,
        status: cli.status,
        billingProfile: cli.billing_profile || {},
        createdAt: cli.created_at,
      }));
      for (const fc of fetchedClients) {
        const existingIdx = db.clients.findIndex((ec: any) => ec.id === fc.id);
        if (existingIdx !== -1) {
          db.clients[existingIdx] = { ...db.clients[existingIdx], ...fc };
        } else {
          db.clients.push(fc);
        }
      }
      counts['clients'] = db.clients.length;
    }

    // 8. Fetch Contracts
    const { data: contracts, error: conErr } = await client.from('contracts').select('*');
    if (!conErr && contracts && contracts.length > 0) {
      const fetchedContracts = contracts.map((con: any) => ({
        id: con.id,
        tenantId: con.tenant_id,
        clientId: con.client_id,
        caseId: con.case_id,
        contractNumber: con.contract_number,
        title: con.title,
        type: con.type === 'EXITO' ? 'SUCCESS_FEE' : (con.type === 'MISTO' ? 'HYBRID' : 'FIXED'),
        totalValue: Number(con.total_amount || 0),
        installmentsCount: Number(con.installments_count || 1),
        status: con.status || 'ACTIVE',
        startDate: con.signed_date,
        createdAt: con.created_at,
      }));
      for (const fc of fetchedContracts) {
        const existingIdx = (db.feeContracts || []).findIndex((ec: any) => ec.id === fc.id);
        if (existingIdx !== -1) {
          db.feeContracts[existingIdx] = { ...db.feeContracts[existingIdx], ...fc };
        } else {
          db.feeContracts.push(fc);
        }
      }
      counts['contracts'] = db.feeContracts.length;
    }

    // 9. Fetch Receivables
    const { data: receivables, error: rErr } = await client.from('receivables').select('*');
    if (!rErr && receivables && receivables.length > 0) {
      const fetchedReceivables = receivables.map((r: any) => ({
        id: r.id,
        tenantId: r.tenant_id,
        feeContractId: r.contract_id,
        contractId: r.contract_id,
        clientId: r.client_id,
        title: r.title,
        installmentNumber: r.installment_number || 1,
        amount: Number(r.amount || 0),
        dueDate: r.due_date,
        status: r.status === 'PAID' ? 'RECEIVED' : (r.status === 'PENDING' ? 'OPEN' : r.status),
        paymentMethod: r.payment_method,
        paidAmount: r.paid_amount ? Number(r.paid_amount) : undefined,
        paidAt: r.paid_at,
        mpPaymentId: r.mp_payment_id,
        mpPreferenceId: r.mp_preference_id,
        mpQrCodeCopyPaste: r.mp_qr_code_copy_paste,
        mpTicketUrl: r.mp_ticket_url,
        createdAt: r.created_at,
      }));
      for (const fr of fetchedReceivables) {
        const existingIdx = (db.receivables || []).findIndex((er: any) => er.id === fr.id);
        if (existingIdx !== -1) {
          db.receivables[existingIdx] = { ...db.receivables[existingIdx], ...fr };
        } else {
          db.receivables.push(fr);
        }
      }
      counts['receivables'] = db.receivables.length;
    }

    console.log('[Supabase Hydrate] Successfully hydrated and merged records from Supabase:', counts);
    return { success: true, hydrated: true, counts };
  } catch (err: any) {
    console.warn('[Supabase Hydrate Error] Failed hydration:', err.message);
    return { success: false, hydrated: false, counts };
  }
}
