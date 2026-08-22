/**
 * XLSX reader — reads .xlsx files and extracts requirement tables.
 *
 * Uses exceljs for robust xlsx parsing with native TypeScript support.
 *
 * @module core/requirement-reader/xlsx-reader
 */

import { basename, extname } from 'node:path';
import ExcelJS from 'exceljs';
import { formatCellValue } from '../../infra/excel-utils.js';
import type { StructuredRequirement } from '../../types/index.js';

export async function readXlsxFile(filePath: string): Promise<StructuredRequirement> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const id = basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-');

  // Read the first sheet
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`No sheets found in ${filePath}`);
  }

  const title = sheet.name;

  // First row as headers, subsequent rows as data
  const headers: string[] = [];
  const rows: Record<string, string>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = formatCellValue(cell.value);
      });
    } else {
      const obj: Record<string, string> = {};
      row.eachCell((cell, colNumber) => {
        const key = headers[colNumber - 1] ?? `Col${colNumber}`;
        obj[key] = formatCellValue(cell.value);
      });
      rows.push(obj);
    }
  });

  // Convert rows to structured text
  const textRows = rows.map(row => {
    const cells = Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
    return cells;
  });

  const content = textRows.join('\n');

  return {
    id,
    title,
    description: content,
    rawContent: content,
    confidence: 0.85,
  };
}
