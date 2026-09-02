import React from 'react';
import {
  LayoutDashboard,
  Users,
  Scale,
  CalendarDays,
  FileText,
  DollarSign,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { User, Role } from '../../types';
import { canAccessModule, isSuperAdmin, isSocioAdmin } from '../../utils/rbac';

export type ActiveModule =
  | 'dashboard'
  | 'crm'
  | 'cases'
  | 'calendar'
  | 'documents'
  | 'financial'
  | 'ai-gateway'
  | 'settings';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  pendingDeadlinesCount: number;
  currentUser?: User | null;
  currentRole?: Role | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  pendingDeadlinesCount,
  currentUser,
  currentRole,
}) => {
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
      id: 'calendar' as ActiveModule,
      label: 'Agenda & Prazos CPC',
      icon: CalendarDays,
      badge: pendingDeadlinesCount > 0 ? `${pendingDeadlinesCount} Fatais` : null,
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
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
      label: 'Financeiro & Mercado Pago',
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
      label: 'Governança, RBAC & LGPD',
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
          <span>Módulos Liberados</span>
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
      </div>

      {/* Footer Info Box: Sleek Upgrade / Motor Box */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-left space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
            <span className="flex items-center gap-1.5 text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Motor CPC / IA
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold">Online</span>
          </div>
          <p className="text-[11px] text-indigo-700 leading-relaxed">
            Contagem em dias úteis com suspensão de recesso forense (Art. 220 CPC).
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-indigo-600 font-medium">
            <span>DJe Sync Ativo</span>
            <span className="text-indigo-800 font-bold">v2.4 Pro</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
