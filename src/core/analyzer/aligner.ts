/**
 * RDG/CDG aligner — compares requirement and code dependencies.
 *
 * @module core/analyzer/aligner
 */

import type { GraphEdge } from '../../types/index.js';
import { logger } from '../../infra/logger.js';

export interface AlignmentResult {
  /** Edges in RDG but not in CDG — code is missing expected dependencies */
  missingInCode: GraphEdge[];
  /** Edges in CDG but not in RDG — code has undeclared dependencies */
  missingInRequirements: GraphEdge[];
  /** Edges present in both */
  aligned: GraphEdge[];
}

/**
 * Align RDG and CDG, detecting inconsistencies.
 */
export function alignGraphs(rdg: GraphEdge[], cdg: GraphEdge[]): AlignmentResult {
  const aligned: GraphEdge[] = [];
  const missingInCode: GraphEdge[] = [];
  const missingInRequirements: GraphEdge[] = [];

  // Check each RDG edge against CDG
  for (const rdgEdge of rdg) {
    const found = cdg.some(
      cdgEdge => cdgEdge.from === rdgEdge.from && cdgEdge.to === rdgEdge.to,
    );

    if (found) {
      aligned.push(rdgEdge);
    } else {
      missingInCode.push(rdgEdge);
    }
  }

  // Check each CDG edge against RDG
  for (const cdgEdge of cdg) {
    const found = rdg.some(
      rdgEdge => rdgEdge.from === cdgEdge.from && rdgEdge.to === cdgEdge.to,
    );

    if (!found) {
      missingInRequirements.push(cdgEdge);
    }
  }

  logger.debug(
    `Alignment: ${aligned.length} aligned, ${missingInCode.length} missing in code, ${missingInRequirements.length} missing in requirements`,
  );

  return { aligned, missingInCode, missingInRequirements };
}
