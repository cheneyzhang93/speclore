/**
 * speclore status — project diagnostics.
 *
 * @module cli/commands/status
 */

import type { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';
import { loadConfig } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';
import { detectAITools } from '../../setup/detector.js';
import { getCostTracker } from '../../ai/cost-tracker.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show project status and diagnostics')
    .option('-v, --verbose', 'Enable debug logging')
    .action((opts: { verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      console.log('');
      console.log('SpecLore Status');
      console.log('═══════════════');
      console.log('');

      // Load config (use defaults if config file doesn't exist)
      const config = loadConfig(projectRoot);

      // Config check
      const configPath = join(projectRoot, '.speclore', 'config.yaml');
      if (existsSync(configPath)) {
        console.log(`✓ Config: ${configPath}`);
        console.log(`  Project: ${config.project.name || '(unnamed)'}`);
        console.log(`  Profile: ${config.project.profile}`);
        console.log(`  Modules: ${Object.keys(config.project.modules).length}`);
      } else {
        console.log('✗ Config not found. Run `speclore setup` first.');
      }

      // Context check
      const contextPath = join(projectRoot, '.speclore', 'context.json');
      if (existsSync(contextPath)) {
        console.log(`✓ Context: ${contextPath}`);
      } else {
        console.log('✗ Context not found. Run `speclore init` first.');
      }

      // Feature files check — use configured output directory
      const specsDir = join(projectRoot, config.spec.outputDir);
      if (existsSync(specsDir)) {
        const features = globSync('**/*.feature', { cwd: specsDir });
        console.log(`✓ Features: ${features.length} file(s) in ${config.spec.outputDir}/`);
      } else {
        console.log(`○ No ${config.spec.outputDir}/ directory yet.`);
      }

      // AI tools detection
      const tools = detectAITools(projectRoot);
      if (tools.length > 0) {
        console.log(`✓ AI Tools: ${tools.map(t => t.tool).join(', ')}`);
      } else {
        console.log('✗ No AI tools detected.');
      }

      // AI cost summary (for current session)
      const costSummary = getCostTracker().getUsageSummary();
      if (costSummary.totalCalls > 0) {
        console.log(`✓ AI Usage: ${costSummary.totalCalls} call(s), ${costSummary.totalTokens} tokens, ~$${costSummary.totalCostUsd.toFixed(4)}`);
        for (const [model, stats] of Object.entries(costSummary.byModel)) {
          console.log(`  ${model}: ${stats.calls} call(s), ${stats.tokens} tokens, ~$${stats.costUsd.toFixed(4)}`);
        }
      } else {
        console.log('○ AI Usage: no calls in this session.');
      }

      console.log('');
    });
}
