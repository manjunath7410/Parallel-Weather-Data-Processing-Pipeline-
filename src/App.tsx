import React, { useState, useEffect } from 'react';
import { 
  ProjectionMode, 
  WeatherLayer, 
  AtmosphericProbe, 
  SatelliteFeed, 
  ScenarioPreset,
  AnomalyEvent
} from './types/weather';
import { INITIAL_SATELLITES, SCENARIO_PRESETS, INITIAL_ANOMALIES } from './data/satellites';
import { sampleAtmosphereAt } from './services/atmosphericPhysics';
import { INITIAL_PIPELINE_STAGES, generateWorkerCluster } from './services/pipelineSimulator';
import { useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { GlobalClimateGlobe } from './components/GlobalClimateGlobe';
import { ClimateModelControls } from './components/ClimateModelControls';
import { AtmosphericSounding } from './components/AtmosphericSounding';
import { PipelineGraph } from './components/PipelineGraph';
import { ClusterWorkerMatrix } from './components/ClusterWorkerMatrix';
import { SatelliteRoster } from './components/SatelliteRoster';
import { AnomalyAlerts } from './components/AnomalyAlerts';
import { ExportModal } from './components/ExportModal';
import { 
  Activity, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  Thermometer, 
  Layers, 
  Radio, 
  Compass, 
  ArrowUpRight,
  Radar,
  CloudRain,
  Zap,
  Tablet,
  Smartphone,
  Monitor,
  Maximize2
} from 'lucide-react';

export default function App() {
  const { isLight, deviceMode, setDeviceMode } = useTheme();

  // Navigation & Pipeline State
  const [activeTab, setActiveTab] = useState<'monitor' | 'pipeline' | 'cluster' | 'sounding' | 'satellites'>('monitor');
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Visualization & Scenario State
  const [projection, setProjection] = useState<ProjectionMode>('globe');
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>('thermal_ir');
  const [activeScenarioId, setActiveScenarioId] = useState<string>('typhoon_cat5');
  const [showWindParticles, setShowWindParticles] = useState<boolean>(true);
  const [showSatellites, setShowSatellites] = useState<boolean>(true);

  // Model Timeline Scrubber State
  const [modelHour, setModelHour] = useState<number>(12);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [gridResolution, setGridResolution] = useState<string>('0.10');
  const [ensembleMembers, setEnsembleMembers] = useState<number>(50);

  // Probe & Sounding Coordinates (defaults to Super Typhoon Malakas center)
  const [selectedProbe, setSelectedProbe] = useState<AtmosphericProbe>(() =>
    sampleAtmosphereAt(18.4, 132.8, 'typhoon_cat5', 12)
  );

  // Pipeline Telemetry & Cluster State
  const [stages, setStages] = useState(INITIAL_PIPELINE_STAGES);
  const [workerCount, setWorkerCount] = useState<number>(32);
  const [workers, setWorkers] = useState(() => generateWorkerCluster(32));
  const [satellites, setSatellites] = useState<SatelliteFeed[]>(INITIAL_SATELLITES);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>(INITIAL_ANOMALIES);
  const [cycleTime, setCycleTime] = useState<number>(0);

  // Regeneration of worker pool when count changes
  useEffect(() => {
    setWorkers(generateWorkerCluster(workerCount));
  }, [workerCount]);

  // Real-Time Background Pipeline & Packet Tick Loop
  useEffect(() => {
    if (!isRunningPipeline) return;

    const interval = setInterval(() => {
      setCycleTime((prev) => prev + 1);

      // Increment satellite packet counters
      setSatellites((prevSats) =>
        prevSats.map((sat) => ({
          ...sat,
          packetCount: sat.packetCount + Math.floor(sat.dataRateMbps * 12),
        }))
      );

      // Subtle live worker utilization heartbeat
      setWorkers((prevWorkers) =>
        prevWorkers.map((w) => {
          const delta = (Math.random() - 0.5) * 6;
          const newUtil = Math.round(Math.max(20, Math.min(99, w.utilization + delta)));
          return {
            ...w,
            utilization: newUtil,
            temperatureC: Math.round(52 + (newUtil / 100) * 26),
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunningPipeline]);

  // Timeline auto-advancement loop when playing
  useEffect(() => {
    if (!isPlayingTimeline) return;

    const timer = setInterval(() => {
      setModelHour((prev) => {
        const next = prev + 1;
        return next > 72 ? 0 : next;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  // Update probe values when forecast modelHour shifts
  useEffect(() => {
    setSelectedProbe((prev) =>
      sampleAtmosphereAt(prev.latitude, prev.longitude, activeScenarioId, modelHour)
    );
  }, [modelHour]);

  // Scenario selection handler
  const handleSelectScenario = (scenario: ScenarioPreset) => {
    setActiveScenarioId(scenario.id);
    setActiveLayer(scenario.activeLayer);
    setSelectedProbe(
      sampleAtmosphereAt(scenario.targetLat, scenario.targetLon, scenario.id, modelHour)
    );
  };

  // Satellite selection handler
  const handleSelectSatellite = (sat: SatelliteFeed) => {
    setSelectedProbe(
      sampleAtmosphereAt(sat.latitude, sat.longitude, activeScenarioId, modelHour)
    );
    setActiveTab('monitor');
  };

  // Anomaly inspection handler
  const handleSelectAnomaly = (anom: AnomalyEvent) => {
    setSelectedProbe(
      sampleAtmosphereAt(anom.coordinates[0], anom.coordinates[1], activeScenarioId, modelHour)
    );
    setActiveTab('monitor');
  };

  // Custom perturbation injector handler
  const handleInjectPerturbation = (lat: number, lon: number, type: string) => {
    const probe = sampleAtmosphereAt(lat, lon, activeScenarioId, modelHour);
    setSelectedProbe(probe);

    const typeLabels: Record<string, string> = {
      cyclone: 'rapid_cyclogenesis',
      river: 'atmospheric_river',
      supercell: 'rapid_cyclogenesis',
      polar: 'polar_vortex_split',
    };

    const newAnom: AnomalyEvent = {
      id: `anom-${Date.now()}`,
      timestamp: `${new Date().toISOString().slice(11, 19)} UTC`,
      type: (typeLabels[type] as any) || 'rapid_cyclogenesis',
      severity: 'extreme',
      location: `Perturbation Point (${lat >= 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, ${lon >= 0 ? `${lon}°E` : `${Math.abs(lon)}°W`})`,
      coordinates: [lat, lon],
      metricValue: `SLP: ${probe.surfacePressureHpa} hPa | dBZ: ${probe.radarReflectivityDbz} | CAPE: ${probe.capeJkg} J/kg`,
      assimilationConfidence: 99.8,
    };

    setAnomalies((prev) => [newAnom, ...prev.slice(0, 5)]);
    setActiveTab('monitor');
  };

  // Content body according to active tab
  const renderTabContent = () => (
    <>
      {activeTab === 'monitor' && (
        <div className="flex flex-col gap-5">
          {/* Split Console: 3D Interactive Canvas & Quick Probe Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Planetary Canvas Viewport */}
            <div className={`lg:col-span-8 rounded-xl overflow-hidden border ${
              deviceMode === 'mobile' ? 'h-[440px]' : 'h-[560px]'
            } relative shadow-xl transition-all ${
              isLight ? 'border-slate-300' : 'border-slate-800'
            }`}>
              <GlobalClimateGlobe
                projection={projection}
                setProjection={setProjection}
                activeLayer={activeLayer}
                setActiveLayer={setActiveLayer}
                activeScenarioId={activeScenarioId}
                modelHour={modelHour}
                satellites={satellites}
                selectedProbe={selectedProbe}
                setSelectedProbe={setSelectedProbe}
                showWindParticles={showWindParticles}
                setShowWindParticles={setShowWindParticles}
                showSatellites={showSatellites}
                setShowSatellites={setShowSatellites}
              />
            </div>

            {/* Side Column: Sounding Snapshot & Key Atmospheric Indices */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-4">
              <div className={`rounded-xl border p-4.5 flex-1 flex flex-col justify-between shadow-xl transition-colors ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0a0e1a] border-slate-800'
              }`}>
                <div>
                  <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  }`}>
                    <span className={`text-xs uppercase font-mono font-semibold flex items-center gap-1.5 ${
                      isLight ? 'text-cyan-700' : 'text-cyan-400'
                    }`}>
                      <Activity className="w-3.5 h-3.5" />
                      Atmospheric Column Telemetry
                    </span>
                    <button
                      onClick={() => setActiveTab('sounding')}
                      className={`text-xs font-mono flex items-center gap-1 font-semibold ${
                        isLight ? 'text-cyan-700 hover:text-cyan-900' : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                    >
                      Full Skew-T <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className={`text-[11px] block font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        TARGET COORDINATES
                      </span>
                      <span className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {selectedProbe.latitude >= 0 ? `${selectedProbe.latitude}°N` : `${Math.abs(selectedProbe.latitude)}°S`},{' '}
                        {selectedProbe.longitude >= 0 ? `${selectedProbe.longitude}°E` : `${Math.abs(selectedProbe.longitude)}°W`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>SFC Pressure</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {selectedProbe.surfacePressureHpa}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>hPa</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Cloud Top Tb</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                          {selectedProbe.brightnessTempK}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>K</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Wind Velocity</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {selectedProbe.windSpeedKts}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>kts @ {selectedProbe.windDirectionDeg}°</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Radar dBZ</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                          {selectedProbe.radarReflectivityDbz}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>dBZ</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total PWV</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          {selectedProbe.precipitableWaterMm}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>SBCAPE</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                          {selectedProbe.capeJkg}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>J/kg</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>0-3km Helicity</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          {selectedProbe.srh03km}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>m²/s²</span>
                      </div>

                      <div className={`p-2.5 rounded border transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800/80'
                      }`}>
                        <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Lightning</span>
                        <span className={`text-lg font-bold font-mono tabular-nums ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                          {selectedProbe.lightningFlashesPerMin}
                        </span>
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>/min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Micro-diagnostic footer */}
                <div className={`mt-4 pt-3 border-t text-xs font-mono flex items-center justify-between ${
                  isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                }`}>
                  <span>Vorticity: {selectedProbe.vorticityRate} × 10⁻⁵ s⁻¹</span>
                  <span className={isLight ? 'text-cyan-700' : 'text-cyan-400'}>Flux: {selectedProbe.radiativeFluxWm2} W/m²</span>
                </div>
              </div>

              {/* Quick Ingest Constellation Status Bar */}
              <div className={`rounded-xl border p-4 flex items-center justify-between shadow-xl transition-colors ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0a0e1a] border-slate-800'
              }`}>
                <div>
                  <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Active Constellation
                  </span>
                  <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    6 Operational Satellites Streaming
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('satellites')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  View Constellation
                </button>
              </div>
            </div>
          </div>

          {/* Scenario Presets, Custom Injector, & Timeline Scrubber */}
          <ClimateModelControls
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            modelHour={modelHour}
            setModelHour={setModelHour}
            isPlayingTimeline={isPlayingTimeline}
            setIsPlayingTimeline={setIsPlayingTimeline}
            gridResolution={gridResolution}
            setGridResolution={setGridResolution}
            ensembleMembers={ensembleMembers}
            setEnsembleMembers={setEnsembleMembers}
            onInjectPerturbation={handleInjectPerturbation}
          />

          {/* Extreme Weather Anomaly Alerts */}
          <AnomalyAlerts
            anomalies={anomalies}
            onSelectAnomaly={handleSelectAnomaly}
          />
        </div>
      )}

      {/* TAB 2: Parallel DAG Pipeline */}
      {activeTab === 'pipeline' && (
        <PipelineGraph stages={stages} />
      )}

      {/* TAB 3: Heterogeneous Compute Cluster */}
      {activeTab === 'cluster' && (
        <ClusterWorkerMatrix
          workers={workers}
          workerCount={workerCount}
          setWorkerCount={setWorkerCount}
        />
      )}

      {/* TAB 4: Atmospheric Sounding (Skew-T Log-P) */}
      {activeTab === 'sounding' && (
        <AtmosphericSounding probe={selectedProbe} />
      )}

      {/* TAB 5: Satellite Constellation Roster */}
      {activeTab === 'satellites' && (
        <SatelliteRoster
          satellites={satellites}
          onSelectSatellite={handleSelectSatellite}
        />
      )}
    </>
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#07090e] text-slate-100'
    } selection:bg-cyan-500/30 selection:text-cyan-200`}>
      {/* 3-Zone Header Contract with Mobile Nav & Theme Switcher */}
      <Header
        isRunning={isRunningPipeline}
        onTogglePipeline={() => setIsRunningPipeline(!isRunningPipeline)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportClick={() => setIsExportModalOpen(true)}
      />

      {/* Device Simulation Banner (when in tablet or mobile mode) */}
      {deviceMode !== 'desktop' && (
        <div className={`w-full py-1.5 px-4 text-xs font-mono flex items-center justify-between border-b transition-colors ${
          isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-900' : 'bg-cyan-950/40 border-cyan-900/60 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            {deviceMode === 'tablet' ? <Tablet className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span className="font-semibold uppercase">
              {deviceMode === 'tablet' ? 'Tablet Viewport Mode (820 × 1180px iPad Simulation)' : 'Mobile Phone Mode (393 × 852px Smartphone Simulation)'}
            </span>
          </div>
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1 hover:underline text-[11px] ${isLight ? 'text-cyan-800' : 'text-cyan-200'}`}
          >
            <Maximize2 className="w-3 h-3" />
            Switch to Full PC Mode
          </button>
        </div>
      )}

      {/* Top Telemetry Precision Ribbon (Scientific Authority) */}
      <div className={`w-full border-b px-4 sm:px-6 py-2 text-xs font-mono flex flex-wrap items-center justify-between gap-4 select-none transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0a0f1d] border-slate-800/80 text-slate-400'
      }`}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>PIPELINE:</span>
            <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'}`} />
              4D-VAR NOMINAL
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>CYCLE:</span>
            <span className={`font-semibold tabular-nums ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              T+{Math.floor(cycleTime / 60)}m:{cycleTime % 60 < 10 ? `0${cycleTime % 60}` : cycleTime % 60}s
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>INGESTED SOUNDINGS:</span>
            <span className={`font-semibold tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              {(satellites.reduce((acc, s) => acc + s.packetCount, 0) / 1000000).toFixed(2)}M pkts
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>DYNAMIC CORE GRID:</span>
            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {gridResolution}° (~{Number(gridResolution) * 90} km)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px]">
          <div className={`flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>ENSEMBLE MEMBERS:</span>
            <span className={`font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{ensembleMembers}</span>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>
          <div className={`flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>RESIDUAL NORM:</span>
            <span className={`font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>||∇J|| = 4.12e-5</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Frame Container (Adapts based on PC / Tablet / Mobile Mode) */}
      <div className={`flex-1 w-full flex justify-center p-3 sm:p-5 md:p-6 transition-all ${
        deviceMode === 'tablet' 
          ? 'py-6 bg-slate-950/20' 
          : deviceMode === 'mobile' 
          ? 'py-6 bg-slate-950/30' 
          : ''
      }`}>
        {deviceMode === 'desktop' ? (
          // PC Mode (Standard 100% responsive desktop)
          <main className="w-full max-w-[1720px] flex flex-col gap-6">
            {renderTabContent()}
          </main>
        ) : deviceMode === 'tablet' ? (
          // Tablet Mode (iPad Pro Simulation Frame)
          <div className={`w-full max-w-[860px] rounded-2xl border-4 shadow-2xl overflow-hidden flex flex-col transition-colors ${
            isLight ? 'bg-white border-slate-300' : 'bg-[#07090e] border-slate-800'
          }`}>
            {/* Tablet Frame Header */}
            <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#0a0f1d] border-slate-800 text-slate-400'
            }`}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                iPad Pro 11-inch (820px Viewport)
              </span>
              <span>100% Battery · Wi-Fi 6E</span>
            </div>
            <div className="p-4 flex flex-col gap-5 overflow-y-auto max-h-[85vh]">
              {renderTabContent()}
            </div>
          </div>
        ) : (
          // Mobile Mode (Smartphone Simulation Frame)
          <div className={`w-full max-w-[420px] rounded-[36px] border-8 shadow-2xl overflow-hidden flex flex-col transition-colors ${
            isLight ? 'bg-white border-slate-400' : 'bg-[#07090e] border-slate-800'
          }`}>
            {/* Smartphone Dynamic Island / Notch Header */}
            <div className={`px-6 pt-3 pb-2 flex items-center justify-between text-xs font-mono select-none ${
              isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#06080e] text-slate-300'
            }`}>
              <span className="font-bold text-[11px]">09:41</span>
              {/* Dynamic Island pill */}
              <div className="w-20 h-4 bg-black rounded-full" />
              <div className="flex items-center gap-1 text-[10px]">
                <span>5G</span>
                <span className="w-4 h-2 rounded-xs border border-current inline-block relative after:w-2 after:h-1 after:bg-current after:absolute after:top-0.5 after:left-0.5" />
              </div>
            </div>
            {/* Scrollable Mobile Body */}
            <div className="p-3.5 flex flex-col gap-4 overflow-y-auto max-h-[80vh] scrollbar-none">
              {renderTabContent()}
            </div>
            {/* Home indicator bar */}
            <div className="w-full py-2 flex justify-center">
              <div className={`w-28 h-1 rounded-full ${isLight ? 'bg-slate-400' : 'bg-slate-700'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className={`w-full border-t px-6 py-4 mt-auto text-xs font-mono flex flex-wrap items-center justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#07090e] border-slate-800/80 text-slate-500'
      }`}>
        <div>
          <span>AeroStream Planetary Computing Core</span>
          <span className="mx-2">·</span>
          <span>4D-Var Data Assimilation & Non-Hydrostatic Climate Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <span>GOES-16/18 · MTG-I1 · Himawari-9 · Sentinel-5P · JPSS-2</span>
          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>
          <span className={isLight ? 'text-cyan-700 font-semibold' : 'text-cyan-400'}>IEEE / WMO Standard Compliant</span>
        </div>
      </footer>

      {/* NetCDF-4 / GRIB2 / GeoJSON Science Data Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        probe={selectedProbe}
        activeScenarioId={activeScenarioId}
        modelHour={modelHour}
      />
    </div>
  );
}
