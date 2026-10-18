/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Zap,
  Layers,
  Database,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Download,
  Info,
  Award,
  ChevronDown,
  Sparkles,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import type { CellConfiguration, CellPerformanceMetrics } from '../battery/types.ts';
import { BATTERY_PRESETS } from '../battery/materials.ts';

export type AppTabType = 'builder' | 'analytics' | 'paths' | 'verify' | 'industry' | 'mcp' | 'pubchem';

interface HeaderProps {
  currentConfig: CellConfiguration;
  metrics: CellPerformanceMetrics;
  activeTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId: string | null;
  onOpenInfoModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentConfig,
  metrics,
  activeTab,
  onSelectTab,
  onSelectPreset,
  activePresetId,
  onOpenInfoModal,
}) => {
  const [isPresetsDropdownOpen, setIsPresetsDropdownOpen] = useState(false);

  const getSafetyBadge = () => {
    if (metrics.safetyScore >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Safety: {metrics.safetyScore}/100
        </span>
      );
    }
    if (metrics.safetyScore >= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          Safety: {metrics.safetyScore}/100
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
        <Flame className="w-3.5 h-3.5 text-rose-600" />
        Safety: {metrics.safetyScore}/100
      </span>
    );
  };

  const handleExportJson = () => {
    const exportData = {
      app: 'ElectroMCP Battery Toolkit',
      timestamp: new Date().toISOString(),
      configuration: currentConfig,
      computedMetrics: metrics,
      provenance: 'Electrochemical Butler-Volmer & PubChem Verification Engine',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battery-cell-spec-${currentConfig.cathodeId}-${currentConfig.formFactorId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePreset = BATTERY_PRESETS.find((p) => p.id === activePresetId);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">ElectroMCP</span>
                <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 rounded border border-blue-200">
                  MCP v2024-11
                </span>
                <span className="hidden md:inline px-1.5 py-0.5 text-[10px] font-mono font-bold bg-rose-50 text-rose-700 rounded border border-rose-200">
                  70 Hard Tests
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-xs">
                Electrochemical Cell Architecture & Stress Simulator
              </p>
            </div>
          </div>

          {/* Quick Metrics HUD (compact & responsive) */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-50/90 border border-slate-200/90 px-3 py-1 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-mono">Capacity</span>
              <span className="font-mono font-bold text-slate-900">{metrics.cellCapacityAh} Ah</span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-mono">Energy</span>
              <span className="font-mono font-bold text-blue-700">{metrics.gravimetricEnergyDensityWhKg} Wh/kg</span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-mono">Voltage</span>
              <span className="font-mono font-bold text-slate-900">{metrics.nominalVoltageV} V</span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-mono">N/P Ratio</span>
              <span className={`font-mono font-bold ${metrics.npStatus === 'optimal' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {metrics.npRatio}
              </span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>{getSafetyBadge()}</div>
          </div>

          {/* Right Controls: Presets Dropdown & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Presets Quick Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPresetsDropdownOpen(!isPresetsDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                title="Select commercial battery cell preset"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Preset:</span>
                <span className="max-w-[110px] truncate text-slate-900 font-bold">
                  {activePreset ? activePreset.name.split(' (')[0].replace('Tesla ', '').replace('BYD Blade Style ', 'BYD Blade ') : 'Custom'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isPresetsDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPresetsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold">
                      Industry Cell Presets
                    </div>
                    {BATTERY_PRESETS.map((preset) => {
                      const isSelected = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            onSelectPreset(preset.id);
                            setIsPresetsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{preset.name}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                          </div>
                          <span className="text-[10px] font-normal text-slate-500 line-clamp-1">
                            {preset.tagline}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleExportJson}
              aria-label="Export cell specifications as JSON"
              title="Download cell specifications as JSON"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Export</span>
            </button>

            <button
              onClick={onOpenInfoModal}
              aria-label="Show battery science and MCP documentation"
              title="Science & MCP Documentation"
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center justify-between pb-2 pt-1 border-t border-slate-100 overflow-x-auto no-scrollbar gap-2">
          {/* Main Navigation Tabs */}
          <nav className="flex items-center space-x-1 shrink-0 py-0.5" aria-label="Tabs">
            <button
              onClick={() => onSelectTab('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'builder'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Cell Builder
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Live Analytics
            </button>

            <button
              onClick={() => onSelectTab('paths')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'paths'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Simulation Paths
            </button>

            <button
              onClick={() => onSelectTab('verify')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'verify'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              100% Math Engine
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeTab === 'verify' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                100%
              </span>
            </button>

            <button
              onClick={() => onSelectTab('industry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'industry'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              70 Industry Tests
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeTab === 'industry' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                70
              </span>
            </button>

            <button
              onClick={() => onSelectTab('mcp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'mcp'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              MCP Console
            </button>

            <button
              onClick={() => onSelectTab('pubchem')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'pubchem'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Chemical API & PubChem
            </button>
          </nav>

          {/* Quick preset chips on desktop */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs shrink-0 font-medium">
            <span className="text-[10px] font-mono text-slate-400">Quick:</span>
            {BATTERY_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  aria-pressed={isSelected}
                  title={preset.tagline}
                  className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset.name.split(' (')[0].replace('Tesla ', '').replace('BYD Blade Style ', 'BYD Blade ')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
