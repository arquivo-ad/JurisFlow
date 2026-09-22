import React, { useState } from 'react';
import {
  Search,
  Scale,
  Building2,
  User,
  Users,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Lock,
  FileCheck,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { JudicialProcessSearchResult, Case, LawyerDigitalCertificateInfo } from '../../types';
import { api } from '../../services/api';

interface ProcessConsultationTabProps {
  existingCases: Case[];
  activeCertificate: LawyerDigitalCertificateInfo | null;
  onOpenCertificateModal: () => void;
  onOpenAiGateway?: (tab: string, context?: string) => void;
  onCaseImported?: (newCase: Case) => void;
  onShowToast: (msg: string) => void;
}

export const ProcessConsultationTab: React.FC<ProcessConsultationTabProps> = ({
  existingCases = [],
  activeCertificate,
  onOpenCertificateModal,
  onOpenAiGateway,
  onCaseImported,
  onShowToast,
}) => {
  const [searchType, setSearchType] = useState<'CNJ' | 'LAWYER_OAB' | 'PARTY_NAME'>('CNJ');
  const [cnjNumber, setCnjNumber] = useState('');
  const [courtCode, setCourtCode] = useState('TJSP');
  const [lawyerOab, setLawyerOab] = useState('');
  const [partyName, setPartyName] = useState('');

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchResult, setSearchResult] = useState<JudicialProcessSearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedMovements, setExpandedMovements] = useState(false);
  const [movementFilter, setMovementFilter] = useState('');
  const [movementSortOrder, setMovementSortOrder] = useState<'desc' | 'asc'>('desc');

  // Formatter for CNJ input
  const handleCnjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 20);
    let formatted = raw;
    if (raw.length > 7) formatted = `${raw.slice(0, 7)}-${raw.slice(7)}`;
    if (raw.length > 9) formatted = `${formatted.slice(0, 10)}.${raw.slice(9)}`;
    if (raw.length > 13) formatted = `${formatted.slice(0, 15)}.${raw.slice(13)}`;
    if (raw.length > 14) formatted = `${formatted.slice(0, 17)}.${raw.slice(14)}`;
    if (raw.length > 16) formatted = `${formatted.slice(0, 20)}.${raw.slice(16, 20)}`;
    setCnjNumber(formatted);
  };

  const handleSearch = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (searchType === 'CNJ' && !cnjNumber.trim()) {
      setErrorMsg('Por favor, informe o número do processo (padrão CNJ).');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await api.searchProcess({
        searchType,
        cnjNumber: searchType === 'CNJ' ? cnjNumber : undefined,
        courtCode: courtCode || undefined,
        lawyerOab: searchType === 'LAWYER_OAB' ? lawyerOab : undefined,
        partyName: searchType === 'PARTY_NAME' ? partyName : undefined,
      });

      if (res.success && res.result) {
        const rawClass = res.result.processClass;
        const normalizedClass = typeof rawClass === 'object' && rawClass
          ? ((rawClass as any).name || 'Não informado')
          : String(rawClass || 'Não informado');

        setSearchResult({
          ...res.result,
          processClass: normalizedClass,
          parties: res.result.parties || [],
          lawyers: res.result.lawyers || [],
          subjects: res.result.subjects || [],
          documents: res.result.documents || [],
          movements: res.result.movements || [],
        });
      } else {
        setSearchResult(null);
        setErrorMsg('Nenhum processo localizado para os parâmetros informados no barramento dos tribunais.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao consultar barramento do tribunal.');
    } finally {
      setLoading(false);
    }
  };

  // Check if current search result matches an already imported Case in JurisFlow
  const matchedExistingCase = searchResult
    ? existingCases.find(
        (c) =>
          c.caseNumber.replace(/\D/g, '') === searchResult.normalizedCnjNumber.replace(/\D/g, '')
      )
    : null;

  const handleImportToJurisFlow = async () => {
    if (!searchResult) return;
    setImporting(true);

    try {
      const res = await api.importProcessToJurisFlow(searchResult);
      if (res.success && res.case) {
        onShowToast(`Processo ${res.case.caseNumber} importado com sucesso para o JurisFlow.`);
        if (onCaseImported) {
          onCaseImported(res.case);
        }
      }
    } catch (err: any) {
      onShowToast(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSyncUpdates = async () => {
    if (!matchedExistingCase) return;
    setSyncing(true);

    try {
      const res = await api.syncProcessUpdates(matchedExistingCase.id, matchedExistingCase.caseNumber);
      if (res.success) {
        onShowToast(`Consulta oficial concluída para este processo: ${res.newMovementsAdded} movimentações novas confirmadas na fonte.`);
      }
    } catch (err: any) {
      onShowToast(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-sky-600" />
              Consulta Processual Unificada
            </h3>
            <p className="text-xs text-slate-500">
              Consulta pública por número CNJ via DataJud; sem completar dados ausentes por suposição
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeCertificate ? (
              <button
                type="button"
                onClick={onOpenCertificateModal}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
                title="Certificado ativo"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Certificado {activeCertificate.type} Ativo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCertificateModal}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Certificado: indisponível</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSearchType('CNJ')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              searchType === 'CNJ'
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Número Único CNJ
          </button>
          <button
            type="button"
            disabled
            title="Conector oficial ainda não implementado"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              searchType === 'LAWYER_OAB'
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            Por Advogado (em desenvolvimento)
          </button>
          <button
            type="button"
            disabled
            title="Conector oficial ainda não implementado"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              searchType === 'PARTY_NAME'
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            Por Nome (em desenvolvimento)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {searchType === 'CNJ' && (
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Processo (Padrão CNJ)
              </label>
              <input
                type="text"
                value={cnjNumber}
                onChange={handleCnjChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>
          )}

          {searchType === 'LAWYER_OAB' && (
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número OAB e UF do Advogado
              </label>
              <input
                type="text"
                value={lawyerOab}
                onChange={(e) => setLawyerOab(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Ex.: 123456/SP"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>
          )}

          {searchType === 'PARTY_NAME' && (
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Parte (Autor ou Réu)
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Ex.: Banco do Brasil S.A. ou Maria da Silva"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>
          )}

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tribunal / Jurisdição
            </label>
            <select
              value={courtCode}
              onChange={(e) => setCourtCode(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
            >
              <option value="AUTO">Auto-detectar pelo CNJ</option>
              <optgroup label="Tribunais Superiores">
                <option value="STF">STF - Supremo Tribunal Federal</option>
                <option value="STJ">STJ - Superior Tribunal de Justiça</option>
                <option value="TST">TST - Tribunal Superior do Trabalho</option>
              </optgroup>
              <optgroup label="Justiça Federal (TRFs)">
                <option value="TRF1">TRF-1 - Federal 1ª Região (DF, GO, TO, MT, BA, etc.)</option>
                <option value="TRF2">TRF-2 - Federal 2ª Região (RJ, ES)</option>
                <option value="TRF3">TRF-3 - Federal 3ª Região (SP, MS)</option>
                <option value="TRF4">TRF-4 - Federal 4ª Região (RS, SC, PR)</option>
                <option value="TRF5">TRF-5 - Federal 5ª Região (PE, CE, AL, PB, RN, SE)</option>
                <option value="TRF6">TRF-6 - Federal 6ª Região (MG)</option>
              </optgroup>
              <optgroup label="Justiça Estadual (TJs)">
                <option value="TJSP">TJSP - Tribunal de Justiça de São Paulo</option>
                <option value="TJRJ">TJRJ - Tribunal de Justiça do Rio de Janeiro</option>
                <option value="TJMG">TJMG - Tribunal de Justiça de Minas Gerais</option>
                <option value="TJRS">TJRS - Tribunal de Justiça do Rio Grande do Sul</option>
                <option value="TJPR">TJPR - Tribunal de Justiça do Paraná</option>
                <option value="TJSC">TJSC - Tribunal de Justiça de Santa Catarina</option>
                <option value="TJBA">TJBA - Tribunal de Justiça da Bahia</option>
                <option value="TJCE">TJCE - Tribunal de Justiça do Ceará</option>
                <option value="TJPE">TJPE - Tribunal de Justiça de Pernambuco</option>
                <option value="TJDFT">TJDFT - Tribunal de Justiça do Distrito Federal</option>
                <option value="TJES">TJES - Tribunal de Justiça do Espírito Santo</option>
                <option value="TJGO">TJGO - Tribunal de Justiça de Goiás</option>
                <option value="TJMA">TJMA - Tribunal de Justiça do Maranhão</option>
                <option value="TJPA">TJPA - Tribunal de Justiça do Pará</option>
                <option value="TJPI">TJPI - Tribunal de Justiça do Piauí</option>
                <option value="TJRN">TJRN - Tribunal de Justiça do Rio Grande do Norte</option>
                <option value="TJRO">TJRO - Tribunal de Justiça de Rondônia</option>
                <option value="TJRR">TJRR - Tribunal de Justiça de Roraima</option>
                <option value="TJSE">TJSE - Tribunal de Justiça de Sergipe</option>
                <option value="TJTO">TJTO - Tribunal de Justiça do Tocantins</option>
              </optgroup>
              <optgroup label="Justiça do Trabalho (TRTs)">
                <option value="TRT2">TRT-2 - Região 2 (São Paulo e Litoral)</option>
                <option value="TRT15">TRT-15 - Região 15 (Campinas e Interior SP)</option>
              </optgroup>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Result Display */}
      {searchResult && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header Bar */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold font-mono text-slate-900">
                  {searchResult.normalizedCnjNumber}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {searchResult.courtCode}
                </span>
                {searchResult.judicialDegree && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {searchResult.judicialDegree === 'G1' ? '1º Grau (G1)' : searchResult.judicialDegree === 'G2' ? '2º Grau (G2)' : searchResult.judicialDegree}
                  </span>
                )}
                {searchResult.systemName && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Sistema: {searchResult.systemName}
                  </span>
                )}
                {searchResult.formatName && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    Formato: {searchResult.formatName}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {searchResult.processClass}
                </span>
                {searchResult.isConfidential && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Segredo de Justiça
                  </span>
                )}
                {matchedExistingCase && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Cadastrado no JurisFlow
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Oficial DataJud / CNJ
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {searchResult.courtOrgan}
                {searchResult.courtOrganMunicipality ? ` • ${searchResult.courtOrganMunicipality}` : ''}
                {searchResult.courtOrganCode ? ` (Cód. ${searchResult.courtOrganCode})` : ''}
                {searchResult.distributionDate ? ` • Distribuído em ${searchResult.distributionDate}` : ''}
                {' • '}Fonte: {searchResult.sourceProvider}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {matchedExistingCase ? (
                <button
                  type="button"
                  onClick={handleSyncUpdates}
                  disabled={syncing}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizar Atualizações'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Bloqueado até existir importação sem dados presumidos"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-200 text-slate-500 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Importação segura em desenvolvimento
                    </>
                  )}
                </button>
              )}

              {onOpenAiGateway && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenAiGateway(
                      'extract',
                      `Processo ${searchResult.normalizedCnjNumber} (${searchResult.courtCode}) - ${searchResult.courtOrgan}. Classe: ${searchResult.processClass}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Análise AI</span>
                </button>
              )}

              {searchResult.sourceUrl && (
                <a
                  href={searchResult.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Acessar no Portal do Tribunal"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Process Metadata Grid */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 border-b border-slate-100 bg-white text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Magistrado / Relator:</span>
              <span className="font-semibold text-slate-800">{searchResult.judgeName || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Valor da Causa:</span>
              <span className="font-semibold text-emerald-700 font-mono">
                {searchResult.claimValue && !isNaN(Number(searchResult.claimValue))
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Number(searchResult.claimValue)
                    )
                  : 'Não atribuído'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Grau & Sistema:</span>
              <span className="font-medium text-slate-800">
                {searchResult.judicialDegree === 'G1' ? '1º Grau (G1)' : searchResult.judicialDegree || 'G1'}
                {searchResult.systemName ? ` • ${searchResult.systemName}` : ''}
                {searchResult.formatName ? ` (${searchResult.formatName})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Assuntos CNJ:</span>
              <span className="font-medium text-slate-800 truncate block" title={(searchResult.subjects || []).map((s) => s.name).join(', ')}>
                {(searchResult.subjects || []).map((s) => s.name).join(', ') || 'Geral'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Última Atualização no Tribunal:</span>
              <span className="font-medium text-slate-800">
                {searchResult.lastUpdateDate || (searchResult.retrievedAt && !isNaN(new Date(searchResult.retrievedAt).getTime())
                  ? new Date(searchResult.retrievedAt).toLocaleString('pt-BR')
                  : 'Recentemente')}
              </span>
            </div>
          </div>

          {/* Two-Column Parties & Documents */}
          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 border-b border-slate-100">
            {/* Parties */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Partes do Processo ({(searchResult.parties || []).length})
              </h4>
              <div className="space-y-2">
                {(searchResult.parties || []).length === 0 ? (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-slate-500" />
                      Partes restritas pelo Tribunal (LGPD)
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      O tribunal ({searchResult.courtCode}) preserva os dados das partes na consulta pública da API DataJud para cumprimento de normas de privacidade (LGPD). Todos os metadados do processo e as {searchResult.movements?.length || 0} movimentações oficiais estão 100% disponíveis abaixo.
                    </p>
                  </div>
                ) : (
                  (searchResult.parties || []).map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.role === 'AUTOR'
                                ? 'bg-sky-100 text-sky-800'
                                : p.role === 'REU'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {p.role}
                          </span>
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </div>
                        {p.document && (
                          <p className="text-[11px] font-mono text-slate-500">Doc: {p.document}</p>
                        )}
                        {p.lawyer && (
                          <p className="text-[11px] text-slate-600">
                            Advogado: <span className="font-medium">{p.lawyer}</span> ({p.lawyerOab || 'OAB'})
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Public Documents */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Documentos Públicos Integrados ({(searchResult.documents || []).length})
              </h4>
              <div className="space-y-2">
                {(searchResult.documents || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum documento disponível publicamente.</p>
                ) : (
                  (searchResult.documents || []).map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{doc.date}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]" title={doc.sha256}>
                            SHA-256: {doc.sha256.substring(0, 16)}...
                          </span>
                        </div>
                      </div>
                      {doc.downloadUrl && (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-white text-slate-600 hover:text-sky-600 transition-colors flex-shrink-0"
                          title="Baixar cópia canônica do tribunal"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Movements Timeline */}
          {(() => {
            const allMovements = searchResult.movements || [];
            const orderedMovements = movementSortOrder === 'desc'
              ? [...allMovements].reverse()
              : [...allMovements];

            const filteredMovements = orderedMovements.filter((m) => {
              if (!movementFilter.trim()) return true;
              const term = movementFilter.toLowerCase();
              return (
                (m.title || '').toLowerCase().includes(term) ||
                (m.content || '').toLowerCase().includes(term) ||
                (m.complement || '').toLowerCase().includes(term) ||
                String(m.code || '').includes(term) ||
                (m.date || '').toLowerCase().includes(term)
              );
            });

            const displayLimit = expandedMovements || movementFilter.trim().length > 0
              ? filteredMovements.length
              : 10;
            const visibleMovements = filteredMovements.slice(0, displayLimit);

            return (
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Linha do Tempo de Movimentações ({allMovements.length})
                    </h4>
                    {movementFilter.trim().length > 0 && (
                      <span className="text-[10px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-semibold">
                        {filteredMovements.length} filtrados
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search filter */}
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={movementFilter}
                        onChange={(e) => setMovementFilter(e.target.value)}
                        placeholder="Filtrar movimentações..."
                        className="w-full pl-8 pr-7 py-1 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                      />
                      {movementFilter && (
                        <button
                          type="button"
                          onClick={() => setMovementFilter('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          title="Limpar filtro"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Sort toggle */}
                    <button
                      type="button"
                      onClick={() => setMovementSortOrder(movementSortOrder === 'desc' ? 'asc' : 'desc')}
                      className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                      title={movementSortOrder === 'desc' ? 'Clique para ver mais antigas primeiro' : 'Clique para ver mais recentes primeiro'}
                    >
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      <span>{movementSortOrder === 'desc' ? 'Mais recentes' : 'Mais antigas'}</span>
                    </button>

                    {/* Expand/Collapse toggle */}
                    {filteredMovements.length > 10 && !movementFilter.trim() && (
                      <button
                        type="button"
                        onClick={() => setExpandedMovements(!expandedMovements)}
                        className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 ml-1"
                      >
                        {expandedMovements ? (
                          <>
                            <span>Recolher (mostrar 10)</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Ver todas ({filteredMovements.length})</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {visibleMovements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Nenhuma movimentação encontrada com o filtro informado.</p>
                ) : (
                  <div className="relative pl-6 space-y-3.5 border-l-2 border-slate-100">
                    {visibleMovements.map((mov, idx) => (
                      <div key={mov.id || idx} className="relative group">
                        <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-white" />
                        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/40 group-hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">{mov.title}</span>
                              {mov.code && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200/80 text-slate-700 font-medium">
                                  CNJ #{mov.code}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">{mov.date}</span>
                          </div>

                          {mov.complement && (
                            <div className="mt-1 text-xs text-sky-800 bg-sky-50/80 border border-sky-100 px-2 py-0.5 rounded inline-block font-medium">
                              <span className="font-bold text-sky-950">Complemento: </span>{mov.complement}
                            </div>
                          )}

                          {mov.content && mov.content !== mov.title && mov.content !== `${mov.title} - ${mov.complement}` && (
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mt-1">
                              {mov.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
