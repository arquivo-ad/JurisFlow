import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Clock,
  Briefcase,
  Search,
  Filter,
  BarChart3,
  Barcode,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
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
import { api } from '../../services/api';

interface UnbilledTimesheetItem {
  taskId: string;
  taskTitle: string;
  category?: string;
  caseId?: string;
  caseNumber?: string;
  clientId?: string;
  clientName?: string;
  logId: string;
  userName: string;
  minutes: number;
  hours: number;
  note: string;
  date: string;
}

interface FinancialViewProps {
  financial: FinancialOverviewMetrics | null;
  contracts: FeeContract[];
  receivables: AccountReceivable[];
  clients: (Client & { person?: Person })[];
  cases: Case[];
  onSaveContract: (data: Partial<FeeContract>) => Promise<void>;
  onGenerateCharge: (receivableId: string, method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => Promise<Charge>;
  onSimulatePayment: (chargeId: string) => Promise<void>;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
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
  onRefresh = () => {},
  onShowToast = (_msg: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'RECEIVABLES' | 'CONTRACTS' | 'TIMESHEET' | 'OVERVIEW'>('RECEIVABLES');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RECEIVED' | 'OVERDUE'>('ALL');

  // Selected Charge Modal (Mercado Pago modal)
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [currentReceivable, setCurrentReceivable] = useState<AccountReceivable | null>(null);
  const [activePaymentMethodTab, setActivePaymentMethodTab] = useState<'PIX' | 'BOLETO'>('PIX');
  const [loadingCharge, setLoadingCharge] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);

  // New Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [contractType, setContractType] = useState<'FIXED' | 'SUCCESS_FEE' | 'MONTHLY_RETAINER'>('FIXED');
  const [totalValue, setTotalValue] = useState('24000');
  const [installmentsCount, setInstallmentsCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  // Timesheet Billing Hub State
  const [unbilledEntries, setUnbilledEntries] = useState<UnbilledTimesheetItem[]>([]);
  const [loadingTimesheet, setLoadingTimesheet] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [hourlyRate, setHourlyRate] = useState<number>(450);
  const [timesheetClientFilter, setTimesheetClientFilter] = useState<string>('ALL');
  const [isBillingTimesheet, setIsBillingTimesheet] = useState(false);

  // Load unbilled timesheet logs
  const loadTimesheetData = async () => {
    setLoadingTimesheet(true);
    try {
      const data = await api.getUnbilledTimesheet();
      setUnbilledEntries(data || []);
      // Auto-select all by default
      setSelectedLogIds(new Set((data || []).map((d) => d.logId)));
    } catch (err) {
      console.error('Erro ao carregar timesheet:', err);
    } finally {
      setLoadingTimesheet(false);
    }
  };

  useEffect(() => {
    loadTimesheetData();
  }, [receivables.length]);

  // Filtered Receivables
  const filteredReceivables = useMemo(() => {
    return receivables.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClient = (rec.clientName || '').toLowerCase().includes(q);
        const matchTitle = (rec.title || '').toLowerCase().includes(q);
        const matchCase = (rec.caseNumber || '').toLowerCase().includes(q);
        if (!matchClient && !matchTitle && !matchCase) return false;
      }

      if (statusFilter !== 'ALL' && rec.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [receivables, searchQuery, statusFilter]);

  // Filtered Timesheet Entries
  const filteredTimesheetEntries = useMemo(() => {
    return unbilledEntries.filter((item) => {
      if (timesheetClientFilter !== 'ALL' && item.clientId !== timesheetClientFilter && item.clientName !== timesheetClientFilter) {
        return false;
      }
      return true;
    });
  }, [unbilledEntries, timesheetClientFilter]);

  // Timesheet Calculations
  const timesheetTotals = useMemo(() => {
    const selectedItems = unbilledEntries.filter((item) => selectedLogIds.has(item.logId));
    const totalMinutes = selectedItems.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const totalAmount = Math.round(totalHours * hourlyRate * 100) / 100;
    return {
      count: selectedItems.length,
      totalMinutes,
      totalHours: Math.round(totalHours * 10) / 10,
      totalAmount,
    };
  }, [unbilledEntries, selectedLogIds, hourlyRate]);

  // Toggle Single Log Selection
  const toggleSelectLog = (logId: string) => {
    const next = new Set(selectedLogIds);
    if (next.has(logId)) {
      next.delete(logId);
    } else {
      next.add(logId);
    }
    setSelectedLogIds(next);
  };

  // Toggle Select All
  const toggleSelectAllLogs = () => {
    if (selectedLogIds.size === filteredTimesheetEntries.length) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(filteredTimesheetEntries.map((e) => e.logId)));
    }
  };

  // Handle Timesheet Billing Execution
  const handleExecuteBillTimesheet = async () => {
    if (timesheetTotals.count === 0) {
      onShowToast?.('Selecione pelo menos um apontamento de horas para faturar.');
      return;
    }

    const selectedItems = unbilledEntries.filter((item) => selectedLogIds.has(item.logId));
    const targetClient = selectedItems[0]?.clientId || clients[0]?.id;
    const targetCase = selectedItems[0]?.caseId;

    setIsBillingTimesheet(true);
    try {
      await api.billTimesheet({
        clientId: targetClient,
        caseId: targetCase,
        hourlyRate,
        totalMinutes: timesheetTotals.totalMinutes,
        description: `Fatura de Timesheet (${timesheetTotals.totalHours}h a R$ ${hourlyRate}/h) - ${selectedItems.length} atos faturados`,
        taskIds: selectedItems.map((i) => i.taskId),
      });

      onShowToast?.(`Fatura de R$ ${timesheetTotals.totalAmount.toLocaleString('pt-BR')} gerada com sucesso!`);
      setActiveTab('RECEIVABLES');
      onRefresh();
      loadTimesheetData();
    } catch (err: any) {
      onShowToast?.('Falha ao processar faturamento de timesheet.');
    } finally {
      setIsBillingTimesheet(false);
    }
  };

  const handleOpenCharge = async (rec: AccountReceivable, method: 'PIX' | 'BOLETO') => {
    setCurrentReceivable(rec);
    setActivePaymentMethodTab(method);
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
      onShowToast?.('Pagamento simulado e conciliado via Mercado Pago com sucesso!');
      onRefresh();
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
        caseNumber: theCase?.cnjNumber,
        type: contractType,
        totalValue: Number(totalValue) || 0,
        installmentsCount: Number(installmentsCount) || 1,
      });
      setIsContractModalOpen(false);
      setContractTitle('');
      onShowToast?.('Contrato e parcelas gerados com sucesso!');
      onRefresh();
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
    onShowToast?.('Chave PIX copiada!');
  };

  const copyBoleto = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBoleto(true);
    setTimeout(() => setCopiedBoleto(false), 2000);
    onShowToast?.('Linha digitável do Boleto copiada!');
  };

  return (
    <div id="financial-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro, Timesheet & Faturamento</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Gateway Mercado Pago Ativo
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Gestão completa de honorários, conversão de horas (timesheet), emissão instantânea de PIX/Boleto e conciliação bancária.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="financial-btn-new-contract"
            onClick={() => setIsContractModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Contrato de Honorários</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Faturamento Total do Mês</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            R$ {(financial?.totalFaturadoMes || 180000).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +14.2% vs. mês anterior
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Recebido (Liquidado)</span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            R$ {(financial?.totalRecebidoMes || 148500).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">via Mercado Pago & PIX</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">A Receber em Aberto</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono mt-2">
            R$ {(financial?.totalAReceberAberto || 31500).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">vencimentos programados</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Horas Timesheet Apontadas</span>
          <p className="text-2xl font-extrabold text-indigo-600 font-mono mt-2">
            {unbilledEntries.reduce((acc, u) => acc + (u.hours || 0), 0).toFixed(1)}h
          </p>
          <span className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> {unbilledEntries.length} apontamentos registrados
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start">
        <button
          id="financial-tab-receivables"
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
          id="financial-tab-timesheet"
          onClick={() => setActiveTab('TIMESHEET')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'TIMESHEET'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Faturamento de Timesheet ({unbilledEntries.length})</span>
        </button>

        <button
          id="financial-tab-contracts"
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
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, processo ou parcela..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Todos os Vencimentos</option>
                <option value="OPEN">Em Aberto</option>
                <option value="RECEIVED">Recebido / Liquidado</option>
                <option value="OVERDUE">Inadimplente / Vencido</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
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
                  {filteredReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma conta a receber encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredReceivables.map((rec) => {
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
                              {rec.dueDate.split('-').reverse().join('/')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                            R$ {rec.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMESHEET & BILLING HUB */}
      {activeTab === 'TIMESHEET' && (
        <div className="space-y-4">
          {/* Timesheet Billing Calculator Card */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Central de Conversão de Timesheet em Faturas</h3>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  Converta automaticamente apontamentos operacionais de tarefas em contratos e cobranças de honorários.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-xs">
                <label className="text-xs text-indigo-200 font-medium">Taxa Horária Padrão:</label>
                <div className="flex items-center gap-1 font-mono font-bold text-sm text-emerald-300">
                  <span>R$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                    className="w-20 bg-white/20 text-white px-2 py-0.5 rounded border border-white/20 text-right focus:bg-white/30 focus:outline-hidden"
                  />
                  <span>/hora</span>
                </div>
              </div>
            </div>

            {/* Calculations & Execution Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[11px] text-indigo-300 uppercase tracking-wider block">Atos Selecionados</span>
                  <span className="text-lg font-bold font-mono text-white">{timesheetTotals.count} itens</span>
                </div>
                <div>
                  <span className="text-[11px] text-indigo-300 uppercase tracking-wider block">Total de Horas</span>
                  <span className="text-lg font-bold font-mono text-amber-300">{timesheetTotals.totalHours} horas</span>
                </div>
                <div>
                  <span className="text-[11px] text-indigo-300 uppercase tracking-wider block">Valor Faturável</span>
                  <span className="text-lg font-extrabold font-mono text-emerald-400">
                    R$ {timesheetTotals.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                id="btn-bill-timesheet"
                onClick={handleExecuteBillTimesheet}
                disabled={isBillingTimesheet || timesheetTotals.count === 0}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4 text-slate-950" />
                <span>{isBillingTimesheet ? 'Gerando Fatura...' : 'Faturar Timesheet Selecionado'}</span>
              </button>
            </div>
          </div>

          {/* Table of Unbilled Logs */}
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLogIds.size === filteredTimesheetEntries.length && filteredTimesheetEntries.length > 0}
                  onChange={toggleSelectAllLogs}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700">Selecionar Todos os Apontamentos ({filteredTimesheetEntries.length})</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Filtrar por Cliente:</span>
                <select
                  value={timesheetClientFilter}
                  onChange={(e) => setTimesheetClientFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold"
                >
                  <option value="ALL">Todos os Clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.person?.name || c.clientCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Tarefa / Descrição do Ato</th>
                    <th className="px-4 py-3">Cliente / Processo</th>
                    <th className="px-4 py-3">Advogado(a)</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-right">Valor Calculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTimesheetEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Nenhum apontamento pendente de faturamento.
                      </td>
                    </tr>
                  ) : (
                    filteredTimesheetEntries.map((item) => {
                      const isSelected = selectedLogIds.has(item.logId);
                      const itemValue = ((item.minutes || 0) / 60) * hourlyRate;

                      return (
                        <tr
                          key={item.logId}
                          onClick={() => toggleSelectLog(item.logId)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectLog(item.logId)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{item.taskTitle}</p>
                            <p className="text-[11px] text-slate-500 italic line-clamp-1">{item.note}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{item.clientName || 'Cliente Geral'}</p>
                            <p className="text-[11px] font-mono text-slate-500">{item.caseNumber || 'Consultivo'}</p>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{item.userName}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                            {item.minutes} min ({item.hours}h)
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{item.date.split('-').reverse().join('/')}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-700 text-right">
                            R$ {itemValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRACTS */}
      {activeTab === 'CONTRACTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((fc) => (
            <div key={fc.id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                    {fc.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{fc.contractNumber}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{fc.title}</h3>
                <p className="text-xs text-slate-600 font-medium">Cliente: {fc.clientName}</p>
                {fc.caseNumber && <p className="text-[11px] font-mono text-slate-500">Processo: {fc.caseNumber}</p>}

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Total:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      R$ {fc.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parcelamento:</span>
                    <span className="font-mono text-slate-700">{fc.installmentsCount} parcelas</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Início: {fc.startDate.split('-').reverse().join('/')}</span>
                <span className="text-emerald-600 font-semibold">{fc.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mercado Pago Interactive Checkout & Live Payment Simulator Modal */}
      {selectedCharge && currentReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
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

            {/* Payment Method Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActivePaymentMethodTab('PIX')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activePaymentMethodTab === 'PIX' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>PIX Instantâneo</span>
              </button>

              <button
                onClick={() => setActivePaymentMethodTab('BOLETO')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activePaymentMethodTab === 'BOLETO' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Boleto Bancário</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-slate-500">Cobrança para:</p>
                <p className="font-bold text-slate-900 text-sm">{currentReceivable.clientName}</p>
                <div className="flex justify-between pt-1 font-mono">
                  <span className="text-slate-500">Valor da Cobrança:</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    R$ {selectedCharge.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* PIX Content */}
              {activePaymentMethodTab === 'PIX' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
                    <QrCode className="w-4 h-4" />
                    <span>PIX Instantâneo (Liquidação em Segundos)</span>
                  </div>

                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl flex items-center justify-center border border-slate-200 shadow-2xs">
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
                        className="bg-transparent text-[10px] font-mono text-slate-800 flex-1 truncate focus:outline-hidden"
                      />
                      <button
                        onClick={() => copyPix(selectedCharge.pixCopiaECola || '')}
                        className="p-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] flex items-center gap-1 px-2 font-semibold border border-indigo-100"
                      >
                        {copiedPix ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Boleto Content */}
              {activePaymentMethodTab === 'BOLETO' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-left">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <Barcode className="w-4 h-4" />
                    <span>Boleto Registrado CIP / Febraban</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Linha Digitável:</label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        readOnly
                        value={selectedCharge.boletoBarcode || '34191.79001 01043.510047 91020.150008 4 91200000240000'}
                        className="bg-transparent text-[10px] font-mono text-slate-800 flex-1 truncate focus:outline-hidden"
                      />
                      <button
                        onClick={() => copyBoleto(selectedCharge.boletoBarcode || '')}
                        className="p-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] flex items-center gap-1 px-2 font-semibold border border-indigo-100"
                      >
                        {copiedBoleto ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedBoleto ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Vencimento em 5 dias corridos. Compensação bancária automática via CNAB 240 / Webhook.
                  </p>
                </div>
              )}

              {/* Live Webhook Simulator Button */}
              {selectedCharge.status !== 'PAID' ? (
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-indigo-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Webhook Mercado Pago Adapter
                    </span>
                    <span className="font-mono text-emerald-600">Pronto</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Clique abaixo para simular o recebimento do webhook de aprovação, baixando a conta a receber e gerando recibo!
                  </p>
                  <button
                    id="btn-simulate-mp-payment"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-2xs disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Cliente Contratante *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-2xs disabled:opacity-50"
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
