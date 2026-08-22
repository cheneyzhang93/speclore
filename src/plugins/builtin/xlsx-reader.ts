/**
 * Built-in XLSX reader plugin.
 * @module plugins/builtin/xlsx-reader
 */

import type { ReaderPlugin, StructuredRequirement } from '../../types/index.js';
import ExcelJS from 'exceljs';
import { formatCellValue } from '../../infra/excel-utils.js';

export class XlsxReader implements ReaderPlugin {
  readonly name = 'xlsx-reader';
  readonly supportedFormats = ['.xlsx', '.xls'];

  canRead(source: string): boolean {
    return /\.xlsx$/i.test(source) || /\.xls$/i.test(source);
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(source);

    const requirements: StructuredRequirement[] = [];

    for (const sheet of workbook.worksheets) {
      const sheetName = sheet.name;

      // First row as headers
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
}
