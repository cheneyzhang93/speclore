/**
 * Requirement Dependency Graph builder.
 *
 * @module core/analyzer/rdg-builder
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { GraphEdge } from '../../types/index.js';
import { logger } from '../../infra/logger.js';

/**
 * Build a Requirement Dependency Graph from .feature files.
 */
export function buildRDG(projectRoot: string, specsDir: string): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const fullSpecsDir = join(projectRoot, specsDir);

  if (!existsSync(fullSpecsDir)) {
    logger.debug(`Specs directory not found: ${fullSpecsDir}`);
    return edges;
  }

  const features = scanFeatureFiles(fullSpecsDir);

  for (const feature of features) {
    const content = readFileSync(feature, 'utf-8');
    const fromModule = deriveModuleName(feature, fullSpecsDir);

    // Look for dependency declarations
    const depRegex = /(?:Depends on|依赖)[:\s]+(.+)/gi;
    const match = depRegex.exec(content);
    if (match) {
      const deps = match[1]!.split(/[,;\uff0c\uff1b]/).map(d => d.trim()).filter(Boolean);
      for (const dep of deps) {
        edges.push({
          from: fromModule,
          to: dep,
          type: 'api-call',
        });
      }
    }
  }

  logger.debug(`RDG: ${edges.length} edges from ${features.length} features`);
  return edges;
}

function scanFeatureFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(d: string): void {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.feature')) {
          files.push(fullPath);
        }
      }
    } catch { /* ignore */ }
  }

  walk(dir);
  return files;
}

function deriveModuleName(filePath: string, specsDir: string): string {
  const relative = filePath.slice(specsDir.length + 1);
  const parts = relative.split(/[/\\]/);
  return parts.length > 1 ? parts[0]! : parts[0]!.replace('.feature', '');
}
