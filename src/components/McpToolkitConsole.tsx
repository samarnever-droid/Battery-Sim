/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Code2,
  FileText,
  Boxes,
  Cpu,
  Sparkles,
  ExternalLink,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import type { CellConfiguration } from '../battery/types.ts';
import {
  MCP_TOOLS,
  MCP_RESOURCES,
  MCP_PROMPTS,
  MCP_SERVER_INFO,
  handleMcpRequest,
} from '../battery/mcp.ts';

interface McpToolkitConsoleProps {
  currentConfig: CellConfiguration;
}

export const McpToolkitConsole: React.FC<McpToolkitConsoleProps> = ({ currentConfig }) => {
  const [subTab, setSubTab] = useState<'tools' | 'resources' | 'config' | 'raw-rpc'>('tools');
  const [selectedToolName, setSelectedToolName] = useState<string>('calculate_cell_specs');
  const [toolArgsInput, setToolArgsInput] = useState<string>(
    JSON.stringify(
      {
        cathodeId: currentConfig.cathodeId,
        anodeId: currentConfig.anodeId,
        cathodeThicknessUm: currentConfig.cathodeThicknessUm,
        anodeThicknessUm: currentConfig.anodeThicknessUm,
      },
      null,
      2
    )
  );
  const [executionOutput, setExecutionOutput] = useState<any>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected tool object
  const selectedTool = MCP_TOOLS.find((t) => t.name === selectedToolName) || MCP_TOOLS[0];

  const handleSelectTool = (toolName: string) => {
    setSelectedToolName(toolName);
    const tool = MCP_TOOLS.find((t) => t.name === toolName);
    if (!tool) return;

    let defaultArgs: any = {};
    if (toolName === 'calculate_cell_specs') {
      defaultArgs = {
        cathodeId: currentConfig.cathodeId,
        anodeId: currentConfig.anodeId,
        formFactorId: currentConfig.formFactorId,
        cathodeThicknessUm: currentConfig.cathodeThicknessUm,
        anodeThicknessUm: currentConfig.anodeThicknessUm,
      };
    } else if (toolName === 'simulate_discharge_curve') {
      defaultArgs = { cRate: 1.0, ambientTempC: 25 };
    } else if (toolName === 'analyze_thermal_runaway') {
      defaultArgs = {
        cathodeId: currentConfig.cathodeId,
        electrolyteId: currentConfig.electrolyteId,
      };
    } else if (toolName === 'optimize_np_ratio') {
      defaultArgs = {
        cathodeId: currentConfig.cathodeId,
        anodeId: currentConfig.anodeId,
        cathodeThicknessUm: 70,
        targetNpRatio: 1.15,
      };
    } else if (toolName === 'query_material_pubchem') {
      defaultArgs = { materialKey: 'LiFePO4' };
    } else if (toolName === 'export_mcp_config') {
      defaultArgs = { clientType: 'claude-desktop' };
    }
    setToolArgsInput(JSON.stringify(defaultArgs, null, 2));
  };

  const handleRunTool = async () => {
    setIsExecuting(true);
    const start = performance.now();
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsInput);
      } catch (e: any) {
        setExecutionOutput({ error: `JSON Parse Error: ${e.message}` });
        setIsExecuting(false);
        return;
      }

      const req = {
        jsonrpc: '2.0' as const,
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: selectedToolName,
          arguments: parsedArgs,
        },
      };

      const resp = await handleMcpRequest(req, currentConfig);
      setExecutionTimeMs(Math.round(performance.now() - start));
      setExecutionOutput(resp);
    } catch (err: any) {
      setExecutionOutput({ error: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReadResource = async (uri: string) => {
    setIsExecuting(true);
    const start = performance.now();
    const resp = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/read',
        params: { uri },
      },
      currentConfig
    );
    setExecutionTimeMs(Math.round(performance.now() - start));
    setExecutionOutput(resp);
    setIsExecuting(false);
  };

  const handleGetPrompt = async (name: string) => {
    setIsExecuting(true);
    const start = performance.now();
    const resp = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'prompts/get',
        params: { name, arguments: { applicationContext: 'Electric Vehicle High-Nickel Cell' } },
      },
      currentConfig
    );
    setExecutionTimeMs(Math.round(performance.now() - start));
    setExecutionOutput(resp);
    setIsExecuting(false);
  };

  const claudeDesktopSnippet = JSON.stringify(
    {
      mcpServers: {
        electromcp_battery: {
          command: 'node',
          args: ['/path/to/electromcp/server.js'],
          env: {
            PORT: '3000',
          },
        },
      },
    },
    null,
    2
  );

  const cursorMcpSnippet = JSON.stringify(
    {
      mcpServers: {
        electromcp: {
          url: 'http://localhost:3000/api/mcp',
          transport: 'sse',
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* MCP Protocol Intro Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-white/10 border border-white/20 shrink-0">
              <Terminal className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Model Context Protocol (MCP) Server & Toolkit</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-400 text-purple-950 rounded">
                  MCP v2024-11-05
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-1 max-w-3xl">
                ElectroMCP exposes real battery materials, Butler-Volmer electrochemical simulations, thermal safety audits, and PubChem verification tools to LLM agents and desktop AI applications via the open Model Context Protocol.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSubTab('config')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-950 rounded-lg text-xs font-semibold hover:bg-purple-50 transition-colors shadow-xs"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              Connect to Claude / Cursor
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex space-x-1 mt-4 pt-3 border-t border-white/10 text-xs">
          <button
            onClick={() => setSubTab('tools')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              subTab === 'tools' ? 'bg-white/20 text-white font-semibold' : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Tools Catalog & Live Runner ({MCP_TOOLS.length})
          </button>
          <button
            onClick={() => setSubTab('resources')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              subTab === 'resources' ? 'bg-white/20 text-white font-semibold' : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Resources & Prompts ({MCP_RESOURCES.length + MCP_PROMPTS.length})
          </button>
          <button
            onClick={() => setSubTab('config')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              subTab === 'config' ? 'bg-white/20 text-white font-semibold' : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Agent Setup Configs
          </button>
        </div>
      </div>

      {/* Main MCP Content View */}
      {subTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tool List Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono px-1">
              <span>AVAILABLE MCP TOOLS</span>
              <span>JSON-RPC 2.0</span>
            </div>

            <div className="space-y-1.5">
              {MCP_TOOLS.map((tool) => {
                const isSelected = selectedToolName === tool.name;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleSelectTool(tool.name)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{tool.name}</span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        tool
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Tool Runner & Output (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-mono font-bold text-slate-900">{selectedTool.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedTool.description}</p>
                </div>
                <button
                  onClick={handleRunTool}
                  disabled={isExecuting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isExecuting ? 'Executing...' : 'Execute Tool'}
                </button>
              </div>

              {/* JSON Parameters Input */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500 mb-1">
                  <span>INPUT ARGUMENTS (JSON Schema Validated):</span>
                  <button
                    onClick={() => handleCopy(toolArgsInput, 'toolArgs')}
                    className="text-purple-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    {copiedKey === 'toolArgs' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy Args
                  </button>
                </div>
                <textarea
                  value={toolArgsInput}
                  onChange={(e) => setToolArgsInput(e.target.value)}
                  rows={6}
                  className="w-full text-xs font-mono bg-slate-900 text-purple-200 p-3 rounded-lg border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Execution Output Window */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase font-mono">
                    JSON-RPC 2.0 Response Output
                  </span>
                </div>
                {executionTimeMs !== null && (
                  <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Execution time: {executionTimeMs} ms
                  </span>
                )}
              </div>

              <div className="mt-4">
                {executionOutput ? (
                  <pre className="text-xs font-mono bg-slate-950 text-emerald-400 p-4 rounded-lg overflow-x-auto max-h-80 border border-slate-800">
                    {JSON.stringify(executionOutput, null, 2)}
                  </pre>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400 font-mono">
                    Click &quot;Execute Tool&quot; above to dispatch an MCP JSON-RPC call and inspect the real-time response.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resources & Prompts SubTab */}
      {subTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MCP Resources Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Boxes className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-bold text-slate-900">Standard MCP Resources (`resources/*`)</h4>
            </div>
            <p className="text-xs text-slate-500">
              Static and dynamic state resources queryable by LLM agents via the Model Context Protocol URI scheme.
            </p>

            <div className="space-y-3">
              {MCP_RESOURCES.map((res) => (
                <div key={res.uri} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{res.name}</span>
                    <button
                      onClick={() => handleReadResource(res.uri)}
                      className="px-2.5 py-1 bg-purple-600 text-white rounded text-[11px] font-medium hover:bg-purple-700 transition-colors"
                    >
                      Read Resource
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-purple-700 bg-white px-2 py-1 rounded border border-slate-200 truncate">
                    {res.uri}
                  </div>
                  <p className="text-[11px] text-slate-600">{res.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* MCP Prompts Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Pre-Configured MCP Prompts (`prompts/*`)</h4>
            </div>
            <p className="text-xs text-slate-500">
              Specialized domain prompt templates engineered for electrochemical audits, fast-charging protocols, and solid-state migrations.
            </p>

            <div className="space-y-3">
              {MCP_PROMPTS.map((p) => (
                <div key={p.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{p.name}</span>
                    <button
                      onClick={() => handleGetPrompt(p.name)}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px] font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Evaluate Prompt
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600">{p.description}</p>
                  {p.arguments && p.arguments.length > 0 && (
                    <div className="text-[10px] font-mono text-slate-400">
                      Arguments: {p.arguments.map((a) => a.name).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Setup Configs SubTab */}
      {subTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-2">
              Connect ElectroMCP to External AI Agents & Tools
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Add ElectroMCP to Claude Desktop or Cursor so your AI can directly build battery cells, optimize electrode loadings, run Butler-Volmer simulations, and perform safety audits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Claude Desktop Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Claude Desktop (`claude_desktop_config.json`):</span>
                  <button
                    onClick={() => handleCopy(claudeDesktopSnippet, 'claude')}
                    className="text-purple-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                  >
                    {copiedKey === 'claude' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy JSON
                  </button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 text-purple-200 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                  {claudeDesktopSnippet}
                </pre>
                <p className="text-[11px] text-slate-500">
                  Save to: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows).
                </p>
              </div>

              {/* Cursor / Universal SSE Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Cursor IDE (`.cursor/mcp.json`):</span>
                  <button
                    onClick={() => handleCopy(cursorMcpSnippet, 'cursor')}
                    className="text-purple-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                  >
                    {copiedKey === 'cursor' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy JSON
                  </button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 text-purple-200 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                  {cursorMcpSnippet}
                </pre>
                <p className="text-[11px] text-slate-500">
                  Provides streaming tool calls and live token output directly inside the Cursor composer window.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
