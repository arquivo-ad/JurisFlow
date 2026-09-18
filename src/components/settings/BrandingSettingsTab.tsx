import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Printer,
  Wand2,
  Scissors,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileSpreadsheet,
  Layers,
  Layout,
  HelpCircle,
  Info,
  ChevronRight,
  ShieldAlert,
  Settings2,
  FileSignature,
  Loader2,
  X,
  Download,
  FileCode,
} from 'lucide-react';
import { Tenant, TenantVisualIdentity } from '../../types';
import { api } from '../../services/api';
import { formatLawyerNameInBody } from '../../utils/forensicFormatter';

interface BrandingSettingsTabProps {
  currentTenant: Tenant | null;
  onTenantUpdated?: (updated: Tenant) => void;
}

const FORENSIC_ACCENT_COLORS = [
  { name: 'Vinho Nobre / Bordô Oficial', hex: '#5C1217' },
  { name: 'Índigo Forense', hex: '#4338ca' },
  { name: 'Azul Marinho Nobre', hex: '#1e1b4b' },
  { name: 'Azul Real', hex: '#1e3a8a' },
  { name: 'Bordô Jurídico', hex: '#831843' },
  { name: 'Verde Esmeralda', hex: '#0f766e' },
  { name: 'Grafite Supremo', hex: '#1e293b' },
  { name: 'Bronze & Ouro', hex: '#b45309' },
];

export const BrandingSettingsTab: React.FC<BrandingSettingsTabProps> = ({
  currentTenant,
  onTenantUpdated,
}) => {
  const initialVi: TenantVisualIdentity = currentTenant?.visualIdentity || {
    logoUrl: currentTenant?.visualIdentity?.logoUrl !== undefined ? currentTenant.visualIdentity.logoUrl : (currentTenant?.logoUrl || ''),
    logoPosition: 'left',
    signatureImageUrl: currentTenant?.visualIdentity?.signatureImageUrl !== undefined ? currentTenant.visualIdentity.signatureImageUrl : '',
    signatoryName: 'Dra. Gabriela M. Manni Capitani',
    signatoryOab: 'OAB/SP 478.370',
    signatoryRole: 'Advogada Sócia e Titular',
    headerAddress: 'R. Cap. Alfredo de Paula Salgado, 110, Pindamonhangaba/SP',
    contactPhone: '(12) 99148-6012',
    contactEmail: 'contato@gabrielacapitani.adv.br',
    footerText: `${currentTenant?.name || 'Gabriela Capitani Advocacia'} • Sigilo, Excelência e Prática Forense Humanizada`,
    showHeaderOab: true,
    showHeaderAddress: false, // Default false: law firms usually don't want address on top
    showHeaderPhone: false,   // Default false: cell phone optional
    showHeaderEmail: false,
    showHeaderCnpj: false,
    showFooterText: true,
    showFooterAddress: false,
    showFooterPhone: false,
    showFooterEmail: false,
    showDigitalSignatureSeal: true,
    headerStyle: 'MINIMALIST',
    accentColor: '#4338ca',
    borderStyle: 'SOLID',
    borderWidth: '2px',
    logoMaxHeight: 44,
    headerPadding: 'NORMAL',
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
          'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE PINDAMONHANGABA/SP\n\n{{NOME_CLIENTE}}, {{NACIONALIDADE_CLIENTE}}, {{ESTADO_CIVIL_CLIENTE}}, portador(a) do CPF sob nº {{CPF_CLIENTE}}, residente e domiciliado(a) em {{ENDERECO_CLIENTE}}, por sua advogada infra-assinada, <u><strong>DRA. GABRIELA M. MANNI CAPITANI</strong></u>, OAB/SP 478.370, vem respeitosamente perante Vossa Excelência propor a presente:\n\nAÇÃO INDENIZATÓRIA\n\nem face de {{NOME_REU}}, pelos fatos e fundamentos a seguir expostos:\n\nDOS FATOS...\nDO DIREITO...\nDOS PEDIDOS...',
        isDefault: true,
        variables: ['NOME_CLIENTE', 'CPF_CLIENTE', 'ENDERECO_CLIENTE', 'NOME_REU'],
      },
      {
        id: 'tmpl-procuracao',
        name: 'Procuração Ad Judicia et Extra (Poderes Art. 105 CPC)',
        category: 'PROCURACAO',
        content:
          'PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: {{NOME_CLIENTE}}, {{NACIONALIDADE_CLIENTE}}, {{ESTADO_CIVIL_CLIENTE}}, portador(a) do RG nº {{RG_CLIENTE}} e CPF nº {{CPF_CLIENTE}}, residente e domiciliado(a) na {{ENDERECO_CLIENTE}}.\n\nOUTORGADA: <u><strong>DRA. GABRIELA M. MANNI CAPITANI</strong></u>, advogada inscrita na OAB/SP sob o nº 478.370, com escritório profissional na R. Cap. Alfredo de Paula Salgado, 110, Pindamonhangaba/SP.\n\nPODERES: Pelo presente instrumento particular de mandato, o Outorgante nomeia e constitui a Outorgada sua bastante procuradora, conferindo-lhe os poderes da cláusula "ad judicia et extra" para o foro em geral, em qualquer Juízo, Instância ou Tribunal.\n\nPODERES ESPECIAIS: Confere ainda poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito, receber valores, dar quitação, firmar compromissos e substabelecer com ou sem reserva (Art. 105 do CPC/2015).\n\nTermos em que, Pede deferimento.\nPindamonhangaba/SP, data da assinatura digital.\n\n_____________________________________\n{{NOME_CLIENTE}}',
        isDefault: true,
        variables: ['NOME_CLIENTE', 'CPF_CLIENTE', 'RG_CLIENTE', 'ENDERECO_CLIENTE'],
      },
      {
        id: 'tmpl-honorarios',
        name: 'Contrato de Honorários Advocatícios & Quota Litis (LGPD)',
        category: 'CONTRATO',
        content:
          'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS\n\nCONTRATANTE: {{NOME_CLIENTE}}, inscrito(a) no CPF nº {{CPF_CLIENTE}}, residente em {{ENDERECO_CLIENTE}}.\n\nCONTRATADA: GABRIELA CAPITANI ADVOCACIA, representada por <u><strong>DRA. GABRIELA M. MANNI CAPITANI</strong></u>, OAB/SP 478.370.\n\nCLÁUSULA PRIMEIRA - DO OBJETO\nO presente contrato tem por objeto a prestação de serviços jurídicos forenses na defesa dos interesses do(a) CONTRATANTE perante o Poder Judiciário.\n\nCLÁUSULA SEGUNDA - DOS HONORÁRIOS\nPelos serviços ajustados, o CONTRATANTE pagará os honorários acordados de R$ {{VALOR_HONORARIOS}} e percentual de {{PERCENTUAL_EXITO}}% sobre o proveito econômico obtido.\n\nCLÁUSULA TERCEIRA - DA CONFORMIDADE COM A LGPD\nAs partes declaram ciência mútua quanto ao tratamento estritamente lícito dos dados pessoais para o fiel cumprimento do mandato judicial, nos termos da Lei nº 13.709/2018.\n\nPindamonhangaba/SP, data da assinatura.',
        isDefault: true,
        variables: ['NOME_CLIENTE', 'CPF_CLIENTE', 'ENDERECO_CLIENTE', 'VALOR_HONORARIOS', 'PERCENTUAL_EXITO'],
      },
    ],
  };

  const [vi, setVi] = useState<TenantVisualIdentity>(initialVi);
  const [activeMainTab, setActiveMainTab] = useState<'DESIGNER' | 'TEMPLATES'>('DESIGNER');
  const [activePreviewDoc, setActivePreviewDoc] = useState<'PETICAO' | 'PROCURACAO' | 'CONTRATO'>('PETICAO');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    category: string;
    content: string;
    htmlContent?: string;
    isDefault: boolean;
    attachedFile?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl?: string;
      uploadedAt: string;
    };
    layoutStyle?: {
      fontFamily?: string;
      fontSize?: string;
      lineSpacing?: string;
      accentColor?: string;
      headerIncluded?: boolean;
      footerIncluded?: boolean;
    };
  }>({
    name: '',
    category: 'PETICAO',
    content: '',
    htmlContent: '',
    isDefault: false,
  });

  // AI Import / Sanitize Modal State
  const [templateModalViewMode, setTemplateModalViewMode] = useState<'TEXT' | 'HTML'>('TEXT');
  const [aiResultViewMode, setAiResultViewMode] = useState<'TEXT' | 'HTML'>('TEXT');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'SANITIZE' | 'SUGGEST' | 'GENERATE'>('SANITIZE');
  const [aiCategory, setAiCategory] = useState<'PETICAO' | 'PROCURACAO' | 'CONTRATO'>('PETICAO');
  const [aiModelName, setAiModelName] = useState('');
  const [aiRawInput, setAiRawInput] = useState('');
  const [aiRawHtml, setAiRawHtml] = useState<string>('');
  const [aiAttachedFile, setAiAttachedFile] = useState<{
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl?: string;
    uploadedAt: string;
  } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    sanitizedContent: string;
    sanitizedHtmlContent?: string;
    attachedFile?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl?: string;
      uploadedAt: string;
    };
    layoutStyle?: {
      fontFamily?: string;
      fontSize?: string;
      lineSpacing?: string;
      accentColor?: string;
      headerIncluded?: boolean;
      footerIncluded?: boolean;
    };
    extractedVariables: string[];
    titleSuggestion: string;
    summary: string;
    suggestions?: string[];
    complianceNotes?: string;
  } | null>(null);

  // Document File Extraction States
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);

  // PDF / Image Visual Identity Clone States
  const [isVisualIdentityImportModalOpen, setIsVisualIdentityImportModalOpen] = useState(false);
  const [isAnalyzingVisualIdentity, setIsAnalyzingVisualIdentity] = useState(false);
  const [visualIdentityAnalysisResult, setVisualIdentityAnalysisResult] = useState<{
    visualIdentity: Partial<TenantVisualIdentity>;
    attachedLetterheadFile?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl?: string;
      uploadedAt: string;
    };
    extractedImages: Array<{ dataUrl: string; width?: number; height?: number; isPrimaryLogo?: boolean }>;
    summary: string;
    detectedLawFirmName?: string;
  } | null>(null);
  const [selectedLogoFromPdf, setSelectedLogoFromPdf] = useState<string | null>(null);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const docImportFileRef = useRef<HTMLInputElement>(null);
  const manualTmplFileRef = useRef<HTMLInputElement>(null);
  const viImportFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentTenant?.visualIdentity) {
      setVi((prev) => ({
        ...prev,
        ...currentTenant.visualIdentity,
        logoUrl: currentTenant.visualIdentity.logoUrl !== undefined ? currentTenant.visualIdentity.logoUrl : (currentTenant.logoUrl || ''),
        signatureImageUrl: currentTenant.visualIdentity.signatureImageUrl !== undefined ? currentTenant.visualIdentity.signatureImageUrl : '',
        // Guarantee defaults for toggles if unset
        showHeaderOab: currentTenant.visualIdentity.showHeaderOab !== false,
        showHeaderAddress: !!currentTenant.visualIdentity.showHeaderAddress,
        showHeaderPhone: !!currentTenant.visualIdentity.showHeaderPhone,
        showHeaderEmail: !!currentTenant.visualIdentity.showHeaderEmail,
        showHeaderCnpj: !!currentTenant.visualIdentity.showHeaderCnpj,
        showFooterText: currentTenant.visualIdentity.showFooterText !== false,
        showFooterAddress: !!currentTenant.visualIdentity.showFooterAddress,
        showFooterPhone: !!currentTenant.visualIdentity.showFooterPhone,
        showFooterEmail: !!currentTenant.visualIdentity.showFooterEmail,
        showDigitalSignatureSeal: currentTenant.visualIdentity.showDigitalSignatureSeal !== false,
        footerText: currentTenant.visualIdentity.footerText ?? prev.footerText,
      }));
    } else if (currentTenant) {
      setVi((prev) => ({
        ...prev,
        logoUrl: currentTenant.logoUrl || '',
        signatureImageUrl: '',
      }));
    }
  }, [currentTenant]);

  const handleImageUpload = (file: File, type: 'logo' | 'signature') => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL(outputFormat, 0.88);
          if (type === 'logo') {
            setVi((prev) => ({ ...prev, logoUrl: dataUrl }));
          } else {
            setVi((prev) => ({ ...prev, signatureImageUrl: dataUrl }));
          }
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'logo' | 'signature') => {
    if (type === 'logo') {
      setVi((prev) => ({ ...prev, logoUrl: '' }));
    } else {
      setVi((prev) => ({ ...prev, signatureImageUrl: '' }));
    }
  };

  const handleSave = async (customVi?: TenantVisualIdentity) => {
    if (!currentTenant) return;
    setSaving(true);
    setSavedSuccess(false);
    const viToSave = customVi || vi;
    try {
      const updated = await api.updateTenantVisualIdentity(currentTenant.id, viToSave);
      if (onTenantUpdated) onTenantUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Falha ao salvar identidade visual:', err);
      alert('Erro ao salvar identidade visual: ' + (err.message || 'Falha de conexão'));
    } finally {
      setSaving(false);
    }
  };

  // Open Template Modal
  const handleOpenAddTemplate = (category: string = 'PETICAO') => {
    setEditingTemplateId(null);
    setTemplateForm({
      name: '',
      category,
      content: '',
      htmlContent: '',
      attachedFile: undefined,
      layoutStyle: undefined,
      isDefault: false,
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: any) => {
    setEditingTemplateId(tmpl.id);
    setTemplateForm({
      name: tmpl.name || tmpl.title,
      category: tmpl.category,
      content: tmpl.content || '',
      htmlContent: tmpl.htmlContent || '',
      attachedFile: tmpl.attachedFile,
      layoutStyle: tmpl.layoutStyle,
      isDefault: !!tmpl.isDefault,
    });
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('Deseja realmente remover este modelo do escritório?')) return;
    const currentTemplates = (vi.templates || []).filter((t) => t.id !== id);
    const updatedVi = { ...vi, templates: currentTemplates };
    setVi(updatedVi);
    handleSave(updatedVi);
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentTemplates = [...(vi.templates || [])];
    const extractedVars = (templateForm.content.match(/\{\{([^}]+)\}\}/g) || []).map((m) =>
      m.replace(/[{}]/g, '').trim()
    );

    if (editingTemplateId) {
      const idx = currentTemplates.findIndex((t) => t.id === editingTemplateId);
      if (idx >= 0) {
        currentTemplates[idx] = {
          ...currentTemplates[idx],
          name: templateForm.name,
          category: templateForm.category,
          content: templateForm.content,
          htmlContent: templateForm.htmlContent,
          attachedFile: templateForm.attachedFile,
          layoutStyle: templateForm.layoutStyle,
          isDefault: templateForm.isDefault,
          variables: extractedVars.length > 0 ? extractedVars : currentTemplates[idx].variables,
        };
      }
    } else {
      currentTemplates.push({
        id: `tmpl-${Date.now()}`,
        name: templateForm.name,
        category: templateForm.category,
        content: templateForm.content,
        htmlContent: templateForm.htmlContent,
        attachedFile: templateForm.attachedFile,
        layoutStyle: templateForm.layoutStyle,
        isDefault: templateForm.isDefault,
        variables: extractedVars.length > 0 ? extractedVars : ['NOME_CLIENTE', 'CPF_CLIENTE'],
      });
    }

    const updatedVi = { ...vi, templates: currentTemplates };
    setVi(updatedVi);
    setIsTemplateModalOpen(false);
    handleSave(updatedVi);
  };

  // Trigger AI Import / Sanitization / Suggestions
  const handleOpenAiImportModal = (mode: 'SANITIZE' | 'SUGGEST' | 'GENERATE', category: 'PETICAO' | 'PROCURACAO' | 'CONTRATO' = 'PETICAO') => {
    setAiMode(mode);
    setAiCategory(category);
    setAiModelName(
      category === 'PETICAO'
        ? 'Petição Inicial Cível'
        : category === 'PROCURACAO'
        ? 'Procuração Ad Judicia'
        : 'Contrato de Honorários'
    );
    setAiRawInput('');
    setAiRawHtml('');
    setAiAttachedFile(null);
    setAiResult(null);
    setIsAiModalOpen(true);
  };

  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingDoc(true);
    setExtractSuccessMsg(null);
    try {
      const res = await api.extractDocumentText(file);
      if (res && (res.text || res.htmlContent)) {
        setAiRawInput(res.text || '');
        setAiRawHtml(res.htmlContent || '');
        const attached = res.attachedFile || (res.dataUrl ? {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          dataUrl: res.dataUrl,
          uploadedAt: new Date().toISOString(),
        } : undefined);
        setAiAttachedFile(attached || null);
        if (!aiModelName || aiModelName.includes('Petição') || aiModelName.includes('Procuração') || aiModelName.includes('Contrato') || aiModelName.trim() === '') {
          setAiModelName(res.suggestedTitle || file.name.replace(/\.[^/.]+$/, ''));
        }
        setExtractSuccessMsg(`Arquivo original "${file.name}" anexado com sucesso! Formatação, fontes, estilos e cabeçalhos preservados.`);
      } else {
        alert('Não foi possível extrair o texto deste documento.');
      }
    } catch (err: any) {
      console.error('Falha na extração:', err);
      alert('Erro ao extrair conteúdo do arquivo: ' + (err.message || 'Arquivo corrompido ou formato não suportado'));
    } finally {
      setIsExtractingDoc(false);
      e.target.value = '';
    }
  };

  const handleManualTemplateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingDoc(true);
    setExtractSuccessMsg(null);
    try {
      const res = await api.extractDocumentText(file);
      if (res && (res.text || res.htmlContent)) {
        const attached = res.attachedFile || (res.dataUrl ? {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          dataUrl: res.dataUrl,
          uploadedAt: new Date().toISOString(),
        } : undefined);

        setTemplateForm((prev) => ({
          ...prev,
          content: res.text || prev.content,
          htmlContent: res.htmlContent || prev.htmlContent,
          attachedFile: attached,
          layoutStyle: res.layoutStyle || prev.layoutStyle,
          name: prev.name.trim() ? prev.name : res.suggestedTitle || file.name.replace(/\.[^/.]+$/, ''),
        }));
        setExtractSuccessMsg(`Arquivo original "${file.name}" anexado e formatado com sucesso! Estrutura visual, fontes e cabeçalhos preservados.`);
      } else {
        alert('Não foi possível extrair texto legível deste documento.');
      }
    } catch (err: any) {
      console.error('Falha na extração:', err);
      alert('Erro ao extrair conteúdo do arquivo: ' + (err.message || 'Formato não suportado'));
    } finally {
      setIsExtractingDoc(false);
      e.target.value = '';
    }
  };

  const handleVisualIdentityFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsAnalyzingVisualIdentity(true);
    setExtractSuccessMsg(null);

    try {
      const res = await api.analyzeVisualIdentityFromDoc(file);
      if (res && res.visualIdentity) {
        setVisualIdentityAnalysisResult(res);
        if (res.visualIdentity.logoUrl) {
          setSelectedLogoFromPdf(res.visualIdentity.logoUrl);
        } else if (res.extractedImages && res.extractedImages.length > 0) {
          setSelectedLogoFromPdf(res.extractedImages[0].dataUrl);
        } else {
          setSelectedLogoFromPdf(null);
        }
        setIsVisualIdentityImportModalOpen(true);
      } else {
        alert('Não foi possível obter a análise de identidade visual deste arquivo.');
      }
    } catch (err: any) {
      console.error('Erro ao analisar arquivo para identidade visual:', err);
      alert('Não foi possível processar o arquivo: ' + (err.message || 'Verifique se o arquivo PDF ou Imagem é válido.'));
    } finally {
      setIsAnalyzingVisualIdentity(false);
    }
  };

  const handleApplyAnalyzedVisualIdentity = () => {
    if (!visualIdentityAnalysisResult?.visualIdentity) return;

    const analyzed = visualIdentityAnalysisResult.visualIdentity;
    const isFullBanner = analyzed.headerStyle === 'FULL_BANNER' || !!analyzed.headerBannerUrl;

    const updatedVi: TenantVisualIdentity = {
      ...vi,
      ...analyzed,
      headerStyle: isFullBanner ? 'FULL_BANNER' : (analyzed.headerStyle || vi.headerStyle || 'MODERN_BAR'),
      headerBannerUrl: analyzed.headerBannerUrl || (isFullBanner ? (selectedLogoFromPdf || undefined) : undefined),
      pageBackgroundUrl: analyzed.pageBackgroundUrl || vi.pageBackgroundUrl,
      logoUrl: selectedLogoFromPdf !== null ? selectedLogoFromPdf : (analyzed.headerBannerUrl || vi.logoUrl),
      attachedLetterheadFile: visualIdentityAnalysisResult.attachedLetterheadFile || vi.attachedLetterheadFile,
    };

    setVi(updatedVi);
    setIsVisualIdentityImportModalOpen(false);
    setExtractSuccessMsg('Papel timbrado oficial, faixa de cabeçalho, paleta e tipografia aplicados com 100% de fidelidade!');
    setTimeout(() => setExtractSuccessMsg(null), 6000);
    handleSave(updatedVi);
  };

  const handleRunAiAction = async () => {
    if (aiMode !== 'GENERATE' && !aiRawInput.trim()) {
      alert('Por favor, cole ou importe o texto do documento real.');
      return;
    }

    setIsAiProcessing(true);
    try {
      const actionType =
        aiMode === 'SANITIZE'
          ? 'SANITIZE_REAL_MODEL'
          : aiMode === 'SUGGEST'
          ? 'SUGGEST_IMPROVEMENTS'
          : 'GENERATE_LEGAL_BASE';

      const response = await api.aiSanitizeOrSuggestTemplate({
        action: actionType,
        category: aiCategory,
        modelName: aiModelName,
        rawContent: aiRawInput,
        rawHtmlContent: aiRawHtml,
        attachedFile: aiAttachedFile || undefined,
      });

      setAiResult(response);
    } catch (err: any) {
      console.error('Falha ao processar com IA:', err);
      alert('Erro na análise por IA: ' + (err.message || 'Falha de comunicação'));
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAcceptAiTemplate = () => {
    if (!aiResult) return;
    const currentTemplates = [...(vi.templates || [])];
    const newTemplateId = `tmpl-${Date.now()}`;

    currentTemplates.push({
      id: newTemplateId,
      name: aiResult.titleSuggestion || aiModelName || 'Modelo Forense Higienizado',
      category: aiCategory,
      content: aiResult.sanitizedContent,
      htmlContent: aiResult.sanitizedHtmlContent || aiRawHtml || undefined,
      attachedFile: aiResult.attachedFile || aiAttachedFile || undefined,
      layoutStyle: aiResult.layoutStyle || {
        fontFamily: vi.fontFamily || 'Times New Roman',
        fontSize: vi.bodyFontSize || '12pt',
        lineSpacing: vi.lineSpacing || '1.5',
        accentColor: vi.accentColor || '#1e3a8a',
        headerIncluded: true,
        footerIncluded: true,
      },
      variables: aiResult.extractedVariables || ['NOME_CLIENTE', 'CPF_CLIENTE'],
      isDefault: false,
    });

    const updatedVi = { ...vi, templates: currentTemplates };
    setVi(updatedVi);
    setIsAiModalOpen(false);
    handleSave(updatedVi);
  };

  // Test Print in new window
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permita pop-ups no navegador para visualizar a folha A4.');
      return;
    }

    const lawFirmName = currentTenant?.name || 'Gabriela Capitani Advocacia';
    const lawyerName = vi.signatoryName || 'Dra. Gabriela M. Manni Capitani';
    const lawyerOab = vi.signatoryOab || currentTenant?.oabOfficeRegister || 'OAB/SP 478.370';
    const accentColor = vi.accentColor || '#4338ca';
    const fontFamily = vi.fontFamily || 'Times New Roman';
    const logoUrl = vi.logoUrl || '';

    let headerMetaItems: string[] = [];
    if (vi.showHeaderOab !== false && lawyerOab) headerMetaItems.push(lawyerOab);
    if (vi.showHeaderAddress && vi.headerAddress) headerMetaItems.push(vi.headerAddress);
    if (vi.showHeaderPhone && (vi.contactPhone || currentTenant?.contactPhone)) {
      headerMetaItems.push(`Tel: ${vi.contactPhone || currentTenant?.contactPhone}`);
    }
    if (vi.showHeaderEmail && (vi.contactEmail || currentTenant?.contactEmail)) {
      headerMetaItems.push(vi.contactEmail || currentTenant?.contactEmail);
    }

    const borderStyle = vi.borderStyle === 'NONE' ? 'none' : vi.borderStyle === 'DOUBLE' ? 'double' : vi.borderStyle === 'DASHED' ? 'dashed' : 'solid';
    const borderWidth = vi.borderWidth || '2px';
    const logoHeight = vi.logoMaxHeight || 44;

    const sampleDocText =
      activePreviewDoc === 'PETICAO'
        ? `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA COMARCA DE PINDAMONHANGABA/SP\n\nAutos nº 1002341-89.2026.8.26.0445\n\nEMPRESA ALPHA LTDA, já qualificada nos autos, por sua advogada subscritora, <u><strong>${lawyerName.toUpperCase()}</strong></u>, inscrita na ${lawyerOab}, vem perante Vossa Excelência apresentar RÉPLICA À CONTESTAÇÃO nos termos do Art. 350 do CPC...\n\nRequer o regular prosseguimento do feito com a procedência in totum dos pleitos formulados na exordial.\n\n${vi.closingFormula || 'Termos em que, Pede e Espera Deferimento.'}\nPindamonhangaba/SP, ${new Date().toLocaleDateString('pt-BR')}.`
        : activePreviewDoc === 'PROCURACAO'
        ? `PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: JOÃO DA SILVA, brasileiro, inscrito no CPF nº 123.456.789-00.\n\nOUTORGADA: <u><strong>${lawyerName.toUpperCase()}</strong></u>, ${lawyerOab}.\n\nPODERES: Cláusula ad judicia et extra para o foro em geral, em qualquer Juízo, Instância ou Tribunal...\n\nPODERES ESPECIAIS: Confere ainda poderes especiais para confessar, transigir, desistir, renunciar ao direito, receber valores e dar quitação (Art. 105 do CPC/2015).\n\nPindamonhangaba/SP, ${new Date().toLocaleDateString('pt-BR')}.`
        : `CONTRATO DE PRESTAÇÃO DE SERVIÇOS JURÍDICOS E HONORÁRIOS\n\nCONTRATANTE: JOÃO DA SILVA, CPF nº 123.456.789-00\nCONTRATADA: ${lawFirmName.toUpperCase()}, representada por <u><strong>${lawyerName.toUpperCase()}</strong></u>, ${lawyerOab}.\n\nCLÁUSULA 1ª - DO OBJETO: Prestação de serviços jurídicos no patrocínio forense da causa.\nCLÁUSULA 2ª - DOS HONORÁRIOS: Valor ajustado com honorários de êxito e sucumbenciais.\nCLÁUSULA 3ª - DA LGPD: Conformidade com a Lei nº 13.709/2018.\n\nPindamonhangaba/SP, ${new Date().toLocaleDateString('pt-BR')}.`;

    let footerMetaItems: string[] = [];
    if (vi.showFooterAddress && vi.headerAddress) footerMetaItems.push(vi.headerAddress);
    if (vi.showFooterPhone && (vi.contactPhone || currentTenant?.contactPhone)) {
      footerMetaItems.push(`Tel: ${vi.contactPhone || currentTenant?.contactPhone}`);
    }
    if (vi.showFooterEmail && (vi.contactEmail || currentTenant?.contactEmail)) {
      footerMetaItems.push(vi.contactEmail || currentTenant?.contactEmail);
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Folha Timbrada Oficial - ${lawFirmName}</title>
          <style>
            @page { margin: 20mm; size: A4; }
            body { font-family: "${fontFamily}", Times, serif; font-size: 12pt; line-height: 1.6; color: #111; margin: 0; padding: 20px; }
            .header-container { border-bottom: ${borderWidth} ${borderStyle} ${accentColor}; padding-bottom: 14px; margin-bottom: 25px; }
            .header-content { display: flex; flex-direction: column; align-items: ${vi.logoPosition === 'center' ? 'center' : vi.logoPosition === 'right' ? 'flex-end' : 'flex-start'}; text-align: ${vi.logoPosition === 'center' ? 'center' : vi.logoPosition === 'right' ? 'right' : 'left'}; }
            .header-logo { max-height: ${logoHeight}px; object-fit: contain; margin-bottom: 8px; }
            .header-title { margin: 0; font-size: 14pt; text-transform: uppercase; letter-spacing: 1.2px; color: ${accentColor}; font-weight: bold; }
            .header-meta { margin: 4px 0 0 0; font-size: 9pt; color: #4b5563; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .content { white-space: pre-wrap; word-break: break-word; text-align: justify; }
            .footer { margin-top: 50px; text-align: center; font-size: 8pt; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; font-family: sans-serif; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="header-content">
              ${logoUrl ? `<img src="${logoUrl}" class="header-logo" alt="Logo" />` : ''}
              <h1 class="header-title">${lawFirmName}</h1>
              ${headerMetaItems.length > 0 ? `<p class="header-meta">${headerMetaItems.join(' • ')}</p>` : ''}
            </div>
          </div>
          <div class="content">${sampleDocText}</div>
          <div style="margin-top: 36px; text-align: center; font-family: ${fontFamily}, serif;">
            ${vi.signatureImageUrl ? `<img src="${vi.signatureImageUrl}" style="height: 44px; object-fit: contain; margin-bottom: 6px;" /><br/>` : ''}
            <div style="font-weight: bold; font-size: 11pt; color: #111;">${lawyerName}</div>
            <div style="font-size: 10pt; color: ${accentColor}; font-family: monospace; font-weight: 600;">${lawyerOab}</div>
            <div style="font-size: 9pt; color: #666; font-family: sans-serif;">${vi.signatoryRole || 'Advogada'}</div>
            ${vi.showDigitalSignatureSeal !== false ? `
              <div style="margin-top: 14px; display: inline-flex; flex-direction: column; align-items: center;">
                <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1.5px solid #10b981; background-color: #ecfdf5; border-radius: 8px; color: #065f46; font-family: sans-serif; font-size: 8.5pt; font-weight: bold; letter-spacing: 0.5px;">
                  <span>🔒 ASSINADO DIGITALMENTE</span>
                  <span style="font-weight: normal; color: #047857; font-size: 8pt;">• Certificado ICP-Brasil / Token OAB</span>
                </div>
                <div style="margin-top: 4px; font-size: 7pt; color: #9ca3af; font-family: sans-serif;">
                  (Documento assinado digitalmente nos termos da Lei nº 14.063/2020 e MP 2.200-2/2001)
                </div>
              </div>
            ` : ''}
          </div>
          ${vi.showFooterText !== false ? `
            <div class="footer">
              <div style="font-weight: 500;">${vi.footerText || `${lawFirmName} • Documento emitido eletronicamente`}</div>
              ${footerMetaItems.length > 0 ? `<div style="margin-top: 4px; font-size: 7.5pt; color: #777;">${footerMetaItems.join(' • ')}</div>` : ''}
            </div>
          ` : ''}
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Plus_Jakarta_Sans']">
      {/* Top Header & Save Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Palette className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Papel Timbrado, Identidade Visual & Modelos Forenses
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl">
            Configure o papel timbrado oficial, personalize quais informações aparecem (OAB auto-dedutível sem rótulos redundantes, endereço e celular totalmente opcionais), desenhe o layout do cabeçalho e importe modelos reais com higienização automática por IA (LGPD).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Testar Folha A4</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Tabs: Designer vs Models Repository */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab('DESIGNER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeMainTab === 'DESIGNER'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>1. Papel Timbrado & Designer de Layout</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('TEMPLATES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeMainTab === 'TEMPLATES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>2. Modelos Oficiais (Petição, Procuração, Contrato) & IA LGPD</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
            {vi.templates?.length || 0}
          </span>
        </button>
      </div>

      {/* TAB 1: DESIGNER & LIVE A4 PREVIEW */}
      {activeMainTab === 'DESIGNER' && (
        <div className="space-y-6">
          {/* BANNER CLONAGEM VISUAL DE PDF PRONTO */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/30 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] font-bold text-indigo-200 tracking-wide uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Importador Inteligente de Papel Timbrado
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    PDF • PNG • JPG
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Importar e Copiar Papel Timbrado de Arquivo PDF Pronto
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Envie o arquivo original (PDF ou Imagem) da petição, procuração ou papel timbrado da sua banca: nossa inteligência artificial forense extrai automaticamente o <strong>logotipo</strong>, as <strong>cores (#hex)</strong>, a <strong>família de fontes</strong> (Times, Arial, Garamond), os <strong>tamanhos</strong>, o <strong>cabeçalho</strong> e o alinhamento completo.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <input
                  ref={viImportFileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleVisualIdentityFileUpload}
                />
                <button
                  type="button"
                  disabled={isAnalyzingVisualIdentity}
                  onClick={() => viImportFileRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isAnalyzingVisualIdentity ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Analisando PDF & Extraindo Design...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-white" />
                      <span>Importar PDF / Imagem Pronta</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ARQUIVO REAL ANEXADO DO PAPEL TIMBRADO */}
          {vi.attachedLetterheadFile && (
            <div className="p-4 rounded-2xl bg-white border border-indigo-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Arquivo Matriz de Papel Timbrado Vinculado
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Formato Real Preservado
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>{vi.attachedLetterheadFile.fileName}</strong> • {(vi.attachedLetterheadFile.fileSize / 1024).toFixed(1)} KB • Carregado em {new Date(vi.attachedLetterheadFile.uploadedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {vi.attachedLetterheadFile.dataUrl && (
                  <a
                    href={vi.attachedLetterheadFile.dataUrl}
                    download={vi.attachedLetterheadFile.fileName}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Baixar Arquivo Matriz</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja desvincular este arquivo de papel timbrado?')) {
                      const updatedVi = { ...vi, attachedLetterheadFile: undefined };
                      setVi(updatedVi);
                      handleSave(updatedVi);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                >
                  Desvincular
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* SECTION 1: LOGO & CHANCELA */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    1. Logotipo Oficial & Chancela da Advogada
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Persistência em Disco e Banco</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Logo Upload & Positioning */}
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">Logotipo do Escritório</label>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'logo');
                          e.target.value = '';
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isAnalyzingVisualIdentity}
                          onClick={() => viImportFileRef.current?.click()}
                          title="Importar logotipo e design diretamente de um PDF pronto"
                          className="text-[11px] px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-all flex items-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>Do PDF</span>
                        </button>
                        {vi.logoUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('logo')}
                            title="Remover logotipo e manter apenas o nome do escritório"
                            className="text-[11px] px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{vi.logoUrl ? 'Alterar' : 'Upload'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden group">
                      {vi.logoUrl ? (
                      <>
                        <img src={vi.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('logo')}
                          title="Remover logotipo"
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Building2 className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="text-[11px] italic">Sem logo (cabeçalho institucional em texto)</span>
                      </div>
                    )}
                  </div>

                  {/* Logo Alignment */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">Alinhamento do Cabeçalho:</span>
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      {(['left', 'center', 'right'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setVi({ ...vi, logoPosition: pos })}
                          className={`py-1 rounded-md text-[11px] font-semibold border transition-all ${
                            vi.logoPosition === pos
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Size Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 font-medium">Altura do Logotipo:</span>
                      <span className="font-mono text-slate-800 font-bold">{vi.logoMaxHeight || 44}px</span>
                    </div>
                    <input
                      type="range"
                      min={28}
                      max={72}
                      step={2}
                      value={vi.logoMaxHeight || 44}
                      onChange={(e) => setVi({ ...vi, logoMaxHeight: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Signature / Chancela Upload */}
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Assinatura / Chancela</label>
                    <input
                      ref={sigFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'signature');
                        e.target.value = '';
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      {vi.signatureImageUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('signature')}
                          title="Remover chancela e usar traço tradicional"
                          className="text-[11px] px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{vi.signatureImageUrl ? 'Alterar' : 'Upload Imagem'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden group">
                    {vi.signatureImageUrl ? (
                      <>
                        <img src={vi.signatureImageUrl} alt="Chancela" className="max-h-full max-w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('signature')}
                          title="Remover assinatura gráfica"
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="text-left">
                          <span className="text-[11px] font-bold block text-emerald-950">Assinatura Digital (Token OAB)</span>
                          <span className="text-[10px] text-emerald-700 font-medium">Linha física dispensada • Espaço reservado para validação ICP-Brasil</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Nome da Titular / Signatária:</span>
                      <input
                        type="text"
                        value={vi.signatoryName || ''}
                        onChange={(e) => setVi({ ...vi, signatoryName: e.target.value })}
                        placeholder="Ex: Dra. Gabriela M. Manni Capitani"
                        className="w-full mt-0.5 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Cargo / Função Forense:</span>
                      <input
                        type="text"
                        value={vi.signatoryRole || ''}
                        onChange={(e) => setVi({ ...vi, signatoryRole: e.target.value })}
                        placeholder="Ex: Advogada Sócia e Titular"
                        className="w-full mt-0.5 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: OAB AUTO-DEDUTÍVEL & CONTROLES DE EXIBIÇÃO SELETIVA */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    2. Inscrição OAB & Opções de Exibição Seletiva
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    O campo <strong>OAB/XX</strong> é auto-dedutível (sem o rótulo redundante &quot;Registro:&quot;). Nem todo escritório deseja exibir endereço ou celular.
                  </p>
                </div>
              </div>

              {/* OAB Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Inscrição OAB da Titular ou Escritório
                  </label>
                  <input
                    type="text"
                    value={vi.signatoryOab || ''}
                    onChange={(e) => setVi({ ...vi, signatoryOab: e.target.value })}
                    placeholder="Ex: OAB/SP 478.370"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-indigo-600 mt-1 block">
                    ✓ Exibido diretamente como &quot;{vi.signatoryOab || 'OAB/SP 478.370'}&quot; (sem &quot;Registro:&quot;).
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nome Oficial da Banca / Escritório
                  </label>
                  <input
                    type="text"
                    value={currentTenant?.name || ''}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium text-xs cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Conforme cadastro societário do escritório.
                  </span>
                </div>
              </div>

              {/* SELECTIVE VISIBILITY TOGGLES */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Defina exatamente o que deve aparecer na Folha Timbrada:
                </span>

                {/* Elementos Exibidos no Cabeçalho e Rodapé */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Toggle OAB no cabeçalho */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={vi.showHeaderOab !== false}
                      onChange={(e) => setVi({ ...vi, showHeaderOab: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir OAB no Cabeçalho</span>
                      <span className="text-[10px] text-slate-500">Ex: OAB/SP 478.370</span>
                    </div>
                  </label>

                  {/* Toggle Endereço no cabeçalho */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!vi.showHeaderAddress}
                      onChange={(e) => setVi({ ...vi, showHeaderAddress: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir Endereço no Cabeçalho</span>
                      <span className="text-[10px] text-slate-500">Deixe desmarcado se preferir cabeçalho clean</span>
                    </div>
                  </label>

                  {/* Toggle Celular / Telefone no cabeçalho */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!vi.showHeaderPhone}
                      onChange={(e) => setVi({ ...vi, showHeaderPhone: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir Telefone no Cabeçalho</span>
                      <span className="text-[10px] text-slate-500">Opcional no topo</span>
                    </div>
                  </label>

                  {/* Toggle E-mail institucional no cabeçalho */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!vi.showHeaderEmail}
                      onChange={(e) => setVi({ ...vi, showHeaderEmail: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir E-mail no Cabeçalho</span>
                      <span className="text-[10px] text-slate-500">Canal eletrônico oficial</span>
                    </div>
                  </label>

                  {/* Toggle Rodapé com texto */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={vi.showFooterText !== false}
                      onChange={(e) => setVi({ ...vi, showFooterText: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir Rodapé Institucional</span>
                      <span className="text-[10px] text-slate-500">Linha de encerramento na base</span>
                    </div>
                  </label>

                  {/* Toggle Endereço no rodapé */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!vi.showFooterAddress}
                      onChange={(e) => setVi({ ...vi, showFooterAddress: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir Endereço no Rodapé</span>
                      <span className="text-[10px] text-slate-500">Posição alternativa e discreta</span>
                    </div>
                  </label>

                  {/* Toggle Telefone no Rodapé */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!vi.showFooterPhone}
                      onChange={(e) => setVi({ ...vi, showFooterPhone: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir Telefone no Rodapé</span>
                      <span className="text-[10px] text-slate-500">Contato telefônico na base da folha</span>
                    </div>
                  </label>

                  {/* Toggle E-mail no Rodapé */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!vi.showFooterEmail}
                      onChange={(e) => setVi({ ...vi, showFooterEmail: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">Exibir E-mail no Rodapé</span>
                      <span className="text-[10px] text-slate-500">E-mail oficial na base da folha</span>
                    </div>
                  </label>

                  {/* Toggle Selo de Assinado Digitalmente (Token OAB) */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-all sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={vi.showDigitalSignatureSeal !== false}
                      onChange={(e) => setVi({ ...vi, showDigitalSignatureSeal: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Selo & Espaço &quot;Assinado Digitalmente&quot; (Token OAB / ICP-Brasil)
                      </span>
                      <span className="text-[10px] text-emerald-800/80">
                        Remove o traço obsoleto de caneta acima do nome e adiciona espaço com chancela digital oficial
                      </span>
                    </div>
                  </label>
                </div>

                {/* Optional Field Inputs */}
                {(vi.showHeaderAddress || vi.showFooterAddress || vi.showHeaderPhone || vi.showFooterPhone || vi.showHeaderEmail || vi.showFooterEmail) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                    {(vi.showHeaderAddress || vi.showFooterAddress) && (
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Endereço do Escritório
                        </label>
                        <input
                          type="text"
                          value={vi.headerAddress || ''}
                          onChange={(e) => setVi({ ...vi, headerAddress: e.target.value })}
                          placeholder="Ex: R. Cap. Alfredo de Paula Salgado, 110, Pindamonhangaba/SP"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                    {(vi.showHeaderPhone || vi.showFooterPhone) && (
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Telefone / WhatsApp do Escritório
                        </label>
                        <input
                          type="text"
                          value={vi.contactPhone || ''}
                          onChange={(e) => setVi({ ...vi, contactPhone: e.target.value })}
                          placeholder="Ex: (12) 99148-6012"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                    {(vi.showHeaderEmail || vi.showFooterEmail) && (
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          E-mail Institucional do Escritório
                        </label>
                        <input
                          type="email"
                          value={vi.contactEmail || ''}
                          onChange={(e) => setVi({ ...vi, contactEmail: e.target.value })}
                          placeholder="Ex: contato@gabrielacapitani.adv.br"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Edição do Texto Institucional do Rodapé */}
                {vi.showFooterText !== false && (
                  <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Texto Institucional do Rodapé (Personalizado)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Aparecerá impresso na margem inferior de todas as páginas timbradas
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={vi.footerText || ''}
                      onChange={(e) => setVi({ ...vi, footerText: e.target.value })}
                      placeholder={`Ex: ${currentTenant?.name || 'GABRIELA CAPITANI ADVOCACIA'} • Sigilo, Excelência e Prática Forense`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                    />

                    {/* Presets rápidos */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-medium mr-1">Sugestões de texto:</span>
                      <button
                        type="button"
                        onClick={() => setVi({ ...vi, footerText: `${currentTenant?.name || 'GABRIELA CAPITANI ADVOCACIA'} • Sigilo, Excelência e Prática Forense Humanizada` })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] text-slate-600 border border-slate-200 transition-colors"
                      >
                        Padrão da Banca
                      </button>
                      <button
                        type="button"
                        onClick={() => setVi({ ...vi, footerText: 'Documento assinado eletronicamente com validade jurídica nos termos da Lei Federal nº 14.063/2020 e ICP-Brasil.' })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] text-slate-600 border border-slate-200 transition-colors"
                      >
                        Validade Eletrônica (Lei 14.063/20)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVi({ ...vi, footerText: 'DOCUMENTO PRIVILEGIADO E CONFIDENCIAL • Sigilo profissional resguardado pelo Art. 7º, II da Lei 8.906/94 (EAOAB).' })}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] text-slate-600 border border-slate-200 transition-colors"
                      >
                        Sigilo & Confidencialidade
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: ESTÚDIO DE DESIGN DO CABEÇALHO (DESENHE COMO QUISER) */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  3. Estúdio de Design do Papel Timbrado (Desenhe como quiser)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Layout, Cores e Tipografia</span>
              </div>

              {/* Layout Styles */}
              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-800 block">Estilo de Formatação do Cabeçalho:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { id: 'FULL_BANNER', label: 'Faixa Oficial (Banner)', desc: 'Faixa superior integral de borda a borda com cores e brasão' },
                    { id: 'MINIMALIST', label: 'Minimalista', desc: 'Sutil, foco no nome e OAB' },
                    { id: 'MODERN_BAR', label: 'Barra Executiva', desc: 'Faixa colorida moderna' },
                    { id: 'CLASSIC_CENTERED', label: 'Clássico Nobre', desc: 'Centralizado e solene' },
                    { id: 'SIDE_BY_SIDE', label: 'Lado a Lado', desc: 'Logo e dados em 2 colunas' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setVi({ ...vi, headerStyle: st.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        vi.headerStyle === st.id
                          ? 'border-indigo-500 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-slate-900 block">{st.label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Picker */}
              <div className="space-y-2 text-xs pt-1">
                <label className="font-bold text-slate-800 block">Cor de Destaque Forense:</label>
                <div className="flex flex-wrap items-center gap-2">
                  {FORENSIC_ACCENT_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setVi({ ...vi, accentColor: c.hex })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                        vi.accentColor === c.hex
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                    <span className="text-[10px] text-slate-500">Hex:</span>
                    <input
                      type="color"
                      value={vi.accentColor || '#4338ca'}
                      onChange={(e) => setVi({ ...vi, accentColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Line Style & Thickness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Estilo da Linha Divisória:</label>
                  <select
                    value={vi.borderStyle || 'SOLID'}
                    onChange={(e) => setVi({ ...vi, borderStyle: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="SOLID">Linha Sólida Refinada</option>
                    <option value="DOUBLE">Linha Dupla Tradicional</option>
                    <option value="DASHED">Linha Tracejada Fina</option>
                    <option value="NONE">Sem Linha (Totalmente Clean)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Espessura da Linha:</label>
                  <select
                    value={vi.borderWidth || '2px'}
                    onChange={(e) => setVi({ ...vi, borderWidth: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="1px">1px (Ultra fina)</option>
                    <option value="2px">2px (Padrão forense)</option>
                    <option value="3px">3px (Marcante)</option>
                    <option value="4px">4px (Barra destacada)</option>
                  </select>
                </div>
              </div>

              {/* Typography & Spacing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Fonte Principal:</label>
                  <select
                    value={vi.fontFamily || 'Times New Roman'}
                    onChange={(e) => setVi({ ...vi, fontFamily: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Times New Roman">Times New Roman (Clássico)</option>
                    <option value="Arial">Arial (Moderno / ABNT)</option>
                    <option value="Georgia">Georgia (Serifada Elegante)</option>
                    <option value="Garamond">Garamond (Editorial Nobre)</option>
                    <option value="Calibri">Calibri (Corporativo Clean)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Tamanho do Corpo:</label>
                  <select
                    value={vi.bodyFontSize || '12pt'}
                    onChange={(e) => setVi({ ...vi, bodyFontSize: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="11pt">11pt (Mais denso)</option>
                    <option value="12pt">12pt (Padrão CPC)</option>
                    <option value="13pt">13pt (Leitura ampliada)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Entrelinhas:</label>
                  <select
                    value={vi.lineSpacing || '1.5'}
                    onChange={(e) => setVi({ ...vi, lineSpacing: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="1.0">1.0 (Simples)</option>
                    <option value="1.15">1.15 (Moderado)</option>
                    <option value="1.5">1.5 (Padrão Forense ABNT)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE INTERACTIVE A4 LETTERHEAD PREVIEW (5 cols) */}
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
                    type="button"
                    onClick={() => setActivePreviewDoc(doc)}
                    className={`px-2.5 py-1 rounded transition-all ${
                      activePreviewDoc === doc
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {doc === 'PETICAO' ? 'Petição' : doc === 'PROCURACAO' ? 'Procuração' : 'Contrato'}
                  </button>
                ))}
              </div>
            </div>

            {/* A4 Sheet Preview Container */}
            <div className="p-4 bg-slate-200/90 rounded-2xl border border-slate-300 shadow-inner flex justify-center">
              <div
                className="w-full max-w-[440px] bg-white rounded-lg shadow-xl p-6 border border-slate-200 flex flex-col justify-between min-h-[620px] text-slate-800 transition-all select-none"
                style={{
                  fontFamily: vi.fontFamily || 'Times New Roman',
                  fontSize: vi.bodyFontSize === '11pt' ? '11px' : vi.bodyFontSize === '13pt' ? '13px' : '12px',
                  lineHeight: vi.lineSpacing === '1.0' ? '1.2' : vi.lineSpacing === '1.15' ? '1.35' : '1.6',
                }}
              >
                {/* Official Letterhead Header */}
                {vi.headerStyle === 'FULL_BANNER' && (vi.headerBannerUrl || vi.logoUrl) ? (
                  <div className="-mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg shadow-xs">
                    <img
                      src={vi.headerBannerUrl || vi.logoUrl}
                      alt="Cabeçalho Timbrado Oficial"
                      className="w-full object-cover max-h-24 sm:max-h-28"
                    />
                    {(vi.showHeaderAddress || vi.showHeaderPhone || vi.showHeaderEmail) && (
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[8.5px] text-slate-500 font-sans py-1 bg-slate-50/90 border-b border-slate-200">
                        {vi.showHeaderAddress && vi.headerAddress && <span>{vi.headerAddress}</span>}
                        {vi.showHeaderPhone && (vi.contactPhone || currentTenant?.contactPhone) && (
                          <span>• Tel: {vi.contactPhone || currentTenant?.contactPhone}</span>
                        )}
                        {vi.showHeaderEmail && (vi.contactEmail || currentTenant?.contactEmail) && (
                          <span>• {vi.contactEmail || currentTenant?.contactEmail}</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      borderBottomWidth: vi.borderWidth || '2px',
                      borderBottomStyle: vi.borderStyle === 'NONE' ? 'none' : vi.borderStyle === 'DOUBLE' ? 'double' : vi.borderStyle === 'DASHED' ? 'dashed' : 'solid',
                      borderBottomColor: vi.accentColor || '#4338ca',
                      paddingBottom: vi.headerPadding === 'COMPACT' ? '8px' : vi.headerPadding === 'SPACIOUS' ? '18px' : '12px',
                    }}
                    className={`flex flex-col ${
                      vi.logoPosition === 'center'
                        ? 'items-center text-center'
                        : vi.logoPosition === 'right'
                        ? 'items-end text-right'
                        : 'items-start text-left'
                    }`}
                  >
                    {vi.logoUrl && (
                      <img
                        src={vi.logoUrl}
                        alt="Logo Escritório"
                        style={{ maxHeight: `${vi.logoMaxHeight || 44}px` }}
                        className="object-contain mb-1.5"
                      />
                    )}

                    <span
                      style={{ color: vi.accentColor || '#1e1b4b' }}
                      className="font-bold text-sm uppercase tracking-wider font-['Cinzel'] block"
                    >
                      {currentTenant?.name || 'GABRIELA CAPITANI ADVOCACIA'}
                    </span>

                    {/* Header Meta: Pure OAB without "Registro:", Optional Address, Phone */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-600 font-sans mt-0.5">
                      {vi.showHeaderOab !== false && (
                        <span className="font-mono font-bold text-indigo-700">
                          {vi.signatoryOab || 'OAB/SP 478.370'}
                        </span>
                      )}

                      {vi.showHeaderAddress && vi.headerAddress && (
                        <>
                          {vi.showHeaderOab !== false && <span>•</span>}
                          <span>{vi.headerAddress}</span>
                        </>
                      )}

                      {vi.showHeaderPhone && (vi.contactPhone || currentTenant?.contactPhone) && (
                        <>
                          <span>•</span>
                          <span>Tel: {vi.contactPhone || currentTenant?.contactPhone}</span>
                        </>
                      )}

                      {vi.showHeaderEmail && (vi.contactEmail || currentTenant?.contactEmail) && (
                        <>
                          <span>•</span>
                          <span>{vi.contactEmail || currentTenant?.contactEmail}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Body Sample */}
                <div className="py-4 space-y-3 flex-1 text-justify">
                  {activePreviewDoc === 'PETICAO' && (
                    <>
                      <p className="font-bold text-center uppercase tracking-wide text-[11px]">
                        EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA COMARCA DE PINDAMONHANGABA/SP
                      </p>
                      <p className="font-mono text-[9px] text-slate-500">
                        Autos nº 1002341-89.2026.8.26.0445
                      </p>
                      <p className={vi.paragraphIndent ? 'indent-6' : ''}>
                        <strong>EMPRESA ALPHA LTDA</strong>, devidamente qualificada, por sua patrona constituída, <u className="font-bold underline uppercase tracking-wide">{(vi.signatoryName || 'Dra. Gabriela M. Manni Capitani').toUpperCase()}</u>, inscrita na {vi.signatoryOab || 'OAB/SP 478.370'}, vem perante Vossa Excelência apresentar <strong>RÉPLICA À CONTESTAÇÃO</strong> com esteio no art. 350 do CPC...
                      </p>
                      {vi.jurisprudenceStyle === 'DESTAQUE_ENXUTO' ? (
                        <div className="pl-4 border-l-2 border-indigo-400 py-1 text-[10px] italic text-slate-700 bg-slate-50 rounded-r">
                          &quot;O descumprimento de dever acessório acarreta rescisão com perdas e danos integrais.&quot; (STJ, REsp 1.942.112/SP).
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-50 border border-slate-200 text-[9px] leading-tight">
                          EMENTA: APELAÇÃO CÍVEL. INADIMPLEMENTO CONTRATUAL. DANO MATERIAL COMPROVADO.
                        </div>
                      )}
                      <p className={vi.paragraphIndent ? 'indent-6' : ''}>
                        Requer o regular prosseguimento do feito com a procedência in totum dos pedidos exordiais.
                      </p>
                    </>
                  )}

                  {activePreviewDoc === 'PROCURACAO' && (
                    <>
                      <p className="font-bold text-center uppercase tracking-widest text-[11px] pb-1 border-b border-slate-200">
                        PROCURAÇÃO AD JUDICIA ET EXTRA
                      </p>
                      <p className="text-[10px]">
                        <strong>OUTORGANTE:</strong> JOÃO DA SILVA, brasileiro, empresário, CPF nº 123.456.789-00, residente em Pindamonhangaba/SP...
                      </p>
                      <p className="text-[10px]">
                        <strong>OUTORGADA:</strong> <u className="font-bold underline uppercase tracking-wide">{(vi.signatoryName || 'DRA. GABRIELA M. MANNI CAPITANI').toUpperCase()}</u>, inscrita na {vi.signatoryOab || 'OAB/SP 478.370'}, com escritório profissional...
                      </p>
                      <p className="text-[9px] text-slate-600">
                        PODERES: Cláusula ad judicia et extra para o foro em geral e poderes especiais do art. 105 do CPC/2015 (confessar, transigir, desistir, dar quitação e substabelecer).
                      </p>
                    </>
                  )}

                  {activePreviewDoc === 'CONTRATO' && (
                    <>
                      <p className="font-bold text-center uppercase tracking-widest text-[11px] pb-1 border-b border-slate-200">
                        CONTRATO DE HONORÁRIOS ADVOCATÍCIOS
                      </p>
                      <p className="text-[10px]">
                        Pelo presente instrumento, de um lado o CONTRATANTE identificado e de outro a CONTRATADA {currentTenant?.name || 'Gabriela Capitani Advocacia'}, representada por sua patrona <u className="font-bold underline uppercase tracking-wide">{(vi.signatoryName || 'Dra. Gabriela M. Manni Capitani').toUpperCase()}</u> ({vi.signatoryOab || 'OAB/SP 478.370'}).
                      </p>
                      <p className="text-[10px]">
                        <strong>CLÁUSULA 1ª:</strong> O objeto consiste no patrocínio forense da causa com honorários pró-labore e cláusula quota litis conforme o Estatuto da OAB.
                      </p>
                      <p className="text-[9px] text-slate-500 italic">
                        CLÁUSULA LGPD: Conformidade com a Lei nº 13.709/2018 para finalidade processual.
                      </p>
                    </>
                  )}

                  {/* Closing Formula */}
                  <div className="pt-2 text-right">
                    <p className="font-medium italic text-[10px]">
                      {vi.closingFormula || 'Termos em que, Pede e Espera Deferimento.'}
                    </p>
                    <p className="text-[9px] text-slate-500 font-sans mt-0.5">
                      Pindamonhangaba/SP, {new Date().toLocaleDateString('pt-BR')}.
                    </p>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="pt-3 flex flex-col items-center text-center">
                  {vi.signatureImageUrl && (
                    <img
                      src={vi.signatureImageUrl}
                      alt="Chancela"
                      className="h-9 object-contain mb-1.5"
                    />
                  )}
                  <p className="font-bold text-[10px] text-slate-900 leading-tight">
                    {vi.signatoryName || 'Dra. Gabriela M. Manni Capitani'}
                  </p>
                  <p className="text-[9px] font-mono font-semibold" style={{ color: vi.accentColor || '#4338ca' }}>
                    {vi.signatoryOab || 'OAB/SP 478.370'}
                  </p>
                  <p className="text-[8px] text-slate-500 font-sans">
                    {vi.signatoryRole || 'Advogada Sócia e Titular'}
                  </p>

                  {/* Espaço abaixo com Selo de "Assinado Digitalmente" com Token OAB */}
                  {vi.showDigitalSignatureSeal !== false && (
                    <div className="mt-2.5 flex flex-col items-center select-none">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50/90 text-emerald-800 shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <div className="flex flex-col items-start leading-tight text-left">
                          <span className="text-[7.5px] font-bold tracking-wider uppercase text-emerald-900">
                            Assinado Digitalmente
                          </span>
                          <span className="text-[6.5px] text-emerald-700 font-mono">
                            Certificado ICP-Brasil • Token OAB
                          </span>
                        </div>
                      </div>
                      <span className="text-[6.5px] text-slate-400 font-sans mt-0.5">
                        (Espaço reservado para validação eletrônica e protocolo)
                      </span>
                    </div>
                  )}
                </div>

                {/* Official Footer */}
                {vi.showFooterText !== false && (
                  <div className="border-t border-slate-200 pt-2 text-center text-[8px] text-slate-500 font-sans space-y-0.5">
                    <p className="font-medium text-slate-700">
                      {vi.footerText || `${currentTenant?.name || 'Gabriela Capitani Advocacia'} • ${vi.signatoryOab || 'OAB/SP 478.370'}`}
                    </p>
                    {(vi.showFooterAddress || vi.showFooterPhone || vi.showFooterEmail) && (
                      <p className="text-[7.5px] text-slate-400">
                        {[
                          vi.showFooterAddress && vi.headerAddress ? vi.headerAddress : null,
                          vi.showFooterPhone && (vi.contactPhone || currentTenant?.contactPhone) ? `Tel: ${vi.contactPhone || currentTenant?.contactPhone}` : null,
                          vi.showFooterEmail && (vi.contactEmail || currentTenant?.contactEmail) ? (vi.contactEmail || currentTenant?.contactEmail) : null,
                        ].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB 2: MODELOS OFICIAIS (PETIÇÃO, PROCURAÇÃO, CONTRATO) & IA LGPD */}
      {activeMainTab === 'TEMPLATES' && (
        <div className="space-y-6">
          {/* Explanation & Action Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-400/30">
                    PADRONIZAÇÃO FORENSE CORPORATIVA
                  </span>
                  <span className="text-xs text-indigo-200">Vinculado ao Escritório</span>
                </div>
                <h3 className="text-lg font-bold">
                  Repositório de Modelos Oficiais & Higienização Inteligente (LGPD)
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Importe modelos reais que seu escritório já utiliza (Petição, Procuração, Contrato): nossa Inteligência Artificial <strong>remove automaticamente todos os dados pessoais do cliente</strong> (substituindo por tags dinâmicas como &#123;&#123;NOME_CLIENTE&#125;&#125;) e <strong>mantém integralmente os dados da banca, formatação, cores e estilo</strong>. Caso ainda não tenha um modelo pronto, utilize a <strong>Sugestão por IA</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenAiImportModal('SANITIZE');
                    setTimeout(() => docImportFileRef.current?.click(), 150);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>Enviar Peça em Word (.docx) ou PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAiImportModal('SANITIZE')}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <Scissors className="w-4 h-4 text-indigo-300" />
                  <span>Higienizar Real (LGPD)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAiImportModal('GENERATE')}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>IA Sugestão / Padrão</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddTemplate()}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs transition-all flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Manual</span>
                </button>
              </div>
            </div>
          </div>

          {/* Categorized Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['PETICAO', 'PROCURACAO', 'CONTRATO'] as const).map((category) => {
              const categoryTitle =
                category === 'PETICAO'
                  ? 'Petições & Peças Forenses'
                  : category === 'PROCURACAO'
                  ? 'Procurações & Mandatos'
                  : 'Contratos de Honorários';

              const categoryBadge =
                category === 'PETICAO'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : category === 'PROCURACAO'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200';

              const categoryTemplates = (vi.templates || []).filter(
                (t) => t.category === category || (!t.category && category === 'PETICAO')
              );

              return (
                <div
                  key={category}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryBadge}`}>
                          {category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{categoryTitle}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {categoryTemplates.length} modelo(s)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {categoryTemplates.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                          <p className="text-[11px] text-slate-500">Nenhum modelo nesta categoria ainda.</p>
                          <button
                            type="button"
                            onClick={() => handleOpenAiImportModal('GENERATE', category)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-indigo-600 font-semibold inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Gerar com IA</span>
                          </button>
                        </div>
                      ) : (
                        categoryTemplates.map((tmpl) => (
                          <div
                            key={tmpl.id}
                            className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition-all space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 line-clamp-1">{tmpl.name}</span>
                              {tmpl.isDefault && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono shrink-0">
                                  Padrão
                                </span>
                              )}
                            </div>

                            {/* Attached File & Layout Style Badges */}
                            {tmpl.attachedFile && (
                              <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-150 flex items-center justify-between gap-1 text-[10px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileCode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span className="font-semibold text-indigo-950 truncate">
                                    {tmpl.attachedFile.fileName}
                                  </span>
                                  <span className="text-[9px] text-indigo-600 font-mono">
                                    ({(tmpl.attachedFile.fileSize / 1024).toFixed(0)}KB)
                                  </span>
                                </div>
                                {tmpl.attachedFile.dataUrl && (
                                  <a
                                    href={tmpl.attachedFile.dataUrl}
                                    download={tmpl.attachedFile.fileName}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded hover:bg-indigo-100 text-indigo-700 transition-colors"
                                    title="Baixar arquivo original formatado"
                                  >
                                    <Download className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            {tmpl.layoutStyle && (
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {tmpl.layoutStyle.fontFamily || 'Fonte Preservada'}
                                </span>
                                <span>•</span>
                                <span>{tmpl.layoutStyle.fontSize || '12pt'}</span>
                                {tmpl.layoutStyle.accentColor && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block border border-slate-300 ml-1"
                                    style={{ backgroundColor: tmpl.layoutStyle.accentColor }}
                                    title={`Cor de destaque: ${tmpl.layoutStyle.accentColor}`}
                                  />
                                )}
                              </div>
                            )}

                            <p className="text-[11px] text-slate-500 line-clamp-2 font-mono">
                              {tmpl.content.slice(0, 110)}...
                            </p>

                            {/* Placeholders tags */}
                            {tmpl.variables && tmpl.variables.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {tmpl.variables.slice(0, 3).map((v) => (
                                  <span
                                    key={v}
                                    className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200"
                                  >
                                    &#123;&#123;{v}&#125;&#125;
                                  </span>
                                ))}
                                {tmpl.variables.length > 3 && (
                                  <span className="text-[9px] font-mono text-slate-400">
                                    +{tmpl.variables.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setAiMode('SUGGEST');
                                  setAiCategory(category);
                                  setAiModelName(tmpl.name);
                                  setAiRawInput(tmpl.content);
                                  setAiResult(null);
                                  setIsAiModalOpen(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>IA Sugestão</span>
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTemplate(tmpl)}
                                  className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white"
                                  title="Editar modelo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTemplate(tmpl.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white"
                                  title="Remover modelo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddTemplate(category)}
                    className="w-full mt-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Adicionar Modelo ({category})</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT MANUAL TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {editingTemplateId ? 'Editar Modelo Forense' : 'Novo Modelo Institucional'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nome do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Ex: Réplica com Pedido de Julgamento Antecipado"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Categoria Forense</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
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

              {/* Import Word / PDF into Manual Template */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Importar Arquivo Pronto do Escritório</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold">
                      .DOCX • .PDF • .TXT
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-snug">
                    Carregue uma petição, procuração ou contrato já existente para preencher automaticamente esta minuta.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={manualTmplFileRef}
                    type="file"
                    accept=".docx,.doc,.pdf,.txt"
                    className="hidden"
                    onChange={handleManualTemplateFileUpload}
                  />
                  <button
                    type="button"
                    disabled={isExtractingDoc}
                    onClick={() => manualTmplFileRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    {isExtractingDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Extraindo Arquivo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importar Arquivo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {extractSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{extractSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtractSuccessMsg(null)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Attached File Display in Modal */}
              {templateForm.attachedFile && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[260px]">
                          {templateForm.attachedFile.fileName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Arquivo Matriz Anexado
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Tamanho: {(templateForm.attachedFile.fileSize / 1024).toFixed(1)} KB • Formato original e cabeçalhos preservados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {templateForm.attachedFile.dataUrl && (
                      <a
                        href={templateForm.attachedFile.dataUrl}
                        download={templateForm.attachedFile.fileName}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs"
                      >
                        <Download className="w-3 h-3 text-indigo-600" />
                        <span>Baixar Original</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          attachedFile: undefined,
                          htmlContent: undefined,
                        }))
                      }
                      className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold"
                    >
                      Remover Vínculo
                    </button>
                  </div>
                </div>
              )}

              {/* Layout / Typography Info */}
              {templateForm.layoutStyle && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[10px] text-indigo-900 font-mono">
                  <span>
                    Tipografia Preservada: <strong>{templateForm.layoutStyle.fontFamily || 'Padrão'}</strong> ({templateForm.layoutStyle.fontSize || '12pt'}, entrelinhas {templateForm.layoutStyle.lineSpacing || '1.5'})
                  </span>
                  {templateForm.layoutStyle.accentColor && (
                    <span className="flex items-center gap-1">
                      Cor:{' '}
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-slate-300"
                        style={{ backgroundColor: templateForm.layoutStyle.accentColor }}
                      />
                    </span>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-700 font-semibold">Conteúdo da Minuta / Template</label>
                    {templateForm.htmlContent && (
                      <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setTemplateModalViewMode('TEXT')}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            templateModalViewMode === 'TEXT'
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Texto & Variáveis
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateModalViewMode('HTML')}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            templateModalViewMode === 'HTML'
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Formatação Real (HTML)
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Use placeholders &#123;&#123;NOME_CLIENTE&#125;&#125;, &#123;&#123;CPF_CLIENTE&#125;&#125;, etc.
                  </span>
                </div>

                {templateModalViewMode === 'HTML' && templateForm.htmlContent ? (
                  <div
                    className="w-full bg-white border border-slate-200 rounded-lg p-4 text-slate-900 max-h-[350px] overflow-y-auto shadow-inner text-xs leading-relaxed"
                    style={{
                      fontFamily: templateForm.layoutStyle?.fontFamily || vi.fontFamily || 'Times New Roman',
                      lineHeight: templateForm.layoutStyle?.lineSpacing || vi.lineSpacing || '1.5',
                    }}
                    dangerouslySetInnerHTML={{ __html: templateForm.htmlContent }}
                  />
                ) : (
                  <textarea
                    rows={10}
                    required
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    placeholder="Insira o texto forense padronizado com as variáveis..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-mono text-[11px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateForm.isDefault}
                    onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Definir como modelo padrão desta categoria</span>
                </label>

                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AI IMPORT / SANITIZE / SUGGESTIONS */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-indigo-600" />
                  {aiMode === 'SANITIZE'
                    ? 'Importar Modelo Real & Higienizar com IA (LGPD)'
                    : aiMode === 'SUGGEST'
                    ? 'Sugestões & Melhorias de Conformidade por IA'
                    : 'Gerar Modelo Padrão Ouro por IA'}
                </h3>
                <p className="text-xs text-slate-500">
                  {aiMode === 'SANITIZE'
                    ? 'Cole um documento real do seu escritório. A IA substitui dados pessoais de clientes por tags dinâmicas e preserva seus dados e sua formatação.'
                    : 'A IA analisa a minuta à luz do CPC/2015, Estatuto da OAB e LGPD.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 text-xs border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setAiMode('SANITIZE');
                  setAiResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  aiMode === 'SANITIZE'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Higienizar Peça Real (LGPD)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiMode('SUGGEST');
                  setAiResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  aiMode === 'SUGGEST'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Melhorias / Sugestões
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiMode('GENERATE');
                  setAiResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  aiMode === 'GENERATE'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Gerar do Zero
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nome do Modelo</label>
                  <input
                    type="text"
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    placeholder="Ex: Petição Inicial Indenizatória Cível"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Categoria Forense</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="PETICAO">Petição / Peça Processual</option>
                    <option value="PROCURACAO">Procuração Forense</option>
                    <option value="CONTRATO">Contrato de Honorários</option>
                  </select>
                </div>
              </div>

              {aiMode !== 'GENERATE' && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <div>
                      <label className="text-slate-700 font-semibold block">
                        {aiMode === 'SANITIZE' ? 'Documento Real do Escritório' : 'Texto da Minuta'}
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Envie o arquivo original em Word (.docx), PDF ou cole o texto
                      </span>
                    </div>
                    <div>
                      <input
                        ref={docImportFileRef}
                        type="file"
                        accept=".docx,.doc,.pdf,.txt"
                        className="hidden"
                        onChange={handleDocFileUpload}
                      />
                      <button
                        type="button"
                        disabled={isExtractingDoc}
                        onClick={() => docImportFileRef.current?.click()}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                      >
                        {isExtractingDoc ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            <span>Extraindo Word/PDF...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Carregar Arquivo (Word / PDF / TXT)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {extractSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{extractSuccessMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtractSuccessMsg(null)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Attached File in AI Modal */}
                  {aiAttachedFile && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 truncate max-w-[280px]">
                              {aiAttachedFile.fileName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              Matriz Original Vinculada
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {(aiAttachedFile.fileSize / 1024).toFixed(1)} KB • Formatação, fontes e cabeçalhos preservados
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {aiAttachedFile.dataUrl && (
                          <a
                            href={aiAttachedFile.dataUrl}
                            download={aiAttachedFile.fileName}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="w-3 h-3 text-indigo-600" />
                            <span>Baixar</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAiAttachedFile(null);
                            setAiRawHtml('');
                          }}
                          className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )}

                  {/* LGPD Preservation Note */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-950 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Higienização Real de Dados Pessoais (LGPD):</strong> Os dados de clientes e partes (CPF, RG, endereços, etc.) serão substituídos por variáveis automáticas &#123;&#123;...&#125;&#125;. Os dados do escritório/advogada, logotipo, formatação, fontes, cores, cabeçalhos e rodapés serão 100% mantidos no arquivo final.
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={aiRawInput}
                    onChange={(e) => setAiRawInput(e.target.value)}
                    placeholder="Cole aqui o texto da petição, procuração ou contrato com os dados reais do cliente, ou clique acima em 'Carregar Arquivo' para importar diretamente o arquivo Word (.docx) ou PDF do seu escritório..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 font-mono text-[11px] focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Run Action Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunAiAction}
                  disabled={isAiProcessing}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isAiProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processando com IA Jurídica...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {aiMode === 'SANITIZE'
                          ? 'Higienizar com IA (LGPD)'
                          : aiMode === 'SUGGEST'
                          ? 'Analisar e Sugerir Melhorias'
                          : 'Gerar Modelo Padrão Ouro'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Result Presentation */}
              {aiResult && (
                <div className="pt-3 border-t border-slate-200 space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Resultado do Processamento por IA
                    </span>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">
                      {aiResult.extractedVariables?.length || 0} variáveis estruturadas
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {aiResult.summary}
                  </p>

                  {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase">
                        Melhorias Forenses Aplicadas:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                        {aiResult.suggestions.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Attached File Confirmation */}
                  {(aiResult.attachedFile || aiAttachedFile) && (
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between gap-2 text-xs shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">
                          {(aiResult.attachedFile || aiAttachedFile)?.fileName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Matriz Vinculada ao Modelo
                        </span>
                      </div>
                      {(aiResult.attachedFile?.dataUrl || aiAttachedFile?.dataUrl) && (
                        <a
                          href={(aiResult.attachedFile || aiAttachedFile)?.dataUrl}
                          download={(aiResult.attachedFile || aiAttachedFile)?.fileName}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1"
                        >
                          <Download className="w-3 h-3 text-indigo-600" />
                          <span>Baixar</span>
                        </a>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-800 font-bold block">
                        Minuta Higienizada & Pronta para o Escritório:
                      </label>
                      {(aiResult.sanitizedHtmlContent || aiRawHtml) && (
                        <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setAiResultViewMode('TEXT')}
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              aiResultViewMode === 'TEXT'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Texto & Variáveis
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiResultViewMode('HTML')}
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              aiResultViewMode === 'HTML'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Formatação Real (HTML)
                          </button>
                        </div>
                      )}
                    </div>

                    {aiResultViewMode === 'HTML' && (aiResult.sanitizedHtmlContent || aiRawHtml) ? (
                      <div
                        className="w-full bg-white border border-slate-300 rounded-lg p-4 text-slate-900 max-h-[300px] overflow-y-auto shadow-inner text-xs leading-relaxed"
                        style={{
                          fontFamily: aiResult.layoutStyle?.fontFamily || vi.fontFamily || 'Times New Roman',
                          lineHeight: aiResult.layoutStyle?.lineSpacing || vi.lineSpacing || '1.5',
                        }}
                        dangerouslySetInnerHTML={{
                          __html: aiResult.sanitizedHtmlContent || aiRawHtml,
                        }}
                      />
                    ) : (
                      <textarea
                        rows={8}
                        value={aiResult.sanitizedContent}
                        onChange={(e) => setAiResult({ ...aiResult, sanitizedContent: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 font-mono text-[11px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAiResult(null)}
                      className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptAiTemplate}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Salvar e Cadastrar no Banco de Dados</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL: REVISÃO E APLICAÇÃO DE IDENTIDADE VISUAL EXTRAÍDA DE PDF / IMAGEM */}
      {isVisualIdentityImportModalOpen && visualIdentityAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Design e Identidade Visual Extraídos do Arquivo
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Revise o logotipo, fontes, cores e layout detectados antes de aplicar ao papel timbrado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVisualIdentityImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {/* Summary banner */}
              <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-indigo-950">Resumo da Extração Forense:</span>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                    {visualIdentityAnalysisResult.summary}
                  </p>
                </div>
              </div>

              {/* 1. Logotipo Extraído */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Award className="w-4 h-4 text-indigo-600" />
                    1. Logotipo Detectado no Documento
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {visualIdentityAnalysisResult.extractedImages.length} imagem(ns) encontrada(s) no arquivo
                  </span>
                </div>

                {visualIdentityAnalysisResult.extractedImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-stretch gap-3">
                      {visualIdentityAnalysisResult.extractedImages.map((img: any, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedLogoFromPdf(img.dataUrl)}
                          className={`relative p-2.5 rounded-xl border text-left transition-all bg-white flex flex-col items-center justify-between gap-1.5 ${
                            selectedLogoFromPdf === img.dataUrl
                              ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs bg-indigo-50/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-center p-1 min-h-[60px]">
                            <img
                              src={img.dataUrl}
                              alt={img.label || `Opção ${idx + 1}`}
                              className="max-h-16 max-w-[240px] w-auto object-contain rounded"
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700 text-center max-w-[240px] truncate block">
                            {img.label || (img.isPrimaryLogo ? 'Cabeçalho Principal' : `Opção ${idx + 1}`)}
                          </span>
                          {selectedLogoFromPdf === img.dataUrl && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedLogoFromPdf(null)}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all self-center ${
                          selectedLogoFromPdf === null
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Deixar sem logotipo
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Selecione a faixa de cabeçalho timbrado ou o logotipo oficial extraído para aplicar automaticamente a todos os documentos gerados.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Nenhuma imagem rasterizada de logotipo foi identificada no PDF. O papel timbrado utilizará o cabeçalho institucional tipográfico.</span>
                  </div>
                )}
              </div>

              {/* 2. Cores & Tipografia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Colors Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Palette className="w-4 h-4 text-indigo-600" />
                    2. Cores & Linhas Detectadas
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">Cor de Destaque:</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md border border-black/10 shadow-2xs"
                          style={{ backgroundColor: visualIdentityAnalysisResult.visualIdentity.accentColor || '#1e3a8a' }}
                        />
                        <span className="font-mono font-bold text-slate-800 uppercase">
                          {visualIdentityAnalysisResult.visualIdentity.accentColor || '#1e3a8a'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">Estilo de Borda:</span>
                      <span className="font-bold text-slate-800">
                        {visualIdentityAnalysisResult.visualIdentity.borderStyle || 'SOLID'} ({visualIdentityAnalysisResult.visualIdentity.borderWidth || '2px'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">Estilo do Cabeçalho:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {visualIdentityAnalysisResult.visualIdentity.headerStyle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Typography Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Type className="w-4 h-4 text-indigo-600" />
                    3. Tipografia & Dimensões Forenses
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">Fonte Principal:</span>
                      <span className="font-bold text-slate-900" style={{ fontFamily: visualIdentityAnalysisResult.visualIdentity.fontFamily || 'Times New Roman' }}>
                        {visualIdentityAnalysisResult.visualIdentity.fontFamily || 'Times New Roman'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">Tamanho do Corpo:</span>
                      <span className="font-bold text-slate-800">
                        {visualIdentityAnalysisResult.visualIdentity.bodyFontSize || '12pt'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">Espaçamento Entrelinhas:</span>
                      <span className="font-bold text-slate-800">
                        {visualIdentityAnalysisResult.visualIdentity.lineSpacing || '1.5'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Dados Oficiais Identificados */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  4. Dados Cadastrais Identificados no Documento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {visualIdentityAnalysisResult.detectedLawFirmName && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Escritório / Sociedade:</span>
                      <span className="font-bold text-slate-800">{visualIdentityAnalysisResult.detectedLawFirmName}</span>
                    </div>
                  )}
                  {visualIdentityAnalysisResult.visualIdentity.signatoryName && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Advogado(a) Titular:</span>
                      <span className="font-bold text-slate-800">{visualIdentityAnalysisResult.visualIdentity.signatoryName}</span>
                    </div>
                  )}
                  {visualIdentityAnalysisResult.visualIdentity.signatoryOab && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Inscrição OAB:</span>
                      <span className="font-mono font-bold text-indigo-700">{visualIdentityAnalysisResult.visualIdentity.signatoryOab}</span>
                    </div>
                  )}
                  {visualIdentityAnalysisResult.visualIdentity.contactPhone && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Telefone / WhatsApp:</span>
                      <span className="font-bold text-slate-800">{visualIdentityAnalysisResult.visualIdentity.contactPhone}</span>
                    </div>
                  )}
                  {visualIdentityAnalysisResult.visualIdentity.headerAddress && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                      <span className="text-slate-500 block">Endereço:</span>
                      <span className="font-medium text-slate-800">{visualIdentityAnalysisResult.visualIdentity.headerAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Live Mini Preview */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  5. Prévia do Papel Timbrado com as Configurações Extraídas
                </label>
                <div
                  className="p-5 rounded-lg border border-slate-300 bg-white shadow-xs space-y-4"
                  style={{ fontFamily: visualIdentityAnalysisResult.visualIdentity.fontFamily || 'Times New Roman' }}
                >
                  {(visualIdentityAnalysisResult.visualIdentity.headerStyle === 'FULL_BANNER' || visualIdentityAnalysisResult.visualIdentity.headerBannerUrl) && selectedLogoFromPdf ? (
                    <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-lg shadow-2xs">
                      <img
                        src={selectedLogoFromPdf || visualIdentityAnalysisResult.visualIdentity.headerBannerUrl}
                        alt="Faixa Superior do Papel Timbrado Oficial"
                        className="w-full object-cover max-h-24 sm:max-h-28"
                      />
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between pb-3 ${
                        visualIdentityAnalysisResult.visualIdentity.borderStyle !== 'NONE'
                          ? 'border-b'
                          : ''
                      }`}
                      style={{
                        borderColor: visualIdentityAnalysisResult.visualIdentity.accentColor || '#5C1217',
                        borderBottomWidth: visualIdentityAnalysisResult.visualIdentity.borderWidth || '2px',
                      }}
                    >
                      {selectedLogoFromPdf ? (
                        <img
                          src={selectedLogoFromPdf}
                          alt="Logo Preview"
                          className="max-h-12 max-w-[180px] object-contain"
                        />
                      ) : (
                        <div>
                          <div className="font-bold text-sm text-slate-900 font-['Cinzel']">
                            {visualIdentityAnalysisResult.detectedLawFirmName || currentTenant?.name || 'GABRIELA CAPITANI ADVOCACIA'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {visualIdentityAnalysisResult.visualIdentity.signatoryOab || 'OAB/SP 478.370'}
                          </div>
                        </div>
                      )}
                      <div className="text-right text-[10px] text-slate-600 font-sans">
                        <div className="font-bold text-slate-800">
                          {visualIdentityAnalysisResult.visualIdentity.signatoryName || 'Dra. Gabriela M. Manni Capitani'}
                        </div>
                        <div className="font-mono text-[9px]" style={{ color: visualIdentityAnalysisResult.visualIdentity.accentColor || '#5C1217' }}>
                          {visualIdentityAnalysisResult.visualIdentity.signatoryOab || 'OAB/SP 478.370'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-700 leading-relaxed text-justify">
                    Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito. Documento gerado com fidelidade à identidade visual forense da banca: tipografia {visualIdentityAnalysisResult.visualIdentity.fontFamily || 'Times New Roman'}, corpo {visualIdentityAnalysisResult.visualIdentity.bodyFontSize || '12pt'} e entrelinhas {visualIdentityAnalysisResult.visualIdentity.lineSpacing || '1.5'}.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsVisualIdentityImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApplyAnalyzedVisualIdentity}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md"
              >
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Aplicar Design no Escritório & Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
