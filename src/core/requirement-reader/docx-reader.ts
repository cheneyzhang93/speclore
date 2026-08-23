/**
 * DOCX reader — reads .docx files using mammoth.
 *
 * @module core/requirement-reader/docx-reader
 */

import { basename, extname } from 'node:path';
import { readFileSync } from 'node:fs';
import mammoth from 'mammoth';
import type { StructuredRequirement } from '../../types/index.js';

/**
 * Parse a DOCX buffer using mammoth.
 * Tests can call this directly with real docx buffers (no file I/O needed).
 */
export async function parseDocxBuffer(buffer: Buffer, idHint: string = 'document'): Promise<StructuredRequirement> {
  const result = await mammoth.extractRawText({ buffer });
  const content = result.value;
  const id = idHint
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-');

  // First line as title
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines[0]?.trim() ?? id;

  return {
    id,
    title,
    description: content,
    rawContent: content,
    confidence: 0.9,
  };
}

export async function readDocxFile(filePath: string): Promise<StructuredRequirement> {
  const buffer = readFileSync(filePath);
  const name = basename(filePath, extname(filePath));
  return parseDocxBuffer(buffer, name);
}
