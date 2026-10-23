import React, { useState } from 'react';
import { SatelliteFeed } from '../types/weather';
import { useTheme } from '../context/ThemeContext';
import { Radio, Crosshair, Wifi, CheckCircle2, RefreshCw, Layers, ShieldCheck, Activity } from 'lucide-react';

interface SatelliteRosterProps {
  satellites: SatelliteFeed[];
  onSelectSatellite: (sat: SatelliteFeed) => void;
}

export const SatelliteRoster: React.FC<SatelliteRosterProps> = ({
  satellites,
  onSelectSatellite,
}) => {
  const { isLight } = useTheme();
  const [selectedBands, setSelectedBands] = useState<Record<string, string>>({
    'goes-16': 'Band 13 (Clean IR 10.3µm)',
    'goes-18': 'Band 08 (Water Vapor 6.2µm)',
    'mtg-i1': 'Band 14 (IR Window 11.2µm)',
    'himawari-9': 'Band 13 (Clean IR 10.3µm)',
    'sentinel-5p': 'Band 07 (TROPOMI NO2)',
    'noaa-21': 'Band M15 (VIIRS Thermal)',
  });

  const spectralBands = [
    { label: 'Band 02', desc: '0.64 µm High-Res Visible' },
    { label: 'Band 07', desc: '3.9 µm Shortwave IR Fire' },
    { label: 'Band 08', desc: '6.2 µm Upper Water Vapor' },
    { label: 'Band 13', desc: '10.3 µm Clean Convective IR' },
    { label: 'Band 14', desc: '11.2 µm Cloud Top Window' },
    { label: 'Band 16', desc: '13.3 µm CO2 Air Mass Layer' },
  ];

  return (
    <div className={`w-full border rounded-lg p-5 flex flex-col gap-6 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0a0e1a] border-slate-800 text-slate-100'
    }`}>
      {/* Roster Header */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <div className="text-xs uppercase font-mono font-semibold tracking-wider flex items-center gap-2">
            <span className={isLight ? 'text-cyan-700' : 'text-cyan-400'}>Orbital Ingestion Network</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>·</span>
            <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Constellation Ground Feeds</span>
          </div>
          <h3 className={`text-lg font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            Real-Time Earth Observation Satellite Telemetry Streams
          </h3>
        </div>

        <div className={`flex items-center gap-4 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          <div>
            <span>Active Orbital Feeds: </span>
            <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{satellites.length} Satellites</span>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>|</span>
          <div>
            <span>Total Stream Rate: </span>
            <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              {satellites.reduce((acc, s) => acc + s.dataRateMbps, 0)} Mbps
            </span>
          </div>
        </div>
      </div>

      {/* Satellite Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {satellites.map((sat) => {
          const currentBand = selectedBands[sat.id] || 'Band 13 (Clean IR 10.3µm)';

          return (
            <div
              key={sat.id}
              className={`rounded-lg border p-4.5 flex flex-col justify-between gap-4 transition-colors shadow-md ${
                isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-[#06080e] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`flex items-center gap-1.5 text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>{sat.agency}</span>
                      <span>·</span>
                      <span className={isLight ? 'text-cyan-700 font-semibold' : 'text-cyan-400'}>{sat.orbitType} ({sat.altitudeKm.toLocaleString()} km)</span>
                    </div>
                    <h4 className={`text-base font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {sat.name}
                    </h4>
                  </div>

                  <span className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                    isLight ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {sat.health}
                  </span>
                </div>

                {/* Sub-Satellite Coordinates & Swath */}
                <div className={`space-y-1 text-xs font-mono p-3 rounded border mt-3 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/80'
                }`}>
                  <div className={`flex justify-between ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Sub-Sat Position:</span>
                    <span className={`font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                      {sat.latitude >= 0 ? `${sat.latitude}°N` : `${Math.abs(sat.latitude)}°S`},{' '}
                      {sat.longitude >= 0 ? `${sat.longitude}°E` : `${Math.abs(sat.longitude)}°W`}
                    </span>
                  </div>
                  <div className={`flex justify-between text-[11px] truncate pt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Active Sector:</span>
                    <span className={`truncate font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{sat.currentSwath}</span>
                  </div>
                  <div className={`flex justify-between text-[11px] truncate pt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Payload:</span>
                    <span className={`truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{sat.instruments.join(', ')}</span>
                  </div>
                </div>

                {/* Spectral Radiometer Band Selector */}
                <div className="mt-3">
                  <div className={`flex items-center justify-between text-[10px] font-mono mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>MULTI-SPECTRAL CHANNEL:</span>
                    <span className={`font-semibold truncate max-w-[170px] ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{currentBand}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {spectralBands.slice(0, 3).map((b) => (
                      <button
                        key={b.label}
                        onClick={() => setSelectedBands((prev) => ({ ...prev, [sat.id]: `${b.label} (${b.desc.split(' ')[0]})` }))}
                        className={`text-[10px] font-mono px-1.5 py-1 rounded transition-colors truncate ${
                          currentBand.startsWith(b.label)
                            ? isLight ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-semibold' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : isLight ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                        title={b.desc}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Ingestion Metrics */}
              <div className="space-y-3">
                <div className={`grid grid-cols-3 gap-2 text-center font-mono text-[11px] border-t pt-3 ${
                  isLight ? 'border-slate-200' : 'border-slate-800/80'
                }`}>
                  <div>
                    <span className={`block text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>CHANNELS</span>
                    <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{sat.channels} Bands</span>
                  </div>
                  <div>
                    <span className={`block text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>NATIVE RES</span>
                    <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>{sat.resolutionKm} km</span>
                  </div>
                  <div>
                    <span className={`block text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>BITRATE</span>
                    <span className={`font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{sat.dataRateMbps} Mbps</span>
                  </div>
                </div>

                {/* Focus Button */}
                <button
                  onClick={() => onSelectSatellite(sat)}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                    isLight
                      ? 'text-slate-800 hover:text-slate-950 bg-slate-200 hover:bg-slate-300 border border-slate-300'
                      : 'text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80'
                  }`}
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                  Focus Sub-Satellite View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
