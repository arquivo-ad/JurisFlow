import React from 'react';
import { Activity, Clock, Wifi } from 'lucide-react';
import { CourtAvailabilityMatrixItem } from '../../types';

interface CourtStatusBannerProps {
  courts: CourtAvailabilityMatrixItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const CourtStatusBanner: React.FC<CourtStatusBannerProps> = ({ courts = [], loading = false, onRefresh }) => {
  const readyCount = courts.filter((court) => court.status === 'READY').length;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Estado real dos conectores oficiais</h3>
            <p className="text-xs text-slate-500">{readyCount}/{courts.length} configurados; disponibilidade é confirmada em cada consulta.</p>
          </div>
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh} disabled={loading} className="text-xs px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5 disabled:opacity-50">
            <Wifi className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar estado'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {courts.map((court) => {
          const color = court.status === 'READY' ? 'bg-emerald-500' : court.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-slate-400';
          return (
            <div key={court.courtCode} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70" title={court.notes}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">{court.courtCode}</span>
                <span className={`w-2 h-2 rounded-full ${color}`} />
              </div>
              <p className="text-[10px] text-slate-500 truncate">{court.courtName}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-2.5 h-2.5" />
                <span>{court.latencyMs > 0 ? `${court.latencyMs}ms` : 'não testado'}</span>
              </div>
              <p className="mt-1 text-[9px] font-mono text-slate-500">{court.status}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
