/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Sparkles,
  Filter,
  Search,
  RotateCcw,
  Award,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  AlertOctagon,
  Zap,
  Activity,
  Check,
} from 'lucide-react';
import type { CellConfiguration, CellPerformanceMetrics } from '../battery/types.ts';
import {
  INDUSTRY_TESTS,
  runIndustryTestSuite,
  computeAutoFixPatch,
  type TestCategory,
  type IndustryStandard,
} from '../battery/industryTests.ts';

interface IndustryTestSuiteProps {
  config: CellConfiguration;
  metrics: CellPerformanceMetrics;
  onApplyPatch: (patch: Partial<CellConfiguration>) => void;
}

interface AbuseSimScenario {
  id: string;
  name: string;
  standard: string;
  durationSec: number;
  description: string;
  run: (config: CellConfiguration, metrics: CellPerformanceMetrics) => {
    success: boolean;
    peakTempC: number;
    minVoltageV: number;
    logSteps: string[];
    failureReason?: string;
    fixSuggestion: string;
    fixPatch: Partial<CellConfiguration>;
  };
}

export const IndustryTestSuite: React.FC<IndustryTestSuiteProps> = ({
  config,
  metrics,
  onApplyPatch,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'warn' | 'fail'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Hard Abuse Simulation Runner State
  const [activeAbuseId, setActiveAbuseId] = useState<string>('nail-penetration');
  const [isSimulatingAbuse, setIsSimulatingAbuse] = useState<boolean>(false);
  const [abuseSimStep, setAbuseSimStep] = useState<number>(0);
  const [justFixed, setJustFixed] = useState<boolean>(false);

  // Run the 70-point evaluation
  const summary = useMemo(() => runIndustryTestSuite(config, metrics), [config, metrics]);

  // Compute recommended overall patch
  const recommendedPatch = useMemo(() => computeAutoFixPatch(config, metrics), [config, metrics]);
  const hasAutoFixAvailable = Object.keys(recommendedPatch).length > 0;

  // The 6 hardest battery industry test simulations
  const ABUSE_SCENARIOS: AbuseSimScenario[] = [
    {
      id: 'nail-penetration',
      name: 'Nail Penetration Internal Short-Circuit (ISC)',
      standard: 'GB/T 31485 / SAE J2464',
      durationSec: 5,
      description: 'Steel needle (3mm dia) driven through cell stack at 20mm/s. Localized catastrophic short circuit.',
      run: (cfg, m) => {
        const hasCeramic = cfg.separatorId === 'ceramic-coated-pe' || cfg.separatorId === 'solid-ceramic-separator';
        const isLfp = cfg.cathodeId === 'lfp';
        const isSolid = cfg.electrolyteId.startsWith('solid');
        const pass = hasCeramic || isLfp || isSolid;
        return {
          success: pass,
          peakTempC: pass ? (isLfp ? 48 : 62) : 680,
          minVoltageV: 0.05,
          logSteps: [
            'T=0.0s: Needle approaches active jelly roll stack at 20 mm/s',
            'T=0.5s: Mechanical puncture pierces Al foil (+), cathode, separator, and anode (-)',
            pass
              ? 'T=1.2s: Ceramic Al2O3 coating resists micro-pore melting; local current limited'
              : 'T=1.2s: Plain polyolefin separator collapses under localized 450°C spark!',
            pass
              ? 'T=2.5s: Voltage drops to 0V safely; no fire, smoke venting minimal'
              : 'T=2.0s: Exothermic cathode decomposition triggers catastrophic thermal runaway!',
            pass
              ? 'T=5.0s: PASS: Cell remained intact without flames or explosion (GB/T 31485 Pass)'
              : 'T=5.0s: FAIL: Cell ruptured with active flame propagation (Explosion)',
          ],
          failureReason: !pass ? 'Uncoated PE separator melted instantly; organic electrolyte ignited upon cathode oxygen release.' : undefined,
          fixSuggestion: 'Upgrade to Ceramic-Coated PE separator with Al2O3 thermal barrier.',
          fixPatch: { separatorId: 'ceramic-coated-pe' },
        };
      },
    },
    {
      id: 'extreme-fast-charge',
      name: 'Extreme Fast Charge (XFC 5C at 0°C Sub-Zero)',
      standard: 'USABC / DOE XFC Benchmark',
      durationSec: 5,
      description: '5.0C fast charge at freezing ambient temperature (0°C). Plating overpotential causes lithium dendrites.',
      run: (cfg, m) => {
        const pass = m.npRatio >= 1.12 && cfg.electrolyteId !== 'standard-commercial';
        return {
          success: pass,
          peakTempC: pass ? 36 : 58,
          minVoltageV: 4.25,
          logSteps: [
            'T=0.0s: Initializing 5.0C fast charging pulse at 0°C ambient',
            'T=1.0s: High kinetic overpotentials push anode surface potential near 0V vs Li/Li+',
            pass
              ? 'T=2.2s: N/P ratio of 1.15 provides safety margin; Li+ ions intercalate smoothly'
              : 'T=2.0s: Danger: Anode capacity saturated! Metallic lithium starts plating on graphite surface',
            pass
              ? 'T=3.5s: Fluorinated additives form robust low-impedance SEI; dendrites suppressed'
              : 'T=3.8s: Sharp lithium needle dendrites puncture separator membrane!',
            pass
              ? 'T=5.0s: PASS: 5C charging sustained without metallic lithium deposition'
              : 'T=5.0s: FAIL: Severe metallic Li plating and internal micro-shorts detected',
          ],
          failureReason: !pass ? 'N/P ratio < 1.12 or low-temperature electrolyte resistance allowed metallic lithium dendrite formation.' : undefined,
          fixSuggestion: 'Auto-balance N/P ratio to 1.15 and use high-voltage additives.',
          fixPatch: {
            anodeThicknessUm: Math.round(cfg.cathodeThicknessUm * 1.15),
            electrolyteId: 'high-voltage-additives',
          },
        };
      },
    },
    {
      id: 'hot-box-runaway',
      name: '130°C Hot-Box Thermal Shock & Exothermic Hold',
      standard: 'UL 1642 / IEC 62660-2',
      durationSec: 5,
      description: 'Cell heated at 5°C/min to 130°C and held for 30 minutes in thermal chamber.',
      run: (cfg, m) => {
        const pass = m.thermalRunawayOnsetTempC >= 220 || cfg.separatorId === 'ceramic-coated-pe' || cfg.cathodeId === 'lfp';
        return {
          success: pass,
          peakTempC: pass ? 134 : 540,
          minVoltageV: 3.65,
          logSteps: [
            'T=0.0s: Cell placed into 130°C environmental oven chamber',
            'T=1.0s: Internal cell temperature reaches 130°C thermal equilibrium',
            pass
              ? 'T=2.0s: Separator micro-pores close (thermal shutdown) halting ionic transfer'
              : 'T=2.0s: Separator shrinks > 15%; internal edges touch causing dead short!',
            pass
              ? 'T=3.5s: Cathode crystal structure remains stable without lattice oxygen liberation'
              : 'T=3.2s: Oxygen released from cathode reacts violently with organic solvents!',
            pass
              ? 'T=5.0s: PASS: Cell maintained hermetic seal for 30 min hold without venting'
              : 'T=5.0s: FAIL: Self-accelerating exothermic runaway ignited active materials',
          ],
          failureReason: !pass ? 'Separator lacked dimensional thermal stability at 130°C; cathode decomposed prematurely.' : undefined,
          fixSuggestion: 'Use Ceramic-Coated PE separator with high-temperature dimensional stability.',
          fixPatch: { separatorId: 'ceramic-coated-pe' },
        };
      },
    },
    {
      id: 'dead-short-5mohm',
      name: '5 mΩ External Dead Short-Circuit at 55°C',
      standard: 'UN 38.3 T.5 / UL 2580',
      durationSec: 5,
      description: 'External dead short circuit (< 10 mΩ) applied until cell cools below 55°C.',
      run: (cfg, m) => {
        const pass = cfg.formFactorId === '4680' || cfg.formFactorId === 'prismatic' || m.internalResistanceMOhm < 15;
        return {
          success: pass,
          peakTempC: pass ? 88 : 195,
          minVoltageV: 0.2,
          logSteps: [
            'T=0.0s: 5 mΩ copper busbar short applied across positive and negative terminals',
            'T=0.5s: Discharge current surges over 450 Amperes! Massive I²R Joule heating',
            pass
              ? 'T=1.5s: Tabless architecture / large prismatic casing distributes heat dissipation'
              : 'T=1.5s: Tab focal point reaches 185°C; localized hotspot melts current collector weld',
            pass
              ? 'T=3.0s: Cell voltage collapses safely to 0V; temperature peaks below 90°C limit'
              : 'T=3.0s: Overpressure vent disc ruptures with dense combustible smoke ejection',
            pass
              ? 'T=5.0s: PASS: Case temperature stayed well below 170°C UN 38.3 threshold'
              : 'T=5.0s: FAIL: Case temperature exceeded 170°C safety ceiling; vent disc failed',
          ],
          failureReason: !pass ? 'Internal tab resistance caused severe focal point overheating under high current surge.' : undefined,
          fixSuggestion: 'Upgrade to tabless 4680 or low-resistance prismatic packaging.',
          fixPatch: { formFactorId: '4680' },
        };
      },
    },
    {
      id: 'overcharge-120',
      name: '120% SOC Overcharge Abuse Flashover',
      standard: 'UL 2580 / GB/T 31485',
      durationSec: 5,
      description: 'Continuous 1.0C charging to 120% nominal capacity without BMS cutoff.',
      run: (cfg, m) => {
        const pass = m.npRatio >= 1.08 && (cfg.electrolyteId === 'high-voltage-additives' || cfg.cathodeId === 'lfp');
        return {
          success: pass,
          peakTempC: pass ? 44 : 480,
          minVoltageV: 4.85,
          logSteps: [
            'T=0.0s: Cell charged beyond 100% SOC threshold at 1.0C continuous current',
            'T=1.5s: Cell reaches 110% SOC; terminal voltage climbs past 4.45V',
            pass
              ? 'T=2.5s: CEI passivating layer (VC additives) prevents electrolyte electrochemical oxidation'
              : 'T=2.2s: Liquid carbonate solvents oxidize at positive electrode surface generating CO2 gas',
            pass
              ? 'T=3.8s: Excess anode capacity absorbs extra Li+ ions without surface plating'
              : 'T=3.5s: Anode completely saturated; dendritic lithium bridges electrodes!',
            pass
              ? 'T=5.0s: PASS: Cell safely absorbed 120% overcharge without venting or explosion'
              : 'T=5.0s: FAIL: Severe thermal flashover from solvent decomposition and plating',
          ],
          failureReason: !pass ? 'Lacked CEI passivating additives; anode lacked sufficient safety capacity reserve.' : undefined,
          fixSuggestion: 'Add vinylene carbonate (VC) additives and balance N/P ratio to 1.15.',
          fixPatch: {
            electrolyteId: 'high-voltage-additives',
            anodeThicknessUm: Math.round(cfg.cathodeThicknessUm * 1.15),
          },
        };
      },
    },
    {
      id: 'arctic-cold-soak',
      name: 'Arctic Sub-Zero Soak (-40°C Low Impedance)',
      standard: 'NASA-STD-4007 / SAE J2464',
      durationSec: 5,
      description: 'Cell frozen to -40°C for 24 hours followed by high-current pulse discharge.',
      run: (cfg, m) => {
        const pass = cfg.electrolyteId === 'low-temp-lifsi' || cfg.electrolyteId === 'high-voltage-additives' || m.nominalVoltageV >= 3.6;
        return {
          success: pass,
          peakTempC: -32,
          minVoltageV: pass ? 2.85 : 1.65,
          logSteps: [
            'T=0.0s: Cell conditioned at -40°C in sub-zero cryo-chamber',
            'T=1.0s: Applying 1.0C cold-cranking discharge pulse',
            pass
              ? 'T=2.0s: Low-viscosity solvent preserves ion conductivity (κ > 1.2 mS/cm at -40°C)'
              : 'T=2.0s: Standard EC:DMC electrolyte partially freezes; ionic transport collapses!',
            pass
              ? 'T=3.5s: Voltage holds strong at 2.85V above automotive ECU brownout cutoff'
              : 'T=3.5s: Severe IR ohmic sag drops terminal voltage below 1.8V brownout limit',
            pass
              ? 'T=5.0s: PASS: Delivered required engine starter power at -40°C Arctic ambient'
              : 'T=5.0s: FAIL: Premature voltage collapse caused vehicle ECU shutdown',
          ],
          failureReason: !pass ? 'Standard carbonate electrolyte froze at sub-zero temperatures, causing extreme ohmic sag.' : undefined,
          fixSuggestion: 'Switch to Low-Temperature LiFSI electrolyte formulation.',
          fixPatch: { electrolyteId: 'low-temp-lifsi' },
        };
      },
    },
  ];

  const currentAbuseScenario = ABUSE_SCENARIOS.find((s) => s.id === activeAbuseId) || ABUSE_SCENARIOS[0];
  const abuseSimResult = useMemo(
    () => currentAbuseScenario.run(config, metrics),
    [currentAbuseScenario, config, metrics]
  );

  // Auto-play the abuse simulation steps
  useEffect(() => {
    if (!isSimulatingAbuse) return;
    setAbuseSimStep(0);
    const interval = setInterval(() => {
      setAbuseSimStep((prev) => {
        if (prev >= abuseSimResult.logSteps.length - 1) {
          setIsSimulatingAbuse(false);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [isSimulatingAbuse, currentAbuseScenario]);

  // Filter test scenarios
  const filteredTests = useMemo(() => {
    return INDUSTRY_TESTS.filter((test) => {
      const res = summary.results.find((r) => r.testId === test.id);
      if (!res) return false;

      if (selectedCategory !== 'all' && test.category !== selectedCategory) return false;
      if (selectedStandard !== 'all' && test.standard !== selectedStandard) return false;
      if (statusFilter !== 'all' && res.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          test.name.toLowerCase().includes(q) ||
          test.standard.toLowerCase().includes(q) ||
          test.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, selectedStandard, statusFilter, searchQuery, summary]);

  const handleApplyAllFixes = () => {
    if (hasAutoFixAvailable) {
      onApplyPatch(recommendedPatch);
      setJustFixed(true);
      setTimeout(() => setJustFixed(false), 3000);
    }
  };

  // Inject intentional failure modes for stress testing
  const handleInjectVulnerability = (type: 'underbalance' | 'flammable-solvent' | 'thin-separator') => {
    if (type === 'underbalance') {
      onApplyPatch({ anodeThicknessUm: 45 }); // drops N/P to ~0.75
    } else if (type === 'flammable-solvent') {
      onApplyPatch({ electrolyteId: 'standard-commercial' });
    } else if (type === 'thin-separator') {
      onApplyPatch({ separatorId: 'celgard-2325', separatorThicknessUm: 10 });
    }
  };

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Categories (70)' },
    { id: 'performance', label: 'Standard Performance (12)' },
    { id: 'fast-charge', label: 'Fast Charge & C-Rate (10)' },
    { id: 'thermal-safety', label: 'Thermal Safety & Runaway (14)' },
    { id: 'transport-un38.3', label: 'UN 38.3 Transport (8)' },
    { id: 'cycle-life', label: 'Cycle Life & SOH (10)' },
    { id: 'environmental', label: 'Environmental Stress (8)' },
    { id: 'application-abuse', label: 'Application & Abuse (8)' },
  ];

  const standards: string[] = ['all', 'UN 38.3', 'IEC 62660', 'USABC', 'UL 2580', 'UL 1642', 'SAE J2464', 'ISO 12405', 'GB/T 31485', 'NASA-STD-4007'];

  return (
    <div className="space-y-6">
      {/* Executive Scorecard Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                70-Point Industry Battery Certification & Hard Stress Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automated compliance auditing across UN 38.3, IEC 62660, USABC, UL 2580, SAE J2464, and GB/T 31485.
            </p>
          </div>

          {/* Action buttons: Auto-Fix or Success Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {summary.failed === 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>100% Production-Ready (Zero Critical Failures)</span>
              </div>
            ) : (
              <button
                onClick={handleApplyAllFixes}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Auto-Fix All Failed Tests to Production-Ready</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Counter Badges */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-slate-400 font-semibold">Total Scenarios</span>
            <span className="text-xl font-mono font-bold text-slate-900 mt-1 block">
              {summary.total} Tests
            </span>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-emerald-600 font-semibold">Passed</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-emerald-800">{summary.passed}</span>
              <span className="text-xs font-mono text-emerald-600 font-medium">({Math.round((summary.passed / summary.total) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-amber-600 font-semibold">Warnings</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-amber-800">{summary.warned}</span>
              <span className="text-xs font-mono text-amber-600 font-medium">({Math.round((summary.warned / summary.total) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-rose-600 font-semibold">Failed</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-rose-800">{summary.failed}</span>
              <span className="text-xs font-mono text-rose-600 font-medium">({Math.round((summary.failed / summary.total) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
            <span className="block text-[10px] font-mono uppercase text-blue-600 font-semibold">Compliance Grade</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-blue-900">{summary.complianceScore}%</span>
              <span className="text-[10px] font-mono text-blue-700 font-bold ml-1">
                {summary.complianceScore >= 85 ? 'Grade A+' : summary.complianceScore >= 70 ? 'Grade B' : 'Grade C'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Vulnerability Injection / Stress Test Triggers */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
            <span>Test Vulnerability Scenarios:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleInjectVulnerability('underbalance')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-slate-200 text-[11px] font-medium transition-colors"
              title="Lower anode thickness to trigger lithium plating failures"
            >
              ⚠️ Underbalance N/P (Plating Trap)
            </button>
            <button
              onClick={() => handleInjectVulnerability('flammable-solvent')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-slate-200 text-[11px] font-medium transition-colors"
              title="Set standard electrolyte to test volatile flammability failures"
            >
              🔥 Standard Volatile Electrolyte
            </button>
            <button
              onClick={() => handleInjectVulnerability('thin-separator')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-slate-200 text-[11px] font-medium transition-colors"
              title="Set thin 10µm plain separator to trigger puncture runaway"
            >
              ⚡ Thin Non-Ceramic Separator
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Hard Abuse Stress Simulator */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Hard Abuse Stress Simulator (6 Extreme Test Benchmarks)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulatingAbuse(!isSimulatingAbuse)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                isSimulatingAbuse
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {isSimulatingAbuse ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Simulation
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Live Stress Test
                </>
              )}
            </button>
          </div>
        </div>

        {/* Benchmark Scenario Selector Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ABUSE_SCENARIOS.map((scen) => (
            <button
              key={scen.id}
              onClick={() => {
                setActiveAbuseId(scen.id);
                setAbuseSimStep(0);
                setIsSimulatingAbuse(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeAbuseId === scen.id
                  ? 'bg-slate-800 text-blue-400 border-blue-500/50 shadow-inner'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {scen.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Live Simulation Display */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950 rounded-lg p-4 border border-slate-800">
          {/* Left: Telemetry Gauges (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Test Standard</span>
              <div className="text-xs font-mono font-bold text-white mt-0.5">{currentAbuseScenario.standard}</div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{currentAbuseScenario.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="block text-[9px] text-slate-500 uppercase">Peak Temp</span>
                <span className={`text-lg font-bold ${abuseSimResult.peakTempC > 150 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {abuseSimResult.peakTempC}°C
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="block text-[9px] text-slate-500 uppercase">Result Status</span>
                <span className={`text-sm font-bold block mt-1 ${abuseSimResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {abuseSimResult.success ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>

            {/* Quick Fix Button for this Abuse Scenario */}
            {!abuseSimResult.success && (
              <button
                onClick={() => onApplyPatch(abuseSimResult.fixPatch)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fix & Pass This Abuse Test</span>
              </button>
            )}
          </div>

          {/* Right: Real-Time Event Log & Timeline (8 cols) */}
          <div className="md:col-span-8 bg-slate-900 rounded p-3 font-mono text-xs border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span>Dynamic Physical Abuse Event Log</span>
                <span>Timeline: Step {abuseSimStep + 1} of {abuseSimResult.logSteps.length}</span>
              </div>
              <div className="space-y-1.5 mt-2.5">
                {abuseSimResult.logSteps.slice(0, abuseSimStep + 1).map((step: string, idx: number) => {
                  const isFail = step.includes('FAIL') || step.includes('Danger') || step.includes('ruin') || step.includes('collapses') || step.includes('ignited');
                  const isPass = step.includes('PASS') || step.includes('safely') || step.includes('intact');
                  return (
                    <div
                      key={idx}
                      className={`text-[11px] flex items-start gap-2 ${
                        isFail ? 'text-rose-400 font-bold' : isPass ? 'text-emerald-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500 select-none">›</span>
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vulnerability Diagnosis if Failed */}
            {!abuseSimResult.success && abuseSimResult.failureReason && (
              <div className="mt-3 p-2 bg-rose-950/60 border border-rose-800/80 rounded text-[11px] text-rose-300">
                <span className="font-bold text-rose-200">Failure Cause: </span>
                {abuseSimResult.failureReason}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Standard Dropdown */}
          <select
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {standards.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Regulatory Standards' : s}
              </option>
            ))}
          </select>

          {/* Status Filter Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({summary.total})
            </button>
            <button
              onClick={() => setStatusFilter('pass')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                statusFilter === 'pass' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pass ({summary.passed})
            </button>
            <button
              onClick={() => setStatusFilter('warn')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                statusFilter === 'warn' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Warn ({summary.warned})
            </button>
            <button
              onClick={() => setStatusFilter('fail')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                statusFilter === 'fail' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fail ({summary.failed})
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search 70 tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
          />
        </div>
      </div>

      {/* Test Scenarios Grid */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const res = summary.results.find((r) => r.testId === test.id)!;
          const isExpanded = expandedTestId === test.id;

          const getStatusBadge = () => {
            if (res.status === 'pass') {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PASS
                </span>
              );
            }
            if (res.status === 'warn') {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  WARN
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                <XCircle className="w-3.5 h-3.5" />
                FAIL
              </span>
            );
          };

          return (
            <div
              key={test.id}
              className={`bg-white rounded-xl border transition-all ${
                res.status === 'fail'
                  ? 'border-rose-200 shadow-xs'
                  : res.status === 'warn'
                  ? 'border-amber-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs font-mono text-slate-400 font-bold shrink-0 mt-0.5">
                    #{String(test.number).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{test.name}</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {test.standard}
                      </span>
                      {test.severity === 'critical' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-700 uppercase">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{test.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="block text-xs font-mono font-bold text-slate-900">{res.measuredValue}</span>
                    <span className="block text-[10px] font-mono text-slate-400">Target: {res.targetThreshold}</span>
                  </div>
                  {getStatusBadge()}
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl text-xs space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold">Regulatory Standard & Objective</span>
                      <p className="text-slate-700 mt-1">{test.description}</p>
                      <div className="mt-2 text-slate-600 font-mono text-[11px]">
                        Category: <span className="font-semibold text-slate-900">{test.category}</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold">Evaluation Details</span>
                      <p className={`mt-1 font-medium ${res.status === 'fail' ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                        {res.details}
                      </p>
                      <div className="mt-2 text-slate-600 font-mono text-[11px]">
                        Measured: <span className="font-bold text-slate-900">{res.measuredValue}</span> | Target: <span className="font-bold text-slate-900">{res.targetThreshold}</span>
                      </div>
                    </div>
                  </div>

                  {/* Single-test auto-fix action if suggested */}
                  {(res.suggestedFix || res.autoFixPatch) && (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900">Engineering Recommendation: </span>
                          <span className="text-slate-700">{res.suggestedFix}</span>
                        </div>
                      </div>
                      {res.autoFixPatch && (
                        <button
                          onClick={() => onApplyPatch(res.autoFixPatch!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0 shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Apply Single Fix
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
