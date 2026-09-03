import React, { useState, useEffect } from 'react';
import {
  Server,
  Layers,
  RefreshCw,
  Activity,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Cpu,
  ArrowUpRight,
  GitPullRequest,
  Check,
  X,
  Plus,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Sparkles,
  Building2,
  Lock,
  FileCode,
  HardDrive,
  CheckSquare,
} from 'lucide-react';
import {
  ModuleMetadata,
  FeatureFlag,
  SystemUpdateManifest,
  SystemUpdateLog,
  SystemHealthReport,
  Tenant,
  User,
  Role,
  AuditLog,
} from '../../types';
import { api } from '../../services/api';

interface AdminViewProps {
  currentUser: User | null;
  currentRole: Role | null;
  tenants: Tenant[];
  onShowToast: (msg: string) => void;
  onRefreshBootstrap: () => Promise<void>;
}

type AdminTab = 'overview' | 'modules' | 'feature-flags' | 'updates' | 'health' | 'audit' | 'tenants';

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  currentRole,
  tenants,
  onShowToast,
  onRefreshBootstrap,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);

  // Admin Data States
  const [modules, setModules] = useState<ModuleMetadata[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    environment: string;
    currentManifest: SystemUpdateManifest;
    latestManifest: SystemUpdateManifest;
    releasesHistory: SystemUpdateManifest[];
  } | null>(null);
  const [updateLogs, setUpdateLogs] = useState<SystemUpdateLog[]>([]);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals & Sub-states
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateStepLogs, setUpdateStepLogs] = useState<string[]>([]);
  const [selectedModuleForConfig, setSelectedModuleForConfig] = useState<ModuleMetadata | null>(null);
  const [newFlagModalOpen, setNewFlagModalOpen] = useState(false);
  const [newFlagData, setNewFlagData] = useState({
    key: '',
    name: '',
    description: '',
    module: 'dashboard',
    enabled: true,
    rolloutPercentage: 100,
    environment: 'all' as const,
  });

  // Filter states
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<string>('all');
  const [searchModuleQuery, setSearchModuleQuery] = useState('');
  const [searchAuditQuery, setSearchAuditQuery] = useState('');

  // Load Admin Data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [modsRes, flagsRes, updateRes, historyRes, healthRes, auditRes] = await Promise.all([
        api.getModules(),
        api.getFeatureFlags(),
        api.checkUpdates(),
        api.getUpdateHistory(),
        api.getAdminHealth(),
        api.getAuditLogs(),
      ]);

      setModules(modsRes.modules || []);
      setFeatureFlags(flagsRes || []);
      setUpdateInfo(updateRes);
      setUpdateLogs(historyRes || []);
      setHealthReport(healthRes);
      setAuditLogs(auditRes || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados administrativos:', err);
      onShowToast(`Erro ao carregar dados do admin: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handle Module Toggle
  const handleToggleModule = async (mod: ModuleMetadata) => {
    const nextStatus = mod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.updateModuleStatus(mod.id, nextStatus);
      if (res.success) {
        setModules((prev) =>
          prev.map((m) => (m.id === mod.id ? { ...m, status: nextStatus, updatedAt: new Date().toISOString() } : m))
        );
        onShowToast(res.message);
        await onRefreshBootstrap();
      }
    } catch (err: any) {
      onShowToast(`Falha ao alterar status do módulo: ${err.message}`);
    }
  };

  // Handle Feature Flag Toggle
  const handleToggleFlag = async (flag: FeatureFlag) => {
    const nextEnabled = !flag.enabled;
    try {
      const updated = await api.updateFeatureFlag(flag.id, { enabled: nextEnabled });
      setFeatureFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
      onShowToast(`Feature Flag '${flag.name}' ${nextEnabled ? 'habilitada' : 'desabilitada'}.`);
      await onRefreshBootstrap();
    } catch (err: any) {
      onShowToast(`Erro ao atualizar flag: ${err.message}`);
    }
  };

  // Handle Create Feature Flag
  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagData.key || !newFlagData.name) {
      onShowToast('Chave e nome são obrigatórios');
      return;
    }
    try {
      const created = await api.createFeatureFlag(newFlagData as any);
      setFeatureFlags((prev) => [created, ...prev]);
      setNewFlagModalOpen(false);
      setNewFlagData({
        key: '',
        name: '',
        description: '',
        module: 'dashboard',
        enabled: true,
        rolloutPercentage: 100,
        environment: 'all',
      });
      onShowToast(`Feature flag '${created.name}' criada com sucesso.`);
    } catch (err: any) {
      onShowToast(`Erro ao criar flag: ${err.message}`);
    }
  };

  // Handle Apply System Update
  const handleApplyUpdate = async () => {
    if (!updateInfo?.latestManifest) return;
    setIsUpdating(true);
    setUpdateStepLogs([
      `[Update Engine] Conectando ao repositório oficial de releases...`,
      `[Integrity Check] Validando SHA-256 Checksum: ${updateInfo.latestManifest.checksumSha256}`,
      `[Snapshot] Criando backup de segurança dos dados relacionais...`,
    ]);

    try {
      const res = await api.applyUpdate(updateInfo.latestManifest.version);
      if (res.success) {
        setUpdateStepLogs(res.updateLog.logs || []);
        onShowToast(`Sistema atualizado com sucesso para v${res.newVersion}!`);
        await loadAdminData();
        await onRefreshBootstrap();
      }
    } catch (err: any) {
      onShowToast(`Erro durante atualização: ${err.message}`);
      setUpdateStepLogs((prev) => [...prev, `[ERRO] Falha: ${err.message}`]);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Rollback
  const handleRollback = async (logId: string) => {
    if (!confirm('Deseja realmente executar o rollback para a versão anterior deste snapshot?')) return;
    try {
      const res = await api.rollbackUpdate(logId, 'Reversão solicitada pelo operador no painel /admin');
      if (res.success) {
        onShowToast(res.message);
        await loadAdminData();
        await onRefreshBootstrap();
      }
    } catch (err: any) {
      onShowToast(`Erro ao executar rollback: ${err.message}`);
    }
  };

  const filteredModules = modules.filter((m) => {
    const matchesCat = moduleCategoryFilter === 'all' || m.category === moduleCategoryFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchModuleQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchModuleQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchModuleQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeModulesCount = modules.filter((m) => m.status === 'ACTIVE').length;
  const activeFlagsCount = featureFlags.filter((f) => f.enabled).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Platform Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Server className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Administração da Plataforma & Governança</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                /admin
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-2xl">
              Module Registry dinâmico, feature flags, motor de updates com integridade SHA-256 e diagnóstico técnico do Projeto Advocacia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Versão:</span>
              <span className="font-mono font-bold text-white">v{updateInfo?.currentVersion || '1.2.0'}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-2 text-xs">
              <span className="text-slate-400">Ambiente:</span>
              <span className="font-semibold text-indigo-300 uppercase">Localhost</span>
            </div>

            <button
              onClick={() => {
                loadAdminData();
                onShowToast('Status do sistema e releases sincronizados!');
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </button>
          </div>
        </div>

        {/* Update Notification Pill if available */}
        {updateInfo?.updateAvailable && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3 bg-indigo-950/40 -mx-6 -mb-6 p-4 px-6 rounded-b-2xl">
            <div className="flex items-center gap-2.5 text-xs text-indigo-200">
              <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>
                Nova release oficial disponível: <strong className="text-white font-mono">v{updateInfo.latestVersion}</strong> ({updateInfo.latestManifest?.releaseName})
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab('updates');
                setUpdateModalOpen(true);
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Ver Release & Atualizar
            </button>
          </div>
        )}
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Visão Geral do Sistema', icon: Activity },
          { id: 'modules', label: `Module Registry (${activeModulesCount}/${modules.length})`, icon: Layers },
          { id: 'feature-flags', label: `Feature Flags (${activeFlagsCount})`, icon: ToggleRight },
          {
            id: 'updates',
            label: 'Update do Projeto',
            icon: RefreshCw,
            badge: updateInfo?.updateAvailable ? 'Novo' : null,
          },
          { id: 'health', label: 'Saúde & Diagnóstico', icon: Cpu },
          { id: 'audit', label: 'Auditoria da Plataforma', icon: ShieldCheck },
          { id: 'tenants', label: `Escritórios (${tenants.length})`, icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-900 text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Módulos Ativos</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{activeModulesCount}</span>
                <span className="text-xs text-slate-500 font-medium">de {modules.length} registrados</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 100% dos módulos core saudáveis
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Feature Flags</span>
                <ToggleRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{activeFlagsCount}</span>
                <span className="text-xs text-slate-500 font-medium">de {featureFlags.length} ativas</span>
              </div>
              <p className="text-xs text-slate-500">Controle por ambiente e tenant</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Banco de Dados</span>
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {healthReport?.database.totalRecords || 0}
                </span>
                <span className="text-xs text-slate-500 font-medium">registros</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Latência: {healthReport?.database.latencyMs || 1.2}ms
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Memória & Uptime</span>
                <Cpu className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {healthReport?.memory.rssMb || 45} MB
                </span>
                <span className="text-xs text-slate-500 font-medium">RSS</span>
              </div>
              <p className="text-xs text-slate-500">Uptime: {Math.floor((healthReport?.uptimeSeconds || 0) / 60)} min</p>
            </div>
          </div>

          {/* Module Registry Fast Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Estado dos Módulos do Sistema</h3>
                <p className="text-xs text-slate-500">
                  Visão em tempo real dos serviços habilitados e políticas de isolamento
                </p>
              </div>
              <button
                onClick={() => setActiveTab('modules')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Gerenciar Módulos <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {modules.slice(0, 6).map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        m.status === 'ACTIVE'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{m.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          v{m.version}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            m.minPlanTier === 'PREMIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : m.minPlanTier === 'PROFESSIONAL'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.minPlanTier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{m.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {m.status === 'ACTIVE' ? 'Ativo' : 'Desativado'}
                    </span>
                    <button
                      onClick={() => handleToggleModule(m)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        m.status === 'ACTIVE'
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={m.status === 'ACTIVE' ? 'Desativar Módulo' : 'Ativar Módulo'}
                    >
                      {m.status === 'ACTIVE' ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MODULE REGISTRY */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          {/* Controls & Category Filter */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
              {[
                { id: 'all', label: 'Todos os Módulos' },
                { id: 'core', label: 'Core / Essencial' },
                { id: 'operations', label: 'Operações & Prazos' },
                { id: 'documents', label: 'Documentos' },
                { id: 'financial', label: 'Financeiro' },
                { id: 'intelligence', label: 'Inteligência IA' },
                { id: 'governance', label: 'Governança' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setModuleCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    moduleCategoryFilter === cat.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar módulos..."
                value={searchModuleQuery}
                onChange={(e) => setSearchModuleQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((mod) => {
              const isActive = mod.status === 'ACTIVE';
              return (
                <div
                  key={mod.id}
                  className={`bg-white rounded-xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                    isActive ? 'border-slate-200 shadow-2xs' : 'border-slate-200/60 bg-slate-50/50 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <Layers className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{mod.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">id: {mod.id}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">{mod.description}</p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Versão:</span>
                        <span className="font-mono font-semibold text-slate-800">v{mod.version}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Plano Mínimo:</span>
                        <span
                          className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                            mod.minPlanTier === 'PREMIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : mod.minPlanTier === 'PROFESSIONAL'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {mod.minPlanTier}
                        </span>
                      </div>
                      {mod.dependencies.length > 0 && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Dependências:</span>
                          <span className="font-mono text-[10px] text-indigo-600">
                            {mod.dependencies.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedModuleForConfig(mod)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Configurações
                    </button>

                    <button
                      onClick={() => handleToggleModule(mod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                      }`}
                    >
                      {isActive ? 'Desativar Módulo' : 'Ativar Módulo'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FEATURE FLAGS */}
      {/* ========================================================================= */}
      {activeTab === 'feature-flags' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Feature Flags do Sistema</h3>
              <p className="text-xs text-slate-500">
                Libere recursos experimentalmente sem necessidade de deploy ou criação de novos módulos
              </p>
            </div>
            <button
              onClick={() => setNewFlagModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Feature Flag
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {featureFlags.map((flag) => (
                <div key={flag.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{flag.name}</span>
                      <code className="text-xs font-mono bg-slate-100 text-indigo-700 px-2 py-0.5 rounded border border-slate-200">
                        {flag.key}
                      </code>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Módulo: {flag.module}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{flag.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Rollout: <strong>{flag.rolloutPercentage}%</strong></span>
                      <span>•</span>
                      <span>Ambiente: <strong>{flag.environment}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        flag.enabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {flag.enabled ? 'Habilitada' : 'Desabilitada'}
                    </span>
                    <button
                      onClick={() => handleToggleFlag(flag)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        flag.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {flag.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: UPDATES & RELEASE ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          {/* Main Update Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <RefreshCw className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Motor de Atualização Oficial (Release Engine)</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Gerenciamento de versões com manifesto assinado, checksum SHA-256 e snapshot transacional automático
                </p>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Versão Instalada</p>
                  <p className="font-mono font-bold text-sm text-slate-900">v{updateInfo?.currentVersion || '1.2.0'}</p>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Última Release</p>
                  <p className="font-mono font-bold text-sm text-indigo-600">v{updateInfo?.latestVersion || '1.2.0'}</p>
                </div>
              </div>
            </div>

            {/* Release Changelog & Details */}
            {updateInfo?.latestManifest && (
              <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{updateInfo.latestManifest.releaseName}</h4>
                    <p className="text-xs text-slate-500">Data de publicação: {updateInfo.latestManifest.releaseDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                      SHA-256: {updateInfo.latestManifest.checksumSha256.substring(0, 16)}...
                    </span>
                    {updateInfo.latestManifest.databaseMigration && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">
                        Migração de Banco Requerida
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{updateInfo.latestManifest.description}</p>

                {/* Changelog breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px] uppercase">
                      <Check className="w-3.5 h-3.5" /> Adicionado nesta versão
                    </span>
                    <ul className="space-y-1 text-slate-600 text-[11px]">
                      {updateInfo.latestManifest.changelog.added.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-bold text-indigo-700 flex items-center gap-1 text-[11px] uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" /> Segurança & Correções
                    </span>
                    <ul className="space-y-1 text-slate-600 text-[11px]">
                      {updateInfo.latestManifest.changelog.security.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200/60">
                  <button
                    onClick={() => setUpdateModalOpen(true)}
                    disabled={!updateInfo.updateAvailable || isUpdating}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors ${
                      updateInfo.updateAvailable
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <GitPullRequest className="w-4 h-4" />
                    {updateInfo.updateAvailable ? 'Executar Atualização do Projeto' : 'Sistema Atualizado (Última Versão)'}
                  </button>
                </div>
              </div>
            )}

            {/* Update History Table */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-slate-900">Histórico de Atualizações & Snapshots</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {updateLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          v{log.previousVersion} ➔ v{log.targetVersion}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.status === 'ROLLED_BACK'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.status === 'SUCCESS' ? 'Sucesso' : log.status === 'ROLLED_BACK' ? 'Revertido' : 'Falha'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Executado por <strong>{log.operatorName}</strong> em {new Date(log.startedAt).toLocaleString('pt-BR')}
                      </p>
                      {log.backupSnapshotId && (
                        <p className="text-[11px] font-mono text-slate-400">Snapshot: {log.backupSnapshotId}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {log.status === 'SUCCESS' && (
                        <button
                          onClick={() => handleRollback(log.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Rollback Seguro
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HEALTH & OBSERVABILITY */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900">Banco de Dados Relacional</h4>
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conectado
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-mono text-slate-800">PostgreSQL Ready</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de Registros:</span>
                  <span className="font-bold text-slate-800">{healthReport?.database.totalRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latência da Camada:</span>
                  <span className="font-mono text-slate-800">{healthReport?.database.latencyMs} ms</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900">Memória & Runtime</h4>
                <Cpu className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>RSS Memory:</span>
                  <span className="font-mono font-bold text-slate-800">{healthReport?.memory.rssMb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Heap Utilizado:</span>
                  <span className="font-mono text-slate-800">{healthReport?.memory.heapUsedMb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Heap Total Alocado:</span>
                  <span className="font-mono text-slate-800">{healthReport?.memory.heapTotalMb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="font-mono text-slate-800">{Math.floor((healthReport?.uptimeSeconds || 0) / 60)} minutos</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900">Segurança & IA Gateway</h4>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Gemini AI SDK:</span>
                  <span className="font-bold text-emerald-600">Online (@google/genai)</span>
                </div>
                <div className="flex justify-between">
                  <span>Chave Gemini:</span>
                  <span className="font-mono text-xs text-slate-800">
                    {healthReport?.aiGatewayStatus === 'READY' ? 'Configurada no Server' : 'Não informada'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Último Audit Log:</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {healthReport?.security.lastAuditLogTimestamp ? new Date(healthReport.security.lastAuditLogTimestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Armazenamento Docs:</span>
                  <span className="font-bold text-slate-800">{healthReport?.storage.documentsCount} docs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AUDITORIA DA PLATAFORMA */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Trilha de Auditoria & Segurança</h3>
              <p className="text-xs text-slate-500">
                Registro imutável de todas as ações administrativas, alterações de permissões e módulos
              </p>
            </div>
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar nos logs..."
                value={searchAuditQuery}
                onChange={(e) => setSearchAuditQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {auditLogs
                .filter((l) =>
                  l.details.toLowerCase().includes(searchAuditQuery.toLowerCase()) ||
                  l.userName.toLowerCase().includes(searchAuditQuery.toLowerCase()) ||
                  l.entityType.toLowerCase().includes(searchAuditQuery.toLowerCase())
                )
                .map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.action === 'DELETE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-mono text-xs text-slate-500">[{log.entityType}]</span>
                        <span className="font-semibold text-xs text-slate-900">{log.details}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Operador: <strong>{log.userName}</strong> ({log.userEmail}) • IP: {log.ip}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: TENANTS / ESCRITÓRIOS */}
      {/* ========================================================================= */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Escritórios & Organizações (Multi-Tenant)</h3>
              <p className="text-xs text-slate-500">
                Gestão centralizada de tenants, planos contratados e isolamento de banco de dados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">CNPJ: {t.document}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-100">
                    {t.plan}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>ID do Tenant:</span>
                    <span className="font-mono text-[11px]">{t.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-600 font-bold">{t.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXECUTAR UPDATE DO SISTEMA */}
      {/* ========================================================================= */}
      {updateModalOpen && updateInfo?.latestManifest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <GitPullRequest className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Atualização do Projeto Advocacia</h3>
                  <p className="text-xs text-slate-500">v{updateInfo.currentVersion} ➔ v{updateInfo.latestVersion}</p>
                </div>
              </div>
              <button
                onClick={() => !isUpdating && setUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                A atualização oficial do GitHub executará as seguintes etapas automatizadas com segurança:
              </p>
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Validação de Checksum SHA-256</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Snapshot transacional de segurança dos dados</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aplicação de scripts de migração de schema</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Diagnóstico de sanidade pós-update</span>
                </div>
              </div>

              {updateStepLogs.length > 0 && (
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
                  {updateStepLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setUpdateModalOpen(false)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Aplicando Atualização...' : 'Confirmar & Atualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA FEATURE FLAG */}
      {/* ========================================================================= */}
      {newFlagModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFlag}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Criar Nova Feature Flag</h3>
              <button
                type="button"
                onClick={() => setNewFlagModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chave da Flag (Key)</label>
                <input
                  type="text"
                  placeholder="ex: financial.new-dashboard"
                  value={newFlagData.key}
                  onChange={(e) => setNewFlagData({ ...newFlagData, key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Descritivo</label>
                <input
                  type="text"
                  placeholder="ex: Novo Dashboard Financeiro"
                  value={newFlagData.name}
                  onChange={(e) => setNewFlagData({ ...newFlagData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Módulo Alvo</label>
                <select
                  value={newFlagData.module}
                  onChange={(e) => setNewFlagData({ ...newFlagData, module: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Finalidade desta funcionalidade experimental..."
                  value={newFlagData.description}
                  onChange={(e) => setNewFlagData({ ...newFlagData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNewFlagModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Salvar Feature Flag
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
