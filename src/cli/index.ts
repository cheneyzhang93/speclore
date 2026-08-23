/**
 * SpecLore CLI entry point.
 *
 * Usage:
 *   speclore              — smart mode: show status + auto-action
 *   speclore "description" — one-liner to generate feature
 *   speclore setup         — one-time project configuration
 *   speclore init          — initialize project
 *   speclore status        — project diagnostics
 *   speclore spec <source> — requirement → .feature
 *   speclore code          — .feature → AI constraint files
 *   speclore verify        — run tests → acceptance report
 *   speclore mcp           — start MCP server (stdio)
 *   speclore teardown      — uninstall cleanup
 *   speclore migrate       — register existing .feature files into workflow state
 */

import { Command } from 'commander';
import { registerSetupCommand } from './commands/setup.js';
import { registerInitCommand } from './commands/init.js';
import { registerStatusCommand } from './commands/status.js';
import { registerSpecCommand } from './commands/spec.js';
import { registerCodeCommand } from './commands/code.js';
import { registerVerifyCommand } from './commands/verify.js';
import { registerTeardownCommand } from './commands/teardown.js';
import { registerMigrateCommand } from './commands/migrate.js';
import { registerMcpConfigCommands } from './commands/mcp-config.js';
import { VERSION } from '../version.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('speclore')
    .version(VERSION)
    .description(
      'AI-powered product-engineering collaboration CLI — turn requirements into BDD specs, auto-generate AI coding constraints, and verify acceptance criteria.',
    );

  // Register all sub-commands
  registerSetupCommand(program);
  registerInitCommand(program);
  registerStatusCommand(program);
  registerSpecCommand(program);
  registerCodeCommand(program);
  registerVerifyCommand(program);
  registerTeardownCommand(program);
  registerMigrateCommand(program);

  // MCP server sub-command + manual MCP management sub-commands
  program
    .command('mcp')
    .description('Start MCP server (stdio transport) for AI tool integration')
    .action(async () => {
      const { startMcpServer } = await import('../mcp/server.js');
      await startMcpServer();
    });

  // Attach `mcp add/remove/list` to the mcp command
  registerMcpConfigCommands(program);

  // Smart mode: `speclore` with no sub-command
  program
    .argument('[text...]', 'Quick requirement text → .feature')
    .action(async (text: string[]) => {
      if (text.length > 0) {
        // One-liner mode: treat args as requirement text
        const { loadConfig } = await import('../infra/config.js');
        const { readRequirement } = await import('../core/requirement-reader/index.js');
        const { generateFeature } = await import('../core/feature-generator/index.js');
        const { buildContext, loadContext } = await import('../core/context-engine/index.js');
        const { logger } = await import('../infra/logger.js');

        const projectRoot = process.cwd();
        const config = loadConfig(projectRoot);
        const specLoreDir = `${projectRoot}/.speclore`;
        const context = loadContext(specLoreDir) ?? buildContext(projectRoot, config);

        const requirementText = text.join(' ');
        const req = await readRequirement(requirementText);
        const feature = await generateFeature(req, context, config, projectRoot);
        logger.info(`Created: ${feature.path} (${feature.scenarios.length} scenarios)`);
      } else {
        // No args: show status
        const { registerStatusCommand: showStatus } = await import('./commands/status.js');
        const statusProgram = new Command();
        showStatus(statusProgram);
        await statusProgram.parseAsync(['status']);
      }
    });

  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}
