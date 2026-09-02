import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Scale,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calculator,
  CalendarCheck,
  MapPin,
  FileText,
  X,
} from 'lucide-react';
import { Deadline, Hearing, Diligence, Case, User as AppUser } from '../../types';
import { calculateLegalDeadline, formatDateToYMD } from '../../lib/cpcCalendar';

interface CalendarViewProps {
  deadlines: Deadline[];
  hearings: Hearing[];
  diligences: Diligence[];
  cases: Case[];
  users: AppUser[];
  onSaveDeadline: (data: Partial<Deadline>) => Promise<void>;
  onCompleteDeadline: (id: string) => Promise<void>;
  onOpenAiGateway: (tab: string, prompt?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  deadlines = [],
  hearings = [],
  diligences = [],
  cases = [],
  users = [],
  onSaveDeadline = async (_data: Partial<Deadline>) => {},
  onCompleteDeadline = async (_id: string) => {},
  onOpenAiGateway = (_tab: string, _prompt?: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'DEADLINES' | 'CALENDAR' | 'SIMULATOR' | 'HEARINGS'>('DEADLINES');

  // CPC Simulator State
  const [simPublishDate, setSimPublishDate] = useState(formatDateToYMD(new Date()));
  const [simDays, setSimDays] = useState(15);
  const [simType, setSimType] = useState<'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT'>('DIAS_UTEIS_CPC');

  const simResult = calculateLegalDeadline(simPublishDate, simDays, simType);

  // New Deadline Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseId, setNewCaseId] = useState(cases?.[0]?.id || '');
  const [newPublishDate, setNewPublishDate] = useState(formatDateToYMD(new Date()));
  const [newDays, setNewDays] = useState(15);
  const [newCalcType, setNewCalcType] = useState<'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT'>('DIAS_UTEIS_CPC');
  const [newDescription, setNewDescription] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState(users[0]?.id || 'u-carlos');
  const [submitting, setSubmitting] = useState(false);

  const newCalcPreview = calculateLegalDeadline(newPublishDate, newDays, newCalcType);

  const handleCreateDeadlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const selectedCase = cases.find((c) => c.id === newCaseId);

    try {
      await onSaveDeadline({
        title: newTitle,
        caseId: newCaseId,
        caseTitle: selectedCase?.title,
        caseNumber: selectedCase?.caseNumber,
        publishDate: newPublishDate,
        daysCount: newDays,
        calculationType: newCalcType,
        description: newDescription,
        responsibleUserId,
      });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            Agenda & Prazos Processuais CPC/CLT
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Motor oficial de contagem em dias úteis, exclusão de D0, suspensão de feriados e recesso (Art. 220 CPC)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenAiGateway('extract')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Extrair Publicação DJe</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Prazo Fatal</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start overflow-x-auto">
        <button
          onClick={() => setActiveTab('DEADLINES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'DEADLINES'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-rose-600" />
          <span>Prazos Fatais ({deadlines.filter((d) => d.status === 'PENDING').length} Pendentes)</span>
        </button>

        <button
          onClick={() => setActiveTab('SIMULATOR')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'SIMULATOR'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-600" />
          <span>Simulador & Auditoria CPC</span>
        </button>

        <button
          onClick={() => setActiveTab('HEARINGS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'HEARINGS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>Audiências & Julgamentos ({hearings.length})</span>
        </button>
      </div>

      {/* TAB 1: DEADLINES LIST */}
      {activeTab === 'DEADLINES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deadlines.map((dl) => {
              const isPending = dl.status === 'PENDING';

              return (
                <div
                  key={dl.id}
                  className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    isPending
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          isPending
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isPending ? `Fatal: ${dl.dueDate}` : 'Cumprido'}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {dl.daysCount} dias ({dl.calculationType === 'DIAS_UTEIS_CPC' ? 'Úteis CPC' : 'CLT'})
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{dl.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{dl.caseTitle}</p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{dl.caseNumber}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>Publicação DJe:</span>
                        <span className="font-mono text-slate-700">{dl.publishDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Início Contagem (D+1 útil):</span>
                        <span className="font-mono text-slate-700">{dl.startDate}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-rose-600">
                        <span>Data Fatal:</span>
                        <span className="font-mono">{dl.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 truncate">{dl.responsibleUserName}</span>

                    {isPending ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onCompleteDeadline(dl.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cumprir
                        </button>
                        <button
                          onClick={() => onOpenAiGateway('draft', `Prazo: ${dl.title} referente a ${dl.caseTitle}`)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-600 text-xs"
                          title="Redigir peça com IA"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-mono font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cumprido em {dl.completedAt?.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CPC SIMULATOR & AUDIT BREAKDOWN */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulator Inputs */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Parâmetros de Contagem CPC/CLT
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Data de Disponibilização / Publicação no DJe *
                </label>
                <input
                  type="date"
                  value={simPublishDate}
                  onChange={(e) => setSimPublishDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Prazo em Dias *</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[5, 8, 10, 15].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSimDays(d)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                        simDays === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={simDays}
                  onChange={(e) => setSimDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Regra Legal de Contagem</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DIAS_UTEIS_CPC">Dias Úteis (Art. 219 CPC/2015)</option>
                  <option value="DIAS_UTEIS_CLT">Dias Úteis Trabalhistas (Art. 775 CLT)</option>
                  <option value="DIAS_CORRIDOS">Dias Corridos (Penal / Juizados)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calculation Step-by-Step Breakdown Visualizer */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Demonstrativo de Contagem e Auditoria Temporal
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Auditoria Legal 100% CPC
              </span>
            </h2>

            {/* Main Result Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 font-mono">
                  Data Fatal de Vencimento
                </span>
                <p className="text-2xl font-black text-rose-600 font-mono mt-0.5">
                  {simResult.dueDate}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Cômputo estrito de {simResult.businessDaysCounted} dias úteis.
                </p>
              </div>

              <div className="text-xs space-y-1 text-slate-600 font-mono bg-white p-3 rounded-lg border border-slate-200">
                <p>Publicação D0: <strong className="text-slate-900">{simResult.publishDate}</strong></p>
                <p>Termo Inicial: <strong className="text-emerald-700">{simResult.startDate}</strong></p>
                <p>Recesso Considerado: <strong className="text-slate-800">{simResult.recessIncluded ? 'Sim (Suspenso)' : 'Não'}</strong></p>
              </div>
            </div>

            {/* Legal Logic Explanations */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Fundamentação Jurídica do Cálculo
              </h3>
              <div className="space-y-1.5">
                {simResult.notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HEARINGS */}
      {activeTab === 'HEARINGS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hearings.map((hr) => (
            <div key={hr.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">{hr.title}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                    hr.locationType === 'VIRTUAL'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {hr.locationType}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-500 font-mono">
                <p className="text-indigo-700 font-semibold">📅 {hr.dateTime.replace('T', ' às ')}</p>
                <p className="text-slate-700 font-medium font-sans">{hr.caseTitle}</p>
                <p className="text-[11px] text-slate-400">{hr.caseNumber}</p>
                <p className="text-slate-500 pt-1 flex items-center gap-1 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {hr.courtName} - {hr.addressOrLink}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Advogado: {hr.responsibleLawyerName}</span>
                <span className="text-emerald-700 font-semibold">{hr.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Deadline */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-600" />
                Cadastrar Novo Prazo Processual
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeadlineSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Título do Prazo / Providência *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Apresentar Recurso de Apelação"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Processo Vinculado *</label>
                <select
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Data de Publicação DJe *</label>
                  <input
                    type="date"
                    required
                    value={newPublishDate}
                    onChange={(e) => setNewPublishDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Dias de Prazo *</label>
                  <input
                    type="number"
                    required
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Automatic CPC Result Preview Box */}
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase font-mono">
                  Cálculo Automático CPC (Art. 219)
                </span>
                <p className="text-slate-800">
                  Data Fatal Estimada:{' '}
                  <strong className="text-rose-700 font-mono text-sm">{newCalcPreview.dueDate}</strong>
                </p>
                <p className="text-[11px] text-slate-600">
                  Início da contagem: {newCalcPreview.startDate} ({newDays} dias úteis)
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Prazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
