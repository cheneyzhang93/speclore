/**
 * XLSX reader — reads .xlsx files and extracts requirement tables.
 *
 * Uses xlsx (SheetJS) for xlsx parsing.
 *
 * @module core/requirement-reader/xlsx-reader
 */

import { basename, extname } from 'node:path';
import { readFile, read, utils, type WorkBook } from 'xlsx';
import { formatCellValue } from '../../infra/excel-utils.js';
import type { StructuredRequirement } from '../../types/index.js';

/** Internal: parse a SheetJS WorkBook into structured requirements. */
function parseWorkbook(
  workbook: WorkBook,
  idHint: string,
): Promise<StructuredRequirement> {
  const id = idHint
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-');

  // Read the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return Promise.reject(new Error('No sheets found in workbook'));
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return Promise.reject(new Error(`Sheet "${firstSheetName}" not found`));
  }

  const title = firstSheetName;

  // Convert sheet to array of arrays
  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rows.length === 0) {
    return Promise.resolve({
      id,
      title,
      description: '',
      rawContent: '',
      confidence: 0.85,
    });
  }

  // First row as headers
  const headers: string[] = (rows[0] as unknown[]).map(cell => formatCellValue(cell));
  const dataRows = rows.slice(1);

  // Convert to objects
  const objects: Record<string, string>[] = dataRows.map(row => {
    const obj: Record<string, string> = {};
    row.forEach((cell, colNumber) => {
      const key = headers[colNumber] ?? `Col${colNumber + 1}`;
      obj[key] = formatCellValue(cell);
    });
    return obj;
  });

  // Convert to structured text
  const textRows = objects.map(row => {
    const cells = Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
    return cells;
  });

  const content = textRows.join('\n');

  return Promise.resolve({
    id,
    title,
    description: content,
    rawContent: content,
    confidence: 0.85,
  });
}

/**
 * Parse an xlsx Buffer and extract structured requirements.
 * Tests can call this directly with a real xlsx Buffer — no file I/O needed.
 */
export function parseXlsxBuffer(
  buffer: Buffer,
  idHint?: string,
): Promise<StructuredRequirement> {
  const workbook = read(buffer);
  return parseWorkbook(workbook, idHint ?? 'document');
}

export function readXlsxFile(filePath: string): Promise<StructuredRequirement> {
  const workbook = readFile(filePath);
  const idHint = basename(filePath, extname(filePath));
  return parseWorkbook(workbook, idHint);
}
