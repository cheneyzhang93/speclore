/**
 * Impact analyzer — determines what features are affected by code changes.
 *
 * @module core/analyzer/impact-analyzer
 */

import { execFileSync } from 'node:child_process';
import { globSync } from 'glob';
import type { ContextFile, SpecLoreConfig } from '../../types/index.js';
import { logger } from '../../infra/logger.js';
import { toPosixPath } from '../../infra/path-utils.js';

export interface ImpactResult {
  changedFiles: string[];
  affectedModules: string[];
  affectedFeatures: string[];
}

/**
 * Analyze the impact of recent code changes.
 */
export function analyzeImpact(
  projectRoot: string,
  context: ContextFile,
  config: SpecLoreConfig,
): ImpactResult {
  // Get changed files from git
  const changedFiles = getChangedFiles(projectRoot);

  // Determine affected modules via CDG
  const affectedModules = determineAffectedModules(changedFiles, context);

  // Determine affected features via module mapping
  const affectedFeatures = determineAffectedFeatures(affectedModules, projectRoot, config.spec.outputDir);

  logger.info(
    `Impact: ${changedFiles.length} files changed, ${affectedModules.length} modules affected, ${affectedFeatures.length} features affected`,
  );

  return { changedFiles, affectedModules, affectedFeatures };
}

/**
 * Get list of changed files from git diff.
 */
function getChangedFiles(projectRoot: string): string[] {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return output
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean)
      .map(toPosixPath);
  } catch {
    // Try unstaged changes
    try {
      const output = execFileSync('git', ['diff', '--name-only'], {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return output
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean)
        .map(toPosixPath);
    } catch {
      logger.warn('Could not get git diff. Is this a git repository?');
      return [];
    }
  }
}

/**
 * Determine which modules are affected by changed files.
 */
function determineAffectedModules(
  changedFiles: string[],
  context: ContextFile,
): string[] {
  const affected = new Set<string>();

  for (const file of changedFiles) {
    for (const mod of context.moduleBoundaries) {
      // Check if the changed file is within this module's path
      // This is a simplified check — full implementation would use module paths from config
      if (file.includes(`/${mod.name}/`) || file.includes(`\\${mod.name}\\`)) {
        affected.add(mod.name);
      }
    }
  }

  // Also add modules that depend on affected modules (transitive)
  const expanded = new Set(affected);
  for (const mod of context.moduleBoundaries) {
    if (mod.dependsOn.some(dep => affected.has(dep))) {
      expanded.add(mod.name);
    }
  }

  return [...expanded];
}

/**
 * Determine which features are affected by module changes.
 */
function determineAffectedFeatures(
  affectedModules: string[],
  projectRoot: string,
  outputDir: string,
): string[] {
  // Map module names to actual feature files
  const features: string[] = [];

  for (const mod of affectedModules) {
    const pattern = `${outputDir}/${mod}/**/*.feature`;
    const files = globSync(pattern, { cwd: projectRoot, absolute: true });
    features.push(...files);
  }

  return [...new Set(features)];
}
