/**
 * Config reader — parses module declarations from config.yaml.
 *
 * @module core/context-engine/config-reader
 */

import type { SpecLoreConfig, ModuleBoundary } from '../../types/index.js';
import { logger } from '../../infra/logger.js';

/**
 * Read module declarations from the project config and build ModuleBoundary objects.
 */
export function readModuleConfig(config: SpecLoreConfig): ModuleBoundary[] {
  const boundaries: ModuleBoundary[] = [];

  for (const [name, mod] of Object.entries(config.project.modules)) {
    logger.debug(`Reading module config: ${name} -> ${mod.path}`);

    boundaries.push({
      name,
      responsibility: mod.responsibility,
      publicApis: mod.apis ?? [],
      internalObjects: mod.entities ?? [],
      dependsOn: mod.dependsOn ?? [],
    });
  }

  return boundaries;
}
