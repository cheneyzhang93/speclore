/**
 * PDF reader — extracts text from .pdf files.
 *
 * Uses pdfjs-dist (Mozilla PDF.js) for text extraction.
 *
 * @module core/requirement-reader/pdf-reader
 */

import { basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { StructuredRequirement } from '../../types/index.js';

/**
 * Extract text from a PDF buffer using pdfjs-dist.
 */
async function extractPdfText(dataBuffer: Buffer): Promise<string> {
  // Use legacy build for Node.js compatibility
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(dataBuffer);
  const doc = await pdfjsLib.getDocument({
    data: uint8,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise as { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>; destroy: () => void };

  const textParts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join('');
    if (pageText) textParts.push(pageText);
  }
  doc.destroy();
  return textParts.join('\n');
}

/**
 * Parse a PDF buffer using pdfjs-dist.
 * Tests can call this directly with real PDF buffers (no file I/O needed).
 */
export async function parsePdfBuffer(dataBuffer: Buffer, idHint: string = 'document'): Promise<StructuredRequirement> {
  const text = await extractPdfText(dataBuffer);

  const id = idHint
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-');

  // First line as title
  const lines = text.split('\n').filter(l => l.trim());
  const title = lines[0]?.trim() ?? id;

  return {
    id,
    title,
    description: text,
    rawContent: text,
    confidence: 0.8,
  };
}

export async function readPdfFile(filePath: string): Promise<StructuredRequirement> {
  const dataBuffer = await readFile(filePath);
  const name = basename(filePath, extname(filePath));
  return parsePdfBuffer(dataBuffer, name);
}
