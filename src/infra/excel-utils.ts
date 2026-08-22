/**
 * Shared Excel cell formatting utilities — used by both core xlsx-reader and plugin xlsx-reader.
 *
 * @module infra/excel-utils
 */

/** Safely convert an exceljs cell value to string. */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  return '';
}
