/**
 * MCP configuration writer — writes MCP server config for AI clients.
 *
 * Supports npm global install and git clone modes.
 *
 * @module setup/config-writer
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectInstallMethod } from '../infra/install-detector.js';
import { logger } from '../infra/logger.js';
import { resolveQoderDir } from '../infra/path-utils.js';
import type { AIToolInfo } from '../types/index.js';

/**
 * Write MCP configuration files for detected AI clients.
 * Only writes for tools that were actually detected.
 */
export function writeMcpConfig(projectRoot: string, tools: AIToolInfo[], _globalMode: boolean): void {
  const installInfo = detectInstallMethod(projectRoot);
  const serverCommand = getServerCommand(installInfo);

  const detectedToolNames = tools.map(t => t.tool);

  if (detectedToolNames.includes('cursor')) {
    writeCursorMcp(projectRoot, serverCommand);
  }

  if (detectedToolNames.includes('claude')) {
    writeClaudeMcp(projectRoot, serverCommand);
  }

  if (detectedToolNames.includes('qoder')) {
    writeQoderMcp(projectRoot, serverCommand);
  }

  if (detectedToolNames.length > 0) {
    logger.info(`MCP configuration written for: ${detectedToolNames.join(', ')}`);
  }
}

/**
 * Force-write MCP config for a specific client (used by `mcp add`).
 * Creates the client directory if it does not exist.
 */
export function writeMcpForClient(projectRoot: string, client: 'cursor' | 'claude' | 'qoder'): void {
  const installInfo = detectInstallMethod(projectRoot);
  const serverCommand = getServerCommand(installInfo);

  switch (client) {
    case 'cursor':
      mkdirSync(join(projectRoot, '.cursor'), { recursive: true });
      writeCursorMcp(projectRoot, serverCommand);
      break;
    case 'claude':
      // Ensure .claude/ exists so the write guard passes
      if (!existsSync(join(projectRoot, '.claude'))) {
        mkdirSync(join(projectRoot, '.claude'), { recursive: true });
      }
      writeClaudeMcp(projectRoot, serverCommand);
      break;
    case 'qoder': {
      const qoderDir = resolveQoderDir(projectRoot);
      mkdirSync(join(projectRoot, qoderDir), { recursive: true });
      writeQoderMcp(projectRoot, serverCommand);
      break;
    }
  }
}

function getServerCommand(installInfo: { mode: string; localPath?: string }): { command: string; args: string[] } {
  if (installInfo.mode === 'npm') {
    return { command: 'npx', args: ['speclore', 'mcp'] };
  }
  // Clone mode — use local path
  const localPath = installInfo.localPath ?? process.cwd();
  return { command: 'node', args: [join(localPath, 'dist', 'mcp', 'server.js')] };
}

export function writeCursorMcp(projectRoot: string, serverCmd: { command: string; args: string[] }): void {
  const mcpDir = join(projectRoot, '.cursor');
  if (!existsSync(mcpDir)) return; // Only write if .cursor exists

  const mcpPath = join(mcpDir, 'mcp.json');
  const existing = readExistingJson(mcpPath);

  if (!existing.mcpServers) existing.mcpServers = {};
  existing.mcpServers.speclore = {
    command: serverCmd.command,
    args: serverCmd.args,
    env: {},
  };

  writeFileSync(mcpPath, JSON.stringify(existing, null, 2), 'utf-8');
  logger.info(`  Cursor: ${mcpPath}`);
}

export function writeClaudeMcp(projectRoot: string, serverCmd: { command: string; args: string[] }): void {
  // Only write when genuine Claude Code markers exist (.claude/ or CLAUDE.md).
  // .mcp.json is NOT checked because SpecLore itself creates it — checking it
  // would cause a false-positive loop in non-Claude projects.
  const hasClaudeDir = existsSync(join(projectRoot, '.claude'));
  const hasClaudeMd = existsSync(join(projectRoot, 'CLAUDE.md'));
  if (!hasClaudeDir && !hasClaudeMd) return;

  const mcpPath = join(projectRoot, '.mcp.json');
  const existing = readExistingJson(mcpPath);

  if (!existing.mcpServers) existing.mcpServers = {};
  existing.mcpServers.speclore = {
    command: serverCmd.command,
    args: serverCmd.args,
    env: {},
  };

  writeFileSync(mcpPath, JSON.stringify(existing, null, 2), 'utf-8');
  logger.info(`  Claude Code: ${mcpPath}`);
}

export function writeQoderMcp(projectRoot: string, serverCmd: { command: string; args: string[] }): void {
  const qoderDir = resolveQoderDir(projectRoot);
  const mcpDir = join(projectRoot, qoderDir);
  if (!existsSync(mcpDir)) return;

  const mcpPath = join(mcpDir, 'mcp.json');
  const existing = readExistingJson(mcpPath);

  if (!existing.mcpServers) existing.mcpServers = {};
  existing.mcpServers.speclore = {
    command: serverCmd.command,
    args: serverCmd.args,
    env: {},
  };

  writeFileSync(mcpPath, JSON.stringify(existing, null, 2), 'utf-8');
  logger.info(`  Qoder: ${mcpPath}`);
}

/** MCP configuration file shape */
interface McpConfig {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

function readExistingJson(filePath: string): McpConfig {
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8')) as McpConfig;
    } catch {
      return {};
    }
  }
  return {};
}
