import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Lock,
  Key,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Edit2,
  Trash2,
  Copy,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserPlus,
  Check,
  Search,
  Sparkles,
  Sliders,
  Award,
  Crown,
  ExternalLink,
  ArrowRight,
  Database,
  RefreshCw,
  Server,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  Tenant,
  Branch,
  User,
  Role,
  AuditLog,
  LGPDConsent,
  Person,
  Permission,
} from '../../types';

interface SettingsViewProps {
  currentTenant: Tenant | null;
  tenants?: Tenant[];
  branches: Branch[];
  users: User[];
  roles: Role[];
  auditLogs: AuditLog[];
  lgpdConsents: LGPDConsent[];
  persons: Person[];
  currentUser?: User | null;
  currentRole?: Role | null;
  onSaveTenant?: (data: Partial<Tenant>) => Promise<void>;
  onSaveBranch?: (data: Partial<Branch>) => Promise<void>;
  onDeleteBranch?: (id: string) => Promise<void>;
  onSaveRole?: (data: Partial<Role>) => Promise<void>;
  onDeleteRole?: (id: string) => Promise<void>;
  onSaveUser?: (data: Partial<User> & { roleId?: string; branchId?: string; status?: string }) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onSaveLgpdConsent: (data: Partial<LGPDConsent>) => Promise<void>;
  onSwitchTenant?: (tenantId: string) => void;
  onOpenNewTenantModal?: () => void;
}

// Available standard granular permissions
const AVAILABLE_PERMISSIONS: {
  code: string;
  resource: 'CASES' | 'CLIENTS' | 'FINANCIAL' | 'DOCUMENTS' | 'SETTINGS' | 'AI_GATEWAY' | 'AUDIT' | 'DEADLINES';
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'APPROVE' | 'EXPORT';
  label: string;
  effect: 'ALLOW';
  category: string;
}[] = [
  // Processos
  { code: 'CASES_READ', resource: 'CASES', action: 'READ', label: 'Consultar Processos e Andamentos', effect: 'ALLOW', category: 'Processos & Casos' },
  { code: 'CASES_CREATE', resource: 'CASES', action: 'CREATE', label: 'Cadastrar / Distribuir Novos Processos', effect: 'ALLOW', category: 'Processos & Casos' },
  { code: 'CASES_UPDATE', resource: 'CASES', action: 'UPDATE', label: 'Editar Dados, Partes e Movimentações', effect: 'ALLOW', category: 'Processos & Casos' },
  { code: 'CASES_DELETE', resource: 'CASES', action: 'DELETE', label: 'Excluir / Arquivar Processos', effect: 'ALLOW', category: 'Processos & Casos' },
  { code: 'CASES_EXPORT', resource: 'CASES', action: 'EXPORT', label: 'Exportar Relatórios Processuais', effect: 'ALLOW', category: 'Processos & Casos' },

  // Clientes & CRM
  { code: 'CLIENTS_READ', resource: 'CLIENTS', action: 'READ', label: 'Consultar Clientes e Pessoas', effect: 'ALLOW', category: 'Clientes & CRM' },
  { code: 'CLIENTS_CREATE', resource: 'CLIENTS', action: 'CREATE', label: 'Cadastrar Novos Clientes e Leads', effect: 'ALLOW', category: 'Clientes & CRM' },
  { code: 'CLIENTS_UPDATE', resource: 'CLIENTS', action: 'UPDATE', label: 'Atualizar Dados Cadastrais', effect: 'ALLOW', category: 'Clientes & CRM' },
  { code: 'CLIENTS_DELETE', resource: 'CLIENTS', action: 'DELETE', label: 'Inativar / Excluir Clientes', effect: 'ALLOW', category: 'Clientes & CRM' },

  // Prazos & Agenda
  { code: 'DEADLINES_READ', resource: 'DEADLINES', action: 'READ', label: 'Visualizar Agenda e Prazos CPC', effect: 'ALLOW', category: 'Prazos & Audiências' },
  { code: 'DEADLINES_CREATE', resource: 'DEADLINES', action: 'CREATE', label: 'Lançar Novos Prazos e Audiências', effect: 'ALLOW', category: 'Prazos & Audiências' },
  { code: 'DEADLINES_UPDATE', resource: 'DEADLINES', action: 'UPDATE', label: 'Dar Baixa / Concluir Prazos', effect: 'ALLOW', category: 'Prazos & Audiências' },
  { code: 'DEADLINES_DELETE', resource: 'DEADLINES', action: 'DELETE', label: 'Excluir / Cancelar Prazos', effect: 'ALLOW', category: 'Prazos & Audiências' },

  // Financeiro
  { code: 'FINANCIAL_READ', resource: 'FINANCIAL', action: 'READ', label: 'Visualizar Faturamento e Extratos', effect: 'ALLOW', category: 'Financeiro & Honorários' },
  { code: 'FINANCIAL_CREATE', resource: 'FINANCIAL', action: 'CREATE', label: 'Emitir Cobranças Mercado Pago (PIX/Boleto)', effect: 'ALLOW', category: 'Financeiro & Honorários' },
  { code: 'FINANCIAL_APPROVE', resource: 'FINANCIAL', action: 'APPROVE', label: 'Aprovar Contratos e Conciliação Bancária', effect: 'ALLOW', category: 'Financeiro & Honorários' },
  { code: 'FINANCIAL_EXPORT', resource: 'FINANCIAL', action: 'EXPORT', label: 'Exportar DRE e Balancetes Financeiros', effect: 'ALLOW', category: 'Financeiro & Honorários' },

  // Documentos
  { code: 'DOCUMENTS_READ', resource: 'DOCUMENTS', action: 'READ', label: 'Consultar Peças e Modelos', effect: 'ALLOW', category: 'Documentos & Modelos' },
  { code: 'DOCUMENTS_CREATE', resource: 'DOCUMENTS', action: 'CREATE', label: 'Gerar Documentos a partir de Modelos', effect: 'ALLOW', category: 'Documentos & Modelos' },
  { code: 'DOCUMENTS_UPDATE', resource: 'DOCUMENTS', action: 'UPDATE', label: 'Editar e Protocolar Minutas', effect: 'ALLOW', category: 'Documentos & Modelos' },
  { code: 'DOCUMENTS_DELETE', resource: 'DOCUMENTS', action: 'DELETE', label: 'Excluir Minutas e Modelos', effect: 'ALLOW', category: 'Documentos & Modelos' },

  // IA Gateway
  { code: 'AI_EXECUTE', resource: 'AI_GATEWAY', action: 'EXECUTE', label: 'Executar IA Gemini 3.7 (Minutas, Prazos e Sumários)', effect: 'ALLOW', category: 'Inteligência Artificial' },
  { code: 'AI_READ', resource: 'AI_GATEWAY', action: 'READ', label: 'Visualizar Consumo de Tokens e Métricas IA', effect: 'ALLOW', category: 'Inteligência Artificial' },

  // Governança & Configurações
  { code: 'SETTINGS_READ', resource: 'SETTINGS', action: 'READ', label: 'Visualizar Estrutura Organizacional', effect: 'ALLOW', category: 'Governança & Estrutura' },
  { code: 'SETTINGS_UPDATE', resource: 'SETTINGS', action: 'UPDATE', label: 'Gerenciar Filiais, Equipe e Matriz RBAC', effect: 'ALLOW', category: 'Governança & Estrutura' },

  // Auditoria & LGPD
  { code: 'AUDIT_READ', resource: 'AUDIT', action: 'READ', label: 'Consultar Trilha de Auditoria e Logs', effect: 'ALLOW', category: 'Auditoria & LGPD' },
  { code: 'AUDIT_EXPORT', resource: 'AUDIT', action: 'EXPORT', label: 'Exportar Relatórios de Conformidade LGPD', effect: 'ALLOW', category: 'Auditoria & LGPD' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTenant,
  tenants = [],
  branches = [],
  users = [],
  roles = [],
  auditLogs = [],
  lgpdConsents = [],
  persons = [],
  currentUser,
  currentRole,
  onSaveTenant = async (_data: Partial<Tenant>) => {},
  onSaveBranch = async (_data: Partial<Branch>) => {},
  onDeleteBranch = async (_id: string) => {},
  onSaveRole = async (_data: Partial<Role>) => {},
  onDeleteRole = async (_id: string) => {},
  onSaveUser = async (_data: any) => {},
  onDeleteUser = async (_id: string) => {},
  onSaveLgpdConsent = async (_data: Partial<LGPDConsent>) => {},
  onSwitchTenant = (_id: string) => {},
  onOpenNewTenantModal,
}) => {
  const isSuperAdmin =
    currentUser?.id === 'u-superadmin' ||
    currentUser?.email?.includes('superadmin') ||
    currentRole?.code === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'GOVERNANCE' | 'TENANTS' | 'USERS' | 'RBAC' | 'AUDIT' | 'LGPD' | 'DATABASE'>('GOVERNANCE');

  // Supabase Status State
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    url: string | null;
    tables: Record<string, number>;
    memoryCounts?: Record<string, number>;
    error?: string;
  } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchSupabaseStatus = async () => {
    try {
      const res = await api.getSupabaseStatus();
      setSupabaseStatus(res);
    } catch (err: any) {
      console.warn('Failed to fetch Supabase status', err);
    }
  };

  useEffect(() => {
    fetchSupabaseStatus();
  }, []);

  const handleSyncWithSupabase = async () => {
    setIsSyncingSupabase(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncSupabase();
      setSyncFeedback(res.message || 'Sincronização concluída com sucesso!');
      await fetchSupabaseStatus();
    } catch (err: any) {
      setSyncFeedback('Erro ao sincronizar com Supabase: ' + err.message);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  // Tenant Modal State
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({
    name: '',
    tradeName: '',
    cnpj: '',
    oabOfficeRegister: '',
    contactEmail: '',
    contactPhone: '',
    plan: 'ENTERPRISE' as 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE',
    pixKey: '',
  });

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormData, setBranchFormData] = useState({
    name: '',
    code: '',
    city: '',
    state: 'SP',
    address: '',
    phone: '',
    email: '',
    isMain: false,
  });

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [userBranchFilter, setUserBranchFilter] = useState('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isLawyer: true,
    oabNumber: '',
    oabUf: 'SP',
    roleId: '',
    branchId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INVITED' | 'SUSPENDED',
    avatarUrl: '',
  });

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState<{
    name: string;
    code: string;
    description: string;
    selectedPermissions: string[];
  }>({
    name: '',
    code: '',
    description: '',
    selectedPermissions: [],
  });

  // Audit filter state
  const [auditFilterEntity, setAuditFilterEntity] = useState<string>('ALL');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');

  // New LGPD Modal State
  const [isLgpdModalOpen, setIsLgpdModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState(persons[0]?.id || '');
  const [consentType, setConsentType] = useState<any>('REPRESENTACAO_JUDICIAL');
  const [submitting, setSubmitting] = useState(false);

  // --- Handlers for Tenant ---
  const handleOpenTenantModal = () => {
    if (currentTenant) {
      setTenantFormData({
        name: currentTenant.name || '',
        tradeName: currentTenant.tradeName || '',
        cnpj: currentTenant.cnpj || '',
        oabOfficeRegister: currentTenant.oabOfficeRegister || '',
        contactEmail: currentTenant.contactEmail || '',
        contactPhone: currentTenant.contactPhone || '',
        plan: currentTenant.plan || 'ENTERPRISE',
        pixKey: currentTenant.settings?.pixKey || '',
      });
    }
    setIsTenantModalOpen(true);
  };

  const handleSaveTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSaveTenant({
        name: tenantFormData.name,
        tradeName: tenantFormData.tradeName,
        cnpj: tenantFormData.cnpj,
        oabOfficeRegister: tenantFormData.oabOfficeRegister,
        contactEmail: tenantFormData.contactEmail,
        contactPhone: tenantFormData.contactPhone,
        plan: tenantFormData.plan,
        settings: {
          ...(currentTenant?.settings || {
            cpcCountDaysDefault: true,
            notifyDeadlinesDaysBefore: [1, 3, 5],
            currency: 'BRL',
            mercadopagoConfigured: true,
          }),
          pixKey: tenantFormData.pixKey,
        },
      });
      setIsTenantModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Handlers for Branch ---
  const handleOpenNewBranchModal = () => {
    setEditingBranch(null);
    setBranchFormData({
      name: '',
      code: `UNID-${branches.length + 1}`,
      city: 'São Paulo',
      state: 'SP',
      address: '',
      phone: '',
      email: '',
      isMain: branches.length === 0,
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchFormData({
      name: branch.name || '',
      code: branch.code || '',
      city: branch.city || '',
      state: branch.state || 'SP',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isMain: Boolean(branch.isMain),
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSaveBranch({
        ...(editingBranch ? { id: editingBranch.id } : {}),
        name: branchFormData.name,
        code: branchFormData.code,
        city: branchFormData.city,
        state: branchFormData.state,
        address: branchFormData.address,
        phone: branchFormData.phone,
        email: branchFormData.email,
        isMain: branchFormData.isMain,
      });
      setIsBranchModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranchClick = async (branch: Branch) => {
    if (branches.length <= 1) {
      alert('Não é possível excluir a única unidade do escritório.');
      return;
    }
    if (confirm(`Deseja realmente excluir a unidade "${branch.name}"?`)) {
      await onDeleteBranch(branch.id);
    }
  };

  // --- Handlers for User ---
  const handleOpenNewUserModal = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      isLawyer: true,
      oabNumber: '',
      oabUf: 'SP',
      roleId: roles[0]?.id || '',
      branchId: branches[0]?.id || '',
      status: 'ACTIVE',
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: any) => {
    setEditingUser(u);
    setUserFormData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      isLawyer: Boolean(u.oabNumber),
      oabNumber: u.oabNumber || '',
      oabUf: u.oabUf || 'SP',
      roleId: u.roleId || roles[0]?.id || '',
      branchId: u.branchId || branches[0]?.id || '',
      status: (u.status as any) || 'ACTIVE',
      avatarUrl: u.avatarUrl || '',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSaveUser({
        ...(editingUser ? { id: editingUser.id } : {}),
        name: userFormData.name,
        email: userFormData.email,
        phone: userFormData.phone,
        oabNumber: userFormData.isLawyer ? userFormData.oabNumber : '',
        oabUf: userFormData.isLawyer ? userFormData.oabUf : '',
        roleId: userFormData.roleId,
        branchId: userFormData.branchId,
        status: userFormData.status,
        avatarUrl: userFormData.avatarUrl || undefined,
        active: userFormData.status === 'ACTIVE',
      });
      setIsUserModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUserClick = async (u: any) => {
    if (confirm(`Deseja desvincular o usuário "${u.name}" da equipe deste escritório?`)) {
      await onDeleteUser(u.id);
    }
  };

  // --- Handlers for Role & RBAC ---
  const handleOpenNewRoleModal = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      code: `ROLE_CUSTOM_${Date.now()}`,
      description: '',
      selectedPermissions: ['CASES_READ', 'CLIENTS_READ', 'DEADLINES_READ', 'DOCUMENTS_READ'],
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (role: Role) => {
    setEditingRole(role);
    const existingPermCodes = (role.permissions || []).map((p: any) =>
      typeof p === 'object' && p !== null ? p.code : String(p)
    );
    setRoleFormData({
      name: role.name || '',
      code: role.code || '',
      description: role.description || '',
      selectedPermissions: existingPermCodes,
    });
    setIsRoleModalOpen(true);
  };

  const handleDuplicateRole = (role: Role) => {
    setEditingRole(null);
    const existingPermCodes = (role.permissions || []).map((p: any) =>
      typeof p === 'object' && p !== null ? p.code : String(p)
    );
    setRoleFormData({
      name: `${role.name} (Cópia)`,
      code: `${role.code}_COPY_${Math.floor(Math.random() * 1000)}`,
      description: `Cópia baseada no perfil ${role.name}. ${role.description || ''}`,
      selectedPermissions: existingPermCodes,
    });
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (code: string) => {
    setRoleFormData((prev) => {
      const exists = prev.selectedPermissions.includes(code);
      return {
        ...prev,
        selectedPermissions: exists
          ? prev.selectedPermissions.filter((c) => c !== code)
          : [...prev.selectedPermissions, code],
      };
    });
  };

  const handleSelectAllPermissions = () => {
    setRoleFormData((prev) => ({
      ...prev,
      selectedPermissions: AVAILABLE_PERMISSIONS.map((p) => p.code),
    }));
  };

  const handleClearPermissions = () => {
    setRoleFormData((prev) => ({
      ...prev,
      selectedPermissions: [],
    }));
  };

  const handleSaveRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fullPermissions: Permission[] = roleFormData.selectedPermissions.map((code) => {
        const found = AVAILABLE_PERMISSIONS.find((p) => p.code === code);
        return {
          code,
          resource: found?.resource || 'CASES',
          action: found?.action || 'READ',
          effect: 'ALLOW',
        };
      });

      await onSaveRole({
        ...(editingRole ? { id: editingRole.id } : {}),
        name: roleFormData.name,
        code: roleFormData.code as any,
        description: roleFormData.description,
        permissions: fullPermissions,
      });
      setIsRoleModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoleClick = async (role: Role) => {
    if (role.isSystem) {
      alert('Perfis nativos do sistema não podem ser excluídos.');
      return;
    }
    if (confirm(`Deseja excluir a função personalizada "${role.name}"?`)) {
      await onDeleteRole(role.id);
    }
  };

  // --- Handlers for LGPD ---
  const handleCreateLgpdConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const person = persons.find((p) => p.id === selectedPersonId);

    try {
      await onSaveLgpdConsent({
        personId: selectedPersonId,
        personName: person?.name || 'Titular dos Dados',
        consentType,
      });
      setIsLgpdModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      !userSearchFilter ||
      u.name?.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
      u.oabNumber?.toLowerCase().includes(userSearchFilter.toLowerCase());
    const matchesBranch = userBranchFilter === 'ALL' || u.branchId === userBranchFilter;
    const matchesRole = userRoleFilter === 'ALL' || u.roleId === userRoleFilter;
    return matchesSearch && matchesBranch && matchesRole;
  });

  // Filtered Audits
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesEntity = auditFilterEntity === 'ALL' || log.entityType === auditFilterEntity;
    const matchesAction = auditFilterAction === 'ALL' || log.action === auditFilterAction;
    return matchesEntity && matchesAction;
  });

  // Grouped Permissions by Category
  const permissionCategories = Array.from(new Set(AVAILABLE_PERMISSIONS.map((p) => p.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Governança, Segurança RBAC & LGPD
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Gestão multi-tenant da estrutura do escritório, filiais, matriz de permissões RBAC, equipe e privacidade
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('GOVERNANCE')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'GOVERNANCE'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Estrutura do Escritório & Filiais ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TENANTS')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'TENANTS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>Plataforma SaaS & Escritórios ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'USERS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Equipe & Usuários ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RBAC')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'RBAC'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4 text-indigo-600" />
          <span>Matriz de Funções & RBAC ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4 text-indigo-600" />
          <span>Trilha de Auditoria & Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LGPD')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'LGPD'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Portal de Privacidade LGPD ({lgpdConsents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DATABASE')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'DATABASE'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          <span className="flex items-center gap-1.5">
            Supabase & Banco de Dados
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </span>
        </button>
      </div>

      {/* 1. GOVERNANCE: ESCRITÓRIO & FILIAIS */}
      {activeTab === 'GOVERNANCE' && (
        <div className="space-y-6">
          {/* Main Tenant Details Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-['Cinzel'] text-xl">
                  {currentTenant?.name?.slice(0, 2).toUpperCase() || 'JF'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{currentTenant?.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                      Tenant Ativo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    ID: {currentTenant?.id} • Slug: {currentTenant?.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {onOpenNewTenantModal && (
                  <button
                    onClick={onOpenNewTenantModal}
                    className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-amber-300 shadow-2xs"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>+ Cadastrar Novo Escritório</span>
                  </button>
                )}

                <button
                  onClick={handleOpenTenantModal}
                  className="px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-2 border border-indigo-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Dados do Escritório</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Nome Fantasia:</span>
                <p className="font-bold text-slate-800 truncate">{currentTenant?.tradeName || 'Não informado'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">CNPJ Institucional:</span>
                <p className="font-mono text-slate-800 font-semibold">{currentTenant?.cnpj || '-'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Registro OAB Sociedade:</span>
                <p className="font-mono text-indigo-700 font-semibold">{currentTenant?.oabOfficeRegister || 'Não registrado'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Plano Contratado:</span>
                <p className="font-bold text-indigo-600 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> {currentTenant?.plan || 'ENTERPRISE'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">E-mail de Contato:</span>
                <p className="font-medium text-slate-800 truncate">{currentTenant?.contactEmail || '-'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Telefone / Central:</span>
                <p className="font-medium text-slate-800">{currentTenant?.contactPhone || '-'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Chave PIX Escritório:</span>
                <p className="font-mono text-slate-800 font-semibold truncate">{currentTenant?.settings?.pixKey || 'Não cadastrada'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Segurança Multi-Tenant:</span>
                <p className="text-emerald-700 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Isolamento RLS Ativo
                </p>
              </div>
            </div>
          </div>

          {/* Branches Section */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Filiais & Unidades Regionais ({branches.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unidades físicas com numeração interna, código de filial e jurisdição de atuação
                </p>
              </div>

              <button
                onClick={handleOpenNewBranchModal}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova Filial / Unidade</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 text-sm block truncate">{b.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">Cód: {b.code || 'UNID'}</span>
                      </div>
                      {b.isMain ? (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono border border-indigo-200 font-bold whitespace-nowrap">
                          Matriz
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-mono font-medium whitespace-nowrap">
                          Filial
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-slate-600 pt-1 border-t border-slate-200/60">
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.address || `${b.city}/${b.state}`}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.city} - {b.state}</span>
                      </p>
                      {b.phone && (
                        <p className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{b.phone}</span>
                        </p>
                      )}
                      {b.email && (
                        <p className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{b.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleOpenEditBranchModal(b)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    {!b.isMain && branches.length > 1 && (
                      <button
                        onClick={() => handleDeleteBranchClick(b)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 font-medium text-[11px] border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PLATFORM TENANTS (ESCRITÓRIOS SAAS) */}
      {activeTab === 'TENANTS' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-sm shrink-0 mt-0.5">
                <Crown className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Plataforma SaaS & Gestão de Escritórios
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold font-mono">
                    Super Admin SaaS
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Provisionamento, isolamento multi-tenant de dados, filiais e governança centralizada de todas as sociedades de advocacia cadastradas.
                </p>
              </div>
            </div>

            {onOpenNewTenantModal && (
              <button
                onClick={onOpenNewTenantModal}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 self-start md:self-auto hover:scale-102"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Cadastrar Novo Escritório</span>
              </button>
            )}
          </div>

          {/* Tenants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tenants.map((t) => {
              const isCurrent = t.id === currentTenant?.id;

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 shadow-xs ${
                    isCurrent
                      ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-['Cinzel'] font-bold text-base shrink-0 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">
                            {t.tradeName || t.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">{t.name}</p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ativo</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200 shrink-0">
                          Tenant
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">CNPJ:</span>
                        <span className="font-mono text-slate-800 font-medium">{t.cnpj}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Registro OAB:</span>
                        <span className="font-mono text-indigo-700 font-medium">
                          {t.oabOfficeRegister || 'Não informado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Plano SaaS:</span>
                        <span className="font-semibold text-slate-900">{t.plan || 'ENTERPRISE'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Slug / Domínio:</span>
                        <span className="font-mono text-[11px] text-slate-600">{t.slug || t.id}</span>
                      </div>
                      {t.contactEmail && (
                        <div className="flex justify-between truncate">
                          <span className="text-slate-400">E-mail:</span>
                          <span className="text-slate-700 truncate pl-2">{t.contactEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>

                    {isCurrent ? (
                      <button
                        onClick={handleOpenTenantModal}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-1 border border-indigo-200"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Configurar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSwitchTenant(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 group"
                      >
                        <span>Acessar Escritório</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. USERS & TEAM MEMBERS */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar membro, e-mail ou OAB..."
                  value={userSearchFilter}
                  onChange={(e) => setUserSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={userBranchFilter}
                onChange={(e) => setUserBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">Todas as Filiais</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">Todas as Funções</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenNewUserModal}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Membro da Equipe</span>
            </button>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u: any) => {
              const userBranch = branches.find((b) => b.id === u.branchId);
              const userRole = roles.find((r) => r.id === u.roleId);

              return (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={u.name}
                        className="w-11 h-11 rounded-full ring-2 ring-slate-100 object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-slate-900 text-sm truncate">{u.name}</h3>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              u.status === 'ACTIVE' || u.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {u.status === 'ACTIVE' || u.active !== false ? 'Ativo' : u.status || 'Inativo'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                        {u.oabNumber && (
                          <p className="text-[11px] text-indigo-600 font-mono font-semibold mt-0.5">
                            OAB/{u.oabUf || 'SP'} {u.oabNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2.5 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Função RBAC:</span>
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {userRole?.name || u.roleName || 'Membro'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Lotação / Filial:</span>
                        <span className="font-medium text-slate-700 text-[11px]">
                          {userBranch?.name || u.branchName || 'Matriz'}
                        </span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-500 font-sans">Telefone:</span>
                          <span className="text-slate-700">{u.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditUserModal(u)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteUserClick(u)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 font-semibold text-xs border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Desvincular</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. RBAC ROLES MATRIX */}
      {activeTab === 'RBAC' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Matriz de Funções & Controle de Acesso Baseado em Funções (RBAC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina perfis com controle granular de leitura, gravação, exclusão e aprovação por módulo funcional
              </p>
            </div>

            <button
              onClick={handleOpenNewRoleModal}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Função RBAC</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const permCount = role.permissions?.length || 0;

              return (
                <div
                  key={role.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{role.code}</p>
                      </div>
                      {role.isSystem ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                          Sistema
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
                          Personalizado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">{role.description || 'Sem descrição definida.'}</p>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-600 font-mono uppercase tracking-wider">
                          Permissões ({permCount})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {Math.round((permCount / AVAILABLE_PERMISSIONS.length) * 100)}% da matriz
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
                        {(role.permissions || []).map((perm: any, idx: number) => {
                          const permCode = typeof perm === 'object' && perm !== null ? perm.code : String(perm);
                          const permAction = typeof perm === 'object' && perm !== null ? `${perm.resource}: ${perm.action}` : '';
                          return (
                            <span
                              key={`${role.id}-perm-${permCode || idx}-${idx}`}
                              title={permAction}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-white text-slate-700 font-mono border border-slate-200 shadow-2xs font-medium"
                            >
                              {permCode}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleDuplicateRole(role)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-[11px] border border-slate-200 transition-colors flex items-center gap-1"
                      title="Duplicar para criar função similar"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Duplicar</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditRoleModal(role)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Configurar</span>
                      </button>

                      {!role.isSystem && (
                        <button
                          onClick={() => handleDeleteRoleClick(role)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
                          title="Excluir perfil personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filtrar Trilha:
              </span>
              <select
                value={auditFilterEntity}
                onChange={(e) => setAuditFilterEntity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">Todas as Entidades</option>
                <option value="CASE">Processos / Casos</option>
                <option value="CLIENT">Clientes & CRM</option>
                <option value="PERSON">Pessoas Físicas/Jurídicas</option>
                <option value="DEADLINE">Prazos & Audiências</option>
                <option value="PAYMENT">Financeiro & Pagamentos</option>
                <option value="AUTH">Governança & RBAC</option>
                <option value="DOCUMENT">Documentos</option>
              </select>

              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">Todas as Ações</option>
                <option value="CREATE">Criação (CREATE)</option>
                <option value="UPDATE">Alteração (UPDATE)</option>
                <option value="DELETE">Exclusão (DELETE)</option>
                <option value="SIMULATE_PAYMENT">Pagamento / Simulação</option>
              </select>
            </div>

            <span className="text-slate-500 font-mono text-[11px]">
              {filteredAuditLogs.length} eventos registrados
            </span>
          </div>

          {/* Audit Table */}
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp / IP</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Entidade</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Detalhes do Evento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        <p className="text-slate-900 font-medium">{log.timestamp.replace('T', ' ').slice(0, 19)}</p>
                        <p className="text-[10px] text-slate-400">{log.ip}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{log.userName}</p>
                        <p className="text-[10px] text-slate-500">{log.userEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200 font-medium">
                          {log.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-sans">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. LGPD PORTAL */}
      {activeTab === 'LGPD' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Registros formais de consentimento em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
            </p>
            <button
              onClick={() => setIsLgpdModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Registrar Novo Consentimento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lgpdConsents.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                    {c.consentType}
                  </span>
                  <span className="text-emerald-700 font-mono text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Válido ({c.status})
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.personName}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Termos: {c.termsVersion}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                  <span>Concedido: {c.grantedAt.slice(0, 10)}</span>
                  <span>IP: {c.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DATABASE & SUPABASE PERSISTENCE */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Supabase PostgreSQL</h2>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold font-mono border flex items-center gap-1.5 ${
                        supabaseStatus?.connected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          supabaseStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {supabaseStatus?.connected ? 'Online & Sincronizado' : 'Aguardando Credenciais'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Banco de dados relacional com isolamento multi-tenant, Row-Level Security (RLS) e persistência em tempo real
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSupabaseStatus}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Atualizar Status</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncWithSupabase}
                  disabled={isSyncingSupabase}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSupabase ? 'Sincronizando...' : 'Sincronizar Dados Agora'}</span>
                </button>
              </div>
            </div>

            {syncFeedback && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono">
                {syncFeedback}
              </div>
            )}
          </div>

          {/* Connection Details & Table Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Infrastructure Details */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Infraestrutura Supabase
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">URL do Projeto:</span>
                    <span className="font-mono font-medium text-slate-900 break-all">
                      {supabaseStatus?.url || 'https://xxx.supabase.co (Configurado via .env)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Isolamento Multi-Tenant:</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ativo (RLS por tenant_id)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Modo de Operação:</span>
                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      Híbrido (Cache em Memória + Postgres Sync)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-xs">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Políticas de Segurança (RLS)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Todas as tabelas possuem <code>ROW LEVEL SECURITY</code> ativado. A função SQL <code>user_belongs_to_tenant()</code> garante que nenhum usuário veja dados de outro escritório ou filial não autorizada.
                </p>
              </div>
            </div>

            {/* Right: Synced Tables Inventory */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tabelas Relacionais & Contagem de Registros
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {Object.keys(supabaseStatus?.tables || {}).length} tabelas monitoradas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'tenants', label: 'Escritórios / Tenants', icon: Building2 },
                  { key: 'branches', label: 'Unidades & Filiais', icon: Building2 },
                  { key: 'users', label: 'Usuários & Advogados', icon: Users },
                  { key: 'roles', label: 'Funções & Permissões RBAC', icon: Key },
                  { key: 'persons', label: 'Pessoas Físicas & Jurídicas', icon: Users },
                  { key: 'clients', label: 'Clientes Cadastrados', icon: Users },
                  { key: 'cases', label: 'Processos Judiciais & Casos', icon: Briefcase },
                  { key: 'deadlines', label: 'Prazos Fatais & Audiências', icon: AlertTriangle },
                  { key: 'financial_receivables', label: 'Contas a Receber / Faturas', icon: Award },
                  { key: 'audit_logs', label: 'Trilha de Auditoria & Logs', icon: Lock },
                ].map((item) => {
                  const dbCount = supabaseStatus?.tables?.[item.key] ?? 0;
                  const memoryCount = (supabaseStatus?.memoryCounts as any)?.[item.key] ?? dbCount;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{item.label}</p>
                          <p className="font-mono text-[10px] text-slate-500">tabela: {item.key}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {supabaseStatus?.connected ? dbCount : memoryCount}
                        </span>
                        <span className="block text-[10px] text-emerald-600 font-medium">registros</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* MODAL 1: TENANT EDIT */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Dados do Escritório (Tenant)
              </h2>
              <button onClick={() => setIsTenantModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenantSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Razão Social / Nome Institucional *</label>
                <input
                  type="text"
                  required
                  value={tenantFormData.name}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, name: e.target.value })}
                  placeholder="Ex: Silveira & Associados Advocacia Empresarial"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tenantFormData.tradeName}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, tradeName: e.target.value })}
                    placeholder="Ex: Silveira Law"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">CNPJ Institucional *</label>
                  <input
                    type="text"
                    required
                    value={tenantFormData.cnpj}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Registro Sociedade OAB</label>
                  <input
                    type="text"
                    value={tenantFormData.oabOfficeRegister}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, oabOfficeRegister: e.target.value })}
                    placeholder="Ex: OAB/SP 4.521"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Plano SaaS</label>
                  <select
                    value={tenantFormData.plan}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, plan: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="BASIC">BASIC (Até 5 Usuários)</option>
                    <option value="PROFESSIONAL">PROFESSIONAL (Até 25 Usuários)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Usuários Ilimitados + IA Full)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">E-mail Institucional</label>
                  <input
                    type="email"
                    value={tenantFormData.contactEmail}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, contactEmail: e.target.value })}
                    placeholder="contato@escritorio.adv.br"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Telefone Principal</label>
                  <input
                    type="text"
                    value={tenantFormData.contactPhone}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, contactPhone: e.target.value })}
                    placeholder="(11) 3456-7890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Chave PIX Financeira (Honorários)</label>
                <input
                  type="text"
                  value={tenantFormData.pixKey}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, pixKey: e.target.value })}
                  placeholder="financeiro@escritorio.adv.br ou CNPJ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTenantModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BRANCH CREATE / EDIT */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingBranch ? 'Editar Filial / Unidade' : 'Cadastrar Nova Filial'}
              </h2>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranchSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nome da Unidade / Filial *</label>
                <input
                  type="text"
                  required
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                  placeholder="Ex: Filial Rio de Janeiro (Centro)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Código Interno *</label>
                  <input
                    type="text"
                    required
                    value={branchFormData.code}
                    onChange={(e) => setBranchFormData({ ...branchFormData, code: e.target.value })}
                    placeholder="Ex: RJ-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Estado (UF) *</label>
                  <select
                    value={branchFormData.state}
                    onChange={(e) => setBranchFormData({ ...branchFormData, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {['SP', 'RJ', 'DF', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'ES', 'AM', 'PA', 'MT', 'MS'].map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Cidade *</label>
                <input
                  type="text"
                  required
                  value={branchFormData.city}
                  onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                  placeholder="Ex: Rio de Janeiro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Endereço Completo</label>
                <input
                  type="text"
                  value={branchFormData.address}
                  onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                  placeholder="Av. Rio Branco, 110, Sala 1802 - Centro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Telefone</label>
                  <input
                    type="text"
                    value={branchFormData.phone}
                    onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                    placeholder="(21) 2233-4455"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">E-mail da Unidade</label>
                  <input
                    type="email"
                    value={branchFormData.email}
                    onChange={(e) => setBranchFormData({ ...branchFormData, email: e.target.value })}
                    placeholder="rj@silveira.adv.br"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMainBranch"
                  checked={branchFormData.isMain}
                  onChange={(e) => setBranchFormData({ ...branchFormData, isMain: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isMainBranch" className="text-slate-800 font-semibold cursor-pointer">
                  Definir como Matriz Principal do Escritório
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingBranch ? 'Atualizar Filial' : 'Cadastrar Filial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: USER CREATE / EDIT */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                {editingUser ? 'Editar Usuário / Membro da Equipe' : 'Cadastrar Novo Usuário na Equipe'}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Ex: Dra. Mariana Costa Silveira"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">E-mail Institucional *</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="mariana@escritorio.adv.br"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* OAB Checkbox & Inputs */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isLawyerCheck"
                    checked={userFormData.isLawyer}
                    onChange={(e) => setUserFormData({ ...userFormData, isLawyer: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isLawyerCheck" className="text-slate-800 font-semibold cursor-pointer">
                    Possui inscrição nos quadros da OAB (Advogado/Advogada)
                  </label>
                </div>

                {userFormData.isLawyer && (
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="col-span-2">
                      <label className="block text-slate-700 mb-1 font-medium">Número de Inscrição OAB *</label>
                      <input
                        type="text"
                        required={userFormData.isLawyer}
                        value={userFormData.oabNumber}
                        onChange={(e) => setUserFormData({ ...userFormData, oabNumber: e.target.value })}
                        placeholder="Ex: 234.567"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1 font-medium">Seccional (UF)</label>
                      <select
                        value={userFormData.oabUf}
                        onChange={(e) => setUserFormData({ ...userFormData, oabUf: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        {['SP', 'RJ', 'DF', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'ES', 'AM', 'PA', 'MT', 'MS'].map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Função / Perfil RBAC *</label>
                  <select
                    required
                    value={userFormData.roleId}
                    onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Unidade de Lotação (Filial) *</label>
                  <select
                    required
                    value={userFormData.branchId}
                    onChange={(e) => setUserFormData({ ...userFormData, branchId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city}/{b.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Status do Usuário</label>
                <select
                  value={userFormData.status}
                  onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="ACTIVE">Ativo (Acesso Liberado)</option>
                  <option value="INVITED">Convidado (Pendente de Ativação)</option>
                  <option value="SUSPENDED">Inativo / Suspenso</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ROLE & RBAC MATRIX CREATE / EDIT */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  {editingRole ? `Configurar Função: ${editingRole.name}` : 'Criar Nova Função RBAC'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atribua permissões modulares de leitura, escrita, exclusão e aprovação
                </p>
              </div>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nome da Função / Cargo *</label>
                  <input
                    type="text"
                    required
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    placeholder="Ex: Advogado Coordenador Cível"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Código Identificador (RBAC Code) *</label>
                  <input
                    type="text"
                    required
                    value={roleFormData.code}
                    onChange={(e) => setRoleFormData({ ...roleFormData, code: e.target.value })}
                    placeholder="Ex: ADV_COORD_CIVEL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Descrição da Função & Escopo de Responsabilidade</label>
                <textarea
                  rows={2}
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Responsável por gestão de processos cíveis estratégicos, revisão de prazos e validação de minutas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Matrix Control Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Matriz de Permissões ({roleFormData.selectedPermissions.length} selecionadas)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] hover:bg-indigo-100 transition-colors"
                  >
                    Marcar Todas
                  </button>
                  <button
                    type="button"
                    onClick={handleClearPermissions}
                    className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] hover:bg-slate-200 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Categorized Permissions */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {permissionCategories.map((category) => {
                  const perms = AVAILABLE_PERMISSIONS.filter((p) => p.category === category);
                  const categorySelectedCount = perms.filter((p) =>
                    roleFormData.selectedPermissions.includes(p.code)
                  ).length;

                  return (
                    <div key={category} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider font-mono">
                          {category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {categorySelectedCount} / {perms.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const isChecked = roleFormData.selectedPermissions.includes(p.code);
                          return (
                            <label
                              key={p.code}
                              className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-white border-indigo-300 text-slate-900 shadow-2xs'
                                  : 'bg-slate-100/50 border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.code)}
                                className="w-3.5 h-3.5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className={`font-semibold ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {p.label}
                                </p>
                                <p className="font-mono text-[9px] text-slate-400">{p.code}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingRole ? 'Salvar Permissões' : 'Criar Função RBAC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: LGPD CONSENT */}
      {isLgpdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Termo de Consentimento LGPD
              </h2>
              <button onClick={() => setIsLgpdModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLgpdConsent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Titular dos Dados (Pessoa) *</label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.document})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Finalidade do Consentimento</label>
                <select
                  value={consentType}
                  onChange={(e) => setConsentType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="REPRESENTACAO_JUDICIAL">Representação em Juízo e Gestão Processual</option>
                  <option value="CONSULTORIA_EXTRAJUDICIAL">Consultoria e Elaboração de Pareceres</option>
                  <option value="NOTIFICACOES_WHATSAPP">Envio de Andamentos Processuais via WhatsApp/E-mail</option>
                  <option value="COMPARTILHAMENTO_PERITOS">Compartilhamento com Peritos e Assistentes Técnicos</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Declaração de Consentimento:</p>
                <p>
                  O titular autoriza expressamente o escritório a coletar e tratar seus dados pessoais estritamente para as finalidades jurídicas e contratuais estabelecidas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLgpdModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : 'Registrar Consentimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
