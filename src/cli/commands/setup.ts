/**
 * speclore setup — one-time project configuration.
 *
 * Detects AI tools, writes MCP config, and generates rule files.
 *
 * @module cli/commands/setup
 */

import type { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../infra/logger.js';
import { generateDefaultConfigYaml } from '../../infra/config.js';
import { detectAITools } from '../../setup/detector.js';
import { writeMcpConfig } from '../../setup/config-writer.js';
import { writeRuleFiles } from '../../setup/rule-writer.js';

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('One-time project setup: detect AI tools, configure MCP, generate rules')
    .option('--global', 'Install globally (~/.speclore/) instead of per-project')
    .option('-v, --verbose', 'Enable debug logging')
    .action((opts: { global?: boolean; verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      logger.info('SpecLore Setup');
      logger.info('───────────────');

      // 1. Detect AI tools
      const tools = detectAITools(projectRoot);
      if (tools.length === 0) {
        logger.warn('No supported AI tools detected.');
        logger.info('');
        logger.info('  To enable MCP integration, open your AI client in this project first,');
        logger.info('  then re-run setup. Or use manual configuration:');
        logger.info('    speclore mcp add cursor   — configure for Cursor');
        logger.info('    speclore mcp add claude   — configure for Claude Code');
        logger.info('    speclore mcp add qoder    — configure for Qoder');
        logger.info('');
      } else {
        logger.info(`Detected AI tools: ${tools.map(t => t.tool).join(', ')}`);
      }

      // 2. Ensure .speclore directory
      const specLoreDir = opts.global
        ? join(process.env.HOME ?? process.env.USERPROFILE ?? '~', '.speclore')
        : join(projectRoot, '.speclore');
      if (!existsSync(specLoreDir)) {
        mkdirSync(specLoreDir, { recursive: true });
      }

      // 3. Generate default config if not exists
      const configPath = join(specLoreDir, 'config.yaml');
      if (!existsSync(configPath)) {
        const projectName = projectRoot.split(/[/\\]/).pop() ?? 'my-project';
        writeFileSync(configPath, generateDefaultConfigYaml(projectName), 'utf-8');
        logger.info(`Created config: ${configPath}`);
      }

      // 4. Write MCP configuration (only for detected tools)
      writeMcpConfig(projectRoot, tools, opts.global ?? false);

      // 5. Write rule files for detected tools
      writeRuleFiles(projectRoot, tools);

      logger.info('');
      logger.info('Setup complete! Next steps:');
      logger.info('');
      logger.info('  Option A — CLI workflow (terminal users):');
      logger.info('    speclore spec "your requirement"   → generate .feature');
      logger.info('    speclore code                      → generate constraints + tests');
      logger.info('    speclore verify                    → run acceptance');
      logger.info('');
      logger.info('  Option B — AI client workflow (recommended):');
      logger.info('    Open Cursor / Qoder / Claude Code and start chatting.');
      logger.info('    MCP is already configured — AI handles the full pipeline.');
      logger.info('');
      logger.info('  Optional — Pre-scan project context:');
      logger.info('    speclore init   → scan modules/entities/APIs for better AI context');
      logger.info('    (Not required — context is auto-built on first spec/code call)');
    });
}


