/**
 * Teardown cleanup — removes SpecLore configuration and generated files.
 *
 * @module setup/cleanup
 */

import { rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../infra/logger.js';
import { resolveQoderDir } from '../infra/path-utils.js';

/**
 * Remove SpecLore configuration and generated artifacts.
 */
export function runTeardown(projectRoot: string, globalMode: boolean): Promise<void> {
  if (globalMode) {
    const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const globalDir = join(homeDir, '.speclore');
    if (existsSync(globalDir)) {
      rmSync(globalDir, { recursive: true, force: true });
      logger.info(`Removed: ${globalDir}`);
    }
  } else {
    // Remove project-level .speclore directory
    const specLoreDir = join(projectRoot, '.speclore');
    if (existsSync(specLoreDir)) {
      rmSync(specLoreDir, { recursive: true, force: true });
      logger.info(`Removed: ${specLoreDir}`);
    }

    // Remove MCP entries from AI client configs
    removeMcpEntry(join(projectRoot, '.cursor', 'mcp.json'), 'speclore');
    removeMcpEntry(join(projectRoot, '.mcp.json'), 'speclore');
    const qoderDir = resolveQoderDir(projectRoot);
    removeMcpEntry(join(projectRoot, qoderDir, 'mcp.json'), 'speclore');

    // Remove rule files
    removeIfExists(join(projectRoot, '.cursor', 'rules', 'speclore.mdc'));
    removeIfExists(join(projectRoot, '.claude', 'rules', 'speclore.md'));
    removeIfExists(join(projectRoot, qoderDir, 'rules', 'speclore.md'));

    logger.info('Project teardown complete.');
  }
  return Promise.resolve();
}

function removeMcpEntry(mcpPath: string, serverName: string): void {
  if (!existsSync(mcpPath)) return;
  try {
    const config = JSON.parse(readFileSync(mcpPath, 'utf-8')) as { mcpServers?: Record<string, unknown> };
    if (config.mcpServers?.[serverName]) {
      delete config.mcpServers[serverName];
      writeFileSync(mcpPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info(`  Cleaned MCP entry: ${mcpPath}`);
    }
  } catch {
    // Ignore parse errors
  }
}

function removeIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    rmSync(filePath);
    logger.info(`  Removed: ${filePath}`);
  }
}
