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
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AIExtractDeadlineResponse,
  AIDraftPieceResponse,
  AICaseSummaryResponse,
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
  initialTab = 'extract',
  onSaveExtractedDeadline = async (_data: Partial<Deadline>) => {},
  onSaveDraftedDoc = async (_title: string, _cat: string, _content: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'extract' | 'draft' | 'summary' | 'chat' | 'stats'>(
    (initialTab as any) || 'extract'
  );

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
      text: 'Olá, Dr. Carlos! Sou o assistente jurídico inteligente JurisFlow AI com suporte à jurisprudência brasileira e CPC/2015. Como posso auxiliá-lo hoje?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // --- 5. STATS ---
  const [aiStats, setAiStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await api.getAiStats();
      setAiStats(stats);
    } catch (err) {
      console.error(err);
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
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-700 text-white p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-semibold mb-2 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Gateway Jurídico • Gemini 3.7 Flash Ativo</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">
              Inteligência Artificial & Automação Forense
            </h1>
            <p className="text-xs lg:text-sm text-indigo-100 mt-1 max-w-2xl">
              Extração neural de prazos do Diário de Justiça, minutador estruturado de peças processuais e análise preditiva de litígios.
            </p>
          </div>

          {/* Token Stats mini badge */}
          {aiStats && (
            <div className="p-3 rounded-lg bg-white/10 border border-white/20 text-xs font-mono space-y-1 self-start md:self-auto backdrop-blur-xs">
              <div className="flex justify-between gap-4 text-indigo-100">
                <span>Requisições IA:</span>
                <span className="text-white font-bold">{aiStats.totalRequests}</span>
              </div>
              <div className="flex justify-between gap-4 text-indigo-100">
                <span>Custo Acumulado:</span>
                <span className="text-emerald-300 font-bold">R$ {aiStats.totalCostBRL.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start overflow-x-auto">
        <button
          onClick={() => setActiveTab('extract')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'extract'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Extrator de Prazos (DJe / DJEN)</span>
        </button>

        <button
          onClick={() => setActiveTab('draft')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'draft'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Redator de Peças Processuais</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>Resumo & Análise de Caso</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'chat'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Chat Jurídico</span>
        </button>
      </div>

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
