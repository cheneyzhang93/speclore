/**
 * DOCX reader — reads .docx files using mammoth.
 *
 * @module core/requirement-reader/docx-reader
 */

import { basename, extname } from 'node:path';
import mammoth from 'mammoth';
import type { StructuredRequirement } from '../../types/index.js';

export async function readDocxFile(filePath: string): Promise<StructuredRequirement> {
  const result = await mammoth.extractRawText({ path: filePath });
  const content = result.value;
  const id = basename(filePath, extname(filePath))
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
