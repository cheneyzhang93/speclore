/**
 * MCP configuration writer — writes MCP server config for AI clients.
 *
 * Supports npm global install and git clone modes.
 *
 * @module setup/config-writer
 */

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectInstallMethod } from '../infra/install-detector.js';
import { logger } from '../infra/logger.js';

/**
 * Write MCP configuration files for all supported AI clients.
 */
export function writeMcpConfig(projectRoot: string, _globalMode: boolean): void {
  const installInfo = detectInstallMethod(projectRoot);
  const serverCommand = getServerCommand(installInfo);

  // Cursor: .cursor/mcp.json
  writeCursorMcp(projectRoot, serverCommand);

  // Claude Code: .mcp.json
  writeClaudeMcp(projectRoot, serverCommand);

  // Qoder: .qoder/mcp.json
  writeQoderMcp(projectRoot, serverCommand);

  logger.info('MCP configuration written for all detected AI clients.');
}

function getServerCommand(installInfo: { mode: string; localPath?: string }): { command: string; args: string[] } {
  if (installInfo.mode === 'npm') {
    return { command: 'npx', args: ['speclore', 'mcp'] };
  }
  // Clone mode — use local path
  const localPath = installInfo.localPath ?? process.cwd();
  return { command: 'node', args: [join(localPath, 'dist', 'mcp', 'server.js')] };
}

function writeCursorMcp(projectRoot: string, serverCmd: { command: string; args: string[] }): void {
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

function writeClaudeMcp(projectRoot: string, serverCmd: { command: string; args: string[] }): void {
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

function writeQoderMcp(projectRoot: string, serverCmd: { command: string; args: string[] }): void {
  const mcpDir = join(projectRoot, '.qoder');
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
