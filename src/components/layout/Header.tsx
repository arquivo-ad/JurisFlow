import React, { useState } from 'react';
import {
  Scale,
  Search,
  Bell,
  Building,
  MapPin,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Plus,
  Crown,
  UserCheck,
  LogOut,
  Building2,
} from 'lucide-react';
import { Tenant, Branch, User, Role, Notification } from '../../types';
import { canAccessModule } from '../../utils/rbac';

interface HeaderProps {
  currentTenant: Tenant | null;
  tenants?: Tenant[];
  branches?: Branch[];
  activeBranch?: Branch | null;
  currentBranch?: Branch | null;
  currentUser?: User | null;
  currentRole?: Role | null;
  allUsers?: User[];
  notifications?: Notification[];
  onSwitchTenant?: (tenantId: string) => void;
  onSwitchBranch?: (branchId: string) => void;
  onSwitchUser?: (userId: string) => void;
  onOpenNewTenantModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenSearch?: () => void;
  onNavigate?: (module: string) => void;
  onQuickAction?: (action: 'NEW_CASE' | 'NEW_DEADLINE' | 'NEW_CLIENT' | 'AI_PROMPT') => void;
  onMarkNotificationRead?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTenant,
  tenants = [],
  branches = [],
  activeBranch,
  currentBranch,
  currentUser,
  currentRole,
  allUsers = [],
  notifications = [],
  onSwitchTenant = (_tenantId: string) => {},
  onSwitchBranch = (_branchId: string) => {},
  onSwitchUser = (_userId: string) => {},
  onOpenNewTenantModal,
  onOpenLoginModal,
  onOpenSearch = () => {},
  onNavigate = (_module: string) => {},
  onQuickAction = (_action: 'NEW_CASE' | 'NEW_DEADLINE' | 'NEW_CLIENT' | 'AI_PROMPT') => {},
  onMarkNotificationRead = (_id: string) => {},
}) => {
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeBranchToUse = activeBranch || currentBranch || (branches && branches[0]) || null;
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;

  const isSuperAdmin =
    currentUser?.id === 'u-superadmin' ||
    currentUser?.email?.includes('superadmin') ||
    currentRole?.code === 'SUPER_ADMIN';

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'DEADLINE_ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'HEARING_ALERT':
        return <Scale className="w-4 h-4 text-amber-400" />;
      case 'AI_COMPLETE':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      case 'PAYMENT_RECEIVED':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileCheck className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Left: Branding & Tenant/Branch Selector */}
      <div className="flex items-center gap-3 md:gap-6">
        {/* Brand */}
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition-colors">
            <Scale className="w-4 h-4 text-white stroke-[2.2]" />
          </div>
          <div className="hidden sm:block">
            <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1">
              Juris<span className="text-indigo-600">Flow</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block -mt-1 font-semibold">
              SaaS Jurídico Multi-Tenant
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Tenant Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTenantDropdown(!showTenantDropdown);
              setShowBranchDropdown(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 transition-colors shadow-sm"
          >
            <Building className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <div className="text-left max-w-[130px] md:max-w-[180px] truncate">
              <span className="font-semibold block truncate leading-tight text-slate-900">
                {currentTenant?.tradeName || currentTenant?.name || 'Escritório'}
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Plano {currentTenant?.plan || 'Enterprise'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-1" />
          </button>

          {showTenantDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-40">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{isSuperAdmin ? 'Todos os Escritórios (SaaS)' : 'Meus Escritórios Vinculados'}</span>
                <span className="text-[10px] text-indigo-600 font-mono">({tenants.length})</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSwitchTenant(t.id);
                      setShowTenantDropdown(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      t.id === currentTenant?.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{t.cnpj}</p>
                    </div>
                    {t.id === currentTenant?.id && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Action to create new office / tenant - ONLY for Super Admin */}
              {isSuperAdmin && onOpenNewTenantModal && (
                <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowTenantDropdown(false);
                      onOpenNewTenantModal();
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-2 transition-colors border border-indigo-200/50 shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="truncate">
                      <span>Cadastrar Novo Escritório</span>
                      <span className="block text-[10px] text-indigo-500 font-normal">Super Admin / Provisionamento</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Branch Switcher */}
        {branches.length > 0 && (
          <div className="relative hidden lg:block">
            <button
              onClick={() => {
                setShowBranchDropdown(!showBranchDropdown);
                setShowTenantDropdown(false);
                setShowUserMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span className="truncate max-w-[120px] font-medium">{activeBranchToUse?.name || 'Filial Principal'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showBranchDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-40">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Filiais do Escritório
                </div>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSwitchBranch(b.id);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                      b.id === activeBranchToUse?.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="truncate font-medium">{b.name}</p>
                      <p className="text-[10px] text-slate-400">{b.city} - {b.state}</p>
                    </div>
                    {b.isMain && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        Matriz
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center: Global Search Bar trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 rounded-full bg-slate-100 border border-transparent hover:border-slate-200 hover:bg-white text-slate-500 text-xs transition-all shadow-none group focus:ring-2 focus:ring-indigo-500"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <span className="text-slate-500">Buscar processos, clientes, CNJ, prazos...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-full text-slate-400 border border-slate-200 shadow-2xs">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action, AI Studio, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Super Admin Badge Indicator */}
        {isSuperAdmin && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300/80 text-amber-900 text-[11px] font-bold shadow-2xs">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>Super Admin SaaS</span>
          </div>
        )}

        {/* Search button mobile */}
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 md:hidden hover:text-slate-900"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Quick Actions Button */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Novo</span>
          </button>

          {showQuickMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-40">
              {isSuperAdmin && onOpenNewTenantModal && (
                <>
                  <button
                    onClick={() => {
                      onOpenNewTenantModal();
                      setShowQuickMenu(false);
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs bg-amber-50 text-amber-900 hover:bg-amber-100 flex items-center gap-2 font-semibold transition-colors border border-amber-200 mb-1"
                  >
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Novo Escritório (SaaS)</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                </>
              )}

              {canAccessModule('cases', currentUser, currentRole) && (
                <button
                  onClick={() => {
                    onQuickAction('NEW_CASE');
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">Novo Processo / Caso</span>
                </button>
              )}

              {canAccessModule('calendar', currentUser, currentRole) && (
                <button
                  onClick={() => {
                    onQuickAction('NEW_DEADLINE');
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="font-medium">Novo Prazo Processual</span>
                </button>
              )}

              {canAccessModule('crm', currentUser, currentRole) && (
                <button
                  onClick={() => {
                    onQuickAction('NEW_CLIENT');
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Novo Cliente / Pessoa</span>
                </button>
              )}

              {canAccessModule('ai-gateway', currentUser, currentRole) && (
                <>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => {
                      onQuickAction('AI_PROMPT');
                      setShowQuickMenu(false);
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-medium"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>AI Gateway Jurídico</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-40">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Notificações & Prazos ({unreadCount})
                </span>
                <button
                  onClick={() => {
                    notifications.forEach((n) => onMarkNotificationRead(n.id));
                  }}
                  className="text-[11px] text-indigo-600 hover:underline font-medium"
                >
                  Marcar todas como lidas
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      onMarkNotificationRead(notif.id);
                      if (notif.link) onNavigate(notif.link);
                      setShowNotifDropdown(false);
                    }}
                    className={`p-2.5 rounded-lg transition-colors cursor-pointer text-left ${
                      notif.read ? 'hover:bg-slate-50 opacity-70' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-white border border-slate-200 flex-shrink-0 mt-0.5 shadow-2xs">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile & Login / Role Switcher Popover */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-1.5 cursor-pointer hover:opacity-90 transition-opacity rounded-lg p-1 hover:bg-slate-100 text-left"
          >
            <div className="relative">
              <img
                src={
                  currentUser?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={currentUser?.name || 'Advogado'}
                className="w-8 h-8 rounded-full ring-2 ring-indigo-500/20 object-cover"
              />
              {isSuperAdmin && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center text-slate-900 ring-1 ring-white">
                  <Crown className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.name || 'Dr. Carlos Silveira'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>{currentRole?.name || (isSuperAdmin ? 'Super Admin SaaS' : 'Sócio Administrador')}</span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden xl:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-40">
              {/* User summary */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      currentUser?.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={currentUser?.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                        {currentRole?.name || (isSuperAdmin ? 'Super Admin' : 'Sócio Admin')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1">
                {isSuperAdmin && onOpenNewTenantModal && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenNewTenantModal();
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-2 transition-colors border border-amber-200/60"
                  >
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>+ Provisionar Novo Escritório</span>
                  </button>
                )}

                {canAccessModule('settings', currentUser, currentRole) && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Governança, RBAC & LGPD</span>
                  </button>
                )}

                {onOpenLoginModal && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenLoginModal();
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-semibold"
                  >
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Alternar Conta / Login</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

