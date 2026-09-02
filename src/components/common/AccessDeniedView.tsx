import React from 'react';
import { ShieldAlert, Lock, ArrowRight, Home, DollarSign, Scale, Users } from 'lucide-react';
import { AppModule, getModuleRestrictionReason, getDefaultModuleForRole } from '../../utils/rbac';
import { Role, User } from '../../types';

interface AccessDeniedViewProps {
  module: AppModule;
  currentUser: User | null;
  currentRole: Role | null;
  onNavigate: (module: AppModule) => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  module,
  currentUser,
  currentRole,
  onNavigate,
}) => {
  const restriction = getModuleRestrictionReason(module, currentRole);
  const defaultMod = getDefaultModuleForRole(currentRole, currentUser);

  const getModuleLabel = (mod: AppModule) => {
    switch (mod) {
      case 'financial':
        return 'Financeiro & Honorários';
      case 'cases':
        return 'Processos & Casos';
      case 'calendar':
        return 'Agenda & Prazos';
      case 'crm':
        return 'CRM & Clientes';
      case 'documents':
        return 'Documentos';
      case 'ai-gateway':
        return 'AI Gateway';
      case 'settings':
        return 'Governança';
      default:
        return 'Visão Geral';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-12 flex items-center justify-center min-h-[600px] bg-slate-50/50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8 stroke-[2]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Controle de Acesso RBAC Rígido
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-2">
            {restriction.title}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            {restriction.description}
          </p>
        </div>

        {/* User context badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span>Usuário Conectado:</span>
            <span className="font-semibold text-slate-900">{currentUser?.name}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Perfil / Cargo:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {currentRole?.name || 'Membro'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
            <span>Perfil Exigido:</span>
            <span className="font-medium text-amber-700">{restriction.requiredRole}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => onNavigate(defaultMod)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-102"
          >
            <span>Ir para meu módulo principal ({getModuleLabel(defaultMod)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Voltar ao Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
