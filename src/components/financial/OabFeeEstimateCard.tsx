import React, { useState } from 'react';
import {
  Sparkles,
  Scale,
  TrendingUp,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Loader2,
  ChevronDown,
  Info,
} from 'lucide-react';
import { OABFeeEstimateResponse } from '../../types';
import { api } from '../../services/api';

interface OabFeeEstimateCardProps {
  contractTitle: string;
  clientId: string;
  caseId?: string;
  feeType: string;
  initialUf?: string;
  onApplyValue: (val: number, catName?: string, oabData?: OABFeeEstimateResponse) => void;
  onShowToast?: (msg: string) => void;
}

const BRAZILIAN_STATES = [
  'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES',
  'MT', 'MS', 'PA', 'AM', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA', 'RO', 'TO', 'AC', 'AP', 'RR',
];

export const OabFeeEstimateCard: React.FC<OabFeeEstimateCardProps> = ({
  contractTitle,
  clientId,
  caseId,
  feeType,
  initialUf = 'SP',
  onApplyValue,
  onShowToast,
}) => {
  const [selectedUf, setSelectedUf] = useState(initialUf);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<OABFeeEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConsultOab = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.estimateOabFee({
        contractTitle: contractTitle || 'Ação Cível Ordinária',
        clientId,
        caseId,
        feeType,
        uf: selectedUf,
      });
      setEstimate(res);
      onShowToast?.(`Tabela de Honorários OAB/${selectedUf} consultada com sucesso!`);
    } catch (err) {
      console.error('Erro ao consultar tabela OAB:', err);
      setError('Não foi possível consultar a tabela da OAB no momento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-sky-50/50 border border-indigo-200/80 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-xs">
                Apoio de Valor — Tabela Oficial OAB
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> IA
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Consulta os pisos éticos e referências oficiais da Seccional da OAB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 text-[11px] font-medium">Estado:</span>
            <select
              value={selectedUf}
              onChange={(e) => setSelectedUf(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden text-xs cursor-pointer"
            >
              {BRAZILIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  OAB/{st}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            id="btn-consult-oab-fee"
            onClick={handleConsultOab}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Consultando OAB...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Consultar OAB/{selectedUf}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {estimate && (
        <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2.5 shadow-2xs">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-700 font-semibold">
                {estimate.oabSectional} — {estimate.tableReference}
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                {estimate.categoryDetermined}
              </h4>
            </div>
            {estimate.successPercentageUsual > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Êxito Usual: {estimate.successPercentageUsual}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            {/* Piso Ético OAB */}
            <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] text-amber-800 font-medium block">
                Piso Ético Mínimo
              </span>
              <span className="font-mono font-bold text-amber-950 text-sm block mt-0.5">
                R$ {estimate.minFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={() => onApplyValue(estimate.minFee, estimate.categoryDetermined, estimate)}
                className="mt-1.5 w-full py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] transition-colors"
              >
                Aplicar Piso Mínimo
              </button>
            </div>

            {/* Valor Médio Sugerido */}
            <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-medium block">
                Média Recomendada
              </span>
              <span className="font-mono font-bold text-emerald-950 text-sm block mt-0.5">
                R$ {estimate.recommendedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={() => onApplyValue(estimate.recommendedFee, estimate.categoryDetermined, estimate)}
                className="mt-1.5 w-full py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] transition-colors"
              >
                Aplicar Sugerido
              </button>
            </div>

            {/* Teto / Mercado */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 font-medium block">
                Teto de Mercado
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm block mt-0.5">
                R$ {estimate.maxFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={() => onApplyValue(estimate.maxFee, estimate.categoryDetermined, estimate)}
                className="mt-1.5 w-full py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[10px] transition-colors"
              >
                Aplicar Teto
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
            {estimate.justification}
          </p>
        </div>
      )}
    </div>
  );
};
