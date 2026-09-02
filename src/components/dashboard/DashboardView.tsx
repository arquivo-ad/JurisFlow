import React from 'react';
import {
  Scale,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  ChevronRight,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import {
  Case,
  Deadline,
  Hearing,
  Movement,
  FinancialOverviewMetrics,
  Client,
} from '../../types';

interface DashboardViewProps {
  cases?: Case[];
  deadlines?: Deadline[];
  hearings?: Hearing[];
  clients?: Client[];
  financial?: FinancialOverviewMetrics | null;
  movements?: Movement[];
  metrics?: any;
  onNavigate?: (module: string) => void;
  onOpenNewCase?: () => void;
  onOpenNewDeadline?: () => void;
  onOpenAiGateway?: (tab?: string) => void;
  onCompleteDeadline?: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases = [],
  deadlines = [],
  hearings = [],
  clients = [],
  financial = null,
  movements = [],
  metrics,
  onNavigate = (_module: string) => {},
  onOpenNewCase = () => {},
  onOpenNewDeadline = () => {},
  onOpenAiGateway = (_tab?: string) => {},
  onCompleteDeadline = (_id: string) => {},
}) => {
  const activeCases = cases.filter((c) => c.status === 'ACTIVE');
  const pendingDeadlines = deadlines.filter((d) => d.status === 'PENDING');
  const scheduledHearings = hearings.filter((h) => h.status === 'SCHEDULED');

  // Group cases by legal area
  const areaCounts = cases.reduce((acc: Record<string, number>, c) => {
    acc[c.legalArea] = (acc[c.legalArea] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Top Banner: Welcome & AI Fast Track */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Executivo • JurisFlow AI 3.7 Ativo</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Gestão Jurídica Estratégica
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 mt-1 max-w-2xl">
              Acompanhamento integrado de processos judiciais, contagem CPC de prazos fatais,
              automação de minutas por IA e faturamento via Mercado Pago.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenAiGateway('extract')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Extrair Prazo de Intimação (IA)</span>
            </button>
            <button
              onClick={() => onOpenAiGateway('draft')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Minutar Peça Judicial</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Cases */}
        <div
          onClick={() => onNavigate('cases')}
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Processos Ativos</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {activeCases.length}
            </span>
            <span className="text-xs text-slate-500 ml-2">de {cases.length} totais</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-600 font-medium">
            <span>R$ {(activeCases.reduce((acc, c) => acc + c.claimValue, 0) / 1000000).toFixed(1)}M em causa</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Fatal Deadlines */}
        <div
          onClick={() => onNavigate('calendar')}
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prazos Fatais</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-600 font-mono">
              {pendingDeadlines.length}
            </span>
            <span className="text-xs text-slate-500 ml-2">contagem CPC</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-rose-600 font-medium">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" /> Próximo em 2 dias úteis
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Financial Flow */}
        <div
          onClick={() => onNavigate('financial')}
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recebido no Mês</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              R$ {(financial?.totalRecebidoMes || 148500).toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>A receber: R$ {(financial?.totalAReceberAberto || 31500).toLocaleString('pt-BR')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Clients & CRM */}
        <div
          onClick={() => onNavigate('crm')}
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes Ativos</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {clients.length}
            </span>
            <span className="text-xs text-slate-500 ml-2">pessoas e empresas</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-amber-700 font-medium">
            <span>{clients.filter((c) => c.status === 'ACTIVE').length} ativos • Baixo Risco</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Main Grid: Critical Deadlines & Hearings + Case Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Critical Deadlines (CPC Engine) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deadlines Box */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Prazos Processuais Iminentes (Contagem CPC/CLT)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Exclusão do dia de publicação, cômputo em dias úteis e suspensão do recesso forense
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenNewDeadline}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                >
                  + Novo Prazo
                </button>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {pendingDeadlines.slice(0, 4).map((dl) => (
                <div
                  key={dl.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {dl.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                        Fatal: {dl.dueDate}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {dl.daysCount} dias ({dl.calculationType === 'DIAS_UTEIS_CPC' ? 'Úteis CPC' : 'CLT'})
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {dl.caseTitle} • <span className="font-mono text-[11px] text-slate-700">{dl.caseNumber}</span>
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span>Publicado: {dl.publishDate}</span>
                      <span>•</span>
                      <span>Início: {dl.startDate}</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-medium">{dl.responsibleUserName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      onClick={() => onCompleteDeadline(dl.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Marcar como cumprido"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cumprido</span>
                    </button>
                    <button
                      onClick={() => onOpenAiGateway('draft')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors border border-slate-200"
                      title="Redigir peça com IA"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Hearings & Court Section */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pauta de Audiências & Julgamentos
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sessões virtuais (Teams/Zoom/PJe) e presenciais agendadas
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
              >
                Pauta completa <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {scheduledHearings.map((hr) => (
                <div
                  key={hr.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {hr.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border flex-shrink-0 ${
                        hr.locationType === 'VIRTUAL'
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {hr.locationType}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <p className="font-mono text-indigo-700 font-semibold">
                      📅 {hr.dateTime.replace('T', ' às ')}
                    </p>
                    <p className="truncate mt-0.5 text-slate-700 font-medium">{hr.caseTitle}</p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {hr.courtName} - {hr.addressOrLink}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Distribution & Recent Movements Feed */}
        <div className="space-y-6">
          {/* Legal Area Distribution */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Distribuição por Área
              </h2>
              <span className="text-xs text-slate-500 font-mono font-semibold">{cases.length} casos</span>
            </div>

            <div className="space-y-3">
              {Object.entries(areaCounts).map(([area, count]) => {
                const numCount = Number(count) || 0;
                const pct = cases.length > 0 ? Math.round((numCount / cases.length) * 100) : 0;
                return (
                  <div key={area} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{area}</span>
                      <span className="text-slate-500 font-mono">{numCount} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Procedural Movements Stream */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Andamentos Recentes
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                DJe Sync
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {movements.slice(0, 5).map((m) => (
                <div key={m.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-1 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900 truncate max-w-[170px]">{m.title}</span>
                    <span className="text-slate-400 font-mono">{m.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{m.content}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Fonte: {m.source}</span>
                    <span className="text-slate-500 font-medium">{m.createdBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
