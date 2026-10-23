import React, { useState, useEffect } from 'react';
import { PipelineStage } from '../types/weather';
import { useTheme } from '../context/ThemeContext';
import { 
  Cpu, 
  Layers, 
  Workflow, 
  Database, 
  Zap, 
  Clock, 
  ChevronRight,
  Sliders,
  CheckCircle2,
  HardDrive,
  Play,
  RotateCcw,
  Sparkles,
  TrendingDown
} from 'lucide-react';

interface PipelineGraphProps {
  stages: PipelineStage[];
  onUpdateWorkerCount?: (stageId: string, count: number) => void;
}

export const PipelineGraph: React.FC<PipelineGraphProps> = ({ stages: initialStages }) => {
  const { isLight } = useTheme();
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[3].id); // Default to 4D-Var
  const [isSolving4DVar, setIsSolving4DVar] = useState<boolean>(false);
  const [solverIteration, setSolverIteration] = useState<number>(12);
  const [costHistory, setCostHistory] = useState<number[]>([
    14820, 9340, 5820, 3410, 2190, 1420, 940, 680, 510, 420, 360, 310, 285
  ]);

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  // Adjust worker core allocation for a stage
  const handleAdjustWorkers = (stageId: string, delta: number) => {
    setStages((prevStages) =>
      prevStages.map((s) => {
        if (s.id !== stageId) return s;
        const newWorkers = Math.max(2, Math.min(24, s.assignedWorkers + delta));
        // Amdahl's law dynamic latency/throughput scaling
        const speedup = Math.sqrt(newWorkers / s.assignedWorkers);
        return {
          ...s,
          assignedWorkers: newWorkers,
          latencyMs: Number((s.latencyMs / speedup).toFixed(1)),
          throughputMBs: Math.round(s.throughputMBs * speedup),
        };
      })
    );
  };

  // Run interactive 4D-Var Variational solver sweep
  const handleRun4DVarSolver = () => {
    if (isSolving4DVar) return;
    setIsSolving4DVar(true);
    setSolverIteration(1);
    setCostHistory([14820]);

    let iter = 1;
    const initialCost = 14820;
    const interval = setInterval(() => {
      iter += 1;
      setSolverIteration(iter);
      setCostHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.round(last * (0.68 + Math.random() * 0.12));
        return [...prev, Math.max(240, next)];
      });

      if (iter >= 12) {
        clearInterval(interval);
        setIsSolving4DVar(false);
      }
    }, 280);
  };

  const stageDetails: Record<string, { math: string; description: string; kernels: string[]; inputs: string; outputs: string }> = {
    stage_ingest: {
      math: 'P(t) = \\sum_{s \\in S} \\text{Demux}(\\text{CCSDS}_s(t))',
      description: 'Demultiplexes high-rate raw L0 packet bitstreams across GOES-16/18 ABI, Meteosat FCI, Himawari AHI, and polar sounders. Employs SIMD Huffman and CCSDS lossy/lossless decompression.',
      kernels: ['ccsd_packet_depacketizer_avx2', 'crc32_frame_validator', 'dma_ringbuffer_sync'],
      inputs: 'Raw S-Band / X-Band Telemetry Frames (120 Mbps)',
      outputs: 'Decoded L0 Raw Swath Chunks in Shared Memory',
    },
    stage_cal: {
      math: 'L_{\\lambda} = G_{\\lambda} \\cdot (C - C_0) + \\Delta L_{\\text{inst}}',
      description: 'Converts instrument digital count values to calibrated spectral radiances and brightness temperatures. Performs real-time geometric image navigation and registration (INR) with sub-pixel parallax correction.',
      kernels: ['radiometric_gain_correction_avx512', 'ellipsoidal_geolocation_transform', 'solar_zenith_parallax_warp'],
      inputs: 'L0 Demuxed Sensor Counts & Ephemeris Vectors',
      outputs: 'Calibrated L1b Top-of-Atmosphere Radiances (Tb [K])',
    },
    stage_optflow: {
      math: '\\min_{\\vec{u}} \\int (\\nabla I \\cdot \\vec{u} + I_t)^2 + \\alpha^2 (|\\nabla u|^2 + |\\nabla v|^2) d\\Omega',
      description: 'Computes multi-level Atmospheric Motion Vectors (AMVs) by cross-correlating successive thermal IR and water vapor cloud swaths. Tracks cloud motion vectors across tropospheric pressure altitudes.',
      kernels: ['cross_correlation_fft_cuda', 'dense_optical_flow_horn_schunck', 'cloud_drift_height_assigner'],
      inputs: 'Consecutive L1b 10-Minute Full Disc Swaths (10.3 µm & 6.9 µm)',
      outputs: 'Horizontal Wind Vectors (u, v) at 850, 500, 300, 200 hPa',
    },
    stage_4dvar: {
      math: 'J(x) = \\frac{1}{2}(x - x_b)^T B^{-1}(x - x_b) + \\frac{1}{2}(y - \\mathcal{H}(x))^T R^{-1}(y - \\mathcal{H}(x))',
      description: 'Solves the 4-Dimensional Variational Data Assimilation problem over a 6-hour rolling window. Blends satellite radiances with background ensemble fields using an iterative preconditioned Conjugate Gradient solver.',
      kernels: ['enkf_covariance_perturbation', 'cg_minimizer_lanczos', 'adjoint_observation_operator_H'],
      inputs: 'L1b Radiances + L2 AMVs + Background Ensemble State',
      outputs: 'Analysis Atmospheric State Vector x_a (Optimal Initial Conditions)',
    },
    stage_dyn_core: {
      math: '\\frac{\\partial \\rho}{\\partial t} + \\nabla \\cdot (\\rho \\vec{u}) = 0, \\quad \\frac{D\\vec{u}}{Dt} + 2\\vec{\\Omega} \\times \\vec{u} = -\\frac{1}{\\rho}\\nabla p + \\vec{g} + \\vec{F}',
      description: 'High-resolution non-hydrostatic dynamical atmospheric core running on an icosahedral hexagonal mesh grid (0.1° resolution). Solves fully compressible Euler/Navier-Stokes equations with physics parameterizations.',
      kernels: ['icosahedral_flux_reconstruction', 'nonhydrostatic_acoustic_step', 'cloud_microphysics_thompson'],
      inputs: 'Initial State Vector x_a + Radiative Boundary Forcing',
      outputs: 'High-Resolution 72-Hour Prognostic Forecast Fields',
    },
    stage_distribution: {
      math: '\\text{ZarrChunk}_{i,j,k} = \\text{BloscCompress}(\\mathcal{F}_{\\text{model}}(t))',
      description: 'Real-time multi-threaded compression and broadcasting into cloud-native NetCDF-4, Zarr, and web map tile caches. Synchronizes streaming feeds to research clusters and operational disaster centers.',
      kernels: ['blosc_zstd_parallel_compress', 'geotiff_pyramid_generator', 'websocket_telemetry_broadcast'],
      inputs: 'Model Forecast Grid & Extreme Alert Events',
      outputs: 'Cloud Zarr Datastores & Operational GeoTIFF Slices',
    },
  };

  const details = stageDetails[selectedStage.id] || stageDetails['stage_4dvar'];
  const totalThroughput = stages.reduce((acc, s) => acc + s.throughputMBs, 0);
  const totalLatency = stages.reduce((acc, s) => acc + s.latencyMs, 0);

  return (
    <div className={`w-full border rounded-lg p-5 flex flex-col gap-6 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0a0e1a] border-slate-800 text-slate-100'
    }`}>
      {/* Header and Topology Title */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <div className="text-xs uppercase font-mono font-semibold tracking-wider flex items-center gap-2">
            <span className={isLight ? 'text-cyan-700' : 'text-cyan-400'}>Parallel Architecture</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>·</span>
            <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Directed Acyclic Graph (DAG) Pipeline</span>
          </div>
          <h3 className={`text-lg font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            Heterogeneous Data Ingestion & 4D-Var Data Assimilation DAG
          </h3>
        </div>

        <div className={`flex items-center gap-4 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          <div>
            <span>Aggregate Throughput: </span>
            <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              {(totalThroughput / 1024).toFixed(2)} GB/s
            </span>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>|</span>
          <div>
            <span>End-to-End Latency: </span>
            <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {totalLatency.toFixed(1)} ms
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline DAG Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const isSelected = stage.id === selectedStageId;
          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={`text-left p-3 rounded-lg border transition-all relative flex flex-col justify-between gap-3 cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-cyan-50/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/15 ring-1 ring-cyan-500/30'
                  : isLight
                    ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    : 'bg-[#06080e] border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Stage Step Badge */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  Stage 0{idx + 1}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                    stage.status === 'busy'
                      ? isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {stage.status}
                </span>
              </div>

              {/* Stage Name */}
              <div>
                <h4 className={`text-xs font-semibold line-clamp-2 leading-tight ${
                  isLight ? 'text-slate-900' : 'text-slate-200'
                }`}>
                  {stage.name}
                </h4>
              </div>

              {/* Stage Telemetry Metrics */}
              <div className={`space-y-1 font-mono text-[11px] pt-2 border-t ${
                isLight ? 'border-slate-200' : 'border-slate-800/80'
              }`}>
                <div className={`flex justify-between ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>Throughput:</span>
                  <span className={`tabular-nums font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                    {stage.throughputMBs} MB/s
                  </span>
                </div>
                <div className={`flex justify-between ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>Latency:</span>
                  <span className={`tabular-nums ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {stage.latencyMs} ms
                  </span>
                </div>
                <div className={`flex items-center justify-between pt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>Workers:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustWorkers(stage.id, -2);
                      }}
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] leading-none ${
                        isLight 
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      -
                    </button>
                    <span className={`font-bold tabular-nums ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      {stage.assignedWorkers}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustWorkers(stage.id, 2);
                      }}
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] leading-none ${
                        isLight 
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Deep-Dive Inspection Panel */}
      <div className={`rounded-lg border p-5 flex flex-col gap-4 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
      }`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <Cpu className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Stage Architecture: {selectedStage.name}
            </h4>
          </div>
          <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Active Compute Vector: <span className={`font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>{selectedStage.opsPerSec}</span>
          </span>
        </div>

        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          {details.description}
        </p>

        {/* Mathematical Formulation */}
        <div className={`p-3 rounded border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/80'
        }`}>
          <span className={`text-[11px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Governing Physical Equation / Variational Functional
          </span>
          <code className={`text-xs font-mono tracking-wide block overflow-x-auto py-1 ${
            isLight ? 'text-cyan-800 font-semibold' : 'text-cyan-300'
          }`}>
            {details.math}
          </code>
        </div>

        {/* Parallel Kernel Execution Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/80'}`}>
            <span className={`text-[11px] uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Upstream Inputs</span>
            <span className={`leading-tight block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{details.inputs}</span>
          </div>
          <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/80'}`}>
            <span className={`text-[11px] uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Downstream Sinks</span>
            <span className={`leading-tight block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{details.outputs}</span>
          </div>
          <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800/80'}`}>
            <span className={`text-[11px] uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Active SIMD & Tensor Kernels</span>
            <div className="space-y-0.5">
              {details.kernels.map((k) => (
                <div key={k} className={`text-[11px] flex items-center gap-1 ${isLight ? 'text-cyan-800 font-medium' : 'text-cyan-300'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-cyan-600' : 'bg-cyan-400'}`} />
                  <span>{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4D-Var Variational Minimization Workbench */}
      <div className={`rounded-lg border p-5 flex flex-col gap-4 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
      }`}>
        <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-3 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <TrendingDown className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <h4 className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              4D-Var Preconditioned Conjugate Gradient Solver Convergence
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Lanczos Iteration: <strong className={isLight ? 'text-cyan-700' : 'text-cyan-400'}>{solverIteration} / 12</strong>
            </span>
            <button
              onClick={handleRun4DVarSolver}
              disabled={isSolving4DVar}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                isSolving4DVar
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              {isSolving4DVar ? 'Assimilating Swath...' : 'Trigger Variational Step'}
            </button>
          </div>
        </div>

        {/* Cost Function Minimization Sparkline Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className={`lg:col-span-8 p-4 rounded border flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
          }`}>
            <div className={`flex items-center justify-between text-xs font-mono mb-2 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              <span>Cost Function J(x) Evolution</span>
              <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                J_min: {costHistory[costHistory.length - 1].toLocaleString()} (||∇J|| = 4.12e-5)
              </span>
            </div>

            {/* SVG Convergence Curve */}
            <svg viewBox="0 0 500 120" className="w-full h-28">
              {/* Background horizontal guidelines */}
              <line x1="10" y1="20" x2="490" y2="20" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="3 3" />
              <line x1="10" y1="60" x2="490" y2="60" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="3 3" />
              <line x1="10" y1="100" x2="490" y2="100" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="3 3" />

              {/* Cost curve */}
              {costHistory.length > 1 && (
                <path
                  d={costHistory.reduce((acc, cost, i) => {
                    const x = 20 + (i / (costHistory.length - 1)) * 460;
                    const maxCost = Math.max(...costHistory, 15000);
                    const y = 105 - (cost / maxCost) * 85;
                    return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }, '')}
                  fill="none"
                  stroke={isLight ? '#059669' : '#10b981'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Data points */}
              {costHistory.map((cost, i) => {
                const x = 20 + (i / Math.max(1, costHistory.length - 1)) * 460;
                const maxCost = Math.max(...costHistory, 15000);
                const y = 105 - (cost / maxCost) * 85;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill={isLight ? '#059669' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>

          {/* Innovation Vector Statistics */}
          <div className="lg:col-span-4 flex flex-col gap-2.5 text-xs font-mono">
            <div className={`p-2.5 rounded border flex justify-between items-center ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
            }`}>
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Background Penalty J_b:</span>
              <span className={`font-bold tabular-nums ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>48.2 (EnKF)</span>
            </div>
            <div className={`p-2.5 rounded border flex justify-between items-center ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
            }`}>
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Radiance Innovation (y - Hx):</span>
              <span className={`font-bold tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>0.24 K RMS</span>
            </div>
            <div className={`p-2.5 rounded border flex justify-between items-center ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
            }`}>
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Lanczos Krylov Space Dim:</span>
              <span className={`font-bold tabular-nums ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>m = 32</span>
            </div>
            <div className={`p-2.5 rounded border flex justify-between items-center ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'
            }`}>
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Covariance Preconditioner:</span>
              <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Cholesky L·L^T</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
