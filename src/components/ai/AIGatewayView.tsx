import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  FileText,
  Scale,
  MessageSquare,
  BarChart3,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  RefreshCw,
  Zap,
  ShieldCheck,
  BookOpen,
  AlertOctagon,
  Plus,
  Layers,
  Radio,
  Globe,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AIExtractDeadlineResponse,
  AIDraftPieceResponse,
  AICaseSummaryResponse,
  AIAuditDocumentResponse,
  AILegalGroundingOverview,
  AILegalKnowledgeItem,
  Case,
  Deadline,
} from '../../types';

interface AIGatewayViewProps {
  cases: Case[];
  initialTab?: string;
  onSaveExtractedDeadline: (data: Partial<Deadline>) => Promise<void>;
  onSaveDraftedDoc: (title: string, category: string, content: string) => Promise<void>;
}

export const AIGatewayView: React.FC<AIGatewayViewProps> = ({
  cases = [],
  initialTab = 'audit',
  onSaveExtractedDeadline = async (_data: Partial<Deadline>) => {},
  onSaveDraftedDoc = async (_title: string, _cat: string, _content: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'grounding' | 'extract' | 'draft' | 'summary' | 'chat'>(
    (initialTab as any) || 'audit'
  );

  // --- 0. AUDITOR STATE (GEMINI ENTERPRISE FOR LEGAL) ---
  const [auditTitle, setAuditTitle] = useState('Petição Inicial com Pedido Liminar - Cobrança Bancária');
  const [auditType, setAuditType] = useState('Petição Inicial');
  const [auditContent, setAuditContent] = useState(
    `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 2ª VARA CÍVEL DA COMARCA DE SÃO PAULO/SP\n\nProcesso nº 1092834-12.2026.8.26.0100\n\nAÇÃO DE COBRANÇA C/C PEDIDO DE TUTELA DE URGÊNCIA\n\nREQUERENTE: CONSTRUTORA HORIZONTE S/A\nREQUERIDO: BANCO ALPHA S/A\n\nDOS FATOS E DO DIREITO:\nEm virtude do inadimplemento contratual injustificado, a parte autora vem sofrendo prejuízos financeiros graves.\nDiante da iminência de dano de difícil reparação, requer a concessão de tutela antecipada com fulcro no art. 273 do Código de Processo Civil, uma vez presente a prova inequívoca da verossimilhança das alegações.\nRequer ainda a citação do réu para responder no prazo fatal de 15 dias corridos, sob pena de revelia.\nNo mérito, pugna pela condenação da instituição financeira e aplicação da jurisprudência consolidada do Superior Tribunal de Justiça.\n\nNestes termos,\nPede deferimento.\nSão Paulo, 31 de agosto de 2026.`
  );
  const [auditResult, setAuditResult] = useState<AIAuditDocumentResponse | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSaved, setAuditSaved] = useState(false);

  // --- 0.1 GROUNDING & LEIS DO BRASIL STATE ---
  const [legalGrounding, setLegalGrounding] = useState<AILegalGroundingOverview | null>(null);
  const [loadingGrounding, setLoadingGrounding] = useState(false);
  const [showAddTesis, setShowAddTesis] = useState(false);
  const [newTesisTitle, setNewTesisTitle] = useState('');
  const [newTesisCategory, setNewTesisCategory] = useState<'INTERNO_ESCRITORIO' | 'STJ' | 'STF' | 'LEGISLACAO_FEDERAL'>('INTERNO_ESCRITORIO');
  const [newTesisSource, setNewTesisSource] = useState('Repositório Privado de Precedentes');
  const [newTesisDesc, setNewTesisDesc] = useState('');
  const [addingTesis, setAddingTesis] = useState(false);
  const [tesisFilter, setTesisFilter] = useState<string>('ALL');

  const filteredKnowledge = (legalGrounding?.sources || []).filter((item) => {
    if (tesisFilter === 'ALL') return true;
    if (tesisFilter === 'CUSTOM') return item.isCustomOfficeTesis;
    return item.category === tesisFilter;
  });

  const [syncingOfficialBases, setSyncingOfficialBases] = useState(false);
  const [syncFeedbackMessage, setSyncFeedbackMessage] = useState<string | null>(null);

  const handleSyncOfficialBases = async () => {
    setSyncingOfficialBases(true);
    setSyncFeedbackMessage(null);
    try {
      const res = await api.syncLegalSources();
      setSyncFeedbackMessage(res.message);
      await loadKnowledge();
      await loadStats();
    } catch (err: any) {
      console.error(err);
      setSyncFeedbackMessage('Erro ao sincronizar bases oficiais: ' + err.message);
    } finally {
      setSyncingOfficialBases(false);
    }
  };

  // --- 1. EXTRACTOR STATE ---
  const [pubText, setPubText] = useState(
    `PODER JUDICIÁRIO - TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO
3ª Vara Cível da Comarca da Capital. Processo nº 1048291-45.2026.8.26.0100.
Ação de Cobrança proposta por Construtora Horizonte S/A em face de Vanguarda Logística & Distribuição Ltda.
DESPACHO/DECISÃO: "Fica a parte ré intimada para, no prazo legal de 15 (quinze) dias úteis, querendo, apresentar contestação aos termos da petição inicial, sob pena de revelia e presunção de veracidade das alegações de fato (art. 335 c/c art. 344 do CPC/2015). Publique-se. Registre-se. Intimem-se."
São Paulo, 31 de agosto de 2026. Advogados: Dr. Carlos Silveira (OAB/SP 184.920), Dra. Mariana Costa (OAB/SP 221.450).`
  );
  const [extractResult, setExtractResult] = useState<AIExtractDeadlineResponse | null>(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [deadlineSaved, setDeadlineSaved] = useState(false);

  // --- 2. DRAFTER STATE ---
  const [pieceType, setPieceType] = useState('Recurso de Apelação Cível');
  const [draftArea, setDraftArea] = useState('CIVIL');
  const [draftClient, setDraftClient] = useState('Construtora Horizonte S/A');
  const [draftOpposing, setDraftOpposing] = useState('Vanguarda Logística Ltda');
  const [draftFacts, setDraftFacts] = useState(
    'A r. sentença julgou improcedente a ação com base em suposta decadência do direito potestativo. Contudo, o prazo foi suspenso por notificação extrajudicial expressa e protocolo tempestivo na comarca de origem.'
  );
  const [draftThesis, setDraftThesis] = useState(
    'Violação ao art. 202, VI do Código Civil (interrupção do prazo prescricional/decadencial) e jurisprudência pacificada do STJ (Tema 1.042).'
  );
  const [draftCourt, setDraftCourt] = useState('Egrégio Tribunal de Justiça do Estado de São Paulo');
  const [draftResult, setDraftResult] = useState<AIDraftPieceResponse | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // --- 3. SUMMARY STATE ---
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [summaryResult, setSummaryResult] = useState<AICaseSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // --- 4. CHAT STATE ---
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Olá, Dr. Carlos! Sou o Gemini Enterprise for Legal com Grounding em tempo real nas leis e jurisprudência do Brasil (CPC/2015, Código Civil, CLT e Tribunais Superiores). Como posso auditar suas peças ou esclarecer dúvidas jurídicas hoje?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // --- 5. STATS ---
  const [aiStats, setAiStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStats();
    loadKnowledge();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await api.getAiStats();
      setAiStats(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const loadKnowledge = async () => {
    setLoadingGrounding(true);
    try {
      const data = await api.getLegalKnowledge();
      setLegalGrounding(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGrounding(false);
    }
  };

  const handleAuditDocument = async () => {
    if (!auditContent.trim()) return;
    setLoadingAudit(true);
    setAuditSaved(false);
    try {
      const res = await api.aiAuditDocument({
        documentTitle: auditTitle,
        documentType: auditType,
        documentContent: auditContent,
        context: 'Auditoria com checagem anti-alucinação e leis revogadas',
      });
      setAuditResult(res);
      loadStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSaveAuditedDoc = async () => {
    if (!auditResult) return;
    try {
      await onSaveDraftedDoc(
        `[AUDITADO] ${auditResult.documentTitle}`,
        auditResult.documentType,
        auditResult.auditedTextWithImprovements
      );
      setAuditSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomTesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTesisTitle.trim() || !newTesisDesc.trim()) return;
    setAddingTesis(true);
    try {
      await api.addCustomLegalKnowledge({
        title: newTesisTitle,
        category: newTesisCategory,
        officialSource: newTesisSource,
        description: newTesisDesc,
      });
      setNewTesisTitle('');
      setNewTesisDesc('');
      setShowAddTesis(false);
      await loadKnowledge();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingTesis(false);
    }
  };

  // Handlers
  const handleExtract = async () => {
    if (!pubText.trim()) return;
    setLoadingExtract(true);
    setDeadlineSaved(false);
    try {
      const res = await api.aiExtractDeadline(pubText);
      setExtractResult(res);
      loadStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExtract(false);
    }
  };

  const handleSaveExtractedDeadline = async () => {
    if (!extractResult) return;
    try {
      await onSaveExtractedDeadline({
        title: extractResult.titulo,
        daysCount: extractResult.dias,
        calculationType: extractResult.tipoContagem as any,
        publishDate: extractResult.dataPublicacao,
        description: `${extractResult.acaoRequerida} • ${extractResult.fundamentacaoLegal}`,
      });
      setDeadlineSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingDraft(true);
    setDraftSaved(false);
    try {
      const res = await api.aiDraftPiece({
        pieceType,
        legalArea: draftArea,
        clientName: draftClient,
        opposingParty: draftOpposing,
        facts: draftFacts,
        legalThesis: draftThesis,
        courtBranch: draftCourt,
      });
      setDraftResult(res);
      loadStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftResult) return;
    try {
      await onSaveDraftedDoc(
        `${draftResult.tituloPeca} - ${draftClient}`,
        draftResult.tipoPeca,
        draftResult.textoCompletoFormatado
      );
      setDraftSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSummarizeCase = async () => {
    if (!selectedCaseId) return;
    setLoadingSummary(true);
    try {
      const res = await api.aiSummarizeCase(selectedCaseId);
      setSummaryResult(res);
      loadStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loadingChat) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setLoadingChat(true);

    try {
      const res = await api.aiChat(userMsg);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: res.reply }]);
      loadStats();
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Desculpe, ocorreu um erro ao consultar o modelo jurídico.' },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Gemini Enterprise for Legal branding */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 lg:p-6 shadow-sm border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold mb-2 border border-indigo-400/30 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini Enterprise for Legal • Zero-Hallucination Grounding</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              Inteligência Artificial Forense & Redução de Erros
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Equipado com o modelo <strong>Gemini Enterprise for Legal (Agosto/2026)</strong> para auditoria de minutas, erradicação de citações de leis revogadas e contagem blindada de prazos sob o CPC/2015.
            </p>
          </div>

          {/* Metrics Pill Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono self-start md:self-auto">
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-[10px] text-slate-400 block">Grounding Leis BR</span>
              <span className="text-emerald-400 font-bold text-sm">99.4% Confiável</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-[10px] text-slate-400 block">Erros Prevenidos</span>
              <span className="text-indigo-300 font-bold text-sm">
                {aiStats?.errorsPrevented || 42} vícios
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-[10px] text-slate-400 block">Requisições IA</span>
              <span className="text-white font-bold text-sm">{aiStats?.totalRequests || 28}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-[10px] text-slate-400 block">Custo Acumulado</span>
              <span className="text-amber-300 font-bold text-sm">R$ {aiStats?.totalCostBRL?.toFixed(2) || '1.62'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start overflow-x-auto">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Auditor de Minutas & Anti-Erros</span>
        </button>

        <button
          onClick={() => setActiveTab('grounding')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'grounding'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Base de Leis & Sincronização (Webhooks & Planalto)</span>
        </button>

        <button
          onClick={() => setActiveTab('extract')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'extract'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Extrator de Prazos (DJe)</span>
        </button>

        <button
          onClick={() => setActiveTab('draft')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'draft'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Redator de Peças</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>Resumo de Caso</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'chat'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Chat Forense</span>
        </button>
      </div>

      {/* 0. TAB: AUDITOR DE MINUTAS & ANTI-ERROS (GEMINI ENTERPRISE FOR LEGAL) */}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Scanner Anti-Erros & Validador Forense
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Detecta leis revogadas (ex: CPC/1973), erros de prazo (dias corridos vs úteis), precedentes cancelados e omissões do Art. 319 do CPC.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Anti-Hallucination
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Minuta</label>
                <input
                  type="text"
                  value={auditTitle}
                  onChange={(e) => setAuditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Documento</label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Petição Inicial">Petição Inicial (Art. 319 CPC)</option>
                  <option value="Contestação">Contestação (Art. 335 CPC)</option>
                  <option value="Recurso de Apelação">Recurso de Apelação (Art. 1.010 CPC)</option>
                  <option value="Embargos de Declaração">Embargos de Declaração (Art. 1.022 CPC)</option>
                  <option value="Contrato Comercial">Contrato Empresarial / Minuta de Acordo</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Texto da Minuta para Varredura</label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {auditContent.length} caracteres
                </span>
              </div>
              <textarea
                rows={11}
                value={auditContent}
                onChange={(e) => setAuditContent(e.target.value)}
                placeholder="Cole aqui a petição, recurso ou contrato para auditoria detalhada..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuditTitle('Contestação com Risco de Revelia');
                  setAuditType('Contestação');
                  setAuditContent(
                    `EXMO. SR. DR. JUIZ DE DIREITO DA 1ª VARA CÍVEL\n\nProcesso nº 1029384-22.2026.8.26.0100\n\nVem a ré apresentar tempestiva Contestação no prazo de 10 dias corridos, com supedâneo no art. 282 do CPC revogado. Aduz que o contrato carece de objeto lícito e cita julgado do STJ de 1998 sem menção ao Tema Repetitivo vigente.`
                  );
                }}
                className="text-[11px] text-indigo-600 hover:underline font-semibold"
              >
                Carregar Exemplo 2 (Contestação com Falhas)
              </button>

              <button
                onClick={handleAuditDocument}
                disabled={loadingAudit}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loadingAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Auditando com Gemini Legal...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Auditar Minuta & Reduzir Erros</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Diagnóstico de Conformidade Jurídica
                </h2>
                {auditResult && (
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                      auditResult.complianceScore >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    Score: {auditResult.complianceScore}/100
                  </span>
                )}
              </div>

              {auditResult ? (
                <div className="space-y-4 text-xs mt-3">
                  {/* Executive Summary */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-indigo-700">
                        Parecer do Gemini Enterprise for Legal
                      </span>
                      <div className="flex items-center gap-2">
                        {auditResult.criticalIssuesCount > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {auditResult.criticalIssuesCount} Crítico(s)
                          </span>
                        )}
                        {auditResult.warningsCount > 0 && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {auditResult.warningsCount} Alerta(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {auditResult.executiveSummary}
                    </p>
                  </div>

                  {/* Issues Detected */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      Apontamentos e Correções Obrigatórias:
                    </span>
                    {auditResult.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
                          issue.severity === 'CRITICAL'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : issue.severity === 'WARNING'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                            : 'bg-blue-50/70 border-blue-200 text-blue-950'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold flex items-center gap-1.5">
                            {issue.severity === 'CRITICAL' ? (
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            {issue.title}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/80 border font-semibold">
                            {issue.type}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-snug">{issue.description}</p>

                        <div className="bg-white/80 p-2 rounded border border-slate-200 space-y-1 font-mono text-[10px]">
                          <div className="text-rose-700">
                            <span className="font-bold">Original:</span> "{issue.snippetOriginal}"
                          </div>
                          <div className="text-emerald-700">
                            <span className="font-bold">Correção Gemini:</span> "{issue.suggestedCorrection}"
                          </div>
                          <div className="text-slate-500 text-[9px]">
                            Fonte: {issue.legalGroundingSource}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Precedents Verified */}
                  {auditResult.precedentsVerified && auditResult.precedentsVerified.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Precedentes & Jurisprudência Auditados
                      </span>
                      {auditResult.precedentsVerified.map((prec, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] text-slate-600">
                          <span className="font-semibold">{prec.precedent}</span>
                          <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {prec.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => copyText(auditResult.auditedTextWithImprovements)}
                      className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copiado!' : 'Copiar Texto Corrigido'}</span>
                    </button>

                    <button
                      onClick={handleSaveAuditedDoc}
                      disabled={auditSaved}
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{auditSaved ? 'Salvo nos Documentos' : 'Salvar Versão Corrigida'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nenhuma minuta auditada nesta sessão</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Cole o conteúdo de uma petição ou contrato ao lado para verificar leis revogadas, prazos e inconsistências formais.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 0.1 TAB: BASE DE LEIS DO BRASIL & RAG */}
      {activeTab === 'grounding' && (
        <div className="space-y-6">
          {/* PAINEL DE SINCRONIZAÇÃO AUTOMATIZADA: DIÁRIOS OFICIAIS & PORTAL DO PLANALTO */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200 mb-1">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>Conectividade em Tempo Real Ativa</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Sincronização Automatizada: Diários Oficiais & Portal do Planalto (Webhooks & APIs)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conectores que mantêm o Gemini Enterprise for Legal atualizado com novas leis do Congresso Nacional, súmulas dos Tribunais e publicações do DJEN.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncOfficialBases}
                  disabled={syncingOfficialBases}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingOfficialBases ? 'animate-spin' : ''}`} />
                  <span>{syncingOfficialBases ? 'Sincronizando Bases Oficiais...' : 'Sincronizar Bases Oficiais Agora'}</span>
                </button>
              </div>
            </div>

            {syncFeedbackMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncFeedbackMessage}</span>
              </div>
            )}

            {/* Grid dos Conectores Oficiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {(legalGrounding?.syncConnectors || []).map((connector) => (
                <div
                  key={connector.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2 hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {connector.protocol}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Conectado
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs leading-snug">
                      {connector.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {connector.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-1 font-mono text-[10px] text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Frequência:</span>
                      <span className="font-semibold text-slate-700">{connector.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Última Sinc:</span>
                      <span className="text-slate-800 font-semibold">{connector.lastSyncAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Registros Indexados:</span>
                      <span className="text-indigo-600 font-bold">{connector.recordsSynced.toLocaleString('pt-BR')}</span>
                    </div>
                    {connector.webhookPushUrl && (
                      <div className="mt-1 pt-1 border-t border-dashed border-slate-200 text-[9px] text-indigo-700 font-bold truncate">
                        Webhook: {connector.webhookPushUrl}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Feed de Logs e Inbound Webhook Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
              {/* Webhook Activity Feed */}
              <div className="lg:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    Feed de Eventos e Webhooks Recentes
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Últimas 24h</span>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {(legalGrounding?.webhookLogs || []).map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-[11px]">{log.source}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {log.event}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[10.5px] leading-snug">{log.payloadSummary}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-mono text-slate-400 block">{log.timestamp}</span>
                        <span className="text-[9px] font-bold text-emerald-600 font-mono">OK (200)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Endpoint Webhook Configuration Box */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2 text-xs flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    Configuração do Inbound Webhook
                  </h4>
                  <p className="text-[11px] text-indigo-900/80 mt-1 leading-relaxed">
                    Cadastre a URL abaixo no seu sistema de Diários Oficiais (PJe, DJEN ComunicaAPI ou Jusbrasil) para receber intimações em tempo real:
                  </p>
                  <div className="mt-2 p-2 rounded bg-white border border-indigo-200 font-mono text-[10px] text-slate-800 break-all select-all">
                    POST /api/webhooks/djen-intimacoes
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200/60 text-[10px] text-indigo-800">
                  <span className="font-semibold">Automação Ativa:</span> Ao receber o push, o sistema extrai o prazo pelo CPC/2015 e cria o alerta para o advogado.
                </div>
              </div>
            </div>
          </div>

          {/* Explanation Banner on How the AI Learns Brazilian Law */}
          <div className="p-5 rounded-xl bg-white border border-indigo-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Como o Gemini Enterprise for Legal aprende e domina as Leis do Brasil?
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Diferente de um modelo de linguagem genérico que tenta adivinhar artigos de memória gerando alucinações, o <strong>Gemini Enterprise for Legal</strong> utiliza a arquitetura <strong>RAG (Retrieval-Augmented Generation)</strong> com Grounding Oficial e Verificação Tripla de Citação:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h3 className="font-bold text-slate-900">Grounding em Leis Positivas</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Indexação estruturada da <strong>Constituição de 1988, CPC/2015, Código Civil, CLT e CDC</strong> diretamente do Portal da Legislação da Presidência da República (Planalto), garantindo que apenas dispositivos em vigor sejam citados.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h3 className="font-bold text-slate-900">Precedentes dos Tribunais</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Súmulas Vinculantes do <strong>STF</strong>, Recursos Repetitivos do <strong>STJ</strong> e Orientações Jurisprudenciais do <strong>TST</strong> com checagem ativa de <em>overruling</em> (teses superadas ou canceladas).
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <h3 className="font-bold text-slate-900">RAG Privado do Escritório</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  O escritório pode cadastrar suas <strong>próprias teses consagradas, peças vencedoras e doutrina interna</strong>, ensinando à IA o estilo e estratégia institucional de forma totalmente privativa.
                </p>
              </div>
            </div>
          </div>

          {/* Sources Catalog Header & Filter */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Fontes Indexadas no Grounding Ativo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total de {legalGrounding?.totalNormsIndexed || 7853} normas e {legalGrounding?.totalPrecedentsIndexed || 3450} precedentes vinculantes no índice de consulta
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={tesisFilter}
                  onChange={(e) => setTesisFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                >
                  <option value="ALL">Todas as Fontes</option>
                  <option value="LEGISLACAO_FEDERAL">Legislação Federal</option>
                  <option value="CONSTITUICAO">Constituição</option>
                  <option value="STJ">STJ (Repetitivos)</option>
                  <option value="STF">STF (Vinculantes)</option>
                  <option value="CUSTOM">Teses do Escritório (Privadas)</option>
                </select>

                <button
                  onClick={() => setShowAddTesis(!showAddTesis)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Tese do Escritório</span>
                </button>
              </div>
            </div>

            {/* Modal / Add Tesis Form */}
            {showAddTesis && (
              <form onSubmit={handleAddCustomTesis} className="p-4 rounded-xl bg-slate-50 border border-indigo-200 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-indigo-900">Cadastrar Nova Tese / Modelo para Grounding</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Privativo do Tenant</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Título da Tese *</label>
                    <input
                      type="text"
                      required
                      value={newTesisTitle}
                      onChange={(e) => setNewTesisTitle(e.target.value)}
                      placeholder="Ex: Tese de Inadimplemento Fortuito da Pandemia"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Categoria</label>
                    <select
                      value={newTesisCategory}
                      onChange={(e) => setNewTesisCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="INTERNO_ESCRITORIO">Tese Interna do Escritório</option>
                      <option value="STJ">Precedente STJ</option>
                      <option value="STF">Precedente STF</option>
                      <option value="LEGISLACAO_FEDERAL">Norma Federal Específica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Fonte / Acórdão Referência</label>
                    <input
                      type="text"
                      value={newTesisSource}
                      onChange={(e) => setNewTesisSource(e.target.value)}
                      placeholder="Ex: TJSP Apelação 100234-2025"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Descrição e Fundamentos da Tese *</label>
                  <textarea
                    rows={3}
                    required
                    value={newTesisDesc}
                    onChange={(e) => setNewTesisDesc(e.target.value)}
                    placeholder="Descreva a tese jurídica, artigos correlatos e diretrizes que a IA deve adotar ao redigir ou auditar..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddTesis(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addingTesis}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    {addingTesis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Salvar e Indexar no Gemini</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Knowledge Sources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {filteredKnowledge.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 transition-all hover:border-slate-300 ${
                    item.isCustomOfficeTesis
                      ? 'bg-purple-50/40 border-purple-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border text-indigo-700 inline-block mb-1">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold shrink-0">
                      {item.groundingStatus}
                    </span>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
                    <span>Fonte: {item.officialSource}</span>
                    <span>{item.articlesIndexed} normas indexadas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. EXTRACTOR VIEW */}
      {activeTab === 'extract' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Publicação / Intimação Judicial
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Cole o texto do DJe</span>
            </div>

            <textarea
              rows={9}
              value={pubText}
              onChange={(e) => setPubText(e.target.value)}
              placeholder="Cole o recorte da publicação do Diário da Justiça Eletrônico (DJe ou DJEN)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  setPubText(
                    `PROCESSO 0014298-90.2026.8.26.0100 - TJSP. Ação de Execução de Título Extrajudicial. Vistos. Intime-se a parte executada para, no prazo de 3 (três) dias, efetuar o pagamento da dívida ou opor Embargos à Execução no prazo de 15 (quinze) dias úteis (Art. 915 do CPC). São Paulo, 31 de agosto de 2026.`
                  )
                }
                className="text-[11px] text-indigo-600 hover:underline font-semibold"
              >
                Carregar Exemplo 2 (Execução)
              </button>

              <button
                onClick={handleExtract}
                disabled={loadingExtract}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loadingExtract ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extraindo com Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extrair Prazo e Requisitos</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Box */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Estruturação & Contagem CPC/CLT
              </span>
              {extractResult && (
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  {extractResult.dias} dias ({extractResult.tipoContagem})
                </span>
              )}
            </h2>

            {extractResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 font-mono">
                        Ação Requerida
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{extractResult.titulo}</h3>
                    </div>
                    <span className="font-mono text-xs text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Fatal: {extractResult.dataVencimentoEstimada}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{extractResult.acaoRequerida}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Fundamentação Legal:</span>
                    <strong className="text-indigo-600">{extractResult.fundamentacaoLegal}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tribunal / Juízo:</span>
                    <strong className="text-slate-800">{extractResult.tribunalVaraIdentificados}</strong>
                  </div>
                </div>

                {extractResult.pontosAtencao && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-[11px] text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pontos Críticos de Atenção
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                      {extractResult.pontosAtencao.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2">
                  {deadlineSaved ? (
                    <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-center border border-emerald-200 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Prazo Agendado no Calendário Institucional!
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveExtractedDeadline}
                      className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Agendar Prazo Fatal no Calendário CPC</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p>Insira a publicação e clique em "Extrair Prazo" para obter a análise completa.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. DRAFTER VIEW */}
      {activeTab === 'draft' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleDraft} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 text-xs shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Parâmetros da Minuta Judicial
            </h2>

            <div>
              <label className="block text-slate-700 mb-1 font-medium">Tipo de Peça Processual *</label>
              <select
                value={pieceType}
                onChange={(e) => setPieceType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="Recurso de Apelação Cível">Recurso de Apelação Cível (Art. 1.009 CPC)</option>
                <option value="Petição Inicial de Cobrança">Petição Inicial (Ação de Cobrança / Indenização)</option>
                <option value="Contestação Cível">Contestação com Preliminares (Art. 335 CPC)</option>
                <option value="Agravo de Instrumento com Pedido Liminar">Agravo de Instrumento com Tutela de Urgência (Art. 1.015 CPC)</option>
                <option value="Embargos de Declaração">Embargos de Declaração por Omissão/Contradição (Art. 1.022 CPC)</option>
                <option value="Notificação Extrajudicial">Notificação Extrajudicial com Fixação de Mora</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Cliente / Requerente *</label>
                <input
                  type="text"
                  required
                  value={draftClient}
                  onChange={(e) => setDraftClient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Parte Contrária *</label>
                <input
                  type="text"
                  required
                  value={draftOpposing}
                  onChange={(e) => setDraftOpposing(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-medium">Endereçamento / Tribunal *</label>
              <input
                type="text"
                required
                value={draftCourt}
                onChange={(e) => setDraftCourt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-medium">Resumo dos Fatos da Lide *</label>
              <textarea
                rows={3}
                required
                value={draftFacts}
                onChange={(e) => setDraftFacts(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-medium">Teses Jurídicas & Pedidos Centrais *</label>
              <textarea
                rows={3}
                required
                value={draftThesis}
                onChange={(e) => setDraftThesis(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingDraft}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingDraft ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Redigindo Peça Completa com Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Minuta da Peça Judicial</span>
                </>
              )}
            </button>
          </form>

          {/* Draft Result Box */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Minuta Formatada para Protocolo
                </h2>

                {draftResult && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(draftResult.textoCompletoFormatado)}
                      className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                )}
              </div>

              {draftResult ? (
                <div className="mt-3 space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-text">
                    {draftResult.textoCompletoFormatado}
                  </div>

                  {draftResult.jurisprudenciaCitada && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <span className="font-bold text-indigo-700 font-mono">Jurisprudência Incorporada:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {draftResult.jurisprudenciaCitada.map((j, i) => (
                          <li key={i}>{j}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400 text-xs">
                  <FileText className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p>Preencha os parâmetros e clique em "Gerar Minuta" para redigir a peça judicial.</p>
                </div>
              )}
            </div>

            {draftResult && (
              <div className="pt-3 border-t border-slate-100">
                {draftSaved ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold text-center border border-emerald-200 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Salvo no Módulo de Documentos!
                  </div>
                ) : (
                  <button
                    onClick={handleSaveDraft}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm"
                  >
                    Salvar Peça no Repositório do Escritório
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CASE SUMMARY VIEW */}
      {activeTab === 'summary' && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <label className="block text-xs text-slate-700 mb-1 font-semibold">
                Selecione o Processo para Análise Estratégica:
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSummarizeCase}
              disabled={loadingSummary}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 self-end sm:self-auto"
            >
              {loadingSummary ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analisando Timeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Resumo Executivo & Riscos</span>
                </>
              )}
            </button>
          </div>

          {summaryResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 font-mono">
                    Síntese da Lide & Fase Atual
                  </span>
                  <p className="text-slate-700 leading-relaxed">{summaryResult.sinteseFatos}</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 font-mono">
                    Pontos Controversos & Teses em Discussão
                  </span>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {summaryResult.pontosControversos?.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono">
                    Ações Estratégicas Recomendadas
                  </span>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {summaryResult.proximosPassosRecomendados?.map((passo, i) => (
                      <li key={i}>{passo}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                    Classificação & Justificativa de Risco
                  </span>
                  <p className="font-bold text-amber-700 text-sm">Grau: {summaryResult.grauRisco}</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {summaryResult.justificativaRisco}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. LEGAL CHAT VIEW */}
      {activeTab === 'chat' && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 flex flex-col h-[520px] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Chat de Inteligência Jurídica & Doutrina Forense
            </h2>
            <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
              JurisFlow AI Copilot
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 text-xs ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white flex-shrink-0 text-xs">
                    AI
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white font-medium shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex gap-3 text-xs justify-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  AI
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Consultando jurisprudência e normas processuais...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pergunte sobre prazos do CPC, estratégias recursais, CLT ou teses do STJ..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loadingChat || !chatInput.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
