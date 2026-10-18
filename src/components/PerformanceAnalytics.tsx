/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Zap,
  TrendingDown,
  Flame,
  Thermometer,
  RotateCcw,
  Play,
  Pause,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { CellConfiguration, CellPerformanceMetrics } from '../battery/types.ts';
import {
  generateDischargeCurve,
  generateRagonePlot,
  projectCycleLife,
} from '../battery/physics.ts';

interface PerformanceAnalyticsProps {
  config: CellConfiguration;
  metrics: CellPerformanceMetrics;
  isSimulating: boolean;
  simulationSoc: number; // 0 to 100
  selectedCRate: number;
  ambientTempC: number;
  onToggleSimulate: () => void;
  onResetSimulate: () => void;
  onChangeCRate: (cRate: number) => void;
  onChangeAmbientTemp: (tempC: number) => void;
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  config,
  metrics,
  isSimulating,
  simulationSoc,
  selectedCRate,
  ambientTempC,
  onToggleSimulate,
  onResetSimulate,
  onChangeCRate,
  onChangeAmbientTemp,
}) => {
  const [activeChart, setActiveChart] = useState<'voltage' | 'ragone' | 'thermal' | 'degradation' | 'mass'>('voltage');

  // Compute multi-C-rate curves for comparison
  const curve02C = useMemo(() => generateDischargeCurve(metrics, config, 0.2, ambientTempC), [metrics, config, ambientTempC]);
  const curve1C = useMemo(() => generateDischargeCurve(metrics, config, 1.0, ambientTempC), [metrics, config, ambientTempC]);
  const curve2C = useMemo(() => generateDischargeCurve(metrics, config, 2.0, ambientTempC), [metrics, config, ambientTempC]);
  const curveActive = useMemo(() => generateDischargeCurve(metrics, config, selectedCRate, ambientTempC), [metrics, config, selectedCRate, ambientTempC]);

  const ragoneData = useMemo(() => generateRagonePlot(metrics), [metrics]);
  const cycleData = useMemo(() => projectCycleLife(metrics, selectedCRate, ambientTempC), [metrics, selectedCRate, ambientTempC]);

  // Find current simulation point
  const currentPointIndex = Math.min(
    curveActive.length - 1,
    Math.max(0, Math.round((1 - simulationSoc / 100) * (curveActive.length - 1)))
  );
  const currentPoint = curveActive[currentPointIndex] || curveActive[0];

  const currentAmps = Number((metrics.cellCapacityAh * selectedCRate).toFixed(2));
  const currentPowerW = Number((currentPoint.voltageV * currentAmps).toFixed(2));

  // Mass Breakdown calculations
  const massItems = [
    { label: 'Cathode Active', mass: metrics.cathodeMassGrams, color: '#2563eb' },
    { label: 'Anode Active', mass: metrics.anodeMassGrams, color: '#d97706' },
    { label: 'Electrolyte', mass: metrics.electrolyteMassGrams, color: '#0d9488' },
    { label: 'Current Collectors (Al+Cu)', mass: Number((metrics.aluminumFoilMassGrams + metrics.copperFoilMassGrams).toFixed(2)), color: '#64748b' },
    { label: 'Separator', mass: metrics.separatorMassGrams, color: '#9333ea' },
    { label: 'Casing & Tabs', mass: metrics.casingMassGrams, color: '#334155' },
  ];

  return (
    <div className="space-y-6">
      {/* Real-time Dynamic Simulation Controller Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-sm font-bold text-slate-900">
                Real-Time Electrochemical Discharge Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuously solves Butler-Volmer overpotentials, ohmic drops, and Joule heating kinetics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* C-Rate selector */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-500">C-Rate:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {[0.2, 0.5, 1.0, 2.0, 3.0, 5.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onChangeCRate(rate)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                      selectedCRate === rate
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rate}C
                  </button>
                ))}
              </div>
            </div>

            {/* Play/Pause & Reset buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleSimulate}
                aria-label={isSimulating ? 'Pause simulation' : 'Start discharge simulation'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSimulating
                    ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                }`}
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Discharge
                  </>
                )}
              </button>

              <button
                onClick={onResetSimulate}
                aria-label="Reset simulation to 100% SOC"
                title="Reset to 100% SOC"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic HUD Meters */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* SOC Meter */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400">State of Charge (SOC)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">{simulationSoc}%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  simulationSoc > 20 ? 'bg-blue-600' : 'bg-rose-600'
                }`}
                style={{ width: `${simulationSoc}%` }}
              />
            </div>
          </div>

          {/* Terminal Voltage */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Terminal Voltage</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-blue-700">{currentPoint.voltageV}</span>
              <span className="text-xs font-mono text-slate-500">V</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Cutoff: {metrics.cutoffVoltageMinV}V
            </span>
          </div>

          {/* Current */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Discharge Current</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">{currentAmps}</span>
              <span className="text-xs font-mono text-slate-500">A</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Rate: {selectedCRate}C
            </span>
          </div>

          {/* Power */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Power Output</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">{currentPowerW}</span>
              <span className="text-xs font-mono text-slate-500">W</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Sp. Power: {(currentPowerW / (metrics.totalCellMassGrams / 1000)).toFixed(0)} W/kg
            </span>
          </div>

          {/* Cell Temperature */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Cell Temperature</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-xl font-mono font-bold ${
                currentPoint.temperatureC > 50 ? 'text-rose-600' : currentPoint.temperatureC > 40 ? 'text-amber-600' : 'text-emerald-700'
              }`}>
                {currentPoint.temperatureC}
              </span>
              <span className="text-xs font-mono text-slate-500">°C</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Ambient: {ambientTempC}°C
            </span>
          </div>

          {/* Delivered Ah */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Delivered Capacity</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-slate-900">{currentPoint.deliveredAh}</span>
              <span className="text-xs font-mono text-slate-500">Ah</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Total: {metrics.cellCapacityAh} Ah
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Tabs & Chart Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Navigation Bar for Charts */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveChart('voltage')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeChart === 'voltage'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Voltage vs SOC Curve
            </button>
            <button
              onClick={() => setActiveChart('ragone')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeChart === 'ragone'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Ragone Plot (Power vs Energy)
            </button>
            <button
              onClick={() => setActiveChart('thermal')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeChart === 'thermal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Thermal Safety & Runaway
            </button>
            <button
              onClick={() => setActiveChart('degradation')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeChart === 'degradation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Cycle Life SOH (1500 Cycles)
            </button>
            <button
              onClick={() => setActiveChart('mass')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeChart === 'mass'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Cell Mass Breakdown
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            [Electrochemical Model: Butler-Volmer & Arrhenius]
          </span>
        </div>

        {/* Chart Viewports */}
        <div className="p-6">
          {/* Chart 1: Voltage vs SOC Discharge Curve */}
          {activeChart === 'voltage' && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Galvanostatic Voltage Discharge Profile Under Multi-C Rate Loads
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparison of cell potential across 0.2C (near-equilibrium OCV), 1.0C, 2.0C, and active {selectedCRate}C rate.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-3 h-0.5 bg-blue-600 rounded" /> 0.2C
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-700">
                    <span className="w-3 h-0.5 bg-teal-600 rounded" /> 1.0C
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-700">
                    <span className="w-3 h-0.5 bg-purple-600 rounded" /> 2.0C
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                    <span className="w-3 h-0.5 bg-rose-600 rounded" /> Active {selectedCRate}C
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full h-72 relative bg-slate-50 border border-slate-200 rounded-lg p-2">
                <svg viewBox="0 0 600 240" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 60, 120, 180, 240].map((y) => (
                    <line key={y} x1="40" y1={y} x2="580" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  ))}
                  {[40, 175, 310, 445, 580].map((x) => (
                    <line key={x} x1={x} y1="0" x2={x} y2="210" stroke="#e2e8f0" strokeDasharray="3 3" />
                  ))}

                  {/* Y-axis Voltage labels */}
                  <text x="35" y="25" textAnchor="end" className="text-[10px] font-mono fill-slate-400">4.4V</text>
                  <text x="35" y="75" textAnchor="end" className="text-[10px] font-mono fill-slate-400">3.8V</text>
                  <text x="35" y="130" textAnchor="end" className="text-[10px] font-mono fill-slate-400">3.2V</text>
                  <text x="35" y="185" textAnchor="end" className="text-[10px] font-mono fill-slate-400">2.6V</text>

                  {/* X-axis SOC labels */}
                  <text x="40" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">100%</text>
                  <text x="175" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">75%</text>
                  <text x="310" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">50%</text>
                  <text x="445" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">25%</text>
                  <text x="580" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">0%</text>

                  {/* Render 0.2C curve */}
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    points={curve02C.map((p, idx) => {
                      const x = 40 + (idx / 50) * 540;
                      const y = 200 - ((p.voltageV - 2.4) / (4.4 - 2.4)) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />

                  {/* Render 1.0C curve */}
                  <polyline
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    points={curve1C.map((p, idx) => {
                      const x = 40 + (idx / 50) * 540;
                      const y = 200 - ((p.voltageV - 2.4) / (4.4 - 2.4)) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />

                  {/* Render 2.0C curve */}
                  <polyline
                    fill="none"
                    stroke="#9333ea"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    points={curve2C.map((p, idx) => {
                      const x = 40 + (idx / 50) * 540;
                      const y = 200 - ((p.voltageV - 2.4) / (4.4 - 2.4)) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />

                  {/* Render active C-rate curve */}
                  <polyline
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    points={curveActive.map((p, idx) => {
                      const x = 40 + (idx / 50) * 540;
                      const y = 200 - ((p.voltageV - 2.4) / (4.4 - 2.4)) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />

                  {/* Current simulation cursor marker */}
                  {(() => {
                    const cursorX = 40 + ((100 - simulationSoc) / 100) * 540;
                    const cursorY = 200 - ((currentPoint.voltageV - 2.4) / (4.4 - 2.4)) * 180;
                    return (
                      <g>
                        <line x1={cursorX} y1="10" x2={cursorX} y2="210" stroke="#dc2626" strokeWidth="1" strokeDasharray="2 2" />
                        <circle cx={cursorX} cy={cursorY} r="5" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                        <text x={cursorX + 8} y={cursorY - 8} className="text-[10px] font-mono font-bold fill-slate-900">
                          {currentPoint.voltageV}V ({simulationSoc}%)
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* Chart 2: Ragone Plot */}
          {activeChart === 'ragone' && (
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  Ragone Plot: Gravimetric Specific Power (W/kg) vs Specific Energy (Wh/kg)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Illustrates the fundamental electrochemical rate-capability trade-off as C-rate increases from 0.1C to 5.0C.
                </p>
              </div>

              <div className="w-full h-72 relative bg-slate-50 border border-slate-200 rounded-lg p-2">
                <svg viewBox="0 0 600 240" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line key={y} x1="50" y1={y} x2="580" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  ))}
                  {[50, 180, 310, 440, 570].map((x) => (
                    <line key={x} x1={x} y1="10" x2={x} y2="210" stroke="#e2e8f0" strokeDasharray="3 3" />
                  ))}

                  {/* Y-axis Specific Power labels */}
                  <text x="45" y="25" textAnchor="end" className="text-[10px] font-mono fill-slate-400">1200 W/kg</text>
                  <text x="45" y="75" textAnchor="end" className="text-[10px] font-mono fill-slate-400">800 W/kg</text>
                  <text x="45" y="125" textAnchor="end" className="text-[10px] font-mono fill-slate-400">400 W/kg</text>
                  <text x="45" y="175" textAnchor="end" className="text-[10px] font-mono fill-slate-400">100 W/kg</text>

                  {/* X-axis Specific Energy labels */}
                  <text x="50" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">50 Wh/kg</text>
                  <text x="220" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">150 Wh/kg</text>
                  <text x="390" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">250 Wh/kg</text>
                  <text x="560" y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">350 Wh/kg</text>

                  {/* Polyline for Ragone curve */}
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    points={ragoneData.map((pt) => {
                      const x = 50 + ((pt.specificEnergyWhkg - 50) / 300) * 510;
                      const y = 200 - (pt.specificPowerWkg / 1300) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />

                  {/* Data Points */}
                  {ragoneData.map((pt, i) => {
                    const x = 50 + ((pt.specificEnergyWhkg - 50) / 300) * 510;
                    const y = 200 - (pt.specificPowerWkg / 1300) * 180;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                        <text x={x + 8} y={y - 6} className="text-[9px] font-mono font-bold fill-slate-800">
                          {pt.cRate}C ({pt.specificEnergyWhkg} Wh/kg, {pt.specificPowerWkg} W/kg)
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Chart 3: Thermal Safety & Runaway Analysis */}
          {activeChart === 'thermal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="block text-xs font-mono uppercase text-slate-400">Cathode Decomposition Onset</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-mono font-bold text-slate-900">
                      {metrics.thermalRunawayOnsetTempC}°C
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Temperature at which the cathode crystal lattice releases atomic oxygen into the organic electrolyte.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="block text-xs font-mono uppercase text-slate-400">Peak Fast-Discharge Temp</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-mono font-bold ${
                      Math.max(...curveActive.map(p => p.temperatureC)) > 55 ? 'text-rose-600' : 'text-slate-900'
                    }`}>
                      {Math.max(...curveActive.map(p => p.temperatureC))}°C
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Maximum reached internal temperature at {selectedCRate}C under ambient {ambientTempC}°C.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="block text-xs font-mono uppercase text-slate-400">Electrochemical Safety Score</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-mono font-bold ${
                      metrics.safetyScore >= 80 ? 'text-emerald-700' : metrics.safetyScore >= 60 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {metrics.safetyScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Integrated safety index factoring N/P balance, flammability, and thermal breakdown headroom.
                  </p>
                </div>
              </div>

              {/* Safety Checklist */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Safety Audit Observations & Guidelines</h5>
                <ul className="space-y-2 text-xs">
                  {metrics.safetyFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </li>
                  ))}
                  {metrics.safetyFlags.length === 0 && (
                    <li className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All safety parameters are well within commercial automotive tolerance.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Chart 4: Cycle Life SOH Projection */}
          {activeChart === 'degradation' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Cycle Life & State of Health (SOH) Projection over 1500 Cycles
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Parabolic SEI layer thickening model with C-rate mechanical particle fatigue and thermal acceleration.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  80% End-of-Life (EOL) Threshold
                </span>
              </div>

              <div className="w-full h-72 relative bg-slate-50 border border-slate-200 rounded-lg p-2">
                <svg viewBox="0 0 600 240" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line key={y} x1="45" y1={y} x2="580" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  ))}
                  {/* 80% EOL Red Dash line */}
                  <line x1="45" y1="80" x2="580" y2="80" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="585" y="84" className="text-[9px] font-mono fill-rose-600 font-bold">80% EOL</text>

                  {/* Y-axis Capacity Retention */}
                  <text x="40" y="20" textAnchor="end" className="text-[10px] font-mono fill-slate-400">100%</text>
                  <text x="40" y="80" textAnchor="end" className="text-[10px] font-mono fill-rose-600 font-bold">80%</text>
                  <text x="40" y="140" textAnchor="end" className="text-[10px] font-mono fill-slate-400">60%</text>
                  <text x="40" y="200" textAnchor="end" className="text-[10px] font-mono fill-slate-400">40%</text>

                  {/* X-axis Cycle numbers */}
                  {[0, 300, 600, 900, 1200, 1500].map((c, i) => (
                    <text key={c} x={45 + (i / 5) * 525} y="228" textAnchor="middle" className="text-[10px] font-mono fill-slate-400">
                      {c} cyc
                    </text>
                  ))}

                  {/* Degradation polyline */}
                  <polyline
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="3"
                    points={cycleData.map((pt) => {
                      const x = 45 + (pt.cycle / 1500) * 525;
                      const y = 20 + ((100 - pt.capacityRetentionPercent) / 60) * 180;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Chart 5: Mass Breakdown */}
          {activeChart === 'mass' && (
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  Total Cell Mass Distribution ({metrics.totalCellMassGrams} grams)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown across active components, inert current collectors, electrolyte, and cell packaging.
                </p>
              </div>

              {/* Stacked Bar Distribution */}
              <div className="w-full h-8 rounded-lg overflow-hidden flex shadow-xs border border-slate-200">
                {massItems.map((item, i) => {
                  const pct = (item.mass / metrics.totalCellMassGrams) * 100;
                  return (
                    <div
                      key={i}
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                      title={`${item.label}: ${item.mass}g (${pct.toFixed(1)}%)`}
                      className="h-full transition-all duration-300 hover:brightness-110"
                    />
                  );
                })}
              </div>

              {/* Legend Grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {massItems.map((item, i) => {
                  const pct = ((item.mass / metrics.totalCellMassGrams) * 100).toFixed(1);
                  return (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700 truncate">{item.label}</span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between font-mono">
                        <span className="text-base font-bold text-slate-900">{item.mass} g</span>
                        <span className="text-slate-500 text-[11px] font-semibold">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
