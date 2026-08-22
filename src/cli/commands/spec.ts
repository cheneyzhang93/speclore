/**
 * speclore spec — requirement → .feature
 *
 * @module cli/commands/spec
 */

import type { Command } from 'commander';
import { join } from 'node:path';
import { loadConfig } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';
import { readRequirement } from '../../core/requirement-reader/index.js';
import { generateFeature } from '../../core/feature-generator/index.js';
import { buildContext, loadContext } from '../../core/context-engine/index.js';

export function registerSpecCommand(program: Command): void {
  program
    .command('spec')
    .description('Convert a requirement source into BDD .feature file(s)')
    .argument('<source>', 'Requirement source: file path, URL, or text')
    .option('-m, --module <name>', 'Target module name')
    .option('-v, --verbose', 'Enable debug logging')
    .action(async (source: string, opts: { module?: string; verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      logger.info(`Reading requirement: ${source.slice(0, 80)}...`);

      const config = loadConfig(projectRoot);
      const specLoreDir = join(projectRoot, '.speclore');
      const context = loadContext(specLoreDir) ?? buildContext(projectRoot, config);

      const requirements = await readRequirement(source);
      const features = await generateFeature(requirements, context, config, projectRoot);
      logger.info(`Created: ${features.path} (${features.scenarios.length} scenarios)`);
      if (features.needsReview.length > 0) {
        logger.warn(`  Needs review: ${features.needsReview.join(', ')}`);
      }
    });
}
