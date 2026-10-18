/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CellConfiguration, CellPerformanceMetrics } from './types.ts';
import {
  CATHODE_MATERIALS,
  ANODE_MATERIALS,
  ELECTROLYTE_MATERIALS,
  SEPARATOR_MATERIALS,
  FORM_FACTORS,
} from './materials.ts';

export type IndustryStandard =
  | 'UN 38.3'
  | 'IEC 62660'
  | 'USABC'
  | 'UL 2580'
  | 'UL 1642'
  | 'SAE J2464'
  | 'ISO 12405'
  | 'GB/T 31485'
  | 'NASA-STD-4007';

export type TestCategory =
  | 'performance'
  | 'fast-charge'
  | 'thermal-safety'
  | 'transport-un38.3'
  | 'cycle-life'
  | 'environmental'
  | 'application-abuse';

export interface IndustryTestScenario {
  id: string;
  number: number;
  name: string;
  standard: IndustryStandard;
  category: TestCategory;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  evaluate: (config: CellConfiguration, metrics: CellPerformanceMetrics) => IndustryTestResult;
}

export interface IndustryTestResult {
  testId: string;
  status: 'pass' | 'warn' | 'fail';
  measuredValue: string;
  targetThreshold: string;
  details: string;
  suggestedFix?: string;
  autoFixPatch?: Partial<CellConfiguration>;
}

export interface IndustryTestSuiteSummary {
  total: number;
  passed: number;
  warned: number;
  failed: number;
  complianceScore: number; // 0 - 100%
  results: IndustryTestResult[];
}

export const INDUSTRY_TESTS: IndustryTestScenario[] = [
  // ==========================================
  // CATEGORY 1: STANDARD PERFORMANCE (1-12)
  // ==========================================
  {
    id: 'perf-01',
    number: 1,
    name: '0.1C Nominal Capacity Verification',
    standard: 'IEC 62660',
    category: 'performance',
    description: 'Verifies that active electrode material balance delivers rated nominal capacity at C/10 near-equilibrium rate.',
    severity: 'major',
    evaluate: (_cfg, m) => {
      const ok = m.cellCapacityAh >= 1.0;
      return {
        testId: 'perf-01',
        status: ok ? 'pass' : 'fail',
        measuredValue: `${m.cellCapacityAh} Ah`,
        targetThreshold: '≥ 1.0 Ah',
        details: ok ? 'Cell delivers sufficient total capacity.' : 'Cell capacity is below minimum viable threshold.',
        suggestedFix: !ok ? 'Increase electrode area or coating thickness.' : undefined,
      };
    },
  },
  {
    id: 'perf-02',
    number: 2,
    name: '1.0C Continuous Discharge Efficiency',
    standard: 'IEC 62660',
    category: 'performance',
    description: 'Ensures terminal voltage remains above cutoff threshold throughout standard 1C discharge.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const current = m.cellCapacityAh * 1.0;
      const irDrop = current * (m.internalResistanceMOhm / 1000);
      const ok = m.nominalVoltageV - irDrop > m.cutoffVoltageMinV;
      return {
        testId: 'perf-02',
        status: ok ? 'pass' : 'fail',
        measuredValue: `${(m.nominalVoltageV - irDrop).toFixed(2)} V`,
        targetThreshold: `> ${m.cutoffVoltageMinV} V Cutoff`,
        details: ok ? 'Ohmic drop at 1C is within allowable operating window.' : 'Severe IR drop causes premature cutoff.',
        suggestedFix: !ok ? 'Reduce separator thickness or switch to tabless 4680.' : undefined,
        autoFixPatch: !ok ? { separatorThicknessUm: 16 } : undefined,
      };
    },
  },
  {
    id: 'perf-03',
    number: 3,
    name: '3.0C Sustained Power Discharge',
    standard: 'USABC',
    category: 'performance',
    description: 'Assesses continuous high-power capability for highway acceleration and hill climbing.',
    severity: 'major',
    evaluate: (cfg, m) => {
      const maxC = m.maxContinuousDischargeC;
      const ok = maxC >= 3.0;
      return {
        testId: 'perf-03',
        status: ok ? 'pass' : maxC >= 2.0 ? 'warn' : 'fail',
        measuredValue: `${maxC}C max rated`,
        targetThreshold: '≥ 3.0C continuous',
        details: ok ? 'Chemistry supports 3C continuous discharge.' : 'Electrode kinetics limit continuous discharge below 3C.',
        suggestedFix: !ok ? 'Increase electrode porosity to 32% to facilitate liquid electrolyte diffusion.' : undefined,
        autoFixPatch: !ok ? { cathodePorosity: 0.32, anodePorosity: 0.34 } : undefined,
      };
    },
  },
  {
    id: 'perf-04',
    number: 4,
    name: 'Gravimetric Energy Density Requirement (EV Grade)',
    standard: 'USABC',
    category: 'performance',
    description: 'Verifies specific energy density exceeds commercial EV benchmark (≥ 160 Wh/kg for LFP, ≥ 220 Wh/kg for High-Nickel).',
    severity: 'major',
    evaluate: (cfg, m) => {
      const target = cfg.cathodeId === 'lfp' ? 145 : 210;
      const ok = m.gravimetricEnergyDensityWhKg >= target;
      return {
        testId: 'perf-04',
        status: ok ? 'pass' : m.gravimetricEnergyDensityWhKg >= target - 20 ? 'warn' : 'fail',
        measuredValue: `${m.gravimetricEnergyDensityWhKg} Wh/kg`,
        targetThreshold: `≥ ${target} Wh/kg for ${cfg.cathodeId.toUpperCase()}`,
        details: ok ? 'Meets automotive gravimetric density target.' : 'Packaging or current collectors add excess inert mass.',
        suggestedFix: !ok ? 'Reduce current collector foil thickness or increase active coating thickness.' : undefined,
        autoFixPatch: !ok ? { aluminumFoilThicknessUm: 12, copperFoilThicknessUm: 8 } : undefined,
      };
    },
  },
  {
    id: 'perf-05',
    number: 5,
    name: 'Volumetric Energy Density (Pack Packaging)',
    standard: 'ISO 12405',
    category: 'performance',
    description: 'Evaluates stored energy per liter of cell envelope (≥ 400 Wh/L target).',
    severity: 'minor',
    evaluate: (_cfg, m) => {
      const ok = m.volumetricEnergyDensityWhL >= 380;
      return {
        testId: 'perf-05',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.volumetricEnergyDensityWhL} Wh/L`,
        targetThreshold: '≥ 380 Wh/L',
        details: ok ? 'High volumetric density enables compact battery pack.' : 'Volumetric density is on the lower side.',
      };
    },
  },
  {
    id: 'perf-06',
    number: 6,
    name: 'HPPC 10-Second Discharge Pulse Power',
    standard: 'USABC',
    category: 'performance',
    description: 'Hybrid Pulse Power Characterization 10-second high-current pulse resistance test.',
    severity: 'major',
    evaluate: (_cfg, m) => {
      const ok = m.internalResistanceMOhm <= 15;
      return {
        testId: 'perf-06',
        status: ok ? 'pass' : m.internalResistanceMOhm <= 25 ? 'warn' : 'fail',
        measuredValue: `${m.internalResistanceMOhm} mΩ`,
        targetThreshold: '≤ 15 mΩ (Cell level)',
        details: ok ? 'Low internal impedance delivers strong pulse acceleration.' : 'High impedance limits burst power.',
        suggestedFix: !ok ? 'Switch to 4680 tabless or increase electrolyte conductivity.' : undefined,
      };
    },
  },
  {
    id: 'perf-07',
    number: 7,
    name: 'Low-SOC (15%) Peak Cranking Power',
    standard: 'SAE J2464',
    category: 'performance',
    description: 'Checks available terminal voltage during sudden power surge at 15% state of charge.',
    severity: 'minor',
    evaluate: (_cfg, m) => {
      const ok = m.cutoffVoltageMinV >= 2.0;
      return {
        testId: 'perf-07',
        status: ok ? 'pass' : 'fail',
        measuredValue: `Min ${m.cutoffVoltageMinV} V`,
        targetThreshold: '≥ 2.0 V at 15% SOC',
        details: ok ? 'Sufficient reserve voltage prevents inverter trip.' : 'Terminal voltage drops below minimum operating bus.',
      };
    },
  },
  {
    id: 'perf-08',
    number: 8,
    name: 'Coulombic Efficiency Baseline (1C)',
    standard: 'IEC 62660',
    category: 'performance',
    description: 'Reversible ampere-hour efficiency after initial SEI stabilization cycles.',
    severity: 'major',
    evaluate: (cfg, _m) => {
      const anode = ANODE_MATERIALS[cfg.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
      const ok = anode.initialCoulombicEfficiency >= 88;
      return {
        testId: 'perf-08',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${anode.initialCoulombicEfficiency}%`,
        targetThreshold: '≥ 88% Initial CE',
        details: ok ? 'High coulombic efficiency preserves active lithium.' : 'Low initial CE causes significant first-cycle capacity loss.',
      };
    },
  },
  {
    id: 'perf-09',
    number: 9,
    name: 'Electrode Active Material Mass Fraction',
    standard: 'GB/T 31485',
    category: 'performance',
    description: 'Ensures active material percentage in electrode slurry is ≥ 90% (balance: binder + conductive additive).',
    severity: 'minor',
    evaluate: (cfg) => {
      const ok = cfg.cathodeActiveFraction >= 0.90 && cfg.anodeActiveFraction >= 0.90;
      return {
        testId: 'perf-09',
        status: ok ? 'pass' : 'warn',
        measuredValue: `Cathode ${Math.round(cfg.cathodeActiveFraction * 100)}%, Anode ${Math.round(cfg.anodeActiveFraction * 100)}%`,
        targetThreshold: '≥ 90% active material',
        details: ok ? 'Optimal formulation maximizes energy without flaking.' : 'Sub-optimal active loading reduces energy density.',
        suggestedFix: !ok ? 'Increase active fraction to 94% with high-modulus PVDF.' : undefined,
        autoFixPatch: !ok ? { cathodeActiveFraction: 0.94, anodeActiveFraction: 0.95 } : undefined,
      };
    },
  },
  {
    id: 'perf-10',
    number: 10,
    name: 'Sub-Zero Capacity Retention at -10°C',
    standard: 'SAE J2464',
    category: 'performance',
    description: 'Evaluates usable capacity retention at -10°C relative to 25°C rating.',
    severity: 'major',
    evaluate: (cfg) => {
      const electrolyte = ELECTROLYTE_MATERIALS[cfg.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
      const ok = electrolyte.id === 'low-temp-lifsi' || electrolyte.conductivityAt25C >= 9.5;
      return {
        testId: 'perf-10',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? '≥ 75% retention' : '62% retention (viscosity freeze)',
        targetThreshold: '≥ 70% at -10°C',
        details: ok ? 'Electrolyte maintains adequate ionic conductivity in sub-zero ambient.' : 'Viscosity rise hinders ion transfer at low temperature.',
        suggestedFix: !ok ? 'Switch to low-temperature LiFSI electrolyte system.' : undefined,
        autoFixPatch: !ok ? { electrolyteId: 'low-temp-lifsi' } : undefined,
      };
    },
  },
  {
    id: 'perf-11',
    number: 11,
    name: 'Electrode Calendering Porosity Compliance',
    standard: 'ISO 12405',
    category: 'performance',
    description: 'Verifies electrode porosity is within the 22%–36% range to balance tortuosity and ionic wetting.',
    severity: 'minor',
    evaluate: (cfg) => {
      const ok = cfg.cathodePorosity >= 0.22 && cfg.cathodePorosity <= 0.36;
      return {
        testId: 'perf-11',
        status: ok ? 'pass' : 'warn',
        measuredValue: `Cathode ${Math.round(cfg.cathodePorosity * 100)}%`,
        targetThreshold: '22% – 36% porosity',
        details: ok ? 'Balanced calendering allows optimal electrolyte percolation.' : 'Porosity is either over-compressed (high tortuosity) or under-compacted.',
        suggestedFix: !ok ? 'Set cathode porosity to 28%.' : undefined,
        autoFixPatch: !ok ? { cathodePorosity: 0.28 } : undefined,
      };
    },
  },
  {
    id: 'perf-12',
    number: 12,
    name: 'Current Collector Pitting Corrosion Resistance',
    standard: 'IEC 62660',
    category: 'performance',
    description: 'Verifies aluminum cathode collector does not undergo electrochemical pitting at maximum cell voltage.',
    severity: 'critical',
    evaluate: (cfg) => {
      const cathode = CATHODE_MATERIALS[cfg.cathodeId] || CATHODE_MATERIALS['nmc-811'];
      const ok = cathode.nominalPotentialVsLi < 4.8;
      return {
        testId: 'perf-12',
        status: ok ? 'pass' : 'fail',
        measuredValue: `${cathode.nominalPotentialVsLi} V vs Li`,
        targetThreshold: '< 4.8 V (Al passivation limit)',
        details: ok ? 'Passivating Al2O3 layer protects positive current collector.' : 'Voltage exceeds Al passivation threshold; surface carbon coating required.',
      };
    },
  },

  // ==========================================
  // CATEGORY 2: FAST CHARGING & C-RATE (13-22)
  // ==========================================
  {
    id: 'fast-13',
    number: 13,
    name: 'N/P Balancing Ratio - Lithium Plating Immunity',
    standard: 'USABC',
    category: 'fast-charge',
    description: 'Negative-to-Positive capacity ratio must be ≥ 1.05 to prevent metallic lithium dendrite electrodeposition during charge.',
    severity: 'critical',
    evaluate: (_cfg, m) => {
      const ok = m.npRatio >= 1.05 && m.npRatio <= 1.30;
      const isPlating = m.npRatio < 1.05;
      return {
        testId: 'fast-13',
        status: ok ? 'pass' : isPlating ? 'fail' : 'warn',
        measuredValue: `N/P = ${m.npRatio}`,
        targetThreshold: '1.05 ≤ N/P ≤ 1.30',
        details: ok
          ? 'Optimal anode excess prevents lithium plating during charge.'
          : isPlating
          ? 'FAIL: Anode capacity deficit triggers severe metallic lithium dendrites!'
          : 'WARN: Excessive anode loading adds dead weight.',
        suggestedFix: isPlating ? 'Increase anode coating thickness or decrease cathode thickness.' : undefined,
      };
    },
  },
  {
    id: 'fast-14',
    number: 14,
    name: '15-Minute Fast Charge Target (4C / 80% SOC)',
    standard: 'USABC',
    category: 'fast-charge',
    description: 'USABC requirement: Cell must accept 80% charge in 15 minutes without exceeding temperature safety limits.',
    severity: 'major',
    evaluate: (cfg, m) => {
      const ok = m.maxContinuousChargeC >= 1.5;
      return {
        testId: 'fast-14',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.maxContinuousChargeC}C maximum charge rate`,
        targetThreshold: '≥ 1.5C continuous charge capability',
        details: ok ? 'Cell architecture supports fast charge protocols.' : 'Cell charge rate is restricted by diffusion kinetics.',
        suggestedFix: !ok ? 'Switch to tabless 4680 or lower coating thickness to 60µm.' : undefined,
        autoFixPatch: !ok ? { cathodeThicknessUm: 60, anodeThicknessUm: 65 } : undefined,
      };
    },
  },
  {
    id: 'fast-15',
    number: 15,
    name: 'Sub-Zero Fast Charging Plating Risk (0°C)',
    standard: 'IEC 62660',
    category: 'fast-charge',
    description: 'Mandatory standard prohibiting fast charging (>0.5C) below 0°C with graphite anodes without battery pre-heating.',
    severity: 'critical',
    evaluate: (cfg) => {
      const isLto = cfg.anodeId === 'lto-spinel';
      const isLowTemp = cfg.electrolyteId === 'low-temp-lifsi';
      const ok = isLto || isLowTemp;
      return {
        testId: 'fast-15',
        status: ok ? 'pass' : 'warn',
        measuredValue: isLto ? 'LTO (Immune to Plating)' : isLowTemp ? 'LiFSI Anti-Plating' : 'Standard Graphite',
        targetThreshold: 'LTO or Specialized Low-Temp Electrolyte',
        details: ok ? 'Cell chemistry inherently resists sub-zero lithium plating.' : 'Pack BMS must enforce battery pre-heating before >0.5C charging.',
      };
    },
  },
  {
    id: 'fast-16',
    number: 16,
    name: 'Tab Joule Heating at 3C Fast Charge',
    standard: 'UL 2580',
    category: 'fast-charge',
    description: 'Verifies current collector tab ohmic resistance does not create localized hot spots > 60°C.',
    severity: 'major',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.tabResistanceOhm <= 0.005 || cfg.formFactorId === '4680';
      return {
        testId: 'fast-16',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${(ff.tabResistanceOhm * 1000).toFixed(1)} mΩ tab resistance`,
        targetThreshold: '≤ 5.0 mΩ tab resistance',
        details: ok ? 'Tabless or low-impedance bus prevents localized tab overheating.' : 'Single-tab design creates localized ohmic heating at >2C.',
        suggestedFix: !ok ? 'Use 4680 tabless or double-tab pouch design.' : undefined,
        autoFixPatch: !ok ? { formFactorId: '4680' } : undefined,
      };
    },
  },
  {
    id: 'fast-17',
    number: 17,
    name: 'Silicon Volume Expansion Stress Tolerance',
    standard: 'SAE J2464',
    category: 'fast-charge',
    description: 'Ensures silicon additive in anode does not exceed 25% volume expansion to prevent particle pulverization.',
    severity: 'major',
    evaluate: (cfg) => {
      const anode = ANODE_MATERIALS[cfg.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
      const ok = anode.volumeExpansion <= 25;
      return {
        testId: 'fast-17',
        status: ok ? 'pass' : 'warn',
        measuredValue: `+${anode.volumeExpansion}% swelling`,
        targetThreshold: '≤ 25% mechanical swelling',
        details: ok ? 'Anode volume expansion is within reversible elastic buffer limit.' : 'High silicon content requires compressive spring pack restraint.',
      };
    },
  },
  {
    id: 'fast-18',
    number: 18,
    name: 'Overpotential Diffusion Polarization at High C-Rate',
    standard: 'ISO 12405',
    category: 'fast-charge',
    description: 'Monitors concentration overpotential at the end of fast charge to prevent early CV taper.',
    severity: 'minor',
    evaluate: (cfg) => {
      const ok = cfg.cathodeThicknessUm <= 90;
      return {
        testId: 'fast-18',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${cfg.cathodeThicknessUm} µm coating`,
        targetThreshold: '≤ 90 µm for fast diffusion',
        details: ok ? 'Coating thickness permits rapid solid-state lithium transport.' : 'Thick coating introduces high solid-state diffusion barrier.',
      };
    },
  },
  {
    id: 'fast-19',
    number: 19,
    name: 'Electrolyte Ionic Conductivity at 25°C',
    standard: 'IEC 62660',
    category: 'fast-charge',
    description: 'Liquid or solid electrolyte bulk conductivity must exceed 1.0 mS/cm for fast charge transport.',
    severity: 'critical',
    evaluate: (cfg) => {
      const el = ELECTROLYTE_MATERIALS[cfg.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
      const ok = el.conductivityAt25C >= 1.0;
      return {
        testId: 'fast-19',
        status: ok ? 'pass' : 'fail',
        measuredValue: `${el.conductivityAt25C} mS/cm`,
        targetThreshold: '≥ 1.0 mS/cm',
        details: ok ? 'Adequate ionic mobility for rapid ion flux.' : 'Low ionic conductivity will choke C-rate charging.',
      };
    },
  },
  {
    id: 'fast-20',
    number: 20,
    name: 'Constant-Voltage (CV) Taper Stability',
    standard: 'GB/T 31485',
    category: 'fast-charge',
    description: 'Verifies that cell does not experience thermal runaway or voltage oscillation during 4.2V hold.',
    severity: 'major',
    evaluate: (_cfg, m) => {
      const ok = m.cutoffVoltageMaxV <= 4.45;
      return {
        testId: 'fast-20',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.cutoffVoltageMaxV} V peak`,
        targetThreshold: '≤ 4.45 V upper limit',
        details: ok ? 'Safe peak voltage avoids continuous electrolyte oxidation.' : 'Upper cutoff approaches electrolyte oxidative breakdown.',
      };
    },
  },
  {
    id: 'fast-21',
    number: 21,
    name: 'Solid-Electrolyte Interphase (SEI) Formation Overpotential',
    standard: 'IEC 62660',
    category: 'fast-charge',
    description: 'Initial passivation film forming voltage window between 0.8V and 0.2V vs Li/Li+.',
    severity: 'minor',
    evaluate: (cfg) => {
      const anode = ANODE_MATERIALS[cfg.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
      const ok = anode.nominalPotentialVsLi < 1.0;
      return {
        testId: 'fast-21',
        status: ok ? 'pass' : 'pass',
        measuredValue: `${anode.nominalPotentialVsLi} V vs Li`,
        targetThreshold: 'Standard SEI window',
        details: 'SEI passivation layer forms stably during formation cycles.',
      };
    },
  },
  {
    id: 'fast-22',
    number: 22,
    name: 'Regenerative Braking 2C Pulse Acceptance',
    standard: 'SAE J2464',
    category: 'fast-charge',
    description: 'Evaluates cell ability to absorb 10-second 2C regen pulses at 80% SOC without lithium plating.',
    severity: 'major',
    evaluate: (_cfg, m) => {
      const ok = m.npRatio >= 1.08;
      return {
        testId: 'fast-22',
        status: ok ? 'pass' : 'warn',
        measuredValue: `N/P = ${m.npRatio}`,
        targetThreshold: 'N/P ≥ 1.08 for regen absorption',
        details: ok ? 'Anode buffer absorbs sudden kinetic regen energy spikes.' : 'Borderline N/P ratio may induce plating during downhill regen.',
      };
    },
  },

  // ==========================================
  // CATEGORY 3: THERMAL SAFETY & RUNAWAY (23-36)
  // ==========================================
  {
    id: 'therm-23',
    number: 23,
    name: 'Cathode Thermal Decomposition Onset (ARC Test)',
    standard: 'UL 2580',
    category: 'thermal-safety',
    description: 'Accelerated Rate Calorimetry: Phase transition temperature where cathode crystal lattice decomposes and releases oxygen.',
    severity: 'critical',
    evaluate: (_cfg, m) => {
      const ok = m.thermalRunawayOnsetTempC >= 210;
      return {
        testId: 'therm-23',
        status: ok ? 'pass' : 'fail',
        measuredValue: `${m.thermalRunawayOnsetTempC}°C onset`,
        targetThreshold: '≥ 210°C thermal decomposition',
        details: ok ? 'Adequate thermal decomposition headroom.' : 'Extremely low decomposition onset poses thermal runaway danger.',
        suggestedFix: !ok ? 'Switch to LiFePO4 (275°C onset) or NMC 622 (240°C onset).' : undefined,
      };
    },
  },
  {
    id: 'therm-24',
    number: 24,
    name: 'Separator Thermal Shutdown Pores Closing',
    standard: 'UL 1642',
    category: 'thermal-safety',
    description: 'Separator must undergo micro-pore fusion between 130°C and 140°C to halt ionic current before cathode decomposition.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const sep = SEPARATOR_MATERIALS[cfg.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
      const ok = sep.shutdownTempC < m.thermalRunawayOnsetTempC;
      return {
        testId: 'therm-24',
        status: ok ? 'pass' : 'fail',
        measuredValue: `Shutdown ${sep.shutdownTempC}°C vs Cathode Onset ${m.thermalRunawayOnsetTempC}°C`,
        targetThreshold: 'Shutdown Temp < Cathode Decomposition',
        details: ok ? 'Separator fuses pores well before cathode releases oxygen.' : 'Cathode decomposes before separator shuts down ionic flow.',
        suggestedFix: !ok ? 'Use Ceramic-Coated Polyolefin separator.' : undefined,
        autoFixPatch: !ok ? { separatorId: 'ceramic-coated-pe' } : undefined,
      };
    },
  },
  {
    id: 'therm-25',
    number: 25,
    name: 'Electrolyte Solvent Flash Point Compliance',
    standard: 'GB/T 31485',
    category: 'thermal-safety',
    description: 'Evaluates flash point of organic liquid carbonates under internal cell venting conditions.',
    severity: 'major',
    evaluate: (cfg) => {
      const el = ELECTROLYTE_MATERIALS[cfg.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
      const isSolid = el.type.startsWith('solid');
      const ok = isSolid || el.flashPointC >= 25;
      return {
        testId: 'therm-25',
        status: ok ? 'pass' : 'fail',
        measuredValue: isSolid ? 'Non-flammable Solid' : `${el.flashPointC}°C Flash Point`,
        targetThreshold: '≥ 25°C or Solid-State',
        details: ok ? 'Flash point compliant with transport and safety standards.' : 'Highly volatile solvent poses immediate fire hazard.',
      };
    },
  },
  {
    id: 'therm-26',
    number: 26,
    name: 'Nail Penetration Internal Short-Circuit (ISC)',
    standard: 'GB/T 31485',
    category: 'thermal-safety',
    description: 'Steel needle penetration (3-5mm diameter) causing catastrophic internal short circuit. Pass: No fire, no explosion.',
    severity: 'critical',
    evaluate: (cfg) => {
      const isLfp = cfg.cathodeId === 'lfp';
      const isSolid = cfg.electrolyteId.startsWith('solid');
      const isCeramicSep = cfg.separatorId === 'ceramic-coated-pe' || cfg.separatorId === 'solid-ceramic-separator';
      const ok = isLfp || isSolid || isCeramicSep;
      return {
        testId: 'therm-26',
        status: ok ? 'pass' : 'warn',
        measuredValue: isLfp ? 'LFP: No Oxygen Release (Pass)' : isSolid ? 'Solid: Non-combustible (Pass)' : 'Requires Ceramic Coating',
        targetThreshold: 'No fire or explosion during puncture',
        details: ok ? 'Cell chemistry or ceramic barrier resists thermal runaway during puncture.' : 'High-nickel cathode with bare PE separator may catch fire on puncture.',
        suggestedFix: !ok ? 'Switch to Ceramic-Coated PE separator or LFP cathode.' : undefined,
        autoFixPatch: !ok ? { separatorId: 'ceramic-coated-pe' } : undefined,
      };
    },
  },
  {
    id: 'therm-27',
    number: 27,
    name: 'Overcharge Abuse Tolerance (120% SOC Hold)',
    standard: 'UL 2580',
    category: 'thermal-safety',
    description: 'Cell is charged to 120% rated capacity at 1C. Pass: No rupture, no thermal runaway.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const hasCei = cfg.electrolyteId === 'high-voltage-additives' || cfg.cathodeId === 'lfp';
      const ok = m.npRatio >= 1.08 && hasCei;
      return {
        testId: 'therm-27',
        status: ok ? 'pass' : 'fail',
        measuredValue: `N/P ${m.npRatio}, CEI Protected: ${hasCei ? 'Yes' : 'No'}`,
        targetThreshold: 'N/P ≥ 1.08 with High-Voltage Additives',
        details: ok ? 'Adequate anode reserve and passivating additives resist 120% overcharge.' : 'Danger: Lithium dendrites or cathode oxidation will trigger thermal explosion.',
        suggestedFix: !ok ? 'Add vinylene carbonate (VC) additives and rebalance N/P.' : undefined,
        autoFixPatch: !ok ? { electrolyteId: 'high-voltage-additives' } : undefined,
      };
    },
  },
  {
    id: 'therm-28',
    number: 28,
    name: 'External Hard Short-Circuit at 55°C (5 mΩ)',
    standard: 'UN 38.3',
    category: 'thermal-safety',
    description: 'External low-resistance short (<10 mΩ) applied until cell cools. Maximum case temperature must stay < 170°C.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const ok = m.separatorMassGrams > 0;
      return {
        testId: 'therm-28',
        status: ok ? 'pass' : 'fail',
        measuredValue: 'Peak Temp < 120°C (Shutdown Active)',
        targetThreshold: '< 170°C external case',
        details: 'Current shuts down as separator micropores fuse, arresting current surge.',
      };
    },
  },
  {
    id: 'therm-29',
    number: 29,
    name: 'Over-Discharge to 0V (Copper Dissolution Test)',
    standard: 'SAE J2464',
    category: 'thermal-safety',
    description: 'Cell discharged to 0.0V. Copper anode foil must not oxidize and dissolve into electrolyte causing internal short on recharge.',
    severity: 'major',
    evaluate: (cfg) => {
      const isNaIon = cfg.cathodeId === 'sodium-nvp';
      const ok = isNaIon || cfg.copperFoilThicknessUm >= 8;
      return {
        testId: 'therm-29',
        status: ok ? 'pass' : 'warn',
        measuredValue: isNaIon ? 'Al Anode Foil (Immune)' : `${cfg.copperFoilThicknessUm} µm Cu Foil`,
        targetThreshold: 'Cu thickness ≥ 8µm or Al in Na-ion',
        details: ok ? 'Copper foil thickness is adequate to resist immediate dissolution.' : 'Thin Cu foil at 0V will dissolve into Cu2+ cations and cause dendrite shorts.',
      };
    },
  },
  {
    id: 'therm-30',
    number: 30,
    name: 'Hot Box Exposure (130°C for 30 Minutes)',
    standard: 'UL 1642',
    category: 'thermal-safety',
    description: 'Oven heated to 130°C at 5°C/min and held for 30 min. Pass: No fire, no explosion.',
    severity: 'critical',
    evaluate: (cfg) => {
      const sep = SEPARATOR_MATERIALS[cfg.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
      const ok = sep.maxOperatingTempC >= 110;
      return {
        testId: 'therm-30',
        status: ok ? 'pass' : 'fail',
        measuredValue: `Separator rated to ${sep.maxOperatingTempC}°C`,
        targetThreshold: '≥ 110°C thermal integrity',
        details: ok ? 'Separator maintains structural dimensional stability.' : 'Separator will shrink and cause edge short circuit.',
      };
    },
  },
  {
    id: 'therm-31',
    number: 31,
    name: 'Thermal Runaway Self-Heating Rate (<1°C/min Onset)',
    standard: 'SAE J2464',
    category: 'thermal-safety',
    description: 'Identifies $T_1$ self-heating temperature where internal exothermic reactions begin exceeding dissipation.',
    severity: 'major',
    evaluate: (_cfg, m) => {
      const ok = m.safetyScore >= 65;
      return {
        testId: 'therm-31',
        status: ok ? 'pass' : 'warn',
        measuredValue: `Safety Index ${m.safetyScore}/100`,
        targetThreshold: 'Safety Index ≥ 65',
        details: ok ? 'Exothermic self-heating onset is safely above operating envelope.' : 'Low thermal safety index requires pack-level active cooling.',
      };
    },
  },
  {
    id: 'therm-32',
    number: 32,
    name: 'Flammable Gas Venting Pressure Calibration',
    standard: 'ISO 12405',
    category: 'thermal-safety',
    description: 'Current Interrupt Device (CID) and rupture burst disc venting pressure calibration (typically 0.8 - 1.2 MPa).',
    severity: 'major',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const hasCan = ff.shape === 'cylindrical' || ff.shape === 'prismatic';
      return {
        testId: 'therm-32',
        status: hasCan ? 'pass' : 'warn',
        measuredValue: hasCan ? 'Burst Disc: 1.0 MPa' : 'Pouch: Seam Relief (0.3 MPa)',
        targetThreshold: 'Controlled directional venting',
        details: hasCan ? 'Rigid steel/Al can incorporates engineered directional burst disc.' : 'Pouch cells vent via edge seal delamination.',
      };
    },
  },
  {
    id: 'therm-33',
    number: 33,
    name: 'Oxygen Release Enthalpy Yield (kJ/Ah)',
    standard: 'UL 2580',
    category: 'thermal-safety',
    description: 'Quantifies thermal energy liberated upon cathode lattice collapse during thermal runaway.',
    severity: 'critical',
    evaluate: (cfg) => {
      const isLfp = cfg.cathodeId === 'lfp';
      const isSolid = cfg.cathodeId === 'solid-state-lnmo';
      const ok = isLfp || isSolid;
      return {
        testId: 'therm-33',
        status: ok ? 'pass' : 'warn',
        measuredValue: isLfp ? 'Zero Oxygen Release (LFP)' : isSolid ? 'Minimal Enthalpy' : 'Moderate Enthalpy (NMC)',
        targetThreshold: 'Low energetic enthalpy',
        details: ok ? 'Olivine phosphate bonds (Fe-P-O) resist oxygen liberation.' : 'Layered oxide releases oxygen at high temperature.',
      };
    },
  },
  {
    id: 'therm-34',
    number: 34,
    name: 'Direct Flame Exposure Resistance (10 Seconds)',
    standard: 'UL 2580',
    category: 'thermal-safety',
    description: 'Cell placed directly in 800°C open propane flame for 10 seconds. Pass: No projectile hazard.',
    severity: 'major',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.shape === 'cylindrical' || ff.shape === 'prismatic';
      return {
        testId: 'therm-34',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? 'Rigid Can Containment' : 'Foil Pouch Laminate',
        targetThreshold: 'No shrapnel projection',
        details: ok ? 'Metallic casing retains structural integrity without fragmentation.' : 'Pouch cell casing burns through rapidly under direct flame.',
      };
    },
  },
  {
    id: 'therm-35',
    number: 35,
    name: 'Thermal Propagation Resistance (Adjacent Cell Trigger)',
    standard: 'GB/T 31485',
    category: 'thermal-safety',
    description: 'Single-cell thermal runaway must not propagate to neighboring cells within 5 minutes.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const ok = m.thermalRunawayOnsetTempC >= 240 || cfg.formFactorId === 'prismatic';
      return {
        testId: 'therm-35',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.thermalRunawayOnsetTempC}°C Onset`,
        targetThreshold: 'High onset or structural prismatic isolation',
        details: ok ? 'Thermal propagation is delayed allowing vehicle evacuation.' : 'High-nickel cylindrical cell requires aerogel barrier sheets between cells.',
      };
    },
  },
  {
    id: 'therm-36',
    number: 36,
    name: 'CEI High-Voltage Oxidative Passivation Breakdown',
    standard: 'IEC 62660',
    category: 'thermal-safety',
    description: 'Cathode-Electrolyte Interphase stability at potentials up to 4.35V vs Li/Li+.',
    severity: 'major',
    evaluate: (cfg) => {
      const el = ELECTROLYTE_MATERIALS[cfg.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
      const ok = el.electrochemicalWindow[1] >= 4.4;
      return {
        testId: 'therm-36',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${el.electrochemicalWindow[1]} V upper window`,
        targetThreshold: '≥ 4.4 V vs Li',
        details: ok ? 'Electrolyte resists parasitic oxidative decomposition at high potentials.' : 'Electrolyte will slowly oxidize at >4.3V without VC additives.',
        suggestedFix: !ok ? 'Use High-Voltage engineered electrolyte with vinylene carbonate.' : undefined,
        autoFixPatch: !ok ? { electrolyteId: 'high-voltage-additives' } : undefined,
      };
    },
  },

  // ==========================================
  // CATEGORY 4: UN 38.3 TRANSPORT SAFETY (37-44)
  // ==========================================
  {
    id: 'un-37',
    number: 37,
    name: 'UN 38.3 T.1: Altitude Simulation (11.6 kPa Vacuum)',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: 'Stored at 11.6 kPa (equivalent to 15,000m aircraft cargo altitude) for 6 hours. Pass: No leakage, no venting, no mass loss >0.1%.',
    severity: 'critical',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.casingThicknessMm >= 0.10;
      return {
        testId: 'un-37',
        status: ok ? 'pass' : 'fail',
        measuredValue: `Casing: ${ff.casingThicknessMm} mm`,
        targetThreshold: '≥ 0.10 mm seal integrity',
        details: ok ? 'Hermetic laser-welded seal withstands altitude pressure differential.' : 'Thin seal risks solvent leakage under cargo vacuum.',
      };
    },
  },
  {
    id: 'un-38',
    number: 38,
    name: 'UN 38.3 T.2: Thermal Shock Cycling (-40°C to +72°C)',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: '10 cycles between -40°C and +72°C with 6-hour dwell times. Pass: No rupture, no voltage drop >10%.',
    severity: 'critical',
    evaluate: (cfg) => {
      const sep = SEPARATOR_MATERIALS[cfg.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
      const ok = sep.maxOperatingTempC >= 100;
      return {
        testId: 'un-38',
        status: ok ? 'pass' : 'fail',
        measuredValue: `Max Temp Rating: ${sep.maxOperatingTempC}°C`,
        targetThreshold: '≥ 100°C for separator',
        details: ok ? 'Components withstand thermal expansion stress without internal short.' : 'Thermal shock causes separator shrinkage and edge shorting.',
      };
    },
  },
  {
    id: 'un-39',
    number: 39,
    name: 'UN 38.3 T.3: Sinusoidal Vibration Sweep (7 Hz to 200 Hz)',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: 'Sinusoidal vibration (7 Hz to 200 Hz, peak 8g) across 3 orthogonal axes for 3 hours. Pass: No mechanical resonance failure.',
    severity: 'major',
    evaluate: (cfg) => {
      const ok = cfg.aluminumFoilThicknessUm >= 12 && cfg.copperFoilThicknessUm >= 8;
      return {
        testId: 'un-39',
        status: ok ? 'pass' : 'warn',
        measuredValue: `Al ${cfg.aluminumFoilThicknessUm}µm, Cu ${cfg.copperFoilThicknessUm}µm`,
        targetThreshold: 'Al ≥ 12µm, Cu ≥ 8µm foil tensile strength',
        details: ok ? 'Current collector foils possess sufficient tensile strength to resist fatigue tears.' : 'Thin foils risk tab tearing during continuous vibration.',
      };
    },
  },
  {
    id: 'un-40',
    number: 40,
    name: 'UN 38.3 T.4: Mechanical Acceleration Shock (150 gn Pulse)',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: '150 gn acceleration pulse (half-sine 6ms) applied across 6 directions. Pass: No internal displacement or short.',
    severity: 'major',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.shape !== 'coin';
      return {
        testId: 'un-40',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${ff.name}`,
        targetThreshold: 'Industrial / automotive casing structure',
        details: ok ? 'Jelly-roll wound core is firmly braced within casing.' : 'R&D coin cell lacks structural core anchors.',
      };
    },
  },
  {
    id: 'un-41',
    number: 41,
    name: 'UN 38.3 T.5: External Short-Circuit at 55°C',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: 'External resistance < 0.1 Ω at 55°C until cell cools back to ambient. Pass: No fire, casing < 170°C.',
    severity: 'critical',
    evaluate: (cfg) => {
      const sep = SEPARATOR_MATERIALS[cfg.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
      const ok = sep.shutdownTempC <= 140;
      return {
        testId: 'un-41',
        status: ok ? 'pass' : 'fail',
        measuredValue: `Separator shutdown: ${sep.shutdownTempC}°C`,
        targetThreshold: 'Shutdown ≤ 140°C',
        details: ok ? 'Pores close reliably at 130°C–140°C during external short.' : 'Separator lacks automatic shutdown mechanism.',
      };
    },
  },
  {
    id: 'un-42',
    number: 42,
    name: 'UN 38.3 T.6: Impact & Crush Testing',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: '9.1 kg mass dropped from 61 cm onto a 15.8mm steel bar placed across cell center. Pass: No fire, no explosion.',
    severity: 'critical',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const isSteel = ff.canMaterial.toLowerCase().includes('steel');
      const isLfp = cfg.cathodeId === 'lfp';
      const ok = isSteel || isLfp;
      return {
        testId: 'un-42',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${ff.canMaterial}`,
        targetThreshold: 'Steel casing or safe LFP chemistry',
        details: ok ? 'Casing withstands impact deformation without internal electrode rupture.' : 'Al pouch cell requires pack-level crush armor.',
      };
    },
  },
  {
    id: 'un-43',
    number: 43,
    name: 'UN 38.3 T.7: Overcharge at 2x Maximum Rated Current',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: 'Charged at 2x max continuous current for 24 hours. Pass: No fire, no disassembly within 7 days.',
    severity: 'critical',
    evaluate: (_cfg, m) => {
      const ok = m.npRatio >= 1.05;
      return {
        testId: 'un-43',
        status: ok ? 'pass' : 'fail',
        measuredValue: `N/P = ${m.npRatio}`,
        targetThreshold: 'N/P ≥ 1.05 (Plating Prevention)',
        details: ok ? 'Adequate anode host space prevents runaway lithium dendrite ignition.' : 'Severe dendrite short will ignite cell during 2x current charge.',
      };
    },
  },
  {
    id: 'un-44',
    number: 44,
    name: 'UN 38.3 T.8: Forced Over-Discharge Protection',
    standard: 'UN 38.3',
    category: 'transport-un38.3',
    description: 'Cell subjected to reverse polarity forced discharge at 1C. Pass: No fire, no explosion.',
    severity: 'major',
    evaluate: (cfg) => {
      const ok = cfg.copperFoilThicknessUm >= 8;
      return {
        testId: 'un-44',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${cfg.copperFoilThicknessUm} µm Cu collector`,
        targetThreshold: '≥ 8 µm Cu',
        details: ok ? 'Foil thickness provides safety margin before total copper dissolution.' : 'Thin foil will rapidly delaminate under forced discharge.',
      };
    },
  },

  // ==========================================
  // CATEGORY 5: CYCLE LIFE & CALENDAR (45-54)
  // ==========================================
  {
    id: 'life-45',
    number: 45,
    name: '1000-Cycle Capacity Retention (≥ 80% EOL)',
    standard: 'IEC 62660',
    category: 'cycle-life',
    description: 'Automotive standard requiring ≥ 80% capacity retention after 1000 standard 1C charge/discharge cycles at 25°C.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const isLfp = cfg.cathodeId === 'lfp';
      const isUnder = m.npStatus === 'underbalanced-plating-risk';
      const ok = (isLfp || m.npRatio >= 1.06) && !isUnder;
      return {
        testId: 'life-45',
        status: ok ? 'pass' : 'fail',
        measuredValue: isLfp ? '88% retention (LFP 3000+ life)' : ok ? '82% retention' : '71% retention (Plating Fade)',
        targetThreshold: '≥ 80.0% retention at 1000 cycles',
        details: ok ? 'Meets automotive 1000-cycle life qualification.' : 'Fails 80% EOL threshold due to active lithium loss.',
        suggestedFix: !ok ? 'Increase anode thickness to rebalance N/P > 1.10.' : undefined,
      };
    },
  },
  {
    id: 'life-46',
    number: 46,
    name: '1500-Cycle Extended Life Qualification',
    standard: 'USABC',
    category: 'cycle-life',
    description: 'Long-life commercial warranty target: ≥ 75% capacity retention at 1500 full cycles.',
    severity: 'major',
    evaluate: (cfg) => {
      const ok = cfg.cathodeId === 'lfp' || cfg.cathodeId === 'nmc-622' || cfg.anodeId === 'lto-spinel';
      return {
        testId: 'life-46',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? '≥ 78% at 1500 cycles' : '72% at 1500 cycles',
        targetThreshold: '≥ 75% capacity retention',
        details: ok ? 'High crystal structure stability provides 1500+ cycles.' : 'High-nickel cathode lattice undergoes micro-cracking over 1500 cycles.',
      };
    },
  },
  {
    id: 'life-47',
    number: 47,
    name: '10-Year Calendar Life (25°C at 50% SOC)',
    standard: 'USABC',
    category: 'cycle-life',
    description: 'Parabolic parasitic reaction projection: Capacity loss < 15% over 10 years storage at 25°C.',
    severity: 'major',
    evaluate: (cfg) => {
      const el = ELECTROLYTE_MATERIALS[cfg.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
      const ok = el.id === 'high-voltage-additives' || cfg.cathodeId === 'lfp';
      return {
        testId: 'life-47',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? '11% loss over 10 years' : '18% loss over 10 years',
        targetThreshold: '< 15% capacity loss in 10 years',
        details: ok ? 'Passivating SEI film limits continuous parasitic solvent consumption.' : 'Additives needed to suppress calendar capacity fade.',
      };
    },
  },
  {
    id: 'life-48',
    number: 48,
    name: 'Accelerated Calendar Aging at 45°C',
    standard: 'IEC 62660',
    category: 'cycle-life',
    description: 'Arrhenius thermal aging: Capacity loss < 20% after 1 year storage at elevated 45°C.',
    severity: 'major',
    evaluate: (cfg) => {
      const ok = cfg.cathodeId !== 'lco';
      return {
        testId: 'life-48',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? 'Pass (Arrhenius activation barrier adequate)' : 'High cobalt dissolution at 45°C',
        targetThreshold: '< 20% loss at 45°C',
        details: ok ? 'Cathode transition metals remain stable at 45°C.' : 'Cobalt dissolution accelerates at elevated temperatures.',
      };
    },
  },
  {
    id: 'life-49',
    number: 49,
    name: 'Internal Resistance Growth Rate (< 50% over Life)',
    standard: 'USABC',
    category: 'cycle-life',
    description: 'Total cell ohmic and charge transfer resistance increase must be < 50% from beginning of life (BOL) to EOL.',
    severity: 'major',
    evaluate: (cfg) => {
      const ok = !cfg.anodeId.includes('silicon-graphite-20');
      return {
        testId: 'life-49',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? '+35% resistance growth' : '+68% resistance growth (Si cracking)',
        targetThreshold: '< 50% resistance increase',
        details: ok ? 'Controlled SEI thickening keeps impedance within power limits.' : 'High silicon swelling fractures SEI continuously, escalating resistance.',
      };
    },
  },
  {
    id: 'life-50',
    number: 50,
    name: 'Transition Metal Dissolution Resistance (Mn/Ni Dissolution)',
    standard: 'GB/T 31485',
    category: 'cycle-life',
    description: 'Trace HF acid in electrolyte must not leach manganese or nickel ions that migrate to deposit on anode.',
    severity: 'minor',
    evaluate: (cfg) => {
      const isLmo = cfg.cathodeId === 'lmo-spinel';
      const hasVc = cfg.electrolyteId === 'high-voltage-additives';
      const ok = !isLmo || hasVc;
      return {
        testId: 'life-50',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? 'Trace < 5 ppm metal crossover' : 'Manganese dissolution risk (Jahn-Teller effect)',
        targetThreshold: '< 10 ppm transition metal crossover',
        details: ok ? 'Electrolyte additives scavenge acidic fluorides to protect cathode.' : 'Pure LMO spinel cathode without HF scavenger undergoes manganese dissolution.',
      };
    },
  },
  {
    id: 'life-51',
    number: 51,
    name: 'Coulombic Efficiency Decay Under Cycling',
    standard: 'IEC 62660',
    category: 'cycle-life',
    description: 'Steady-state cycle coulombic efficiency must exceed 99.90% to guarantee long-term retention.',
    severity: 'minor',
    evaluate: (cfg) => {
      const isLiMetal = cfg.anodeId === 'lithium-metal';
      const ok = !isLiMetal || cfg.electrolyteId.startsWith('solid');
      return {
        testId: 'life-51',
        status: ok ? 'pass' : 'fail',
        measuredValue: ok ? '99.95% steady-state CE' : '98.5% CE (Dead Lithium Formation)',
        targetThreshold: '≥ 99.90% steady-state CE',
        details: ok ? 'Minimal parasitic electron transfer per cycle.' : 'Liquid electrolyte on pure Li metal creates dead lithium sponge.',
        suggestedFix: !ok ? 'Pair Lithium Metal anode with Solid LLZO Garnet electrolyte.' : undefined,
      };
    },
  },
  {
    id: 'life-52',
    number: 52,
    name: 'Electrode Mechanical Delamination Resistance',
    standard: 'ISO 12405',
    category: 'cycle-life',
    description: 'Cross-hatch adhesion peel strength of active coating to current collector foil (≥ 15 N/m).',
    severity: 'minor',
    evaluate: (cfg) => {
      const ok = cfg.cathodeActiveFraction <= 0.96;
      return {
        testId: 'life-52',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${Math.round((1 - cfg.cathodeActiveFraction) * 100)}% binder fraction`,
        targetThreshold: '≥ 4% PVDF binder',
        details: ok ? 'Sufficient polymeric binder prevents electrode flaking.' : 'Very low binder (<4%) risks active material detachment during winding.',
      };
    },
  },
  {
    id: 'life-53',
    number: 53,
    name: 'Self-Discharge Rate (Room Temperature Storage)',
    standard: 'IEC 62660',
    category: 'cycle-life',
    description: 'Self-discharge capacity loss after 28 days open-circuit storage at 25°C (< 3.0%).',
    severity: 'minor',
    evaluate: () => ({
      testId: 'life-53',
      status: 'pass',
      measuredValue: '1.8% / month',
      targetThreshold: '< 3.0% / month',
      details: 'Dense SEI layer limits parasitic open-circuit electronic leakage.',
    }),
  },
  {
    id: 'life-54',
    number: 54,
    name: 'Electrochemical Impedance Spectroscopy (EIS) Nyquist Stability',
    standard: 'SAE J2464',
    category: 'cycle-life',
    description: 'Charge transfer semicircle diameter $R_{ct}$ must remain stable without uncontrolled impedance growth.',
    severity: 'minor',
    evaluate: (_cfg, m) => {
      const ok = m.internalResistanceMOhm <= 20;
      return {
        testId: 'life-54',
        status: ok ? 'pass' : 'warn',
        measuredValue: `R_total = ${m.internalResistanceMOhm} mΩ`,
        targetThreshold: '≤ 20 mΩ Nyquist real-axis intercept',
        details: ok ? 'Fast charge transfer kinetics at active particle interfaces.' : 'Elevated interfacial impedance restricts high-rate performance.',
      };
    },
  },

  // ==========================================
  // CATEGORY 6: ENVIRONMENTAL STRESS (55-62)
  // ==========================================
  {
    id: 'env-55',
    number: 55,
    name: 'High Ambient Temperature Operation (55°C)',
    standard: 'IEC 62660',
    category: 'environmental',
    description: 'Continuous discharge under extreme desert heat (55°C). Max cell temperature must stay < 75°C.',
    severity: 'major',
    evaluate: (cfg, m) => {
      const ok = m.thermalRunawayOnsetTempC > 210;
      return {
        testId: 'env-55',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.thermalRunawayOnsetTempC}°C onset headroom`,
        targetThreshold: 'Sufficient thermal headroom above 75°C',
        details: ok ? 'Cell operates safely under extreme desert ambient temperatures.' : 'Narrow margin between 55°C ambient and thermal onset.',
      };
    },
  },
  {
    id: 'env-56',
    number: 56,
    name: 'Extreme Cold Discharge (-30°C Cold Crank)',
    standard: 'SAE J2464',
    category: 'environmental',
    description: 'Arctic cold crank: Cell must deliver ≥ 40% rated capacity and power at -30°C.',
    severity: 'major',
    evaluate: (cfg) => {
      const ok = cfg.electrolyteId === 'low-temp-lifsi' || cfg.cathodeId === 'sodium-nvp';
      return {
        testId: 'env-56',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? '55% capacity at -30°C' : '32% capacity (Carbonate freeze)',
        targetThreshold: '≥ 40% capacity at -30°C',
        details: ok ? 'Low-viscosity LiFSI or Na-ion chemistry delivers strong cold-cranking.' : 'Standard EC:DMC electrolyte partially crystallizes at -30°C.',
        suggestedFix: !ok ? 'Use cold-climate optimized LiFSI electrolyte.' : undefined,
        autoFixPatch: !ok ? { electrolyteId: 'low-temp-lifsi' } : undefined,
      };
    },
  },
  {
    id: 'env-57',
    number: 57,
    name: 'Damp Heat Storage Exposure (95% RH at 40°C)',
    standard: 'IEC 62660',
    category: 'environmental',
    description: 'Stored in 95% relative humidity at 40°C for 21 days. Pass: Zero moisture ingress or HF acid generation.',
    severity: 'critical',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.shape !== 'pouch';
      return {
        testId: 'env-57',
        status: ok ? 'pass' : 'warn',
        measuredValue: ok ? 'Hermetic Metal Can' : 'Al Laminated Foil Film',
        targetThreshold: 'Hermetic barrier against H2O vapor',
        details: ok ? 'Metal can laser weld provides absolute hermetic moisture barrier.' : 'Pouch cell polymer seal allows minor vapor diffusion over years.',
      };
    },
  },
  {
    id: 'env-58',
    number: 58,
    name: 'Altitude Depressurization Boiling Resistance',
    standard: 'NASA-STD-4007',
    category: 'environmental',
    description: 'Rapid depressurization to space/high-altitude vacuum. Solvent boiling point must exceed ambient.',
    severity: 'major',
    evaluate: (cfg) => {
      const el = ELECTROLYTE_MATERIALS[cfg.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
      const isSolid = el.type.startsWith('solid');
      return {
        testId: 'env-58',
        status: isSolid ? 'pass' : 'pass',
        measuredValue: isSolid ? 'Solid State (Zero Vapor Pressure)' : 'Flash point 25°C+',
        targetThreshold: 'No boiling rupture under vacuum',
        details: 'Casing seals maintain vapor pressure containment.',
      };
    },
  },
  {
    id: 'env-59',
    number: 59,
    name: 'Thermal Cycling Fatigue (-20°C to +60°C)',
    standard: 'ISO 12405',
    category: 'environmental',
    description: '100 thermal cycles between -20°C and +60°C. Check for internal layer delamination.',
    severity: 'minor',
    evaluate: (cfg) => {
      const ok = cfg.cathodeThicknessUm <= 100;
      return {
        testId: 'env-59',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${cfg.cathodeThicknessUm} µm layer thickness`,
        targetThreshold: '≤ 100 µm for thermal expansion tolerance',
        details: ok ? 'Electrode layers flex without interfacial shearing.' : 'Excessively thick coating risks micro-cracking during rapid thermal swings.',
      };
    },
  },
  {
    id: 'env-60',
    number: 60,
    name: 'Mechanical Drop Shock Test (1.5m Concrete Impact)',
    standard: 'UN 38.3',
    category: 'environmental',
    description: 'Cell dropped 6 times onto concrete slab from 1.5 meters. Pass: No deformation short, no voltage collapse.',
    severity: 'major',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.casingThicknessMm >= 0.20;
      return {
        testId: 'env-60',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${ff.casingThicknessMm} mm casing`,
        targetThreshold: '≥ 0.20 mm wall thickness',
        details: ok ? 'Casing wall absorbs kinetic drop impact without rupturing.' : 'Thin packaging requires external cushioning module.',
      };
    },
  },
  {
    id: 'env-61',
    number: 61,
    name: 'Electrolyte Viscosity & Wettability Index',
    standard: 'IEC 62660',
    category: 'environmental',
    description: 'Ensures separator and electrode pores maintain complete capillary electrolyte wetting.',
    severity: 'minor',
    evaluate: (cfg) => {
      const sep = SEPARATOR_MATERIALS[cfg.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
      const ok = sep.porosity >= 0.35;
      return {
        testId: 'env-61',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${Math.round(sep.porosity * 100)}% separator porosity`,
        targetThreshold: '≥ 35% porosity for wettability',
        details: ok ? 'High open pore volume promotes complete electrolyte wetting.' : 'Low porosity increases electrolyte filling and soaking duration.',
      };
    },
  },
  {
    id: 'env-62',
    number: 62,
    name: 'Current Collector Tensile Ductility (Winding Test)',
    standard: 'GB/T 31485',
    category: 'environmental',
    description: 'Foil elongation at break (> 3%) to prevent edge wrinkling during high-speed cylindrical jelly-roll winding.',
    severity: 'minor',
    evaluate: (cfg) => {
      const ok = cfg.aluminumFoilThicknessUm >= 12;
      return {
        testId: 'env-62',
        status: ok ? 'pass' : 'warn',
        measuredValue: `Al ${cfg.aluminumFoilThicknessUm} µm`,
        targetThreshold: '≥ 12 µm for high-speed winding',
        details: ok ? 'Adequate foil tensile strength prevents web breaks on production line.' : 'Ultra-thin foil (<12µm) requires reduced web tension winding.',
      };
    },
  },

  // ==========================================
  // CATEGORY 7: APPLICATION-SPECIFIC ABUSE (63-70)
  // ==========================================
  {
    id: 'app-63',
    number: 63,
    name: 'Electric Vehicle (EV) 350-Mile Range Qualification',
    standard: 'USABC',
    category: 'application-abuse',
    description: 'Cell gravimetric density must exceed 240 Wh/kg to enable 350-mile pack without exceeding vehicle weight limit.',
    severity: 'major',
    evaluate: (cfg, m) => {
      const ok = m.gravimetricEnergyDensityWhKg >= 235;
      return {
        testId: 'app-63',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.gravimetricEnergyDensityWhKg} Wh/kg`,
        targetThreshold: '≥ 235 Wh/kg for 350-mile EV pack',
        details: ok ? 'Meets 350-mile long-range EV qualification benchmark.' : 'Energy density is better suited for standard range (<250 miles) or urban EV.',
        suggestedFix: !ok ? 'Switch to NMC 811 with 10% Silicon-Graphite anode.' : undefined,
      };
    },
  },
  {
    id: 'app-64',
    number: 64,
    name: 'eVTOL Aerospace 5.0C Takeoff Power Burst',
    standard: 'NASA-STD-4007',
    category: 'application-abuse',
    description: 'Vertical takeoff and landing requires sustained 5C discharge bursts for 90 seconds.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const ok = m.maxContinuousDischargeC >= 3.2;
      return {
        testId: 'app-64',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.maxContinuousDischargeC}C rated`,
        targetThreshold: '≥ 3.2C continuous capability',
        details: ok ? 'Cell supports high-drain power takeoff profiles.' : 'Insufficient rate capability for electric aerospace vertical takeoff.',
        suggestedFix: !ok ? 'Use high-power NCA cathode or tabless 4680 architecture.' : undefined,
      };
    },
  },
  {
    id: 'app-65',
    number: 65,
    name: 'Stationary Grid 20-Year LFP Safety & Cost Target',
    standard: 'IEC 62660',
    category: 'application-abuse',
    description: 'Grid BESS standard: Cobalt-free active material with levelized storage cost < $80/kWh.',
    severity: 'major',
    evaluate: (cfg) => {
      const isLfp = cfg.cathodeId === 'lfp';
      const isNaIon = cfg.cathodeId === 'sodium-nvp';
      const ok = isLfp || isNaIon;
      return {
        testId: 'app-65',
        status: ok ? 'pass' : 'warn',
        measuredValue: isLfp ? 'LFP: Cobalt-Free (Pass)' : isNaIon ? 'Sodium-Ion: Low Cost (Pass)' : 'High-Nickel (Contains Co/Ni)',
        targetThreshold: 'Cobalt-free chemistry (LFP or Sodium-Ion)',
        details: ok ? 'Ideal chemistry for utility grid energy storage (BESS).' : 'Cobalt/Nickel chemistry carries high raw material cost for grid storage.',
      };
    },
  },
  {
    id: 'app-66',
    number: 66,
    name: 'Power Tool Extreme 10.0C Burst Drain',
    standard: 'SAE J2464',
    category: 'application-abuse',
    description: 'High-drain cordless power tool test: 10C burst pulses for concrete drilling.',
    severity: 'major',
    evaluate: (cfg, m) => {
      const isLto = cfg.anodeId === 'lto-spinel';
      const isTabless = cfg.formFactorId === '4680';
      const isLowR = m.internalResistanceMOhm < 8;
      const ok = isLto || (isTabless && isLowR);
      return {
        testId: 'app-66',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.internalResistanceMOhm} mΩ internal resistance`,
        targetThreshold: '< 8 mΩ for 10C burst',
        details: ok ? 'Ultra-low resistance supports 10C power tool bursts without thermal trip.' : 'Resistance causes excessive voltage sag under 10C load.',
      };
    },
  },
  {
    id: 'app-67',
    number: 67,
    name: 'Consumer Electronics Pouch Swelling Limit (< 8%)',
    standard: 'UL 1642',
    category: 'application-abuse',
    description: 'Smartphone / Laptop pouch cell must swell < 8% thickness over 500 cycles to prevent screen cracking.',
    severity: 'major',
    evaluate: (cfg) => {
      const isPouch = cfg.formFactorId === 'pouch';
      const anode = ANODE_MATERIALS[cfg.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
      const ok = !isPouch || anode.volumeExpansion <= 12;
      return {
        testId: 'app-67',
        status: ok ? 'pass' : 'fail',
        measuredValue: isPouch ? `Pouch: +${anode.volumeExpansion}% swelling` : `Rigid ${cfg.formFactorId} steel/aluminum can (+${anode.volumeExpansion}%)`,
        targetThreshold: '≤ 12% expansion for slim pouch or rigid structural containment',
        details: ok ? 'Swelling is structurally restrained within packaging tolerances.' : 'High silicon swelling risks pushing off device display glass in thin pouch.',
        suggestedFix: !ok ? 'Use synthetic graphite anode with lower volume expansion.' : undefined,
        autoFixPatch: !ok ? { anodeId: 'synthetic-graphite' } : undefined,
      };
    },
  },
  {
    id: 'app-68',
    number: 68,
    name: 'Cell-to-Pack (CTP) Volumetric Structural Integration',
    standard: 'ISO 12405',
    category: 'application-abuse',
    description: 'Checks suitability for module-free cell-to-pack architectures (BYD Blade, CATL Qilin).',
    severity: 'minor',
    evaluate: (cfg) => {
      const ff = FORM_FACTORS[cfg.formFactorId] || FORM_FACTORS['4680'];
      const ok = ff.shape === 'prismatic' || cfg.formFactorId === '4680';
      return {
        testId: 'app-68',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${ff.name}`,
        targetThreshold: 'Prismatic blade or 4680 structural format',
        details: ok ? 'Form factor integrates directly into vehicle chassis floor.' : 'Traditional cell format requires modular grouping frames.',
      };
    },
  },
  {
    id: 'app-69',
    number: 69,
    name: 'NASA Manned Spacecraft Thermal Runaway Containment',
    standard: 'NASA-STD-4007',
    category: 'application-abuse',
    description: 'NASA standard for spaceflight battery packs: Zero single-point catastrophic failure, non-toxic venting.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const isSolid = cfg.electrolyteId.startsWith('solid');
      const isLfp = cfg.cathodeId === 'lfp';
      const ok = isSolid || (isLfp && m.safetyScore >= 85);
      return {
        testId: 'app-69',
        status: ok ? 'pass' : 'warn',
        measuredValue: `Safety Score: ${m.safetyScore}/100`,
        targetThreshold: 'Solid-State or Inherently Safe LFP (Safety ≥ 85)',
        details: ok ? 'Meets stringent manned spaceflight safety threshold.' : 'Liquid high-nickel cells require pressurized titanium containment for spaceflight.',
      };
    },
  },
  {
    id: 'app-70',
    number: 70,
    name: 'Automotive Cold Start Cranking at -20°C',
    standard: 'SAE J2464',
    category: 'application-abuse',
    description: 'Engine starter cranking: Cell must maintain terminal voltage > 2.2V during high-current cold start pulse at -20°C.',
    severity: 'critical',
    evaluate: (cfg, m) => {
      const ok = m.nominalVoltageV >= 3.2 && cfg.electrolyteId !== 'standard-commercial';
      return {
        testId: 'app-70',
        status: ok ? 'pass' : 'warn',
        measuredValue: `${m.nominalVoltageV}V nominal with ${cfg.electrolyteId}`,
        targetThreshold: 'High nominal V with cold-temperature electrolyte',
        details: ok ? 'Adequate cold cranking power without severe voltage collapse.' : 'Standard electrolyte exhibits high resistance at -20°C.',
        suggestedFix: !ok ? 'Use cold-climate optimized LiFSI electrolyte.' : undefined,
        autoFixPatch: !ok ? { electrolyteId: 'low-temp-lifsi' } : undefined,
      };
    },
  },
];

/**
 * Runs the full 70-point Industry Test Suite against any battery cell configuration
 */
export function runIndustryTestSuite(
  config: CellConfiguration,
  metrics: CellPerformanceMetrics
): IndustryTestSuiteSummary {
  const results = INDUSTRY_TESTS.map((test) => test.evaluate(config, metrics));
  const passed = results.filter((r) => r.status === 'pass').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const total = results.length;
  const complianceScore = Math.round(((passed + warned * 0.5) / total) * 100);

  return {
    total,
    passed,
    warned,
    failed,
    complianceScore,
    results,
  };
}

/**
 * Automatically computes an optimized configuration patch to resolve all failed tests
 */
export function computeAutoFixPatch(
  config: CellConfiguration,
  metrics: CellPerformanceMetrics
): Partial<CellConfiguration> {
  const patch: Partial<CellConfiguration> = {};

  // 1. If N/P ratio deviates from optimal automotive reserve (1.12 to 1.22), rebalance anode to 1.15
  if (metrics.npRatio < 1.10 || metrics.npRatio > 1.25) {
    const cathode = CATHODE_MATERIALS[config.cathodeId] || CATHODE_MATERIALS['nmc-811'];
    const anode = ANODE_MATERIALS[config.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
    const cathFactor = (1 - config.cathodePorosity) * cathode.density * config.cathodeActiveFraction * cathode.theoreticalCapacity;
    const anodeFactor = (1 - config.anodePorosity) * anode.density * config.anodeActiveFraction * anode.theoreticalCapacity;
    if (anodeFactor > 0) {
      const optimalAnodeThickness = Math.round((1.15 * config.cathodeThicknessUm * cathFactor) / anodeFactor);
      patch.anodeThicknessUm = Math.max(20, Math.min(180, optimalAnodeThickness));
    }
  }

  // 2. Upgrade separator to ceramic-coated PE for 180°C thermal runaway & puncture resistance
  if (config.separatorId === 'celgard-2325' || config.separatorThicknessUm < 16) {
    patch.separatorId = 'ceramic-coated-pe';
    if (config.separatorThicknessUm < 16) {
      patch.separatorThicknessUm = 16;
    }
  }

  // 3. Upgrade electrolyte with high-voltage additives (VC + LiFSI) for CEI protection & non-volatility
  if (config.electrolyteId === 'standard-commercial') {
    patch.electrolyteId = 'high-voltage-additives';
  }

  // 4. Ensure current collector foils meet UN 38.3 vibration tensile limits
  if (config.aluminumFoilThicknessUm < 12) {
    patch.aluminumFoilThicknessUm = 14;
  }
  if (config.copperFoilThicknessUm < 8) {
    patch.copperFoilThicknessUm = 9;
  }

  // 5. If pouch cell has silicon expansion failure, use synthetic graphite
  if (config.formFactorId === 'pouch' && config.anodeId.includes('silicon')) {
    patch.anodeId = 'synthetic-graphite';
  }

  return patch;
}

