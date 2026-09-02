import React, { useState } from 'react';
import {
  DollarSign,
  CreditCard,
  QrCode,
  FileCheck,
  Plus,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Copy,
  Check,
  Sparkles,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  FinancialOverviewMetrics,
  FeeContract,
  AccountReceivable,
  Charge,
  Client,
  Case,
  Person,
} from '../../types';

interface FinancialViewProps {
  financial: FinancialOverviewMetrics | null;
  contracts: FeeContract[];
  receivables: AccountReceivable[];
  clients: (Client & { person?: Person })[];
  cases: Case[];
  onSaveContract: (data: Partial<FeeContract>) => Promise<void>;
  onGenerateCharge: (receivableId: string, method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => Promise<Charge>;
  onSimulatePayment: (chargeId: string) => Promise<void>;
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  financial = null,
  contracts = [],
  receivables = [],
  clients = [],
  cases = [],
  onSaveContract = async (_data: Partial<FeeContract>) => {},
  onGenerateCharge = async (_receivableId: string, _method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => ({} as Charge),
  onSimulatePayment = async (_chargeId: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'RECEIVABLES' | 'CONTRACTS' | 'OVERVIEW'>('RECEIVABLES');

  // Selected Charge Modal (Mercado Pago modal)
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [currentReceivable, setCurrentReceivable] = useState<AccountReceivable | null>(null);
  const [loadingCharge, setLoadingCharge] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // New Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [contractType, setContractType] = useState<'FIXED' | 'SUCCESS_FEE' | 'MONTHLY_RETAINER'>('FIXED');
  const [totalValue, setTotalValue] = useState('24000');
  const [installmentsCount, setInstallmentsCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCharge = async (rec: AccountReceivable, method: 'PIX' | 'BOLETO') => {
    setCurrentReceivable(rec);
    setLoadingCharge(true);
    try {
      if (rec.charge) {
        setSelectedCharge(rec.charge);
      } else {
        const charge = await onGenerateCharge(rec.id, method);
        setSelectedCharge(charge);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCharge(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!selectedCharge) return;
    setSimulating(true);
    try {
      await onSimulatePayment(selectedCharge.id);
      setSelectedCharge({ ...selectedCharge, status: 'PAID', mpStatus: 'approved' });
      if (currentReceivable) {
        currentReceivable.status = 'RECEIVED';
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleCreateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const theCase = cases.find((c) => c.id === selectedCaseId);

    try {
      await onSaveContract({
        title: contractTitle,
        clientId: selectedClientId,
        caseId: selectedCaseId,
        caseNumber: theCase?.caseNumber,
        type: contractType,
        totalValue: Number(totalValue) || 0,
        installmentsCount: Number(installmentsCount) || 1,
      });
      setIsContractModalOpen(false);
      setContractTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPix = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-indigo-600" />
            Gestão Financeira & Mercado Pago Gateway
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Controle de honorários contratuais, parcelamentos, cobrança instantânea via PIX/Boleto e conciliação automática
          </p>
        </div>

        <button
          onClick={() => setIsContractModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Contrato de Honorários</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Faturamento do Mês</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            R$ {(financial?.totalFaturadoMes || 180000).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +14.2% vs. mês anterior
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Recebido (Liquidado)</span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            R$ {(financial?.totalRecebidoMes || 148500).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">via Mercado Pago & PIX</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">A Receber em Aberto</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono mt-2">
            R$ {(financial?.totalAReceberAberto || 31500).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">vencimentos futuros</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Taxa de Inadimplência</span>
          <p className="text-2xl font-extrabold text-rose-600 font-mono mt-2">
            {financial?.taxaInadimplencia || 2.8}%
          </p>
          <span className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 text-rose-500" /> Cobrança automatizada ativa
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start">
        <button
          onClick={() => setActiveTab('RECEIVABLES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'RECEIVABLES'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <span>Contas a Receber & Cobranças ({receivables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'CONTRACTS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-indigo-600" />
          <span>Contratos de Honorários ({contracts.length})</span>
        </button>
      </div>

      {/* TAB 1: RECEIVABLES & MERCADO PAGO CHARGING */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Cliente / Descrição</th>
                    <th className="px-4 py-3">Processo</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Valor (R$)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação de Cobrança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivables.map((rec) => {
                    const isReceived = rec.status === 'RECEIVED';
                    const isOverdue = rec.status === 'OVERDUE';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900">{rec.clientName}</p>
                          <p className="text-[11px] text-slate-500">{rec.title}</p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                          {rec.caseNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                            {rec.dueDate}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          R$ {rec.amount.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-semibold border ${
                              isReceived
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isReceived ? 'Recebido / Pago' : isOverdue ? 'Vencido' : 'Em Aberto'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isReceived ? (
                            <span className="text-emerald-600 font-mono text-xs flex items-center justify-end gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Conciliado
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenCharge(rec, 'PIX')}
                                className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1 transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>PIX / Boleto</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTRACTS */}
      {activeTab === 'CONTRACTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((fc) => (
            <div key={fc.id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                    {fc.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{fc.contractNumber}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{fc.title}</h3>
                <p className="text-xs text-slate-600 font-medium">Cliente: {fc.clientName}</p>
                {fc.caseNumber && <p className="text-[11px] font-mono text-slate-500">{fc.caseNumber}</p>}

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Total:</span>
                    <span className="font-mono font-bold text-emerald-600">R$ {fc.totalValue.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parcelamento:</span>
                    <span className="font-mono text-slate-700">{fc.installmentsCount} parcelas</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Início: {fc.startDate}</span>
                <span className="text-emerald-600 font-semibold">{fc.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mercado Pago Interactive Checkout & Live Payment Simulator Modal */}
      {selectedCharge && currentReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-xs">
                  MP
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Mercado Pago Gateway</h2>
                  <p className="text-[11px] text-slate-500 font-mono">ID: {selectedCharge.mpPaymentId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCharge(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-slate-500">Cobrança para:</p>
                <p className="font-bold text-slate-900 text-sm">{currentReceivable.clientName}</p>
                <div className="flex justify-between pt-1 font-mono">
                  <span className="text-slate-500">Valor da Cobrança:</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    R$ {selectedCharge.amount.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* PIX Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
                  <QrCode className="w-4 h-4" />
                  <span>PIX Instantâneo (Liquidação Imediata)</span>
                </div>

                <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                  {/* Generated QR pattern */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      selectedCharge.pixCopiaECola || 'jurisflow-pix'
                    )}`}
                    alt="QR Code PIX"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Código PIX Copia e Cola:</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      readOnly
                      value={selectedCharge.pixCopiaECola || ''}
                      className="bg-transparent text-[10px] font-mono text-slate-800 flex-1 truncate focus:outline-none"
                    />
                    <button
                      onClick={() => copyPix(selectedCharge.pixCopiaECola || '')}
                      className="p-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] flex items-center gap-1 px-2 font-semibold border border-indigo-100"
                    >
                      {copiedPix ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Webhook Simulator Button */}
              {selectedCharge.status !== 'PAID' ? (
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-indigo-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Teste do Webhook Mercado Pago
                    </span>
                    <span className="font-mono text-emerald-600">Pronto</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Clique abaixo para simular o recebimento do webhook de aprovação, baixando a conta a receber e gerando recibo!
                  </p>
                  <button
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{simulating ? 'Processando Webhook...' : 'Simular Pagamento Instantâneo'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <p className="text-emerald-700 font-bold text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Pagamento Aprovado e Conciliado!
                  </p>
                  <p className="text-[11px] text-slate-600">
                    O status da conta foi alterado para RECEBIDO e o recibo de quitação foi gerado na auditoria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Fee Contract */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Novo Contrato de Prestação de Serviços Jurídicos
              </h2>
              <button onClick={() => setIsContractModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContractSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Título do Contrato *</label>
                <input
                  type="text"
                  required
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="Ex: Contrato de Honorários Cíveis & Arbitragem"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Cliente Contratante *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.person?.name} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Modalidade de Honorários</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FIXED">Honorários Fixos / Parcelados</option>
                    <option value="SUCCESS_FEE">Honorários de Êxito (Ad Exitum)</option>
                    <option value="MONTHLY_RETAINER">Partido Mensal (Retainer)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Valor Total (R$) *</label>
                  <input
                    type="number"
                    required
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Número de Parcelas *</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  required
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Gerando...' : 'Gerar Contrato e Parcelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
