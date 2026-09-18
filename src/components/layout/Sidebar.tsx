import React from 'react';
import {
  LayoutDashboard,
  Users,
  Scale,
  Search,
  CalendarDays,
  FileText,
  DollarSign,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Shield,
  Server,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { User, Role } from '../../types';
import { canAccessModule, isSuperAdmin, isSocioAdmin } from '../../utils/rbac';

export type ActiveModule =
  | 'dashboard'
  | 'crm'
  | 'cases'
  | 'legal-search'
  | 'calendar'
  | 'tasks'
  | 'documents'
  | 'financial'
  | 'ai-gateway'
  | 'settings'
  | 'admin';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  pendingDeadlinesCount: number;
  currentUser?: User | null;
  currentRole?: Role | null;
  systemVersion?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  pendingDeadlinesCount,
  currentUser,
  currentRole,
  systemVersion = '1.2.0',
}) => {
  const canAccessAdmin = isSuperAdmin(currentUser, currentRole) || isSocioAdmin(currentUser, currentRole);

  const allMenuItems = [
    {
      id: 'dashboard' as ActiveModule,
      label: 'Visão Geral & KPIs',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-indigo-600',
    },
    {
      id: 'crm' as ActiveModule,
      label: 'CRM & Clientes',
      icon: Users,
      badge: null,
      color: 'text-slate-600',
    },
    {
      id: 'cases' as ActiveModule,
      label: 'Processos & Casos',
      icon: Scale,
      badge: null,
      color: 'text-slate-600',
    },
    {
      id: 'legal-search' as ActiveModule,
      label: 'Pesquisa & Tribunais',
      icon: Search,
      badge: 'DataJud / STF',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200 font-semibold',
      color: 'text-sky-600',
    },
    {
      id: 'calendar' as ActiveModule,
      label: 'Agenda & Prazos CPC',
      icon: CalendarDays,
      badge: pendingDeadlinesCount > 0 ? `${pendingDeadlinesCount} Fatais` : null,
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
      color: 'text-slate-600',
    },
    {
      id: 'tasks' as ActiveModule,
      label: 'Tarefas & Kanban',
      icon: CheckSquare,
      badge: null,
      color: 'text-slate-600',
    },
    {
      id: 'documents' as ActiveModule,
      label: 'Documentos & Modelos',
      icon: FileText,
      badge: null,
      color: 'text-slate-600',
    },
    {
      id: 'financial' as ActiveModule,
      label: 'Financeiro & Honorários',
      icon: DollarSign,
      badge: 'PIX / Boleto',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      color: 'text-slate-600',
    },
    {
      id: 'ai-gateway' as ActiveModule,
      label: 'AI Gateway Jurídico',
      icon: Sparkles,
      badge: 'Gemini 3.7',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-bold',
      color: 'text-indigo-600',
    },
    {
      id: 'settings' as ActiveModule,
      label: 'Governança & Escritório',
      icon: ShieldCheck,
      badge: null,
      color: 'text-slate-600',
    },
  ];

  // Strictly filter menu items according to user role permissions
  const authorizedMenuItems = allMenuItems.filter((item) =>
    canAccessModule(item.id, currentUser, currentRole)
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex h-[calc(100vh-57px)] sticky top-[57px]">
      {/* Navigation Menu */}
      <div className="p-4 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Módulos Operacionais</span>
          <span className="text-[10px] text-indigo-600 font-mono">
            {authorizedMenuItems.length}/{allMenuItems.length}
          </span>
        </div>

        {/* User Role Badge in Sidebar */}
        <div className="mb-3 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-left">
          <Shield className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Perfil de Acesso</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {currentRole?.name || 'Membro'}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {authorizedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-900'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                      item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Platform Administration / Admin Section */}
        {canAccessAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="px-2 py-1 text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center justify-between">
              <span>Plataforma & Gestão</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ROOT
              </span>
            </div>

            <button
              onClick={() => onSelectModule('admin')}
              className={`w-full mt-1 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                activeModule === 'admin'
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Server
                  className={`w-4 h-4 flex-shrink-0 ${
                    activeModule === 'admin' ? 'text-amber-400' : 'text-slate-700 group-hover:text-slate-900'
                  }`}
                />
                <div className="text-left">
                  <span className="block truncate leading-tight font-semibold">Painel /admin</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Módulos, Flags & Updates</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-mono font-bold border border-emerald-500/30">
                v{systemVersion}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info Box: Sleek Upgrade / Motor Box */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 text-left space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Projeto Advocacia
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">v{systemVersion}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Plataforma modular jurídica com motor CPC/2015 e IA integrada.
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium border-t border-slate-800/80">
            <span>Ambiente: Localhost</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> OK
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
