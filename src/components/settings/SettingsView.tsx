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
  Star,
  Camera,
  Palette,
} from 'lucide-react';
import { api } from '../../services/api';
import { AvatarPicker } from '../common/AvatarPicker';
import { BrandingSettingsTab } from './BrandingSettingsTab';
import { DatabaseDRTab } from './DatabaseDRTab';
import {
  Tenant,
  Branch,
  User,
  Role,
  AuditLog,
  LGPDConsent,
  Person,
  Permission,
  UserBranchAffiliation,
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
  onSaveUser?: (data: Partial<User> & { roleId?: string; branchId?: string; status?: string; branchAffiliations?: any[] }) => Promise<void>;
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

  const [activeTab, setActiveTab] = useState<'GOVERNANCE' | 'BRANDING' | 'TENANTS' | 'USERS' | 'RBAC' | 'AUDIT' | 'LGPD' | 'DATABASE'>('GOVERNANCE');

  // Supabase Status State
  const [supabaseStatus, setSupabaseStatus] = useState<{
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
  } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

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

  // Purge Demo Data / Production Slate State
  const [isPurgingDemo, setIsPurgingDemo] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  const handlePurgeDemoData = async () => {
    setIsPurgingDemo(true);
    setPurgeFeedback(null);
    try {
      const res = await api.purgeDemoData();
      setPurgeFeedback(res.message || 'Dados fictícios removidos com sucesso! Sistema em estado limpo de produção.');
      setIsPurgeModalOpen(false);
      await fetchSupabaseStatus();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setPurgeFeedback('Erro ao limpar dados fictícios: ' + err.message);
    } finally {
      setIsPurgingDemo(false);
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
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    isLawyer: boolean;
    oabNumber: string;
    oabUf: string;
    avatarUrl: string;
    branchAffiliations: {
      id?: string;
      branchId: string;
      roleId: string;
      email: string;
      phone: string;
      status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
      isPrimary: boolean;
    }[];
  }>({
    name: '',
    email: '',
    phone: '',
    isLawyer: true,
    oabNumber: '',
    oabUf: 'SP',
    avatarUrl: '',
    branchAffiliations: [],
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
    const initialBranchId = branches[0]?.id || '';
    const initialRoleId = roles[0]?.id || '';
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      isLawyer: true,
      oabNumber: '',
      oabUf: 'SP',
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
      branchAffiliations: [
        {
          branchId: initialBranchId,
          roleId: initialRoleId,
          email: '',
          phone: '',
          status: 'ACTIVE',
          isPrimary: true,
        },
      ],
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: any) => {
    setEditingUser(u);
    let affiliations: any[] = [];
    if (Array.isArray(u.branchAffiliations) && u.branchAffiliations.length > 0) {
      affiliations = u.branchAffiliations.map((a: any) => ({
        id: a.id,
        branchId: a.branchId,
        roleId: a.roleId,
        email: a.email || u.email || '',
        phone: a.phone || u.phone || '',
        status: (a.status as any) || 'ACTIVE',
        isPrimary: Boolean(a.isPrimary),
      }));
    } else if (Array.isArray(u.memberships) && u.memberships.length > 0) {
      affiliations = u.memberships.map((m: any) => ({
        id: m.id,
        branchId: m.branchId,
        roleId: m.roleId,
        email: m.email || u.email || '',
        phone: m.phone || u.phone || '',
        status: (m.status as any) || 'ACTIVE',
        isPrimary: Boolean(m.isPrimary),
      }));
    } else {
      affiliations = [
        {
          branchId: u.branchId || branches[0]?.id || '',
          roleId: u.roleId || roles[0]?.id || '',
          email: u.email || '',
          phone: u.phone || '',
          status: (u.status as any) || 'ACTIVE',
          isPrimary: true,
        },
      ];
    }

    if (!affiliations.some((a) => a.isPrimary) && affiliations.length > 0) {
      affiliations[0].isPrimary = true;
    }

    setUserFormData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      isLawyer: Boolean(u.oabNumber),
      oabNumber: u.oabNumber || '',
      oabUf: u.oabUf || 'SP',
      avatarUrl: u.avatarUrl || '',
      branchAffiliations: affiliations,
    });
    setIsUserModalOpen(true);
  };

  const handleAddBranchAffiliation = () => {
    const usedBranchIds = new Set(userFormData.branchAffiliations.map((a) => a.branchId));
    const availableBranch = branches.find((b) => !usedBranchIds.has(b.id)) || branches[0];
    if (!availableBranch) return;

    setUserFormData((prev) => ({
      ...prev,
      branchAffiliations: [
        ...prev.branchAffiliations,
        {
          branchId: availableBranch.id,
          roleId: roles[0]?.id || '',
          email: prev.email || '',
          phone: prev.phone || '',
          status: 'ACTIVE',
          isPrimary: prev.branchAffiliations.length === 0,
        },
      ],
    }));
  };

  const handleRemoveBranchAffiliation = (index: number) => {
    if (userFormData.branchAffiliations.length <= 1) return;
    setUserFormData((prev) => {
      const updated = prev.branchAffiliations.filter((_, i) => i !== index);
      if (!updated.some((a) => a.isPrimary) && updated.length > 0) {
        updated[0].isPrimary = true;
      }
      return { ...prev, branchAffiliations: updated };
    });
  };

  const handleSetPrimaryBranch = (index: number) => {
    setUserFormData((prev) => ({
      ...prev,
      branchAffiliations: prev.branchAffiliations.map((a, i) => ({
        ...a,
        isPrimary: i === index,
      })),
    }));
  };

  const handleUpdateAffiliation = (index: number, field: string, value: any) => {
    setUserFormData((prev) => {
      const updated = [...prev.branchAffiliations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, branchAffiliations: updated };
    });
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (userFormData.branchAffiliations.length === 0) {
        alert('É necessário vincular o membro a pelo menos uma filial.');
        setSubmitting(false);
        return;
      }

      const affiliations = [...userFormData.branchAffiliations];
      if (!affiliations.some((a) => a.isPrimary)) {
        affiliations[0].isPrimary = true;
      }

      const primary = affiliations.find((a) => a.isPrimary) || affiliations[0];

      await onSaveUser({
        ...(editingUser ? { id: editingUser.id } : {}),
        name: userFormData.name,
        email: userFormData.email || primary.email,
        phone: userFormData.phone || primary.phone,
        oabNumber: userFormData.isLawyer ? userFormData.oabNumber : '',
        oabUf: userFormData.isLawyer ? userFormData.oabUf : '',
        avatarUrl: userFormData.avatarUrl || undefined,
        active: primary.status === 'ACTIVE',
        roleId: primary.roleId,
        branchId: primary.branchId,
        status: primary.status,
        branchAffiliations: affiliations,
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
    const affiliations: any[] = Array.isArray(u.branchAffiliations) && u.branchAffiliations.length > 0
      ? u.branchAffiliations
      : Array.isArray(u.memberships) && u.memberships.length > 0
      ? u.memberships
      : [];

    const searchLower = userSearchFilter.toLowerCase();
    const matchesSearch =
      !userSearchFilter ||
      u.name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.oabNumber?.toLowerCase().includes(searchLower) ||
      affiliations.some((a: any) => a.email?.toLowerCase().includes(searchLower) || a.phone?.includes(userSearchFilter));

    const matchesBranch =
      userBranchFilter === 'ALL' ||
      u.branchId === userBranchFilter ||
      affiliations.some((a: any) => a.branchId === userBranchFilter);

    const matchesRole =
      userRoleFilter === 'ALL' ||
      u.roleId === userRoleFilter ||
      affiliations.some((a: any) => a.roleId === userRoleFilter);

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
          onClick={() => setActiveTab('BRANDING')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'BRANDING'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4 text-indigo-600" />
          <span>Papel Timbrado & Identidade Visual</span>
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

      {/* 2. IDENTIDADE VISUAL & PAPEL TIMBRADO FORENSE */}
      {activeTab === 'BRANDING' && (
        <BrandingSettingsTab
          currentTenant={currentTenant || null}
          onTenantUpdated={(updated) => {
            if (onSaveTenant) {
              onSaveTenant(updated);
            }
          }}
        />
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
              const affiliations: any[] = Array.isArray(u.branchAffiliations) && u.branchAffiliations.length > 0
                ? u.branchAffiliations
                : Array.isArray(u.memberships) && u.memberships.length > 0
                ? u.memberships
                : [
                    {
                      branchId: u.branchId,
                      roleId: u.roleId,
                      email: u.email,
                      phone: u.phone,
                      status: u.status || 'ACTIVE',
                      isPrimary: true,
                    },
                  ];

              const primaryAff = affiliations.find((a: any) => a.isPrimary) || affiliations[0];

              return (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="relative group/avatar shrink-0">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={u.name}
                          className="w-11 h-11 rounded-full ring-2 ring-slate-100 object-cover cursor-pointer"
                          onClick={() => handleOpenEditUserModal(u)}
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenEditUserModal(u)}
                          title="Alterar foto / dados do usuário"
                          className="absolute inset-0 rounded-full bg-slate-900/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-slate-900 text-sm truncate">{u.name}</h3>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              primaryAff?.status === 'ACTIVE' || u.status === 'ACTIVE' || u.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {primaryAff?.status === 'ACTIVE' || u.status === 'ACTIVE' || u.active !== false ? 'Ativo' : 'Inativo'}
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

                    {/* Multi-Branch Affiliations List */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          Filiais Vinculadas
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {affiliations.length} {affiliations.length === 1 ? 'filial' : 'filiais'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {affiliations.map((aff: any, idx: number) => {
                          const affBranch = branches.find((b) => b.id === aff.branchId);
                          const affRole = roles.find((r) => r.id === aff.roleId);
                          return (
                            <div
                              key={aff.id || idx}
                              className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                                aff.isPrimary
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900 flex items-center gap-1 text-[11px] truncate">
                                  {affBranch ? `${affBranch.name} (${affBranch.city}/${affBranch.state})` : aff.branchName || 'Filial'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {aff.isPrimary && (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                      Principal
                                    </span>
                                  )}
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                                      aff.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : aff.status === 'INVITED'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {aff.status === 'ACTIVE' ? 'Ativo' : aff.status === 'INVITED' ? 'Convidado' : 'Suspenso'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">Função RBAC:</span>
                                <span className="font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                                  {affRole?.name || aff.roleName || 'Membro'}
                                </span>
                              </div>

                              {(aff.email || aff.phone) && (
                                <div className="pt-1 border-t border-slate-200/60 flex flex-col gap-0.5 text-[10px] text-slate-600 font-mono">
                                  {aff.email && (
                                    <div className="flex items-center gap-1 truncate">
                                      <Mail className="w-3 h-3 text-slate-400 shrink-0 font-sans" />
                                      <span className="truncate">{aff.email}</span>
                                    </div>
                                  )}
                                  {aff.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400 shrink-0 font-sans" />
                                      <span>{aff.phone}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditUserModal(u)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar e Vincular</span>
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

      {/* 7. DATABASE & MULTI-NODE DISASTER RECOVERY (DR) */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6">
          {/* Production Real Environment & Purge Slate Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-900/60 space-y-4 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ambiente de Produção Ativo
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Base Limpa para Casos Reais
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Gabriela Capitani Advocacia
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Ambiente produtivo pronto para operar. Você pode gerenciar abaixo os nós de réplica (DR Multi-Região), executar failover de contingência e testar a sincronização criptográfica dos dados.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpar Dados Fictícios / Reset Produção</span>
                </button>
              </div>
            </div>

            {purgeFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-200 text-xs font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{purgeFeedback}</span>
              </div>
            )}
          </div>

          {/* Full Multi-Node Cluster & Disaster Recovery Console */}
          <DatabaseDRTab />
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
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingUser ? 'Editar Usuário / Membro da Equipe' : 'Cadastrar Novo Usuário na Equipe'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gerencie os dados cadastrais e as lotações individualizadas em filiais
                  </p>
                </div>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-4 text-xs">
              {/* Informações Gerais */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Dados Pessoais do Usuário
                </h3>

                {/* Seletor & Uploader de Foto / Avatar */}
                <AvatarPicker
                  value={userFormData.avatarUrl}
                  onChange={(url) => setUserFormData({ ...userFormData, avatarUrl: url })}
                  name={userFormData.name || 'Advogado'}
                />

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
                    <label className="block text-slate-700 mb-1 font-semibold">E-mail Principal / Pessoal</label>
                    <input
                      type="email"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      placeholder="mariana@pessoal.com ou corporativo"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Telefone Principal / WhatsApp</label>
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
              </div>

              {/* Lotações e Vínculos Multi-Filiais */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      Lotações em Filiais & Perfil RBAC Individualizado *
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Vincule uma ou mais filiais com Função RBAC, e-mail, telefone e status específicos para cada unidade.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBranchAffiliation}
                    disabled={branches.length > 0 && userFormData.branchAffiliations.length >= branches.length}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={branches.length > 0 && userFormData.branchAffiliations.length >= branches.length ? 'Todas as filiais já foram vinculadas' : 'Vincular a outra filial'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Vincular a Outra Filial</span>
                  </button>
                </div>

                {userFormData.branchAffiliations.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-center text-amber-800">
                    <p className="font-semibold">Nenhuma filial vinculada.</p>
                    <p className="text-[11px] mt-1">Clique no botão acima para vincular o membro a ao menos uma filial.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userFormData.branchAffiliations.map((aff, index) => {
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border transition-all space-y-3 ${
                            aff.isPrimary
                              ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-200/50'
                              : 'bg-slate-50/80 border-slate-200'
                          }`}
                        >
                          {/* Top Affiliation Bar */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {index + 1}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">
                                Vínculo Filial #{index + 1}
                              </span>
                              {aff.isPrimary ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  Lotação Principal
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryBranch(index)}
                                  className="text-[10px] font-medium text-slate-500 hover:text-amber-700 flex items-center gap-1 border border-dashed border-slate-300 hover:border-amber-400 px-2 py-0.5 rounded-full bg-white hover:bg-amber-50 transition-colors"
                                >
                                  Definir como Principal
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={userFormData.branchAffiliations.length <= 1}
                              onClick={() => handleRemoveBranchAffiliation(index)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title={
                                userFormData.branchAffiliations.length <= 1
                                  ? 'O membro precisa estar vinculado a pelo menos uma filial'
                                  : 'Desvincular esta filial'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Branch & Role Selection */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-700 mb-1 font-semibold">
                                Unidade de Lotação (Filial) *
                              </label>
                              <select
                                required
                                value={aff.branchId}
                                onChange={(e) => handleUpdateAffiliation(index, 'branchId', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                              >
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name} ({b.city}/{b.state})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-700 mb-1 font-semibold">
                                Função / Perfil RBAC nesta Filial *
                              </label>
                              <select
                                required
                                value={aff.roleId}
                                onChange={(e) => handleUpdateAffiliation(index, 'roleId', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Branch Specific Email, Phone, Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-slate-700 mb-1 font-semibold">
                                E-mail Institucional na Filial
                              </label>
                              <input
                                type="email"
                                value={aff.email}
                                onChange={(e) => handleUpdateAffiliation(index, 'email', e.target.value)}
                                placeholder="mariana.sp@escritorio.adv.br"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono text-[11px]"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 mb-1 font-semibold">
                                Telefone / Ramal na Filial
                              </label>
                              <input
                                type="text"
                                value={aff.phone}
                                onChange={(e) => handleUpdateAffiliation(index, 'phone', e.target.value)}
                                placeholder="(11) 98765-4321"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono text-[11px]"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 mb-1 font-semibold">
                                Status nesta Filial *
                              </label>
                              <select
                                value={aff.status}
                                onChange={(e) => handleUpdateAffiliation(index, 'status', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                              >
                                <option value="ACTIVE">Ativo (Acesso Liberado)</option>
                                <option value="INVITED">Convidado (Pendente)</option>
                                <option value="SUSPENDED">Inativo / Suspenso</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
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

      {/* Confirmation Modal for Purging Demo Data */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Limpar Dados Fictícios?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Esta ação irá purgar permanentemente todos os processos, prazos, audiências, recebíveis e clientes de demonstração, deixando o sistema 100% limpo em modo de produção.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="font-semibold text-slate-800">O que será mantido intacto:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Escritório: <strong>Gabriela Capitani Advocacia</strong></li>
                <li>Unidade: <strong>Matriz Principal (Pindamonhangaba/SP)</strong></li>
                <li>Advogada: <strong>Dra. Gabriela M. Manni Capitani</strong></li>
                <li>Estrutura de permissões RBAC e tabelas PostgreSQL</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurgingDemo}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePurgeDemoData}
                disabled={isPurgingDemo}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isPurgingDemo ? 'animate-spin' : ''}`} />
                <span>{isPurgingDemo ? 'Limpando Dados...' : 'Confirmar e Limpar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
