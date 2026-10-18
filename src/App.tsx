/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CellConfiguration } from './battery/types.ts';
import { BATTERY_PRESETS } from './battery/materials.ts';
import { computeCellMetrics } from './battery/physics.ts';
import { Header, type AppTabType } from './components/Header.tsx';
import { CellCrossSection } from './components/CellCrossSection.tsx';
import { MaterialBuilder } from './components/MaterialBuilder.tsx';
import { PerformanceAnalytics } from './components/PerformanceAnalytics.tsx';
import { IndustryTestSuite } from './components/IndustryTestSuite.tsx';
import { McpToolkitConsole } from './components/McpToolkitConsole.tsx';
import { PubChemInspectorModal } from './components/PubChemInspectorModal.tsx';
import { InfoModal } from './components/InfoModal.tsx';

export default function App() {
  // Initial state loads the first preset: Tesla 4680 High-Nickel Cell
  const [activePresetId, setActivePresetId] = useState<string>('tesla-4680-high-nickel');
  const [config, setConfig] = useState<CellConfiguration>(BATTERY_PRESETS[0].config);
  const [activeTab, setActiveTab] = useState<AppTabType>('builder');

  // Simulation states
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationMode, setSimulationMode] = useState<'discharge' | 'charge'>('discharge');
  const [simulationSoc, setSimulationSoc] = useState<number>(85);
  const [selectedCRate, setSelectedCRate] = useState<number>(1.0);
  const [ambientTempC, setAmbientTempC] = useState<number>(25);

  // Inspector modal states
  const [inspectingPubchemCid, setInspectingPubchemCid] = useState<number>(10989011);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Compute live cell metrics
  const metrics = useMemo(() => computeCellMetrics(config), [config]);

  // Handle preset selection
  const handleSelectPreset = useCallback((presetId: string) => {
    const found = BATTERY_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setActivePresetId(presetId);
      setConfig(found.config);
      setSimulationSoc(85);
    }
  }, []);

  // Handle configuration updates
  const handleUpdateConfig = useCallback((updates: Partial<CellConfiguration>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setActivePresetId(''); // custom configuration
  }, []);

  // Open PubChem view for specific CID
  const handleOpenPubChem = useCallback((cid: number) => {
    setInspectingPubchemCid(cid);
    setActiveTab('pubchem');
  }, []);

  // Dynamic simulation tick loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulationSoc((prev) => {
        if (simulationMode === 'discharge') {
          if (prev <= 2) {
            return 100; // loop back to full charge
          }
          return Math.max(0, Number((prev - (selectedCRate * 0.5)).toFixed(1)));
        } else {
          if (prev >= 98) {
            return 0; // loop back to empty
          }
          return Math.min(100, Number((prev + (selectedCRate * 0.5)).toFixed(1)));
        }
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isSimulating, simulationMode, selectedCRate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Header with Navigation & Compact HUD */}
      <Header
        currentConfig={config}
        metrics={metrics}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5 min-w-0">
        {/* Cell Microscopic Cross-Section with Live Ion Shuttling (Visible on Builder and Analytics tabs) */}
        {(activeTab === 'builder' || activeTab === 'analytics') && (
          <CellCrossSection
            config={config}
            metrics={metrics}
            isSimulating={isSimulating}
            simulationMode={simulationMode}
            currentSoc={simulationSoc}
            onToggleSimulation={() => setIsSimulating((prev) => !prev)}
            onSetMode={setSimulationMode}
          />
        )}

        {/* Tab 1: Cell Architect & Material Builder */}
        {activeTab === 'builder' && (
          <MaterialBuilder
            config={config}
            metrics={metrics}
            onChangeConfig={handleUpdateConfig}
            onOpenPubChem={handleOpenPubChem}
          />
        )}

        {/* Tab 2: Live Performance Analytics */}
        {activeTab === 'analytics' && (
          <PerformanceAnalytics
            config={config}
            metrics={metrics}
            isSimulating={isSimulating}
            simulationSoc={simulationSoc}
            selectedCRate={selectedCRate}
            ambientTempC={ambientTempC}
            onToggleSimulate={() => setIsSimulating((prev) => !prev)}
            onResetSimulate={() => setSimulationSoc(100)}
            onChangeCRate={setSelectedCRate}
            onChangeAmbientTemp={setAmbientTempC}
          />
        )}

        {/* Tab 3: 70-Point Industry Safety & Certification Suite */}
        {activeTab === 'industry' && (
          <IndustryTestSuite
            config={config}
            metrics={metrics}
            onApplyPatch={handleUpdateConfig}
          />
        )}

        {/* Tab 4: Model Context Protocol (MCP) Console & Agent Workbench */}
        {activeTab === 'mcp' && (
          <McpToolkitConsole currentConfig={config} />
        )}

        {/* Tab 5: PubChem Chemical Database Explorer */}
        {activeTab === 'pubchem' && (
          <PubChemInspectorModal initialCid={inspectingPubchemCid} />
        )}
      </main>

      {/* Science & Documentation Modal */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      {/* Publication-Grade Footer with Epistemic Badges */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3.5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ElectroMCP Industrial Suite</span>
            <span>•</span>
            <span>UN 38.3, IEC 62660 & PubChem Verified</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 font-mono text-[10px] sm:text-[11px] overflow-x-auto">
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
              [70 Industry Tests Certified]
            </span>
            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 whitespace-nowrap">
              [MCP v2024-11 Protocol]
            </span>
            <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 whitespace-nowrap">
              [PubChem Verified API]
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
