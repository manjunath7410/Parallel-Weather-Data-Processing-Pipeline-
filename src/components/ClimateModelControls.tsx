import React, { useState } from 'react';
import { ScenarioPreset } from '../types/weather';
import { SCENARIO_PRESETS } from '../data/satellites';
import { useTheme } from '../context/ThemeContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Compass, 
  SlidersHorizontal, 
  CloudLightning, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface ClimateModelControlsProps {
  activeScenarioId: string;
  onSelectScenario: (scenario: ScenarioPreset) => void;
  modelHour: number;
  setModelHour: (hour: number | ((prev: number) => number)) => void;
  isPlayingTimeline: boolean;
  setIsPlayingTimeline: (playing: boolean) => void;
  gridResolution: string;
  setGridResolution: (res: string) => void;
  ensembleMembers: number;
  setEnsembleMembers: (count: number) => void;
  onInjectPerturbation?: (lat: number, lon: number, type: string) => void;
}

export const ClimateModelControls: React.FC<ClimateModelControlsProps> = ({
  activeScenarioId,
  onSelectScenario,
  modelHour,
  setModelHour,
  isPlayingTimeline,
  setIsPlayingTimeline,
  gridResolution,
  setGridResolution,
  ensembleMembers,
  setEnsembleMembers,
  onInjectPerturbation,
}) => {
  const { isLight } = useTheme();
  const [showInjector, setShowInjector] = useState(false);
  const [injectType, setInjectType] = useState('cyclone');
  const [injectLat, setInjectLat] = useState('18.4');
  const [injectLon, setInjectLon] = useState('132.8');
  const [injectSuccess, setInjectSuccess] = useState(false);

  const currentScenario =
    SCENARIO_PRESETS.find((s) => s.id === activeScenarioId) || SCENARIO_PRESETS[0];

  const handleInject = () => {
    const lat = parseFloat(injectLat) || 0;
    const lon = parseFloat(injectLon) || 0;
    if (onInjectPerturbation) {
      onInjectPerturbation(lat, lon, injectType);
    }
    setInjectSuccess(true);
    setTimeout(() => setInjectSuccess(false), 2400);
  };

  return (
    <div className={`w-full border rounded-lg p-5 flex flex-col gap-5 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0a0e1a] border-slate-800 text-slate-100'
    }`}>
      {/* Scenario Presets Strip */}
      <div className="flex flex-col gap-2">
        <div className={`flex flex-wrap items-center justify-between text-xs font-mono gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          <span className={`uppercase font-semibold tracking-wider flex items-center gap-1.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
            <span>Operational Benchmarks & Extreme Event Scenarios</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInjector(!showInjector)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                isLight
                  ? 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200'
                  : 'text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60'
              }`}
            >
              <Zap className={`w-3 h-3 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
              <span>{showInjector ? 'Close Perturbation Injector' : 'Custom Perturbation Injector'}</span>
              {showInjector ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Custom Perturbation Injector Expandable Console */}
        {showInjector && (
          <div className={`p-3.5 rounded-lg border flex flex-col gap-3 my-1 ${
            isLight ? 'bg-slate-50 border-cyan-300' : 'bg-[#06080e] border-cyan-500/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase font-mono font-bold flex items-center gap-1.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                <Zap className="w-3.5 h-3.5" />
                4D-Var Observational Perturbation Injector
              </span>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Inject synthetic observations into active assimilation window
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className={`text-[10px] uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Perturbation Type</label>
                <select
                  value={injectType}
                  onChange={(e) => setInjectType(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded border outline-none text-xs ${
                    isLight 
                      ? 'bg-white text-slate-800 border-slate-300 focus:border-cyan-600' 
                      : 'bg-slate-900 text-slate-200 border-slate-700/80 focus:border-cyan-500'
                  }`}
                >
                  <option value="cyclone">Rapid Tropical Cyclone (-32 hPa Core)</option>
                  <option value="river">Atmospheric River Plume (+55 mm PWV)</option>
                  <option value="supercell">Severe Convective Updraft (+3200 J/kg CAPE)</option>
                  <option value="polar">Polar Vortex Cold Split (-38°C Siberian)</option>
                </select>
              </div>

              <div>
                <label className={`text-[10px] uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Target Latitude (-90 to +90)</label>
                <input
                  type="number"
                  value={injectLat}
                  onChange={(e) => setInjectLat(e.target.value)}
                  step="0.1"
                  className={`w-full px-2 py-1.5 rounded border outline-none text-xs ${
                    isLight 
                      ? 'bg-white text-slate-800 border-slate-300 focus:border-cyan-600' 
                      : 'bg-slate-900 text-slate-200 border-slate-700/80 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[10px] uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Target Longitude (-180 to +180)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={injectLon}
                    onChange={(e) => setInjectLon(e.target.value)}
                    step="0.1"
                    className={`w-full px-2 py-1.5 rounded border outline-none text-xs ${
                      isLight 
                        ? 'bg-white text-slate-800 border-slate-300 focus:border-cyan-600' 
                        : 'bg-slate-900 text-slate-200 border-slate-700/80 focus:border-cyan-500'
                    }`}
                  />
                  <button
                    onClick={handleInject}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors whitespace-nowrap flex items-center gap-1 font-bold"
                  >
                    {injectSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" /> : <Zap className="w-3.5 h-3.5" />}
                    {injectSuccess ? 'Injected!' : 'Inject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SCENARIO_PRESETS.map((scenario) => {
            const isSelected = scenario.id === activeScenarioId;
            return (
              <button
                key={scenario.id}
                onClick={() => onSelectScenario(scenario)}
                className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? isLight
                      ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-slate-900 border-cyan-500 shadow-sm shadow-cyan-500/10'
                    : isLight
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-[#06080e] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-mono uppercase block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {scenario.category}
                  </span>
                  <h4 className={`text-xs font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {scenario.title}
                  </h4>
                </div>
                <div className={`text-[11px] line-clamp-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {scenario.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Physical Context & Model Timeline Controls */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t items-center ${
        isLight ? 'border-slate-200' : 'border-slate-800/80'
      }`}>
        {/* Scenario Detailed Note */}
        <div className={`lg:col-span-5 p-3.5 rounded border text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#06080e] border-slate-800 text-slate-300'
        }`}>
          <div className={`flex items-center gap-1.5 font-mono text-[11px] mb-1 font-semibold ${
            isLight ? 'text-cyan-700' : 'text-cyan-400'
          }`}>
            <CloudLightning className="w-3.5 h-3.5" />
            <span>METEOROLOGICAL DIAGNOSTIC:</span>
          </div>
          <p className="leading-relaxed">{currentScenario.description}</p>
          <div className={`mt-2 text-[11px] font-mono ${
            isLight ? 'text-amber-700' : 'text-amber-400/90'
          }`}>
            Observation: {currentScenario.phenomenon}
          </div>
        </div>

        {/* Model Timeline Scrubber */}
        <div className={`lg:col-span-7 flex flex-col gap-3 p-3.5 rounded border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Model Integration: </span>
              <span className={`font-bold text-sm tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                T+{modelHour < 10 ? `0${modelHour}` : modelHour}:00h
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                (Valid {new Date(Date.now() + modelHour * 3600 * 1000).toISOString().slice(11, 16)} UTC)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setModelHour((prev) => Math.max(0, prev - 3))}
                className={`p-1 rounded transition-colors ${
                  isLight 
                    ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300' 
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
                title="Step -3h"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors font-bold"
              >
                {isPlayingTimeline ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" /> Play
                  </>
                )}
              </button>
              <button
                onClick={() => setModelHour((prev) => Math.min(72, prev + 3))}
                className={`p-1 rounded transition-colors ${
                  isLight 
                    ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300' 
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
                title="Step +3h"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setModelHour(0)}
                className={`p-1 rounded transition-colors ${
                  isLight 
                    ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300' 
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
                title="Reset to T+00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrubber slider bar */}
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>T+0h</span>
            <input
              type="range"
              min={0}
              max={72}
              step={1}
              value={modelHour}
              onChange={(e) => setModelHour(Number(e.target.value))}
              className={`w-full accent-cyan-500 cursor-pointer h-1.5 rounded-lg ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`}
            />
            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>T+72h</span>
          </div>

          {/* Model Resolution & Ensemble Controls */}
          <div className={`flex flex-wrap items-center justify-between gap-4 pt-2 border-t text-xs font-mono ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}>
            <div className="flex items-center gap-2">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Dynamical Grid:</span>
              <select
                value={gridResolution}
                onChange={(e) => setGridResolution(e.target.value)}
                className={`text-xs px-2 py-0.5 rounded border focus:border-cyan-500 outline-none cursor-pointer ${
                  isLight 
                    ? 'bg-white text-slate-800 border-slate-300' 
                    : 'bg-slate-900 text-slate-200 border-slate-800'
                }`}
              >
                <option value="0.10">0.10° Native Non-Hydrostatic (9 km)</option>
                <option value="0.25">0.25° Global Climate Core (25 km)</option>
                <option value="0.50">0.50° Synoptic Fast Ensemble (50 km)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Ensemble Members:</span>
              <span className={`font-bold tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{ensembleMembers} Runs</span>
              <div className="flex items-center gap-1">
                {[16, 32, 50, 64].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEnsembleMembers(n)}
                    className={`px-1.5 py-0.5 rounded text-[11px] ${
                      ensembleMembers === n
                        ? isLight ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
