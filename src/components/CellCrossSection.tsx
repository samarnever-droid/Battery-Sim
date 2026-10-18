/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Play,
  Pause,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CellConfiguration, CellPerformanceMetrics } from '../battery/types.ts';
import {
  CATHODE_MATERIALS,
  ANODE_MATERIALS,
  ELECTROLYTE_MATERIALS,
  SEPARATOR_MATERIALS,
} from '../battery/materials.ts';

interface CellCrossSectionProps {
  config: CellConfiguration;
  metrics: CellPerformanceMetrics;
  isSimulating: boolean;
  simulationMode: 'discharge' | 'charge';
  currentSoc: number; // 0 to 100
  onToggleSimulation: () => void;
  onSetMode: (mode: 'discharge' | 'charge') => void;
}

export const CellCrossSection: React.FC<CellCrossSectionProps> = ({
  config,
  metrics,
  isSimulating,
  simulationMode,
  currentSoc,
  onToggleSimulation,
  onSetMode,
}) => {
  const [selectedLayer, setSelectedLayer] = useState<string>('cathode');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cathode = CATHODE_MATERIALS[config.cathodeId] || CATHODE_MATERIALS['nmc-811'];
  const anode = ANODE_MATERIALS[config.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
  const electrolyte = ELECTROLYTE_MATERIALS[config.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
  const separator = SEPARATOR_MATERIALS[config.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];

  const ionSymbol = cathode.category === 'sodium-ion' ? 'Na+' : 'Li+';

  // Total stack thickness in micrometers
  const totalStackThicknessUm =
    config.aluminumFoilThicknessUm +
    config.cathodeThicknessUm +
    config.separatorThicknessUm +
    config.anodeThicknessUm +
    config.copperFoilThicknessUm;

  // Real-time particle animation inside the electrolyte/separator & electrodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const isHeadless = typeof navigator !== 'undefined' && (/HeadlessChrome/i.test(navigator.userAgent) || navigator.webdriver);

    // Ion particles
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, () => ({
      x: 180 + Math.random() * 240,
      y: 10 + Math.random() * 120,
      speed: 0.6 + Math.random() * 0.8,
      size: 3 + Math.random() * 2,
      opacity: 0.5 + Math.random() * 0.5,
    }));

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Separator bounds in canvas: ~45% to ~55% of width
      const sepStartX = width * 0.42;
      const sepEndX = width * 0.58;

      // Draw subtle ionic background gradient
      const grad = ctx.createLinearGradient(sepStartX, 0, sepEndX, 0);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
      grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.12)');
      grad.addColorStop(1, 'rgba(13, 148, 136, 0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(sepStartX, 0, sepEndX - sepStartX, height);

      // If simulating, move ions
      particles.forEach((p) => {
        if (isSimulating) {
          if (simulationMode === 'discharge') {
            // Anode (right) -> Cathode (left)
            p.x -= p.speed * 60 * dt;
            if (p.x < width * 0.15) {
              p.x = width * 0.82;
              p.y = 10 + Math.random() * (height - 20);
            }
          } else {
            // Cathode (left) -> Anode (right)
            p.x += p.speed * 60 * dt;
            if (p.x > width * 0.85) {
              p.x = width * 0.18;
              p.y = 10 + Math.random() * (height - 20);
            }
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = simulationMode === 'discharge' ? 'rgba(37, 99, 235, 0.85)' : 'rgba(13, 148, 136, 0.85)';
        ctx.fill();

        // Glow dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      if (!isHeadless) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSimulating, simulationMode]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Visualizer Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            Microscopic Cell Layer Cross-Section & Ion Flux Dynamics
          </h2>
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Total Stack: {totalStackThicknessUm} µm
          </span>
        </div>

        {/* Controls: Mode, Play/Pause, Shuttling Direction */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white text-xs">
            <button
              onClick={() => onSetMode('discharge')}
              aria-label="Set simulation to Discharge mode"
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                simulationMode === 'discharge'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Discharge ({ionSymbol} → Cathode)
            </button>
            <button
              onClick={() => onSetMode('charge')}
              aria-label="Set simulation to Charge mode"
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                simulationMode === 'charge'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Charge ({ionSymbol} → Anode)
            </button>
          </div>

          <button
            onClick={onToggleSimulation}
            aria-label={isSimulating ? 'Pause ion flux animation' : 'Start ion flux animation'}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              isSimulating
                ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Ion Flow
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Animate Ion Flow
              </>
            )}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand Microscopic Cross-Section" : "Collapse Microscopic Cross-Section"}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors ml-1"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Layer Schematic Visualizer */}
      {!isCollapsed && (
        <div className="p-5">
          <div className="relative w-full h-44 rounded-lg bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex select-none">
          {/* Canvas for animated moving ions */}
          <canvas
            ref={canvasRef}
            width={720}
            height={176}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* Layer 1: Aluminum Foil Current Collector (Positive) */}
          <div
            onClick={() => setSelectedLayer('al-foil')}
            className={`relative h-full flex flex-col justify-between p-2 cursor-pointer transition-all border-r border-slate-700 z-0 ${
              selectedLayer === 'al-foil' ? 'ring-2 ring-blue-400 brightness-125' : 'hover:brightness-110'
            }`}
            style={{ width: '8%', background: 'linear-gradient(180deg, #94a3b8 0%, #cbd5e1 50%, #64748b 100%)' }}
            title="Aluminum Foil Current Collector (+)"
          >
            <div className="text-[10px] font-mono font-bold text-slate-900 bg-white/80 px-1 py-0.5 rounded text-center">
              + Al
            </div>
            <div className="text-[9px] font-mono text-slate-800 text-center font-semibold">
              {config.aluminumFoilThicknessUm}µm
            </div>
          </div>

          {/* Layer 2: Cathode Active Coating */}
          <div
            onClick={() => setSelectedLayer('cathode')}
            className={`relative h-full flex flex-col justify-between p-2.5 cursor-pointer transition-all border-r border-indigo-900 z-0 ${
              selectedLayer === 'cathode' ? 'ring-2 ring-blue-400 brightness-125' : 'hover:brightness-110'
            }`}
            style={{
              width: '32%',
              background: 'radial-gradient(circle at 30% 30%, #312e81 0%, #1e1b4b 70%, #0f172a 100%)',
            }}
            title="Cathode Coating Layer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-200 truncate">
                Cathode ({cathode.formula})
              </span>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800">
                {config.cathodeThicknessUm}µm
              </span>
            </div>

            {/* Microscopic particles illustration */}
            <div className="grid grid-cols-4 gap-1.5 opacity-60 my-auto">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full bg-blue-400/30 border border-blue-300/40 flex items-center justify-center text-[7px] text-blue-200"
                >
                  {cathode.category === 'sodium-ion' ? 'Na' : 'Li'}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-blue-300">
              <span>Loading: {(config.cathodeThicknessUm * 0.28).toFixed(1)} mg/cm²</span>
              <span>Pore: {Math.round(config.cathodePorosity * 100)}%</span>
            </div>
          </div>

          {/* Layer 3: Cathode-Electrolyte Interface (CEI) */}
          <div
            onClick={() => setSelectedLayer('cei')}
            className={`relative h-full flex items-center justify-center cursor-pointer transition-all z-0 ${
              selectedLayer === 'cei' ? 'ring-2 ring-purple-400 brightness-150' : 'hover:brightness-125'
            }`}
            style={{ width: '2%', background: '#a855f7' }}
            title="Cathode-Electrolyte Interphase (CEI) Passivation Film (~5nm)"
          >
            <span className="text-[8px] font-mono text-white font-bold rotate-90 whitespace-nowrap">
              CEI
            </span>
          </div>

          {/* Layer 4: Separator & Electrolyte Phase */}
          <div
            onClick={() => setSelectedLayer('separator')}
            className={`relative h-full flex flex-col justify-between p-2.5 cursor-pointer transition-all border-x border-teal-800 z-0 ${
              selectedLayer === 'separator' ? 'ring-2 ring-teal-400 brightness-125' : 'hover:brightness-110'
            }`}
            style={{
              width: '16%',
              background: 'repeating-linear-gradient(45deg, #042f2e, #042f2e 6px, #134e4a 6px, #134e4a 12px)',
            }}
            title="Microporous Separator & Permeated Electrolyte"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-teal-200 truncate">Separator</span>
              <span className="text-[9px] font-mono text-teal-300 bg-teal-950/80 px-1 py-0.5 rounded">
                {config.separatorThicknessUm}µm
              </span>
            </div>

            <div className="text-center my-auto">
              <span className="text-[10px] font-mono text-teal-300/90 font-medium tracking-wider">
                {electrolyte.saltFormula}
              </span>
              <div className="flex items-center justify-center gap-1 text-[8px] text-teal-400 mt-0.5">
                {simulationMode === 'discharge' ? (
                  <>
                    <ArrowLeft className="w-3 h-3 text-blue-400 animate-pulse" />
                    <span>{ionSymbol} Flux</span>
                  </>
                ) : (
                  <>
                    <span>{ionSymbol} Flux</span>
                    <ArrowRight className="w-3 h-3 text-teal-400 animate-pulse" />
                  </>
                )}
              </div>
            </div>

            <div className="text-[8px] font-mono text-teal-400 text-center">
              κ = {electrolyte.conductivityAt25C} mS/cm
            </div>
          </div>

          {/* Layer 5: Solid Electrolyte Interphase (SEI) */}
          <div
            onClick={() => setSelectedLayer('sei')}
            className={`relative h-full flex items-center justify-center cursor-pointer transition-all z-0 ${
              selectedLayer === 'sei' ? 'ring-2 ring-amber-400 brightness-150' : 'hover:brightness-125'
            }`}
            style={{ width: '2%', background: '#d97706' }}
            title="Solid Electrolyte Interphase (SEI) Layer (~20nm)"
          >
            <span className="text-[8px] font-mono text-white font-bold rotate-90 whitespace-nowrap">
              SEI
            </span>
          </div>

          {/* Layer 6: Anode Active Coating */}
          <div
            onClick={() => setSelectedLayer('anode')}
            className={`relative h-full flex flex-col justify-between p-2.5 cursor-pointer transition-all border-l border-amber-900 z-0 ${
              selectedLayer === 'anode' ? 'ring-2 ring-blue-400 brightness-125' : 'hover:brightness-110'
            }`}
            style={{
              width: '32%',
              background: 'radial-gradient(circle at 70% 30%, #451a03 0%, #1c1917 70%, #0c0a09 100%)',
            }}
            title="Anode Coating Layer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-200 truncate">
                Anode ({anode.formula})
              </span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                {config.anodeThicknessUm}µm
              </span>
            </div>

            {/* Microscopic graphite layers illustration */}
            <div className="grid grid-cols-4 gap-1.5 opacity-60 my-auto">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-[7px] text-amber-200 font-mono"
                >
                  C₆
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-amber-300">
              <span>Loading: {(config.anodeThicknessUm * 0.18).toFixed(1)} mg/cm²</span>
              <span>Pore: {Math.round(config.anodePorosity * 100)}%</span>
            </div>
          </div>

          {/* Layer 7: Copper Foil Current Collector (Negative) */}
          <div
            onClick={() => setSelectedLayer('cu-foil')}
            className={`relative h-full flex flex-col justify-between p-2 cursor-pointer transition-all border-l border-slate-700 z-0 ${
              selectedLayer === 'cu-foil' ? 'ring-2 ring-blue-400 brightness-125' : 'hover:brightness-110'
            }`}
            style={{ width: '8%', background: 'linear-gradient(180deg, #b45309 0%, #d97706 50%, #78350f 100%)' }}
            title="Copper Foil Current Collector (-)"
          >
            <div className="text-[10px] font-mono font-bold text-white bg-black/40 px-1 py-0.5 rounded text-center">
              - Cu
            </div>
            <div className="text-[9px] font-mono text-white text-center font-semibold">
              {config.copperFoilThicknessUm}µm
            </div>
          </div>
        </div>

        {/* Layer Dimension Inspector Bar */}
        <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          {selectedLayer === 'cathode' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">{cathode.name}</span>
                <span className="ml-2 font-mono text-[11px] text-blue-700 font-medium">[{cathode.formula}]</span>
                <p className="text-[11px] text-slate-500 mt-0.5">{cathode.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Coating: <strong>{config.cathodeThicknessUm} µm</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Cap: <strong>{cathode.theoreticalCapacity} mAh/g</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Onset: <strong>{cathode.thermalDecompositionTemp}°C</strong>
                </span>
              </div>
            </div>
          )}

          {selectedLayer === 'anode' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">{anode.name}</span>
                <span className="ml-2 font-mono text-[11px] text-amber-700 font-medium">[{anode.formula}]</span>
                <p className="text-[11px] text-slate-500 mt-0.5">{anode.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Coating: <strong>{config.anodeThicknessUm} µm</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Cap: <strong>{anode.theoreticalCapacity} mAh/g</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Swelling: <strong>+{anode.volumeExpansion}%</strong>
                </span>
              </div>
            </div>
          )}

          {selectedLayer === 'separator' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">{separator.name}</span>
                <span className="ml-2 font-mono text-[11px] text-teal-700 font-medium">
                  {electrolyte.name}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">{separator.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Thickness: <strong>{config.separatorThicknessUm} µm</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Conductivity: <strong>{electrolyte.conductivityAt25C} mS/cm</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  Shutdown: <strong>{separator.shutdownTempC}°C</strong>
                </span>
              </div>
            </div>
          )}

          {selectedLayer === 'sei' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-amber-800">Solid Electrolyte Interphase (SEI)</span>
                <span className="ml-2 font-mono text-[11px] text-slate-600 font-medium">Li2CO3 / LiF passivating film</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Protective interphase formed during initial formation cycles (0.8V to 0.2V). Prevents continuous solvent reduction on anode particles while allowing Li+ cation desolvation and diffusion.
                </p>
              </div>
              <div className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                Typical Thickness: <strong>15 - 35 nm</strong>
              </div>
            </div>
          )}

          {selectedLayer === 'cei' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-purple-800">Cathode-Electrolyte Interphase (CEI)</span>
                <span className="ml-2 font-mono text-[11px] text-slate-600 font-medium">High-voltage surface film</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Surface passivation layer catalyzed by vinylene carbonate (VC) or FEC additives. Suppresses transition metal dissolution (Ni/Mn/Co) into liquid electrolyte at cell potentials above 4.2V.
                </p>
              </div>
              <div className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                Typical Thickness: <strong>3 - 10 nm</strong>
              </div>
            </div>
          )}

          {selectedLayer === 'al-foil' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">Positive Current Collector (Aluminum Foil)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  High-purity annealed Al foil (99.8%+). Forms passive Al2O3 protective film resisting anodic oxidation up to 4.5V vs Li/Li+.
                </p>
              </div>
              <div className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                Mass: <strong>{metrics.aluminumFoilMassGrams} g</strong> ({config.aluminumFoilThicknessUm} µm)
              </div>
            </div>
          )}

          {selectedLayer === 'cu-foil' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">Negative Current Collector (Copper Foil)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Electrolytic or rolled-annealed copper foil. Inert at low potentials (0.0V - 1.5V vs Li/Li+). In sodium-ion cells, Al foil can replace Cu to eliminate over-discharge dissolution.
                </p>
              </div>
              <div className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                Mass: <strong>{metrics.copperFoilMassGrams} g</strong> ({config.copperFoilThicknessUm} µm)
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
