import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Scale,
  User,
  Clock,
  FileText,
  Building2,
  ArrowRight,
  X,
  Command,
} from 'lucide-react';
import { api } from '../../services/api';
import { GlobalSearchResult } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (module: string, entityId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getIcon = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'CASE':
        return <Scale className="w-4 h-4 text-indigo-600" />;
      case 'CLIENT':
      case 'PERSON':
        return <User className="w-4 h-4 text-emerald-600" />;
      case 'DEADLINE':
        return <Clock className="w-4 h-4 text-rose-600" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <Building2 className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Input Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-white">
            <Search className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar processos, CNJ, clientes, CPFs, prazos ou peças..."
              autoFocus
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 mr-2 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <Command className="w-3 h-3" /> ESC
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
            {loading && (
              <div className="py-8 text-center text-sm text-slate-500">
                <div className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p>Buscando em todos os registros autorizados...</p>
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="py-8 text-center text-slate-500">
                <p className="text-sm font-medium text-slate-800">Nenhum resultado encontrado</p>
                <p className="text-xs text-slate-400 mt-1">
                  Tente pesquisar por número CNJ, razão social, CPF/CNPJ ou palavras-chave.
                </p>
              </div>
            )}

            {!loading && !query && (
              <div className="py-6 px-4 text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Sugestões de busca rápida</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setQuery('Horizonte')}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-left border border-slate-200 transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Construtora Horizonte S/A</span>
                  </button>
                  <button
                    onClick={() => setQuery('1048291')}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-left border border-slate-200 transition-colors"
                  >
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Processo Cível 1048291-45</span>
                  </button>
                  <button
                    onClick={() => setQuery('Contrarrazões')}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-left border border-slate-200 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>Prazo Contrarrazões Apelação</span>
                  </button>
                  <button
                    onClick={() => setQuery('Contrato')}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-left border border-slate-200 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Modelos de Contratos</span>
                  </button>
                </div>
              </div>
            )}

            {results.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  onSelectResult(item.linkAction.module, item.linkAction.entityId);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </p>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                            item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Multi-tenancy RLS ativo: isolamento seguro por escritório
            </span>
            <span className="font-mono text-slate-400">JurisFlow Enterprise Search</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
