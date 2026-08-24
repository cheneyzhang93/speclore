/**
 * SpecLore MCP Server — stdio transport, using official SDK high-level API.
 *
 * Lifecycle: initialize → tools/list → tools/call → shutdown → exit
 *
 * Exposes 4 tools:
 *   - speclore.spec   — requirement → .feature (M1 → M2)
 *   - speclore.code   — .feature → AI constraint files (M3 + M7)
 *   - speclore.verify — tests → acceptance report (M4 + M7)
 *   - speclore.status — project workflow status + recommended actions
 *
 * @module mcp/server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { acquireLock, releaseLock } from '../infra/file-lock.js';
import { logger } from '../infra/logger.js';
import { executeSpecTool, executeCodeTool, executeVerifyTool, SPEC_TOOL_DESC, CODE_TOOL_DESC, VERIFY_TOOL_DESC, STATUS_TOOL_DESC } from './tools.js';
import { executeStatusTool } from './status.js';
import type { SpecResult, ConstraintResult, VerifyMcpResult, StatusResult } from '../types/index.js';
import { specInputSchema, codeInputSchema, verifyInputSchema, statusInputSchema } from './schemas.js';
import { VERSION } from '../version.js';
import { mkdirSync } from 'node:fs';

// ============================================================================
// Server setup
// ============================================================================

const server = new McpServer(
  { name: 'speclore', version: VERSION },
  { capabilities: { tools: {} } },
);

// ============================================================================
// Tool registration
// ============================================================================

server.registerTool(
  'speclore.spec',
  {
    description: SPEC_TOOL_DESC,
    inputSchema: specInputSchema.shape,
  },
  async (args) => {
    if (!args.source || args.source.length > 50000) {
      return { content: [{ type: 'text' as const, text: 'Error: source must be between 1 and 50000 characters' }], isError: true };
    }
    const result = await executeSpecTool(
      { source: args.source, module: args.module },
      getProjectRoot(),
    );
    const summary = buildSpecSummary(result);
    return { content: [{ type: 'text' as const, text: `${summary}\n\n---\n${JSON.stringify(result, null, 2)}` }] };
  },
);

server.registerTool(
  'speclore.code',
  {
    description: CODE_TOOL_DESC,
    inputSchema: codeInputSchema.shape,
  },
  async (args) => {
    if (args.features && args.features.length > 50) {
      return { content: [{ type: 'text' as const, text: 'Error: features array must not exceed 50 items' }], isError: true };
    }
    const result = await executeCodeTool(
      { features: args.features, tools: args.tools },
      getProjectRoot(),
    );
    const summary = buildCodeSummary(result);
    return { content: [{ type: 'text' as const, text: `${summary}\n\n---\n${JSON.stringify(result, null, 2)}` }] };
  },
);

server.registerTool(
  'speclore.verify',
  {
    description: VERIFY_TOOL_DESC,
    inputSchema: verifyInputSchema.shape,
  },
  async (args) => {
    const result = await executeVerifyTool(
      { features: args.features, impact: args.impact },
      getProjectRoot(),
    );
    const summary = buildVerifySummary(result);
    return { content: [{ type: 'text' as const, text: `${summary}\n\n---\n${JSON.stringify(result, null, 2)}` }] };
  },
);

server.registerTool(
  'speclore.status',
  {
    description: STATUS_TOOL_DESC,
    inputSchema: statusInputSchema.shape,
  },
  (args) => {
    const result = executeStatusTool(
      { feature: args.feature },
      getProjectRoot(),
    );
    const summary = buildStatusSummary(result);
    return { content: [{ type: 'text' as const, text: `${summary}\n\n---\n${JSON.stringify(result, null, 2)}` }] };
  },
);

// ============================================================================
// Lifecycle
// ============================================================================

let projectRoot = process.env.SPECLORE_PROJECT_ROOT ?? process.cwd();

function getProjectRoot(): string {
  return projectRoot;
}

/**
 * Start the MCP server on stdio.
 */
export async function startMcpServer(): Promise<void> {
  projectRoot = process.env.SPECLORE_PROJECT_ROOT ?? process.cwd();

  // Acquire file lock (ensure directory exists first)
  const specLoreDir = `${projectRoot}/.speclore`;
  try {
    mkdirSync(specLoreDir, { recursive: true });
    const locked = acquireLock(specLoreDir);
    if (!locked) {
      logger.warn('Could not acquire lock - another SpecLore instance may be running.');
    }
  } catch {
    logger.warn('Could not acquire lock - .speclore/ directory may not exist.');
  }

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.debug('MCP Server started (stdio transport)');

  // Graceful shutdown
  const cleanup = (): void => {
    try {
      releaseLock(`${projectRoot}/.speclore`);
    } catch {
      // Ignore cleanup errors
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

// ============================================================================
// Human-readable summary builders (prepended to JSON for user visibility)
// ============================================================================

function buildSpecSummary(result: SpecResult): string {
  const lines: string[] = [];
  lines.push('[SpecLore] Feature file generated successfully.');
  lines.push(`  File: ${result.createdFiles.join(', ')}`);
  lines.push(`  Scenarios: ${result.scenarios.length}`);
  for (const sc of result.scenarios) {
    lines.push(`    - ${sc.name}`);
  }
  lines.push(`  Next step: ${result.nextSteps}`);
  return lines.join('\n');
}

function buildCodeSummary(result: ConstraintResult): string {
  const lines: string[] = [];
  lines.push('[SpecLore] Constraints and test scaffolding generated.');
  lines.push(`  Constraint files: ${result.writtenFiles.length > 0 ? result.writtenFiles.join(', ') : 'none'}`);
  lines.push(`  Test scaffold files: ${result.scaffoldFiles.length > 0 ? result.scaffoldFiles.map(s => s.testFile).join(', ') : 'none'}`);
  lines.push(`  Next step: ${result.workflow.nextStep}`);
  return lines.join('\n');
}

function buildVerifySummary(result: VerifyMcpResult): string {
  const lines: string[] = [];
  const icon = result.failed === 0 ? '[PASS]' : '[FAIL]';
  lines.push(`[SpecLore] Verification ${icon} ${result.summary}`);
  if (result.failed > 0) {
    lines.push(`  Failed: ${result.failed} scenario(s)`);
    for (const d of result.failedDetails) {
      lines.push(`    - ${d.feature} > ${d.scenario}: ${d.error}`);
    }
  }
  if (result.unmapped > 0) {
    lines.push(`  Unmapped: ${result.unmapped} scenario(s) without test mapping`);
  }
  lines.push(`  Next step: ${result.workflow.nextStep}`);
  return lines.join('\n');
}

function buildStatusSummary(result: StatusResult): string {
  const lines: string[] = [];
  lines.push(`[SpecLore] Project status: ${result.project.initialized ? 'initialized' : 'not initialized'}`);
  lines.push(`  AI tools detected: ${result.project.aiToolsDetected.length > 0 ? result.project.aiToolsDetected.join(', ') : 'none'}`);
  lines.push(`  Features: ${result.summary.total} total`);
  if (result.summary.specified > 0) lines.push(`    - ${result.summary.specified} specified`);
  if (result.summary.constrained > 0) lines.push(`    - ${result.summary.constrained} constrained`);
  if (result.summary.coding > 0) lines.push(`    - ${result.summary.coding} coding`);
  if (result.summary.verified > 0) lines.push(`    - ${result.summary.verified} verified`);
  if (result.recommendedActions.length > 0) {
    lines.push('  Recommended actions:');
    for (const action of result.recommendedActions) {
      lines.push(`    -> ${action}`);
    }
  }
  return lines.join('\n');
}
