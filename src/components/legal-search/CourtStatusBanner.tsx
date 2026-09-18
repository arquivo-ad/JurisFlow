import React from 'react';
import { ShieldCheck, Activity, Wifi, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { CourtAvailabilityMatrixItem } from '../../types';

interface CourtStatusBannerProps {
  courts: CourtAvailabilityMatrixItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const CourtStatusBanner: React.FC<CourtStatusBannerProps> = ({
  courts = [],
  loading = false,
  onRefresh,
}) => {
  const onlineCount = courts.filter((c) => c.status === 'ONLINE').length;
  const totalCount = courts.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Conectividade & Tribunais Oficiais</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                {onlineCount}/{totalCount} Nós Operacionais
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Barramento DataJud (Res. CNJ 331/2020) e nós interoperáveis dos Tribunais Superiores
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="self-start sm:self-center text-xs text-slate-600 hover:text-sky-600 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 hover:border-sky-200 transition-colors disabled:opacity-50"
          >
            <Wifi className={`w-3.5 h-3.5 ${loading ? 'animate-pulse text-sky-500' : ''}`} />
            <span>{loading ? 'Verificando...' : 'Testar Barramento'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {courts.map((court) => (
          <div
            key={court.courtCode}
            className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">{court.courtCode}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  court.status === 'ONLINE'
                    ? 'bg-emerald-500 ring-2 ring-emerald-100'
                    : court.status === 'DEGRADED'
                    ? 'bg-amber-500 ring-2 ring-amber-100'
                    : 'bg-rose-500 ring-2 ring-rose-100'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-500 truncate" title={court.courtName}>
              {court.courtName}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {court.latencyMs}ms
              </span>
              <span className="font-mono text-emerald-600 font-medium">99.8%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
