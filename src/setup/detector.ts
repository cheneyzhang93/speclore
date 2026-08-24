/**
 * AI tool detector — scans project for Cursor, Claude Code, Qoder configurations.
 *
 * @module setup/detector
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AIToolInfo } from '../types/index.js';
import { hasQoderDir } from '../infra/path-utils.js';

/**
 * Detect which AI tools are present in the project.
 */
export function detectAITools(projectRoot: string): AIToolInfo[] {
  const tools: AIToolInfo[] = [];

  // Cursor
  const cursorFiles = ['.cursor/mcp.json', '.cursor/rules'];
  const cursorConfigs = cursorFiles.filter(f => existsSync(join(projectRoot, f)));
  tools.push({
    tool: 'cursor',
    detected: existsSync(join(projectRoot, '.cursor')),
    configFiles: cursorConfigs,
  });

  // Claude Code — .mcp.json is NOT a reliable indicator because SpecLore itself writes it.
  // Only .claude/ and CLAUDE.md are genuine Claude Code markers.
  const claudeFiles = ['.claude/', 'CLAUDE.md'];
  const claudeConfigs = claudeFiles.filter(f => existsSync(join(projectRoot, f)));
  tools.push({
    tool: 'claude',
    detected: claudeConfigs.length > 0,
    configFiles: claudeConfigs,
  });

  // Qoder (supports both .qoder and .qoder-cn)
  const qoderDir = hasQoderDir(projectRoot) ? (existsSync(join(projectRoot, '.qoder-cn')) ? '.qoder-cn' : '.qoder') : '.qoder';
  const qoderFiles = [`${qoderDir}/mcp.json`, `${qoderDir}/rules`];
  const qoderConfigs = qoderFiles.filter(f => existsSync(join(projectRoot, f)));
  tools.push({
    tool: 'qoder',
    detected: hasQoderDir(projectRoot),
    configFiles: qoderConfigs,
  });

  return tools.filter(t => t.detected);
}
