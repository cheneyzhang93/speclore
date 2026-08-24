/**
 * Text file reader — reads .txt files as plain text requirements.
 *
 * @module core/requirement-reader/text-reader
 */

import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import type { StructuredRequirement } from '../../types/index.js';

export function readTextFile(filePath: string): Promise<StructuredRequirement> {
  const content = readFileSync(filePath, 'utf-8');
  const id = deriveId(filePath);

  // Extract title from first non-empty line
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const title = lines[0]?.slice(0, 100) ?? basename(filePath, extname(filePath));

  return Promise.resolve({
    id,
    title,
    description: content,
    rawContent: content,
    confidence: 1.0,
  });
}

function deriveId(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-').replace(/-+/g, '-');
}
