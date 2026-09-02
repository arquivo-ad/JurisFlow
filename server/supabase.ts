import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

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
    console.error('[Supabase] Init error:', error);
    return null;
  }
}

export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  url: string | null;
  tables: Record<string, number>;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL || null,
      tables: {},
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

    return {
      connected: true,
      url: process.env.SUPABASE_URL || null,
      tables: tableCounts,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL || null,
      tables: tableCounts,
      error: err.message || 'Erro ao conectar ao banco de dados PostgreSQL do Supabase',
    };
  }
}

/**
 * Hydrates the in-memory database with persisted records from Supabase on startup,
 * or seeds initial data to Supabase if tables are newly created and empty.
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
      db.tenants = tenants.map((t: any) => ({
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
        settings: t.settings || {},
        createdAt: t.created_at,
      }));
      counts['tenants'] = tenants.length;
    } else if (!tErr && tenants && tenants.length === 0) {
      // Seed initial tenants
      for (const t of db.tenants) {
        await client.from('tenants').upsert({
          id: t.id,
          slug: t.slug,
          name: t.name,
          trade_name: t.tradeName,
          cnpj: t.cnpj,
          oab_registration: t.oabOfficeRegister?.split('/')[0] || '',
          oab_uf: t.oabOfficeRegister?.split('/')[1] || 'SP',
          plan: t.plan,
          status: t.active ? 'ACTIVE' : 'SUSPENDED',
          settings: t.settings,
        });
      }
    }

    // 2. Fetch Cases
    const { data: cases, error: cErr } = await client.from('cases').select('*');
    if (!cErr && cases && cases.length > 0) {
      db.cases = cases.map((c: any) => ({
        id: c.id,
        tenantId: c.tenant_id,
        branchId: c.branch_id,
        cnj: c.cnj,
        title: c.title,
        area: c.area,
        phase: c.phase,
        status: c.status,
        court: c.court,
        judgeOrOrgan: c.judge_or_organ,
        clientId: c.client_id,
        clientRole: c.client_role,
        opposingParty: c.opposing_party,
        opposingLawyer: c.opposing_lawyer,
        economicValue: Number(c.economic_value || 0),
        expectedRisk: c.expected_risk,
        responsibleUserId: c.responsible_user_id,
        tags: c.tags || [],
        distributionDate: c.distribution_date,
        createdAt: c.created_at,
      }));
      counts['cases'] = cases.length;
    }

    // 3. Fetch Deadlines
    const { data: deadlines, error: dErr } = await client.from('deadlines').select('*');
    if (!dErr && deadlines && deadlines.length > 0) {
      db.deadlines = deadlines.map((d: any) => ({
        id: d.id,
        tenantId: d.tenant_id,
        caseId: d.case_id,
        assignedUserId: d.assigned_user_id,
        reviewerUserId: d.reviewer_user_id,
        title: d.title,
        description: d.description,
        publicationDate: d.publication_date,
        dueDate: d.due_date,
        dueTime: d.due_time || '23:59',
        daysCount: d.days_count || 15,
        countingType: d.counting_type || 'BUSINESS_DAYS',
        priority: d.priority || 'HIGH',
        status: d.status || 'PENDING',
        completedAt: d.completed_at,
        createdAt: d.created_at,
      }));
      counts['deadlines'] = deadlines.length;
    }

    // 4. Fetch Persons
    const { data: persons, error: pErr } = await client.from('persons').select('*');
    if (!pErr && persons && persons.length > 0) {
      db.persons = persons.map((p: any) => ({
        id: p.id,
        tenantId: p.tenant_id,
        type: p.type,
        name: p.name,
        tradeName: p.trade_name,
        document: p.document,
        rgIe: p.rg_ie,
        email: p.email,
        phone: p.phone,
        whatsapp: p.whatsapp,
        address: p.address || {},
        lgpdConsent: p.lgpd_consent || { hasConsent: true, capturedAt: p.created_at },
        notes: p.notes,
        createdAt: p.created_at,
      }));
      counts['persons'] = persons.length;
    }

    // 5. Fetch Clients
    const { data: clients, error: cliErr } = await client.from('clients').select('*');
    if (!cliErr && clients && clients.length > 0) {
      db.clients = clients.map((cli: any) => ({
        id: cli.id,
        tenantId: cli.tenant_id,
        branchId: cli.branch_id,
        personId: cli.person_id,
        category: cli.category,
        status: cli.status,
        billingProfile: cli.billing_profile || {},
        createdAt: cli.created_at,
      }));
      counts['clients'] = clients.length;
    }

    // 6. Fetch Receivables
    const { data: receivables, error: rErr } = await client.from('receivables').select('*');
    if (!rErr && receivables && receivables.length > 0) {
      db.receivables = receivables.map((r: any) => ({
        id: r.id,
        tenantId: r.tenant_id,
        contractId: r.contract_id,
        clientId: r.client_id,
        title: r.title,
        installmentNumber: r.installment_number || 1,
        amount: Number(r.amount || 0),
        dueDate: r.due_date,
        status: r.status,
        paymentMethod: r.payment_method,
        paidAmount: r.paid_amount ? Number(r.paid_amount) : undefined,
        paidAt: r.paid_at,
        mpPaymentId: r.mp_payment_id,
        mpPreferenceId: r.mp_preference_id,
        mpQrCodeBase64: r.mp_qr_code_base64,
        mpQrCodeCopyPaste: r.mp_qr_code_copy_paste,
        mpTicketUrl: r.mp_ticket_url,
        createdAt: r.created_at,
      }));
      counts['receivables'] = receivables.length;
    }

    console.log('[Supabase] Hydration completed successfully:', counts);
    return { success: true, hydrated: true, counts };
  } catch (err: any) {
    console.warn('[Supabase] Hydration error (running with memory fallback):', err.message);
    return { success: false, hydrated: false, counts };
  }
}

/**
 * Async helper to upsert or sync any change to Supabase PostgreSQL table
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
 * Async helper to delete records from Supabase
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
