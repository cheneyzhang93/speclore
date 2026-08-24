/**
 * speclore mcp add/remove/list — manual MCP configuration management.
 *
 * @module cli/commands/mcp-config
 */

import type { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../infra/logger.js';
import { writeMcpForClient } from '../../setup/config-writer.js';
import { resolveQoderDir } from '../../infra/path-utils.js';

type McpClient = 'cursor' | 'claude' | 'qoder';

const VALID_CLIENTS: McpClient[] = ['cursor', 'claude', 'qoder'];

/** Paths where each client stores its MCP config */
function getMcpPath(projectRoot: string, client: McpClient): string {
  switch (client) {
    case 'cursor': return join(projectRoot, '.cursor', 'mcp.json');
    case 'claude': return join(projectRoot, '.mcp.json');
    case 'qoder': {
      const qoderDir = resolveQoderDir(projectRoot);
      return join(projectRoot, qoderDir, 'mcp.json');
    }
  }
}

/** Human-readable client labels for log output */
function clientLabel(client: McpClient): string {
  switch (client) {
    case 'cursor': return 'Cursor';
    case 'claude': return 'Claude Code';
    case 'qoder':  return 'Qoder';
  }
}

export function registerMcpConfigCommands(program: Command): void {
  // Find the existing `mcp` command (registered in index.ts for the server)
  // and attach sub-commands to it.
  const mcpCmd = program.commands.find(c => c.name() === 'mcp');
  if (!mcpCmd) return;

  // ── mcp add <client> ─────────────────────────────────────────────────────
  mcpCmd
    .command('add <client>')
    .description('Manually write SpecLore MCP config for a specific AI client (cursor | claude | qoder)')
    .action((clientArg: string) => {
      const projectRoot = process.cwd();
      const client = validateClient(clientArg);
      if (!client) return;

      logger.info(`Configuring MCP for ${clientLabel(client)}...`);
      writeMcpForClient(projectRoot, client);
      logger.info(`[OK] ${clientLabel(client)} MCP configured at ${getMcpPath(projectRoot, client)}`);
    });

  // ── mcp remove <client> ───────────────────────────────────────────────────
  mcpCmd
    .command('remove <client>')
    .description('Remove SpecLore MCP config from a specific AI client (cursor | claude | qoder)')
    .action((clientArg: string) => {
      const projectRoot = process.cwd();
      const client = validateClient(clientArg);
      if (!client) return;

      const mcpPath = getMcpPath(projectRoot, client);
      if (!existsSync(mcpPath)) {
        logger.info(`${clientLabel(client)}: no MCP config file found at ${mcpPath}`);
        return;
      }

      const removed = removeMcpServerEntry(mcpPath, 'speclore');
      if (removed) {
        logger.info(`[OK] Removed speclore from ${clientLabel(client)}: ${mcpPath}`);
      } else {
        logger.info(`${clientLabel(client)}: speclore entry not found in ${mcpPath}`);
      }
    });

  // ── mcp list ──────────────────────────────────────────────────────────────
  mcpCmd
    .command('list')
    .description('Show current SpecLore MCP configuration status for all clients')
    .action(() => {
      const projectRoot = process.cwd();

      logger.info('SpecLore MCP Configuration Status');
      logger.info('------------------------------');

      let anyFound = false;

      for (const client of VALID_CLIENTS) {
        const mcpPath = getMcpPath(projectRoot, client);
        if (!existsSync(mcpPath)) {
          logger.info(`  [-] ${clientLabel(client)}: no config file (${mcpPath})`);
          continue;
        }

        try {
          const config = JSON.parse(readFileSync(mcpPath, 'utf-8')) as { mcpServers?: Record<string, unknown> };
          if (config.mcpServers?.['speclore']) {
            logger.info(`  [OK] ${clientLabel(client)}: configured -> ${mcpPath}`);
            anyFound = true;
          } else {
            logger.info(`  [-] ${clientLabel(client)}: config file exists but speclore not registered -> ${mcpPath}`);
          }
        } catch {
          logger.info(`  [!] ${clientLabel(client)}: failed to parse ${mcpPath}`);
        }
      }

      if (!anyFound) {
        logger.info('');
        logger.info('  No SpecLore MCP configurations found.');
        logger.info('  Run `speclore setup` or `speclore mcp add <client>` to configure.');
      }
    });
}

/**
 * Validate and normalise a client argument.
 * Returns null (and logs an error) if invalid.
 */
function validateClient(arg: string): McpClient | null {
  const normalised = arg.toLowerCase().trim() as McpClient;
  if (!VALID_CLIENTS.includes(normalised)) {
    logger.error(`Unknown client "${arg}". Supported: ${VALID_CLIENTS.join(', ')}`);
    return null;
  }
  return normalised;
}

/**
 * Remove a named server entry from an MCP config file.
 * If the file becomes empty (no mcpServers left), the file itself is deleted.
 * Returns true if an entry was actually removed.
 */
function removeMcpServerEntry(mcpPath: string, serverName: string): boolean {
  if (!existsSync(mcpPath)) return false;

  try {
    const config = JSON.parse(readFileSync(mcpPath, 'utf-8')) as { mcpServers?: Record<string, unknown> };
    if (!config.mcpServers?.[serverName]) return false;

    delete config.mcpServers[serverName];

    // If no servers remain, clean up the file entirely
    const remainingServers = Object.keys(config.mcpServers ?? {});
    if (remainingServers.length === 0) {
      rmSync(mcpPath);
    } else {
      writeFileSync(mcpPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    return true;
  } catch {
    return false;
  }
}
