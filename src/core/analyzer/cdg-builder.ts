/**
 * Code Dependency Graph builder.
 *
 * @module core/analyzer/cdg-builder
 */

import type { GraphEdge, ContextFile } from '../../types/index.js';
import { logger } from '../../infra/logger.js';

/**
 * Build a Code Dependency Graph from context.json.
 */
export function buildCDG(context: ContextFile): GraphEdge[] {
  // The dependency graph in context.json already represents code dependencies
  const edges = context.dependencyGraph;
  logger.debug(`CDG: ${edges.length} edges`);
  return edges;
}
