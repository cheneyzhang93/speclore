/**
 * speclore verify — run tests → acceptance report
 *
 * @module cli/commands/verify
 */

import type { Command } from 'commander';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'glob';
import { loadConfig } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';
import { runVerification } from '../../core/verifier/index.js';
import { buildContext, loadContext } from '../../core/context-engine/index.js';
import { analyzeImpact } from '../../core/analyzer/index.js';
import { StateManager } from '../../core/state-manager/index.js';
import type { FeatureFile, ContextFile } from '../../types/index.js';
import type { SpecLoreConfig } from '../../types/config.js';

export function registerVerifyCommand(program: Command): void {
  program
    .command('verify')
    .description('Run tests and map results to .feature scenarios')
    .argument('[features...]', 'Feature file paths or glob patterns (all if omitted)')
    .option('--impact', 'Enable change impact analysis')
    .option('--watch', 'Watch for .feature file changes and re-run')
    .option('--timeout <minutes>', 'Watch timeout in minutes (default: 30)', '30')
    .option('-v, --verbose', 'Enable debug logging')
    .action(async (features: string[], opts: { impact?: boolean; watch?: boolean; timeout?: string; verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      const config = loadConfig(projectRoot);
      const specLoreDir = join(projectRoot, '.speclore');
      const context = loadContext(specLoreDir) ?? buildContext(projectRoot, config);

      // Impact analysis
      if (opts.impact) {
        logger.info('Running impact analysis...');
        const impact = analyzeImpact(projectRoot, context, config);
        context.impactAnalysis = {
          changedFiles: impact.changedFiles,
          affectedModules: impact.affectedModules,
          affectedFeatures: impact.affectedFeatures,
        };
      }

      // Resolve feature files
      const featureFiles = resolveFeatures(features, projectRoot, config);

      // State guard: check features have test scaffolding
      const stateManager = new StateManager(projectRoot);

      // Auto-migrate existing .feature files that aren't tracked yet
      const specsDir = join(projectRoot, config.spec.outputDir);
      stateManager.migrateFeatures(specsDir);

      for (const feature of featureFiles) {
        const entry = stateManager.getFeatureState(feature.path);
        if (!entry || entry.state === 'specified') {
          logger.error(`Feature "${feature.path}" has no test scaffolding. Run \`speclore code\` first.`);
          return;
        }
      }

      if (opts.watch) {
        await runWatchMode(projectRoot, featureFiles, context, config, Number(opts.timeout));
      } else {
        const report = await runVerification(projectRoot, featureFiles, config, context);
        const { generateReport } = await import('../../core/verifier/report-generator.js');
        generateReport(report, projectRoot, config);
      }
    });
}

async function runWatchMode(
  projectRoot: string,
  featureFiles: FeatureFile[],
  context: ContextFile,
  config: SpecLoreConfig,
  timeoutMinutes: number,
): Promise<void> {
  const { watch } = await import('chokidar');
  const { generateReport } = await import('../../core/verifier/report-generator.js');

  const timeoutMs = timeoutMinutes * 60 * 1000;
  let lastRun = Date.now();

  logger.info(`Watch mode enabled. Timeout: ${timeoutMinutes} minutes.`);

  const specsDir = `${projectRoot}/${config.spec.outputDir}`;
  const watcher = watch(specsDir, {
    ignored: /(^|[/\\])\../,
    persistent: true,
  });

  const runVerify = async () => {
    lastRun = Date.now();
    logger.info('Changes detected, running verification...');
    try {
      const report = await runVerification(projectRoot, featureFiles, config, context);
      generateReport(report, projectRoot, config);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Verification failed: ${message}`);
    }
  };

  // Debounce to prevent concurrent runs on rapid file changes
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedVerify = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { void runVerify(); }, 500);
  };

  watcher.on('change', debouncedVerify);
  watcher.on('add', debouncedVerify);

  // Check timeout periodically
  const interval = setInterval(() => {
    if (Date.now() - lastRun > timeoutMs) {
      logger.info('Watch timeout reached. Exiting.');
      void watcher.close();
      clearInterval(interval);
      process.exit(0);
    }
  }, 30_000);

  // Run once initially
  await runVerify();
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
