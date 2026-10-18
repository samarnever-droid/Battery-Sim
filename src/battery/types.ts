/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChemistryCategory = 'lithium-ion' | 'solid-state' | 'sodium-ion' | 'lithium-metal' | 'aluminum-ion' | 'aluminum-air' | 'custom';

export interface CathodeMaterial {
  id: string;
  name: string;
  formula: string;
  category: ChemistryCategory;
  theoreticalCapacity: number; // mAh/g
  nominalPotentialVsLi: number; // V vs Li/Li+
  density: number; // g/cm³
  thermalDecompositionTemp: number; // °C
  pubchemCid?: number;
  pubchemName?: string;
  description: string;
  costPerKg: number; // USD
  diffusionCoefficient: number; // cm²/s
}

export interface AnodeMaterial {
  id: string;
  name: string;
  formula: string;
  category: ChemistryCategory;
  theoreticalCapacity: number; // mAh/g
  nominalPotentialVsLi: number; // V vs Li/Li+
  density: number; // g/cm³
  initialCoulombicEfficiency: number; // %
  volumeExpansion: number; // % swelling upon full lithiation
  pubchemCid?: number;
  pubchemName?: string;
  description: string;
  costPerKg: number; // USD
}

export interface ElectrolyteMaterial {
  id: string;
  name: string;
  type: 'liquid' | 'gel' | 'solid-oxide' | 'solid-sulfide' | 'ionic-liquid' | 'aqueous';
  saltFormula: string;
  solventFormula: string;
  conductivityAt25C: number; // mS/cm
  electrochemicalWindow: [number, number]; // [min V, max V vs Li/Li+]
  flashPointC: number; // °C
  pubchemSaltCid?: number;
  pubchemSolventCid?: number;
  description: string;
}

export interface SeparatorMaterial {
  id: string;
  name: string;
  material: string;
  defaultThicknessUm: number; // µm
  porosity: number; // 0.0 - 1.0
  tortuosity: number;
  maxOperatingTempC: number; // °C
  shutdownTempC: number; // °C
  description: string;
}

export type FormFactorType = '18650' | '21700' | '4680' | 'prismatic' | 'pouch' | 'coin';

export interface FormFactorSpec {
  id: FormFactorType;
  name: string;
  shape: 'cylindrical' | 'prismatic' | 'pouch' | 'coin';
  canMaterial: string;
  casingThicknessMm: number;
  nominalVolumeMl: number;
  casingMassGrams: number;
  typicalElectrodeAreaCm2: number;
  tabResistanceOhm: number;
  description: string;
}

export type FoilMaterialType = 'aluminum' | 'copper' | 'nickel' | 'carbon-coated-aluminum';

export interface CellConfiguration {
  cathodeId: string;
  anodeId: string;
  electrolyteId: string;
  separatorId: string;
  formFactorId: FormFactorType;

  // Geometric & manufacturing parameters
  cathodeThicknessUm: number; // Coating thickness per side, µm (typically 40-100)
  cathodePorosity: number; // 0.20 - 0.40
  cathodeActiveFraction: number; // e.g. 0.94 active, 0.03 binder, 0.03 carbon

  anodeThicknessUm: number; // Coating thickness per side, µm (typically 50-120)
  anodePorosity: number; // 0.25 - 0.40
  anodeActiveFraction: number; // e.g. 0.95 active

  separatorThicknessUm: number; // µm (typically 12 - 25)
  aluminumFoilThicknessUm: number; // µm (typically 12 - 16)
  copperFoilThicknessUm: number; // µm (typically 8 - 12)

  // Foil material customization
  cathodeFoilMaterial?: FoilMaterialType; // Default aluminum
  anodeFoilMaterial?: FoilMaterialType; // Default copper, or aluminum for Na-ion / Al-ion

  electrodeAreaCm2: number; // Total active area (double-sided or wound)
  ambientTempC: number; // Default 25°C
}

export interface CellPerformanceMetrics {
  nominalVoltageV: number;
  cutoffVoltageMinV: number;
  cutoffVoltageMaxV: number;
  
  // Capacities & Mass
  cathodeTheoreticalCapAh: number;
  anodeTheoreticalCapAh: number;
  cellCapacityAh: number;
  npRatio: number; // Negative to Positive capacity ratio
  npStatus: 'optimal' | 'underbalanced-plating-risk' | 'overbalanced-excess-weight';

  cathodeMassGrams: number;
  anodeMassGrams: number;
  aluminumFoilMassGrams: number;
  copperFoilMassGrams: number;
  electrolyteMassGrams: number;
  separatorMassGrams: number;
  casingMassGrams: number;
  totalCellMassGrams: number;

  // Energy & Power Densities
  storedEnergyWh: number;
  gravimetricEnergyDensityWhKg: number;
  volumetricEnergyDensityWhL: number;
  maxContinuousDischargeC: number;
  maxContinuousChargeC: number;
  internalResistanceMOhm: number;

  // Safety & Thermal
  thermalRunawayOnsetTempC: number;
  heatCapacityJoulesPerKelvin: number;
  safetyScore: number; // 1 - 100
  safetyFlags: string[];

  // Aluminum and current collector metrics
  anodeFoilMaterialName: string;
  cathodeFoilMaterialName: string;
  aluminumCorrosionRiskScore: number; // 0 - 100 (100 = safe passivation, 0 = severe pitting)
}

// Realistic Simulation Path Interfaces
export interface CcCvSimulationPoint {
  timeSec: number;
  phase: 'CC' | 'CV' | 'REST';
  currentA: number;
  terminalVoltageV: number;
  socPercent: number;
  deliveredAh: number;
  temperatureC: number;
  internalResistanceOhm: number;
}

export interface GittSimulationPoint {
  stepIndex: number;
  timeSec: number;
  isPulse: boolean;
  currentA: number;
  terminalVoltageV: number;
  equilibriumOcvV: number;
  overpotentialV: number;
  socPercent: number;
  apparentDiffusivityCm2s: number;
}

export interface DriveCyclePoint {
  timeSec: number;
  speedKmh: number;
  cRate: number;
  currentA: number;
  powerKw: number;
  voltageV: number;
  socPercent: number;
  temperatureC: number;
  isRegenerating: boolean;
}

export interface AbuseOverchargePoint {
  timeSec: number;
  appliedVoltageV: number;
  cellVoltageV: number;
  currentA: number;
  alCorrosionCurrentMa: number;
  gasVolumeMl: number;
  temperatureC: number;
  phaseStatus: 'Normal' | 'Electrolyte-Oxidation' | 'Aluminum-Pitting' | 'Separator-Meltdown' | 'Thermal-Runaway';
  warningMessage?: string;
}

// Public API Chemical Reaction Interface
export interface ReactionComponent {
  cid?: number;
  formula: string;
  name: string;
  stoichiometricCoeff: number;
  molarMassGmol: number;
  isGas?: boolean;
}

export interface PublicChemicalReaction {
  id: string;
  name: string;
  category: 'aluminum-electrochemistry' | 'intercalation' | 'passivation-corrosion' | 'degradation-gas' | 'solid-electrolyte';
  balancedEquation: string;
  electronCount: number; // n
  deltaG0_kJ_mol: number; // Standard Gibbs free energy
  standardPotentialE0_V: number; // E0 = -ΔG0 / (nF)
  theoreticalCapacity_mAh_g: number; // Q = nF / (3.6 * M)
  reactants: ReactionComponent[];
  products: ReactionComponent[];
  description: string;
  physicalSignificance: string;
  pubchemVerificationUrl?: string;
  ghsHazards?: string[];
}

// 100% Mathematically Verified Engine Report
export interface MathematicalLawVerification {
  id: string;
  lawName: string;
  domain: 'Electrochemical' | 'Thermodynamic' | 'Transport' | 'Conservation';
  formulaLatex: string;
  governingEquation: string;
  expectedValue: number | string;
  computedValue: number | string;
  residualError: number;
  tolerance: number;
  status: 'VERIFIED_100_PERCENT' | 'FAILED';
  proofNotes: string;
}

export interface MathematicalVerificationReport {
  timestamp: string;
  engineVersion: string;
  overallStatus: '100% Mathematically Verified';
  lawsVerifiedCount: number;
  lawsPassedCount: number;
  maxResidualError: number;
  certHash: string;
  laws: MathematicalLawVerification[];
}

export interface DischargePoint {
  socPercent: number; // 100 to 0
  voltageV: number;
  deliveredAh: number;
  powerW: number;
  temperatureC: number;
}

export interface CycleLifePoint {
  cycle: number;
  capacityRetentionPercent: number;
  internalResistanceRelative: number;
}

export interface RagonePoint {
  specificPowerWkg: number;
  specificEnergyWhkg: number;
  cRate: number;
}

// Model Context Protocol (MCP) Types
export interface McpToolParameter {
  type: string;
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: any;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpToolParameter>;
    required?: string[];
  };
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
