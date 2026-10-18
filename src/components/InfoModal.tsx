/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, Atom, Zap, Terminal, ShieldCheck, ExternalLink } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              ElectroMCP Science & Protocol Documentation
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Section 1: Electrochemical Foundation */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>1. Electrochemical & Physical Modeling Principles</span>
            </div>
            <p>
              ElectroMCP computes cell performance using first-principles thermodynamics and Butler-Volmer electrode kinetics:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono space-y-1.5 text-[11px] text-slate-800">
              <div>
                <strong>Theoretical Capacity:</strong> Q_th = (n · F) / (3.6 · M_w) [mAh/g]
              </div>
              <div>
                <strong>N/P Balancing Ratio:</strong> (Area · L_anode · (1 - ε) · ρ · Cap_anode) / (Area · L_cath · (1 - ε) · ρ · Cap_cath)
              </div>
              <div>
                <strong>Cell Overpotential:</strong> V(t) = OCV(SOC) - I·R_ohmic - η_ct - η_diff
              </div>
              <div>
                <strong>Thermal Generation:</strong> Q_gen = I²·R_int + I·T·(dE0/dT) [Joule + Reversible Entropic Heat]
              </div>
            </div>
          </section>

          {/* Section 2: Model Context Protocol (MCP) Integration */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span>2. Model Context Protocol (MCP) Standard</span>
            </div>
            <p>
              ElectroMCP implements the official Model Context Protocol (MCP) specification (v2024-11-05). It exposes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong>Tools (`tools/*`):</strong> <code>calculate_cell_specs</code>, <code>simulate_discharge_curve</code>, <code>analyze_thermal_runaway</code>, <code>optimize_np_ratio</code>, <code>query_material_pubchem</code>.
              </li>
              <li>
                <strong>Resources (`resources/*`):</strong> <code>battery://materials/catalog</code>, <code>battery://active-cell/profile</code>, <code>battery://benchmarks/industry-standards</code>.
              </li>
              <li>
                <strong>Prompts (`prompts/*`):</strong> Structured engineering prompts for safety audits, CC-CV charging optimization, and solid-state migration.
              </li>
            </ul>
          </section>

          {/* Section 3: PubChem Bioscience Verification */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Atom className="w-4 h-4 text-teal-600" />
              <span>3. PubChem Chemical Database Integration</span>
            </div>
            <p>
              Active electrode phases, liquid electrolyte salts, organic carbonate solvents, and functional additives are cross-referenced directly with the National Library of Medicine (NLM/NIH) PubChem database using PUG-REST. All CIDs, SMILES, and 2D molecular PNGs are authoritatively sourced.
            </p>
          </section>

          {/* Section 4: Epistemic Provenance */}
          <section className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
            <div className="font-semibold text-slate-900">Epistemic Provenance & Attribution:</div>
            <div>• Cathode & Anode Specific Capacities: Experimentally validated commercial material benchmarks (NMC 811, LiFePO4, Artificial Graphite).</div>
            <div>• Electrolyte Conductivities: Temperature-dependent Arrhenius models calibrated against 1.0M LiPF6 in EC:DMC.</div>
            <div>• Safety Limits: Based on accelerated rate calorimetry (ARC) thermal decomposition thresholds.</div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            ElectroMCP • Model Context Protocol Battery Workbench
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
