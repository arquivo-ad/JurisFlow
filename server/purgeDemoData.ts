import dotenv from 'dotenv';
dotenv.config({ override: true });
import { getSupabase, syncTenantToSupabase, syncBranchToSupabase, syncUserToSupabase, syncMembershipToSupabase } from './supabase.ts';
import { Tenant, Branch, User, Membership } from '../src/types';

export const PROD_TENANT: Tenant = {
  id: 't-1789481820042',
  slug: 'gabriela',
  name: 'Gabriela Capitani Advocacia',
  tradeName: 'Gabriela Capitani Advocacia',
  cnpj: '11.111.111/0001-11',
  oabOfficeRegister: 'OAB/SP 478.370/SP',
  plan: 'ENTERPRISE',
  active: true,
  status: 'ACTIVE',
  contactEmail: 'gabriela.capitani@adv.oab.sp.org.br',
  contactPhone: '(12) 99148-6012',
  logoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&auto=format&fit=crop&q=80',
  visualIdentity: {
    logoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&auto=format&fit=crop&q=80',
    logoPosition: 'left',
    signatureImageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
    signatoryName: 'Dra. Gabriela M. Manni Capitani',
    signatoryOab: 'OAB/SP 478.370',
    signatoryRole: 'Advogada Sócia e Titular',
    headerAddress: 'R. Cap. Alfredo de Paula Salgado, 110, Pindamonhangaba/SP • Tel: (12) 99148-6012',
    footerText: 'Gabriela Capitani Advocacia • OAB/SP 478.370 • Sigilo, Excelência e Prática Forense Humanizada',
    headerStyle: 'CLASSIC',
    fontFamily: 'Times New Roman',
    bodyFontSize: '12pt',
    lineSpacing: '1.5',
    paragraphIndent: true,
    citationIndent: true,
    closingFormula: 'Termos em que, Pede e Espera Deferimento.',
    jurisprudenceStyle: 'DESTAQUE_ENXUTO',
    editorialTone: 'TECNICO_DIRETO',
    templates: [
      {
        id: 'tmpl-inicial',
        name: 'Petição Inicial Cível ABNT',
        category: 'PETICAO',
        content: 'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE PINDAMONHANGABA/SP\n\n[QUALIFICAÇÃO COMPLETA DA PARTE AUTORA], por sua advogada infra-assinada, vem respeitosamente à presença de Vossa Excelência propor a presente...\n\nDOS FATOS...\nDO DIREITO...\nDOS PEDIDOS...',
        isDefault: true,
      },
      {
        id: 'tmpl-procuracao',
        name: 'Procuração Ad Judicia et Extra',
        category: 'PROCURACAO',
        content: 'PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: [NOME DO CLIENTE], [ESTADO CIVIL], [PROFISSÃO], inscrito no CPF sob nº [CPF], residente e domiciliado em [ENDEREÇO COMPLETO].\n\nOUTORGADA: DRA. GABRIELA M. MANNI CAPITANI, brasileira, advogada inscrita nos quadros da OAB/SP sob o nº 478.370...',
        isDefault: true,
      },
      {
        id: 'tmpl-honorarios',
        name: 'Contrato de Honorários e Prestação de Serviços Jurídicos',
        category: 'CONTRATO',
        content: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS JURÍDICOS E HONORÁRIOS ADVOCATÍCIOS\n\nCONTRATANTE: [NOME DO CLIENTE], [CPF/CNPJ]\nCONTRATADA: GABRIELA CAPITANI ADVOCACIA, representada por Dra. Gabriela M. Manni Capitani, OAB/SP 478.370...\n\nCLÁUSULA PRIMEIRA - DO OBJETO...',
        isDefault: true,
      }
    ],
  },
  settings: {
    pixKey: 'gabriela.mannicapitani@gmail.com',
    pixKeyType: 'EMAIL',
    pixRecipientName: 'Gabriela Capitani Advocacia',
    pixBankName: 'Banco Itaú Empresas PJ',
    paymentChannels: {
      pix: true,
      boleto: false,
      creditCard: false,
    },
    bankingIntegration: {
      provider: 'OUTRO',
      status: 'NOT_CONFIGURED',
      superAdminNotified: false,
    },
    currency: 'BRL',
    cpcCountDaysDefault: true,
    mercadopagoConfigured: true,
    notifyDeadlinesDaysBefore: [1, 3, 5],
  },
  createdAt: '2026-09-15T14:17:00.042Z',
};

export const PROD_BRANCH: Branch = {
  id: 'b-1789481820042-matriz',
  tenantId: 't-1789481820042',
  code: 'MAT-01',
  name: 'Matriz Principal',
  isMain: true,
  city: 'Pindamonhangaba',
  state: 'SP',
  address: 'R. Cap. Alfredo de Paula Salgado, 110, Pindamonhangaba-SP',
  phone: '(12) 99148-6012',
  email: 'gabriela.capitani@adv.oab.sp.org.br',
};

export const PROD_LAWYER: User = {
  id: 'u-1789481820042-admin',
  name: 'Dra. Gabriela M. Manni Capitani',
  email: 'gabriela.mannicapitani@gmail.com',
  phone: '(12) 99148-6012',
  oabNumber: '478.370',
  oabUf: 'SP',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&auto=format&fit=crop&q=80',
  active: true,
  createdAt: '2026-09-15T14:17:00.042Z',
  roleId: 'role-socio-admin',
  roleName: 'Sócio Administrador',
  roleCode: 'SOCIO_ADMIN',
  branchId: 'b-1789481820042-matriz',
  branchName: 'Matriz Principal',
  status: 'ACTIVE',
  branchAffiliations: [
    {
      id: 'm-aff-gabriela-matriz',
      branchId: 'b-1789481820042-matriz',
      branchName: 'Matriz Principal (Pindamonhangaba/SP)',
      roleId: 'role-socio-admin',
      roleName: 'Sócio Administrador',
      roleCode: 'SOCIO_ADMIN',
      email: 'gabriela.mannicapitani@gmail.com',
      phone: '(12) 99148-6012',
      status: 'ACTIVE',
      isPrimary: true,
    },
  ],
  memberships: [
    {
      id: 'm-gabriela-matriz',
      branchId: 'b-1789481820042-matriz',
      branchName: 'Matriz Principal (Pindamonhangaba/SP)',
      roleId: 'role-socio-admin',
      roleName: 'Sócio Administrador',
      roleCode: 'SOCIO_ADMIN',
      email: 'gabriela.mannicapitani@gmail.com',
      phone: '(12) 99148-6012',
      status: 'ACTIVE',
      isPrimary: true,
    },
  ],
};

export const PROD_SUPERADMIN: User = {
  id: 'u-superadmin',
  name: 'Super Admin (JurisFlow SaaS)',
  email: 'superadmin@jurisflow.adv.br',
  phone: '(11) 99999-0000',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=256&auto=format&fit=crop&q=80',
  active: true,
  createdAt: '2025-01-01T00:00:00Z',
  roleId: 'role-super-admin',
  roleName: 'Super Admin da Plataforma SaaS',
  roleCode: 'SUPER_ADMIN',
  branchId: 'b-1789481820042-matriz',
  branchName: 'Matriz Principal',
  status: 'ACTIVE',
  branchAffiliations: [
    {
      id: 'm-superadmin-gabriela',
      branchId: 'b-1789481820042-matriz',
      branchName: 'Matriz Principal',
      roleId: 'role-super-admin',
      roleName: 'Super Admin da Plataforma SaaS',
      roleCode: 'SUPER_ADMIN',
      email: 'superadmin@jurisflow.adv.br',
      phone: '(11) 99999-0000',
      status: 'ACTIVE',
      isPrimary: true,
    },
  ],
  memberships: [
    {
      id: 'm-superadmin-gabriela',
      branchId: 'b-1789481820042-matriz',
      branchName: 'Matriz Principal',
      roleId: 'role-super-admin',
      roleName: 'Super Admin da Plataforma SaaS',
      roleCode: 'SUPER_ADMIN',
      email: 'superadmin@jurisflow.adv.br',
      phone: '(11) 99999-0000',
      status: 'ACTIVE',
      isPrimary: true,
    },
  ],
};

export const PROD_MEMBERSHIPS: Membership[] = [
  {
    id: 'm-gabriela-main',
    tenantId: 't-1789481820042',
    userId: 'u-1789481820042-admin',
    roleId: 'role-socio-admin',
    branchId: 'b-1789481820042-matriz',
    status: 'ACTIVE',
    scopes: ['*'],
  },
  {
    id: 'm-superadmin-main',
    tenantId: 't-1789481820042',
    userId: 'u-superadmin',
    roleId: 'role-super-admin',
    branchId: 'b-1789481820042-matriz',
    status: 'ACTIVE',
    scopes: ['*'],
  },
];

export async function executePurgeDemoData(db?: any) {
  const sb = getSupabase();
  const summary: Record<string, any> = {};

  if (sb) {
    console.log('[Purge] Starting purge of fictional/demo data from Supabase...');

    // 1. Audit logs
    const { error: eAud, count: cAud } = await sb.from('audit_logs').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.audit_logs = eAud ? `Error: ${eAud.message}` : `Purged ${cAud ?? 'all'}`;

    // 2. Deadlines
    const { error: eDead, count: cDead } = await sb.from('deadlines').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.deadlines = eDead ? `Error: ${eDead.message}` : `Purged ${cDead ?? 'all'}`;

    // 3. Hearings
    const { error: eHear, count: cHear } = await sb.from('hearings').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.hearings = eHear ? `Error: ${eHear.message}` : `Purged ${cHear ?? 'all'}`;

    // 4. Documents
    const { error: eDoc, count: cDoc } = await sb.from('documents').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.documents = eDoc ? `Error: ${eDoc.message}` : `Purged ${cDoc ?? 'all'}`;

    // 5. Receivables
    const { error: eRec, count: cRec } = await sb.from('receivables').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.receivables = eRec ? `Error: ${eRec.message}` : `Purged ${cRec ?? 'all'}`;

    // 6. Fee Contracts
    const { error: eCon, count: cCon } = await sb.from('contracts').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.contracts = eCon ? `Error: ${eCon.message}` : `Purged ${cCon ?? 'all'}`;

    // 7. Cases
    const { error: eCas, count: cCas } = await sb.from('cases').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.cases = eCas ? `Error: ${eCas.message}` : `Purged ${cCas ?? 'all'}`;

    // 8. Clients
    const { error: eCli, count: cCli } = await sb.from('clients').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.clients = eCli ? `Error: ${eCli.message}` : `Purged ${cCli ?? 'all'}`;

    // 9. Persons
    const { error: ePer, count: cPer } = await sb.from('persons').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.persons = ePer ? `Error: ${ePer.message}` : `Purged ${cPer ?? 'all'}`;

    // 10. Notifications
    const { error: eNot, count: cNot } = await sb.from('notifications').delete({ count: 'exact' }).neq('id', 'keep-none');
    summary.notifications = eNot ? `Error: ${eNot.message}` : `Purged ${cNot ?? 'all'}`;

    // 11. Delete demo memberships (keep memberships of t-1789481820042)
    const { error: eMem, count: cMem } = await sb.from('memberships').delete({ count: 'exact' }).neq('tenant_id', 't-1789481820042');
    summary.demo_memberships = eMem ? `Error: ${eMem.message}` : `Purged ${cMem ?? 'all'}`;

    // 12. Delete demo branches (keep b-1789481820042-matriz)
    const { error: eBra, count: cBra } = await sb.from('branches').delete({ count: 'exact' }).neq('tenant_id', 't-1789481820042');
    summary.demo_branches = eBra ? `Error: ${eBra.message}` : `Purged ${cBra ?? 'all'}`;

    // 13. Delete demo users (keep u-1789481820042-admin and u-superadmin)
    const { error: eUsr, count: cUsr } = await sb
      .from('users')
      .delete({ count: 'exact' })
      .neq('id', 'u-1789481820042-admin')
      .neq('id', 'u-superadmin');
    summary.demo_users = eUsr ? `Error: ${eUsr.message}` : `Purged ${cUsr ?? 'all'}`;

    // 14. Delete demo tenants (keep t-1789481820042)
    const { error: eTen, count: cTen } = await sb.from('tenants').delete({ count: 'exact' }).neq('id', 't-1789481820042');
    summary.demo_tenants = eTen ? `Error: ${eTen.message}` : `Purged ${cTen ?? 'all'}`;

    // Ensure production tenant, branch, users, and memberships are properly persisted in Supabase
    await syncTenantToSupabase(PROD_TENANT);
    await syncBranchToSupabase(PROD_BRANCH);
    await syncUserToSupabase(PROD_LAWYER);
    await syncUserToSupabase(PROD_SUPERADMIN);
    for (const mem of PROD_MEMBERSHIPS) {
      await syncMembershipToSupabase(mem);
    }

    console.log('[Purge] Supabase cleanup finished:', summary);
  }

  // If in-memory db instance is passed, clean in-memory state too
  if (db) {
    db.cases = [];
    db.deadlines = [];
    db.feeContracts = [];
    db.receivables = [];
    db.installments = [];
    db.payments = [];
    db.hearings = [];
    db.diligences = [];
    db.tasks = [];
    db.documents = [];
    db.movements = [];
    db.clients = [];
    db.persons = [];
    db.leads = [];
    db.notifications = [];
    db.auditLogs = [];

    // Ensure only real tenant, branch, users, and memberships exist in memory
    db.tenants = [PROD_TENANT];
    db.branches = [PROD_BRANCH];
    db.users = [PROD_LAWYER, PROD_SUPERADMIN];
    db.memberships = [...PROD_MEMBERSHIPS];

    summary.inMemory = {
      tenantsRemaining: db.tenants.length,
      branchesRemaining: db.branches.length,
      usersRemaining: db.users.length,
      casesRemaining: db.cases.length,
      deadlinesRemaining: db.deadlines.length,
      receivablesRemaining: db.receivables.length,
      clientsRemaining: db.clients.length,
    };
  }

  return summary;
}
