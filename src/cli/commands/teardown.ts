/**
 * speclore teardown — uninstall cleanup.
 *
 * @module cli/commands/teardown
 */

import type { Command } from 'commander';
import { logger } from '../../infra/logger.js';
import { runTeardown } from '../../setup/cleanup.js';

export function registerTeardownCommand(program: Command): void {
  program
    .command('teardown')
    .description('Remove SpecLore configuration and generated files')
    .option('--global', 'Remove global configuration (~/.speclore/)')
    .option('--yes', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Enable debug logging')
    .action(async (opts: { global?: boolean; yes?: boolean; verbose?: boolean }) => {
      if (opts.verbose) logger.setLevel('debug');
      const projectRoot = process.cwd();

      if (!opts.yes) {
        const inquirer = await import('inquirer');
        const answers = await inquirer.default.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: opts.global
            ? 'Remove global SpecLore configuration (~/.speclore/)?'
            : 'Remove project SpecLore configuration (.speclore/)?',
          default: false,
        }]);
        if (!answers.confirm) {
          logger.info('Cancelled.');
          return;
        }
      }

      await runTeardown(projectRoot, opts.global ?? false);
      logger.info('Teardown complete.');
    });
}
