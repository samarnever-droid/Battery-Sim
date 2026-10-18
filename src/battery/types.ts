/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChemistryCategory = 'lithium-ion' | 'solid-state' | 'sodium-ion' | 'lithium-metal';

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
  type: 'liquid' | 'gel' | 'solid-oxide' | 'solid-sulfide';
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
