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
        logger.warn('No supported AI tools detected. Continuing anyway...');
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
        const defaultConfig = generateDefaultConfig(projectRoot);
        writeFileSync(configPath, defaultConfig, 'utf-8');
        logger.info(`Created config: ${configPath}`);
      }

      // 4. Write MCP configuration
      writeMcpConfig(projectRoot, opts.global ?? false);

      // 5. Write rule files for detected tools
      writeRuleFiles(projectRoot, tools);

      logger.info('');
      logger.info('Setup complete! You can now:');
      logger.info('  • Run `speclore init` to initialize project context');
      logger.info('  • Or just start talking to your AI client about requirements');
    });
}

function generateDefaultConfig(projectRoot: string): string {
  const projectName = projectRoot.split(/[/\\]/).pop() ?? 'my-project';
  return `# SpecLore Configuration
# See: https://github.com/speclore/speclore#configuration

project:
  name: ${projectName}
  language: typescript
  framework: ""
  profile: normal
  modules: {}
    # Example:
    # order:
    #   path: src/order
    #   responsibility: Order management and processing
    #   dependsOn: [inventory, payment]

ai:
  provider: openai-compatible
  # baseUrl: https://api.openai.com/v1
  # model: gpt-4

spec:
  outputDir: specs
  defaultLanguage: zh-CN
  confidenceThreshold: 0.6

verify:
  command: ""
  timeout: 300
  reportFormat:
    - json
    - html
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
`;
}
