import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  BookOpen,
  History,
  ShieldCheck,
  Building,
  Sparkles,
  Lock,
  Wifi,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import {
  Case,
  User as AppUser,
  Role,
  LawyerDigitalCertificateInfo,
  PrecedentFavoriteItem,
  CourtAvailabilityMatrixItem,
} from '../../types';
import { api } from '../../services/api';
import { ProcessConsultationTab } from './ProcessConsultationTab';
import { JurisprudenceSearchTab } from './JurisprudenceSearchTab';
import { SearchHistoryTab } from './SearchHistoryTab';
import { CourtStatusBanner } from './CourtStatusBanner';
import { DigitalCertificateModal } from './DigitalCertificateModal';

interface LegalSearchViewProps {
  cases: Case[];
  currentUser?: AppUser | null;
  currentRole?: Role | null;
  onRefreshCases?: () => Promise<void>;
  onOpenAiGateway?: (tab: string, context?: string) => void;
  onShowToast: (msg: string) => void;
}

export const LegalSearchView: React.FC<LegalSearchViewProps> = ({
  cases = [],
  currentUser,
  currentRole,
  onRefreshCases,
  onOpenAiGateway,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'PROCESS' | 'JURISPRUDENCE' | 'HISTORY'>('PROCESS');
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState<LawyerDigitalCertificateInfo | null>(null);

  // Favorites & Court Status
  const [favorites, setFavorites] = useState<PrecedentFavoriteItem[]>([]);
  const [courtAvailability, setCourtAvailability] = useState<CourtAvailabilityMatrixItem[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [favs, courts] = await Promise.all([
        api.getPrecedentFavorites().catch(() => []),
        api.getCourtAvailabilityMatrix().catch(() => []),
      ]);
      setFavorites(favs || []);
      setCourtAvailability(courts || []);
    } catch (err) {
      console.warn('Erro ao carregar dados iniciais de pesquisa jurídica:', err);
    }
  };

  const handleRefreshAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const courts = await api.getCourtAvailabilityMatrix();
      setCourtAvailability(courts || []);
      onShowToast('Barramento dos tribunais verificado com sucesso.');
    } catch (err: any) {
      onShowToast(`Erro ao testar barramento: ${err.message}`);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleToggleFavorite = async (item: any) => {
    try {
      const res = await api.togglePrecedentFavorite({
        decisionId: item.decisionId || item.id,
        courtCode: item.courtCode,
        citation: item.citation || `${item.courtCode} - ${item.caseNumber || item.id}`,
        headnote: item.headnote,
        thesis: item.thesis,
        officialUrl: item.officialUrl,
      });

      if (res.favorited) {
        onShowToast('Precedente adicionado aos seus favoritos.');
      } else {
        onShowToast('Precedente removido dos seus favoritos.');
      }

      // Reload favorites list
      const favs = await api.getPrecedentFavorites();
      setFavorites(favs || []);
    } catch (err: any) {
      onShowToast(`Erro ao atualizar favorito: ${err.message}`);
    }
  };

  const handleCaseImported = async (newCase: Case) => {
    if (onRefreshCases) {
      await onRefreshCases();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Scale className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Pesquisa Jurídica & Tribunais
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 font-mono">
              v1.3 DataJud
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Consulta processual unificada pelo CNJ, jurisprudência oficial dos Tribunais Superiores e autenticação criptográfica segura com certificado digital ICP-Brasil.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeCertificate ? (
            <button
              type="button"
              onClick={() => setIsCertificateModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Certificado {activeCertificate.type} ({activeCertificate.oabRegistry || activeCertificate.subjectName.split(' ')[0]})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCertificateModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Autenticar Certificado A1/A3</span>
            </button>
          )}

          {onOpenAiGateway && (
            <button
              type="button"
              onClick={() => onOpenAiGateway('extract')}
              className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Gateway Jurídico</span>
            </button>
          )}
        </div>
      </div>

      {/* Tribunal Connectivity Status */}
      <CourtStatusBanner
        courts={courtAvailability}
        loading={loadingAvailability}
        onRefresh={handleRefreshAvailability}
      />

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('PROCESS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'PROCESS'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Consulta Processual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('JURISPRUDENCE')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'JURISPRUDENCE'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Jurisprudência & Precedentes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico & Salvos ({favorites.length})</span>
        </button>
      </div>

      {/* Active Tab View Content */}
      {activeTab === 'PROCESS' && (
        <ProcessConsultationTab
          existingCases={cases}
          activeCertificate={activeCertificate}
          onOpenCertificateModal={() => setIsCertificateModalOpen(true)}
          onOpenAiGateway={onOpenAiGateway}
          onCaseImported={handleCaseImported}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'JURISPRUDENCE' && (
        <JurisprudenceSearchTab
          existingCases={cases}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onOpenAiGateway={onOpenAiGateway}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'HISTORY' && (
        <SearchHistoryTab
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onShowToast={onShowToast}
        />
      )}

      {/* Digital Certificate ICP-Brasil Modal */}
      <DigitalCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        activeCertificate={activeCertificate}
        onCertificateLoaded={(cert) => {
          setActiveCertificate(cert);
          setIsCertificateModalOpen(false);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
