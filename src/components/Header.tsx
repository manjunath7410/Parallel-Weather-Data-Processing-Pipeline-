import React from 'react';
import { Play, Square, Download, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface HeaderProps {
  isRunning: boolean;
  onTogglePipeline: () => void;
  activeTab: 'monitor' | 'pipeline' | 'cluster' | 'sounding' | 'satellites';
  setActiveTab: (tab: 'monitor' | 'pipeline' | 'cluster' | 'sounding' | 'satellites') => void;
  onExportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onTogglePipeline,
  activeTab,
  setActiveTab,
  onExportClick,
}) => {
  const { themeMode, setThemeMode, effectiveTheme } = useTheme();

  return (
    <div className="w-full flex flex-col bg-[#07090e] dark:bg-[#07090e] light:bg-slate-100 border-b border-slate-800 dark:border-slate-800 light:border-slate-300 shrink-0 select-none z-30 transition-colors">
      <header className="w-full flex items-center justify-between gap-6 px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#monitor"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('monitor');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 rotate-45 inline-block" />
          AeroStream Engine
        </a>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400 dark:text-slate-400 light:text-slate-600">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'monitor' ? 'text-cyan-400 dark:text-cyan-400 light:text-cyan-600 border-b-2 border-cyan-400 font-semibold' : ''
            }`}
          >
            Global Monitor
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'pipeline' ? 'text-cyan-400 dark:text-cyan-400 light:text-cyan-600 border-b-2 border-cyan-400 font-semibold' : ''
            }`}
          >
            Parallel DAG
          </button>
          <button
            onClick={() => setActiveTab('cluster')}
            className={`hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'cluster' ? 'text-cyan-400 dark:text-cyan-400 light:text-cyan-600 border-b-2 border-cyan-400 font-semibold' : ''
            }`}
          >
            Compute Cluster
          </button>
          <button
            onClick={() => setActiveTab('sounding')}
            className={`hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'sounding' ? 'text-cyan-400 dark:text-cyan-400 light:text-cyan-600 border-b-2 border-cyan-400 font-semibold' : ''
            }`}
          >
            Atmospheric Sounding
          </button>
          <button
            onClick={() => setActiveTab('satellites')}
            className={`hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'satellites' ? 'text-cyan-400 dark:text-cyan-400 light:text-cyan-600 border-b-2 border-cyan-400 font-semibold' : ''
            }`}
          >
            Satellite Constellation
          </button>
        </nav>

        {/* Zone 3: 1 primary action + Theme Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme Selector segmented control */}
          <div className="flex items-center p-1 bg-slate-900 dark:bg-slate-900 light:bg-slate-200 rounded-lg border border-slate-800 dark:border-slate-800 light:border-slate-300">
            <button
              onClick={() => setThemeMode('light')}
              className={`p-1.5 rounded transition-colors ${
                themeMode === 'light'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`p-1.5 rounded transition-colors ${
                themeMode === 'dark'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setThemeMode('system')}
              className={`p-1.5 rounded transition-colors ${
                themeMode === 'system'
                  ? 'bg-slate-700 text-cyan-300 font-bold shadow-sm'
                  : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200'
              }`}
              title="System Preference"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onExportClick}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-950 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700/80 dark:border-slate-700/80 light:border-slate-300 rounded transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Data
          </button>
          <button
            onClick={onTogglePipeline}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 shadow-sm ${
              isRunning
                ? 'bg-rose-500/20 text-rose-300 dark:text-rose-300 light:text-rose-700 hover:bg-rose-500/30 border border-rose-500/40'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Pause Ingest
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Pipeline
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Navigation Strip */}
      <div className="md:hidden flex items-center overflow-x-auto gap-4 px-4 py-2 border-t border-slate-800 dark:border-slate-800 light:border-slate-300 text-xs font-medium text-slate-400 dark:text-slate-400 light:text-slate-600 whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`shrink-0 ${activeTab === 'monitor' ? 'text-cyan-400 font-bold' : 'hover:text-white'}`}
        >
          Global Monitor
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`shrink-0 ${activeTab === 'pipeline' ? 'text-cyan-400 font-bold' : 'hover:text-white'}`}
        >
          Parallel DAG
        </button>
        <button
          onClick={() => setActiveTab('cluster')}
          className={`shrink-0 ${activeTab === 'cluster' ? 'text-cyan-400 font-bold' : 'hover:text-white'}`}
        >
          Compute Cluster
        </button>
        <button
          onClick={() => setActiveTab('sounding')}
          className={`shrink-0 ${activeTab === 'sounding' ? 'text-cyan-400 font-bold' : 'hover:text-white'}`}
        >
          Sounding (Skew-T)
        </button>
        <button
          onClick={() => setActiveTab('satellites')}
          className={`shrink-0 ${activeTab === 'satellites' ? 'text-cyan-400 font-bold' : 'hover:text-white'}`}
        >
          Satellites
        </button>
      </div>
    </div>
  );
};
