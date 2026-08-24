/**
 * M1: Requirement Ingestion — unified entry point.
 *
 * Auto-detects source type (file path / URL / direct text) and routes
 * to the appropriate reader. Outputs StructuredRequirement.
 *
 * @module core/requirement-reader
 */

import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import type { StructuredRequirement } from '../../types/index.js';
import { logger } from '../../infra/logger.js';
import { getRegistry } from '../../plugins/registry.js';
import { readMarkdownFile } from './markdown-reader.js';
import { readDocxFile } from './docx-reader.js';
import { readXlsxFile } from './xlsx-reader.js';
import { readPdfFile } from './pdf-reader.js';
import { readImageFile } from './image-reader.js';
import { readTextFile } from './text-reader.js';
import { readUrl } from './url-reader.js';

/** Source type classification */
type SourceType = 'file' | 'url' | 'text';

/**
 * Strip invisible Unicode formatting / bidirectional control characters
 * that Windows may embed when copying file paths from dialogs or rich-text apps.
 *
 * Common offenders:
 *   U+202A..U+202E  (LRE, RLE, PDF, LRO, RLO)
 *   U+2066..U+2069  (LRI, RLI, FSI, PDI)
 *   U+200B..U+200F  (ZWSP, ZWNJ, ZWJ, ZWM, LRM, RLM)
 *   U+FEFF          (BOM / zero-width no-break space)
 *   U+00AD          (soft hyphen)
 */
export function sanitizeSource(source: string): string {
  return source.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD]/g, '');
}

/**
 * Read a requirement from any source type.
 */
export async function readRequirement(source: string): Promise<StructuredRequirement> {
  // Strip invisible Unicode characters (Windows path copy artefacts)
  const cleaned = sanitizeSource(source);
  if (cleaned !== source) {
    logger.debug('Stripped invisible Unicode characters from source input.');
  }

  const sourceType = classifySource(cleaned);
  logger.info(`Reading requirement from ${sourceType}: ${truncate(cleaned, 120)}`);

  switch (sourceType) {
    case 'file':
      return readFromFile(cleaned);
    case 'url':
      return readFromUrl(cleaned);
    case 'text':
      return readFromText(cleaned);
  }
}

/**
 * Classify the source as file, URL, or direct text.
 */
function classifySource(source: string): SourceType {
  // URL detection
  if (/^https?:\/\//i.test(source)) {
    return 'url';
  }

  // File detection — check if it looks like a file path and exists
  const ext = extname(source).toLowerCase();
  const supportedExts = ['.md', '.txt', '.docx', '.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg', '.webp'];

  if (supportedExts.includes(ext) && existsSync(source)) {
    return 'file';
  }

  // If it's a path that exists but has no extension, treat as file
  if (existsSync(source) && (source.includes('/') || source.includes('\\'))) {
    return 'file';
  }

  // Detect path-like strings that look like files but don't exist
  // (has path separators + a known extension) — give a clear error
  // instead of silently treating as text.
  if (supportedExts.includes(ext) && (source.includes('/') || source.includes('\\'))) {
    throw new Error(
      `File not found: ${source}\n` +
      'The path looks like a file but does not exist. ' +
      'Check the path and try again. If copying from Windows, ' +
      'make sure no invisible characters are included.',
    );
  }

  // Otherwise treat as direct text
  return 'text';
}

/**
 * Read from a file based on its extension.
 * First tries PluginRegistry (supports third-party plugins), then falls back to built-in readers.
 */
async function readFromFile(filePath: string): Promise<StructuredRequirement> {
  // Try PluginRegistry first (includes built-in + third-party readers)
  const registry = getRegistry();
  const reader = registry.findReader(filePath);
  if (reader) {
    logger.debug(`Using reader plugin: ${reader.name}`);
    const results = await reader.read(filePath);
    if (results.length === 0) {
      throw new Error(`Reader plugin '${reader.name}' returned no results for: ${filePath}`);
    }
    return results[0]!;
  }

  // Fallback to direct built-in readers
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
      return readMarkdownFile(filePath);
    case '.txt':
      return readTextFile(filePath);
    case '.docx':
      return readDocxFile(filePath);
    case '.xlsx':
    case '.xls':
      return readXlsxFile(filePath);
    case '.pdf':
      return readPdfFile(filePath);
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
      return readImageFile(filePath);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Read from a URL.
 */
async function readFromUrl(url: string): Promise<StructuredRequirement> {
  return readUrl(url);
}

/**
 * Read from direct text input.
 */
function readFromText(text: string): Promise<StructuredRequirement> {
  // Generate an ID from the first few words
  const id = text
    .split(/\s+/)
    .slice(0, 3)
    .map(w => w.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, ''))
    .filter(Boolean)
    .join('-') || 'requirement';

  return Promise.resolve({
    id,
    title: text.split('\n')[0]?.slice(0, 100) ?? id,
    description: text,
    rawContent: text,
    confidence: 1.0,
  });
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}
