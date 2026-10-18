/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateActiveMassGrams,
  calculateTheoreticalCapacityFromMolarMass,
  calculateNpRatio,
  computeCellMetrics,
  generateDischargeCurve,
  generateRagonePlot,
  projectCycleLife,
} from './physics.ts';
import { BATTERY_PRESETS } from './materials.ts';

test('theoretical capacity from molar mass calculates correctly using Faraday constant', () => {
  // LiFePO4: n=1, M=157.757 g/mol -> Theoretical capacity = (1 * 96485.33) / (3.6 * 157.757) = ~169.89 mAh/g
  const lfpCapacity = calculateTheoreticalCapacityFromMolarMass(1, 157.757);
  assert.ok(Math.abs(lfpCapacity - 169.89) < 0.2, `Expected ~169.89 mAh/g, got ${lfpCapacity}`);

  // Graphite LiC6: n=1, M=72.06 g/mol (6*12.011) -> (96485.33) / (3.6 * 72.06) = ~371.9 mAh/g
  const graphiteCapacity = calculateTheoreticalCapacityFromMolarMass(1, 72.06);
  assert.ok(Math.abs(graphiteCapacity - 371.9) < 0.5, `Expected ~371.9 mAh/g, got ${graphiteCapacity}`);
});

test('calculateActiveMassGrams correctly accounts for porosity and active fraction', () => {
  // 100 cm² area, 100 µm thickness (0.01 cm), 30% porosity (0.70 solid), density 4.75 g/cm³, 94% active
  // Volume = 100 * 0.01 = 1.0 cm³
  // Solid volume = 0.70 cm³
  // Total mass = 0.70 * 4.75 = 3.325 g
  // Active mass = 3.325 * 0.94 = 3.1255 g
  const activeMass = calculateActiveMassGrams(100, 100, 0.30, 4.75, 0.94);
  assert.ok(Math.abs(activeMass - 3.1255) < 0.01, `Expected ~3.1255 g, got ${activeMass}`);
});

test('calculateNpRatio classifies underbalanced, optimal, and overbalanced designs', () => {
  // Underbalanced (< 1.05): Lithium plating risk
  const under = calculateNpRatio(1.0, 1.05); // ratio = 0.952
  assert.equal(under.status, 'underbalanced-plating-risk');
  assert.ok(under.npRatio < 1.05);

  // Optimal (1.05 to 1.30): Standard automotive buffer
  const optimal = calculateNpRatio(1.15, 1.0); // ratio = 1.15
  assert.equal(optimal.status, 'optimal');
  assert.equal(optimal.npRatio, 1.15);

  // Overbalanced (> 1.30): Excess inactive weight
  const over = calculateNpRatio(1.45, 1.0); // ratio = 1.45
  assert.equal(over.status, 'overbalanced-excess-weight');
  assert.equal(over.npRatio, 1.45);
});

test('computeCellMetrics computes realistic metrics for Tesla 4680 preset', () => {
  const teslaPreset = BATTERY_PRESETS.find((p) => p.id === 'tesla-4680-high-nickel');
  assert.ok(teslaPreset, 'Tesla 4680 preset should exist');

  const metrics = computeCellMetrics(teslaPreset.config);

  // 4680 cell typically has 20-30 Ah capacity, 200-300 Wh/kg, nominal voltage ~3.7-3.8V
  assert.ok(metrics.cellCapacityAh > 15 && metrics.cellCapacityAh < 40, `Capacity ${metrics.cellCapacityAh}Ah out of expected range`);
  assert.ok(metrics.nominalVoltageV >= 3.6 && metrics.nominalVoltageV <= 3.9, `Nominal voltage ${metrics.nominalVoltageV}V out of expected range`);
  assert.ok(metrics.gravimetricEnergyDensityWhKg > 200, `Expected >200 Wh/kg, got ${metrics.gravimetricEnergyDensityWhKg}`);
  assert.ok(metrics.volumetricEnergyDensityWhL > 450, `Expected >450 Wh/L, got ${metrics.volumetricEnergyDensityWhL}`);
  assert.ok(metrics.totalCellMassGrams > 250 && metrics.totalCellMassGrams < 450, `Mass ${metrics.totalCellMassGrams}g out of expected range`);
  assert.ok(metrics.internalResistanceMOhm < 10, `4680 tabless cell should have very low resistance, got ${metrics.internalResistanceMOhm} mOhm`);
});

test('computeCellMetrics computes high safety and expected voltage for BYD Blade LFP', () => {
  const lfpPreset = BATTERY_PRESETS.find((p) => p.id === 'byd-blade-lfp');
  assert.ok(lfpPreset, 'BYD Blade LFP preset should exist');

  const metrics = computeCellMetrics(lfpPreset.config);

  // LFP nominal voltage is 3.2V - 3.3V
  assert.ok(metrics.nominalVoltageV >= 3.1 && metrics.nominalVoltageV <= 3.3, `LFP nominal voltage ${metrics.nominalVoltageV}V unexpected`);
  // LFP thermal decomposition onset is high (>250°C)
  assert.ok(metrics.thermalRunawayOnsetTempC >= 270, `LFP decomposition ${metrics.thermalRunawayOnsetTempC}°C expected >= 270°C`);
  // Safety score should be high
  assert.ok(metrics.safetyScore >= 80, `Expected high safety score for LFP, got ${metrics.safetyScore}`);
});

test('generateDischargeCurve generates monotonic SOC and realistic voltages', () => {
  const teslaPreset = BATTERY_PRESETS[0];
  const metrics = computeCellMetrics(teslaPreset.config);
  const curve = generateDischargeCurve(metrics, teslaPreset.config, 1.0, 25);

  assert.equal(curve.length, 51);
  assert.equal(curve[0].socPercent, 100);
  assert.equal(curve[curve.length - 1].socPercent, 0);

  // Discharge voltage should drop from max down to cutoff
  assert.ok(curve[0].voltageV > curve[curve.length - 1].voltageV);
  // Temperature should increase during 1C discharge due to Joule heating
  assert.ok(curve[curve.length - 1].temperatureC >= curve[0].temperatureC);
});

test('generateRagonePlot shows characteristic power vs energy trade-off', () => {
  const teslaPreset = BATTERY_PRESETS[0];
  const metrics = computeCellMetrics(teslaPreset.config);
  const ragone = generateRagonePlot(metrics);

  assert.ok(ragone.length >= 5);
  // Higher C-rates give higher specific power but lower specific energy due to IR losses
  const lowCRate = ragone[0]; // 0.1C
  const highCRate = ragone[ragone.length - 1]; // 5.0C

  assert.ok(highCRate.specificPowerWkg > lowCRate.specificPowerWkg);
  assert.ok(highCRate.specificEnergyWhkg <= lowCRate.specificEnergyWhkg);
});

test('projectCycleLife models capacity fade and penalizes underbalanced cells', () => {
  const teslaPreset = BATTERY_PRESETS[0];
  const metrics = computeCellMetrics(teslaPreset.config);
  const cycleData = projectCycleLife(metrics, 1.0, 25);

  assert.ok(cycleData.length > 10);
  assert.equal(cycleData[0].capacityRetentionPercent, 100);
  const endCycle = cycleData[cycleData.length - 1];
  assert.ok(endCycle.capacityRetentionPercent < 100 && endCycle.capacityRetentionPercent > 60);

  // Test underbalanced penalty
  const underbalancedMetrics = { ...metrics, npStatus: 'underbalanced-plating-risk' as const };
  const underbalancedCycleData = projectCycleLife(underbalancedMetrics, 1.0, 25);
  const underbalancedEndCycle = underbalancedCycleData[underbalancedCycleData.length - 1];
  assert.ok(
    underbalancedEndCycle.capacityRetentionPercent < endCycle.capacityRetentionPercent,
    'Underbalanced cell should degrade faster'
  );
});

test('MCP engine responds to initialize and lists tools according to MCP spec', async () => {
  const { handleMcpRequest, MCP_TOOLS } = await import('./mcp.ts');
  const teslaPreset = BATTERY_PRESETS[0];

  // Test initialize
  const initResp = await handleMcpRequest(
    { jsonrpc: '2.0', id: 1, method: 'initialize' },
    teslaPreset.config
  );
  assert.equal(initResp.id, 1);
  assert.ok(initResp.result?.protocolVersion);
  assert.equal(initResp.result?.serverInfo?.name, 'electromcp-battery-server');

  // Test tools/list
  const toolsResp = await handleMcpRequest(
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    teslaPreset.config
  );
  assert.equal(toolsResp.id, 2);
  assert.equal(toolsResp.result?.tools?.length, MCP_TOOLS.length);
  assert.ok(toolsResp.result?.tools?.some((t: any) => t.name === 'calculate_cell_specs'));
  assert.ok(toolsResp.result?.tools?.some((t: any) => t.name === 'optimize_np_ratio'));

  // Test tools/call calculate_cell_specs
  const callResp = await handleMcpRequest(
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'calculate_cell_specs',
        arguments: { cathodeId: 'lfp', anodeId: 'synthetic-graphite' },
      },
    },
    teslaPreset.config
  );
  assert.equal(callResp.id, 3);
  assert.ok(callResp.result?.structuredData?.metrics);
  assert.ok(callResp.result?.structuredData?.metrics?.cellCapacityAh > 0);

  // Test resources/read
  const resResp = await handleMcpRequest(
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/read',
      params: { uri: 'battery://materials/catalog' },
    },
    teslaPreset.config
  );
  assert.equal(resResp.id, 4);
  assert.ok(resResp.result?.contents?.[0]?.text);
});
