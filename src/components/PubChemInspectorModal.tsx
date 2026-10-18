/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Atom,
  Zap,
  Flame,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  getPubChemCompound,
  searchPubChemByName,
  CORE_PUBLIC_BATTERY_REACTIONS,
  type PubChemCompoundData,
} from '../battery/pubchem.ts';
import type { PublicChemicalReaction } from '../battery/types.ts';

interface PubChemInspectorModalProps {
  initialCid?: number;
  onSelectCompoundForBattery?: (compound: PubChemCompoundData) => void;
}

const PRESET_COMPOUNDS = [
  { name: 'Pure Aluminum (Al)', cid: 5359268, role: 'Anode & Current Collector' },
  { name: 'Al2O3 Passivation', cid: 9989226, role: 'Protective Native Oxide Film' },
  { name: 'AlF3 Passivation', cid: 24252, role: 'Fluorinated Protective Layer' },
  { name: 'AlCl3 Chloroaluminate', cid: 24012, role: 'Al-Ion Lewis Acid Electrolyte' },
  { name: '[EMIm]Cl Ionic Liquid', cid: 2734162, role: 'Al-Ion Molten Salt Cation' },
  { name: 'LiFePO4 (LFP)', cid: 10989011, role: 'Cathode Active Material' },
  { name: 'LiPF6 (Electrolyte Salt)', cid: 24773, role: 'Electrolyte Solute' },
  { name: 'Ethylene Carbonate (EC)', cid: 7303, role: 'High-Dielectric Solvent' },
  { name: 'Dimethyl Carbonate (DMC)', cid: 10427, role: 'Low-Viscosity Co-Solvent' },
  { name: 'Graphite (C)', cid: 5462310, role: 'Anode Host Intercalation' },
  { name: 'Silicon (Si)', cid: 5461123, role: 'High-Capacity Anode Alloy' },
  { name: 'Lithium Metal (Li)', cid: 3028194, role: 'Pure Metal Anode' },
  { name: 'NaPF6 (Sodium Salt)', cid: 23673456, role: 'Sodium-Ion Electrolyte' },
];

export const PubChemInspectorModal: React.FC<PubChemInspectorModalProps> = ({
  initialCid = 5359268, // Default to Aluminum metal!
  onSelectCompoundForBattery,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'compounds' | 'reactions'>('reactions');
  const [selectedCid, setSelectedCid] = useState<number>(initialCid);
  const [compound, setCompound] = useState<PubChemCompoundData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  // Selected reaction for deep inspect
  const [selectedReactionId, setSelectedReactionId] = useState<string>(
    CORE_PUBLIC_BATTERY_REACTIONS[0].id
  );

  const selectedReaction = CORE_PUBLIC_BATTERY_REACTIONS.find((r) => r.id === selectedReactionId) || CORE_PUBLIC_BATTERY_REACTIONS[0];

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setImageError(false);
    getPubChemCompound(selectedCid)
      .then((data) => {
        if (isMounted) {
          setCompound(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setSearchError(null);
    try {
      const cids = await searchPubChemByName(searchQuery.trim());
      if (cids.length > 0) {
        setSelectedCid(cids[0]);
        setActiveSubTab('compounds');
      } else {
        setSearchError(`No exact PubChem records found for "${searchQuery}". Showing standard reference.`);
      }
    } catch (err: any) {
      setSearchError('PubChem query failed. Please try a common chemical formula like Al2O3, LiPF6, or Aluminum.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">
                Public Chemical Reactions & PubChem Materials API
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-teal-100 text-teal-800 rounded">
                NIH NLM PUG-REST API
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Electrochemical reaction pathways, stoichiometric electron balancing, and live NIH PubChem compound queries including Aluminum electrochemistry.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Aluminum, Al2O3, LiPF6, EC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 w-64"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              Search
            </button>
          </form>
        </div>

        {/* Sub-tab Switcher: Public Reactions vs Compound Inspector */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('reactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'reactions'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Public Battery Reaction Catalog ({CORE_PUBLIC_BATTERY_REACTIONS.length})
            </button>

            <button
              onClick={() => setActiveSubTab('compounds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'compounds'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              PubChem Compound Inspector
            </button>
          </div>

          <span className="text-[11px] font-mono text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200 font-bold hidden sm:inline-block">
            Includes Aluminum (Al) Redox Chemistries
          </span>
        </div>

        {/* Quick Compound Selector */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Quick Chemicals:</span>
          {PRESET_COMPOUNDS.map((c) => (
            <button
              key={c.cid}
              onClick={() => {
                setSelectedCid(c.cid);
                setActiveSubTab('compounds');
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all border ${
                selectedCid === c.cid && activeSubTab === 'compounds'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {searchError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs">
          {searchError}
        </div>
      )}

      {/* Sub-Tab 1: Public Chemical Reactions Catalog */}
      {activeSubTab === 'reactions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Reaction List (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="px-2 py-1 flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900">Standard Chemical Reactions</span>
                <span className="text-[10px] font-mono text-slate-400">Faraday-Calibrated</span>
              </div>

              <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                {CORE_PUBLIC_BATTERY_REACTIONS.map((rxn) => {
                  const isSelected = selectedReactionId === rxn.id;
                  const isAl = rxn.category === 'aluminum-electrochemistry' || rxn.id.includes('aluminum');

                  return (
                    <button
                      key={rxn.id}
                      onClick={() => setSelectedReactionId(rxn.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-teal-50/80 border-teal-400 text-teal-950 shadow-xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[220px]">{rxn.name}</span>
                        {isAl && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Aluminum
                          </span>
                        )}
                      </div>

                      <div className="p-1.5 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded border border-slate-800 truncate">
                        {rxn.balancedEquation}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                        <span>E° = {rxn.standardPotentialE0_V} V</span>
                        <span>{rxn.theoreticalCapacity_mAh_g} mAh/g</span>
                        <span>n = {rxn.electronCount} e⁻</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Deep Reaction Inspector (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-100 text-teal-800 border border-teal-200">
                    {selectedReaction.category}
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1">{selectedReaction.name}</h4>
                </div>

                {selectedReaction.pubchemVerificationUrl && (
                  <a
                    href={selectedReaction.pubchemVerificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <span>PubChem Verified CID</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Balanced Chemical Equation Box */}
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                  Balanced Stoichiometric Reaction
                </span>
                <div className="p-3.5 bg-slate-900 text-emerald-300 font-mono text-sm rounded-xl border border-slate-800 shadow-inner">
                  {selectedReaction.balancedEquation}
                </div>
              </div>

              {/* Thermodynamic & Stoichiometric Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase">Standard Potential (E°)</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 block">
                    {selectedReaction.standardPotentialE0_V} V
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase">Theoretical Capacity</span>
                  <span className="font-mono font-extrabold text-teal-700 text-sm mt-0.5 block">
                    {selectedReaction.theoreticalCapacity_mAh_g} mAh/g
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase">Gibbs Free Energy</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 block">
                    {selectedReaction.deltaG0_kJ_mol} kJ/mol
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase">Valence Exchange (n)</span>
                  <span className="font-mono font-extrabold text-blue-700 text-sm mt-0.5 block">
                    {selectedReaction.electronCount} e⁻
                  </span>
                </div>
              </div>

              {/* Reactants and Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Reactants</span>
                  {selectedReaction.reactants.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                      <div>
                        <span className="font-bold text-slate-900">{r.stoichiometricCoeff} {r.formula}</span>
                        <span className="text-slate-500 text-[11px] block">{r.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-slate-700 text-[11px]">{r.molarMassGmol} g/mol</span>
                        {r.cid && (
                          <button
                            onClick={() => {
                              setSelectedCid(r.cid!);
                              setActiveSubTab('compounds');
                            }}
                            className="text-[10px] text-teal-600 hover:underline block"
                          >
                            CID {r.cid}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Products</span>
                  {selectedReaction.products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                      <div>
                        <span className="font-bold text-slate-900">{p.stoichiometricCoeff} {p.formula}</span>
                        <span className="text-slate-500 text-[11px] block">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-slate-700 text-[11px]">{p.molarMassGmol} g/mol</span>
                        {p.cid && (
                          <button
                            onClick={() => {
                              setSelectedCid(p.cid!);
                              setActiveSubTab('compounds');
                            }}
                            className="text-[10px] text-teal-600 hover:underline block"
                          >
                            CID {p.cid}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Significance & Battery Engineering Notes */}
              <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200/80 text-xs text-teal-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-teal-900">
                  <Info className="w-4 h-4 text-teal-700 shrink-0" />
                  Physical Significance & Electrochemistry
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {selectedReaction.physicalSignificance}
                </p>
                <p className="text-slate-500 text-[11px] pt-1">
                  {selectedReaction.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: PubChem Compound Inspector */}
      {activeSubTab === 'compounds' && compound && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 2D Chemical Structure Depiction (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col items-center justify-between text-center">
            <div className="w-full pb-3 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">2D Molecular Structure</span>
              <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                PubChem PNG
              </span>
            </div>

            <div className="my-6 w-56 h-56 flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-xl border border-slate-200 shadow-inner">
              {isLoading ? (
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              ) : imageError ? (
                <div className="flex flex-col items-center justify-center text-center p-2 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-teal-100 border-2 border-teal-500 flex items-center justify-center text-teal-900 font-mono font-bold text-sm shadow-xs">
                    {compound.molecularFormula || 'Mol'}
                  </div>
                  <div className="text-[11px] font-mono text-teal-800 font-semibold max-w-[180px] truncate">
                    {compound.title}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    CID {compound.cid} • {compound.molecularWeight} g/mol
                  </span>
                </div>
              ) : (
                <img
                  src={compound.pngUrl}
                  alt={`Structure of ${compound.title}`}
                  className="max-w-full max-h-full object-contain filter drop-shadow-sm"
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
              )}
            </div>

            <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-slate-500">CID: {compound.cid}</span>
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-600 hover:underline"
              >
                <span>View on PubChem</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Right Column: Chemical Properties & Identifiers (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">{compound.title}</h4>
                {compound.iupacName && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5">IUPAC: {compound.iupacName}</p>
                )}
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                {compound.provenance}
              </span>
            </div>

            {/* Grid of Properties */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Molecular Formula</span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                  {compound.molecularFormula || 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Molecular Weight</span>
                <span className="text-sm font-mono font-bold text-teal-700 mt-1 block">
                  {compound.molecularWeight} g/mol
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Net Formal Charge</span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                  {compound.charge ?? 0}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="block text-[10px] font-mono uppercase text-slate-400">Heavy Atom Count</span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
                  {compound.heavyAtomCount ?? 'N/A'}
                </span>
              </div>
            </div>

            {/* Canonical SMILES representation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Canonical SMILES:</span>
                <button
                  onClick={() => handleCopy(compound.canonicalSmiles, 'smiles')}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-600 hover:underline"
                >
                  {copiedKey === 'smiles' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy SMILES
                </button>
              </div>
              <div className="p-2.5 bg-slate-900 text-teal-300 font-mono text-xs rounded-lg border border-slate-800 break-all select-all">
                {compound.canonicalSmiles || 'None reported'}
              </div>
            </div>

            {/* InChIKey */}
            {compound.inChIKey && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">InChIKey:</span>
                  <button
                    onClick={() => handleCopy(compound.inChIKey!, 'inchikey')}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-600 hover:underline"
                  >
                    {copiedKey === 'inchikey' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy InChIKey
                  </button>
                </div>
                <div className="p-2 bg-slate-50 text-slate-800 font-mono text-xs rounded-lg border border-slate-200 truncate">
                  {compound.inChIKey}
                </div>
              </div>
            )}

            {/* Educational Context for Battery Engineering */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Electrochemical Relevance
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Chemical data grounded directly in the NIH PubChem PUG-REST API. Formulas and molar masses feed directly into Faraday electrochemical stoichiometry for 100% mathematically verified theoretical capacity calculation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
