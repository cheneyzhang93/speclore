/**
 * speclore code — .feature → AI constraint files
 *
 * @module cli/commands/code
 */

import type { Command } from 'commander';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'glob';
import { loadConfig } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';
import { generateConstraints } from '../../core/constraint-coder/index.js';
import { generateTestScaffolding } from '../../core/test-scaffolder/index.js';
import { buildContext, loadContext } from '../../core/context-engine/index.js';
import { StateManager } from '../../core/state-manager/index.js';
import type { FeatureFile, SpecLoreConfig } from '../../types/index.js';

export function registerCodeCommand(program: Command): void {
  program
    .command('code')
    .description('Generate AI coding constraint files from .feature specs')
    .argument('[features...]', 'Feature file paths or glob patterns (all if omitted)')
    .option('-v, --verbose', 'Enable debug logging')
    .action(async (features: string[], opts: { verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      const config = loadConfig(projectRoot);
      const specLoreDir = join(projectRoot, '.speclore');
      const context = loadContext(specLoreDir) ?? buildContext(projectRoot, config);

      // Resolve feature files
      const featureFiles = resolveFeatures(features, projectRoot, config);
      if (featureFiles.length === 0) {
        logger.warn('No feature files found. Run `speclore spec` first.');
        return;
      }

      logger.info(`Processing ${featureFiles.length} feature file(s)...`);
      const writtenFiles = await generateConstraints(projectRoot, featureFiles, context, config);

      for (const f of writtenFiles) {
        logger.info(`Written: ${f}`);
      }

      // Generate test scaffolding
      const scaffoldResults = generateTestScaffolding(projectRoot, featureFiles, config);
      if (scaffoldResults.length > 0) {
        console.log('');
        console.log('Test Scaffolding Generated:');
        for (const s of scaffoldResults) {
          logger.info(`  ${s.testFile} (${s.scenarios} scenarios, ${s.framework})`);
        }
      }

      // Update workflow state
      const stateManager = new StateManager(projectRoot);

      // Auto-migrate existing .feature files that aren't tracked yet
      const specsDir = join(projectRoot, config.spec.outputDir);
      const migrated = stateManager.migrateFeatures(specsDir);
      if (migrated > 0) {
        console.log(`Migrated ${migrated} existing .feature file(s) into state tracking.`);
      }

      for (const feature of featureFiles) {
        try {
          stateManager.transitionFeature(feature.path, 'constrained', ['specified']);
          stateManager.updateFeatureEntry(feature.path, {
            constraintFiles: writtenFiles,
            testFiles: scaffoldResults.map(s => s.testFile),
          });
        } catch {
          // May already be constrained
        }
      }

      console.log('');
      console.log(`Done. ${writtenFiles.length} constraint file(s), ${scaffoldResults.length} test scaffold(s) generated.`);
      console.log('Next step: Fill in test implementations, then start coding.');
    });
}

function resolveFeatures(
  patterns: string[],
  projectRoot: string,
  config: SpecLoreConfig,
): FeatureFile[] {
  const specsDir = join(projectRoot, config.spec.outputDir);
  const searchPatterns = patterns.length > 0 ? patterns : [`${specsDir}/**/*.feature`];

  const files: FeatureFile[] = [];
  for (const pattern of searchPatterns) {
    const matches = globSync(pattern, { cwd: projectRoot, absolute: true });
    for (const filePath of matches) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        const featureMatch = content.match(/Feature:\s*(.+)/);
        files.push({
          path: filePath,
          featureName: featureMatch?.[1]?.trim() ?? filePath,
          scenarios: [],
          tags: [],
          confidence: 1.0,
          needsReview: [],
        });
      }
    }
  }
  return files;
}
