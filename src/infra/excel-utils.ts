/**
 * Shared Excel cell formatting utilities — used by both core xlsx-reader and plugin xlsx-reader.
 *
 * @module infra/excel-utils
 */

/** Safely convert a cell value to string. */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'v' in value) {
    // xlsx (SheetJS) cell object: { v: rawValue, t: type, w: formatted }
    const cell = value as { v?: unknown; w?: string };
    if (cell.w != null) return cell.w;
    if (cell.v == null) return '';
    if (typeof cell.v === 'string' || typeof cell.v === 'number' || typeof cell.v === 'boolean') return String(cell.v);
    return JSON.stringify(cell.v);
  }
  return '';
}
