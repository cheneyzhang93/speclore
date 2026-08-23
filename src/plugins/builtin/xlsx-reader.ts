/**
 * Built-in XLSX reader plugin.
 * @module plugins/builtin/xlsx-reader
 */

import type { ReaderPlugin, StructuredRequirement } from '../../types/index.js';
import { readFile, read, utils, type WorkBook } from 'xlsx';
import { formatCellValue } from '../../infra/excel-utils.js';

/** Internal: parse a SheetJS WorkBook into structured requirements. */
function parseWorkbook(workbook: WorkBook): StructuredRequirement[] {
  const requirements: StructuredRequirement[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to array of arrays
    const allRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (allRows.length === 0) continue;

    // First row as headers
    const headers: string[] = (allRows[0] as unknown[]).map(cell => formatCellValue(cell));
    const dataRows = allRows.slice(1);

    // Convert to objects
    const rows: Record<string, string>[] = dataRows.map(row => {
      const obj: Record<string, string> = {};
      row.forEach((cell, colNumber) => {
        const key = headers[colNumber] ?? `Col${colNumber + 1}`;
        obj[key] = formatCellValue(cell);
      });
      return obj;
    });

    // Try to find columns: title/id, description, acceptance criteria
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const title = row['Title'] ?? row['title'] ?? row['Name'] ?? row['name'] ?? row['ID'] ?? `Row ${i + 1}`;
      const description = row['Description'] ?? row['description'] ?? row['Desc'] ?? '';
      const ac = row['Acceptance Criteria'] ?? row['acceptance'] ?? row['AC'] ?? '';

      if (description || title) {
        requirements.push({
          id: `${sheetName}/${i + 1}`,
          title: String(title),
          description: String(description),
          acceptanceCriteria: ac ? String(ac).split('\n').filter(Boolean) : undefined,
          rawContent: JSON.stringify(row),
          confidence: 0.7,
        });
      }
    }
  }

  return requirements;
}

/**
 * Parse an xlsx Buffer and extract structured requirements from all sheets.
 * Tests can call this directly with a real xlsx Buffer — no file I/O needed.
 */
export function parseXlsxBuffer(buffer: Buffer): StructuredRequirement[] {
  return parseWorkbook(read(buffer));
}

export class XlsxReader implements ReaderPlugin {
  readonly name = 'xlsx-reader';
  readonly supportedFormats = ['.xlsx', '.xls'];

  canRead(source: string): boolean {
    return /\.xlsx$/i.test(source) || /\.xls$/i.test(source);
  }

  read(source: string): Promise<StructuredRequirement[]> {
    const workbook = readFile(source);
    return Promise.resolve(parseWorkbook(workbook));
  }
}
