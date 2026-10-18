/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Scale,
  Sparkles,
  ExternalLink,
  BatteryMedium,
  Activity,
  Layers,
} from 'lucide-react';
import type { CellConfiguration, CellPerformanceMetrics, FormFactorType, FoilMaterialType } from '../battery/types.ts';
import {
  CATHODE_MATERIALS,
  ANODE_MATERIALS,
  ELECTROLYTE_MATERIALS,
  SEPARATOR_MATERIALS,
  FORM_FACTORS,
  FOIL_MATERIALS,
} from '../battery/materials.ts';
import { ModernSlider } from './ModernSlider.tsx';

interface MaterialBuilderProps {
  config: CellConfiguration;
  metrics: CellPerformanceMetrics;
  onChangeConfig: (newConfig: Partial<CellConfiguration>) => void;
  onOpenPubChem: (cid: number) => void;
}

export const MaterialBuilder: React.FC<MaterialBuilderProps> = ({
  config,
  metrics,
  onChangeConfig,
  onOpenPubChem,
}) => {
  const selectedCathode = CATHODE_MATERIALS[config.cathodeId] || CATHODE_MATERIALS['nmc-811'];
  const selectedAnode = ANODE_MATERIALS[config.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
  const selectedElectrolyte = ELECTROLYTE_MATERIALS[config.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
  const selectedSeparator = SEPARATOR_MATERIALS[config.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
  const selectedFormFactor = FORM_FACTORS[config.formFactorId] || FORM_FACTORS['4680'];

  // Auto-balance anode thickness to achieve target N/P ratio of 1.15
  const handleAutoBalance = () => {
    const targetNp = 1.15;
    const cathFactor = (1 - config.cathodePorosity) * selectedCathode.density * config.cathodeActiveFraction * selectedCathode.theoreticalCapacity;
    const anodeFactor = (1 - config.anodePorosity) * selectedAnode.density * config.anodeActiveFraction * selectedAnode.theoreticalCapacity;
    if (anodeFactor > 0) {
      const balancedThicknessUm = Math.round((targetNp * config.cathodeThicknessUm * cathFactor) / anodeFactor);
      const clamped = Math.max(20, Math.min(180, balancedThicknessUm));
      onChangeConfig({ anodeThicknessUm: clamped });
    }
  };

  const handleFormFactorChange = (newId: FormFactorType) => {
    const ff = FORM_FACTORS[newId];
    if (ff) {
      onChangeConfig({
        formFactorId: newId,
        electrodeAreaCm2: ff.typicalElectrodeAreaCm2,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Electrodes & N/P Ratio Balancing (8 cols) */}
      <div className="lg:col-span-8 space-y-5">
        {/* N/P Ratio Smart Balancing Alert Bar */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
          metrics.npStatus === 'optimal'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : metrics.npStatus === 'underbalanced-plating-risk'
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-3">
            {metrics.npStatus === 'optimal' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : metrics.npStatus === 'underbalanced-plating-risk' ? (
              <Flame className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  N/P Balancing Ratio: <span className="font-mono">{metrics.npRatio}</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                  metrics.npStatus === 'optimal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : metrics.npStatus === 'underbalanced-plating-risk'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {metrics.npStatus === 'optimal' ? 'Optimal Balance' : metrics.npStatus === 'underbalanced-plating-risk' ? 'Plating Danger' : 'Overbalanced'}
                </span>
              </div>
              <p className="text-xs mt-0.5 text-slate-700">
                {metrics.npStatus === 'optimal'
                  ? 'Anode capacity has an ideal 5%–25% safety reserve. Lithium deposition and dendrite growth are fully suppressed.'
                  : metrics.npStatus === 'underbalanced-plating-risk'
                  ? 'Hazard: Anode capacity is insufficient (N/P < 1.05). Fast charging will cause metallic lithium plating on graphite particles!'
                  : 'Warning: Anode capacity is too high (N/P > 1.30). Dead electrode weight lowers overall gravimetric energy density (Wh/kg).'}
              </p>
            </div>
          </div>

          {metrics.npStatus !== 'optimal' && (
            <button
              onClick={handleAutoBalance}
              aria-label="Auto-balance anode coating thickness for 1.15 N/P ratio"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shrink-0 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              Auto-Balance (1.15 N/P)
            </button>
          )}
        </div>

        {/* Positive Electrode (Cathode) Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Positive Electrode (Cathode Active Material)</h3>
            </div>
            {selectedCathode.pubchemCid && (
              <button
                onClick={() => onOpenPubChem(selectedCathode.pubchemCid!)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:text-blue-800 hover:underline"
              >
                <span>PubChem CID {selectedCathode.pubchemCid}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cathode Chemistry Selection */}
            <div>
              <label htmlFor="cathode-select" className="block text-xs font-medium text-slate-700 mb-1">
                Cathode Chemistry & Crystal Structure
              </label>
              <select
                id="cathode-select"
                value={config.cathodeId}
                onChange={(e) => onChangeConfig({ cathodeId: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {Object.values(CATHODE_MATERIALS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.theoreticalCapacity} mAh/g
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{selectedCathode.description}</p>
            </div>

            {/* Quick Specs Pill Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Practical Cap</span>
                <span className="font-mono font-bold text-slate-900">{selectedCathode.theoreticalCapacity} mAh/g</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Potential vs Li</span>
                <span className="font-mono font-bold text-blue-700">{selectedCathode.nominalPotentialVsLi} V</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Thermal Onset</span>
                <span className="font-mono font-bold text-slate-900">{selectedCathode.thermalDecompositionTemp}°C</span>
              </div>
            </div>
          </div>

          {/* Modern Tactile Sliders */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ModernSlider
              id="cathode-thickness"
              label="Coating Thickness"
              value={config.cathodeThicknessUm}
              min={30}
              max={140}
              step={1}
              unit="µm"
              accentColor="blue"
              helperText={`Loading: ${(config.cathodeThicknessUm * 0.28).toFixed(1)} mg/cm²`}
              onChange={(val) => onChangeConfig({ cathodeThicknessUm: val })}
            />

            <ModernSlider
              id="cathode-porosity"
              label="Electrode Porosity"
              value={config.cathodePorosity}
              min={0.18}
              max={0.42}
              step={0.01}
              accentColor="blue"
              helperText="Calendering compression"
              formatValue={(val) => `${Math.round(val * 100)}%`}
              onChange={(val) => onChangeConfig({ cathodePorosity: val })}
            />

            <ModernSlider
              id="cathode-active-fraction"
              label="Active Ratio"
              value={config.cathodeActiveFraction}
              min={0.85}
              max={0.98}
              step={0.01}
              accentColor="blue"
              helperText="PVDF + carbon balance"
              formatValue={(val) => `${Math.round(val * 100)}%`}
              onChange={(val) => onChangeConfig({ cathodeActiveFraction: val })}
            />
          </div>
        </div>

        {/* Negative Electrode (Anode) Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Negative Electrode (Anode Material)</h3>
            </div>
            {selectedAnode.pubchemCid && (
              <button
                onClick={() => onOpenPubChem(selectedAnode.pubchemCid!)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 hover:text-amber-900 hover:underline"
              >
                <span>PubChem CID {selectedAnode.pubchemCid}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Anode Selection */}
            <div>
              <label htmlFor="anode-select" className="block text-xs font-medium text-slate-700 mb-1">
                Anode Material System
              </label>
              <select
                id="anode-select"
                value={config.anodeId}
                onChange={(e) => onChangeConfig({ anodeId: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                {Object.values(ANODE_MATERIALS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.theoreticalCapacity} mAh/g
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{selectedAnode.description}</p>
            </div>

            {/* Quick Specs Pill Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Practical Cap</span>
                <span className="font-mono font-bold text-slate-900">{selectedAnode.theoreticalCapacity} mAh/g</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Potential vs Li</span>
                <span className="font-mono font-bold text-amber-700">{selectedAnode.nominalPotentialVsLi} V</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">Swelling</span>
                <span className={`font-mono font-bold ${selectedAnode.volumeExpansion > 20 ? 'text-rose-600' : 'text-slate-900'}`}>
                  +{selectedAnode.volumeExpansion}%
                </span>
              </div>
            </div>
          </div>

          {/* Modern Tactile Sliders */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ModernSlider
              id="anode-thickness"
              label="Coating Thickness"
              value={config.anodeThicknessUm}
              min={20}
              max={160}
              step={1}
              unit="µm"
              accentColor="amber"
              helperText={`Loading: ${(config.anodeThicknessUm * 0.18).toFixed(1)} mg/cm²`}
              onChange={(val) => onChangeConfig({ anodeThicknessUm: val })}
            />

            <ModernSlider
              id="anode-porosity"
              label="Electrode Porosity"
              value={config.anodePorosity}
              min={0.20}
              max={0.45}
              step={0.01}
              accentColor="amber"
              helperText="Electrolyte percolation"
              formatValue={(val) => `${Math.round(val * 100)}%`}
              onChange={(val) => onChangeConfig({ anodePorosity: val })}
            />

            <ModernSlider
              id="anode-active-fraction"
              label="Active Ratio"
              value={config.anodeActiveFraction}
              min={0.85}
              max={0.99}
              step={0.01}
              accentColor="amber"
              helperText="SBR/CMC binder balance"
              formatValue={(val) => `${Math.round(val * 100)}%`}
              onChange={(val) => onChangeConfig({ anodeActiveFraction: val })}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Electrolyte, Separator, Foils & Form Factor (4 cols) */}
      <div className="lg:col-span-4 space-y-5">
        {/* Form Factor Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BatteryMedium className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Form Factor & Packaging</h3>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="formfactor-select" className="block text-xs font-medium text-slate-700 mb-1">Cell Architecture</label>
              <select
                id="formfactor-select"
                value={config.formFactorId}
                onChange={(e) => handleFormFactorChange(e.target.value as FormFactorType)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {Object.values(FORM_FACTORS).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <ModernSlider
              id="electrode-area"
              label="Active Electrode Area"
              value={config.electrodeAreaCm2}
              min={50}
              max={25000}
              step={50}
              unit="cm²"
              accentColor="blue"
              onChange={(val) => onChangeConfig({ electrodeAreaCm2: val })}
            />

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Can Mass:</span>
                <span className="text-slate-900 font-medium">{selectedFormFactor.casingMassGrams} g</span>
              </div>
              <div className="flex justify-between">
                <span>Nominal Volume:</span>
                <span className="text-slate-900 font-medium">{selectedFormFactor.nominalVolumeMl} mL</span>
              </div>
              <div className="flex justify-between">
                <span>Tab Ohmic Resistance:</span>
                <span className="text-slate-900 font-medium">{(selectedFormFactor.tabResistanceOhm * 1000).toFixed(1)} mΩ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Electrolyte & Separator Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Activity className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Electrolyte & Separator System</h3>
          </div>

          <div className="mt-4 space-y-4">
            {/* Electrolyte Selection */}
            <div>
              <label htmlFor="electrolyte-select" className="block text-xs font-medium text-slate-700 mb-1">Electrolyte Formula</label>
              <select
                id="electrolyte-select"
                value={config.electrolyteId}
                onChange={(e) => onChangeConfig({ electrolyteId: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {Object.values(ELECTROLYTE_MATERIALS).map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-teal-700">
                <span>κ = {selectedElectrolyte.conductivityAt25C} mS/cm</span>
                <span>Flash: {selectedElectrolyte.flashPointC > 200 ? 'Non-flammable' : `${selectedElectrolyte.flashPointC}°C`}</span>
              </div>
            </div>

            {/* Separator Selection */}
            <div>
              <label htmlFor="separator-select" className="block text-xs font-medium text-slate-700 mb-1">Separator Membrane</label>
              <select
                id="separator-select"
                value={config.separatorId}
                onChange={(e) => onChangeConfig({ separatorId: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {Object.values(SEPARATOR_MATERIALS).map((sep) => (
                  <option key={sep.id} value={sep.id}>
                    {sep.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Separator Thickness Slider */}
            <ModernSlider
              id="separator-thickness"
              label="Separator Thickness"
              value={config.separatorThicknessUm}
              min={10}
              max={35}
              step={1}
              unit="µm"
              accentColor="teal"
              onChange={(val) => onChangeConfig({ separatorThicknessUm: val })}
            />

            {/* Current Collector Foils & Aluminum Customization */}
            <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Current Collector Foils</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  metrics.aluminumCorrosionRiskScore >= 80
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  Passivation: {metrics.aluminumCorrosionRiskScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cathode-foil-select" className="text-slate-600 block text-[11px] mb-1 font-medium">Cathode Foil</label>
                  <select
                    id="cathode-foil-select"
                    value={config.cathodeFoilMaterial || 'aluminum'}
                    onChange={(e) => onChangeConfig({ cathodeFoilMaterial: e.target.value as FoilMaterialType })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-900"
                  >
                    <option value="aluminum">Aluminum Foil (2.70 g/cm³)</option>
                    <option value="carbon-coated-aluminum">Carbon-Coated Al (Low IR)</option>
                    <option value="nickel">Nickel Foil (8.90 g/cm³)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="anode-foil-select" className="text-slate-600 block text-[11px] mb-1 font-medium">Anode Foil</label>
                  <select
                    id="anode-foil-select"
                    value={config.anodeFoilMaterial || (selectedCathode.category === 'sodium-ion' || selectedCathode.category === 'aluminum-ion' ? 'aluminum' : 'copper')}
                    onChange={(e) => onChangeConfig({ anodeFoilMaterial: e.target.value as FoilMaterialType })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-900"
                  >
                    <option value="copper">Copper Foil (8.96 g/cm³)</option>
                    <option value="aluminum">Aluminum Foil (Na/Al Cell)</option>
                    <option value="nickel">Nickel Foil (8.90 g/cm³)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="al-foil-thick" className="text-slate-600 block text-[11px] mb-1 font-medium">Cathode Foil Thickness</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="al-foil-thick"
                      type="number"
                      min="8"
                      max="30"
                      value={config.aluminumFoilThicknessUm}
                      onChange={(e) => onChangeConfig({ aluminumFoilThicknessUm: Number(e.target.value) })}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900"
                    />
                    <span className="font-mono text-[10px] text-slate-400">µm</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="cu-foil-thick" className="text-slate-600 block text-[11px] mb-1 font-medium">Anode Foil Thickness</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="cu-foil-thick"
                      type="number"
                      min="6"
                      max="25"
                      value={config.copperFoilThicknessUm}
                      onChange={(e) => onChangeConfig({ copperFoilThicknessUm: Number(e.target.value) })}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900"
                    />
                    <span className="font-mono text-[10px] text-slate-400">µm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
