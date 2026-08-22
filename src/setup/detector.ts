/**
 * AI tool detector — scans project for Cursor, Claude Code, Qoder configurations.
 *
 * @module setup/detector
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AIToolInfo } from '../types/index.js';

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

  // Claude Code
  const claudeFiles = ['.claude/', '.mcp.json', 'CLAUDE.md'];
  const claudeConfigs = claudeFiles.filter(f => existsSync(join(projectRoot, f)));
  tools.push({
    tool: 'claude',
    detected: claudeConfigs.length > 0,
    configFiles: claudeConfigs,
  });

  // Qoder
  const qoderFiles = ['.qoder/mcp.json', '.qoder/rules'];
  const qoderConfigs = qoderFiles.filter(f => existsSync(join(projectRoot, f)));
  tools.push({
    tool: 'qoder',
    detected: existsSync(join(projectRoot, '.qoder')),
    configFiles: qoderConfigs,
  });

  return tools.filter(t => t.detected);
}
