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
import { StateManager } from '../../core/state-manager/index.js';

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

      // Workflow state
      console.log('');
      console.log('Workflow State');
      console.log('──────────────');
      const stateManager = new StateManager(projectRoot);
      stateManager.ensureInitialized();

      // Auto-migrate existing .feature files
      const specsDirForMigration = join(projectRoot, config.spec.outputDir);
      const migrated = stateManager.migrateFeatures(specsDirForMigration);
      if (migrated > 0) {
        console.log(`⬆ Migrated ${migrated} existing .feature file(s) into state tracking.`);
        console.log('');
      }

      const featureEntries = stateManager.listFeatures();
      if (featureEntries.length === 0) {
        console.log('○ No features tracked yet. Run `speclore spec` to create feature files.');
      } else {
        for (const { path, state: entry } of featureEntries) {
          const icon = entry.state === 'verified' ? '✓' : entry.state === 'coding' ? '◐' : entry.state === 'constrained' ? '◑' : '○';
          console.log(`${icon} ${path} → ${entry.state}`);
        }
        const summary = stateManager.getProjectSummary();
        console.log('');
        console.log(`  Total: ${summary.featureCount} | specified: ${summary.states.specified} | constrained: ${summary.states.constrained} | coding: ${summary.states.coding} | verified: ${summary.states.verified}`);
      }

      // Recommended actions
      const testCommand = config.verify.command;
      if (featureEntries.length === 0) {
        console.log('');
        console.log('Next step: speclore spec <requirement>');
      } else {
        const hasSpecified = featureEntries.some(e => e.state.state === 'specified');
        const hasConstrained = featureEntries.some(e => e.state.state === 'constrained');
        const hasCoding = featureEntries.some(e => e.state.state === 'coding');
        if (hasSpecified) {
          console.log('Next step: speclore code — generate constraints and test scaffolding');
        } else if (hasConstrained) {
          console.log('Next step: Fill in test scaffolding, then start coding');
        } else if (hasCoding) {
          if (!testCommand) {
            console.log('Next step: Configure verify.command in .speclore/config.yaml, then: speclore verify');
          } else {
            console.log('Next step: speclore verify — run acceptance tests');
          }
        } else {
          console.log('All features verified. Add new requirements with: speclore spec');
        }
      }

      console.log('');
    });
}
