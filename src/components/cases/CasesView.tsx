import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Search,
  Filter,
  Sparkles,
  Calendar,
  AlertTriangle,
  Building,
  User,
  Clock,
  FileText,
  ChevronRight,
  X,
  Send,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Case, Person, User as AppUser, Movement, AICaseSummaryResponse } from '../../types';
import { api } from '../../services/api';

interface CasesViewProps {
  cases: Case[];
  persons: Person[];
  users: AppUser[];
  onSaveCase: (data: Partial<Case>) => Promise<void>;
  onAddMovement: (caseId: string, data: Partial<Movement>) => Promise<void>;
  onOpenAiGateway: (tab: string, caseContext?: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({
  cases = [],
  persons = [],
  users = [],
  onSaveCase = async (_data: Partial<Case>) => {},
  onAddMovement = async (_caseId: string, _data: Partial<Movement>) => {},
  onOpenAiGateway = (_tab: string, _caseContext?: string) => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Case Detail Modal State
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseMovements, setCaseMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // AI Strategic Summary State
  const [aiSummary, setAiSummary] = useState<AICaseSummaryResponse | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  // New Movement Form
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [movementTitle, setMovementTitle] = useState('');
  const [movementContent, setMovementContent] = useState('');

  // New Case Modal State
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [type, setType] = useState<'JUDICIAL' | 'ADMINISTRATIVE' | 'CONSULTATIVE'>('JUDICIAL');
  const [legalArea, setLegalArea] = useState<any>('CIVIL');
  const [court, setCourt] = useState('TJSP');
  const [judicialBranch, setJudicialBranch] = useState('3ª Vara Cível da Comarca de São Paulo');
  const [claimValue, setClaimValue] = useState('150000');
  const [contingencyRisk, setContingencyRisk] = useState<'PROBABLE' | 'POSSIBLE' | 'REMOTE'>('POSSIBLE');
  const [phase, setPhase] = useState<'INICIAL' | 'INSTRUCAO' | 'DECISORIA' | 'RECURSAL' | 'CUMPRIMENTO_SENTENCA'>('INICIAL');
  const [responsibleLawyerId, setResponsibleLawyerId] = useState(users[0]?.id || 'u-carlos');
  const [submitting, setSubmitting] = useState(false);

  const resetNewCaseForm = () => {
    setTitle('');
    setCaseNumber('');
    setType('JUDICIAL');
    setLegalArea('CIVIL');
    setCourt('TJSP');
    setJudicialBranch('3ª Vara Cível da Comarca de São Paulo');
    setClaimValue('150000');
    setContingencyRisk('POSSIBLE');
    setPhase('INICIAL');
  };

  const handleOpenCaseDetail = async (c: Case) => {
    setSelectedCase(c);
    setAiSummary(null);
    setIsAddingMovement(false);
    setLoadingMovements(true);
    try {
      const detail = await api.getCaseDetail(c.id);
      setCaseMovements(detail.movements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleRequestAiSummary = async () => {
    if (!selectedCase) return;
    setLoadingAiSummary(true);
    try {
      const summary = await api.aiSummarizeCase(selectedCase.id);
      setAiSummary(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const handleSaveNewMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !movementTitle.trim()) return;

    try {
      await onAddMovement(selectedCase.id, {
        title: movementTitle,
        content: movementContent,
        date: new Date().toISOString().slice(0, 10),
      });
      setMovementTitle('');
      setMovementContent('');
      setIsAddingMovement(false);
      // Refresh movements
      const detail = await api.getCaseDetail(selectedCase.id);
      setCaseMovements(detail.movements || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSaveCase({
        title,
        caseNumber: caseNumber || `${Math.floor(1000000 + Math.random() * 9000000)}-45.2026.8.26.0100`,
        type,
        legalArea,
        court,
        judicialBranch,
        claimValue: Number(claimValue) || 0,
        contingencyRisk,
        phase,
        responsibleLawyerId,
        parties: [
          {
            id: `party-${Date.now()}`,
            tenantId: 't-silveira',
            caseId: '',
            personId: persons[0]?.id || 'p-1',
            role: 'AUTOR',
            isMainClient: true,
          } as any,
        ],
      });
      setIsNewCaseModalOpen(false);
      resetNewCaseForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.court.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArea = selectedArea === 'ALL' || c.legalArea === selectedArea;
    const matchesPhase = selectedPhase === 'ALL' || c.phase === selectedPhase;
    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;

    return matchesSearch && matchesArea && matchesPhase && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-indigo-600" />
            Processos & Casos Jurídicos
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Gestão processual contenciosa e consultiva, acompanhamento de andamentos do tribunal e análise preditiva
          </p>
        </div>

        <button
          onClick={() => {
            resetNewCaseForm();
            setIsNewCaseModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Distribuir / Novo Processo</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por número CNJ, título da ação, tribunal ou comarca..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Area filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="ALL">Todas as Áreas do Direito</option>
              <option value="CIVIL">Direito Cível & Contratos</option>
              <option value="TRABALHISTA">Direito do Trabalho (CLT)</option>
              <option value="TRIBUTARIO">Direito Tributário</option>
              <option value="EMPRESARIAL">Direito Societário & M&A</option>
              <option value="FAMILIA">Família & Sucessões</option>
              <option value="ADMINISTRATIVO">Direito Administrativo</option>
            </select>

            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="ALL">Todas as Fases</option>
              <option value="INICIAL">Fase Inicial / Petição</option>
              <option value="INSTRUCAO">Instrução Probatória</option>
              <option value="DECISORIA">Decisão / Sentença</option>
              <option value="RECURSAL">Fase Recursal (TJ/STJ)</option>
              <option value="CUMPRIMENTO_SENTENCA">Execução / Cumprimento</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCases.map((cs) => {
          return (
            <div
              key={cs.id}
              onClick={() => handleOpenCaseDetail(cs)}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                    {cs.legalArea}
                  </span>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      cs.contingencyRisk === 'PROBABLE'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : cs.contingencyRisk === 'POSSIBLE'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    Risco {cs.contingencyRisk}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {cs.title}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-1">{cs.caseNumber}</p>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{cs.court} - {cs.judicialBranch}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Advogado: {cs.responsibleLawyerName}</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-mono text-emerald-600 font-semibold">
                    <span>Valor da Causa: R$ {cs.claimValue.toLocaleString('pt-BR')}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono font-medium">
                  Fase: {cs.phase}
                </span>
                <span className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Ver Detalhes & IA <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-100">
                    {selectedCase.legalArea}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-medium">{selectedCase.caseNumber}</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedCase.title}</h2>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Strategic Action Bar */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Resumo Estratégico & Análise Preditiva (Gemini 3.7)</span>
                </div>
                <button
                  onClick={handleRequestAiSummary}
                  disabled={loadingAiSummary}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  {loadingAiSummary ? 'Analisando...' : 'Gerar Resumo por IA'}
                </button>
              </div>

              {aiSummary && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-mono">
                      Síntese da Lide
                    </span>
                    <p className="text-slate-700 mt-1 leading-relaxed">{aiSummary.sinteseFatos}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-mono">
                      Pontos Controversos & Teses
                    </span>
                    <ul className="list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                      {aiSummary.pontosControversos?.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 font-mono">
                      Recomendações Estratégicas
                    </span>
                    <ul className="list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                      {aiSummary.proximosPassosRecomendados?.map((passo, i) => (
                        <li key={i}>{passo}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">Risco: <strong className="text-amber-700">{aiSummary.grauRisco}</strong></span>
                    <button
                      onClick={() => onOpenAiGateway('draft', selectedCase.title)}
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Minutar Peça Judicial <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Case Overview Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Tribunal / Vara:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedCase.court} - {selectedCase.judicialBranch}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Valor da Causa:</span>
                <p className="font-mono font-bold text-emerald-600 mt-0.5">
                  R$ {selectedCase.claimValue.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Procedural Movements Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Andamentos Processuais ({caseMovements.length})
                </h3>
                <button
                  onClick={() => setIsAddingMovement(!isAddingMovement)}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  {isAddingMovement ? 'Cancelar' : '+ Novo Andamento'}
                </button>
              </div>

              {isAddingMovement && (
                <form onSubmit={handleSaveNewMovement} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Título do Andamento / Despacho *</label>
                    <input
                      type="text"
                      required
                      value={movementTitle}
                      onChange={(e) => setMovementTitle(e.target.value)}
                      placeholder="Ex: Juntada de Petição de Manifestação"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Conteúdo / Detalhes</label>
                    <textarea
                      rows={2}
                      value={movementContent}
                      onChange={(e) => setMovementContent(e.target.value)}
                      placeholder="Descreva a intimação ou ato praticado..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                  >
                    Salvar Andamento
                  </button>
                </form>
              )}

              {loadingMovements ? (
                <div className="py-6 text-center text-xs text-slate-400">Carregando andamentos...</div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {caseMovements.map((mov) => (
                    <div key={mov.id} className="relative pl-6 space-y-1 text-xs">
                      <div className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{mov.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">{mov.date}</span>
                      </div>
                      <p className="text-slate-600">{mov.content}</p>
                      <span className="text-[10px] text-slate-400 block font-mono">Fonte: {mov.source} • {mov.createdBy}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Distribute New Case */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                Cadastrar / Distribuir Novo Processo
              </h2>
              <button onClick={() => setIsNewCaseModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Título da Causa / Ação *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Ação de Cobrança c/c Indenização por Perdas e Danos"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Número do Processo (CNJ)</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="0000000-00.2026.8.26.0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Área do Direito</label>
                  <select
                    value={legalArea}
                    onChange={(e) => setLegalArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CIVIL">Cível & Contratos</option>
                    <option value="TRABALHISTA">Trabalhista (CLT)</option>
                    <option value="TRIBUTARIO">Tributário</option>
                    <option value="EMPRESARIAL">Societário & Empresarial</option>
                    <option value="FAMILIA">Família & Sucessões</option>
                    <option value="ADMINISTRATIVO">Administrativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tribunal</label>
                  <input
                    type="text"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    placeholder="TJSP / TRT-2 / TRF-3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Vara / Juízo</label>
                  <input
                    type="text"
                    value={judicialBranch}
                    onChange={(e) => setJudicialBranch(e.target.value)}
                    placeholder="3ª Vara Cível"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Valor da Causa (R$)</label>
                  <input
                    type="number"
                    value={claimValue}
                    onChange={(e) => setClaimValue(e.target.value)}
                    placeholder="150000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Classificação de Risco</label>
                  <select
                    value={contingencyRisk}
                    onChange={(e) => setContingencyRisk(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PROBABLE">Provável (Favorável)</option>
                    <option value="POSSIBLE">Possível (Moderado)</option>
                    <option value="REMOTE">Remoto (Desfavorável)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCaseModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Cadastrando...' : 'Cadastrar Processo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
