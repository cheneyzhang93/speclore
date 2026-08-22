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
import { buildContext, loadContext } from '../../core/context-engine/index.js';
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
      logger.info(`Done. ${writtenFiles.length} constraint file(s) generated.`);
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
