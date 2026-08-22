/**
 * File watcher — monitors .feature file changes and triggers constraint regeneration.
 *
 * Uses chokidar to watch for file system changes with configurable timeout.
 *
 * @module core/constraint-coder/watcher
 */

import { join } from 'node:path';
import type { SpecLoreConfig, ContextFile } from '../../types/index.js';
import type { FSWatcher } from 'chokidar';
import { logger } from '../../infra/logger.js';

/** Default timeout in minutes before auto-exit when no changes detected. */
const DEFAULT_TIMEOUT_MINUTES = 30;

/**
 * Watch .feature files for changes and re-generate constraints.
 *
 * @param projectRoot - Project root directory
 * @param config - SpecLore configuration
 * @param context - Current project context
 * @param regenerate - Callback to regenerate constraints
 * @param options - Watch options
 * @returns A function to stop watching
 */
export function watchFeatures(
  projectRoot: string,
  config: SpecLoreConfig,
  _context: ContextFile,
  regenerate: () => Promise<void>,
  options: { timeout?: number } = {},
): { stop: () => void } {
  const timeoutMinutes = options.timeout ?? DEFAULT_TIMEOUT_MINUTES;
  const timeoutMs = timeoutMinutes * 60 * 1000;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let exitTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: FSWatcher | null = null;
  let stopped = false;

  const specsDir = join(projectRoot, config.spec.outputDir);

  const startExitTimer = (): void => {
    if (exitTimer) clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      if (!stopped) {
        logger.info(`No changes for ${timeoutMinutes} minutes. Stopping watcher.`);
        stop();
      }
    }, timeoutMs);
  };

  const handleChange = (path: string): void => {
    if (!path.endsWith('.feature')) return;

    logger.info(`Feature file changed: ${path}`);

    // Debounce: wait 500ms after last change before regenerating
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void (async () => {
        try {
          logger.info('Regenerating constraints...');
          await regenerate();
          logger.info('Constraints regenerated successfully.');
          startExitTimer();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`Failed to regenerate constraints: ${message}`);
        }
      })();
    }, 500);
  };

  const start = async (): Promise<void> => {
    try {
      const chokidar = await import('chokidar');
      watcher = chokidar.watch(specsDir, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      watcher
        .on('add', handleChange)
        .on('change', handleChange)
        .on('unlink', handleChange)
        .on('error', (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`Watcher error: ${message}`);
        });

      logger.info(`Watching for .feature changes in ${specsDir}`);
      logger.info(`Auto-exit after ${timeoutMinutes} minutes of inactivity.`);
      startExitTimer();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to start watcher: ${message}`);
    }
  };

  const stop = (): void => {
    stopped = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (exitTimer) clearTimeout(exitTimer);
    if (watcher) {
      watcher.close().catch(() => {});
      watcher = null;
    }
    logger.info('Watcher stopped.');
  };

  // Start watching asynchronously
  start().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Watcher start failed: ${message}`);
  });

  return { stop };
}
