import React, { useState } from 'react';
import {
  QrCode,
  Barcode,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Tenant, BankingIntegrationConfig } from '../../types';
import { api } from '../../services/api';
import { generatePixCopiaECola } from '../../lib/pixUtils';

interface PaymentChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSuccess: () => void;
  onShowToast: (msg: string) => void;
}

export const PaymentChannelsModal: React.FC<PaymentChannelsModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSuccess,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const currentChannels = tenant?.settings?.paymentChannels || {
    pix: true,
    boleto: false,
    creditCard: false,
  };

  // Channels Selection
  const [selectedPix, setSelectedPix] = useState(currentChannels.pix ?? true);
  const [selectedBoleto, setSelectedBoleto] = useState(currentChannels.boleto ?? false);
  const [selectedCreditCard, setSelectedCreditCard] = useState(currentChannels.creditCard ?? false);

  // PIX Configuration
  const defaultPixKey = tenant?.settings?.pixKey || 'gabriela.mannicapitani@gmail.com';
  const [pixKey, setPixKey] = useState(defaultPixKey);
  const [pixKeyType, setPixKeyType] = useState(tenant?.settings?.pixKeyType || 'EMAIL');
  const [pixRecipientName, setPixRecipientName] = useState(
    tenant?.settings?.pixRecipientName || tenant?.name || 'Gabriela Capitani Advocacia'
  );
  const [pixConfirmed, setPixConfirmed] = useState(Boolean(tenant?.settings?.pixKey));
  const [copiedCode, setCopiedCode] = useState(false);

  // Banking / Proprietary Gateway Integration Request
  const currentBanking = tenant?.settings?.bankingIntegration;
  const [hasExistingBank, setHasExistingBank] = useState<boolean>(true);
  const [bankProvider, setBankProvider] = useState<string>(currentBanking?.provider || 'ITAU_PJ');
  const [bankProviderName, setBankProviderName] = useState<string>(currentBanking?.providerName || 'Banco Itaú Empresas PJ');
  const [accountType, setAccountType] = useState<string>(currentBanking?.accountType || 'CONTA_CORRENTE_PJ');
  const [agency, setAgency] = useState<string>(currentBanking?.agency || '0142');
  const [accountNumber, setAccountNumber] = useState<string>(currentBanking?.accountNumber || '84521');
  const [accountDigit, setAccountDigit] = useState<string>(currentBanking?.accountDigit || '9');
  const [holderName, setHolderName] = useState<string>(currentBanking?.holderName || tenant?.name || 'Gabriela Capitani Sociedade Individual de Advocacia');
  const [holderCnpj, setHolderCnpj] = useState<string>(currentBanking?.holderCnpj || tenant?.cnpj || '54.128.932/0001-47');
  const [financialContactName, setFinancialContactName] = useState<string>(currentBanking?.financialContactName || 'Dra. Gabriela Manni Capitani');
  const [financialContactEmail, setFinancialContactEmail] = useState<string>(currentBanking?.financialContactEmail || 'gabriela.capitani@adv.oab.sp.org.br');
  const [notes, setNotes] = useState<string>(currentBanking?.notes || '');

  const [saving, setSaving] = useState(false);

  // Live test PIX Copia e Cola with office details
  const samplePixPayload = generatePixCopiaECola({
    pixKey: pixKey || defaultPixKey,
    recipientName: pixRecipientName || tenant?.name || 'Advocacia',
    city: 'Sao Paulo',
    amount: 0,
    txId: 'SETUP01',
    description: 'Chave Oficial Escritorio',
  });

  const handleCopyPix = () => {
    navigator.clipboard.writeText(samplePixPayload);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    onShowToast('Código PIX Oficial copiado com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Update Payment Channels & PIX info
      await api.updatePaymentChannels({
        pix: selectedPix,
        boleto: selectedBoleto,
        creditCard: selectedCreditCard,
        pixKey,
        pixKeyType,
        pixRecipientName,
        pixBankName: bankProviderName,
      });

      // 2. If Boleto or Credit Card is selected, submit banking integration request for SuperAdmin analysis
      if (selectedBoleto || selectedCreditCard) {
        await api.requestBankingIntegration({
          provider: bankProvider as any,
          providerName: bankProviderName,
          accountType: accountType as any,
          agency,
          accountNumber,
          accountDigit,
          holderName,
          holderCnpj,
          financialContactName,
          financialContactEmail,
          notes,
        });
        onShowToast('Canais atualizados e Pedido de Homologação Bancária enviado ao SuperAdmin com sucesso!');
      } else {
        onShowToast('Canais de pagamento do escritório configurados com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar canais:', err);
      onShowToast('Erro ao atualizar configurações de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Canais de Pagamento & Gateway do Escritório
                </h2>
                <p className="text-xs text-slate-500">
                  {tenant?.name || 'Escritório'} — Selecione as modalidades aceitas e vincule seus serviços bancários
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* STEP 1: Select payment methods */}
          <div className="space-y-3">
            <label className="block text-slate-900 font-bold text-xs uppercase tracking-wider">
              1. Selecione as Formas de Pagamento que o Escritório Deseja Trabalhar:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PIX Option */}
              <div
                onClick={() => setSelectedPix(!selectedPix)}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                  selectedPix
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedPix}
                    onChange={(e) => setSelectedPix(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm">PIX Oficial</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Liquidação imediata direta na conta bancária do escritório.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600">Taxa 0% / Instantâneo</span>
              </div>

              {/* Boleto Bancário Option */}
              <div
                onClick={() => setSelectedBoleto(!selectedBoleto)}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                  selectedBoleto
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedBoleto}
                    onChange={(e) => setSelectedBoleto(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Boleto Bancário</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Registro CIP / Febraban via banco próprio PJ ou gateway.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-indigo-600">Requer homologação</span>
              </div>

              {/* Cartão de Crédito Option */}
              <div
                onClick={() => setSelectedCreditCard(!selectedCreditCard)}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                  selectedCreditCard
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedCreditCard}
                    onChange={(e) => setSelectedCreditCard(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Cartão de Crédito</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Parcelamento de honorários em até 12x/24x com checkout seguro.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-sky-600">Requer homologação</span>
              </div>
            </div>
          </div>

          {/* STEP 2: PIX Key Confirmation & Live Display */}
          {selectedPix && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs">
                    Chave PIX Cadastrada do Escritório
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                  Recebimento Direto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Chave PIX do Escritório *</label>
                  <input
                    type="text"
                    required
                    value={pixKey}
                    onChange={(e) => {
                      setPixKey(e.target.value);
                      setPixConfirmed(false);
                    }}
                    placeholder="E-mail, CNPJ, Celular ou Chave Aleatória"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tipo da Chave</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="EMAIL">E-mail</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="PHONE">Telefone / Celular</option>
                    <option value="RANDOM">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Nome do Beneficiário / Titular da Conta *</label>
                  <input
                    type="text"
                    required
                    value={pixRecipientName}
                    onChange={(e) => setPixRecipientName(e.target.value)}
                    placeholder="Nome da Sociedade de Advogados ou Titular"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Confirmation & QR Code preview */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPixConfirmed(true);
                      onShowToast('Chave PIX confirmada para uso nas faturas e contratos!');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      pixConfirmed
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{pixConfirmed ? 'Chave PIX Confirmada' : 'Confirmar esta Chave'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copiado!' : 'Copiar Copia-e-Cola Padrão'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Os pagamentos via PIX emitirão comprovantes instantâneos no fechamento.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Banking / Proprietary Gateway Details (Boleto / Cartão) */}
          {(selectedBoleto || selectedCreditCard) && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-4">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-amber-950 text-xs">
                    Integração de Boleto & Cartão de Crédito com o Banco do Escritório
                  </h3>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Para que as movimentações ocorram com segurança jurídica e fiscal diretamente na conta do escritório, informe qual instituição bancária ou gateway PJ é utilizado. O <strong>SuperAdmin receberá automaticamente uma notificação para homologar as APIs oficiais</strong> no ambiente do escritório.
                  </p>
                </div>
              </div>

              {currentBanking?.status === 'PENDING_ANALYSIS' && (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-lg flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    Pedido de Análise Pendente com o SuperAdmin
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-semibold">
                    Em Homologação
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Banco / Serviço Atual *</label>
                  <select
                    value={bankProvider}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBankProvider(val);
                      if (val === 'ITAU_PJ') setBankProviderName('Banco Itaú Empresas PJ');
                      else if (val === 'BRADESCO_PJ') setBankProviderName('Banco Bradesco PJ');
                      else if (val === 'SANTANDER_PJ') setBankProviderName('Banco Santander PJ');
                      else if (val === 'BB_PJ') setBankProviderName('Banco do Brasil PJ');
                      else if (val === 'INTER_PJ') setBankProviderName('Banco Inter PJ');
                      else if (val === 'CORA') setBankProviderName('Cora Conta PJ');
                      else if (val === 'ASAAS') setBankProviderName('Asaas Gestão Financeira');
                      else if (val === 'MERCADO_PAGO') setBankProviderName('Mercado Pago Gateway');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="ITAU_PJ">Itaú Empresas PJ (API Oficial)</option>
                    <option value="BRADESCO_PJ">Bradesco PJ (API Oficial)</option>
                    <option value="SANTANDER_PJ">Santander PJ</option>
                    <option value="BB_PJ">Banco do Brasil PJ</option>
                    <option value="INTER_PJ">Banco Inter PJ (API Aberta)</option>
                    <option value="CORA">Cora PJ</option>
                    <option value="ASAAS">Asaas Pagamentos PJ</option>
                    <option value="MERCADO_PAGO">Mercado Pago PJ</option>
                    <option value="OUTRO">Outro Banco / Serviço Digital Particular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nome da Instituição / Gateway</label>
                  <input
                    type="text"
                    value={bankProviderName}
                    onChange={(e) => setBankProviderName(e.target.value)}
                    placeholder="Ex: Banco Itaú Empresas PJ"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Agência Bancária *</label>
                  <input
                    type="text"
                    required
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    placeholder="0142"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Conta Corrente PJ com Dígito *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="84521"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <input
                      type="text"
                      required
                      value={accountDigit}
                      onChange={(e) => setAccountDigit(e.target.value)}
                      placeholder="9"
                      className="w-14 text-center bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">CNPJ do Titular da Conta *</label>
                  <input
                    type="text"
                    required
                    value={holderCnpj}
                    onChange={(e) => setHolderCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">E-mail do Responsável Financeiro *</label>
                  <input
                    type="email"
                    required
                    value={financialContactEmail}
                    onChange={(e) => setFinancialContactEmail(e.target.value)}
                    placeholder="financeiro@escritorio.adv.br"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Observações ou Requisitos Específicos para a Equipe de TI</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Já possuímos convênio de cobrança registrado com o Itaú. Enviar chave de API ou webhook para integração."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{saving ? 'Registrando Configurações...' : 'Salvar e Ativar Canais'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
