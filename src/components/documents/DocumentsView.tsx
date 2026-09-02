import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Download,
  Copy,
  Check,
  Eye,
  Edit,
  Building,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react';
import { DocumentItem, DocumentTemplate, Case, Person } from '../../types';
import { api } from '../../services/api';

interface DocumentsViewProps {
  documents: DocumentItem[];
  templates: DocumentTemplate[];
  cases: Case[];
  persons: Person[];
  onSaveDocument: (data: Partial<DocumentItem>) => Promise<void>;
  onOpenAiGateway: (tab: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents = [],
  templates = [],
  cases = [],
  persons = [],
  onSaveDocument = async (_data: Partial<DocumentItem>) => {},
  onOpenAiGateway = (_tab: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'TEMPLATES'>('DOCUMENTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Template Render Modal State
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [renderedContent, setRenderedContent] = useState('');
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpenRenderTemplate = (tpl: DocumentTemplate) => {
    setSelectedTemplate(tpl);
    const vars = tpl.variables || tpl.placeholders || [];
    const initialVars: Record<string, string> = {};
    vars.forEach((v) => {
      initialVars[v] = '';
    });
    setTemplateVars(initialVars);
    setRenderedContent(tpl.templateContent);
    setIsRenderModalOpen(true);
  };

  const handleVariableChange = (key: string, val: string) => {
    const updated = { ...templateVars, [key]: val };
    setTemplateVars(updated);
    if (!selectedTemplate) return;

    let content = selectedTemplate.templateContent;
    for (const [k, v] of Object.entries(updated)) {
      const regex = new RegExp(`{{${k}}}`, 'g');
      content = content.replace(regex, v || `[${k}]`);
    }
    setRenderedContent(content);
  };

  const handleSaveRenderedAsDoc = async () => {
    if (!selectedTemplate) return;
    try {
      await onSaveDocument({
        title: `${selectedTemplate.title || selectedTemplate.name || 'Documento'} - ${new Date().toLocaleDateString('pt-BR')}`,
        category: selectedTemplate.category,
        content: renderedContent,
        status: 'DRAFT',
      });
      setIsRenderModalOpen(false);
      setActiveTab('DOCUMENTS');
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredDocs = documents.filter(
    (d) =>
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            Documentos & Minutas Jurídicas
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Repositório institucional de peças processuais, modelos contratuais parametrizados e gerador IA
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenAiGateway('draft')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Redigir Peça com IA (Gemini 3.7)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl self-start">
        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'DOCUMENTS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Peças & Documentos Salvos ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TEMPLATES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'TEMPLATES'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Modelos & Contratos Inteligentes ({templates.length})</span>
        </button>
      </div>

      {/* TAB 1: DOCUMENTS REPOSITORY */}
      {activeTab === 'DOCUMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                    {doc.category}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                    v{doc.currentVersion}.0
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.description}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{doc.createdBy}</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {doc.createdAt.slice(0, 10)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TEMPLATES ENGINE */}
      {activeTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-semibold">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(tpl.variables || tpl.placeholders || []).length} variáveis
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{tpl.title || tpl.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{tpl.description}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(tpl.variables || tpl.placeholders || []).map((v) => (
                    <span
                      key={v}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 font-mono border border-slate-200"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleOpenRenderTemplate(tpl)}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Preencher e Gerar Documento</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Template Dynamic Generator Modal */}
      {isRenderModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Gerador Dinâmico: {selectedTemplate.title || selectedTemplate.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha os campos para substituição em tempo real no instrumento jurídico
                </p>
              </div>
              <button
                onClick={() => setIsRenderModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Variable Inputs */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Variáveis do Contrato
                </h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {(selectedTemplate.variables || selectedTemplate.placeholders || []).map((v) => (
                    <div key={v}>
                      <label className="block text-[11px] font-mono text-slate-600 mb-1">
                        {v}
                      </label>
                      <input
                        type="text"
                        value={templateVars[v] || ''}
                        onChange={(e) => handleVariableChange(v, e.target.value)}
                        placeholder={`Inserir valor para ${v}...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Real-time Live Document Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pré-visualização do Documento
                  </h3>
                  <button
                    onClick={() => copyToClipboard(renderedContent)}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-text">
                  {renderedContent}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRenderModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveRenderedAsDoc}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
              >
                Salvar no Repositório do Escritório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-100">
                  {selectedDoc.category}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto select-text">
              {selectedDoc.content || 'Nenhum conteúdo salvo.'}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Criado por: {selectedDoc.createdBy}</span>
              <button
                onClick={() => copyToClipboard(selectedDoc.content)}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Texto Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
