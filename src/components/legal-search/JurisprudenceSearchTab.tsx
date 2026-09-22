import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Scale,
  Bookmark,
  BookmarkCheck,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Share2,
  FileCheck,
  Briefcase,
  X,
} from 'lucide-react';
import { JurisprudenceSearchParams, Case, PrecedentFavoriteItem } from '../../types';
import { api } from '../../services/api';

interface JurisprudenceSearchTabProps {
  existingCases: Case[];
  favorites: PrecedentFavoriteItem[];
  onToggleFavorite: (item: any) => Promise<void>;
  onOpenAiGateway?: (tab: string, context?: string) => void;
  onShowToast: (msg: string) => void;
}

export const JurisprudenceSearchTab: React.FC<JurisprudenceSearchTabProps> = ({
  existingCases = [],
  favorites = [],
  onToggleFavorite,
  onOpenAiGateway,
  onShowToast,
}) => {
  const [query, setQuery] = useState('');
  const [court, setCourt] = useState('ALL');
  const [legalArea, setLegalArea] = useState('ALL');
  const [onlyBinding, setOnlyBinding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Associate to Case Modal State
  const [selectedPrecedentForCase, setSelectedPrecedentForCase] = useState<any | null>(null);
  const [targetCaseId, setTargetCaseId] = useState<string>('');
  const [associating, setAssociating] = useState(false);

  // Expanded Ementas
  const [expandedEmentas, setExpandedEmentas] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedEmentas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await api.searchJurisprudence({
        query,
        courtCodes: court !== 'ALL' ? [court] : undefined,
        subject: legalArea !== 'ALL' ? legalArea : undefined,
        onlyQualifiedPrecedents: onlyBinding,
        page: 1,
        pageSize: 15,
      });

      setSearchResults(res.results || []);
      setTotalFound(res.total || 0);
      setExecutionTime(res.executionTimeMs || 0);
      setSources(res.sourcesConsulted || []);
    } catch (err: any) {
      onShowToast(`Erro ao pesquisar jurisprudência: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCitation = (item: any) => {
    if (item.evidenceState !== 'VERIFIED_OFFICIAL') {
      onShowToast('Uso bloqueado: somente precedentes verificados em fonte oficial podem ser copiados para peças.');
      return;
    }
    const citation = `${item.courtCode}. ${item.rapporteur || 'Relator'}. Acórdão ${item.caseNumber || item.id}. Julgado em ${item.judgmentDate || 'data não informada'}.\n\nEMENTA:\n${item.headnote}`;
    navigator.clipboard.writeText(citation);
    setCopiedId(item.id);
    onShowToast('Citação jurisprudencial copiada para a área de transferência.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAssociatePrecedent = async () => {
    if (!targetCaseId || !selectedPrecedentForCase) return;
    if (selectedPrecedentForCase.evidenceState !== 'VERIFIED_OFFICIAL') {
      onShowToast('Vinculação bloqueada: o precedente ainda não foi verificado na fonte oficial.');
      return;
    }
    setAssociating(true);

    try {
      const res = await api.associatePrecedentToCase({
        caseId: targetCaseId,
        citation: `${selectedPrecedentForCase.courtCode} - ${selectedPrecedentForCase.caseNumber || selectedPrecedentForCase.id}`,
        headnote: selectedPrecedentForCase.headnote,
        thesis: selectedPrecedentForCase.thesis,
        officialUrl: selectedPrecedentForCase.officialUrl || 'https://jurisprudencia.stj.jus.br',
      });

      if (res.success) {
        onShowToast('Precedente vinculado com sucesso ao histórico do processo.');
        setSelectedPrecedentForCase(null);
        setTargetCaseId('');
      }
    } catch (err: any) {
      onShowToast(`Erro ao vincular precedente: ${err.message}`);
    } finally {
      setAssociating(false);
    }
  };

  const isFavorited = (decisionId: string) => {
    return favorites.some((f) => f.decisionId === decisionId);
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="mb-4 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              Pesquisa Jurisprudencial & Precedentes Vinculantes
            </h3>
            <p className="text-xs text-slate-500">
              Pesquisa no acervo realmente sincronizado; cada resultado informa seu estado de evidência
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {favorites.length} precedentes favoritados
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Digite termos de busca, teses jurídicas, número do RE/REsp ou enunciado de Súmula..."
              className="w-full pl-10 pr-24 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 shadow-sm"
              required
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Buscando
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Pesquisar
                </>
              )}
            </button>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tribunal</label>
              <select
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
              >
                <option value="ALL">Todos os Tribunais</option>
                <option value="STF">STF - Supremo Tribunal Federal</option>
                <option value="STJ">STJ - Superior Tribunal de Justiça</option>
                <option value="TST">TST - Tribunal Superior do Trabalho</option>
                <option value="TJSP">TJSP - Tribunal de Justiça de São Paulo</option>
                <option value="TJRJ">TJRJ - Tribunal de Justiça do Rio de Janeiro</option>
                <option value="TRF1">TRF-1 - Federal 1ª Região</option>
                <option value="TRF3">TRF-3 - Federal 3ª Região</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ramo do Direito</label>
              <select
                value={legalArea}
                onChange={(e) => setLegalArea(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
              >
                <option value="ALL">Todas as Áreas</option>
                <option value="CIVIL">Direito Civil</option>
                <option value="CONSUMIDOR">Direito do Consumidor</option>
                <option value="TRABALHISTA">Direito do Trabalho</option>
                <option value="TRIBUTARIO">Direito Tributário</option>
                <option value="EMPRESARIAL">Direito Empresarial</option>
                <option value="ADMINISTRATIVO">Direito Administrativo</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={onlyBinding}
                  onChange={(e) => setOnlyBinding(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>Apenas Precedentes Vinculantes / Repetitivos</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      {hasSearched && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
          <div>
            Encontrados <span className="font-bold text-slate-800">{totalFound}</span> acórdãos e precedentes em{' '}
            <span className="font-mono text-slate-700">{executionTime}ms</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Fontes consultadas:</span>
            {sources.map((s, idx) => (
              <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {searchResults.map((item) => {
          const isExpanded = expandedEmentas[item.id];
          const isFav = isFavorited(item.id);

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              {/* Card Top */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                      {item.courtCode}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-800">
                      {item.caseNumber || item.id}
                    </span>
                    {item.isBinding && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Precedente Vinculante
                      </span>
                    )}
                    {item.legalArea && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {item.legalArea}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.evidenceState === 'VERIFIED_OFFICIAL'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : item.evidenceState === 'FOUND_PENDING_REVIEW'
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {item.evidenceState === 'VERIFIED_OFFICIAL'
                        ? 'Verificado em fonte oficial'
                        : item.evidenceState === 'FOUND_PENDING_REVIEW'
                          ? 'Encontrado, pendente de conferência'
                          : 'Não verificado — proibido usar em peça'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.organ || 'Órgão Julgador'} • Relator: <strong className="text-slate-700">{item.rapporteur || 'Des. Relator'}</strong> • Julgado em {item.judgmentDate}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => handleCopyCitation(item)}
                    disabled={item.evidenceState !== 'VERIFIED_OFFICIAL'}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={item.evidenceState === 'VERIFIED_OFFICIAL' ? 'Copiar citação verificada' : 'Bloqueado até conferência oficial'}
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isFav
                        ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-slate-50'
                    }`}
                    title={isFav ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
                  >
                    {isFav ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPrecedentForCase(item)}
                    disabled={item.evidenceState !== 'VERIFIED_OFFICIAL'}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center gap-1 hover:bg-sky-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={item.evidenceState === 'VERIFIED_OFFICIAL' ? 'Vincular a processo' : 'Bloqueado até conferência oficial'}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Vincular a Processo</span>
                  </button>

                  {item.officialUrl && (
                    <a
                      href={item.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                      title="Abrir no Repositório Oficial do Tribunal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Tese Fixada if exists */}
              {item.thesis && (
                <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700 block">
                    Tese Jurídica Fixada
                  </span>
                  <p className="font-medium leading-relaxed">{item.thesis}</p>
                </div>
              )}

              {/* Headnote (Ementa) */}
              <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3.5 rounded-lg border border-slate-100 space-y-2">
                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                  Ementa
                </span>
                <p className={`whitespace-pre-line ${!isExpanded ? 'line-clamp-3' : ''}`}>
                  {item.headnote}
                </p>
                {item.headnote && item.headnote.length > 200 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 pt-1"
                  >
                    {isExpanded ? (
                      <>
                        <span>Ver menos</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Ler ementa completa</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {hasSearched && searchResults.length === 0 && !loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-700">Nenhum precedente localizado</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhum registro do acervo sincronizado passou pelo controle de competência, pertinência e evidência. Nenhuma jurisprudência será inventada.
            </p>
          </div>
        )}
      </div>

      {/* Associate Precedent Modal */}
      {selectedPrecedentForCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Vincular Precedente a Processo</h3>
                  <p className="text-xs text-slate-500">
                    Adiciona o precedente ao histórico e peças do caso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrecedentForCase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700">Precedente Selecionado:</span>
                <p className="font-semibold text-slate-900">
                  {selectedPrecedentForCase.courtCode} - {selectedPrecedentForCase.caseNumber || selectedPrecedentForCase.id}
                </p>
                <p className="text-slate-600 line-clamp-2">{selectedPrecedentForCase.headnote}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selecione o Processo Ativo no JurisFlow
                </label>
                <select
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                  required
                >
                  <option value="">Selecione um processo cadastrado...</option>
                  {existingCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.title} ({c.court})
                    </option>
                  ))}
                </select>
                {existingCases.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Nenhum processo cadastrado. Importe um processo pela aba de consulta para habilitar vinculações.
                  </p>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPrecedentForCase(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAssociatePrecedent}
                  disabled={!targetCaseId || associating}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {associating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirmar Vinculação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
