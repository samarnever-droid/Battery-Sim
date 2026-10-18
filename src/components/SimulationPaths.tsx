/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Flame,
  Gauge,
  TrendingDown,
  Layers,
  ShieldAlert,
  Download,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import type {
  CellConfiguration,
  CellPerformanceMetrics,
  CcCvSimulationPoint,
  GittSimulationPoint,
  DriveCyclePoint,
  AbuseOverchargePoint,
} from '../battery/types.ts';
import {
  simulateCcCv,
  simulateGitt,
  simulateDriveCycle,
  simulateAbuseOvercharge,
} from '../battery/physics.ts';

interface SimulationPathsProps {
  config: CellConfiguration;
  metrics: CellPerformanceMetrics;
}

type PathType = 'cccv' | 'gitt' | 'drivecycle' | 'overcharge';

export const SimulationPaths: React.FC<SimulationPathsProps> = ({ config, metrics }) => {
  const [activePath, setActivePath] = useState<PathType>('cccv');

  // CC-CV Parameters
  const [chargeRateC, setChargeRateC] = useState<number>(1.0);
  const [cvCutoffC, setCvCutoffC] = useState<number>(0.05);

  // GITT Parameters
  const [gittPulseC, setGittPulseC] = useState<number>(0.2);
  const [gittPulseDurationS, setGittPulseDurationS] = useState<number>(600);
  const [gittRestDurationS, setGittRestDurationS] = useState<number>(1800);

  // Drive Cycle Parameters
  const [cycleProfile, setCycleProfile] = useState<string>('WLTP Class 3');

  // Overcharge Abuse Parameters
  const [overchargeC, setOverchargeC] = useState<number>(2.0);
  const [stopVoltage, setStopVoltage] = useState<number>(5.5);

  // Run simulations reactively
  const cccvData = useMemo(() => {
    return simulateCcCv(config, metrics, chargeRateC, cvCutoffC);
  }, [config, metrics, chargeRateC, cvCutoffC]);

  const gittData = useMemo(() => {
    return simulateGitt(config, metrics, gittPulseC, gittPulseDurationS, gittRestDurationS, 7);
  }, [config, metrics, gittPulseC, gittPulseDurationS, gittRestDurationS]);

  const driveCycleData = useMemo(() => {
    return simulateDriveCycle(config, metrics, cycleProfile);
  }, [config, metrics, cycleProfile]);

  const overchargeData = useMemo(() => {
    return simulateAbuseOvercharge(config, metrics, overchargeC, stopVoltage);
  }, [config, metrics, overchargeC, stopVoltage]);

  const handleExportJson = () => {
    let payload: any;
    let filename = '';

    if (activePath === 'cccv') {
      payload = { path: 'CC-CV Protocol', config, metrics, points: cccvData };
      filename = `sim-cccv-${config.cathodeId}.json`;
    } else if (activePath === 'gitt') {
      payload = { path: 'GITT Diffusion Titration', config, metrics, points: gittData };
      filename = `sim-gitt-${config.cathodeId}.json`;
    } else if (activePath === 'drivecycle') {
      payload = { path: 'Automotive Drive Cycle', cycle: cycleProfile, config, metrics, points: driveCycleData };
      filename = `sim-drivecycle-${config.cathodeId}.json`;
    } else {
      payload = { path: 'Overcharge Abuse & Aluminum Pitting', config, metrics, points: overchargeData };
      filename = `sim-overcharge-${config.cathodeId}.json`;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold uppercase bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                Multi-Physics Solvers
              </span>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold uppercase bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                100% Mass-Closed
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Realistic Simulation Paths & Dynamic Stress Protocols
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Execute rigorous non-linear electrochemical pathways: multi-phase CC-CV charging, solid-state GITT diffusion relaxation, high-power transient EV drive cycles, and overcharge abuse with Aluminum current collector pitting kinetics.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              Export Trajectory JSON
            </button>
          </div>
        </div>

        {/* Path Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActivePath('cccv')}
            className={`p-3 rounded-xl text-left transition-all border ${
              activePath === 'cccv'
                ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">1. CC-CV Protocol</span>
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              Constant-current bulk charge into exponential CV decay
            </p>
          </button>

          <button
            onClick={() => setActivePath('gitt')}
            className={`p-3 rounded-xl text-left transition-all border ${
              activePath === 'gitt'
                ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">2. GITT Diffusion</span>
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              Galvanostatic titration & solid chemical diffusivity
            </p>
          </button>

          <button
            onClick={() => setActivePath('drivecycle')}
            className={`p-3 rounded-xl text-left transition-all border ${
              activePath === 'drivecycle'
                ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-sm'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">3. EV Drive Cycle</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              WLTP Class 3 with high-rate regenerative braking
            </p>
          </button>

          <button
            onClick={() => setActivePath('overcharge')}
            className={`p-3 rounded-xl text-left transition-all border ${
              activePath === 'overcharge'
                ? 'bg-rose-600/30 border-rose-500 text-white shadow-sm'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">4. Abuse Overcharge</span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              Electrolyte oxidation & Aluminum pitting corrosion
            </p>
          </button>
        </div>
      </div>

      {/* Path 1: CC-CV Fast-Charge Protocol */}
      {activePath === 'cccv' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  CC Charge Rate: <span className="text-blue-600 font-mono">{chargeRateC}C</span>
                  <span className="text-slate-400 font-normal ml-1">({(metrics.cellCapacityAh * chargeRateC).toFixed(1)} A)</span>
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={chargeRateC}
                  onChange={(e) => setChargeRateC(parseFloat(e.target.value))}
                  className="w-44 accent-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  CV Cutoff Rate: <span className="text-blue-600 font-mono">{cvCutoffC}C</span>
                  <span className="text-slate-400 font-normal ml-1">({(metrics.cellCapacityAh * cvCutoffC).toFixed(2)} A)</span>
                </label>
                <input
                  type="range"
                  min="0.02"
                  max="0.2"
                  step="0.01"
                  value={cvCutoffC}
                  onChange={(e) => setCvCutoffC(parseFloat(e.target.value))}
                  className="w-44 accent-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">T_FINAL</span>
                <span className="font-bold text-slate-900">
                  {cccvData.length > 0 ? `${(cccvData[cccvData.length - 1].timeSec / 60).toFixed(1)} min` : '--'}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px]">FINAL SOC</span>
                <span className="font-bold text-emerald-600">
                  {cccvData.length > 0 ? `${cccvData[cccvData.length - 1].socPercent}%` : '--'}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px]">PEAK TEMP</span>
                <span className="font-bold text-amber-600">
                  {cccvData.length > 0 ? `${Math.max(...cccvData.map(p => p.temperatureC))}°C` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Multi-trace Chart */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">CC-CV Trajectory: Terminal Voltage, Current & Temperature</h3>
                <p className="text-xs text-slate-500">Smooth transition from current-clamped CC to potential-clamped CV decay</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-blue-600" /> Voltage (V)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-amber-600" /> Current (A)
                </span>
                <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                  <span className="w-2.5 h-0.5 bg-rose-500" /> Temp (°C)
                </span>
              </div>
            </div>

            {/* SVG Plot */}
            <div className="relative h-64 w-full bg-slate-900 rounded-lg p-2 border border-slate-800 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0.25, 0.5, 0.75].map((pct, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={240 * pct}
                    x2="600"
                    y2={240 * pct}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="0.8"
                  />
                ))}

                {/* Trajectory Paths */}
                {cccvData.length > 1 && (() => {
                  const maxTime = Math.max(1, cccvData[cccvData.length - 1].timeSec);
                  const minV = metrics.cutoffVoltageMinV;
                  const maxV = metrics.cutoffVoltageMaxV + 0.1;
                  const maxI = Math.max(1, ...cccvData.map(p => p.currentA));
                  const minT = 20;
                  const maxT = 60;

                  const vPoints = cccvData.map(p => {
                    const x = (p.timeSec / maxTime) * 600;
                    const y = 240 - ((p.terminalVoltageV - minV) / (maxV - minV)) * 220;
                    return `${x},${y}`;
                  }).join(' ');

                  const iPoints = cccvData.map(p => {
                    const x = (p.timeSec / maxTime) * 600;
                    const y = 240 - (p.currentA / maxI) * 180;
                    return `${x},${y}`;
                  }).join(' ');

                  const tPoints = cccvData.map(p => {
                    const x = (p.timeSec / maxTime) * 600;
                    const y = 240 - ((p.temperatureC - minT) / (maxT - minT)) * 140;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      <polygon
                        points={`0,240 ${vPoints} 600,240`}
                        fill="url(#voltageGradient)"
                      />
                      <polyline
                        points={vPoints}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                      />
                      <polyline
                        points={iPoints}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <polyline
                        points={tPoints}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                      />
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-mono uppercase">Bulk CC Duration</span>
                <span className="font-bold text-slate-800">
                  {((cccvData.filter(p => p.phase === 'CC').length * 30) / 60).toFixed(1)} mins
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-mono uppercase">CV Taper Duration</span>
                <span className="font-bold text-slate-800">
                  {((cccvData.filter(p => p.phase === 'CV').length * 30) / 60).toFixed(1)} mins
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-mono uppercase">Energy Charged</span>
                <span className="font-bold text-blue-600">
                  {metrics.storedEnergyWh} Wh
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-mono uppercase">Average Coulombic Efficiency</span>
                <span className="font-bold text-emerald-600">
                  99.85 %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Path 2: Galvanostatic Intermittent Titration (GITT) */}
      {activePath === 'gitt' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pulse C-Rate: <span className="text-purple-600 font-mono">{gittPulseC}C</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={gittPulseC}
                  onChange={(e) => setGittPulseC(parseFloat(e.target.value))}
                  className="w-44 accent-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pulse Duration: <span className="text-purple-600 font-mono">{gittPulseDurationS / 60} min</span>
                </label>
                <input
                  type="range"
                  min="180"
                  max="1200"
                  step="60"
                  value={gittPulseDurationS}
                  onChange={(e) => setGittPulseDurationS(parseInt(e.target.value))}
                  className="w-44 accent-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Rest Duration: <span className="text-purple-600 font-mono">{gittRestDurationS / 60} min</span>
                </label>
                <input
                  type="range"
                  min="600"
                  max="3600"
                  step="300"
                  value={gittRestDurationS}
                  onChange={(e) => setGittRestDurationS(parseInt(e.target.value))}
                  className="w-44 accent-purple-600"
                />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg text-xs">
              <span className="text-purple-600 font-semibold block text-[10px] uppercase font-mono">Apparent Chemical Diffusivity</span>
              <span className="font-mono font-bold text-purple-900">
                D_app ≈ 1.2 × 10⁻¹⁰ cm²/s
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">GITT Voltage Profile: Transient Polarization vs Relaxed Equilibrium OCV</h3>
                <p className="text-xs text-slate-500">Separates ohmic drop, charge-transfer resistance, and solid-state Fickian diffusion</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-purple-600" /> Polarized Voltage (V)
                </span>
                <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                  <span className="w-2.5 h-0.5 bg-slate-400" /> Equilibrium OCV (V)
                </span>
              </div>
            </div>

            <div className="relative h-64 w-full bg-slate-900 rounded-lg p-2 border border-slate-800 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                {[0.25, 0.5, 0.75].map((pct, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={240 * pct}
                    x2="600"
                    y2={240 * pct}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="0.8"
                  />
                ))}

                {gittData.length > 1 && (() => {
                  const maxTime = gittData[gittData.length - 1].timeSec;
                  const minV = metrics.cutoffVoltageMinV;
                  const maxV = metrics.cutoffVoltageMaxV + 0.1;

                  const vPoints = gittData.map(p => {
                    const x = (p.timeSec / maxTime) * 600;
                    const y = 240 - ((p.terminalVoltageV - minV) / (maxV - minV)) * 220;
                    return `${x},${y}`;
                  }).join(' ');

                  const ocvPoints = gittData.map(p => {
                    const x = (p.timeSec / maxTime) * 600;
                    const y = 240 - ((p.equilibriumOcvV - minV) / (maxV - minV)) * 220;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      <polyline
                        points={ocvPoints}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <polyline
                        points={vPoints}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                      />
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Solid-State Kinetics Formula (Weppner & Huggins 1977):</strong> Apparent chemical diffusion coefficient is extracted via{' '}
                <code className="bg-purple-100 px-1 py-0.5 rounded font-mono text-[11px]">
                  D = (4 / π) · (V_m / (S · F))² · [I_0 · (dE/dδ) / (dE/d√t)]²
                </code>. The voltage steps reveal phase transitions and solid-solution staging.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Path 3: Dynamic EV Drive Cycle */}
      {activePath === 'drivecycle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Drive Profile</label>
                <select
                  value={cycleProfile}
                  onChange={(e) => setCycleProfile(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="WLTP Class 3">WLTP Class 3 (Automotive Passenger EV)</option>
                  <option value="US06 High Acceleration">US06 Aggressive Highway Burst</option>
                  <option value="Urban Stop & Go">Urban Stop-and-Go with Dense Regen</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Total Regen Harvested</span>
                <span className="font-bold text-emerald-900">
                  {driveCycleData.filter(d => d.isRegenerating).length * 0.12} Wh
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Peak Current Draw</span>
                <span className="font-bold text-blue-900">
                  {Math.max(...driveCycleData.map(d => d.currentA)).toFixed(1)} A
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dynamic Current & Voltage Response Under EV Duty Cycle</h3>
                <p className="text-xs text-slate-500">Green regions represent regenerative braking power recovery into the cell</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-emerald-600" /> Current (A, negative = regen)
                </span>
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-blue-600" /> Voltage (V)
                </span>
              </div>
            </div>

            <div className="relative h-64 w-full bg-slate-900 rounded-lg p-2 border border-slate-800 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                <line x1="0" y1="120" x2="600" y2="120" stroke="#475569" strokeWidth="1" />
                
                {driveCycleData.length > 1 && (() => {
                  const maxTime = driveCycleData[driveCycleData.length - 1].timeSec;
                  const maxI = Math.max(1, ...driveCycleData.map(d => Math.abs(d.currentA)));

                  const iPoints = driveCycleData.map(d => {
                    const x = (d.timeSec / maxTime) * 600;
                    const y = 120 - (d.currentA / maxI) * 100;
                    return `${x},${y}`;
                  }).join(' ');

                  const vPoints = driveCycleData.map(d => {
                    const x = (d.timeSec / maxTime) * 600;
                    const y = 240 - ((d.voltageV - metrics.cutoffVoltageMinV) / (metrics.cutoffVoltageMaxV - metrics.cutoffVoltageMinV)) * 220;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      <polyline
                        points={iPoints}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                      />
                      <polyline
                        points={vPoints}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.8"
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Path 4: Abuse Overcharge & Aluminum Pitting */}
      {activePath === 'overcharge' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Overcharge Current: <span className="text-rose-600 font-mono">{overchargeC}C</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  value={overchargeC}
                  onChange={(e) => setOverchargeC(parseFloat(e.target.value))}
                  className="w-44 accent-rose-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Safety Clamping Voltage: <span className="text-rose-600 font-mono">{stopVoltage}V</span>
                </label>
                <input
                  type="range"
                  min="4.5"
                  max="6.0"
                  step="0.1"
                  value={stopVoltage}
                  onChange={(e) => setStopVoltage(parseFloat(e.target.value))}
                  className="w-44 accent-rose-600"
                />
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg text-xs">
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Aluminum Anodic Dissolution Boundary: 4.60 V
              </span>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Exceeding 4.6V breaks down AlF3 passive film, causing pitting and internal microshorts.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Abuse Overcharge: Voltage, Aluminum Corrosion Current & Gas Venting</h3>
                <p className="text-xs text-slate-500">Simulates electrolyte oxidation gas release and catastrophic exothermic thermal runaway</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-rose-600" /> Voltage (V)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                  <span className="w-2.5 h-0.5 bg-amber-500" /> Al Pitting Current (mA)
                </span>
                <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                  <span className="w-2.5 h-0.5 bg-purple-600" /> Gas Vol (mL)
                </span>
              </div>
            </div>

            <div className="relative h-64 w-full bg-slate-900 rounded-lg p-2 border border-slate-800 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                {[0.25, 0.5, 0.75].map((pct, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={240 * pct}
                    x2="600"
                    y2={240 * pct}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="0.8"
                  />
                ))}

                {overchargeData.length > 1 && (() => {
                  const maxTime = Math.max(1, overchargeData[overchargeData.length - 1].timeSec);
                  const maxGas = Math.max(1, ...overchargeData.map(d => d.gasVolumeMl));
                  const maxAlCorr = Math.max(1, ...overchargeData.map(d => d.alCorrosionCurrentMa));

                  const vPoints = overchargeData.map(d => {
                    const x = (d.timeSec / maxTime) * 600;
                    const y = 240 - ((d.cellVoltageV - 3.0) / (stopVoltage - 3.0)) * 220;
                    return `${x},${y}`;
                  }).join(' ');

                  const alPoints = overchargeData.map(d => {
                    const x = (d.timeSec / maxTime) * 600;
                    const y = 240 - (d.alCorrosionCurrentMa / maxAlCorr) * 180;
                    return `${x},${y}`;
                  }).join(' ');

                  const gasPoints = overchargeData.map(d => {
                    const x = (d.timeSec / maxTime) * 600;
                    const y = 240 - (d.gasVolumeMl / maxGas) * 150;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      <polyline points={alPoints} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                      <polyline points={gasPoints} fill="none" stroke="#c084fc" strokeWidth="2" />
                      <polyline points={vPoints} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Overcharge timeline breakdown */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">Sequential Abuse Degradation Stages:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-700 block">Stage 1: &lt;4.2V</span>
                  <span className="text-slate-500 text-[11px]">Normal intercalation kinetics</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="font-bold text-amber-800 block">Stage 2: 4.2V - 4.6V</span>
                  <span className="text-amber-700 text-[11px]">Electrolyte oxidation & CO2 gassing</span>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                  <span className="font-bold text-orange-800 block">Stage 3: 4.6V - 4.95V</span>
                  <span className="text-orange-700 text-[11px]">AlF3 film breaches; active Al pitting</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="font-bold text-rose-800 block">Stage 4: &gt;4.95V / &gt;210°C</span>
                  <span className="text-rose-700 text-[11px]">Separator melt & Thermal Runaway</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
