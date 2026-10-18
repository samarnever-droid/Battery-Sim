/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRY_TESTS,
  runIndustryTestSuite,
  computeAutoFixPatch,
} from './industryTests.ts';
import { BATTERY_PRESETS } from './materials.ts';
import { computeCellMetrics } from './physics.ts';

test('Industry test suite contains at least 70 distinct test situations', () => {
  assert.ok(INDUSTRY_TESTS.length >= 70, `Expected at least 70 tests, got ${INDUSTRY_TESTS.length}`);
  assert.equal(INDUSTRY_TESTS.length, 70, 'Expected exactly 70 standardized tests');

  // Verify unique test IDs and numbers
  const ids = new Set(INDUSTRY_TESTS.map((t) => t.id));
  assert.equal(ids.size, 70, 'All 70 test IDs must be unique');

  const numbers = new Set(INDUSTRY_TESTS.map((t) => t.number));
  assert.equal(numbers.size, 70, 'All 70 test numbers must be unique from 1 to 70');
});

test('Industry tests cover all major regulatory standards and categories', () => {
  const standards = new Set(INDUSTRY_TESTS.map((t) => t.standard));
  assert.ok(standards.has('UN 38.3'), 'Must cover UN 38.3 transport standard');
  assert.ok(standards.has('IEC 62660'), 'Must cover IEC 62660 EV cell standard');
  assert.ok(standards.has('USABC'), 'Must cover USABC automotive benchmarks');
  assert.ok(standards.has('UL 2580'), 'Must cover UL 2580 safety standard');
  assert.ok(standards.has('SAE J2464'), 'Must cover SAE J2464 abuse test standard');

  const categories = new Set(INDUSTRY_TESTS.map((t) => t.category));
  assert.ok(categories.has('performance'));
  assert.ok(categories.has('fast-charge'));
  assert.ok(categories.has('thermal-safety'));
  assert.ok(categories.has('transport-un38.3'));
  assert.ok(categories.has('cycle-life'));
  assert.ok(categories.has('environmental'));
  assert.ok(categories.has('application-abuse'));
});

test('Tesla 4680 preset evaluates cleanly across all 70 tests', () => {
  const teslaPreset = BATTERY_PRESETS[0];
  const metrics = computeCellMetrics(teslaPreset.config);
  const summary = runIndustryTestSuite(teslaPreset.config, metrics);

  assert.equal(summary.total, 70);
  assert.equal(summary.results.length, 70);
  assert.ok(summary.passed > 50, `Expected high pass rate for Tesla 4680, got ${summary.passed} passed`);
  assert.ok(summary.complianceScore >= 75, `Expected compliance score >= 75%, got ${summary.complianceScore}%`);
});

test('Intentionally underbalanced cell triggers critical failure and auto-fix resolves it', () => {
  const teslaPreset = BATTERY_PRESETS[0];
  // Make anode extremely thin (30µm vs cathode 100µm) so N/P < 0.6
  const dangerousConfig = {
    ...teslaPreset.config,
    cathodeThicknessUm: 100,
    anodeThicknessUm: 30,
  };
  const dangerousMetrics = computeCellMetrics(dangerousConfig);
  assert.ok(dangerousMetrics.npRatio < 0.7, 'Cell should be heavily underbalanced');

  const summary = runIndustryTestSuite(dangerousConfig, dangerousMetrics);
  const platingTest = summary.results.find((r) => r.testId === 'fast-13');
  assert.ok(platingTest, 'Test fast-13 must exist');
  assert.equal(platingTest.status, 'fail', 'Lithium plating test fast-13 must FAIL on underbalanced cell');

  // Test Auto-Fix Patch
  const patch = computeAutoFixPatch(dangerousConfig, dangerousMetrics);
  assert.ok(patch.anodeThicknessUm, 'Auto-fix must recommend thicker anode');
  assert.ok(patch.anodeThicknessUm > 30, 'Recommended anode thickness must be greater than dangerous 30µm');

  // Apply patch and verify N/P ratio recovers to optimal
  const fixedConfig = { ...dangerousConfig, ...patch };
  const fixedMetrics = computeCellMetrics(fixedConfig);
  assert.ok(fixedMetrics.npRatio >= 1.05, `Fixed N/P ratio ${fixedMetrics.npRatio} should be >= 1.05`);
  const fixedSummary = runIndustryTestSuite(fixedConfig, fixedMetrics);
  const fixedPlatingTest = fixedSummary.results.find((r) => r.testId === 'fast-13');
  assert.equal(fixedPlatingTest?.status, 'pass', 'After auto-fix, fast-13 must PASS');
});
