import React, { useState } from 'react';
import { WorkerCore } from '../types/weather';
import { useTheme } from '../context/ThemeContext';
import { Cpu, Server, Zap, Flame, HardDrive, RefreshCw, Activity, ShieldCheck, X } from 'lucide-react';

interface ClusterWorkerMatrixProps {
  workers: WorkerCore[];
  workerCount: number;
  setWorkerCount: (count: number) => void;
}

export const ClusterWorkerMatrix: React.FC<ClusterWorkerMatrixProps> = ({
  workers: initialWorkers,
  workerCount,
  setWorkerCount,
}) => {
  const { isLight } = useTheme();
  const [workers, setWorkers] = useState<WorkerCore[]>(initialWorkers);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedWorker, setSelectedWorker] = useState<WorkerCore | null>(null);

  // Sync when initialWorkers changes from parent
  React.useEffect(() => {
    setWorkers(initialWorkers);
  }, [initialWorkers]);

  // Aggregate cluster stats
  const filteredWorkers = workers.filter((w) => filterType === 'ALL' || w.coreType === filterType);
  const avgUtil = Math.round(
    workers.reduce((acc, w) => acc + w.utilization, 0) / (workers.length || 1)
  );
  const avgTemp = (
    workers.reduce((acc, w) => acc + w.temperatureC, 0) / (workers.length || 1)
  ).toFixed(1);
  const totalMemGB = (
    workers.reduce((acc, w) => acc + w.memoryUsageMB, 0) / 1024
  ).toFixed(1);
  const estimatedTflops = ((workerCount * 4.2) * (avgUtil / 100)).toFixed(1);

  // Actions
  const handleThermalFlush = () => {
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        temperatureC: Math.max(38, w.temperatureC - 14),
      }))
    );
  };

  const handleSimulateSurge = () => {
    setWorkers((prev) =>
      prev.map((w) => {
        const surge = Math.min(99, w.utilization + Math.floor(Math.random() * 22) + 10);
        return {
          ...w,
          utilization: surge,
          temperatureC: Math.min(88, w.temperatureC + 8),
          status: surge > 92 ? 'busy' : 'running',
        };
      })
    );
  };

  const handleRebalance = () => {
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        utilization: Math.round(65 + (Math.random() - 0.5) * 12),
        temperatureC: 56,
        status: 'running',
      }))
    );
  };

  return (
    <div className={`w-full border rounded-lg p-5 flex flex-col gap-6 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0a0e1a] border-slate-800 text-slate-100'
    }`}>
      {/* Cluster Header */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <div className="text-xs uppercase font-mono font-semibold tracking-wider flex items-center gap-2">
            <span className={isLight ? 'text-cyan-700' : 'text-cyan-400'}>High-Performance Computing Cluster</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>·</span>
            <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Heterogeneous SIMD & Tensor Worker Pool</span>
          </div>
          <h3 className={`text-lg font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            Distributed Parallel Worker Matrix ({workerCount} Virtual Cores)
          </h3>
        </div>

        {/* Scaler & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleThermalFlush}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                isLight
                  ? 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200'
                  : 'text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60'
              }`}
              title="Activate Liquid Coolant Loop"
            >
              <Flame className={`w-3.5 h-3.5 rotate-180 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
              Cooling Flush
            </button>
            <button
              onClick={handleSimulateSurge}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                isLight
                  ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  : 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60'
              }`}
              title="Inject Satellite Telemetry Burst"
            >
              <Zap className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              Workload Surge
            </button>
            <button
              onClick={handleRebalance}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                isLight
                  ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                  : 'text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80'
              }`}
              title="Equally Distribute Load Across NUMA Nodes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rebalance
            </button>
          </div>

          <div className={`h-4 w-px mx-1 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />

          {/* Concurrency Scaler Controls */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#06080e] border-slate-800 text-slate-400'
          }`}>
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Cores:</span>
            {[8, 16, 32, 64].map((count) => (
              <button
                key={count}
                onClick={() => setWorkerCount(count)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  workerCount === count
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Aggregate Cluster KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
        }`}>
          <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Compute Power</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-bold font-mono tabular-nums ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              {estimatedTflops}
            </span>
            <span className="text-xs font-mono uppercase text-slate-500">TFLOPS FP32</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            AVX-512 & Tensor Core Fusion
          </span>
        </div>

        <div className={`p-3.5 rounded border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
        }`}>
          <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Mean Utilization</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-bold font-mono tabular-nums ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {avgUtil}%
            </span>
            <span className="text-xs font-mono uppercase text-slate-500">Aggregate Load</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Zero Thread Stalls Detected
          </span>
        </div>

        <div className={`p-3.5 rounded border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
        }`}>
          <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Cluster DRAM Footprint</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-bold font-mono tabular-nums ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {totalMemGB}
            </span>
            <span className="text-xs font-mono uppercase text-slate-500">GB Assigned</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Bandwidth: 1.68 TB/s HBM3
          </span>
        </div>

        <div className={`p-3.5 rounded border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#06080e] border-slate-800'
        }`}>
          <span className={`text-[11px] uppercase font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Thermal Envelope</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-bold font-mono tabular-nums ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
              {avgTemp}°C
            </span>
            <span className="text-xs font-mono uppercase text-slate-500">Junction Temp</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Chiller Delta: -22.4°C Sub-ambient
          </span>
        </div>
      </div>

      {/* Individual Worker Core Matrix Grid */}
      <div>
        <div className={`flex flex-wrap items-center justify-between gap-3 mb-3 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {/* Node Filter Tabs */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#06080e] border-slate-800'
          }`}>
            {['ALL', 'GPU_TENSOR', 'SIMD_AVX512', 'DYNAMIC_SOLVER', 'IO_INGEST'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-0.5 rounded transition-colors text-[11px] ${
                  filterType === type
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>&lt;80% Normal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>80-92% High</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>&gt;92% Saturated</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {filteredWorkers.map((worker) => {
            const isSelected = selectedWorker?.id === worker.id;
            const utilColor =
              worker.utilization > 92
                ? isLight ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-rose-500/60 bg-rose-950/20 text-rose-300'
                : worker.utilization > 80
                ? isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-500/60 bg-amber-950/20 text-amber-300'
                : isLight ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300' : 'border-slate-800 bg-[#06080e] text-slate-300 hover:border-slate-700';

            return (
              <div
                key={worker.id}
                onClick={() => setSelectedWorker(worker)}
                className={`p-2.5 rounded border flex flex-col justify-between transition-all cursor-pointer ${utilColor} ${
                  isSelected ? 'ring-2 ring-cyan-500 scale-[1.02]' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={`font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>C-{worker.id < 10 ? `0${worker.id}` : worker.id}</span>
                  <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{worker.nodeName.split(' ')[0]}</span>
                </div>

                <div className="my-1.5 text-center">
                  <span className="text-base font-bold font-mono tabular-nums block">
                    {worker.utilization}%
                  </span>
                  <div className={`w-full h-1 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-slate-200' : 'bg-slate-800/80'}`}>
                    <div
                      className={`h-full ${
                        worker.utilization > 92
                          ? 'bg-rose-500'
                          : worker.utilization > 80
                          ? 'bg-amber-500'
                          : isLight ? 'bg-emerald-600' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${worker.utilization}%` }}
                    />
                  </div>
                </div>

                <div className={`text-[9px] font-mono truncate text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {worker.currentTask.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Worker Core Hardware Detail Drawer */}
      {selectedWorker && (
        <div className={`rounded-lg border p-4.5 flex flex-col gap-3 shadow-xl ${
          isLight ? 'bg-slate-50 border-cyan-300' : 'bg-[#06080e] border-cyan-500/40'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2.5 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <Cpu className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
              <h4 className={`text-sm font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Hardware Core Telemetry: Core #{selectedWorker.id} ({selectedWorker.nodeName})
              </h4>
            </div>
            <button
              onClick={() => setSelectedWorker(null)}
              className={isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'}`}>
              <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Core Architecture</span>
              <span className={`font-bold text-sm block mt-0.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{selectedWorker.coreType}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>512-bit FMA Vector Register</span>
            </div>
            <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'}`}>
              <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>IPC Execution Score</span>
              <span className={`font-bold text-sm block mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>2.48 IPC</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>L1/L2 Hit: 99.1%</span>
            </div>
            <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'}`}>
              <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Thermal Headroom</span>
              <span className={`font-bold text-sm block mt-0.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{selectedWorker.temperatureC}°C</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>TjMax: 105°C (+{(105 - selectedWorker.temperatureC)}°C headroom)</span>
            </div>
            <div className={`p-3 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f1d] border-slate-800'}`}>
              <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Current Kernel</span>
              <span className={`font-bold text-xs block mt-0.5 truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{selectedWorker.currentTask}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>RAM: {selectedWorker.memoryUsageMB} MB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
