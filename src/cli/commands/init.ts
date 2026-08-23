/**
 * speclore init — initialize project context.
 *
 * Scans project structure, detects modules, generates context.json.
 *
 * @module cli/commands/init
 */

import type { Command } from 'commander';
import { join } from 'node:path';
import { loadConfig } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';
import { buildContext, writeContextFile } from '../../core/context-engine/index.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Scan project structure and generate context.json (optional — auto-runs on first spec/code call)')
    .option('-v, --verbose', 'Enable debug logging')
    .action((opts: { verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      logger.info('SpecLore Init');
      logger.info('--------------');

      const config = loadConfig(projectRoot);
      logger.info(`Project: ${config.project.name || '(unnamed)'}`);

      const context = buildContext(projectRoot, config);

      // Write context.json to disk
      const specLoreDir = join(projectRoot, '.speclore');
      writeContextFile(specLoreDir, context);

      logger.info(`Language: ${context.projectSummary.language}`);
      logger.info(`Framework: ${context.projectSummary.framework}`);
      logger.info(`Modules: ${context.moduleBoundaries.length}`);
      logger.info(`Entities: ${context.existingCode.entities.length}`);
      logger.info(`APIs: ${context.existingCode.apis.length}`);
      logger.info('');
      logger.info('context.json generated successfully.');
    });
}
