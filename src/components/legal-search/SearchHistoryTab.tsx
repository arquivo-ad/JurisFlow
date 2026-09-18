import React, { useState, useEffect } from 'react';
import {
  History,
  Bookmark,
  BookmarkCheck,
  Search,
  Calendar,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Scale,
  Clock,
} from 'lucide-react';
import { JudicialSearchHistoryItem, PrecedentFavoriteItem } from '../../types';
import { api } from '../../services/api';

interface SearchHistoryTabProps {
  favorites: PrecedentFavoriteItem[];
  onToggleFavorite: (item: any) => Promise<void>;
  onSelectQuery?: (query: string) => void;
  onShowToast: (msg: string) => void;
}

export const SearchHistoryTab: React.FC<SearchHistoryTabProps> = ({
  favorites = [],
  onToggleFavorite,
  onSelectQuery,
  onShowToast,
}) => {
  const [historyItems, setHistoryItems] = useState<JudicialSearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'FAVORITES' | 'HISTORY'>('FAVORITES');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await api.getJudicialSearchHistory();
      setHistoryItems(items || []);
    } catch (err: any) {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCitation = (item: PrecedentFavoriteItem) => {
    const citation = `${item.courtCode}. ${item.citation}.\n\nEMENTA:\n${item.headnote}`;
    navigator.clipboard.writeText(citation);
    setCopiedId(item.id);
    onShowToast('Citação copiada para a área de transferência.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('FAVORITES')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
            subTab === 'FAVORITES'
              ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-500" />
          <span>Precedentes Salvos ({favorites.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('HISTORY')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
            subTab === 'HISTORY'
              ? 'bg-sky-50 text-sky-800 border border-sky-200 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5 text-sky-600" />
          <span>Histórico de Consultas ({historyItems.length})</span>
        </button>
      </div>

      {/* Favorites View */}
      {subTab === 'FAVORITES' && (
        <div className="space-y-3">
          {favorites.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
              <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-700">Nenhum precedente salvo ainda</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ao realizar pesquisas jurisprudenciais, clique no ícone de marcador para salvar ementas relevantes para suas teses.
              </p>
            </div>
          ) : (
            favorites.map((fav) => (
              <div
                key={fav.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        {fav.courtCode}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{fav.citation}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Salvo em {new Date(fav.savedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-start">
                    <button
                      type="button"
                      onClick={() => handleCopyCitation(fav)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-slate-50 transition-colors"
                      title="Copiar Citação"
                    >
                      {copiedId === fav.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onToggleFavorite({
                          decisionId: fav.decisionId,
                        })
                      }
                      className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Remover dos favoritos"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                    </button>

                    {fav.officialUrl && (
                      <a
                        href={fav.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                        title="Ver no Tribunal"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {fav.thesis && (
                  <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700 block mb-0.5">
                      Tese Vinculante
                    </span>
                    <p>{fav.thesis}</p>
                  </div>
                )}

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {fav.headnote}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* History View */}
      {subTab === 'HISTORY' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
          {historyItems.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-700">Nenhuma consulta registrada no histórico</h4>
            </div>
          ) : (
            historyItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.searchType}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{item.query}</span>
                    {item.courtCode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        {item.courtCode}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{new Date(item.timestamp).toLocaleString('pt-BR')}</span>
                    <span>•</span>
                    <span>{item.resultsCount} resultados</span>
                  </p>
                </div>

                {onSelectQuery && (
                  <button
                    type="button"
                    onClick={() => onSelectQuery(item.query)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline flex-shrink-0"
                  >
                    Repetir Consulta
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
