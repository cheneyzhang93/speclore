/**
 * AI tool detector — scans project for Cursor, Claude Code, Qoder configs.
 *
 * @module core/constraint-coder/ai-tool-detector
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AITool } from '../../types/index.js';
import { logger } from '../../infra/logger.js';
import { hasQoderDir } from '../../infra/path-utils.js';

/**
 * Detect which AI tools are present in the project.
 */
export function detectAITools(projectRoot: string): AITool[] {
  const tools: AITool[] = [];

  if (existsSync(join(projectRoot, '.cursor'))) {
    tools.push('cursor');
    logger.debug('Detected Cursor (.cursor/)');
  }

  // .mcp.json is NOT a reliable Claude indicator — SpecLore itself writes it.
  if (
    existsSync(join(projectRoot, '.claude')) ||
    existsSync(join(projectRoot, 'CLAUDE.md'))
  ) {
    tools.push('claude');
    logger.debug('Detected Claude Code (.claude/ or CLAUDE.md)');
  }

  if (hasQoderDir(projectRoot)) {
    tools.push('qoder');
    logger.debug('Detected Qoder (.qoder/ or .qoder-cn/)');
  }

  // Other clients are community-contributed
  logger.debug(`Detected AI tools: ${tools.length > 0 ? tools.join(', ') : 'none'}`);
  return tools;
}
