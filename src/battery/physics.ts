/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CellConfiguration,
  CellPerformanceMetrics,
  DischargePoint,
  RagonePoint,
  CycleLifePoint,
} from './types.ts';
import {
  CATHODE_MATERIALS,
  ANODE_MATERIALS,
  ELECTROLYTE_MATERIALS,
  SEPARATOR_MATERIALS,
  FORM_FACTORS,
} from './materials.ts';

// Physical constants
const FARADAY_CONSTANT = 96485.33; // C/mol
const GAS_CONSTANT = 8.314; // J/(mol·K)
const AL_FOIL_DENSITY = 2.70; // g/cm³
const CU_FOIL_DENSITY = 8.96; // g/cm³
const LIQUID_ELECTROLYTE_DENSITY = 1.22; // g/cm³
const SEPARATOR_POLYMER_DENSITY = 0.95; // g/cm³

/**
 * Calculates active material mass in grams given area (cm²), thickness (µm), porosity, and density (g/cm³)
 */
export function calculateActiveMassGrams(
  areaCm2: number,
  thicknessUm: number,
  porosity: number,
  densityGcm3: number,
  activeFraction: number
): number {
  const thicknessCm = thicknessUm * 1e-4;
  const coatingVolumeCm3 = areaCm2 * thicknessCm;
  const solidVolumeCm3 = coatingVolumeCm3 * (1 - porosity);
  const totalSolidMassG = solidVolumeCm3 * densityGcm3;
  return totalSolidMassG * activeFraction;
}

/**
 * Calculates theoretical capacity of an active material in mAh/g from valence electrons and molar mass
 */
export function calculateTheoreticalCapacityFromMolarMass(
  valenceElectrons: number,
  molarMassGmol: number
): number {
  if (molarMassGmol <= 0) return 0;
  // Q = (n * F) / (3.6 * M)
  return (valenceElectrons * FARADAY_CONSTANT) / (3.6 * molarMassGmol);
}

/**
 * Calculates N/P ratio and balance status between anode and cathode
 */
export function calculateNpRatio(
  anodeCapAh: number,
  cathodeCapAh: number
): {
  npRatio: number;
  status: 'optimal' | 'underbalanced-plating-risk' | 'overbalanced-excess-weight';
} {
  if (cathodeCapAh <= 0) {
    return { npRatio: 0, status: 'underbalanced-plating-risk' };
  }
  const npRatio = Number((anodeCapAh / cathodeCapAh).toFixed(3));
  if (npRatio < 1.05) {
    return { npRatio, status: 'underbalanced-plating-risk' };
  }
  if (npRatio > 1.30) {
    return { npRatio, status: 'overbalanced-excess-weight' };
  }
  return { npRatio, status: 'optimal' };
}

/**
 * Computes all cell performance metrics from a complete cell configuration
 */
export function computeCellMetrics(config: CellConfiguration): CellPerformanceMetrics {
  const cathode = CATHODE_MATERIALS[config.cathodeId] || CATHODE_MATERIALS['nmc-811'];
  const anode = ANODE_MATERIALS[config.anodeId] || ANODE_MATERIALS['synthetic-graphite'];
  const electrolyte = ELECTROLYTE_MATERIALS[config.electrolyteId] || ELECTROLYTE_MATERIALS['standard-commercial'];
  const separator = SEPARATOR_MATERIALS[config.separatorId] || SEPARATOR_MATERIALS['celgard-2325'];
  const formFactor = FORM_FACTORS[config.formFactorId] || FORM_FACTORS['4680'];

  // 1. Active Masses (g)
  const cathodeMassGrams = calculateActiveMassGrams(
    config.electrodeAreaCm2,
    config.cathodeThicknessUm,
    config.cathodePorosity,
    cathode.density,
    config.cathodeActiveFraction
  );

  const anodeMassGrams = calculateActiveMassGrams(
    config.electrodeAreaCm2,
    config.anodeThicknessUm,
    config.anodePorosity,
    anode.density,
    config.anodeActiveFraction
  );

  // 2. Capacities (Ah)
  const cathodeTheoreticalCapAh = (cathodeMassGrams * cathode.theoreticalCapacity) / 1000;
  const anodeTheoreticalCapAh = (anodeMassGrams * anode.theoreticalCapacity) / 1000;
  const cellCapacityAh = Math.min(cathodeTheoreticalCapAh, anodeTheoreticalCapAh);

  const { npRatio, status: npStatus } = calculateNpRatio(anodeTheoreticalCapAh, cathodeTheoreticalCapAh);

  // 3. Current Collector Foil Masses (g)
  const alFoilThicknessCm = config.aluminumFoilThicknessUm * 1e-4;
  const cuFoilThicknessCm = config.copperFoilThicknessUm * 1e-4;
  const aluminumFoilMassGrams = config.electrodeAreaCm2 * alFoilThicknessCm * AL_FOIL_DENSITY;
  // If sodium-ion, copper is often replaced by lighter aluminum foil
  const isNaIon = cathode.category === 'sodium-ion';
  const copperFoilMassGrams = isNaIon
    ? config.electrodeAreaCm2 * cuFoilThicknessCm * AL_FOIL_DENSITY
    : config.electrodeAreaCm2 * cuFoilThicknessCm * CU_FOIL_DENSITY;

  // 4. Separator Mass (g)
  const sepThicknessCm = config.separatorThicknessUm * 1e-4;
  const sepSolidVolumeCm3 = config.electrodeAreaCm2 * sepThicknessCm * (1 - separator.porosity);
  const separatorMassGrams = sepSolidVolumeCm3 * SEPARATOR_POLYMER_DENSITY;

  // 5. Electrolyte Mass (g) - fills the pores in cathode, anode, and separator
  const cathodePoreVolumeCm3 = config.electrodeAreaCm2 * (config.cathodeThicknessUm * 1e-4) * config.cathodePorosity;
  const anodePoreVolumeCm3 = config.electrodeAreaCm2 * (config.anodeThicknessUm * 1e-4) * config.anodePorosity;
  const sepPoreVolumeCm3 = config.electrodeAreaCm2 * (config.separatorThicknessUm * 1e-4) * separator.porosity;
  const totalElectrolyteVolumeCm3 = (cathodePoreVolumeCm3 + anodePoreVolumeCm3 + sepPoreVolumeCm3) * 1.15; // 15% excess wetting
  const electrolyteMassGrams = totalElectrolyteVolumeCm3 * (electrolyte.type.startsWith('solid') ? 2.5 : LIQUID_ELECTROLYTE_DENSITY);

  // 6. Total Cell Mass & Stored Energy
  const casingMassGrams = formFactor.casingMassGrams;
  const totalCellMassGrams = Number((
    cathodeMassGrams +
    anodeMassGrams +
    aluminumFoilMassGrams +
    copperFoilMassGrams +
    separatorMassGrams +
    electrolyteMassGrams +
    casingMassGrams
  ).toFixed(2));

  // Cell nominal voltage
  const nominalVoltageV = Number(Math.max(1.2, cathode.nominalPotentialVsLi - anode.nominalPotentialVsLi).toFixed(2));
  const cutoffVoltageMinV = Number((nominalVoltageV - 1.1).toFixed(2));
  const cutoffVoltageMaxV = Number((nominalVoltageV + 0.45).toFixed(2));

  const storedEnergyWh = Number((cellCapacityAh * nominalVoltageV).toFixed(2));
  const gravimetricEnergyDensityWhKg = Number(((storedEnergyWh / (totalCellMassGrams / 1000))).toFixed(1));
  const volumetricEnergyDensityWhL = Number(((storedEnergyWh / (formFactor.nominalVolumeMl / 1000))).toFixed(1));

  // 7. Internal Resistance Estimation (mOhm)
  // R_separator = L / (sigma * Area * (eps / tau))
  const epsOverTau = separator.porosity / Math.pow(separator.tortuosity, 1.5);
  const effectiveConductivityS_cm = (electrolyte.conductivityAt25C * 1e-3) * epsOverTau;
  const separatorResistanceOhm = sepThicknessCm / (effectiveConductivityS_cm * config.electrodeAreaCm2);
  const totalInternalResistanceOhm = separatorResistanceOhm + formFactor.tabResistanceOhm + 0.003;
  const internalResistanceMOhm = Number((totalInternalResistanceOhm * 1000).toFixed(2));

  // Max C-Rates based on chemistry & resistance
  let maxContinuousDischargeC = 3.0;
  let maxContinuousChargeC = 1.0;

  if (anode.id === 'lto-spinel') {
    maxContinuousDischargeC = 10.0;
    maxContinuousChargeC = 6.0;
  } else if (cathode.id === 'lfp') {
    maxContinuousDischargeC = 4.0;
    maxContinuousChargeC = 2.0;
  } else if (anode.id.includes('silicon')) {
    maxContinuousDischargeC = 2.5;
    maxContinuousChargeC = 0.8; // Lower charging C-rate to protect against volume stress
  } else if (electrolyte.type.startsWith('solid')) {
    maxContinuousDischargeC = 2.0;
    maxContinuousChargeC = 0.7; // Solid-solid interface kinetics
  }

  // Adjust for tabless form factor (4680 tabless has 5x lower Joule heating)
  if (config.formFactorId === '4680') {
    maxContinuousChargeC = Number((maxContinuousChargeC * 1.5).toFixed(1));
    maxContinuousDischargeC = Number((maxContinuousDischargeC * 1.3).toFixed(1));
  }

  // Safety & Thermal Runaway evaluation
  const thermalRunawayOnsetTempC = cathode.thermalDecompositionTemp;
  const heatCapacityJoulesPerKelvin = totalCellMassGrams * 1.05; // ~1.05 J/(g·K) standard battery specific heat

  const safetyFlags: string[] = [];
  let safetyScore = 85;

  if (npStatus === 'underbalanced-plating-risk') {
    safetyFlags.push('High Lithium Plating Risk: N/P ratio < 1.05 may cause metallic dendrites during charging');
    safetyScore -= 30;
  }
  if (electrolyte.flashPointC < 30) {
    safetyFlags.push(`Volatile liquid solvent: Flash point ${electrolyte.flashPointC}°C requires strict thermal management`);
    safetyScore -= 10;
  }
  if (cathode.thermalDecompositionTemp <= 210) {
    safetyFlags.push(`Low thermal decomposition threshold (${cathode.thermalDecompositionTemp}°C) requires pack-level liquid cooling`);
    safetyScore -= 12;
  }
  if (cathode.id === 'lfp' && electrolyte.type === 'liquid') {
    safetyFlags.push('Inherently safe cathode chemistry: No oxygen release during mechanical puncture');
    safetyScore += 15;
  }
  if (electrolyte.type.startsWith('solid-oxide')) {
    safetyFlags.push('Non-flammable solid oxide electrolyte: Immune to thermal runaway fires');
    safetyScore += 25;
  }
  safetyScore = Math.max(10, Math.min(99, safetyScore));

  return {
    nominalVoltageV,
    cutoffVoltageMinV,
    cutoffVoltageMaxV,
    cathodeTheoreticalCapAh: Number(cathodeTheoreticalCapAh.toFixed(3)),
    anodeTheoreticalCapAh: Number(anodeTheoreticalCapAh.toFixed(3)),
    cellCapacityAh: Number(cellCapacityAh.toFixed(3)),
    npRatio,
    npStatus,
    cathodeMassGrams: Number(cathodeMassGrams.toFixed(2)),
    anodeMassGrams: Number(anodeMassGrams.toFixed(2)),
    aluminumFoilMassGrams: Number(aluminumFoilMassGrams.toFixed(2)),
    copperFoilMassGrams: Number(copperFoilMassGrams.toFixed(2)),
    electrolyteMassGrams: Number(electrolyteMassGrams.toFixed(2)),
    separatorMassGrams: Number(separatorMassGrams.toFixed(2)),
    casingMassGrams: Number(casingMassGrams.toFixed(2)),
    totalCellMassGrams,
    storedEnergyWh,
    gravimetricEnergyDensityWhKg,
    volumetricEnergyDensityWhL,
    maxContinuousDischargeC,
    maxContinuousChargeC,
    internalResistanceMOhm,
    thermalRunawayOnsetTempC,
    heatCapacityJoulesPerKelvin: Number(heatCapacityJoulesPerKelvin.toFixed(1)),
    safetyScore,
    safetyFlags,
  };
}

/**
 * Generates an empirical/kinetic voltage vs SOC discharge curve at a specified C-Rate
 */
export function generateDischargeCurve(
  metrics: CellPerformanceMetrics,
  config: CellConfiguration,
  cRate: number = 1.0,
  ambientTempC: number = 25
): DischargePoint[] {
  const points: DischargePoint[] = [];
  const steps = 50;
  const currentA = metrics.cellCapacityAh * cRate;
  const resistanceOhm = metrics.internalResistanceMOhm / 1000;

  // Temperature effect on internal resistance (Arrhenius relation: higher T = lower R)
  const tempCorrection = Math.exp(1500 * (1 / (ambientTempC + 273.15) - 1 / 298.15));
  const effectiveR = resistanceOhm * tempCorrection;
  const ohmicDrop = currentA * effectiveR;

  // Thermal heating during discharge
  let currentTempC = ambientTempC;
  const dischargeDurationSec = (3600 / cRate);
  const dtSec = dischargeDurationSec / steps;

  for (let i = 0; i <= steps; i++) {
    const soc = 1 - (i / steps); // 1.0 down to 0.0
    const deliveredAh = Number(((1 - soc) * metrics.cellCapacityAh).toFixed(3));

    // Base open-circuit voltage OCV(SOC)
    let ocv = metrics.nominalVoltageV;
    const isLfp = config.cathodeId === 'lfp';

    if (isLfp) {
      // Flat two-phase plateau for LiFePO4
      if (soc > 0.95) {
        ocv = 3.42 - (1 - soc) * 0.4;
      } else if (soc < 0.10) {
        ocv = 3.20 - Math.pow(0.10 - soc, 1.3) * 4.5;
      } else {
        // Flat plateau around 3.25V - 3.28V
        ocv = 3.25 + (soc - 0.5) * 0.06;
      }
    } else {
      // Sloping curve for NMC/NCA/LCO solid-solution
      if (soc > 0.95) {
        ocv = metrics.cutoffVoltageMaxV - (1 - soc) * 0.8;
      } else if (soc < 0.08) {
        ocv = metrics.cutoffVoltageMinV + (soc / 0.08) * 0.5;
      } else {
        ocv = metrics.cutoffVoltageMinV + 0.5 + Math.pow(soc, 0.75) * (metrics.cutoffVoltageMaxV - metrics.cutoffVoltageMinV - 0.8);
      }
    }

    // Dynamic overpotentials: Ohmic + Charge Transfer + Diffusion at low SOC
    const diffusionOverpotential = soc < 0.15 ? (0.15 - soc) * 0.4 * Math.sqrt(cRate) : 0;
    const chargeTransferOverpotential = 0.025 * Math.log(1 + (cRate * 1.5));
    const totalOverpotential = ohmicDrop + chargeTransferOverpotential + diffusionOverpotential;

    const voltageV = Math.max(metrics.cutoffVoltageMinV - 0.2, Number((ocv - totalOverpotential).toFixed(3)));
    const powerW = Number((voltageV * currentA).toFixed(2));

    // Heat generation: Q = I²R + entropic heat
    const heatPowerW = Math.pow(currentA, 2) * effectiveR + Math.abs(currentA * 0.02);
    // Heat dissipation to ambient (convective)
    const heatDissipationW = 0.4 * (currentTempC - ambientTempC);
    const netHeatPowerW = Math.max(0, heatPowerW - heatDissipationW);
    const deltaT = (netHeatPowerW * dtSec) / metrics.heatCapacityJoulesPerKelvin;
    currentTempC = Number((currentTempC + deltaT).toFixed(1));

    points.push({
      socPercent: Math.round(soc * 100),
      voltageV,
      deliveredAh,
      powerW,
      temperatureC: currentTempC,
    });
  }

  return points;
}

/**
 * Calculates Ragone Plot data across various C-Rates (Power vs Energy)
 */
export function generateRagonePlot(metrics: CellPerformanceMetrics): RagonePoint[] {
  const cRates = [0.1, 0.2, 0.5, 1.0, 2.0, 3.0, 5.0];
  const massKg = metrics.totalCellMassGrams / 1000;

  return cRates.map((cRate) => {
    // Voltage drop efficiency penalty at high C-rate
    const currentA = metrics.cellCapacityAh * cRate;
    const ohmicDrop = currentA * (metrics.internalResistanceMOhm / 1000);
    const effectiveVoltage = Math.max(metrics.cutoffVoltageMinV, metrics.nominalVoltageV - ohmicDrop);
    const energyWh = metrics.cellCapacityAh * effectiveVoltage;
    const powerW = currentA * effectiveVoltage;

    const specificEnergyWhkg = Number((energyWh / massKg).toFixed(1));
    const specificPowerWkg = Number((powerW / massKg).toFixed(1));

    return {
      cRate,
      specificPowerWkg,
      specificEnergyWhkg,
    };
  });
}

/**
 * Projects Cycle Life Degradation over 1500 cycles based on SEI growth & stress
 */
export function projectCycleLife(
  metrics: CellPerformanceMetrics,
  cRate: number = 1.0,
  tempC: number = 25
): CycleLifePoint[] {
  const points: CycleLifePoint[] = [];
  const totalCycles = 1500;
  const step = 50;

  // Degradation acceleration factors:
  // 1. High temp increases parasitic SEI growth rate
  const tempFactor = Math.exp((tempC - 25) / 20);
  // 2. High C-rate causes particle cracking and micro-delamination
  const cRateFactor = Math.pow(cRate, 0.6);
  // 3. N/P ratio: underbalanced cells degrade significantly faster due to lithium plating
  const npDegradationFactor = metrics.npStatus === 'underbalanced-plating-risk' ? 2.8 : 1.0;

  for (let cycle = 0; cycle <= totalCycles; cycle += step) {
    if (cycle === 0) {
      points.push({
        cycle: 0,
        capacityRetentionPercent: 100,
        internalResistanceRelative: 1.0,
      });
      continue;
    }

    // SEI growth capacity fade follows parabolic time law sqrt(cycle) + linear fatigue
    const fade = (0.35 * Math.sqrt(cycle) + 0.008 * cycle) * tempFactor * cRateFactor * npDegradationFactor;
    const capacityRetentionPercent = Math.max(40, Number((100 - fade).toFixed(1)));
    const internalResistanceRelative = Number((1.0 + (100 - capacityRetentionPercent) * 0.015).toFixed(2));

    points.push({
      cycle,
      capacityRetentionPercent,
      internalResistanceRelative,
    });
  }

  return points;
}
