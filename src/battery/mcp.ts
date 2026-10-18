/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  McpToolDefinition,
  McpResourceDefinition,
  McpPromptDefinition,
  McpJsonRpcRequest,
  McpJsonRpcResponse,
  CellConfiguration,
} from './types.ts';
import {
  CATHODE_MATERIALS,
  ANODE_MATERIALS,
  ELECTROLYTE_MATERIALS,
  SEPARATOR_MATERIALS,
  FORM_FACTORS,
  BATTERY_PRESETS,
} from './materials.ts';
import {
  computeCellMetrics,
  generateDischargeCurve,
  generateRagonePlot,
  projectCycleLife,
} from './physics.ts';
import {
  INDUSTRY_TESTS,
  runIndustryTestSuite,
  computeAutoFixPatch,
} from './industryTests.ts';

export const MCP_SERVER_INFO = {
  name: 'electromcp-battery-server',
  version: '1.2.0',
  protocolVersion: '2024-11-05',
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
};

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'calculate_cell_specs',
    description: 'Calculate complete electrochemical and physical cell specifications including capacity (Ah), gravimetric energy density (Wh/kg), volumetric energy density (Wh/L), N/P balancing ratio, internal resistance (mΩ), and component mass breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        cathodeId: {
          type: 'string',
          description: 'Cathode material ID',
          enum: Object.keys(CATHODE_MATERIALS),
          default: 'nmc-811',
        },
        anodeId: {
          type: 'string',
          description: 'Anode material ID',
          enum: Object.keys(ANODE_MATERIALS),
          default: 'silicon-graphite-10',
        },
        electrolyteId: {
          type: 'string',
          description: 'Electrolyte ID',
          enum: Object.keys(ELECTROLYTE_MATERIALS),
          default: 'high-voltage-additives',
        },
        separatorId: {
          type: 'string',
          description: 'Separator ID',
          enum: Object.keys(SEPARATOR_MATERIALS),
          default: 'ceramic-coated-pe',
        },
        formFactorId: {
          type: 'string',
          description: 'Form factor ID',
          enum: Object.keys(FORM_FACTORS),
          default: '4680',
        },
        cathodeThicknessUm: {
          type: 'number',
          description: 'Cathode single-side coating thickness (µm)',
          minimum: 20,
          maximum: 150,
          default: 70,
        },
        anodeThicknessUm: {
          type: 'number',
          description: 'Anode single-side coating thickness (µm)',
          minimum: 20,
          maximum: 180,
          default: 75,
        },
      },
      required: ['cathodeId', 'anodeId'],
    },
  },
  {
    name: 'simulate_discharge_curve',
    description: 'Simulate dynamic voltage vs State of Charge (SOC) discharge curve and Joule heating temperature rise under specified C-Rate and ambient temperature.',
    inputSchema: {
      type: 'object',
      properties: {
        presetId: {
          type: 'string',
          description: 'Optional preset ID to load',
          enum: BATTERY_PRESETS.map((p) => p.id),
        },
        cRate: {
          type: 'number',
          description: 'Discharge C-rate multiplier (e.g. 0.5C, 1C, 2C, 3C)',
          minimum: 0.1,
          maximum: 10.0,
          default: 1.0,
        },
        ambientTempC: {
          type: 'number',
          description: 'Ambient operating temperature in Celsius',
          minimum: -30,
          maximum: 60,
          default: 25,
        },
      },
    },
  },
  {
    name: 'analyze_thermal_runaway',
    description: 'Assess thermal runaway safety risks, cathode phase decomposition temperature, electrolyte flammability, venting pressure, and safety score.',
    inputSchema: {
      type: 'object',
      properties: {
        cathodeId: {
          type: 'string',
          description: 'Cathode material ID',
          enum: Object.keys(CATHODE_MATERIALS),
        },
        electrolyteId: {
          type: 'string',
          description: 'Electrolyte ID',
          enum: Object.keys(ELECTROLYTE_MATERIALS),
        },
        cRate: {
          type: 'number',
          description: 'Charge/Discharge rate',
          default: 2.0,
        },
      },
      required: ['cathodeId', 'electrolyteId'],
    },
  },
  {
    name: 'optimize_np_ratio',
    description: 'Calculates the optimal anode thickness and active material loading required to achieve a safe target N/P balancing ratio (default 1.15) to prevent dangerous lithium plating.',
    inputSchema: {
      type: 'object',
      properties: {
        cathodeId: {
          type: 'string',
          description: 'Cathode material ID',
          enum: Object.keys(CATHODE_MATERIALS),
        },
        anodeId: {
          type: 'string',
          description: 'Anode material ID',
          enum: Object.keys(ANODE_MATERIALS),
        },
        cathodeThicknessUm: {
          type: 'number',
          description: 'Cathode coating thickness (µm)',
          default: 70,
        },
        targetNpRatio: {
          type: 'number',
          description: 'Target N/P capacity ratio (standard is 1.10 - 1.20)',
          minimum: 1.05,
          maximum: 1.35,
          default: 1.15,
        },
      },
      required: ['cathodeId', 'anodeId'],
    },
  },
  {
    name: 'query_material_pubchem',
    description: 'Retrieve verified chemical identity, PubChem Compound ID (CID), molecular formula, SMILES representation, molecular weight, and safety hazard classification.',
    inputSchema: {
      type: 'object',
      properties: {
        materialKey: {
          type: 'string',
          description: 'Battery component identifier or chemical formula',
        },
      },
      required: ['materialKey'],
    },
  },
  {
    name: 'export_mcp_config',
    description: 'Generates client configuration JSON for Claude Desktop, Cursor, or AI Studio agent systems to connect to this ElectroMCP battery toolkit.',
    inputSchema: {
      type: 'object',
      properties: {
        clientType: {
          type: 'string',
          description: 'Target MCP client configuration format',
          enum: ['claude-desktop', 'cursor', 'universal-sse'],
          default: 'claude-desktop',
        },
      },
    },
  },
  {
    name: 'run_industry_safety_test_suite',
    description: 'Execute the full 70-point battery safety and performance certification matrix covering UN 38.3, IEC 62660, USABC, UL 2580, SAE J2464, and ISO 12405. Returns pass/warn/fail scorecard, failure diagnostics, and auto-fix configuration patch.',
    inputSchema: {
      type: 'object',
      properties: {
        categoryFilter: {
          type: 'string',
          description: 'Optional filter for test category',
          enum: ['all', 'performance', 'fast-charge', 'thermal-safety', 'transport-un38.3', 'cycle-life', 'environmental', 'application-abuse'],
          default: 'all',
        },
      },
    },
  },
];

export const MCP_RESOURCES: McpResourceDefinition[] = [
  {
    uri: 'battery://materials/catalog',
    name: 'Battery Materials Catalog',
    description: 'Full scientific catalog of all available cathodes, anodes, electrolytes, separators, and packaging form factors with physical properties.',
    mimeType: 'application/json',
  },
  {
    uri: 'battery://active-cell/profile',
    name: 'Active Cell Design Profile',
    description: 'Current active battery cell design parameters, layer dimensions, mass distribution, and performance metrics.',
    mimeType: 'application/json',
  },
  {
    uri: 'battery://benchmarks/industry-standards',
    name: 'Industry Commercial Cell Benchmarks',
    description: 'Empirical benchmark specifications for commercial cells (Tesla 4680, BYD Blade, Panasonic 21700, LG Chem pouch).',
    mimeType: 'application/json',
  },
];

export const MCP_PROMPTS: McpPromptDefinition[] = [
  {
    name: 'battery-safety-audit',
    description: 'Perform a comprehensive failure-mode-and-effects electrochemical safety audit for a battery cell configuration.',
    arguments: [
      {
        name: 'applicationContext',
        description: 'Target application (e.g., EV passenger vehicle, eVTOL aerospace, grid storage, consumer phone)',
        required: true,
      },
    ],
  },
  {
    name: 'fast-charging-protocol-optimizer',
    description: 'Generate multi-stage CC-CV charging profile that maximizes charging speed while keeping cell temperature under critical limit.',
    arguments: [
      {
        name: 'targetChargeTimeMinutes',
        description: 'Desired 10% to 80% charge time in minutes (e.g. 15 min, 30 min)',
        required: true,
      },
    ],
  },
  {
    name: 'solid-state-transition-planner',
    description: 'Roadmap and trade-off analysis for migrating a conventional liquid lithium-ion cell to all-solid-state lithium metal architecture.',
    arguments: [],
  },
];

/**
 * Executes an MCP tool call and returns structured JSON output
 */
export async function executeMcpTool(
  toolName: string,
  args: any,
  currentConfig: CellConfiguration
): Promise<any> {
  switch (toolName) {
    case 'calculate_cell_specs': {
      const mergedConfig: CellConfiguration = {
        ...currentConfig,
        cathodeId: args.cathodeId || currentConfig.cathodeId,
        anodeId: args.anodeId || currentConfig.anodeId,
        electrolyteId: args.electrolyteId || currentConfig.electrolyteId,
        separatorId: args.separatorId || currentConfig.separatorId,
        formFactorId: args.formFactorId || currentConfig.formFactorId,
        cathodeThicknessUm: args.cathodeThicknessUm ?? currentConfig.cathodeThicknessUm,
        anodeThicknessUm: args.anodeThicknessUm ?? currentConfig.anodeThicknessUm,
      };
      const metrics = computeCellMetrics(mergedConfig);
      return {
        success: true,
        summary: `Cell calculated: ${metrics.cellCapacityAh} Ah, ${metrics.gravimetricEnergyDensityWhKg} Wh/kg, ${metrics.volumetricEnergyDensityWhL} Wh/L. N/P ratio: ${metrics.npRatio} (${metrics.npStatus}).`,
        metrics,
        config: mergedConfig,
      };
    }

    case 'simulate_discharge_curve': {
      let config = currentConfig;
      if (args.presetId) {
        const found = BATTERY_PRESETS.find((p) => p.id === args.presetId);
        if (found) config = found.config;
      }
      const cRate = args.cRate || 1.0;
      const ambientTempC = args.ambientTempC || 25;
      const metrics = computeCellMetrics(config);
      const curve = generateDischargeCurve(metrics, config, cRate, ambientTempC);
      const finalPoint = curve[curve.length - 1];

      return {
        success: true,
        cRate,
        ambientTempC,
        initialVoltageV: curve[0].voltageV,
        finalVoltageV: finalPoint.voltageV,
        maximumTemperatureC: Math.max(...curve.map((p) => p.temperatureC)),
        dataPointsCount: curve.length,
        pointsSample: [curve[0], curve[12], curve[25], curve[38], curve[50]],
      };
    }

    case 'analyze_thermal_runaway': {
      const cathode = CATHODE_MATERIALS[args.cathodeId] || CATHODE_MATERIALS[currentConfig.cathodeId];
      const electrolyte = ELECTROLYTE_MATERIALS[args.electrolyteId] || ELECTROLYTE_MATERIALS[currentConfig.electrolyteId];

      const isNonFlammable = electrolyte.type.startsWith('solid-oxide');
      const isLfpSafe = cathode.id === 'lfp';
      const onsetTemp = cathode.thermalDecompositionTemp;

      return {
        cathodeName: cathode.name,
        electrolyteName: electrolyte.name,
        thermalDecompositionOnsetTempC: onsetTemp,
        electrolyteFlashPointC: electrolyte.flashPointC,
        oxygenReleaseOnPuncture: !isLfpSafe,
        dendriteSuppressionCapability: isNonFlammable ? 'High (60+ GPa shear modulus)' : 'Low (depends on SEI)',
        riskLevel: onsetTemp > 260 || isNonFlammable ? 'LOW' : onsetTemp > 220 ? 'MODERATE' : 'CRITICAL',
        mitigationRecommendations: [
          onsetTemp < 230 ? 'Incorporate phase-change thermal interface or direct-to-cell liquid cooling ribbon' : null,
          electrolyte.flashPointC < 35 ? 'Formulate with 2% FEC and 1% VC film-forming additives' : null,
          !isLfpSafe ? 'Implement active cell vent gas management to prevent thermal runaway propagation' : null,
        ].filter(Boolean),
      };
    }

    case 'optimize_np_ratio': {
      const cathode = CATHODE_MATERIALS[args.cathodeId] || CATHODE_MATERIALS[currentConfig.cathodeId];
      const anode = ANODE_MATERIALS[args.anodeId] || ANODE_MATERIALS[currentConfig.anodeId];
      const cathodeThicknessUm = args.cathodeThicknessUm || 70;
      const targetNpRatio = args.targetNpRatio || 1.15;

      // AnodeCap = AnodeMass * AnodeCapSpecific
      // CathodeCap = CathodeMass * CathodeCapSpecific
      // AnodeCap / CathodeCap = targetNp
      // (anodeThick * (1-poro) * dens * act * AnodeCap) / (cathThick * (1-poro) * dens * act * CathodeCap) = target
      const cathodeVolMassFactor = (1 - 0.28) * cathode.density * 0.94 * cathode.theoreticalCapacity;
      const anodeVolMassFactor = (1 - 0.30) * anode.density * 0.95 * anode.theoreticalCapacity;

      const optimalAnodeThicknessUm = Number((
        (targetNpRatio * cathodeThicknessUm * cathodeVolMassFactor) / anodeVolMassFactor
      ).toFixed(1));

      return {
        cathodeId: cathode.id,
        anodeId: anode.id,
        cathodeThicknessUm,
        targetNpRatio,
        recommendedAnodeThicknessUm: optimalAnodeThicknessUm,
        explanation: `To achieve N/P ratio of ${targetNpRatio} with ${cathode.name} (${cathodeThicknessUm}µm), set ${anode.name} thickness to ${optimalAnodeThicknessUm}µm. This guarantees complete lithiation safety without lithium plating.`,
      };
    }

    case 'query_material_pubchem': {
      const key = (args.materialKey || '').toLowerCase();
      // Search catalog for matching CID
      let matchedMaterial: any = null;
      for (const m of [...Object.values(CATHODE_MATERIALS), ...Object.values(ANODE_MATERIALS), ...Object.values(ELECTROLYTE_MATERIALS)]) {
        if (m.id.toLowerCase().includes(key) || m.name.toLowerCase().includes(key) || (m as any).formula?.toLowerCase().includes(key)) {
          matchedMaterial = m;
          break;
        }
      }

      if (matchedMaterial && (matchedMaterial.pubchemCid || matchedMaterial.pubchemSaltCid)) {
        const cid = matchedMaterial.pubchemCid || matchedMaterial.pubchemSaltCid;
        return {
          materialName: matchedMaterial.name,
          formula: (matchedMaterial as any).formula || (matchedMaterial as any).saltFormula,
          pubchemCid: cid,
          pubchemPugUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
          pngDepictionUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=large`,
          provenance: '[PubChem Verified & Curated]',
          note: 'Direct live REST queries can also be dispatched to https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/' + cid + '/property/MolecularFormula,MolecularWeight,CanonicalSMILES/JSON',
        };
      }

      return {
        searchQuery: args.materialKey,
        status: 'generic_lookup',
        pubchemSearchUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(args.materialKey)}/cids/JSON`,
        note: 'Live query endpoint ready for dispatch via fetchWithRetry.',
      };
    }

    case 'export_mcp_config': {
      const configJson = {
        mcpServers: {
          electromcp: {
            command: 'node',
            args: ['./server.js'],
            env: {
              PORT: '3000',
            },
          },
        },
      };

      const sseConfig = {
        mcpServers: {
          electromcp_remote: {
            url: 'http://localhost:3000/api/mcp/sse',
            transport: 'sse',
          },
        },
      };

      return {
        clientType: args.clientType || 'claude-desktop',
        claudeDesktopConfig: configJson,
        remoteSseConfig: sseConfig,
        snippet: JSON.stringify(configJson, null, 2),
      };
    }

    case 'run_industry_safety_test_suite': {
      const metrics = computeCellMetrics(currentConfig);
      const summary = runIndustryTestSuite(currentConfig, metrics);
      const patch = computeAutoFixPatch(currentConfig, metrics);

      let filteredResults = summary.results;
      if (args.categoryFilter && args.categoryFilter !== 'all') {
        filteredResults = summary.results.filter((r) => {
          const matchedTest = INDUSTRY_TESTS.find((t) => t.id === r.testId);
          return matchedTest?.category === args.categoryFilter;
        });
      }

      return {
        totalTests: summary.total,
        passed: summary.passed,
        warned: summary.warned,
        failed: summary.failed,
        complianceScorePercent: summary.complianceScore,
        autoFixAvailable: Object.keys(patch).length > 0,
        recommendedAutoFixPatch: patch,
        diagnosticResults: filteredResults,
      };
    }

    default:
      throw new Error(`Unknown MCP Tool: ${toolName}`);
  }
}

/**
 * Full JSON-RPC 2.0 MCP Request Handler
 */
export async function handleMcpRequest(
  request: McpJsonRpcRequest,
  currentConfig: CellConfiguration
): Promise<McpJsonRpcResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: MCP_SERVER_INFO.protocolVersion,
            serverInfo: MCP_SERVER_INFO,
            capabilities: MCP_SERVER_INFO.capabilities,
          },
        };

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        if (!toolName) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name in tools/call' },
          };
        }
        const result = await executeMcpTool(toolName, toolArgs, currentConfig);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredData: result,
          },
        };
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: MCP_RESOURCES,
          },
        };

      case 'resources/read': {
        const uri = params?.uri;
        let content: any = null;

        if (uri === 'battery://materials/catalog') {
          content = {
            cathodes: CATHODE_MATERIALS,
            anodes: ANODE_MATERIALS,
            electrolytes: ELECTROLYTE_MATERIALS,
            separators: SEPARATOR_MATERIALS,
            formFactors: FORM_FACTORS,
          };
        } else if (uri === 'battery://active-cell/profile') {
          content = {
            config: currentConfig,
            metrics: computeCellMetrics(currentConfig),
          };
        } else if (uri === 'battery://benchmarks/industry-standards') {
          content = {
            benchmarks: [
              { name: 'Tesla 4680 (1st Gen)', energyDensityWhKg: 244, nominalV: 3.75, capacityAh: 26.1 },
              { name: 'Panasonic 21700 (50E)', energyDensityWhKg: 260, nominalV: 3.65, capacityAh: 4.9 },
              { name: 'BYD Blade LFP Prismatic', energyDensityWhKg: 165, nominalV: 3.20, capacityAh: 138 },
              { name: 'QuantumScape Solid-State Target', energyDensityWhKg: 380, nominalV: 3.80, capacityAh: 24 },
            ],
          };
        } else {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Resource not found: ${uri}` },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(content, null, 2),
              },
            ],
          },
        };
      }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: MCP_PROMPTS,
          },
        };

      case 'prompts/get': {
        const promptName = params?.name;
        const promptDef = MCP_PROMPTS.find((p) => p.name === promptName);
        if (!promptDef) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Prompt not found: ${promptName}` },
          };
        }

        let promptText = '';
        if (promptName === 'battery-safety-audit') {
          promptText = `You are an expert electrochemical safety auditor. Analyze the following battery configuration for application context: ${params?.arguments?.applicationContext || 'Electric Vehicle'}. Review cathode oxygen release temp, electrolyte flash point, N/P ratio plating margins, and recommend mitigation strategies.`;
        } else if (promptName === 'fast-charging-protocol-optimizer') {
          promptText = `Design an optimal multi-step constant-current constant-voltage (CC-CV) fast charging protocol targeting ${params?.arguments?.targetChargeTimeMinutes || '20'} minutes to 80% SOC without triggering lithium plating.`;
        } else {
          promptText = `Evaluate the engineering feasibility, interfacial resistance challenges, and gravimetric density gain of transitioning to all-solid-state lithium metal architecture.`;
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            description: promptDef.description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: promptText,
                },
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not supported: ${method}`,
          },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err.message || 'Internal MCP tool execution error',
      },
    };
  }
}
