import React, { useState, useEffect, useCallback } from 'react';
import {
  Sidebar,
  Header,
  GlobalSearchModal,
  ToastNotification,
  AppModule,
} from './components/layout';
import { DashboardView } from './components/dashboard/DashboardView';
import { CrmView } from './components/crm/CrmView';
import { CasesView } from './components/cases/CasesView';
import { CalendarView } from './components/calendar/CalendarView';
import { DocumentsView } from './components/documents/DocumentsView';
import { FinancialView } from './components/financial/FinancialView';
import { AIGatewayView } from './components/ai/AIGatewayView';
import { SettingsView } from './components/settings/SettingsView';
import { NewTenantModal } from './components/settings/NewTenantModal';
import { LoginModal } from './components/common/LoginModal';
import { AccessDeniedView } from './components/common/AccessDeniedView';
import { canAccessModule, getDefaultModuleForRole, isSuperAdmin } from './utils/rbac';

import { api } from './services/api';
import {
  BootstrapData,
  Tenant,
  Branch,
  User,
  Role,
  Person,
  Client,
  Lead,
  Case,
  CaseMovement,
  Deadline,
  Hearing,
  Diligence,
  Notification,
  DocumentItem,
  DocumentTemplate,
  FeeContract,
  AccountReceivable,
  Charge,
  LGPDConsent,
} from './types';

export default function App() {
  const [activeModule, setActiveModule] = useState<AppModule>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [financialMetrics, setFinancialMetrics] = useState<any>(null);

  const [persons, setPersons] = useState<Person[]>([]);
  const [clients, setClients] = useState<(Client & { person?: Person })[]>([]);
  const [leads, setLeads] = useState<(Lead & { person?: Person })[]>([]);

  const [cases, setCases] = useState<Case[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [diligences, setDiligences] = useState<Diligence[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  const [contracts, setContracts] = useState<FeeContract[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);

  const [roles, setRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [lgpdConsents, setLgpdConsents] = useState<LGPDConsent[]>([]);

  // AI Gateway Tab Target State
  const [aiInitialTab, setAiInitialTab] = useState<string>('extract');

  // Super Admin & Auth Modals
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Keyboard shortcut listener for Global Search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Bootstrap Data on initialization
  const loadBootstrapData = useCallback(async () => {
    setLoading(true);
    try {
      const data: BootstrapData = await api.getBootstrap();
      setTenants(data.tenants || []);
      setCurrentTenant(data.currentTenant || null);
      setBranches(data.branches || []);
      setCurrentBranch(data.currentBranch || null);
      setUsers(data.users || []);
      setCurrentUser(data.currentUser || null);

      setDashboardMetrics(data.dashboard);
      setFinancialMetrics(data.financial);

      setPersons(data.persons || []);
      setClients(data.clients || []);
      setLeads(data.leads || []);

      setCases(data.cases || []);
      setDeadlines(data.deadlines || []);
      setHearings(data.hearings || []);
      setDiligences(data.diligences || []);
      setNotifications(data.notifications || []);

      setDocuments(data.documents || []);
      setTemplates(data.templates || []);

      setContracts(data.contracts || []);
      setReceivables(data.receivables || []);

      setRoles(data.roles || []);
      setAuditLogs(data.auditLogs || []);
      setLgpdConsents(data.lgpdConsents || []);
    } catch (err) {
      console.error('Failed to load bootstrap data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrapData();
  }, [loadBootstrapData]);

  // Tenant / Branch / User switch handlers
  const handleSwitchTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      api.setTenant(tenant.id);
      showToast(`Escritório alternado para ${tenant.name}`);
      loadBootstrapData();
    }
  };

  const handleSwitchBranch = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (branch) {
      setCurrentBranch(branch);
      api.setBranch(branch.id);
      showToast(`Unidade alterada para ${branch.name}`);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      setCurrentUser(targetUser);
      api.setUser(targetUser.id);
      
      const targetRole = roles.find((r) => r.id === targetUser.roleId) || null;
      if (!canAccessModule(activeModule, targetUser, targetRole)) {
        const defaultMod = getDefaultModuleForRole(targetRole, targetUser);
        setActiveModule(defaultMod);
      }

      showToast(`Sessão alternada para: ${targetUser.name} (${targetRole?.name || 'Membro'})`);
      await loadBootstrapData();
    }
  };

  const handleCreateTenant = async (payload: any) => {
    const res = await api.createTenant(payload);
    showToast(`Escritório provisionado com sucesso!`);
    await loadBootstrapData();
    if (res && res.tenant && res.tenant.id) {
      handleSwitchTenant(res.tenant.id);
    }
    return res;
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleQuickAction = (action: 'NEW_CASE' | 'NEW_DEADLINE' | 'NEW_CLIENT' | 'AI_PROMPT') => {
    switch (action) {
      case 'NEW_CASE':
        setActiveModule('cases');
        break;
      case 'NEW_DEADLINE':
        setActiveModule('calendar');
        break;
      case 'NEW_CLIENT':
        setActiveModule('crm');
        break;
      case 'AI_PROMPT':
        handleOpenAiGateway('extract');
        break;
    }
  };

  // Quick navigation to AI Gateway with specific tab and preset prompt
  const handleOpenAiGateway = (tab: string, prompt?: string) => {
    setAiInitialTab(tab);
    setActiveModule('ai-gateway');
  };

  // --- MUTATION HANDLERS ---
  const handleSavePerson = async (data: Partial<Person>) => {
    const saved = await api.createPerson(data);
    setPersons((prev) => [saved, ...prev]);
    showToast('Pessoa cadastrada com sucesso');
  };

  const handleSaveClient = async (data: Partial<Client>) => {
    const saved = await api.createClient(data);
    setClients((prev) => [saved, ...prev]);
    showToast(`Cliente ${saved.clientCode} cadastrado com sucesso`);
  };

  const handleSaveLead = async (data: Partial<Lead>) => {
    const saved = await api.createLead(data);
    setLeads((prev) => [saved, ...prev]);
    showToast('Lead cadastrado no pipeline CRM');
  };

  const handleSaveCase = async (data: Partial<Case>) => {
    const saved = await api.createCase(data);
    setCases((prev) => [saved, ...prev]);
    showToast(`Processo ${saved.caseNumber} autuado no sistema`);
  };

  const handleAddMovement = async (caseId: string, data: Partial<CaseMovement>) => {
    const saved = await api.addCaseMovement(caseId, data);
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, movements: [saved, ...c.movements] } : c))
    );
    showToast('Andamento processual registrado');
  };

  const handleSaveDeadline = async (data: Partial<Deadline>) => {
    const saved = await api.createDeadline(data);
    setDeadlines((prev) => [saved, ...prev]);
    showToast(`Prazo fatal "${saved.title}" agendado para ${saved.dueDate}`);
  };

  const handleCompleteDeadline = async (id: string) => {
    const updated = await api.completeDeadline(id);
    setDeadlines((prev) => prev.map((d) => (d.id === id ? updated : d)));
    showToast('Prazo cumprido com sucesso!');
  };

  const handleSaveDocument = async (data: Partial<DocumentItem>) => {
    const saved = await api.createDocument(data);
    setDocuments((prev) => [saved, ...prev]);
    showToast(`Documento "${saved.title}" arquivado no repositório`);
  };

  const handleSaveContract = async (data: Partial<FeeContract>) => {
    const saved = await api.createContract(data);
    setContracts((prev) => [saved, ...prev]);
    // Refresh receivables
    loadBootstrapData();
    showToast(`Contrato ${saved.contractNumber} gerado`);
  };

  const handleGenerateCharge = async (receivableId: string, method: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): Promise<Charge> => {
    const charge = await api.generateCharge(receivableId, method);
    showToast('Cobrança emitida via Mercado Pago Gateway');
    return charge;
  };

  const handleSimulatePayment = async (chargeId: string) => {
    await api.simulatePayment(chargeId);
    // Reload data to reflect received status & audit logs
    await loadBootstrapData();
    showToast('Webhook processado: Pagamento liquidado e conciliado!');
  };

  const handleSaveLgpdConsent = async (data: Partial<LGPDConsent>) => {
    const saved = await api.createLgpdConsent(data);
    setLgpdConsents((prev) => [saved, ...prev]);
    showToast('Termo de consentimento LGPD registrado com sucesso');
  };

  const handleSaveTenant = async (data: Partial<Tenant>) => {
    if (!currentTenant) return;
    const updated = await api.updateTenant(currentTenant.id, data);
    setCurrentTenant(updated);
    setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    showToast('Dados e configurações do escritório atualizados');
  };

  const handleSaveBranch = async (data: Partial<Branch>) => {
    if (data.id && branches.some((b) => b.id === data.id)) {
      const updated = await api.updateBranch(data.id, data);
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (currentBranch?.id === updated.id) setCurrentBranch(updated);
      showToast('Unidade / Filial atualizada com sucesso');
    } else {
      const created = await api.createBranch(data);
      setBranches((prev) => [...prev, created]);
      showToast('Nova filial registrada com sucesso');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    await api.deleteBranch(id);
    setBranches((prev) => prev.filter((b) => b.id !== id));
    showToast('Unidade / Filial removida com sucesso');
  };

  const handleSaveRole = async (data: Partial<Role>) => {
    if (data.id && roles.some((r) => r.id === data.id)) {
      const updated = await api.updateRole(data.id, data);
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Função "${updated.name}" atualizada com sucesso`);
    } else {
      const created = await api.createRole(data);
      setRoles((prev) => [...prev, created]);
      showToast(`Nova função "${created.name}" criada`);
    }
  };

  const handleDeleteRole = async (id: string) => {
    await api.deleteRole(id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
    showToast('Função RBAC removida com sucesso');
  };

  const handleSaveUser = async (data: Partial<User> & { roleId?: string; branchId?: string; status?: string }) => {
    if (data.id && users.some((u) => u.id === data.id)) {
      const updated = await api.updateUser(data.id, data);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(`Usuário "${updated.name}" atualizado`);
    } else {
      const created = await api.createUser(data);
      setUsers((prev) => [created, ...prev]);
      showToast(`Novo usuário "${created.name}" cadastrado na equipe`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast('Usuário desvinculado da equipe');
  };

  const pendingDeadlinesCount = deadlines.filter((d) => d.status === 'PENDING').length;
  const activeUserRole = roles.find((r) => r.id === currentUser?.roleId) || roles[0] || null;

  if (loading && !currentTenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 font-['Plus_Jakarta_Sans']">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse mb-4 shadow-sm">
          <span className="text-indigo-600 font-bold font-['Cinzel'] text-xl">JF</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">Carregando JurisFlow SaaS...</p>
        <p className="text-xs text-slate-400 mt-1">Conectando ao banco forense e IA Gateway</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Top Header */}
      <Header
        currentTenant={currentTenant}
        tenants={tenants}
        branches={branches}
        activeBranch={currentBranch}
        currentBranch={currentBranch}
        currentUser={currentUser}
        currentRole={activeUserRole}
        notifications={notifications}
        onSwitchTenant={handleSwitchTenant}
        onSwitchBranch={handleSwitchBranch}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigate={(mod) => setActiveModule(mod as AppModule)}
        onQuickAction={handleQuickAction}
        onMarkNotificationRead={handleMarkNotificationRead}
        onOpenNewTenantModal={() => setIsNewTenantModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          pendingDeadlinesCount={pendingDeadlinesCount}
          currentUser={currentUser}
          currentRole={activeUserRole}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {!canAccessModule(activeModule, currentUser, activeUserRole) ? (
            <AccessDeniedView
              module={activeModule}
              currentUser={currentUser}
              currentRole={activeUserRole}
              onNavigate={(mod) => setActiveModule(mod)}
            />
          ) : (
            <>
              {activeModule === 'dashboard' && (
                <DashboardView
                  metrics={dashboardMetrics}
                  deadlines={deadlines}
                  cases={cases}
                  onNavigate={(mod) => setActiveModule(mod as AppModule)}
                  onOpenAiGateway={handleOpenAiGateway}
                />
              )}

              {activeModule === 'crm' && (
                <CrmView
                  clients={clients}
                  persons={persons}
                  users={users}
                  onSavePerson={handleSavePerson}
                  onSaveClient={handleSaveClient}
                  onSelectClientCases={(_clientId) => setActiveModule('cases')}
                />
              )}

              {activeModule === 'cases' && (
                <CasesView
                  cases={cases}
                  persons={persons}
                  users={users}
                  onSaveCase={handleSaveCase}
                  onAddMovement={handleAddMovement}
                  onOpenAiGateway={handleOpenAiGateway}
                />
              )}

              {activeModule === 'calendar' && (
                <CalendarView
                  deadlines={deadlines}
                  hearings={hearings}
                  diligences={diligences}
                  cases={cases}
                  users={users}
                  onSaveDeadline={handleSaveDeadline}
                  onCompleteDeadline={handleCompleteDeadline}
                  onOpenAiGateway={handleOpenAiGateway}
                />
              )}

              {activeModule === 'documents' && (
                <DocumentsView
                  documents={documents}
                  templates={templates}
                  cases={cases}
                  persons={persons}
                  onSaveDocument={handleSaveDocument}
                  onOpenAiGateway={handleOpenAiGateway}
                />
              )}

              {activeModule === 'financial' && (
                <FinancialView
                  financial={financialMetrics}
                  contracts={contracts}
                  receivables={receivables}
                  clients={clients}
                  cases={cases}
                  onSaveContract={handleSaveContract}
                  onGenerateCharge={handleGenerateCharge}
                  onSimulatePayment={handleSimulatePayment}
                />
              )}

              {activeModule === 'ai-gateway' && (
                <AIGatewayView
                  cases={cases}
                  initialTab={aiInitialTab}
                  onSaveExtractedDeadline={handleSaveDeadline}
                  onSaveDraftedDoc={(title, cat, content) =>
                    handleSaveDocument({ title, category: cat, content, status: 'DRAFT' })
                  }
                />
              )}

              {activeModule === 'settings' && (
                <SettingsView
                  currentTenant={currentTenant}
                  tenants={tenants}
                  branches={branches}
                  users={users}
                  roles={roles}
                  auditLogs={auditLogs}
                  lgpdConsents={lgpdConsents}
                  persons={persons}
                  currentUser={currentUser}
                  currentRole={activeUserRole}
                  onSaveTenant={handleSaveTenant}
                  onSaveBranch={handleSaveBranch}
                  onDeleteBranch={handleDeleteBranch}
                  onSaveRole={handleSaveRole}
                  onDeleteRole={handleDeleteRole}
                  onSaveUser={handleSaveUser}
                  onDeleteUser={handleDeleteUser}
                  onSaveLgpdConsent={handleSaveLgpdConsent}
                  onSwitchTenant={handleSwitchTenant}
                  onOpenNewTenantModal={() => setIsNewTenantModalOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        cases={cases}
        clients={clients}
        deadlines={deadlines}
        onSelectCase={(c) => {
          setIsSearchOpen(false);
          setActiveModule('cases');
        }}
        onSelectClient={(cl) => {
          setIsSearchOpen(false);
          setActiveModule('crm');
        }}
        onSelectDeadline={(dl) => {
          setIsSearchOpen(false);
          setActiveModule('calendar');
        }}
      />

      {/* Super Admin Tenant Provisioning Modal */}
      <NewTenantModal
        isOpen={isNewTenantModalOpen}
        onClose={() => setIsNewTenantModalOpen(false)}
        onSubmit={handleCreateTenant}
        onSuccessSwitch={(tenantId) => handleSwitchTenant(tenantId)}
      />

      {/* Account / User Switcher Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={handleSwitchUser}
      />

      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
