import { PipelineStage, WorkerCore } from '../types/weather';

export const INITIAL_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage_ingest',
    name: 'CCSDS Telemetry Stream Ingest',
    category: 'ingest',
    assignedWorkers: 4,
    queueDepth: 142,
    latencyMs: 1.8,
    throughputMBs: 437.5,
    status: 'active',
    opsPerSec: '1.82M pkts/s',
  },
  {
    id: 'stage_cal',
    name: 'L1b Radiometric & Geolocation Calibration',
    category: 'calibration',
    assignedWorkers: 8,
    queueDepth: 38,
    latencyMs: 4.2,
    throughputMBs: 382.1,
    status: 'active',
    opsPerSec: '8.44 GFLOPS',
  },
  {
    id: 'stage_optflow',
    name: 'Atmospheric Motion Vectors (AMV Optical Flow)',
    category: 'optical_flow',
    assignedWorkers: 6,
    queueDepth: 19,
    latencyMs: 6.5,
    throughputMBs: 310.4,
    status: 'active',
    opsPerSec: '12.8 TFLOPS',
  },
  {
    id: 'stage_4dvar',
    name: '4D-Var Ensemble Kalman Assimilation (EnKF)',
    category: 'assimilation',
    assignedWorkers: 10,
    queueDepth: 8,
    latencyMs: 14.1,
    throughputMBs: 245.0,
    status: 'busy',
    opsPerSec: '34.2 TFLOPS',
  },
  {
    id: 'stage_dyn_core',
    name: 'Non-Hydrostatic Primitive Dynamical Core (0.1°)',
    category: 'dynamical_core',
    assignedWorkers: 8,
    queueDepth: 4,
    latencyMs: 18.9,
    throughputMBs: 188.6,
    status: 'busy',
    opsPerSec: '58.6 TFLOPS',
  },
  {
    id: 'stage_distribution',
    name: 'NetCDF-4 / Zarr Cloud Stream Sink',
    category: 'distribution',
    assignedWorkers: 4,
    queueDepth: 12,
    latencyMs: 2.1,
    throughputMBs: 480.0,
    status: 'active',
    opsPerSec: '940 MB/s',
  },
];

export function generateWorkerCluster(workerCount: number = 32): WorkerCore[] {
  const nodes = ['Node-α (Calib)', 'Node-β (OptFlow)', 'Node-γ (4D-Var)', 'Node-δ (DynCore)'];
  const types: ('SIMD_AVX512' | 'GPU_TENSOR' | 'DYNAMIC_SOLVER' | 'IO_INGEST')[] = [
    'SIMD_AVX512',
    'GPU_TENSOR',
    'DYNAMIC_SOLVER',
    'DYNAMIC_SOLVER',
  ];

  const tasks = [
    'Scanline Parallax Correction',
    'ABI Band 13 FFT Radiance FFT',
    'EnKF Perturbation Matrix Mult',
    'Navier-Stokes Advection Flux',
    'Cross-Track Sounding Inversion',
    'Cloud Top AMV Optical Tracking',
    'Kalman Gain Cholesky Decomp',
    'Coriolis Vorticity Integration',
  ];

  return Array.from({ length: workerCount }, (_, i) => {
    const nodeIdx = Math.floor((i / workerCount) * 4);
    const util = 72 + Math.sin(i * 1.5) * 22;
    return {
      id: i + 1,
      nodeName: nodes[nodeIdx],
      coreType: types[nodeIdx],
      utilization: Math.round(Math.max(25, Math.min(99, util))),
      temperatureC: Math.round(52 + (util / 100) * 26),
      memoryUsageMB: Math.round(1800 + Math.random() * 2200),
      currentTask: tasks[i % tasks.length],
      status: util > 92 ? 'busy' : 'running',
    };
  });
}
