import React, { useState } from 'react';
import {
  UserCheck,
  X,
  Crown,
  Scale,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  Briefcase,
} from 'lucide-react';
import { User, Role } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  currentRole?: Role | null;
  onSelectUser: (userId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users = [],
  currentUser,
  currentRole,
  onSelectUser,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const targetEmail = customEmail.trim().toLowerCase();
    if (!targetEmail) return;

    const matchedUser = users.find((u) => u.email.toLowerCase() === targetEmail);
    if (matchedUser) {
      onSelectUser(matchedUser.id);
      onClose();
    } else {
      setErrorMsg(`Nenhum usuário cadastrado encontrado com o e-mail: "${customEmail}"`);
    }
  };

  const getUserBadge = (user: User) => {
    if (user.id === 'u-superadmin' || user.email?.includes('superadmin')) {
      return {
        label: 'Super Admin SaaS',
        color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        icon: <Crown className="w-3 h-3 text-amber-600" />,
      };
    }
    if (user.oabNumber) {
      return {
        label: `Advogado (OAB/${user.oabUf || 'SP'} ${user.oabNumber})`,
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: <Scale className="w-3 h-3 text-indigo-600" />,
      };
    }
    if (user.name?.toLowerCase().includes('financeiro') || user.email?.includes('financeiro')) {
      return {
        label: 'Controladoria & Financeiro',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <Briefcase className="w-3 h-3 text-emerald-600" />,
      };
    }
    return {
      label: 'Membro da Equipe',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <ShieldCheck className="w-3 h-3 text-slate-500" />,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Autenticação & Troca de Usuário</h3>
              <p className="text-xs text-slate-300">
                Selecione um perfil ou acesse com sua conta de Super Admin / Advogado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active User Card */}
          {currentUser && (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-semibold">
                      Sessão Ativa
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">{currentUser.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Profile Switch */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Contas de Acesso Rápido (Perfis de Demonstração & Governança)
            </label>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {users.map((u) => {
                const badge = getUserBadge(u);
                const isCurrent = u.id === currentUser?.id;

                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u.id);
                      onClose();
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={
                          u.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                        }
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600">
                            {u.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Email Login Form */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ou Entrar com outro E-mail Cadastrado
            </label>
            <form onSubmit={handleCustomLogin} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="ex: superadmin@jurisflow.adv.br"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Entrar
              </button>
            </form>
            {errorMsg && <p className="text-[11px] text-rose-500 font-medium">{errorMsg}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Multi-Tenant & RBAC Ativos</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
