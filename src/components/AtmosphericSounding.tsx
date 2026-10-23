import React, { useMemo, useState } from 'react';
import { AtmosphericProbe, SoundingLevel } from '../types/weather';
import { generateSoundingProfile } from '../services/atmosphericPhysics';
import { useTheme } from '../context/ThemeContext';
import { Download, Compass, Thermometer, Droplets, Wind, ArrowUpRight, Layers, Eye, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AtmosphericSoundingProps {
  probe: AtmosphericProbe;
}

export const AtmosphericSounding: React.FC<AtmosphericSoundingProps> = ({ probe }) => {
  const { isLight } = useTheme();
  const soundingLevels = useMemo(() => generateSoundingProfile(probe), [probe]);

  // Diagram display toggles
  const [showParcelPath, setShowParcelPath] = useState(true);
  const [showAdiabats, setShowAdiabats] = useState(true);
  const [showWindBarbs, setShowWindBarbs] = useState(true);
  const [hoveredLevel, setHoveredLevel] = useState<SoundingLevel | null>(null);

  // SVG coordinate transformation for Skew-T diagram
  const svgW = 520;
  const svgH = 420;
  const pMin = 100;
  const pMax = 1050;
  const logPMin = Math.log10(pMin);
  const logPMax = Math.log10(pMax);

  // Map pressure to Y (logarithmic, surface at bottom)
  const getY = (p: number) => {
    const logP = Math.log10(Math.max(pMin, Math.min(pMax, p)));
    return 36 + ((logP - logPMin) / (logPMax - logPMin)) * (svgH - 72);
  };

  // Map temperature to X (with 45-degree skew factor based on pressure level)
  const getX = (t: number, p: number) => {
    const y = getY(p);
    const skewOffset = (svgH - y) * 0.44;
    const baseX = 45 + ((t + 75) / 120) * (svgW - 170);
    return baseX + skewOffset;
  };

  // Build SVG path strings for Temperature (red) and Dew Point (green)
  const tempPath = useMemo(() => {
    return soundingLevels.reduce((acc, lvl, idx) => {
      const x = getX(lvl.temperatureC, lvl.pressureHpa);
      const y = getY(lvl.pressureHpa);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [soundingLevels]);

  const dewPath = useMemo(() => {
    return soundingLevels.reduce((acc, lvl, idx) => {
      const x = getX(lvl.dewPointC, lvl.pressureHpa);
      const y = getY(lvl.pressureHpa);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [soundingLevels]);

  // Parcel ascent curve path
  const parcelPath = useMemo(() => {
    return soundingLevels.reduce((acc, lvl, idx) => {
      const x = getX(lvl.parcelTempC, lvl.pressureHpa);
      const y = getY(lvl.pressureHpa);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [soundingLevels]);

  // Export CSV profile
  const handleExportCSV = () => {
    const header = 'Pressure_hPa,Altitude_m,Temperature_C,DewPoint_C,ParcelTemp_C,Theta_K,WindSpeed_kts,WindDir_deg\n';
    const rows = soundingLevels
      .map(
        (l) =>
          `${l.pressureHpa},${l.altitudeM},${l.temperatureC},${l.dewPointC},${l.parcelTempC},${l.thetaK},${l.windSpeedKts},${l.windDirectionDeg}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerostream_sounding_${probe.latitude}_${probe.longitude}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Key pressure lines for grid
  const standardPressures = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100];
  const standardTemps = [-60, -40, -20, 0, 20, 40];
  const dryAdiabatThetas = [260, 280, 300, 320, 340, 360];

  // Determine convective risk classification
  let riskLevel = 'LOW STABLE CONVECTION';
  let riskColor = isLight 
    ? 'text-emerald-800 bg-emerald-50 border-emerald-200' 
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (probe.capeJkg > 2500 && probe.srh03km > 300) {
    riskLevel = 'EXTREME TORNADIC / SUPERCELL POTENTIAL';
    riskColor = isLight 
      ? 'text-rose-800 bg-rose-50 border-rose-200' 
      : 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  } else if (probe.capeJkg > 1500) {
    riskLevel = 'SEVERE MULTI-CELLULAR CONVECTIVE HAZARD';
    riskColor = isLight 
      ? 'text-amber-800 bg-amber-50 border-amber-200' 
      : 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  } else if (probe.precipitableWaterMm > 50) {
    riskLevel = 'HIGH PRECIPITATION / DEEP MOISTURE CONVEYOR';
    riskColor = isLight 
      ? 'text-cyan-800 bg-cyan-50 border-cyan-200' 
      : 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
  }

  return (
    <div className={`w-full rounded-lg p-5 flex flex-col gap-5 shadow-xl transition-colors ${
      isLight ? 'bg-white border border-slate-200' : 'bg-[#0a0e1a] border border-slate-800'
    }`}>
      {/* Sounding Header and Location Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <div className={`text-xs uppercase font-mono font-semibold tracking-wider flex items-center gap-2 ${
            isLight ? 'text-cyan-700' : 'text-cyan-400'
          }`}>
            <span>Atmospheric Sounding Profile</span>
            <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>·</span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Skew-T Log-P Thermodynamic Engine</span>
          </div>
          <h3 className={`text-lg font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            Probe Target: {probe.latitude >= 0 ? `${probe.latitude}°N` : `${Math.abs(probe.latitude)}°S`},{' '}
            {probe.longitude >= 0 ? `${probe.longitude}°E` : `${Math.abs(probe.longitude)}°W`}
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer toggles */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs font-mono transition-colors ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#06080e] border-slate-800'
          }`}>
            <button
              onClick={() => setShowParcelPath(!showParcelPath)}
              className={`px-2.5 py-1 rounded transition-colors ${
                showParcelPath 
                  ? (isLight ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30') 
                  : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
            >
              Parcel Path
            </button>
            <button
              onClick={() => setShowAdiabats(!showAdiabats)}
              className={`px-2.5 py-1 rounded transition-colors ${
                showAdiabats 
                  ? (isLight ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 font-semibold' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30') 
                  : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
            >
              Dry Adiabats
            </button>
            <button
              onClick={() => setShowWindBarbs(!showWindBarbs)}
              className={`px-2.5 py-1 rounded transition-colors ${
                showWindBarbs 
                  ? (isLight ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 font-semibold' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30') 
                  : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
            >
              Wind Barbs
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Sounding
          </button>
        </div>
      </div>

      {/* Severe Weather Hazard Ribbon */}
      <div className={`w-full px-4 py-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-colors ${riskColor}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-bold tracking-wide">THERMODYNAMIC HAZARD: {riskLevel}</span>
        </div>
        <div className={`flex items-center gap-5 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          <span>0-3km SRH: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{probe.srh03km} m²/s²</strong></span>
          <span>·</span>
          <span>CIN: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{probe.cinJkg} J/kg</strong></span>
          <span>·</span>
          <span>LCL: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{probe.lclAltitudeM} m</strong></span>
          <span>·</span>
          <span>EL: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{probe.elAltitudeM} m</strong></span>
        </div>
      </div>

      {/* Main Thermodynamic Grid & Metrics Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Skew-T Log-P Interactive SVG Diagram */}
        <div className={`lg:col-span-8 rounded-lg border p-3.5 flex flex-col items-center justify-center relative overflow-hidden transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/90'
        }`}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto max-h-[480px] select-none"
            onMouseLeave={() => setHoveredLevel(null)}
          >
            {/* Background Pressure Isobars (Horizontal Lines) */}
            {standardPressures.map((p) => {
              const y = getY(p);
              const isMajor = p === 1000 || p === 850 || p === 500 || p === 300 || p === 200;
              return (
                <g key={p}>
                  <line
                    x1="45"
                    y1={y}
                    x2={svgW - 55}
                    y2={y}
                    stroke={isLight ? '#cbd5e1' : '#1e293b'}
                    strokeWidth={isMajor ? 1.0 : 0.65}
                    strokeDasharray={isMajor ? 'none' : '2 2'}
                  />
                  <text
                    x="38"
                    y={y + 3}
                    fill={isLight ? (isMajor ? '#475569' : '#94a3b8') : (isMajor ? '#94a3b8' : '#64748b')}
                    fontSize="9"
                    fontFamily="IBM Plex Mono"
                    textAnchor="end"
                  >
                    {p}
                  </text>
                </g>
              );
            })}

            {/* Dry Adiabats */}
            {showAdiabats && dryAdiabatThetas.map((th) => {
              let d = '';
              for (let p = 1000; p >= 150; p -= 50) {
                const tC = th * Math.pow(p / 1000, 0.286) - 273.15;
                const x = getX(tC, p);
                const y = getY(p);
                d += (d === '' ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`);
              }
              return (
                <path
                  key={`adiabat-${th}`}
                  d={d}
                  fill="none"
                  stroke={isLight ? 'rgba(2, 132, 199, 0.2)' : 'rgba(6, 182, 212, 0.15)'}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Skewed Isotherms (Diagonal 45-degree Lines) */}
            {standardTemps.map((t) => {
              const xBottom = getX(t, 1000);
              const xTop = getX(t, 100);
              const yBottom = getY(1000);
              const yTop = getY(100);
              return (
                <g key={t}>
                  <line
                    x1={xBottom}
                    y1={yBottom}
                    x2={xTop}
                    y2={yTop}
                    stroke={t === 0 ? (isLight ? 'rgba(2, 132, 199, 0.5)' : 'rgba(56, 189, 248, 0.45)') : (isLight ? '#e2e8f0' : 'rgba(51, 65, 85, 0.35)')}
                    strokeWidth={t === 0 ? 1.5 : 0.75}
                    strokeDasharray={t === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={xBottom - 4}
                    y={yBottom + 14}
                    fill={t === 0 ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#64748b' : '#64748b')}
                    fontSize="9"
                    fontFamily="IBM Plex Mono"
                    textAnchor="middle"
                  >
                    {t > 0 ? `+${t}°` : `${t}°`}
                  </text>
                </g>
              );
            })}

            {/* CAPE Area Shading */}
            {probe.capeJkg > 100 && (
              <path
                d={`${tempPath} L ${svgW - 55} ${getY(100)} L ${svgW - 55} ${getY(1000)} Z`}
                fill={isLight ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.05)'}
              />
            )}

            {/* Parcel Ascent Trajectory */}
            {showParcelPath && (
              <path
                d={parcelPath}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.0"
                strokeDasharray="4 3"
                strokeLinecap="round"
              />
            )}

            {/* Temperature Sounding Profile (Red line) */}
            <path
              d={tempPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dew Point Sounding Profile (Green line) */}
            <path
              d={dewPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* LCL & EL Altitude Markers on Diagram */}
            {probe.lclAltitudeM && (
              <g transform={`translate(${svgW - 95}, ${getY(1000 - probe.lclAltitudeM * 0.11)})`}>
                <line x1="-30" y1="0" x2="10" y2="0" stroke="#d97706" strokeWidth="1" strokeDasharray="2 2" />
                <rect x="12" y="-7" width="38" height="14" fill={isLight ? '#ffffff' : '#0b0f19'} rx="2" stroke="#d97706" strokeWidth="0.8" />
                <text x="31" y="3" fill="#d97706" fontSize="8" fontFamily="IBM Plex Mono" textAnchor="middle">
                  LCL
                </text>
              </g>
            )}

            {/* Interactive Level Hover Circles */}
            {soundingLevels.map((lvl) => {
              const xT = getX(lvl.temperatureC, lvl.pressureHpa);
              const xD = getX(lvl.dewPointC, lvl.pressureHpa);
              const y = getY(lvl.pressureHpa);
              const isHovered = hoveredLevel?.pressureHpa === lvl.pressureHpa;

              return (
                <g 
                  key={`pt-${lvl.pressureHpa}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLevel(lvl)}
                >
                  <circle cx={xT} cy={y} r={isHovered ? 5.5 : 3.5} fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  <circle cx={xD} cy={y} r={isHovered ? 5.5 : 3.5} fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                  {isHovered && (
                    <line x1="45" y1={y} x2={svgW - 55} y2={y} stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" />
                  )}
                </g>
              );
            })}

            {/* Wind Barbs along right vertical track */}
            {showWindBarbs && soundingLevels.map((lvl) => {
              const y = getY(lvl.pressureHpa);
              const x = svgW - 36;
              const angleRad = (lvl.windDirectionDeg * Math.PI) / 180;
              const len = 17;
              const staffEndX = x + Math.sin(angleRad) * len;
              const staffEndY = y - Math.cos(angleRad) * len;

              return (
                <g key={`wind-${lvl.pressureHpa}`}>
                  <line
                    x1={x}
                    y1={y}
                    x2={staffEndX}
                    y2={staffEndY}
                    stroke={isLight ? '#0284c7' : '#06b6d4'}
                    strokeWidth="1.5"
                  />
                  {lvl.windSpeedKts >= 50 && (
                    <polygon
                      points={`${staffEndX},${staffEndY} ${staffEndX - 5},${staffEndY + 5} ${staffEndX + 5},${staffEndY + 5}`}
                      fill={isLight ? '#0284c7' : '#06b6d4'}
                    />
                  )}
                  {lvl.windSpeedKts < 50 && lvl.windSpeedKts >= 20 && (
                    <line
                      x1={staffEndX}
                      y1={staffEndY}
                      x2={staffEndX + 6}
                      y2={staffEndY + 3}
                      stroke={isLight ? '#0284c7' : '#06b6d4'}
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}

            {/* In-diagram Legend */}
            <g transform="translate(52, 42)">
              <rect width="148" height="58" fill={isLight ? '#ffffff' : '#0b0f19'} rx="4" stroke={isLight ? '#cbd5e1' : '#1e293b'} />
              <line x1="10" y1="14" x2="28" y2="14" stroke="#ef4444" strokeWidth="2.5" />
              <text x="34" y="17" fill={isLight ? '#1e293b' : '#cbd5e1'} fontSize="9" fontFamily="IBM Plex Mono">
                T (Dry Bulb Temperature)
              </text>
              <line x1="10" y1="28" x2="28" y2="28" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
              <text x="34" y="31" fill={isLight ? '#1e293b' : '#cbd5e1'} fontSize="9" fontFamily="IBM Plex Mono">
                Td (Dew Point Profile)
              </text>
              <line x1="10" y1="42" x2="28" y2="42" stroke="#d97706" strokeWidth="2" strokeDasharray="3 2" />
              <text x="34" y="45" fill={isLight ? '#1e293b' : '#cbd5e1'} fontSize="9" fontFamily="IBM Plex Mono">
                Parcel Ascent Path
              </text>
            </g>
          </svg>

          {/* Interactive Hover HUD Bar */}
          <div className={`w-full mt-2 pt-2 border-t flex items-center justify-between text-xs font-mono px-2 ${
            isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800 text-slate-300'
          }`}>
            <div>
              <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>LEVEL HOVER: </span>
              {hoveredLevel ? (
                <span className={`font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'}`}>
                  {hoveredLevel.pressureHpa} hPa ({hoveredLevel.altitudeM} m)
                </span>
              ) : (
                <span className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'}>Hover points on diagram to inspect</span>
              )}
            </div>
            {hoveredLevel && (
              <div className="flex items-center gap-4 text-[11px]">
                <span>T: <strong className="text-rose-600 dark:text-rose-400">{hoveredLevel.temperatureC}°C</strong></span>
                <span>Td: <strong className="text-emerald-600 dark:text-emerald-400">{hoveredLevel.dewPointC}°C</strong></span>
                <span>Parcel: <strong className="text-amber-600 dark:text-amber-400">{hoveredLevel.parcelTempC}°C</strong></span>
                <span>Theta: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{hoveredLevel.thetaK} K</strong></span>
                <span>Wind: <strong className="text-cyan-600 dark:text-cyan-400">{hoveredLevel.windSpeedKts} kts</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Thermodynamic Index Panel */}
        <div className="lg:col-span-4 flex flex-col gap-3 justify-between">
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3 rounded border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
            }`}>
              <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>SFC Pressure</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {probe.surfacePressureHpa}
              </span>
              <span className={`text-[10px] uppercase font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>hPa</span>
            </div>

            <div className={`p-3 rounded border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
            }`}>
              <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>SBCAPE Energy</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                {probe.capeJkg}
              </span>
              <span className={`text-[10px] uppercase font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>J/kg</span>
            </div>

            <div className={`p-3 rounded border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
            }`}>
              <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Precip Water</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                {probe.precipitableWaterMm}
              </span>
              <span className={`text-[10px] uppercase font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
            </div>

            <div className={`p-3 rounded border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
            }`}>
              <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Z500 Height</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                {probe.geopotentialHeightM}
              </span>
              <span className={`text-[10px] uppercase font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>gpm</span>
            </div>

            <div className={`p-3 rounded border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
            }`}>
              <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>0-3km SRH</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {probe.srh03km}
              </span>
              <span className={`text-[10px] uppercase font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>m²/s²</span>
            </div>

            <div className={`p-3 rounded border transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
            }`}>
              <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Radar Reflectivity</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                {probe.radarReflectivityDbz}
              </span>
              <span className={`text-[10px] uppercase font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>dBZ</span>
            </div>
          </div>

          {/* Vertical Stratification Summary Table */}
          <div className={`rounded border p-3 flex-1 flex flex-col justify-between transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
          }`}>
            <span className={`text-xs uppercase font-mono font-semibold mb-2 block ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              Standard Atmospheric Sounding Levels
            </span>
            <div className="space-y-1 text-xs font-mono overflow-y-auto max-h-[190px]">
              <div className={`flex justify-between border-b pb-1 text-[11px] ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-500'
              }`}>
                <span>LEVEL</span>
                <span>ALT (m)</span>
                <span>T / Td (°C)</span>
                <span>PARCEL</span>
                <span>WIND</span>
              </div>
              {soundingLevels.map((lvl) => (
                <div 
                  key={lvl.pressureHpa} 
                  onMouseEnter={() => setHoveredLevel(lvl)}
                  className={`flex justify-between py-1 px-1 rounded transition-colors cursor-pointer ${
                    hoveredLevel?.pressureHpa === lvl.pressureHpa 
                      ? (isLight ? 'bg-slate-200 text-slate-900 font-semibold' : 'bg-slate-800 text-white') 
                      : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-900')
                  }`}
                >
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-400'}`}>{lvl.pressureHpa} hPa</span>
                  <span className="tabular-nums">{lvl.altitudeM}</span>
                  <span className="tabular-nums text-rose-600 dark:text-rose-300">
                    {lvl.temperatureC}° / <span className="text-emerald-600 dark:text-emerald-400">{lvl.dewPointC}°</span>
                  </span>
                  <span className="tabular-nums text-amber-600 dark:text-amber-300">{lvl.parcelTempC}°</span>
                  <span className="tabular-nums text-cyan-600 dark:text-cyan-300">{lvl.windSpeedKts} kts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
