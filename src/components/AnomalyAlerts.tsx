import React, { useState } from 'react';
import { AnomalyEvent } from '../types/weather';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, Compass, ShieldAlert, Zap, ArrowRight, Filter } from 'lucide-react';

interface AnomalyAlertsProps {
  anomalies: AnomalyEvent[];
  onSelectAnomaly: (anomaly: AnomalyEvent) => void;
}

export const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({
  anomalies,
  onSelectAnomaly,
}) => {
  const { isLight } = useTheme();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'extreme' | 'severe' | 'moderate'>('all');

  const filtered = anomalies.filter(
    (a) => severityFilter === 'all' || a.severity === severityFilter
  );

  return (
    <div className={`w-full border rounded-lg p-5 flex flex-col gap-4 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0a0e1a] border-slate-800 text-slate-100'
    }`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          <h3 className={`text-sm font-bold uppercase tracking-wide font-mono ${
            isLight ? 'text-slate-900' : 'text-slate-100'
          }`}>
            Automated Extreme Weather Ingestion Alerts
          </h3>
        </div>

        {/* Severity Filter Controls */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className={`mr-1 hidden sm:inline ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>THRESHOLD:</span>
          {(['all', 'extreme', 'severe', 'moderate'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-0.5 rounded transition-colors uppercase text-[11px] ${
                severityFilter === sev
                  ? sev === 'extreme'
                    ? 'bg-rose-500 text-slate-950 font-bold'
                    : sev === 'severe'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-cyan-500 text-slate-950 font-bold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Anomaly Event List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((anom) => {
          const isExtreme = anom.severity === 'extreme';
          const isSevere = anom.severity === 'severe';

          return (
            <div
              key={anom.id}
              className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 text-xs transition-all shadow-sm ${
                isLight
                  ? isExtreme
                    ? 'border-rose-300 bg-rose-50/50 hover:border-rose-400'
                    : isSevere
                    ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  : isExtreme
                  ? 'border-rose-500/40 bg-[#06080e] hover:border-rose-500/70'
                  : isSevere
                  ? 'border-amber-500/40 bg-[#06080e] hover:border-amber-500/70'
                  : 'border-slate-800 bg-[#06080e] hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>{anom.timestamp}</span>
                  <span
                    className={`uppercase font-bold px-1.5 py-0.5 rounded ${
                      isExtreme
                        ? isLight ? 'text-rose-800 bg-rose-100 border border-rose-300' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                        : isSevere
                        ? isLight ? 'text-amber-800 bg-amber-100 border border-amber-300' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                        : isLight ? 'text-cyan-800 bg-cyan-100 border border-cyan-300' : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                    }`}
                  >
                    {anom.severity}
                  </span>
                </div>

                <h4 className={`font-bold line-clamp-1 text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{anom.location}</h4>
                <div className={`font-mono text-[11px] mt-1.5 p-1.5 rounded border ${
                  isLight 
                    ? 'bg-white text-cyan-900 border-slate-200' 
                    : 'bg-[#0a0f1d] text-cyan-300 border border-slate-800/80'
                }`}>
                  {anom.metricValue}
                </div>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t font-mono text-[11px] ${
                isLight ? 'border-slate-200' : 'border-slate-800/80'
              }`}>
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  Assimilation: <strong className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{anom.assimilationConfidence}%</strong>
                </span>
                <button
                  onClick={() => onSelectAnomaly(anom)}
                  className={`flex items-center gap-1 font-semibold ${
                    isLight ? 'text-cyan-700 hover:text-cyan-900' : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  Inspect <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
