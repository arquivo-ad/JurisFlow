import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ShieldCheck,
  Printer,
  Scale,
  User,
  Trash2,
  Calendar,
  Lock,
  ExternalLink,
  Filter,
  Save,
  FileCheck2,
  Tag,
  Share2,
} from 'lucide-react';
import { DocumentItem, DocumentTemplate, Case, Person, DocumentCategory, DigitalSignatureInfo } from '../../types';
import { api } from '../../services/api';
import { formatLawyerNameInBody } from '../../utils/forensicFormatter';

interface DocumentsViewProps {
  documents: DocumentItem[];
  templates: DocumentTemplate[];
  cases: Case[];
  persons: Person[];
  currentTenant?: any;
  onSaveDocument: (data: Partial<DocumentItem>) => Promise<void>;
  onOpenAiGateway: (tab: string, prompt?: string) => void;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORY_STYLES: Record<DocumentCategory, { label: string; bg: string; text: string; border: string }> = {
  PETICAO: { label: 'Petição & Minuta', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  CONTRATO: { label: 'Contrato de Honorários', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  PROCURACAO: { label: 'Procuração & Substabelecimento', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  DECISAO: { label: 'Decisão Judicial / Acórdão', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PROVA: { label: 'Documento / Prova dos Autos', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  NOTIFICACAO: { label: 'Notificação Extrajudicial', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  PARECER: { label: 'Parecer Jurídico & Opinião Legal', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  OUTRO: { label: 'Outros Documentos', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const STATUS_MAP: Record<DocumentItem['status'], { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Minuta (Rascunho)', bg: 'bg-slate-100', text: 'text-slate-700' },
  UNDER_REVIEW: { label: 'Em Revisão Técnica', bg: 'bg-amber-100', text: 'text-amber-800' },
  APPROVED: { label: 'Assinado & Aprovado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  FILED: { label: 'Protocolado em Juízo', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  ARCHIVED: { label: 'Arquivado', bg: 'bg-slate-100', text: 'text-slate-600' },
};

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents = [],
  templates = [],
  cases = [],
  persons = [],
  currentTenant,
  onSaveDocument = async (_data: Partial<DocumentItem>) => {},
  onOpenAiGateway = (_tab: string, _prompt?: string) => {},
  onRefresh = () => {},
  onShowToast = (_msg: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'TEMPLATES'>('DOCUMENTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Document Detail/Drawer State
  const vi = currentTenant?.visualIdentity || {};
  const currentLawyerName = vi.signatoryName || 'Dra. Gabriela M. Manni Capitani';

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editDocContent, setEditDocContent] = useState('');
  const [editDocTitle, setEditDocTitle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Digital Signature Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signerName, setSignerName] = useState(
    currentTenant?.visualIdentity?.signatoryName || 'Dra. Gabriela M. Manni Capitani'
  );
  const [signerCpf, setSignerCpf] = useState('123.456.789-00');
  const [signerRole, setSignerRole] = useState(
    currentTenant?.visualIdentity?.signatoryOab
      ? `Advogada Titular - ${currentTenant.visualIdentity.signatoryOab}`
      : 'Advogada Titular - OAB/SP 478.370'
  );
  const [isSigning, setIsSigning] = useState(false);

  // New Document Modal State
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DocumentCategory>('PETICAO');
  const [newCaseId, setNewCaseId] = useState('');
  const [newPersonId, setNewPersonId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Template Dynamic Generator Modal State
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [renderedContent, setRenderedContent] = useState('');
  const [templateCaseId, setTemplateCaseId] = useState('');
  const [templatePersonId, setTemplatePersonId] = useState('');
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        const matchCase = (d.caseNumber || '').toLowerCase().includes(q);
        const matchPerson = (d.personName || '').toLowerCase().includes(q);
        const matchCategory = d.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCase && !matchPerson && !matchCategory) {
          return false;
        }
      }

      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && d.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [documents, searchQuery, categoryFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = documents.length;
    const signed = documents.filter((d) => d.status === 'APPROVED' || d.digitalSignature).length;
    const underReview = documents.filter((d) => d.status === 'UNDER_REVIEW').length;
    const drafts = documents.filter((d) => d.status === 'DRAFT').length;
    return { total, signed, underReview, drafts };
  }, [documents]);

  // Open Template Modal with Auto-detection
  const handleOpenRenderTemplate = (tpl: DocumentTemplate) => {
    setSelectedTemplate(tpl);
    const vars = tpl.variables || tpl.placeholders || [];
    const initialVars: Record<string, string> = {};
    vars.forEach((v) => {
      initialVars[v] = '';
    });

    // Default fill if matching case / client available
    if (cases.length > 0) {
      setTemplateCaseId(cases[0].id);
      if (vars.includes('NUMERO_PROCESSO')) initialVars['NUMERO_PROCESSO'] = cases[0].cnjNumber;
      if (vars.includes('VARA_COMARCA')) initialVars['VARA_COMARCA'] = `${cases[0].courtBranch} de ${cases[0].comarca}`;
      if (vars.includes('AUTOR_NOME')) initialVars['AUTOR_NOME'] = cases[0].parties?.find((p) => p.role === 'AUTHOR')?.name || 'Autor da Ação';
      if (vars.includes('REU_NOME')) initialVars['REU_NOME'] = cases[0].parties?.find((p) => p.role === 'DEFENDANT')?.name || 'Réu da Ação';
    }

    if (persons.length > 0) {
      setTemplatePersonId(persons[0].id);
      if (vars.includes('CLIENTE_NOME')) initialVars['CLIENTE_NOME'] = persons[0].name;
      if (vars.includes('CLIENTE_CPF_CNPJ')) initialVars['CLIENTE_CPF_CNPJ'] = persons[0].cpfCnpj;
      if (vars.includes('CLIENTE_ENDERECO')) initialVars['CLIENTE_ENDERECO'] = persons[0].address || 'Endereço Comercial / Residencial';
      if (vars.includes('CLIENTE_ESTADO_CIVIL')) initialVars['CLIENTE_ESTADO_CIVIL'] = persons[0].maritalStatus || 'Casado(a)';
      if (vars.includes('CLIENTE_PROFISSAO')) initialVars['CLIENTE_PROFISSAO'] = persons[0].profession || 'Empresário(a)';
    }

    setTemplateVars(initialVars);

    // Initial render replace
    let content = tpl.templateContent;
    for (const [k, v] of Object.entries(initialVars)) {
      const regex = new RegExp(`{{${k}}}`, 'g');
      content = content.replace(regex, v || `[${k}]`);
    }
    setRenderedContent(content);
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
      const relatedCase = cases.find((c) => c.id === templateCaseId);
      const relatedPerson = persons.find((p) => p.id === templatePersonId);
      const lawyerToFormat = vi.signatoryName || 'Dra. Gabriela M. Manni Capitani';
      const formattedToSave = formatLawyerNameInBody(renderedContent, lawyerToFormat);

      await onSaveDocument({
        title: `${selectedTemplate.title || selectedTemplate.name || 'Documento'} - ${relatedPerson?.name || 'Cliente'} (${new Date().toLocaleDateString('pt-BR')})`,
        category: selectedTemplate.category,
        description: `Gerado a partir do modelo ${selectedTemplate.title || selectedTemplate.name}`,
        caseId: relatedCase?.id,
        caseNumber: relatedCase?.cnjNumber,
        personId: relatedPerson?.id,
        personName: relatedPerson?.name,
        content: formattedToSave,
        status: 'DRAFT',
      });
      setIsRenderModalOpen(false);
      setActiveTab('DOCUMENTS');
      onShowToast('Documento gerado e salvo no repositório com sucesso!');
      onRefresh();
    } catch (err: any) {
      onShowToast('Falha ao salvar documento gerado.');
    }
  };

  // Open Create Manual Document Modal
  const handleOpenNewDocModal = () => {
    setNewTitle('');
    setNewCategory('PETICAO');
    setNewCaseId(cases[0]?.id || '');
    setNewPersonId(persons[0]?.id || '');
    setNewDescription('');
    setNewContent(`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE SÃO PAULO - SP

Processo nº: ${cases[0]?.cnjNumber || '0000000-00.2026.8.26.0100'}

${persons[0]?.name || 'REQUERENTE'}, já qualificado(a) nos autos da ação em epígrafe, vem, respeitosamente, por seu advogado infra-assinado, perante Vossa Excelência, expor e requerer o que segue:

I - DOS FATOS E DO DIREITO
1. O Requerente ingressou com a presente demanda visando a tutela de seus legítimos direitos...

II - DOS PEDIDOS
Ante o exposto, requer a Vossa Excelência:
a) O acolhimento integral da presente manifestação;
b) A juntada dos inclusos documentos comprobatórios.

Termos em que,
Pede deferimento.

São Paulo, ${new Date().toLocaleDateString('pt-BR')}.

__________________________________________
DR. CARLOS SILVEIRA - OAB/SP 412.890`);
    setIsNewDocModalOpen(true);
  };

  // Save New Document
  const handleSaveNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowToast('O título do documento é obrigatório.');
      return;
    }
    setIsSubmittingNew(true);
    try {
      const selCase = cases.find((c) => c.id === newCaseId);
      const selPerson = persons.find((p) => p.id === newPersonId);

      await onSaveDocument({
        title: newTitle.trim(),
        category: newCategory,
        caseId: selCase?.id,
        caseNumber: selCase?.cnjNumber,
        personId: selPerson?.id,
        personName: selPerson?.name,
        description: newDescription.trim() || `Peça vinculada ao processo ${selCase?.cnjNumber || ''}`,
        content: newContent,
        status: 'DRAFT',
      });
      setIsNewDocModalOpen(false);
      onShowToast('Documento criado com sucesso!');
      onRefresh();
    } catch (err: any) {
      onShowToast('Erro ao criar documento.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Edit Existing Document Content
  const handleStartEditDoc = () => {
    if (!selectedDoc) return;
    setEditDocTitle(selectedDoc.title);
    setEditDocContent(selectedDoc.content || '');
    setIsEditingDoc(true);
  };

  const handleSaveEditDoc = async () => {
    if (!selectedDoc) return;
    setIsSavingEdit(true);
    try {
      const updated = await api.updateDocument(selectedDoc.id, {
        title: editDocTitle.trim(),
        content: editDocContent,
      });
      setSelectedDoc(updated);
      setIsEditingDoc(false);
      onShowToast('Alterações salvas e nova versão gerada com sucesso!');
      onRefresh();
    } catch (err) {
      onShowToast('Falha ao atualizar documento.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Perform Digital Signature
  const handleExecuteSign = async () => {
    if (!selectedDoc) return;
    setIsSigning(true);
    try {
      const signedDoc = await api.signDocument(selectedDoc.id, {
        signerName,
        signerCpf,
        signerRole,
      });
      setSelectedDoc(signedDoc);
      setIsSignModalOpen(false);
      onShowToast(`Documento assinado digitalmente com sucesso! Carimbo ICP-Brasil gerado.`);
      onRefresh();
    } catch (err) {
      onShowToast('Falha ao assinar documento.');
    } finally {
      setIsSigning(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      await api.deleteDocument(docId);
      setSelectedDoc(null);
      onShowToast('Documento excluído com sucesso.');
      onRefresh();
    } catch (err) {
      onShowToast('Erro ao excluir documento.');
    }
  };

  // Print / PDF Export
  const handlePrintDocument = (doc: DocumentItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onShowToast('Permita pop-ups para imprimir o documento.');
      return;
    }

    const vi = currentTenant?.visualIdentity || {};
    const lawFirmName = currentTenant?.name || 'Gabriela Capitani Advocacia';
    const lawyerName = vi.signatoryName || 'Dra. Gabriela M. Manni Capitani';
    const lawyerOab = vi.signatoryOab || currentTenant?.oabOfficeRegister || 'OAB/SP 478.370';
    const accentColor = vi.accentColor || '#4338ca';
    const fontFamily = vi.fontFamily || 'Times New Roman';
    const logoUrl = vi.logoUrl !== undefined ? vi.logoUrl : (currentTenant?.logoUrl || '');

    // Selective visibility toggles according to user requirements
    const showHeaderOab = vi.showHeaderOab !== false; // Default true (clean OAB without "Registro:")
    const showHeaderAddress = !!vi.showHeaderAddress && !!vi.headerAddress;
    const showHeaderPhone = !!vi.showHeaderPhone && !!(vi.contactPhone || currentTenant?.contactPhone);
    const showHeaderEmail = !!vi.showHeaderEmail && !!(vi.contactEmail || currentTenant?.contactEmail);

    let headerMetaItems: string[] = [];
    if (showHeaderOab && lawyerOab) headerMetaItems.push(lawyerOab);
    if (showHeaderAddress) headerMetaItems.push(vi.headerAddress);
    if (showHeaderPhone) headerMetaItems.push(`Tel: ${vi.contactPhone || currentTenant?.contactPhone}`);
    if (showHeaderEmail) headerMetaItems.push(vi.contactEmail || currentTenant?.contactEmail);

    // Footer items (Phone, Email, Address, Custom institutional text)
    const showFooterText = vi.showFooterText !== false;
    const showFooterAddress = !!vi.showFooterAddress && !!vi.headerAddress;
    const showFooterPhone = !!vi.showFooterPhone && !!(vi.contactPhone || currentTenant?.contactPhone);
    const showFooterEmail = !!vi.showFooterEmail && !!(vi.contactEmail || currentTenant?.contactEmail);

    let footerMetaItems: string[] = [];
    if (showFooterAddress) footerMetaItems.push(vi.headerAddress);
    if (showFooterPhone) footerMetaItems.push(`Tel: ${vi.contactPhone || currentTenant?.contactPhone}`);
    if (showFooterEmail) footerMetaItems.push(vi.contactEmail || currentTenant?.contactEmail);

    const borderStyle = vi.borderStyle === 'NONE' ? 'none' : vi.borderStyle === 'DOUBLE' ? 'double' : vi.borderStyle === 'DASHED' ? 'dashed' : 'solid';
    const borderWidth = vi.borderWidth || '2px';
    const logoHeight = vi.logoMaxHeight || 44;

    // Regra forense estrita: o nome do(a) advogado(a) no corpo de petições, procurações e contratos deve SEMPRE estar em MAIÚSCULO, NEGRITO e SUBLINHADO
    const formattedDocumentBody = formatLawyerNameInBody(doc.content || '', lawyerName);

    const signatureBlock = doc.digitalSignature
      ? `
      <div style="margin-top: 40px; padding: 16px; border: 2px solid #10b981; border-radius: 8px; background: #ecfdf5; font-family: sans-serif; font-size: 12px; color: #065f46;">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">DOCUMENTO ASSINADO DIGITALMENTE</div>
        <div><strong>Signatário:</strong> ${doc.digitalSignature.signerName} (${doc.digitalSignature.signerRole})</div>
        <div><strong>CPF:</strong> ${doc.digitalSignature.signerCpf}</div>
        <div><strong>Data/Hora:</strong> ${new Date(doc.digitalSignature.signedAt).toLocaleString('pt-BR')} (Horário de Brasília)</div>
        <div><strong>Hash SHA-256:</strong> <code style="word-break: break-all; font-family: monospace;">${doc.digitalSignature.hashSha256}</code></div>
        <div><strong>Código de Verificação:</strong> ${doc.digitalSignature.verificationCode} (${doc.digitalSignature.certificateAuthority})</div>
      </div>`
      : `
      <div style="margin-top: 36px; text-align: center; font-family: ${fontFamily}, serif;">
        ${vi.signatureImageUrl ? `<img src="${vi.signatureImageUrl}" style="height: 44px; object-fit: contain; margin-bottom: 6px;" alt="Assinatura" /><br/>` : ''}
        <div style="font-weight: bold; font-size: 11pt; color: #111;">${lawyerName}</div>
        <div style="font-size: 10pt; color: #4338ca; font-family: monospace; font-weight: 600;">${lawyerOab}</div>
        <div style="font-size: 9pt; color: #666; font-family: sans-serif;">${vi.signatoryRole || 'Advogada'}</div>
        <div style="margin-top: 14px; display: inline-flex; flex-direction: column; align-items: center;">
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1.5px solid #10b981; background-color: #ecfdf5; border-radius: 8px; color: #065f46; font-family: sans-serif; font-size: 8.5pt; font-weight: bold; letter-spacing: 0.5px;">
            <span>🔒 ASSINADO DIGITALMENTE</span>
            <span style="font-weight: normal; color: #047857; font-size: 8pt;">• Certificado ICP-Brasil / Token OAB</span>
          </div>
          <div style="margin-top: 4px; font-size: 7pt; color: #9ca3af; font-family: sans-serif;">
            (Documento assinado digitalmente nos termos da Lei nº 14.063/2020 e MP 2.200-2/2001)
          </div>
        </div>
      </div>
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.title} - ${lawFirmName}</title>
          <style>
            @page { margin: 15mm 20mm; size: A4; }
            body { font-family: "${fontFamily}", Times, serif; font-size: 12pt; line-height: 1.6; color: #111; margin: 0; padding: 15px; }
            .header-banner { width: 100%; max-height: 170px; object-fit: contain; display: block; margin: 0 auto 12px auto; }
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
          ${vi.headerStyle === 'FULL_BANNER' && (vi.headerBannerUrl || logoUrl) ? `
            <div style="margin-bottom: 24px;">
              <img src="${vi.headerBannerUrl || logoUrl}" class="header-banner" alt="Cabeçalho Timbrado Oficial" />
              ${headerMetaItems.length > 0 ? `<p class="header-meta" style="text-align: center; margin-top: -6px; margin-bottom: 20px; font-size: 8.5pt; color: #555;">${headerMetaItems.join(' • ')}</p>` : ''}
            </div>
          ` : `
            <div class="header-container">
              <div class="header-content">
                ${logoUrl ? `<img src="${logoUrl}" class="header-logo" alt="Logo" />` : ''}
                <h1 class="header-title">${lawFirmName}</h1>
                ${headerMetaItems.length > 0 ? `<p class="header-meta">${headerMetaItems.join(' • ')}</p>` : ''}
              </div>
            </div>
          `}
          <div class="content">${formattedDocumentBody}</div>
          ${signatureBlock}
          ${showFooterText ? `
            <div class="footer">
              <div style="font-weight: 500;">${vi.footerText || `${lawFirmName} • Documento emitido eletronicamente`}</div>
              ${footerMetaItems.length > 0 ? `<div style="margin-top: 4px; font-size: 7.5pt; color: #777;">${footerMetaItems.join(' • ')}</div>` : ''}
            </div>
          ` : ''}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast('Conteúdo copiado para a área de transferência!');
  };

  return (
    <div id="documents-view" className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documentos & Minutas Jurídicas</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredDocs.length} {filteredDocs.length === 1 ? 'documento' : 'documentos'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Repositório institucional de peças processuais, modelos parametrizados, assinatura eletrônica ICP-Brasil e gerador IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="docs-btn-ai-draft"
            onClick={() => onOpenAiGateway('draft')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Redigir com IA</span>
          </button>

          <button
            id="docs-btn-new-doc"
            onClick={handleOpenNewDocModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Documento</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total de Documentos</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.total}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-emerald-600">Assinados & Aprovados</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{metrics.signed}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-amber-600">Em Revisão Técnica</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{metrics.underReview}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Minutas / Rascunhos</span>
          <div className="text-xl font-bold text-slate-700 mt-1">{metrics.drafts}</div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="docs-tab-repository"
              onClick={() => setActiveTab('DOCUMENTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'DOCUMENTS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Peças & Documentos ({documents.length})</span>
            </button>

            <button
              id="docs-tab-templates"
              onClick={() => setActiveTab('TEMPLATES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'TEMPLATES'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modelos & Contratos ({templates.length})</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-1 md:max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="docs-input-search"
                type="text"
                placeholder="Buscar por título, processo, cliente ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {activeTab === 'DOCUMENTS' && (
              <>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Todas Categorias</option>
                  {Object.entries(CATEGORY_STYLES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Todos Status</option>
                  <option value="DRAFT">Rascunho</option>
                  <option value="UNDER_REVIEW">Em Revisão</option>
                  <option value="APPROVED">Assinado / Aprovado</option>
                  <option value="FILED">Protocolado</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: DOCUMENTS REPOSITORY */}
      {activeTab === 'DOCUMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">Nenhum documento encontrado</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Crie um novo documento manual, preencha um modelo inteligente ou use a IA para redigir peças processuais.
              </p>
              <button
                onClick={handleOpenNewDocModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                Criar Primeiro Documento
              </button>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const cat = CATEGORY_STYLES[doc.category] || CATEGORY_STYLES.OUTRO;
              const statusInfo = STATUS_MAP[doc.status] || STATUS_MAP.DRAFT;
              const hasSignature = !!doc.digitalSignature;

              return (
                <motion.div
                  key={doc.id}
                  layout
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedDoc(doc)}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}>
                        {cat.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hasSignature && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                            title="Assinado digitalmente com certificado ICP-Brasil"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            ICP-Brasil
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {doc.title}
                      </h3>
                      {doc.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.description}</p>
                      )}
                    </div>

                    {/* Case or Person Association */}
                    {(doc.caseNumber || doc.personName) && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-xs space-y-1">
                        {doc.caseNumber && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                            <Scale className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{doc.caseNumber}</span>
                          </div>
                        )}
                        {doc.personName && (
                          <div className="flex items-center gap-1.5 text-slate-600 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.personName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[120px]">{doc.createdBy}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span>v{doc.currentVersion}.0</span>
                      <span>•</span>
                      <span>{doc.createdAt.slice(0, 10).split('-').reverse().join('/')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES ENGINE */}
      {activeTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const cat = CATEGORY_STYLES[tpl.category] || CATEGORY_STYLES.OUTRO;
            const varsCount = (tpl.variables || tpl.placeholders || []).length;

            return (
              <div
                key={tpl.id}
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all space-y-4 flex flex-col justify-between shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}>
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {varsCount} variáveis
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{tpl.title || tpl.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{tpl.description}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(tpl.variables || tpl.placeholders || []).slice(0, 4).map((v) => (
                      <span
                        key={v}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 font-mono border border-slate-200"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {varsCount > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                        +{varsCount - 4} mais
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenRenderTemplate(tpl)}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Preencher & Gerar Minuta</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: NEW MANUAL DOCUMENT */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Novo Documento Jurídico</h2>
              </div>
              <button onClick={() => setIsNewDocModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDoc} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Petição Inicial - Ação de Cobrança"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(CATEGORY_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processo Vinculado</label>
                  <select
                    value={newCaseId}
                    onChange={(e) => setNewCaseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Nenhum processo vinculado</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cnjNumber} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente / Pessoa Vinculada</label>
                  <select
                    value={newPersonId}
                    onChange={(e) => setNewPersonId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Nenhum cliente vinculado</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.cpfCnpj})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Finalidade</label>
                <input
                  type="text"
                  placeholder="Ex: Minuta elaborada para protocolo perante a 2ª Vara Cível"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Conteúdo do Documento (Texto Integral)</label>
                  <span className="text-[11px] text-slate-500 font-mono">Formatado em padrão forense</span>
                </div>
                <textarea
                  rows={12}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-serif leading-relaxed text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                >
                  {isSubmittingNew ? 'Salvando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TEMPLATE DYNAMIC GENERATOR */}
      {isRenderModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Gerador Dinâmico: {selectedTemplate.title || selectedTemplate.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Substituição parametrizada em tempo real com auto-preenchimento de processo e cliente.
                </p>
              </div>
              <button onClick={() => setIsRenderModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Variable Inputs */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Variáveis do Instrumento</h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {(selectedTemplate.variables || selectedTemplate.placeholders || []).map((v) => (
                    <div key={v}>
                      <label className="block text-[11px] font-mono text-slate-600 mb-1">{`{{${v}}}`}</label>
                      <input
                        type="text"
                        value={templateVars[v] || ''}
                        onChange={(e) => handleVariableChange(v, e.target.value)}
                        placeholder={`Preencher ${v}...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Real-time Live Document Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pré-visualização da Peça</h3>
                  <button
                    onClick={() => copyToClipboard(renderedContent)}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-text shadow-2xs"
                  dangerouslySetInnerHTML={{
                    __html: formatLawyerNameInBody(renderedContent, currentLawyerName)
                  }}
                />
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
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs"
              >
                Salvar no Repositório do Escritório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DIGITAL SIGNATURE CONFIRMATION */}
      {isSignModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Assinatura Digital ICP-Brasil</h2>
              </div>
              <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ao assinar digitalmente, será gerado um carimbo criptográfico SHA-256 com registro de data/hora oficial e código de autenticidade (MP 2.200-2/2001).
            </p>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome do Signatário</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">CPF do Signatário</label>
                <input
                  type="text"
                  value={signerCpf}
                  onChange={(e) => setSignerCpf(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Qualificação / OAB</label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteSign}
                disabled={isSigning}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSigning ? 'Assinando...' : 'Confirmar & Assinar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: DOCUMENT VIEWER / EDITOR / SIGNER */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-100">
                      {selectedDoc.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                      v{selectedDoc.currentVersion}.0
                    </span>
                    {selectedDoc.digitalSignature && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Assinado ICP-Brasil
                      </span>
                    )}
                  </div>
                  {isEditingDoc ? (
                    <input
                      type="text"
                      value={editDocTitle}
                      onChange={(e) => setEditDocTitle(e.target.value)}
                      className="text-base font-bold text-slate-900 mt-2 w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  ) : (
                    <h2 className="text-base font-bold text-slate-900 mt-1">{selectedDoc.title}</h2>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintDocument(selectedDoc)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors"
                    title="Imprimir / Exportar em PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(selectedDoc.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setSelectedDoc(null); setIsEditingDoc(false); }} className="text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Associations info */}
              {(selectedDoc.caseNumber || selectedDoc.personName) && (
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  {selectedDoc.caseNumber && (
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      <span>Processo: {selectedDoc.caseNumber}</span>
                    </div>
                  )}
                  {selectedDoc.personName && (
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>Cliente: {selectedDoc.personName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Digital Signature Card if present */}
              {selectedDoc.digitalSignature && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-1.5 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Certificado de Assinatura Digital ICP-Brasil</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <strong>Signatário:</strong> {selectedDoc.digitalSignature.signerName} ({selectedDoc.digitalSignature.signerRole})
                    </div>
                    <div>
                      <strong>CPF:</strong> {selectedDoc.digitalSignature.signerCpf}
                    </div>
                    <div>
                      <strong>Data/Hora:</strong> {new Date(selectedDoc.digitalSignature.signedAt).toLocaleString('pt-BR')}
                    </div>
                    <div>
                      <strong>Código de Verificação:</strong> {selectedDoc.digitalSignature.verificationCode}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-700 truncate pt-1 border-t border-emerald-200">
                    Hash SHA-256: {selectedDoc.digitalSignature.hashSha256}
                  </div>
                </div>
              )}

              {/* Document Content View / Editor */}
              {isEditingDoc ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Editor de Minuta</label>
                  <textarea
                    rows={18}
                    value={editDocContent}
                    onChange={(e) => setEditDocContent(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-serif leading-relaxed text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>
              ) : (
                <div
                  className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed whitespace-pre-wrap max-h-[55vh] overflow-y-auto select-text shadow-2xs"
                  dangerouslySetInnerHTML={{
                    __html: formatLawyerNameInBody(selectedDoc.content || 'Nenhum conteúdo salvo neste documento.', currentLawyerName)
                  }}
                />
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                <span>Criado por: {selectedDoc.createdBy}</span>
              </div>

              <div className="flex items-center gap-2">
                {isEditingDoc ? (
                  <>
                    <button
                      onClick={() => setIsEditingDoc(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEditDoc}
                      disabled={isSavingEdit}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => copyToClipboard(selectedDoc.content)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>

                    <button
                      onClick={handleStartEditDoc}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    {!selectedDoc.digitalSignature && (
                      <button
                        onClick={() => setIsSignModalOpen(true)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Assinar Digitalmente</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
