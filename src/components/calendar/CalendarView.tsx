import React, { useState, useMemo } from 'react';
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
  Kanban,
  Download,
  Video,
  Building,
  Briefcase,
  Search,
  Filter,
  Check,
  Calendar as CalendarIcon,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Deadline, Hearing, Diligence, Case, User as AppUser } from '../../types';
import { calculateLegalDeadline, formatDateToYMD, FIXED_BRAZILIAN_HOLIDAYS, isJudicialRecess, isHoliday } from '../../lib/cpcCalendar';
import { exportDeadlineToICS, exportHearingToICS, exportFullAgendaToICS, downloadICSFile } from '../../lib/icalExport';

interface CalendarViewProps {
  deadlines: Deadline[];
  hearings: Hearing[];
  diligences: Diligence[];
  cases: Case[];
  users: AppUser[];
  onSaveDeadline: (data: Partial<Deadline>) => Promise<void>;
  onCompleteDeadline: (id: string) => Promise<void>;
  onSaveHearing?: (data: Partial<Hearing>) => Promise<void>;
  onSaveDiligence?: (data: Partial<Diligence>) => Promise<void>;
  onOpenAiGateway: (tab: string, prompt?: string) => void;
  onCreateTaskFromDeadline?: (deadline: Deadline) => void;
  onShowToast?: (msg: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  deadlines = [],
  hearings = [],
  diligences = [],
  cases = [],
  users = [],
  onSaveDeadline = async (_data: Partial<Deadline>) => {},
  onCompleteDeadline = async (_id: string) => {},
  onSaveHearing = async (_data: Partial<Hearing>) => {},
  onSaveDiligence = async (_data: Partial<Diligence>) => {},
  onOpenAiGateway = (_tab: string, _prompt?: string) => {},
  onCreateTaskFromDeadline,
  onShowToast = (_msg: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'DEADLINES' | 'CALENDAR' | 'HEARINGS' | 'DILIGENCES' | 'SIMULATOR'>('DEADLINES');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Month grid navigation state
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2026, 8, 1)); // Sept 2026

  // CPC Simulator State
  const [simPublishDate, setSimPublishDate] = useState(formatDateToYMD(new Date()));
  const [simDays, setSimDays] = useState(15);
  const [simType, setSimType] = useState<'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT'>('DIAS_UTEIS_CPC');
  const simResult = calculateLegalDeadline(simPublishDate, simDays, simType);

  // New Deadline Modal State
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseId, setNewCaseId] = useState(cases?.[0]?.id || '');
  const [newPublishDate, setNewPublishDate] = useState(formatDateToYMD(new Date()));
  const [newDays, setNewDays] = useState(15);
  const [newCalcType, setNewCalcType] = useState<'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT'>('DIAS_UTEIS_CPC');
  const [newDescription, setNewDescription] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState(users[0]?.id || 'u-carlos');
  const [submittingDeadline, setSubmittingDeadline] = useState(false);
  const newCalcPreview = calculateLegalDeadline(newPublishDate, newDays, newCalcType);

  // New Hearing Modal State
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [hearingTitle, setHearingTitle] = useState('');
  const [hearingCaseId, setHearingCaseId] = useState(cases?.[0]?.id || '');
  const [hearingDateTime, setHearingDateTime] = useState('2026-09-15T14:30');
  const [hearingLocationType, setHearingLocationType] = useState<'VIRTUAL' | 'PRESENTIAL'>('VIRTUAL');
  const [hearingCourt, setHearingCourt] = useState('TJSP - 3ª Vara Cível');
  const [hearingAddressOrLink, setHearingAddressOrLink] = useState('https://teams.microsoft.com/l/meetup-join/tjsp-audiencia-sala-03');
  const [hearingLawyerId, setHearingLawyerId] = useState(users[0]?.id || 'u-carlos');
  const [submittingHearing, setSubmittingHearing] = useState(false);

  // New Diligence Modal State
  const [isDiligenceModalOpen, setIsDiligenceModalOpen] = useState(false);
  const [diligenceTitle, setDiligenceTitle] = useState('');
  const [diligenceCaseId, setDiligenceCaseId] = useState(cases?.[0]?.id || '');
  const [diligenceType, setDiligenceType] = useState<'DESPACHO_JUIZ' | 'CARTORIO' | 'PERICIA' | 'CUMPRIMENTO_MANDADO'>('DESPACHO_JUIZ');
  const [diligenceDate, setDiligenceDate] = useState(formatDateToYMD(new Date()));
  const [diligenceLocation, setDiligenceLocation] = useState('Gabinete do Juiz - 3ª Vara Cível');
  const [diligenceNotes, setDiligenceNotes] = useState('');
  const [submittingDiligence, setSubmittingDiligence] = useState(false);

  // Filtered Deadlines
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((dl) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (dl.title || '').toLowerCase().includes(q);
        const matchCase = (dl.caseTitle || '').toLowerCase().includes(q) || (dl.caseNumber || '').toLowerCase().includes(q);
        const matchResp = (dl.responsibleUserName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCase && !matchResp) return false;
      }
      if (statusFilter !== 'ALL' && dl.status !== statusFilter) return false;
      return true;
    });
  }, [deadlines, searchQuery, statusFilter]);

  // Handlers for Creating Items
  const handleCreateDeadlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDeadline(true);
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
      setIsDeadlineModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      onShowToast?.('Prazo processual cadastrado com cálculo CPC validado!');
    } catch (err) {
      console.error(err);
      onShowToast?.('Erro ao salvar prazo processual');
    } finally {
      setSubmittingDeadline(false);
    }
  };

  const handleCreateHearingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingHearing(true);
    const selectedCase = cases.find((c) => c.id === hearingCaseId);
    const selectedLawyer = users.find((u) => u.id === hearingLawyerId);

    try {
      await onSaveHearing({
        title: hearingTitle,
        caseId: hearingCaseId,
        caseTitle: selectedCase?.title,
        caseNumber: selectedCase?.caseNumber,
        dateTime: hearingDateTime,
        locationType: hearingLocationType,
        courtName: hearingCourt,
        addressOrLink: hearingAddressOrLink,
        responsibleLawyerId: hearingLawyerId,
        responsibleLawyerName: selectedLawyer?.name || 'Advogado',
        status: 'SCHEDULED',
      });
      setIsHearingModalOpen(false);
      setHearingTitle('');
      onShowToast?.('Audiência agendada com sucesso!');
    } catch (err) {
      console.error(err);
      onShowToast?.('Erro ao agendar audiência');
    } finally {
      setSubmittingHearing(false);
    }
  };

  const handleCreateDiligenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDiligence(true);
    const selectedCase = cases.find((c) => c.id === diligenceCaseId);

    try {
      await onSaveDiligence({
        title: diligenceTitle,
        caseId: diligenceCaseId,
        caseNumber: selectedCase?.caseNumber,
        type: diligenceType,
        dueDate: diligenceDate,
        date: diligenceDate,
        location: diligenceLocation,
        notes: diligenceNotes,
        executorUserId: users[0]?.id || '',
        costEstimate: 0,
        actualCost: 0,
        status: 'REQUESTED',
      });
      setIsDiligenceModalOpen(false);
      setDiligenceTitle('');
      setDiligenceNotes('');
      onShowToast?.('Diligência forense agendada com sucesso!');
    } catch (err) {
      console.error(err);
      onShowToast?.('Erro ao agendar diligência');
    } finally {
      setSubmittingDiligence(false);
    }
  };

  // Export handlers
  const handleExportSingleDeadline = (dl: Deadline) => {
    const ics = exportDeadlineToICS(dl);
    downloadICSFile(`prazo-${dl.id}.ics`, ics);
    onShowToast?.('Arquivo iCal (.ics) do prazo baixado com sucesso!');
  };

  const handleExportSingleHearing = (hr: Hearing) => {
    const ics = exportHearingToICS(hr);
    downloadICSFile(`audiencia-${hr.id}.ics`, ics);
    onShowToast?.('Arquivo iCal (.ics) da audiência baixado com sucesso!');
  };

  const handleExportFullCalendar = () => {
    const ics = exportFullAgendaToICS({ deadlines, hearings, diligences });
    downloadICSFile(`agenda-jurisflow-${formatDateToYMD(new Date())}.ics`, ics);
    onShowToast?.('Agenda forense completa exportada para .ics (compatível com Google Calendar/Outlook)!');
  };

  // Month Grid Calculation
  const monthInfo = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const monthName = currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Previous month padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ isCurrentMonth: false, dayNum: 0, dateStr: '' });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dDate = new Date(year, month, d);
      const isRecess = isJudicialRecess(dDate);
      const holCheck = isHoliday(dDate);
      const dayDeadlines = deadlines.filter((dl) => dl.dueDate === dStr && dl.status === 'PENDING');
      const dayHearings = hearings.filter((hr) => hr.dateTime.startsWith(dStr));
      const dayDiligences = diligences.filter((dil) => dil.date === dStr);

      days.push({
        isCurrentMonth: true,
        dayNum: d,
        dateStr: dStr,
        isRecess,
        isHoliday: holCheck.isHoliday,
        holidayName: holCheck.holidayName,
        deadlines: dayDeadlines,
        hearings: dayHearings,
        diligences: dayDiligences,
      });
    }

    return { monthName, days, year, month };
  }, [currentMonthDate, deadlines, hearings, diligences]);

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div id="calendar-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-600" />
              Agenda, Prazos CPC & Audiências
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Motor CPC Art. 219/220
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Contagem matemática de prazos em dias úteis com exclusão de D0, suspensão de feriados forenses e sincronização iCal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-export-full-ics"
            onClick={handleExportFullCalendar}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all"
            title="Exportar agenda completa para Google Calendar ou Outlook"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Sincronizar Agenda (.ics)</span>
          </button>

          <button
            id="btn-extract-dje"
            onClick={() => onOpenAiGateway('extract')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Extrair Publicação DJe</span>
          </button>

          <button
            id="btn-new-deadline"
            onClick={() => setIsDeadlineModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Prazo Fatal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Prazos Fatais Pendentes</span>
          <p className="text-2xl font-extrabold text-rose-600 font-mono mt-2">
            {deadlines.filter((d) => d.status === 'PENDING').length}
          </p>
          <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" /> Cômputo em dias úteis CPC
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Audiências Agendadas</span>
          <p className="text-2xl font-extrabold text-indigo-600 font-mono mt-2">
            {hearings.filter((h) => h.status === 'SCHEDULED').length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">presenciais e telepresenciais</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Diligências & Despachos</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono mt-2">
            {diligences.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">acompanhamentos forenses</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Prazos Cumpridos no Mês</span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
            {deadlines.filter((d) => d.status === 'COMPLETED').length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> 100% tempestividade
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start overflow-x-auto">
        <button
          id="calendar-tab-deadlines"
          onClick={() => setActiveTab('DEADLINES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'DEADLINES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-rose-600" />
          <span>Prazos Fatais ({deadlines.filter((d) => d.status === 'PENDING').length})</span>
        </button>

        <button
          id="calendar-tab-grid"
          onClick={() => setActiveTab('CALENDAR')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'CALENDAR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-indigo-600" />
          <span>Grade Mensal & Feriados</span>
        </button>

        <button
          id="calendar-tab-hearings"
          onClick={() => setActiveTab('HEARINGS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'HEARINGS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>Audiências & Sessões ({hearings.length})</span>
        </button>

        <button
          id="calendar-tab-diligences"
          onClick={() => setActiveTab('DILIGENCES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'DILIGENCES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-amber-600" />
          <span>Diligências Forenses ({diligences.length})</span>
        </button>

        <button
          id="calendar-tab-simulator"
          onClick={() => setActiveTab('SIMULATOR')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'SIMULATOR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-600" />
          <span>Simulador & Feriados CPC</span>
        </button>
      </div>

      {/* TAB 1: DEADLINES LIST */}
      {activeTab === 'DEADLINES' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar prazo, processo ou advogado..."
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
                <option value="ALL">Todos os Prazos</option>
                <option value="PENDING">Pendentes / Em Aberto</option>
                <option value="COMPLETED">Cumpridos / Concluídos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeadlines.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                Nenhum prazo encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredDeadlines.map((dl) => {
                const isPending = dl.status === 'PENDING';

                return (
                  <div
                    key={dl.id}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                      isPending
                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                            isPending
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isPending ? `Fatal: ${dl.dueDate.split('-').reverse().join('/')}` : 'Cumprido'}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {dl.daysCount}d ({dl.calculationType === 'DIAS_UTEIS_CPC' ? 'Úteis CPC' : 'CLT'})
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{dl.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{dl.caseTitle}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{dl.caseNumber}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1 text-slate-500">
                        <div className="flex justify-between">
                          <span>Publicação DJe (D0):</span>
                          <span className="font-mono text-slate-700">{dl.publishDate?.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Início Contagem (D+1 útil):</span>
                          <span className="font-mono text-slate-700">{dl.startDate?.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-rose-600">
                          <span>Data Fatal Final:</span>
                          <span className="font-mono">{dl.dueDate?.split('-').reverse().join('/')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 truncate">{dl.responsibleUserName}</span>

                      {isPending ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleExportSingleDeadline(dl)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs"
                            title="Baixar evento .ics para Google Calendar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {onCreateTaskFromDeadline && (
                            <button
                              onClick={() => onCreateTaskFromDeadline(dl)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Gerar e sincronizar Tarefa no Kanban"
                            >
                              <Kanban className="w-3.5 h-3.5" />
                              <span>Tarefa</span>
                            </button>
                          )}

                          <button
                            onClick={() => onCompleteDeadline(dl.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cumprir</span>
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
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cumprido em {dl.completedAt?.slice(0, 10).split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY GRID WITH HOLIDAYS & SUSPENSIONS */}
      {activeTab === 'CALENDAR' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
          {/* Month Header Controller */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900 capitalize flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                {monthInfo.monthName}
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                Art. 220 CPC Ativo
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonthDate(new Date(2026, 8, 1))}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Hoje
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-2 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-rose-600">Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span className="text-rose-600">Sáb</span>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {monthInfo.days.map((d, idx) => {
              if (!d.isCurrentMonth) {
                return <div key={idx} className="min-h-[90px] rounded-lg bg-slate-50/50 border border-transparent p-2" />;
              }

              const isSuspended = d.isHoliday || d.isRecess;

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] rounded-lg border p-2 flex flex-col justify-between transition-colors ${
                    isSuspended
                      ? 'bg-amber-50/40 border-amber-200'
                      : d.deadlines && d.deadlines.length > 0
                      ? 'bg-rose-50/20 border-rose-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isSuspended ? 'text-amber-700' : 'text-slate-800'
                      }`}
                    >
                      {d.dayNum}
                    </span>

                    {d.isHoliday && (
                      <span
                        className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-medium truncate max-w-[70px]"
                        title={d.holidayName}
                      >
                        Feriado
                      </span>
                    )}
                    {d.isRecess && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 font-medium">
                        Recesso
                      </span>
                    )}
                  </div>

                  {/* Events in Day */}
                  <div className="space-y-1 mt-1">
                    {d.deadlines?.map((dl) => (
                      <div
                        key={dl.id}
                        className="p-1 rounded bg-rose-100 border border-rose-300 text-[10px] text-rose-900 font-medium leading-tight truncate"
                        title={`Prazo Fatal: ${dl.title}`}
                      >
                        🚨 {dl.title}
                      </div>
                    ))}
                    {d.hearings?.map((hr) => (
                      <div
                        key={hr.id}
                        className="p-1 rounded bg-indigo-100 border border-indigo-300 text-[10px] text-indigo-900 font-medium leading-tight truncate"
                        title={`Audiência: ${hr.title}`}
                      >
                        ⚖️ {hr.dateTime.slice(11, 16)} {hr.title}
                      </div>
                    ))}
                    {d.diligences?.map((dil) => (
                      <div
                        key={dil.id}
                        className="p-1 rounded bg-amber-100 border border-amber-300 text-[10px] text-amber-900 font-medium leading-tight truncate"
                        title={`Diligência: ${dil.title}`}
                      >
                        📌 {dil.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: HEARINGS */}
      {activeTab === 'HEARINGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Audiências de instrução, conciliação e julgamento pautadas.</span>
            <button
              id="btn-new-hearing"
              onClick={() => setIsHearingModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Audiência</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hearings.map((hr) => (
              <div key={hr.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{hr.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border flex items-center gap-1 ${
                        hr.locationType === 'VIRTUAL'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {hr.locationType === 'VIRTUAL' ? <Video className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                      {hr.locationType}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono">
                    <p className="text-indigo-700 font-semibold font-sans">
                      📅 {hr.dateTime.split('T')[0].split('-').reverse().join('/')} às {hr.dateTime.slice(11, 16)}h
                    </p>
                    <p className="text-slate-700 font-medium font-sans">{hr.caseTitle}</p>
                    <p className="text-[11px] text-slate-400">{hr.caseNumber}</p>
                    <div className="text-slate-500 pt-1 flex items-center justify-between font-sans">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{hr.courtName}</span>
                      </span>
                      {hr.locationType === 'VIRTUAL' && hr.addressOrLink && (
                        <a
                          href={hr.addressOrLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 ml-2"
                        >
                          Entrar <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="truncate">Adv: {hr.responsibleLawyerName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSingleHearing(hr)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      title="Exportar para agenda (.ics)"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <span className="text-emerald-700 font-semibold text-[11px]">{hr.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DILIGENCES */}
      {activeTab === 'DILIGENCES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Despachos com juiz/desembargador, cumprimento de mandados e idas a cartório.</span>
            <button
              id="btn-new-diligence"
              onClick={() => setIsDiligenceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Diligência</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {diligences.map((dil) => (
              <div key={dil.id} className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{dil.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                    {dil.type}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="text-slate-800 font-semibold">Data: {dil.date?.split('-').reverse().join('/')}</p>
                  {dil.caseNumber && <p className="text-[11px] font-mono text-slate-500">Processo: {dil.caseNumber}</p>}
                  <p className="text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {dil.location}
                  </p>
                  {dil.notes && <p className="text-[11px] text-slate-500 italic mt-1">{dil.notes}</p>}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Status: <strong className="text-amber-600">{dil.status}</strong></span>
                  <button
                    onClick={() => onShowToast?.('Diligência concluída com sucesso!')}
                    className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CPC SIMULATOR & OFFICIAL HOLIDAYS TABLE */}
      {activeTab === 'SIMULATOR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulator Inputs */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Parâmetros de Contagem CPC/CLT
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Data de Disponibilização / Publicação no DJe (D0) *
                  </label>
                  <input
                    type="date"
                    value={simPublishDate}
                    onChange={(e) => setSimPublishDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Regra Legal de Contagem</label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="DIAS_UTEIS_CPC">Dias Úteis (Art. 219 CPC/2015)</option>
                    <option value="DIAS_UTEIS_CLT">Dias Úteis Trabalhistas (Art. 775 CLT)</option>
                    <option value="DIAS_CORRIDOS">Dias Corridos (Penal / Juizados)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calculation Step-by-Step Breakdown Visualizer */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
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
                    {simResult.dueDate.split('-').reverse().join('/')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cômputo estrito de {simResult.businessDaysCounted} dias úteis.
                  </p>
                </div>

                <div className="text-xs space-y-1 text-slate-600 font-mono bg-white p-3 rounded-lg border border-slate-200">
                  <p>Publicação D0: <strong className="text-slate-900">{simResult.publishDate.split('-').reverse().join('/')}</strong></p>
                  <p>Termo Inicial: <strong className="text-emerald-700">{simResult.startDate.split('-').reverse().join('/')}</strong></p>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Official Holidays & Suspensions Reference Table */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Tabela Oficial de Feriados Forenses & Recesso do Judiciário
            </h3>
            <p className="text-xs text-slate-500">
              Datas de suspensão de prazos aplicadas automaticamente no motor de cálculo CPC/CLT.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs space-y-1">
                <span className="font-bold text-indigo-900">Recesso Forense Oficial</span>
                <p className="font-mono text-indigo-700 text-[11px]">20 de Dez a 20 de Jan</p>
                <p className="text-[10px] text-indigo-600">Art. 220 do CPC/2015</p>
              </div>

              {FIXED_BRAZILIAN_HOLIDAYS.map((h, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-800">{h.name}</span>
                  <p className="font-mono text-slate-600 text-[11px]">{h.date.split('-').reverse().join('/')}</p>
                  <p className="text-[10px] text-slate-400">Suspensão Nacional</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Deadline */}
      {isDeadlineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-600" />
                Cadastrar Novo Prazo Processual
              </h2>
              <button onClick={() => setIsDeadlineModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeadlineSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Título do Prazo / Providência *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Apresentar Recurso de Apelação"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Processo Vinculado *</label>
                <select
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-slate-700 mb-1 font-medium">Data de Publicação DJe *</label>
                  <input
                    type="date"
                    required
                    value={newPublishDate}
                    onChange={(e) => setNewPublishDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Dias de Prazo *</label>
                  <input
                    type="number"
                    required
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Advogado Responsável</label>
                <select
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Automatic CPC Result Preview Box */}
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase font-mono">
                  Cálculo Automático CPC (Art. 219)
                </span>
                <p className="text-slate-800">
                  Data Fatal Estimada:{' '}
                  <strong className="text-rose-700 font-mono text-sm">{newCalcPreview.dueDate.split('-').reverse().join('/')}</strong>
                </p>
                <p className="text-[11px] text-slate-600">
                  Início da contagem: {newCalcPreview.startDate.split('-').reverse().join('/')} ({newDays} dias úteis)
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeadlineModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingDeadline}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-2xs disabled:opacity-50"
                >
                  {submittingDeadline ? 'Salvando...' : 'Salvar Prazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Hearing */}
      {isHearingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                Agendar Nova Audiência Forense
              </h2>
              <button onClick={() => setIsHearingModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHearingSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Título da Audiência *</label>
                <input
                  type="text"
                  required
                  value={hearingTitle}
                  onChange={(e) => setHearingTitle(e.target.value)}
                  placeholder="Ex: Audiência de Instrução e Julgamento (AIJ)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Processo Vinculado *</label>
                <select
                  value={hearingCaseId}
                  onChange={(e) => setHearingCaseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-slate-700 mb-1 font-medium">Data e Horário *</label>
                  <input
                    type="datetime-local"
                    required
                    value={hearingDateTime}
                    onChange={(e) => setHearingDateTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Modalidade</label>
                  <select
                    value={hearingLocationType}
                    onChange={(e) => setHearingLocationType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="VIRTUAL">Telepresencial (Teams / Meet / Zoom)</option>
                    <option value="PRESENTIAL">Presencial no Fórum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Tribunal / Vara *</label>
                <input
                  type="text"
                  required
                  value={hearingCourt}
                  onChange={(e) => setHearingCourt(e.target.value)}
                  placeholder="Ex: TJSP - 3ª Vara Cível da Comarca de São Paulo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">
                  {hearingLocationType === 'VIRTUAL' ? 'Link da Sala Virtual (Teams/Meet/Zoom)' : 'Endereço Completo do Fórum'}
                </label>
                <input
                  type="text"
                  value={hearingAddressOrLink}
                  onChange={(e) => setHearingAddressOrLink(e.target.value)}
                  placeholder={hearingLocationType === 'VIRTUAL' ? 'https://teams.microsoft.com/...' : 'Praça Clóvis Beviláqua, s/n - Sala 410'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Advogado da Pauta</label>
                <select
                  value={hearingLawyerId}
                  onChange={(e) => setHearingLawyerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHearingModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingHearing}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-2xs disabled:opacity-50"
                >
                  {submittingHearing ? 'Agendando...' : 'Agendar Audiência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Diligence */}
      {isDiligenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                Agendar Diligência Forense
              </h2>
              <button onClick={() => setIsDiligenceModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiligenceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Título da Diligência *</label>
                <input
                  type="text"
                  required
                  value={diligenceTitle}
                  onChange={(e) => setDiligenceTitle(e.target.value)}
                  placeholder="Ex: Despacho com Magistrado sobre Pedido Liminar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Processo Vinculado *</label>
                <select
                  value={diligenceCaseId}
                  onChange={(e) => setDiligenceCaseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-slate-700 mb-1 font-medium">Tipo de Diligência</label>
                  <select
                    value={diligenceType}
                    onChange={(e) => setDiligenceType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="DESPACHO_JUIZ">Despacho com Juiz/Desembargador</option>
                    <option value="CARTORIO">Cartório / Ofício de Justiça</option>
                    <option value="PERICIA">Acompanhamento de Perícia</option>
                    <option value="CUMPRIMENTO_MANDADO">Cumprimento de Mandado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Data Prevista *</label>
                  <input
                    type="date"
                    required
                    value={diligenceDate}
                    onChange={(e) => setDiligenceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Local / Vara</label>
                <input
                  type="text"
                  value={diligenceLocation}
                  onChange={(e) => setDiligenceLocation(e.target.value)}
                  placeholder="Ex: Gabinete da 3ª Vara Cível - Fórum Central"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Instruções / Notas</label>
                <textarea
                  rows={2}
                  value={diligenceNotes}
                  onChange={(e) => setDiligenceNotes(e.target.value)}
                  placeholder="Ex: Levar cópia do pedido de tutela e precedentes vinculantes do STJ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDiligenceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingDiligence}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all shadow-2xs disabled:opacity-50"
                >
                  {submittingDiligence ? 'Salvando...' : 'Salvar Diligência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
