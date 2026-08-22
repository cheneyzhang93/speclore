/**
 * speclore migrate — register existing .feature files into workflow state.
 *
 * For projects upgrading from pre-workflow SpecLore versions:
 * scans the specs directory and registers all .feature files
 * that are not yet tracked in state.yaml.
 *
 * @module cli/commands/migrate
 */

import type { Command } from 'commander';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { loadConfig } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';
import { StateManager } from '../../core/state-manager/index.js';

export function registerMigrateCommand(program: Command): void {
  program
    .command('migrate')
    .description('Register existing .feature files into workflow state (for upgrading projects)')
    .option('-v, --verbose', 'Enable debug logging')
    .action((opts: { verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      console.log('');
      console.log('SpecLore Migration');
      console.log('══════════════════');
      console.log('');

      // Check config
      const configPath = join(projectRoot, '.speclore', 'config.yaml');
      if (!existsSync(configPath)) {
        console.log('✗ No .speclore/config.yaml found. Run `speclore setup` first.');
        console.log('');
        return;
      }
      console.log('✓ Config found');

      const config = loadConfig(projectRoot);

      // Initialize state if needed
      const stateManager = new StateManager(projectRoot);
      stateManager.ensureInitialized();
      console.log('✓ State file ready');

      // Scan and migrate
      const specsDir = join(projectRoot, config.spec.outputDir);
      if (!existsSync(specsDir)) {
        console.log(`○ No ${config.spec.outputDir}/ directory found — nothing to migrate.`);
        console.log('');
        return;
      }

      const before = stateManager.listFeatures().length;
      const migrated = stateManager.migrateFeatures(specsDir);
      const after = stateManager.listFeatures().length;

      console.log(`✓ Scanned ${config.spec.outputDir}/ for .feature files`);
      console.log('');

      if (migrated === 0) {
        console.log(`All feature files are already tracked (${before} feature(s) in state).`);
        console.log('No migration needed.');
      } else {
        console.log(`Migrated ${migrated} feature file(s) → specified`);
        console.log('');

        // Show the migrated features
        const features = stateManager.listFeatures();
        for (const { path, state: entry } of features) {
          if (entry.state === 'specified') {
            console.log(`  ○ ${path} → specified`);
          }
        }
      }

      console.log('');
      console.log(`Total tracked features: ${after}`);
      console.log('');
      console.log('Next step: speclore code — generate constraints and test scaffolding');
      console.log('');
    });
}
