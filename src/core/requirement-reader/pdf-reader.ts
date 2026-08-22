/**
 * PDF reader — extracts text from .pdf files.
 *
 * @module core/requirement-reader/pdf-reader
 */

import { basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { StructuredRequirement } from '../../types/index.js';

export async function readPdfFile(filePath: string): Promise<StructuredRequirement> {
  // Dynamic import for pdf-parse (CJS module)
  const pdfParse = (await import('pdf-parse')).default;
  const dataBuffer = await readFile(filePath);
  const data = await pdfParse(dataBuffer);

  const id = basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-');

  // First line as title
  const lines = data.text.split('\n').filter(l => l.trim());
  const title = lines[0]?.trim() ?? id;

  return {
    id,
    title,
    description: data.text,
    rawContent: data.text,
    confidence: 0.8,
  };
}
