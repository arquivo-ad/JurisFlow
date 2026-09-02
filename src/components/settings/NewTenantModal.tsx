import React, { useState } from 'react';
import {
  Building2,
  X,
  Check,
  Crown,
  Sparkles,
  MapPin,
  UserCheck,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  Scale,
  Award,
} from 'lucide-react';
import { Tenant } from '../../types';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenantData: any) => Promise<any>;
  onSuccessSwitch?: (tenantId: string) => void;
}

export const NewTenantModal: React.FC<NewTenantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSuccessSwitch,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Tenant info
    name: '',
    tradeName: '',
    cnpj: '',
    oabOfficeRegister: '',
    slug: '',
    plan: 'ENTERPRISE' as 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE',
    contactEmail: '',
    contactPhone: '',
    pixKey: '',
    // Main Branch info
    mainBranchName: 'Matriz Principal',
    mainBranchCode: 'MAT-01',
    mainBranchCity: 'São Paulo',
    mainBranchState: 'SP',
    mainBranchAddress: 'Av. Paulista, 1000 - Bela Vista',
    mainBranchPhone: '',
    mainBranchEmail: '',
    // Initial Managing Partner (Sócio Admin)
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminOabNumber: '',
    adminOabUf: 'SP',
  });

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const autoSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name: val,
      tradeName: prev.tradeName || val,
      slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.cnpj.trim() || !formData.contactEmail.trim()) {
      alert('Por favor, preencha os campos obrigatórios do escritório (Razão Social, CNPJ e E-mail institucional).');
      return;
    }

    if (!formData.adminName.trim() || !formData.adminEmail.trim()) {
      alert('Por favor, informe os dados do Sócio Administrador Responsável.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onSubmit(formData);
      if (res && res.tenant) {
        setCreatedTenant(res.tenant);
      } else if (res && res.id) {
        setCreatedTenant(res);
      }
    } catch (err: any) {
      alert(`Erro ao cadastrar escritório: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCreatedTenant(null);
    setFormData({
      name: '',
      tradeName: '',
      cnpj: '',
      oabOfficeRegister: '',
      slug: '',
      plan: 'ENTERPRISE',
      contactEmail: '',
      contactPhone: '',
      pixKey: '',
      mainBranchName: 'Matriz Principal',
      mainBranchCode: 'MAT-01',
      mainBranchCity: 'São Paulo',
      mainBranchState: 'SP',
      mainBranchAddress: 'Av. Paulista, 1000 - Bela Vista',
      mainBranchPhone: '',
      mainBranchEmail: '',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
      adminOabNumber: '',
      adminOabUf: 'SP',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-sm">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Provisionar Novo Escritório (Tenant)</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Super Admin SaaS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Cadastro institucional, provisionamento de matriz, perfis RBAC e primeiro acesso do Sócio Administrador
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {createdTenant ? (
          /* Success Screen */
          <div className="p-8 text-center flex-1 flex flex-col items-center justify-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="max-w-md">
              <h4 className="text-lg font-bold text-slate-900">
                Escritório Cadastrado com Sucesso!
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                A estrutura institucional para <strong className="text-slate-900">{createdTenant.name}</strong> foi provisionada com isolamento multi-tenant, Matriz inicial e conta do Sócio Administrador.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full max-w-md text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Razão Social:</span>
                <span className="font-semibold text-slate-800">{createdTenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CNPJ:</span>
                <span className="font-mono text-slate-800">{createdTenant.cnpj}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plano SaaS:</span>
                <span className="font-semibold text-indigo-600">{createdTenant.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sócio Administrador:</span>
                <span className="font-medium text-slate-800">{formData.adminName} ({formData.adminEmail})</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Permanecer no Painel Atual
              </button>
              {onSuccessSwitch && (
                <button
                  type="button"
                  onClick={() => {
                    onSuccessSwitch(createdTenant.id);
                    handleResetAndClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Acessar Novo Escritório Agora</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Dados do Escritório */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Dados da Sociedade / Escritório
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-semibold text-slate-700">
                    Razão Social (Nome da Sociedade) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mattos, Rocha & Advogados Associados"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nome Fantasia</label>
                  <input
                    type="text"
                    placeholder="Ex: Mattos Rocha Advocacia"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    CNPJ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Registro de Sociedade na OAB</label>
                  <input
                    type="text"
                    placeholder="Ex: OAB/DF nº 12.345"
                    value={formData.oabOfficeRegister}
                    onChange={(e) => setFormData({ ...formData, oabOfficeRegister: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Plano SaaS
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                  >
                    <option value="BASIC">Plano Basic (Até 5 Usuários)</option>
                    <option value="PROFESSIONAL">Plano Professional (Até 25 Usuários + IA)</option>
                    <option value="ENTERPRISE">Plano Enterprise (Ilimitado + Multi-Filiais)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    E-mail Institucional de Contato <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="contato@escritorio.adv.br"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Telefone Geral / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="(11) 3456-7890"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-semibold text-slate-700">Chave PIX Institucional para Honorários</label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="CNPJ, E-mail, Telefone ou Chave Aleatória"
                      value={formData.pixKey}
                      onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Sede / Matriz Principal */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Sede / Matriz Principal
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-semibold text-slate-700">Nome da Unidade Sede</label>
                  <input
                    type="text"
                    value={formData.mainBranchName}
                    onChange={(e) => setFormData({ ...formData, mainBranchName: e.target.value })}
                    placeholder="Matriz Principal"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Código Interno</label>
                  <input
                    type="text"
                    value={formData.mainBranchCode}
                    onChange={(e) => setFormData({ ...formData, mainBranchCode: e.target.value })}
                    placeholder="MAT-01"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Cidade</label>
                  <input
                    type="text"
                    value={formData.mainBranchCity}
                    onChange={(e) => setFormData({ ...formData, mainBranchCity: e.target.value })}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.mainBranchState}
                    onChange={(e) => setFormData({ ...formData, mainBranchState: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Telefone da Sede</label>
                  <input
                    type="text"
                    value={formData.mainBranchPhone}
                    onChange={(e) => setFormData({ ...formData, mainBranchPhone: e.target.value })}
                    placeholder="(11) 3456-7890"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="font-semibold text-slate-700">Endereço Completo</label>
                  <input
                    type="text"
                    value={formData.mainBranchAddress}
                    onChange={(e) => setFormData({ ...formData, mainBranchAddress: e.target.value })}
                    placeholder="Av. Paulista, 1000, 15º Andar - Bela Vista"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Sócio Administrador */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Sócio Administrador Responsável (Primeiro Acesso)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Nome Completo do Advogado <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Roberto Mattos"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    E-mail de Login do Administrador <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="roberto@mattosrocha.adv.br"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Telefone / Celular</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-2">
                    <label className="font-semibold text-slate-700">Inscrição OAB</label>
                    <input
                      type="text"
                      placeholder="123.456"
                      value={formData.adminOabNumber}
                      onChange={(e) => setFormData({ ...formData, adminOabNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.adminOabUf}
                      onChange={(e) => setFormData({ ...formData, adminOabUf: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Provisionando Escritório...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Cadastrar e Provisionar Escritório</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
