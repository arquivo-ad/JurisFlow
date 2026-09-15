import React, { useState, useEffect } from 'react';
import {
  Award,
  Upload,
  Check,
  Building2,
  FileText,
  Eye,
  Sliders,
  Type,
  Palette,
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Tenant, TenantVisualIdentity } from '../../types';
import { api } from '../../services/api';

interface BrandingSettingsTabProps {
  currentTenant: Tenant | null;
  onTenantUpdated?: (updated: Tenant) => void;
}

export const BrandingSettingsTab: React.FC<BrandingSettingsTabProps> = ({
  currentTenant,
  onTenantUpdated,
}) => {
  const initialVi: TenantVisualIdentity = currentTenant?.visualIdentity || {
    logoUrl: currentTenant?.logoUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&auto=format&fit=crop&q=80',
    logoPosition: 'left',
    signatureImageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
    signatoryName: 'Dra. Gabriela M. Manni Capitani',
    signatoryOab: 'OAB/SP 478.370',
    signatoryRole: 'Advogada Sócia e Titular',
    headerAddress: 'R. Cap. Alfredo de Paula Salgado, 110, Pindamonhangaba/SP • Tel: (12) 99148-6012',
    footerText: `${currentTenant?.name || 'Gabriela Capitani Advocacia'} • Sigilo, Excelência e Prática Forense Humanizada`,
    headerStyle: 'CLASSIC',
    fontFamily: 'Times New Roman',
    bodyFontSize: '12pt',
    lineSpacing: '1.5',
    paragraphIndent: true,
    citationIndent: true,
    closingFormula: 'Termos em que, Pede e Espera Deferimento.',
    jurisprudenceStyle: 'DESTAQUE_ENXUTO',
    editorialTone: 'TECNICO_DIRETO',
    templates: [
      {
        id: 'tmpl-inicial',
        name: 'Petição Inicial Cível ABNT',
        category: 'PETICAO',
        content:
          'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE PINDAMONHANGABA/SP\n\n[QUALIFICAÇÃO COMPLETA DA PARTE AUTORA], por sua advogada infra-assinada, vem respeitosamente perante Vossa Excelência propor a presente AÇÃO INDENIZATÓRIA...\n\nDOS FATOS...\nDO DIREITO...\nDOS PEDIDOS...',
        isDefault: true,
      },
      {
        id: 'tmpl-procuracao',
        name: 'Procuração Ad Judicia et Extra',
        category: 'PROCURACAO',
        content:
          'PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: [NOME DO CLIENTE], [ESTADO CIVIL], [PROFISSÃO], inscrito no CPF sob nº [CPF], residente e domiciliado em [ENDEREÇO COMPLETO].\n\nOUTORGADA: DRA. GABRIELA M. MANNI CAPITANI, brasileira, advogada inscrita nos quadros da OAB/SP sob o nº 478.370...\n\nPODERES: Cláusula ad judicia et extra para o foro em geral...',
        isDefault: true,
      },
      {
        id: 'tmpl-honorarios',
        name: 'Contrato de Honorários Advocatícios',
        category: 'CONTRATO',
        content:
          'CONTRATO DE PRESTAÇÃO DE SERVIÇOS JURÍDICOS E HONORÁRIOS ADVOCATÍCIOS\n\nCONTRATANTE: [NOME DO CLIENTE], [CPF/CNPJ]\nCONTRATADA: GABRIELA CAPITANI ADVOCACIA, representada por Dra. Gabriela M. Manni Capitani, OAB/SP 478.370...\n\nCLÁUSULA PRIMEIRA - DO OBJETO E REMUNERAÇÃO...',
        isDefault: true,
      },
    ],
  };

  const [vi, setVi] = useState<TenantVisualIdentity>(initialVi);
  const [activePreviewDoc, setActivePreviewDoc] = useState<'PETICAO' | 'PROCURACAO' | 'CONTRATO'>('PETICAO');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id: string; name: string; category: string; content: string } | null>(null);
  const [templateFormData, setTemplateFormData] = useState({ name: '', category: 'PETICAO', content: '' });

  useEffect(() => {
    if (currentTenant?.visualIdentity) {
      setVi(currentTenant.visualIdentity);
    }
  }, [currentTenant]);

  const handleSave = async () => {
    if (!currentTenant) return;
    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await api.updateTenantVisualIdentity(currentTenant.id, vi);
      if (onTenantUpdated) onTenantUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Falha ao salvar identidade visual:', err);
      alert('Erro ao salvar identidade visual: ' + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      category: 'PETICAO',
      content: 'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO...',
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: any) => {
    setEditingTemplate(tmpl);
    setTemplateFormData({
      name: tmpl.name,
      category: tmpl.category,
      content: tmpl.content,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const currentTemplates = [...(vi.templates || [])];
    if (editingTemplate) {
      const idx = currentTemplates.findIndex((t) => t.id === editingTemplate.id);
      if (idx !== -1) {
        currentTemplates[idx] = {
          ...currentTemplates[idx],
          name: templateFormData.name,
          category: templateFormData.category,
          content: templateFormData.content,
        };
      }
    } else {
      currentTemplates.push({
        id: `tmpl-${Date.now()}`,
        name: templateFormData.name,
        category: templateFormData.category,
        content: templateFormData.content,
        isDefault: false,
      });
    }
    setVi({ ...vi, templates: currentTemplates });
    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Deseja excluir este modelo de documento?')) {
      const currentTemplates = (vi.templates || []).filter((t) => t.id !== id);
      setVi({ ...vi, templates: currentTemplates });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm shrink-0 mt-0.5">
            <Palette className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Identidade Visual & Papel Timbrado Oficial
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                ABNT & Padrão OAB
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Configure a chancela oficial, logotipo, tipografia forense e modelos de peças do escritório. Todas as minutas geradas pelo Gemini Enterprise for Legal herdarão esta formatação automaticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span className="animate-pulse">Salvando...</span>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Identidade</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Controls & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Logotipo & Assinatura Digital */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Award className="w-4 h-4 text-indigo-600" />
              1. Logotipo e Chancela da Advocacia
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-semibold">URL do Logotipo Oficial</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vi.logoUrl || ''}
                    onChange={(e) => setVi({ ...vi, logoUrl: e.target.value })}
                    placeholder="https://.../logo.png"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                  {vi.logoUrl && (
                    <img
                      src={vi.logoUrl}
                      alt="Logo"
                      className="w-8 h-8 rounded object-contain border border-slate-200 bg-white"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-700 font-semibold">Alinhamento do Logotipo no Cabeçalho</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['left', 'center', 'right'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setVi({ ...vi, logoPosition: pos })}
                      className={`py-1.5 rounded-lg border text-[11px] font-semibold capitalize transition-all ${
                        vi.logoPosition === pos
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome do Titular / Signatário</label>
                <input
                  type="text"
                  value={vi.signatoryName || ''}
                  onChange={(e) => setVi({ ...vi, signatoryName: e.target.value })}
                  placeholder="Dra. Gabriela M. Manni Capitani"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inscrição OAB do Titular</label>
                <input
                  type="text"
                  value={vi.signatoryOab || ''}
                  onChange={(e) => setVi({ ...vi, signatoryOab: e.target.value })}
                  placeholder="OAB/SP 478.370"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Cargo / Função Forense</label>
                <input
                  type="text"
                  value={vi.signatoryRole || ''}
                  onChange={(e) => setVi({ ...vi, signatoryRole: e.target.value })}
                  placeholder="Advogada Sócia e Titular"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <label className="block text-slate-700 font-semibold">URL da Assinatura / Imagem da Chancela (PNG Transparente)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={vi.signatureImageUrl || ''}
                  onChange={(e) => setVi({ ...vi, signatureImageUrl: e.target.value })}
                  placeholder="https://.../assinatura.png"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono text-[11px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
                {vi.signatureImageUrl && (
                  <img
                    src={vi.signatureImageUrl}
                    alt="Chancela"
                    className="h-8 max-w-[80px] object-contain border border-slate-200 bg-white p-1 rounded"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Tipografia & Normas ABNT Forenses */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Type className="w-4 h-4 text-indigo-600" />
              2. Tipografia Forense & Padrões Normativos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Família Tipográfica</label>
                <select
                  value={vi.fontFamily || 'Times New Roman'}
                  onChange={(e) => setVi({ ...vi, fontFamily: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Times New Roman">Times New Roman (Clássico Forense)</option>
                  <option value="Arial">Arial (Direto / Limpo)</option>
                  <option value="Calibri">Calibri (Moderno)</option>
                  <option value="Garamond">Garamond (Elegante / Editorial)</option>
                  <option value="Georgia">Georgia (Serifado Confortável)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tamanho da Fonte</label>
                <select
                  value={vi.bodyFontSize || '12pt'}
                  onChange={(e) => setVi({ ...vi, bodyFontSize: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="11pt">11 pt</option>
                  <option value="12pt">12 pt (Padrão Oficial ABNT)</option>
                  <option value="13pt">13 pt (Maior Conforto Visual)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Espaçamento Entre Linhas</label>
                <select
                  value={vi.lineSpacing || '1.5'}
                  onChange={(e) => setVi({ ...vi, lineSpacing: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="1.0">1.0 (Simples)</option>
                  <option value="1.15">1.15 (Compacto)</option>
                  <option value="1.5">1.5 (Padrão ABNT / Tribunais)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Citação Jurisprudencial</label>
                <select
                  value={vi.jurisprudenceStyle || 'DESTAQUE_ENXUTO'}
                  onChange={(e) => setVi({ ...vi, jurisprudenceStyle: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="DESTAQUE_ENXUTO">Destaque Enxuto (Recuo 4cm + Fonte Reduzida)</option>
                  <option value="EMENDA_INTEGRAL">Ementa Integral Transcrita</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tom Editorial do Gemini IA</label>
                <select
                  value={vi.editorialTone || 'TECNICO_DIRETO'}
                  onChange={(e) => setVi({ ...vi, editorialTone: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="TECNICO_DIRETO">Técnico e Direto (Objetivo / Sucinto)</option>
                  <option value="COMBATIVO_ELOQUENTE">Combativo e Eloquente (Enfático)</option>
                  <option value="CONCILIATORIO">Conciliatório / Negocial</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <label className="block text-slate-700 font-semibold">Fórmula de Fechamento Padrão</label>
              <input
                type="text"
                value={vi.closingFormula || ''}
                onChange={(e) => setVi({ ...vi, closingFormula: e.target.value })}
                placeholder="Termos em que, Pede e Espera Deferimento."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Card 3: Modelos Pré-Formatados */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                3. Modelos Pré-Formatados Cadastrados ({vi.templates?.length || 0})
              </h3>
              <button
                type="button"
                onClick={handleOpenAddTemplate}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Modelo</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(vi.templates || []).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{t.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-mono uppercase font-semibold">
                        {t.category}
                      </span>
                      {t.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 font-mono text-[11px] truncate mt-0.5">
                      {t.content.slice(0, 70)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTemplate(t)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive A4 Letterhead Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              Pré-Visualização em Tempo Real (Folha A4)
            </h3>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-semibold">
              {(['PETICAO', 'PROCURACAO', 'CONTRATO'] as const).map((doc) => (
                <button
                  key={doc}
                  onClick={() => setActivePreviewDoc(doc)}
                  className={`px-2 py-1 rounded transition-all ${
                    activePreviewDoc === doc
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {doc === 'PETICAO' ? 'Petição' : doc === 'PROCURACAO' ? 'Procuração' : 'Contrato'}
                </button>
              ))}
            </div>
          </div>

          {/* Sheet Preview Container */}
          <div className="p-4 bg-slate-200/80 rounded-2xl border border-slate-300 shadow-inner flex justify-center">
            <div
              className="w-full max-w-[440px] bg-white rounded-lg shadow-xl p-6 border border-slate-200 flex flex-col justify-between min-h-[580px] text-slate-800 transition-all select-none"
              style={{
                fontFamily: vi.fontFamily || 'Times New Roman',
                fontSize: vi.bodyFontSize === '11pt' ? '11px' : vi.bodyFontSize === '13pt' ? '13px' : '12px',
                lineHeight: vi.lineSpacing === '1.0' ? '1.2' : vi.lineSpacing === '1.15' ? '1.35' : '1.6',
              }}
            >
              {/* Official Header */}
              <div
                className={`border-b-2 border-slate-800 pb-3 flex flex-col ${
                  vi.logoPosition === 'center'
                    ? 'items-center text-center'
                    : vi.logoPosition === 'right'
                    ? 'items-end text-right'
                    : 'items-start text-left'
                }`}
              >
                {vi.logoUrl ? (
                  <img
                    src={vi.logoUrl}
                    alt="Logo Escritório"
                    className="h-10 max-w-[140px] object-contain mb-1.5"
                  />
                ) : (
                  <span className="font-bold text-sm text-slate-900 uppercase tracking-widest font-['Cinzel']">
                    {currentTenant?.name || 'GABRIELA CAPITANI ADVOCACIA'}
                  </span>
                )}
                <p className="text-[9px] text-slate-600 font-sans leading-tight">
                  {vi.headerAddress || currentTenant?.tradeName}
                </p>
                <p className="text-[8px] text-indigo-700 font-mono mt-0.5">
                  Registro: {currentTenant?.oabOfficeRegister || 'OAB/SP 478.370'}
                </p>
              </div>

              {/* Document Body Sample */}
              <div className="py-4 space-y-3 flex-1">
                {activePreviewDoc === 'PETICAO' && (
                  <>
                    <p className="font-bold text-center uppercase tracking-wide text-[11px]">
                      EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE PINDAMONHANGABA/SP
                    </p>
                    <p className="font-mono text-[9px] text-slate-500">
                      Autos nº 1002341-89.2026.8.26.0445
                    </p>
                    <p className={vi.paragraphIndent ? 'indent-6 text-justify' : 'text-justify'}>
                      <strong>EMPRESA ALPHA LTDA</strong>, por sua advogada subscritora, vem perante Vossa Excelência apresentar <strong>RÉPLICA À CONTESTAÇÃO</strong> com esteio no art. 350 do Código de Processo Civil...
                    </p>
                    {vi.jurisprudenceStyle === 'DESTAQUE_ENXUTO' ? (
                      <div className="pl-6 border-l-2 border-indigo-400 py-1 text-[10px] italic text-slate-700 bg-slate-50 rounded-r">
                        &quot;O descumprimento de dever acessório acarreta rescisão culposa com perdas e danos integrais.&quot; (STJ, REsp 1.942.112/SP, Rel. Min. Terceira Turma, j. 18/08/2026).
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-50 border border-slate-200 text-[9px] leading-tight">
                        EMENTA: APELAÇÃO CÍVEL. CONTRATOS. INADIMPLEMENTO. DANO MATERIAL COMPROVADO. RECURSO PROVIDO.
                      </div>
                    )}
                    <p className={vi.paragraphIndent ? 'indent-6 text-justify' : 'text-justify'}>
                      Requer o regular prosseguimento do feito com a procedência in totum dos pleitos formulados na exordial.
                    </p>
                  </>
                )}

                {activePreviewDoc === 'PROCURACAO' && (
                  <>
                    <p className="font-bold text-center uppercase tracking-widest text-[11px] pb-1 border-b border-slate-200">
                      PROCURAÇÃO AD JUDICIA ET EXTRA
                    </p>
                    <p className="text-justify text-[10px]">
                      <strong>OUTORGANTE:</strong> JOÃO DA SILVA, brasileiro, empresário, portador do CPF nº 123.456.789-00...
                    </p>
                    <p className="text-justify text-[10px]">
                      <strong>OUTORGADA:</strong> {vi.signatoryName || 'DRA. GABRIELA M. MANNI CAPITANI'}, {vi.signatoryOab || 'OAB/SP 478.370'}...
                    </p>
                    <p className="text-justify text-[9px] text-slate-600">
                      PODERES: Confere amplos poderes para o foro em geral, com cláusula ad judicia et extra, em qualquer Juízo, Instância ou Tribunal...
                    </p>
                  </>
                )}

                {activePreviewDoc === 'CONTRATO' && (
                  <>
                    <p className="font-bold text-center uppercase tracking-widest text-[11px] pb-1 border-b border-slate-200">
                      CONTRATO DE HONORÁRIOS ADVOCATÍCIOS
                    </p>
                    <p className="text-justify text-[10px]">
                      Pelo presente instrumento particular, as partes identificadas celebram a prestação de serviços jurídicos forenses...
                    </p>
                    <p className="text-justify text-[10px]">
                      <strong>CLÁUSULA 1ª:</strong> O objeto consiste no patrocínio da Ação de Cobrança com honorários pró-labore e de êxito...
                    </p>
                  </>
                )}

                {/* Closing Formula */}
                <p className="text-right pt-2 font-medium italic text-[10px]">
                  {vi.closingFormula || 'Termos em que, Pede e Espera Deferimento.'}
                </p>
                <p className="text-right text-[9px] text-slate-600 font-sans">
                  Pindamonhangaba/SP, {new Date().toLocaleDateString('pt-BR')}.
                </p>
              </div>

              {/* Signature Block */}
              <div className="pt-2 flex flex-col items-center text-center">
                {vi.signatureImageUrl ? (
                  <img
                    src={vi.signatureImageUrl}
                    alt="Chancela da Advogada"
                    className="h-10 object-contain mb-0.5"
                  />
                ) : (
                  <div className="w-32 border-b border-slate-700 mb-1" />
                )}
                <p className="font-bold text-[10px] text-slate-900 leading-tight">
                  {vi.signatoryName || 'Dra. Gabriela M. Manni Capitani'}
                </p>
                <p className="text-[9px] text-indigo-700 font-mono">
                  {vi.signatoryOab || 'OAB/SP 478.370'}
                </p>
                <p className="text-[8px] text-slate-500 font-sans">
                  {vi.signatoryRole || 'Advogada Sócia e Titular'}
                </p>
              </div>

              {/* Official Footer */}
              <div className="border-t border-slate-300 pt-2 text-center text-[8px] text-slate-500 font-sans">
                {vi.footerText || `${currentTenant?.name || 'Gabriela Capitani Advocacia'} • OAB/SP 478.370`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {editingTemplate ? 'Editar Modelo Pré-Formatado' : 'Novo Modelo de Peça Timbrada'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nome do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    placeholder="Ex: Réplica com Pedido de Julgamento Antecipado"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Categoria Forense</label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="PETICAO">Petição / Peça Processual</option>
                    <option value="PROCURACAO">Procuração Forense</option>
                    <option value="CONTRATO">Contrato de Honorários</option>
                    <option value="PARECER">Parecer Jurídico</option>
                    <option value="NOTIFICACAO">Notificação Extrajudicial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Conteúdo da Minuta / Template</label>
                <textarea
                  rows={8}
                  required
                  value={templateFormData.content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                  placeholder="Insira o texto com os placeholders [NOME DO CLIENTE], [QUALIFICAÇÃO], etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-mono text-[11px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-xs"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
